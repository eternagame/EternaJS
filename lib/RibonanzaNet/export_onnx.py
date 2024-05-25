from os import path
import sys
sys.path.append(path.join(path.dirname(__file__), 'RibonanzaNet'))

import yaml
import numpy as np
import torch
from RibonanzaNet.Network import RibonanzaNet

class Config:
    def __init__(self, **entries):
        self.__dict__.update(entries)
        self.entries=entries

    def print(self):
        print(self.entries)

def load_config_from_yaml(file_path):
    with open(file_path, 'r') as file:
        config = yaml.safe_load(file)
    return Config(**config)

class finetuned_RibonanzaNet(RibonanzaNet):
    def __init__(self, config):
        config.dropout=0.3
        super(finetuned_RibonanzaNet, self).__init__(config)

        self.dropout=torch.nn.Dropout(0.0)
        self.ct_predictor=torch.nn.Linear(64,1)

    def get_embeddings(self, src,src_mask=None,return_aw=False):
        B,L=src.shape
        src = src
        src = self.encoder(src).reshape(B,L,-1)

        pairwise_features=self.outer_product_mean(src)
        pairwise_features=pairwise_features+self.pos_encoder(src)
        
        for layer in self.transformer_encoder:
            if src_mask is not None:
                src,pairwise_features=layer(src, pairwise_features, src_mask,return_aw=return_aw)
            else:
                src,pairwise_features=layer(src, pairwise_features, return_aw=return_aw)

        return src, pairwise_features

    def forward(self, src):
        _, pairwise_features=self.get_embeddings(src, torch.ones_like(src).long().to(src.device))
        pairwise_features=pairwise_features+pairwise_features.permute(0,2,1,3)
        output=self.ct_predictor(self.dropout(pairwise_features))

        return output.squeeze(-1)
    
def encode_sequence(seq: str):
    tokens = {nt:i for i,nt in enumerate('ACGU')}
    return torch.tensor(np.array([tokens[nt] for nt in seq])).unsqueeze(0)

model=finetuned_RibonanzaNet(load_config_from_yaml(path.join(path.dirname(__file__), 'RibonanzaNet/configs/pairwise.yaml')))
model.load_state_dict(torch.load(path.join(path.dirname(__file__), 'RibonanzaNet-Weights/RibonanzaNet-SS.pt'), map_location='cpu'))
model.eval()

with torch.no_grad():
    torch.onnx.export(
        model,
        (encode_sequence('AUUCCGGGAC')),
        path.join(path.dirname(__file__), '../../src/eterna/folding/engines/rnnet-ss.onnx'),
        input_names=[ "sequence"],
        output_names=[ "output" ],
        dynamic_axes={
            'sequence': { 0: 'batch_size', 1: 'sequence_length' },
            'output': { 0: 'batch_size', 1: 'bpp_a', 2: 'bpp_b' }
        }
    )

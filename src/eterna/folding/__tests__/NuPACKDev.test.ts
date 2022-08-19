//import Folder, {MultiFoldResult} from '../Folder';
import Folder, {DefectResult, SuboptEnsembleResult} from '../Folder';
import NuPACK from '../NuPACK';
//import Vienna from '../Vienna';
//import Vienna2 from '../Vienna2';
//import LinearFoldV from '../LinearFoldV';
import './jest-matcher-deep-close-to';
//import SecStruct from 'eterna/rnatypes/SecStruct';
import Sequence from 'eterna/rnatypes/Sequence';
import SecStruct from 'eterna/rnatypes/SecStruct';
//import {Oligo} from 'eterna/rnatypes/Oligo';

function CreateFolder(type: any): Promise<Folder | null> {
    return type.create();
}


test('NuPACK:defect', () => {        
    return expect(CreateFolder(NuPACK)
    .then((folder) => {
       if (folder === null) return; 
        
       let sequence = Sequence.fromSequenceString("GGGAACGACUCGAGUAGAGUCGAAAAGAUAUAGAAAGCGCGACUAUAUCAAUAAACGCGCAAAAUAAAUAAAUAAAGAUCAGUUUCGACUGAUCAAAAGAAACAACAACAACAAC")
       let secstruct = SecStruct.fromParens(".....((((((.....))))))..............(((((..(((....)))..)))))................(((((((....))))))).....................");
       let temperature: number = 37;
       let isPsuedoknot:boolean = false;
  
        const defectResultObject: 
           DefectResult = folder.getDefect (sequence, secstruct, 
                                        temperature, isPsuedoknot 
        );	   
       
        let ensembleDefect: number = defectResultObject.ensembleDefect;
        let ensembleDefectNormalized: number = defectResultObject.ensembleDefectNormalized;
      
  
        expect(ensembleDefect).toBeDefined();
        expect(ensembleDefect)
        .toEqual(4.665742668072042);
   
        expect(ensembleDefectNormalized).toBeDefined();
        expect(ensembleDefectNormalized)
        .toEqual(0.0405716753745395);   
      
    }))
    .resolves.toBeUndefined(); // (we're returning a promise)
   
   });


test('NuPACK:suboptstructuresNoOligosPknot', () => {        
  return expect(CreateFolder(NuPACK)
  .then((folder) => {
     if (folder === null) return;

     let sequence = Sequence.fromSequenceString("GGGAACGACUCGAGUAGAGUCGAAAAGAUAUAGAAAGCGCGACUAUAUCAAUAAACGCGCAAAAUAAAUAAAUAAAGAUCAGUUUCGACUGAUCAAAAGAAACAACAACAACAAC")
     let temperature: number = 37;
     let isPsuedoknot:boolean = true;
     let kcalDelta: number = 4;

     const suboptEnsembleObject: 
         SuboptEnsembleResult = folder.getSuboptEnsembleNoBindingSite (
         sequence, kcalDelta,
         isPsuedoknot, temperature
     );	   
     

     let ensembleStructures: string[] = suboptEnsembleObject.suboptStructures;
     let ensembleStructuresEnergyError: number[]= suboptEnsembleObject.suboptEnergyError;
     let ensembleStructuresFreeEnergy: number[] = suboptEnsembleObject.suboptFreeEnergy;
     

     expect(ensembleStructures).toBeDefined();
     expect(ensembleStructures[0])
         .toEqual(".....((((((.....))))))....(((((((...{{{{{.)))))))......}}}}}................(((((((....))))))).....................");
     expect(ensembleStructures[1])
         .toEqual(".....((((((.....))))))....(((((((...{{{{..))))))).......}}}}................(((((((....))))))).....................");
     expect(ensembleStructures[2])
         .toEqual("......(((((.....))))).....(((((((...{{{{{.)))))))......}}}}}................(((((((....))))))).....................");

     expect(ensembleStructuresEnergyError).toBeDefined();
  

     expect(ensembleStructuresFreeEnergy).toBeDefined();
     expect(ensembleStructuresFreeEnergy[0])
         .toEqual(-34.6);
     expect(ensembleStructuresFreeEnergy[1])
         .toEqual(-33.3);
     expect(ensembleStructuresFreeEnergy[2])
         .toEqual(-33);

 }))
 .resolves.toBeUndefined(); // (we're returning a promise)

});



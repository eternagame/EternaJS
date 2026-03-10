/**
 * RibotreeWorker.ts - Web Worker that runs Ribotree MCTS off the main thread
 *
 * This worker:
 * 1. Loads Pyodide + Ribotree Python package via importScripts
 * 2. Registers an async EternaJS bridge (mfe/bpps calls are proxied to main thread)
 * 3. Receives 'solve' messages and runs MCTS via pyodide.runPythonAsync
 * 4. Forwards 'progress' JSON strings posted by Python's save_results.py
 *
 * Message protocol:
 *   Worker → Main: {type:'ready'} | {type:'mfe_request',id,seq,pkg} |
 *                  {type:'bpps_request',id,seq,pkg} | JSON string (progress) |
 *                  {type:'result',...} | {type:'error',message}
 *   Main → Worker: {type:'solve',sequence,options} |
 *                  {type:'mfe_response',id,result} | {type:'bpps_response',id,result}
 */

/// <reference lib="webworker" />

const PYODIDE_CDN_URL = 'https://cdn.jsdelivr.net/pyodide/v0.29.0/full/';
const RIBOTREE_WHEEL_URL = new URL('engines-bin/ribotree_pyodide-2.0.2-py3-none-any.whl', import.meta.url).href;

/* eslint-disable @typescript-eslint/no-explicit-any */
declare function loadPyodide(options: {
    indexURL: string;
    stdout?: (msg: string) => void;
    stderr?: (msg: string) => void;
}): Promise<any>;

interface SolveOptions {
    category?: 'rna' | 'mrna';
    explorationConstant?: number;
    foldingPackage?: string;
    iterations?: number;
    stride?: number;
    numChildren?: number;
}

interface SolveMessage {
    type: 'solve';
    sequence: string;
    options?: SolveOptions;
}

let pyodide: any = null;
let reqId = 0;
const pendingMessages = new Map();

function buildScript(msg: SolveMessage): string {
    const opts = msg.options ?? {};
    const category = JSON.stringify(opts.category ?? 'mrna');
    const foldingPackage = JSON.stringify(opts.foldingPackage ?? 'vienna');
    const startingSequence = JSON.stringify(msg.sequence ?? '');
    const iterations = opts.iterations ?? 20;
    const stride = opts.stride ?? 10;
    const numChildren = opts.numChildren ?? 3;
    const explorationConstant = opts.explorationConstant ?? 1;

    return `
import json
from ribotree.domain import Domain
from ribotree import MCTS

args = {
    'domain': {
        'A': Domain(
            name='A',
            sequence=${startingSequence},
            category=${category},
            options=''
        )
    },
    'domain_list': ['A'],
    'constant_5_prime': '',
    'constant_3_prime': '',
    'condition': {
        'condition_1': [
            ['degscore.min', 50]
        ],
    },
    'num_mutate': 1,
    'n_iter': ${iterations},
    'stride': ${stride},
    'c_const': ${explorationConstant},
    'beam': True,
    'scale': 1,
    'n_children': ${numChildren},
    'T': 300,
    'package': ${foldingPackage},
    'linearfold': False,
    'CDSFold_path': None,
    'CDSFold_prob': 0,
    'ratio': False,
    'shuffle_prob': 0.33,
    'num_shuffle': 1,
    'constant_length': False,
    'allow_nucleotide_repeat': False,
    'preserve_seq': [],
    'preserve_order': None,
    'restriction_sites': None,
    'gu_level': 0,
    'output': '.',
    'verbose': False,
    'plot': False,
    'save_ss': False,
    'seed': 2131321,
    'length': 0,
    'dna': False,
    'mrna': True,
    'domain_order': False,
}

try:
    print('Running MCTS')
    root, best_leaf = await MCTS(args)
    print('MCTS complete')
    best_seq = best_leaf.RNA_seq.get_seq()
    from ribotree.arnie.mfe import mfe as _get_mfe
    mfe_struct, mfe_energy = await _get_mfe(best_seq, package=${foldingPackage}, return_dG_MFE=True)
    result = {
        'success': True,
        'sequence': best_seq,
        'structure': mfe_struct,
        'energy': float(mfe_energy),
        'iterations': ${iterations}
    }
except Exception as e:
    import traceback
    result = {
        'success': False,
        'error': str(e) + '\\n' + traceback.format_exc(),
        'sequence': '',
        'structure': '',
        'energy': 0.0
    }

json.dumps(result)
`;
}

async function init(): Promise<void> {
    try {
        importScripts(`${PYODIDE_CDN_URL}pyodide.js`);

        // Load Pyodide
        console.log('Loading Pyodide...');
        pyodide = await loadPyodide({
            indexURL: PYODIDE_CDN_URL,
            stdout: (msg: string) => console.log('[Ribotree Worker]', msg),
            stderr: (msg: string) => console.warn('[Ribotree Worker]', msg)
        });

        // Register async eternajs bridge.
        // Python's `await _eternajs.mfe(seq, pkg)` sends a request to the main thread
        // and waits until the main thread responds with mfe_response.
        const bridge = {
            async mfe(seq: string, pkg: string): Promise<any> {
                console.log('Requesting MFE');
                const id = ++reqId;
                return new Promise((resolve) => {
                    pendingMessages.set(id, resolve);
                    postMessage({
                        type: 'mfe_request', id, seq, pkg
                    });
                });
            },
            async bpps(seq: string, pkg: string): Promise<any> {
                console.log('Requesting BPPS');
                const id = ++reqId;
                return new Promise((resolve) => {
                    pendingMessages.set(id, resolve);
                    postMessage({
                        type: 'bpps_request', id, seq, pkg
                    });
                });
            }
        };
        pyodide.registerJsModule('eternajs', bridge);

        await pyodide.loadPackage('micropip');
        const micropip = pyodide.pyimport('micropip');
        await micropip.install('biopython');
        await micropip.install(RIBOTREE_WHEEL_URL);

        postMessage({type: 'ready'});
    } catch (err) {
        postMessage({type: 'error', message: `Worker init failed: ${err}`});
    }
}

onmessage = async (event: MessageEvent) => {
    const msg = event.data;

    // Responses from main thread resolving pending mfe/bpps requests
    if (msg.type === 'mfe_response' || msg.type === 'bpps_response') {
        const resolve = pendingMessages.get(msg.id);
        if (resolve) {
            pendingMessages.delete(msg.id);
            resolve(msg.result);
        }
        return;
    }

    if (msg.type === 'solve') {
        if (!pyodide) {
            postMessage({type: 'error', message: 'Pyodide not loaded yet'});
            return;
        }
        try {
            const resultJson = await pyodide.runPythonAsync(buildScript(msg));
            const result = JSON.parse(resultJson as string);
            postMessage({type: 'result', ...result});
        } catch (err) {
            postMessage({type: 'error', message: String(err)});
        }
    }
};

init();

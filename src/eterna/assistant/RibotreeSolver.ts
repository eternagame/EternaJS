/**
 * RibotreeSolver.ts - MCTS-based RNA sequence design using Ribotree
 *
 * Runs Ribotree (Pyodide + Python) in a Web Worker so the main thread stays
 * responsive during MCTS. The worker owns Pyodide; the main thread serves folding
 * engine requests (mfe/bpps) from the worker via postMessage and receives
 * progress updates after each MCTS stride.
 *
 * Worker message protocol:
 *   Worker → Main: {type:'ready'} | {type:'mfe_request',id,seq,pkg} |
 *                  {type:'bpps_request',id,seq,pkg} | JSON string (progress update) |
 *                  {type:'result',...} | {type:'error',message}
 *   Main → Worker: {type:'solve',sequence,options} |
 *                  {type:'mfe_response',id,result} | {type:'bpps_response',id,result}
 */

import log from 'loglevel';
import Solver, {SolverResult, SolverOptions} from './Solver';
import {EternajsBridge} from './PyodideBridge';

/** Progress update emitted after each MCTS stride */
export interface RibotreeProgressUpdate {
    sequence: string;
    structure: string;
    degscore: number;
    energy: number;
}

/** Configuration for Ribotree MCTS */
export interface RibotreeOptions extends SolverOptions {
    /** Whether to run mRNA codon optimization ('mrna') or RNA inverse folding ('rna') */
    mode: 'mrna' | 'rna';
    /** The target structure in dot bracket format */
    targetStructure: string,
    /** Number of MCTS iterations (default: 20) */
    iterations?: number;
    /** Number of children per node (default: 3) */
    numChildren?: number;
    /** Exploration constant (default: 1.0) */
    explorationConstant?: number;
    /** Save-results stride — how often progress is posted (default: 10) */
    stride?: number;
    /** Called after each stride with the current best sequence */
    onProgress?: (update: RibotreeProgressUpdate) => void;
}

/** Extended result with MCTS-specific information */
export interface RibotreeSolverResult extends SolverResult {
    iterations?: number;
}

export default class RibotreeSolver extends Solver<false> {
    public static readonly NAME = 'Ribotree';

    /**
     * Spawns the Ribotree Web Worker and waits for it to finish loading
     * Pyodide + the Ribotree wheel before resolving.
     */
    public static async create(): Promise<RibotreeSolver | null> {
        try {
            const worker = new Worker(new URL('./RibotreeWorker.ts', import.meta.url));

            await new Promise<void>((resolve, reject) => {
                worker.onmessage = (e: MessageEvent) => {
                    if (e.data?.type === 'ready') {
                        resolve();
                    } else if (e.data?.type === 'error') {
                        reject(new Error(e.data.message));
                    }
                };
                worker.onerror = (err) => reject(err);
            });

            log.info('Ribotree worker ready');
            return new RibotreeSolver(worker);
        } catch (err) {
            log.error('Failed to load Ribotree worker:', err);
            return null;
        }
    }

    private constructor(worker: Worker) {
        super();
        this._worker = worker;

        // Persistent handler: serves folding requests from the worker and
        // routes progress/result/error messages to the active solve call.
        this._worker.onmessage = (e: MessageEvent) => {
            const data = e.data;

            // Python's save_results.py calls js.postMessage(json_string) directly,
            // which arrives here as a plain string (not a structured object).
            if (typeof data === 'string') {
                try {
                    const msg = JSON.parse(data);
                    if (msg.type === 'progress') {
                        this._onProgress?.({
                            sequence: msg.sequence,
                            structure: msg.structure,
                            degscore: msg.degscore,
                            energy: msg.energy
                        });
                    }
                } catch { /* ignore non-JSON strings */ }
                return;
            }
            if (data.type === 'mfe_request') {
                const result = EternajsBridge.mfe(data.seq, data.pkg);
                this._worker.postMessage({type: 'mfe_response', id: data.id, result});
            } else if (data.type === 'bpps_request') {
                const result = EternajsBridge.bpps(data.seq, data.pkg);
                this._worker.postMessage({type: 'bpps_response', id: data.id, result});
            } else if (data.type === 'result') {
                this._resolveResult?.({
                    success: data.success,
                    sequence: data.sequence,
                    structure: data.structure,
                    energy: data.energy,
                    error: data.error,
                    iterations: data.iterations
                });
                this._resolveResult = undefined;
                this._rejectResult = undefined;
            } else if (data.type === 'error') {
                this._rejectResult?.(new Error(data.message));
                this._resolveResult = undefined;
                this._rejectResult = undefined;
            }
        };
    }

    // ==================== IDENTITY ====================

    public get name(): string { return RibotreeSolver.NAME; }
    public get isReady(): boolean { return this._worker != null; }
    protected get _isSync(): false { return false; }

    // ==================== CORE METHODS ====================

    public async solve(options: RibotreeOptions): Promise<RibotreeSolverResult> {
        try {
            return await this.runMCTS(options);
        } catch (err) {
            return this.failureResult(`Ribotree error: ${err}`) as RibotreeSolverResult;
        }
    }

    // ==================== INTERNALS ====================

    private async runMCTS(options: RibotreeOptions): Promise<RibotreeSolverResult> {
        this._onProgress = options.onProgress;

        return new Promise<RibotreeSolverResult>((resolve, reject) => {
            this._resolveResult = resolve;
            this._rejectResult = reject;
            const msg = {
                type: 'solve',
                sequence: options.startingSequence,
                options: {
                    category: options.mode,
                    foldingPackage: options.foldingPackage,
                    iterations: options.iterations ?? 25,
                    stride: options.stride ?? 10,
                    numChildren: options.numChildren ?? 3,
                    explorationConstant: options.explorationConstant ?? 1
                }
            };
            this._worker.postMessage(msg);
        });
    }

    private readonly _worker: Worker;
    private _onProgress?: (update: RibotreeProgressUpdate) => void;
    private _resolveResult?: (result: RibotreeSolverResult) => void;
    private _rejectResult?: (err: Error) => void;
}

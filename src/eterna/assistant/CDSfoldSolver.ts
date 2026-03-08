/**
 * CDSfold.ts - Codon optimization solver using WASM CDSfold
 *
 * CDSfold optimizes codon selection for an amino acid sequence while
 * minimizing the free energy of the resulting RNA secondary structure.
 *
 * Reference: Taneda, A. (2010). "CDSfold: A codon optimization method
 * that takes into account the mRNA secondary structure"
 */

import log from 'loglevel';
import EmscriptenUtil from 'eterna/emscripten/EmscriptenUtil';
// eslint-disable-next-line import/no-unresolved
import * as CDSfoldLib from '../folding/engines/CDSfoldLib';
import Solver from './Solver';
import type {SolverResult, SolverOptions, SolverCacheKey} from './Solver';

/** Options for CDSfold codon optimization */
export interface CDSfoldOptions extends SolverOptions {
    /** Amino acid sequence to optimize (e.g., "MVKVG...") */
    aminoAcids: string;
    /** Maximum distance between base pairs (0 = unlimited) */
    maxBpDistance?: number;
    /** Codons to exclude from optimization (e.g., ["CUA", "CUG"]) */
    excludedCodons?: string[];
}

export default class CDSfoldSolver extends Solver<true> {
    public static readonly NAME = 'CDSfold';

    /**
     * Asynchronously creates a new instance of the CDSfold solver.
     * @returns Promise resolving to CDSfold instance, or null if loading fails
     */
    public static async create(): Promise<CDSfoldSolver | null> {
        try {
            // eslint-disable-next-line import/no-unresolved, import/no-extraneous-dependencies
            const module = await import('engines-bin/cdsfold');
            const program = await EmscriptenUtil.loadProgram(module);
            return new CDSfoldSolver(program);
        } catch (err) {
            log.error('Failed to load CDSfold:', err);
            return null;
        }
    }

    private constructor(lib: CDSfoldLib) {
        super();
        this._lib = lib;
    }

    // ==================== IDENTITY ====================

    public get name(): string {
        return CDSfoldSolver.NAME;
    }

    public get isReady(): boolean {
        return this._lib != null;
    }

    protected get _isSync(): true {
        return true;
    }

    // ==================== VERSION ====================

    /**
     * Get the CDSfold library version string
     */
    public getVersion(): string {
        try {
            return this._lib.getVersion();
        } catch (err) {
            log.error('Failed to get CDSfold version:', err);
            return 'unknown';
        }
    }

    // ==================== SOLVE ====================

    /**
     * Optimize codons for the amino acid sequence provided in options.
     *
     * @param options - Must include `aminoAcids`; optionally temperature, maxBpDistance, excludedCodons
     * @returns Result with optimized sequence, structure, and energy
     */
    public solve(options: CDSfoldOptions): SolverResult {
        const {aminoAcids} = options;

        if (!aminoAcids || aminoAcids.length === 0) {
            return this.failureResult('Empty amino acid sequence');
        }

        const key: SolverCacheKey = {
            aminoAcids,
            temperature: options.temperature ?? null,
            maxBpDistance: options.maxBpDistance ?? null,
            excludedCodons: options.excludedCodons?.join(',') ?? null
        };

        const cached = this.getCache(key) as SolverResult | undefined;
        if (cached) {
            log.debug('CDSfold cache hit');
            return cached;
        }

        let result: CDSfoldLib.CDSfoldResult;
        try {
            const opts = this._lib.createOptions();
            opts.maxBpDistance = options.maxBpDistance ?? 0;
            opts.codonsExcluded = options.excludedCodons?.join(',') ?? '';
            opts.temp = options.temperature ?? 37.0;
            result = this._lib.fold(aminoAcids, opts);
        } catch (err) {
            log.error('CDSfold error:', err);
            return this.failureResult(`CDSfold error: ${err?.message}`);
        }

        const solverResult: SolverResult = {
            sequence: result.sequence,
            structure: result.structure,
            energy: result.mfe,
            aminoAcids: result.aminoAcids,
            success: result.success,
            error: result.error || undefined
        };

        if (solverResult.success) {
            this.putCache(key, solverResult);
        }

        return solverResult;
    }

    private readonly _lib: CDSfoldLib;
}

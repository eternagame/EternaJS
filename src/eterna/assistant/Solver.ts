/**
 * Solver.ts - Base abstract class for RNA inverse folding solvers
 *
 * Solvers implement inverse folding algorithms that design RNA sequences
 * to achieve desired properties (target structure, codon optimization, etc.)
 */

// ==================== RESULT TYPES ====================

/**
 * Base result returned by all solvers
 */
export interface SolverResult {
    /** Designed/optimized RNA sequence */
    sequence: string;
    /** Predicted secondary structure in dot-bracket notation */
    structure: string;
    /** Minimum free energy in kcal/mol */
    energy: number;
    /** Whether the calculation succeeded */
    success: boolean;
    /** Error message if calculation failed */
    error?: string;
    /** Verified amino acid translation of the designed sequence, if the solver supports this */
    aminoAcids?: string;
}

// ==================== OPTIONS TYPES ====================

/**
 * Base options shared by all solvers.
 * Solver-specific options should extend this interface.
 */
export interface SolverOptions {
    /** Folding engine to use for structure prediction (e.g. "vienna", "nupack") */
    foldingPackage?: string;
    /** Temperature in Celsius (default: 37.0) */
    temperature?: number;
    /** Starting RNA sequence */
    startingSequence?: string;
    /** Target secondary structure in dot-bracket notation */
    targetStructure?: string;
    /** Progress callback invoked by solvers that support incremental updates */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onProgress?: (update: any) => void;
}

// ==================== CACHE TYPES ====================

export type SolverCacheItem = SolverResult | undefined;
export type SolverCacheKey = Record<string, string | string[] | number | number[] | boolean | null>;

// ==================== ABSTRACT SOLVER CLASS ====================

/**
 * Abstract base class for RNA inverse folding solvers.
 *
 * @typeParam Sync - Whether the solver operates synchronously (true) or may be async (false)
 */
export default abstract class Solver<Sync extends boolean = boolean> {
    // ==================== IDENTITY ====================

    /** Unique name identifying this solver (e.g., "CDSfold") */
    public abstract get name(): string;

    /** Whether the solver loaded successfully and is ready to use */
    public abstract get isReady(): boolean;

    // ==================== SYNC/ASYNC ====================

    public isSync(): this is Solver<true> {
        return this._isSync;
    }

    protected abstract get _isSync(): Sync;

    // ==================== CORE METHODS ====================

    /**
     * Run this solver. Each concrete solver defines what "solve" means
     * for its algorithm (codon optimization, inverse folding, etc.).
     * Options must extend SolverOptions; solver-specific inputs are
     * passed via the concrete options type.
     *
     * @param options - Solver-specific options extending SolverOptions
     * @returns Result containing the designed sequence, structure, and energy
     */
    public abstract solve(
        options: SolverOptions
    ): Sync extends true
        ? SolverResult
        : Promise<SolverResult> | SolverResult;

    // ==================== CACHING ====================

    protected getCache(key: SolverCacheKey): SolverCacheItem {
        const keyStr = JSON.stringify(key);
        return this._cache.get(keyStr);
    }

    protected putCache(key: SolverCacheKey, data: SolverCacheItem): void {
        const keyStr = JSON.stringify(key);
        this._cache.set(keyStr, data);
    }

    protected resetCache(): void {
        this._cache.clear();
    }

    // ==================== HELPERS ====================

    protected failureResult(error: string): SolverResult {
        return {
            sequence: '',
            structure: '',
            energy: 0,
            aminoAcids: '',
            success: false,
            error
        };
    }

    private readonly _cache: Map<string, SolverCacheItem> = new Map();
}

/**
 * TypeScript type definitions for CDSfold WebAssembly module
 *
 * CDSfold optimizes codon selection for an amino acid sequence
 * while minimizing the free energy of the resulting RNA secondary structure.
 */

export = CDSfoldLib;

/**
 * CDSfold WebAssembly module interface
 */
declare class CDSfoldLib {
    /**
     * Fold an amino acid sequence. Options default to their zero/false values when omitted.
     * @param aaseq - Amino acid sequence (e.g., "MVKVG...")
     * @param options - Calculation options (optional)
     * @returns Calculation result
     */
    fold(aaseq: string, options?: CDSfoldLib.Options): CDSfoldLib.CDSfoldResult;

    /**
     * Get module version string
     */
    getVersion(): string;

    /**
     * Create a new Options object with default values
     */
    createOptions(): CDSfoldLib.Options;
}

declare namespace CDSfoldLib {
    /**
     * Result of a CDSfold calculation
     */
    export interface CDSfoldResult {
        /** Optimized RNA sequence */
        sequence: string;
        /** Secondary structure in dot-bracket notation */
        structure: string;
        /** Minimum free energy in kcal/mol */
        mfe: number;
        /** Verified amino acid translation of the sequence */
        aminoAcids: string;
        /** Whether the calculation succeeded */
        success: boolean;
        /** Error message if calculation failed */
        error: string;
    }

    /**
     * Options for CDSfold calculation
     */
    export interface Options {
        /** Maximum distance between base pairs (0 = unlimited) */
        maxBpDistance: number;
        /** Comma-separated codons to exclude (e.g., "CUA,CUG") */
        codonsExcluded: string;
        /** Show memory usage statistics */
        showMemoryUse: boolean;
        /** Estimate memory usage before calculation */
        estimateMemoryUse: boolean;
        /** Use random backtracking */
        randomBacktrack: boolean;
        /** Maximize MFE (heuristic mode) */
        maximizeMfe: boolean;
        /** Enable partial optimization */
        partialOpt: boolean;
        /** Start position for partial optimization (1-based) */
        optFrom: number;
        /** End position for partial optimization (1-based) */
        optTo: number;
        /** Use fixed random seed for reproducibility */
        fixedSeed: boolean;
        /** Temperature in Celsius (default: 37.0) */
        temp: number;
        /** Jitter range 0-1 for energy parameters */
        jitter: number;
    }
}

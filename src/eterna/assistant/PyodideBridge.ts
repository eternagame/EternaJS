/**
 * PyodideBridge.ts - JavaScript bridge for Pyodide to access EternaJS functionality
 *
 * This module is registered with Pyodide so Python code can call EternaJS
 * folding engines and other functionality.
 */

import log from 'loglevel';
import FolderManager from 'eterna/folding/FolderManager';
import Sequence from 'eterna/rnatypes/Sequence';
import SecStruct from 'eterna/rnatypes/SecStruct';
import EPars from 'eterna/EPars';

/**
 * Result from MFE calculation
 */
export interface MFEResult {
    structure: string;
    energy: number;
}

/**
 * Result from base pair probability calculation
 */
export interface BPPResult {
    /** Flattened matrix of probabilities */
    probabilities: number[];
    /** Length of the sequence */
    length: number;
}

/**
 * Bridge module that gets registered with Pyodide.
 * Python code can import this as `import eternajs`.
 */
export const EternajsBridge = {
    /**
     * Get minimum free energy structure for a sequence
     *
     * @param sequenceStr - RNA sequence string (e.g., "ACGUACGU")
     * @param packageName - Folding package name (default: "eternafold")
     * @param temperature - Temperature in Celsius (default: 37)
     * @returns Object with structure (dot-bracket) and energy (kcal/mol)
     */
    mfe(
        sequenceStr: string,
        foldingEngine: string = 'eternafold',
        temperature: number = EPars.DEFAULT_TEMPERATURE
    ): MFEResult {
        const folder = FolderManager.instance.getFolder(foldingEngine);
        if (!folder) {
            log.warn(`Folder not found: ${foldingEngine}, falling back to stub`);
            return {
                structure: '.'.repeat(sequenceStr.length),
                energy: 0.0
            };
        }

        if (!folder.isSync()) {
            log.warn('Folder expected to be synchronous, falling back to stub');
            return {
                structure: '.'.repeat(sequenceStr.length),
                energy: 0.0
            };
        }

        const sequence = Sequence.fromSequenceString(sequenceStr);
        const pairs = folder.foldSequence(sequence, null, null, false, temperature);

        if (!pairs) {
            return {
                structure: '.'.repeat(sequenceStr.length),
                energy: 0.0
            };
        }

        // Get energy by scoring the structure
        const energy = folder.scoreStructures(sequence, pairs, false, temperature) / 100;

        const result = {
            structure: pairs.getParenthesis({pseudoknots: false}),
            energy
        };
        // TODO: PKS?

        return result;
    },

    /**
     * Get base pair probability matrix for a sequence
     *
     * @param sequenceStr - RNA sequence string
     * @param foldingEngine - Folding package name (default: "eternafold")
     * @param temperature - Temperature in Celsius (default: 37)
     * @returns Object with flattened probability array and sequence length
     */
    bpps(
        sequenceStr: string,
        foldingEngine: string = 'eternafold',
        temperature: number = EPars.DEFAULT_TEMPERATURE
    ): BPPResult {
        const folder = FolderManager.instance.getFolder(foldingEngine);
        const length = sequenceStr.length;

        if (!folder || !folder.canDotPlot) {
            log.warn(`Folder ${foldingEngine} doesn't support dot plot, returning zeros`);
            // Return zero matrix
            const size = (length * (length + 1)) / 2;
            return {
                probabilities: new Array(size).fill(0),
                length
            };
        }

        if (!folder.isSync()) {
            log.warn('Folder expected to be synchronous, returning zeros');
            // Return zero matrix
            const size = (length * (length + 1)) / 2;
            return {
                probabilities: new Array(size).fill(0),
                length
            };
        }

        const sequence = Sequence.fromSequenceString(sequenceStr);
        const pairs = folder.foldSequence(sequence, null, null, false, temperature);

        if (!pairs) {
            const size = (length * (length + 1)) / 2;
            return {
                probabilities: new Array(size).fill(0),
                length
            };
        }

        const dotPlot = folder.getDotPlot(sequence, pairs, temperature);

        if (!dotPlot) {
            const size = (length * (length + 1)) / 2;
            return {
                probabilities: new Array(size).fill(0),
                length
            };
        }

        // Convert DotPlot to flattened upper-triangular matrix
        // DotPlot stores [i, j, prob] triplets
        const matrix: number[][] = Array(length).fill(null).map(() => Array(length).fill(0));
        const data = dotPlot.data;

        for (let k = 0; k < data.length; k += 3) {
            const i = data[k] - 1; // Convert to 0-indexed
            const j = data[k + 1] - 1;
            const prob = data[k + 2];
            if (i >= 0 && j >= 0 && i < length && j < length) {
                matrix[i][j] = prob;
                matrix[j][i] = prob;
            }
        }

        // Flatten to upper triangular
        const probabilities: number[] = [];
        for (let i = 0; i < length; i++) {
            for (let j = i; j < length; j++) {
                probabilities.push(matrix[i][j]);
            }
        }

        console.log(probabilities);

        return {probabilities, length};
    },

    /**
     * Calculate free energy for a sequence with a given structure
     *
     * @param sequenceStr - RNA sequence string
     * @param structureStr - Dot-bracket structure string
     * @param foldingEngine - Folding package name (default: "eternafold")
     * @param temperature - Temperature in Celsius (default: 37)
     * @returns Free energy in kcal/mol
     */
    freeEnergy(
        sequenceStr: string,
        structureStr: string,
        foldingEngine: string = 'eternafold',
        temperature: number = EPars.DEFAULT_TEMPERATURE
    ): number {
        const folder = FolderManager.instance.getFolder(foldingEngine);
        if (!folder) {
            log.warn(`Folder not found: ${foldingEngine}`);
            return 0.0;
        }

        const sequence = Sequence.fromSequenceString(sequenceStr);
        const pairs = SecStruct.fromParens(structureStr, folder.canPseudoknot);

        const energy = folder.scoreStructures(sequence, pairs, false, temperature);
        console.log(energy);
        return energy / 100; // Convert to kcal/mol
    },

    /**
     * Get list of available folding packages
     *
     * @returns Array of package names
     */
    getAvailablePackages(): string[] {
        return FolderManager.instance.getFolders();
    },

    /**
     * Check if a package is available
     *
     * @param packageName - Package name to check
     * @returns true if available
     */
    isPackageAvailable(packageName: string): boolean {
        return FolderManager.instance.isFolder(packageName);
    }
};

export default EternajsBridge;

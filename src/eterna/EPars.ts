import Utility from 'eterna/util/Utility';
import {Assert, StyledTextBuilder} from 'flashbang';
import Arrays from 'flashbang/util/Arrays';
import {Oligo, OligoMode} from './rnatypes/Oligo';
import SecStruct from './rnatypes/SecStruct';
import Sequence from './rnatypes/Sequence';

/**
 * These numbers can appear in a sequence: basically, ?ACGU&
 */
export enum RNABase {
    UNDEFINED = 0,
    GUANINE = 3,
    ADENINE = 1,
    URACIL = 4,
    CYTOSINE = 2,
    CUT = 19,
}

/**
 * These are operations that can occur when altering a puzzle (say, in
 * PuzzleEditMode) or when applying glue or markings. Generally but not
 * exclusively, these either alter or depend on the structure as well as the
 * sequence.
 */
export enum RNAPaint {
    PAIR = 5,
    AU_PAIR = 9,
    GU_PAIR = 10,
    GC_PAIR = 11,
    ADD_BASE = 12,
    ADD_PAIR = 13,
    DELETE = 14,
    LOCK = 15,
    BINDING_SITE = 16,

    SHIFT = 17,
    // public static readonly const RNABase_ADD_ANNOTATION:int = 18; //Variable for adding an annotation by lullujune
    MAGIC_GLUE = 20,
    BASE_MARK = 21,
    LIBRARY_SELECT = 22
}

export default class EPars {
    // (almost) follows the Vienna convention for the BP array
    public static readonly FORCE_PAIRED: number = -1;
    public static readonly FORCE_PAIRED3P: number = -2;
    public static readonly FORCE_PAIRED5P: number = -3;
    public static readonly FORCE_UNPAIRED: number = -4;
    public static readonly FORCE_IGNORE: number = -5;

    public static readonly RNABase_DYNAMIC_FIRST: number = 100;

    public static readonly DEFAULT_TEMPERATURE: number = 37;

    public static readonly RNABase_LAST20: number[] = [
        RNABase.ADENINE, RNABase.ADENINE, RNABase.ADENINE, RNABase.GUANINE,
        RNABase.ADENINE, RNABase.ADENINE, RNABase.ADENINE, RNABase.CYTOSINE,
        RNABase.ADENINE, RNABase.ADENINE, RNABase.CYTOSINE, RNABase.ADENINE,
        RNABase.ADENINE, RNABase.CYTOSINE, RNABase.ADENINE, RNABase.ADENINE,
        RNABase.CYTOSINE, RNABase.ADENINE, RNABase.ADENINE, RNABase.CYTOSINE
    ];

    public static getLetterColor(letter: string): number {
        if (letter === 'G') {
            return 0xFF3333;
        } else if (letter === 'A') {
            return 0xFFFF33;
        } else if (letter === 'U') {
            return 0x7777FF;
        } else if (letter === 'C') {
            return 0x33FF33;
        }

        return 0;
    }

    public static addLetterStyles(builder: StyledTextBuilder): void {
        builder.addStyle('G', {fill: this.getLetterColor('G')});
        builder.addStyle('A', {fill: this.getLetterColor('A')});
        builder.addStyle('U', {fill: this.getLetterColor('U')});
        builder.addStyle('C', {fill: this.getLetterColor('C')});
    }

    public static getColoredLetter(letter: string): string {
        if (letter === 'G') {
            return '<G>G</G>';
        } else if (letter === 'A') {
            return '<A>A</A>';
        } else if (letter === 'U') {
            return '<U>U</U>';
        } else if (letter === 'C') {
            return '<C>C</C>';
        }

        return '';
    }

    public static nucleotideToString(value: number, allowCut: boolean = true, allowUnknown: boolean = true): string {
        if (value === RNABase.ADENINE) {
            return 'A';
        } else if (value === RNABase.URACIL) {
            return 'U';
        } else if (value === RNABase.GUANINE) {
            return 'G';
        } else if (value === RNABase.CYTOSINE) {
            return 'C';
        } else if (value === RNABase.CUT) {
            if (allowCut) {
                return '&';
            } else {
                throw new Error(`Bad nucleotide '${value}`);
            }
        } else if (allowUnknown) {
            return '?';
        } else {
            throw new Error(`Bad nucleotide '${value}`);
        }
    }

    public static stringToNucleotide(value: string, allowCut: boolean = true, allowUnknown: boolean = true): number {
        if (value === 'A' || value === 'a') {
            return RNABase.ADENINE;
        } else if (value === 'G' || value === 'g') {
            return RNABase.GUANINE;
        } else if (value === 'U' || value === 'u') {
            return RNABase.URACIL;
        } else if (value === 'C' || value === 'c') {
            return RNABase.CYTOSINE;
        } else if (value === '&' || value === '-' || value === '+') {
            if (allowCut) {
                return RNABase.CUT;
            } else {
                throw new Error(`Bad nucleotide '${value}`);
            }
        } else if (allowUnknown) {
            return RNABase.UNDEFINED;
        } else {
            throw new Error(`Bad nucleotide '${value}`);
        }
    }

    public static nucleotidePairToString(value: number): 'AU'|'GU'|'GC' {
        if (value === RNAPaint.AU_PAIR) {
            return 'AU';
        } else if (value === RNAPaint.GU_PAIR) {
            return 'GU';
        } else if (value === RNAPaint.GC_PAIR) {
            return 'GC';
        } else {
            throw new Error(`Bad nucleotide "${value}"`);
        }
    }

    /**
     *  a version of stringtoSequence expanded to allow specification of indices at end of sequence, e.g.,
     *
     *    ACUGU 11-14 16
     *
     *  will return Array of length 16, padded with UNDEFINED in first 10 positions and
     *  then ADENINE, CYTOSINE, URACIL, GUANOSINE, UNDEFINED, URACIL
     *
     * -- If customNumbering is available, then the indices will be remapped if possible. For example,
     *    if the puzzle is a sub-puzzle of a bigger one and has only four nucleotides with
     *    customNumbering of 13-16, we'd instead get an Array of length 4 with just the
     *    inputted sequences that match up with something in the sub-puzzle:
     *     URACIL, GUANOSINE, UNDEFINED, URACIL
     *
     * -- null's in input string are not mapped (e.g., as 'null,null' or ',,,,' ). So e.g.,
     *
     *  ACUGU 11-12,,,16    or
     *  ACUGU 11-12,null,null,16
     *
     *  will skip placement of UG
     *
     * -- null's in puzzle's customNumbering will not receive any mapping either.
     *
     * -- the only exception is if the input null string *exactly* matches the customNumbering,
     *    in which case its assumed that the players wants to copy/paste within the same puzzle.
     *
     *  TODO: properly handle oligos, e.g.
     *       ACUGU&ACAGU 2-11
     *
     * @param strInput string inputted like 'ACUGU 11-12,,,16'
     * @returns array of Nucleotide enums like [RNABase_ADENINE, ...]
     */
    public static indexedStringToSequence(strInput: string, customNumbering?: (number | null)[]):
    Sequence | undefined {
        // make robust to blanks:
        const strChunks: string[] = strInput.trim().split(/\s+/); // spaces
        if (strChunks.length === 0) return new Sequence([]); // blank sequence, no op.
        const seqStr = strChunks[0]; // sequence like ACUGU

        // process rest of string like '11-14 16' to get indices for pasting
        let indices: (number | null)[] | undefined = [];
        if (strChunks.length > 1) {
            indices = Utility.getIndices(strChunks.slice(1).join());
            if (indices === undefined) return undefined; // signal error
        } else if (customNumbering != null && seqStr.length === customNumbering.length) {
            // no indices specified after sequence; can happen when copying from
            //  legacy puzzles or if player has noted down solutions from other software.
            // assume player is copy/pasting sequence for same puzzle.
            indices = customNumbering;
        } else {
            // player may be pasting a legacy solution without any indices.
            // assume the indices are 1,2,...
            indices = Array(seqStr.length).fill(0).map((_, idx) => idx + 1);
        }

        // remap indices to match puzzle's "custom numbering"
        if (customNumbering !== undefined) {
            if (Arrays.shallowEqual(customNumbering, indices)) {
                // assume player is copy/pasting into the same puzzle.
                return Sequence.fromSequenceString(seqStr, true /* allowCut */, true /* allowUnknown */);
            }
            indices = indices.filter((n) => n !== null).map((n) => customNumbering.indexOf(n) + 1);
        }

        const seqArray: number[] = Array(
            Math.max(...(indices.filter((n) => n !== null)) as number[])
        ).fill(RNABase.UNDEFINED);

        for (let n = 0; n < indices.length; n++) {
            const ii = indices[n];
            if (ii !== null && ii >= 0) {
                const char = seqStr.charAt(n);
                seqArray[ii - 1] = this.stringToNucleotide(char, true /* allowCut */, true /* allowUnknown */);
            }
        }
        return new Sequence(seqArray);
    }

    public static parenthesisToForcedArray(parenthesis: string): number[] {
        const forced: number[] = new Array(parenthesis.length).fill(EPars.FORCE_IGNORE);
        const pairStack: number[] = [];

        for (let jj = 0; jj < parenthesis.length; jj++) {
            if (parenthesis.charAt(jj) === '.') {
                continue;
            } else if (parenthesis.charAt(jj) === '|') {
                forced[jj] = EPars.FORCE_PAIRED;
            } else if (parenthesis.charAt(jj) === '<') {
                forced[jj] = EPars.FORCE_PAIRED3P;
            } else if (parenthesis.charAt(jj) === '>') {
                forced[jj] = EPars.FORCE_PAIRED5P;
            } else if (parenthesis.charAt(jj) === 'x') {
                forced[jj] = EPars.FORCE_UNPAIRED;
            } else if (parenthesis.charAt(jj) === '(') {
                pairStack.push(jj);
            } else if (parenthesis.charAt(jj) === ')') {
                if (pairStack.length === 0) {
                    throw new Error('Invalid parenthesis notation');
                }

                forced[pairStack[pairStack.length - 1]] = jj;
                pairStack.pop();
            }
        }

        for (let jj = 0; jj < forced.length; jj++) {
            if (forced[jj] >= 0) forced[forced[jj]] = jj;
        }

        return forced;
    }

    public static forcedArrayToParenthesis(forced: number[]): string {
        let str = '';

        for (let ii = 0; ii < forced.length; ii++) {
            if (forced[ii] > ii) {
                str = str.concat('(');
            } else if (forced[ii] >= 0) {
                str = str.concat(')');
            } else if (forced[ii] === EPars.FORCE_PAIRED) {
                str = str.concat('|');
            } else if (forced[ii] === EPars.FORCE_PAIRED3P) {
                str = str.concat('<');
            } else if (forced[ii] === EPars.FORCE_PAIRED5P) {
                str = str.concat('>');
            } else if (forced[ii] === EPars.FORCE_UNPAIRED) {
                str = str.concat('x');
            } else {
                str = str.concat('.');
            }
        }

        return str;
    }

    public static sequenceDiff(seq1: Sequence, seq2: Sequence, skipRegion: number[] = []): number {
        let diff = 0;
        for (let ii = 0; ii < seq1.length; ii++) {
            if (skipRegion.includes(ii)) continue;
            if (seq1.nt(ii) !== seq2.nt(ii)) {
                diff++;
            }
        }
        return diff;
    }

    public static validateParenthesis(
        parenthesis: string, letteronly: boolean = true, lengthLimit: number = -1
    ): string | null {
        const pairStack: number[] = [];

        if (lengthLimit >= 0 && parenthesis.length > lengthLimit) {
            return `Structure length limit is ${lengthLimit}`;
        }

        for (let jj = 0; jj < parenthesis.length; jj++) {
            if (parenthesis.charAt(jj) === '(') {
                pairStack.push(jj);
            } else if (parenthesis.charAt(jj) === ')') {
                if (pairStack.length === 0) {
                    return 'Unbalanced parenthesis notation';
                }

                pairStack.pop();
            }
        }

        // order 1 PKs
        const pkStack: number[] = [];
        for (let jj = 0; jj < parenthesis.length; jj++) {
            if (parenthesis.charAt(jj) === '[') {
                pkStack.push(jj);
            } else if (parenthesis.charAt(jj) === ']') {
                if (pkStack.length === 0) {
                    return 'Unbalanced parenthesis notation []';
                }

                pkStack.pop();
            }
        }

        // order 2 PKs
        const pkStack2: number[] = [];
        for (let jj = 0; jj < parenthesis.length; jj++) {
            if (parenthesis.charAt(jj) === '{') {
                pkStack2.push(jj);
            } else if (parenthesis.charAt(jj) === '}') {
                if (pkStack2.length === 0) {
                    return 'Unbalanced parenthesis notation {}';
                }

                pkStack2.pop();
            }
        }

        for (let jj = 0; jj < parenthesis.length; ++jj) {
            if (!'.()[]{}'.includes(parenthesis.charAt(jj))) {
                return `Unrecognized character ${parenthesis.charAt(jj)}`;
            }
        }

        if (pairStack.length !== 0) {
            return 'Unbalanced parenthesis notation';
        }

        if (letteronly) {
            return null;
        }

        let index: number = parenthesis.indexOf('(.)');
        if (index >= 0) {
            return `There is a length 1 hairpin loop which is impossible at base ${index + 2}`;
        }

        index = parenthesis.indexOf('(..)');

        if (index >= 0) {
            return `There is a length 2 hairpin loop which is impossible at base ${index + 2}`;
        }

        return null;
    }

    public static arePairsSame(aPairs: SecStruct, bPairs: SecStruct, constraints: boolean[] | null = null): boolean {
        if (aPairs.length !== bPairs.length) {
            return false;
        }

        for (let ii = 0; ii < aPairs.length; ii++) {
            if (bPairs.isPaired(ii)) {
                if (bPairs.pairingPartner(ii) !== aPairs.pairingPartner(ii)) {
                    if (constraints == null || constraints[ii]) {
                        return false;
                    }
                }
            }

            if (aPairs.isPaired(ii)) {
                if (bPairs.pairingPartner(ii) !== aPairs.pairingPartner(ii)) {
                    if (constraints == null || constraints[ii]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    public static pairType(a: number, b: number): number {
        return EPars.PAIR_TYPE_MAT[a * 8 + b];
    }

    public static constructFullSequence(
        baseSequence: Sequence,
        oligo: number[] | undefined,
        oligos: Oligo[] | undefined,
        oligosOrder: number[] | undefined,
        oligoMode: number | undefined
    ) {
        if (oligo == null && oligos === undefined) {
            return baseSequence.slice(0);
        }
        let seq: RNABase[] = baseSequence.baseArray.slice();
        if (oligos === undefined) {
            Assert.assertIsDefined(oligo);
            if (oligoMode === OligoMode.EXT5P) {
                seq = oligo.concat(seq);
            } else {
                if (oligoMode === OligoMode.DIMER) seq.push(RNABase.CUT);
                seq = seq.concat(oligo);
            }
            return new Sequence(seq);
        }
        // _oligos != null, we have a multistrand target
        for (let ii = 0; ii < oligos.length; ii++) {
            seq.push(RNABase.CUT);
            // Note: oligosOrder could be undefined - from what I can tell, this happen if there's
            // only one oligo or if no custom target order has been defined. In this case, it is
            // assumed that the order should be the order they were originally defined in
            seq = seq.concat(oligos[oligosOrder?.[ii] ?? ii].sequence);
        }
        return new Sequence(seq);
    }

    private static readonly PAIR_TYPE_MAT: number[] = [
        /* _  A  C  G  U  X  K  I */
        1, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 5, 0, 0, 5,
        0, 0, 0, 1, 0, 0, 0, 0,
        0, 0, 2, 0, 3, 0, 0, 0,
        0, 6, 0, 4, 0, 0, 0, 6,
        0, 0, 0, 0, 0, 0, 2, 0,
        0, 0, 0, 0, 0, 1, 0, 0,
        0, 6, 0, 0, 5, 0, 0, 0];
}

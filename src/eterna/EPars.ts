import IntLoopPars from 'eterna/IntLoopPars';
import Utility from 'eterna/util/Utility';
import {StyledTextBuilder} from 'flashbang';
import Arrays from 'flashbang/util/Arrays';
import SecStruct from './rnatypes/SecStruct';
import Sequence from './rnatypes/Sequence';

/**
 * These numbers can appear in a sequence: basically, ?ACGU&
 */
export enum RNABase {
    UNDEFINED = 1,
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
    BASE_MARK = 21
}

export default class EPars {
    public static readonly INF: number = 1000000;
    public static readonly NST: number = 0;
    public static readonly MAXLOOP: number = 30;
    public static readonly MAX_NINIO: number = 300;
    public static readonly LXC: number = 107.856;
    public static readonly TERM_AU: number = 50;
    public static readonly NBPAIRS: number = 7;
    public static readonly ML_INTERN37: number = 40;
    public static readonly TURN: number = 3;
    public static readonly DANGLES: number = 1;

    public static readonly ML_BASE37: number = 0;
    public static readonly ML_CLOSING37: number = 340;

    public static readonly DUPLEX_INIT: number = 4.1;

    // (almost) follows the Vienna convention for the BP array
    public static readonly FORCE_PAIRED: number = -1;
    public static readonly FORCE_PAIRED3P: number = -2;
    public static readonly FORCE_PAIRED5P: number = -3;
    public static readonly FORCE_UNPAIRED: number = -4;
    public static readonly FORCE_IGNORE: number = -5;

    public static readonly RNABase_DYNAMIC_FIRST: number = 100;

    public static readonly DEFAULT_TEMPERATURE: number = 37;

    public static readonly F_ninio37: number[] = [0, 40, 50, 20, 10];
    /* only F[2] used */

    public static readonly RNABase_LAST20: number[] = [
        RNABase.ADENINE, RNABase.ADENINE, RNABase.ADENINE, RNABase.GUANINE,
        RNABase.ADENINE, RNABase.ADENINE, RNABase.ADENINE, RNABase.CYTOSINE,
        RNABase.ADENINE, RNABase.ADENINE, RNABase.CYTOSINE, RNABase.ADENINE,
        RNABase.ADENINE, RNABase.CYTOSINE, RNABase.ADENINE, RNABase.ADENINE,
        RNABase.CYTOSINE, RNABase.ADENINE, RNABase.ADENINE, RNABase.CYTOSINE
    ];

    public static readonly HAIRPIN_37: number[] = [
        EPars.INF, EPars.INF, EPars.INF, 570, 560, 560, 540, 590, 560, 640, 650,
        660, 670, 678, 686, 694, 701, 707, 713, 719, 725,
        730, 735, 740, 744, 749, 753, 757, 761, 765, 769];

    public static readonly BULGE_37: number[] = [
        EPars.INF, 380, 280, 320, 360, 400, 440, 459, 470, 480, 490,
        500, 510, 519, 527, 534, 541, 548, 554, 560, 565,
        571, 576, 580, 585, 589, 594, 598, 602, 605, 609];

    public static readonly INTERNAL_37: number[] = [
        EPars.INF, EPars.INF, 410, 510, 170, 180, 200, 220, 230, 240, 250,
        260, 270, 278, 286, 294, 301, 307, 313, 319, 325,
        330, 335, 340, 345, 349, 353, 357, 361, 365, 369];

    public static mlIntern(i: number): number {
        if (i > 2) {
            return EPars.ML_INTERN37 + EPars.TERM_AU;
        } else {
            return EPars.ML_INTERN37;
        }
    }

    public static getBarcodeHairpin(seq: string): string | null {
        const hairpinMatch: RegExpExecArray | null = (/[AGUC]{7}UUCG([AGUC]{7})AAAAGAAACAACAACAACAAC$/i).exec(seq);
        if (hairpinMatch == null) {
            return null;
        }
        return hairpinMatch[1];
    }

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

    public static sequenceDiff(seq1: Sequence, seq2: Sequence): number {
        let diff = 0;
        for (let ii = 0; ii < seq1.length; ii++) {
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
            } else if (parenthesis.charAt(jj) !== '.') {
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
        return EPars.PAIR_TYPE_MAT[a * (EPars.NBPAIRS + 1) + b];
    }

    public static getBulge(i: number): number {
        return EPars.BULGE_37[30] + (Number)(EPars.LXC * Math.log((Number)(i) / 30.0));
    }

    public static getInternal(i: number): number {
        return EPars.INTERNAL_37[30] + (Number)(EPars.LXC * Math.log((Number)(i) / 30.0));
    }

    public static hairpinMismatch(type: number, s1: number, s2: number): number {
        return EPars.MISMATCH_H37[type * 25 + s1 * 5 + s2];
    }

    public static internalMismatch(type: number, s1: number, s2: number): number {
        return EPars.MISMATCH_I37[type * 25 + s1 * 5 + s2];
    }

    public static getStackScore(t1: number, t2: number, b1: boolean, b2: boolean): number {
        if (b1 && b2) {
            return EPars.STACK_37[t1 * (EPars.NBPAIRS + 1) + t2];
        } else if ((!b1) && (!b2)) {
            return EPars.STACK_37[t1 * (EPars.NBPAIRS + 1) + t2] + 200;
        } else {
            return EPars.STACK_37[t1 * (EPars.NBPAIRS + 1) + t2] + 100;
        }
    }

    public static getTetraLoopBonus(loop: string): number {
        for (let ii = 0; ii < EPars.TETRA_LOOPS.length; ii++) {
            if (EPars.TETRA_LOOPS[ii] === loop) {
                return EPars.TETRA_ENERGY_37[ii];
            }
        }

        return 0;
    }

    public static getDangle5Score(t1: number, s: number): number {
        const ret: number = EPars.DANGLE5_37[t1 * 5 + s];
        if (ret > 0) {
            return 0;
        } else {
            return ret;
        }
    }

    public static getDangle3Score(t1: number, s: number): number {
        const ret: number = EPars.DANGLE3_37[t1 * 5 + s];
        if (ret > 0) {
            return 0;
        } else {
            return ret;
        }
    }

    public static getInt11(t1: number, t2: number, s1: number, s2: number): number {
        return IntLoopPars.int11_37[s2 + s1 * 5 + t2 * 25 + t1 * (EPars.NBPAIRS + 1) * 25];
    }

    public static getInt21(t1: number, t2: number, s1: number, s2: number, s3: number): number {
        return IntLoopPars.int21_37[s3 + s2 * 5 + s1 * 25 + t2 * 125 + t1 * (EPars.NBPAIRS + 1) * 125];
    }

    public static getInt22(t1: number, t2: number, s1: number, s2: number, s3: number, s4: number): number {
        if (t1 === 0) {
            return 0;
        } else if (t1 === 1) {
            return IntLoopPars.int22_37_1[s4 + s3 * 5 + s2 * 25 + s1 * 125 + t2 * 625];
        } else if (t1 === 2) {
            return IntLoopPars.int22_37_2[s4 + s3 * 5 + s2 * 25 + s1 * 125 + t2 * 625];
        } else if (t1 === 3) {
            return IntLoopPars.int22_37_3[s4 + s3 * 5 + s2 * 25 + s1 * 125 + t2 * 625];
        } else if (t1 === 4) {
            return IntLoopPars.int22_37_4[s4 + s3 * 5 + s2 * 25 + s1 * 125 + t2 * 625];
        } else if (t1 === 5) {
            return IntLoopPars.int22_37_5[s4 + s3 * 5 + s2 * 25 + s1 * 125 + t2 * 625];
        } else if (t1 === 6) {
            return IntLoopPars.int22_37_6[s4 + s3 * 5 + s2 * 25 + s1 * 125 + t2 * 625];
        } else {
            return IntLoopPars.int22_37_7[s4 + s3 * 5 + s2 * 25 + s1 * 125 + t2 * 625];
        }
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

    private static readonly MISMATCH_I37: number[] = [
        0, 0, 0, 0, 0,
        0, 0, 0, 0, 0,
        0, 0, 0, 0, 0,
        0, 0, 0, 0, 0,
        0, 0, 0, 0, 0,

        /* CG */
        0, 0, 0, 0, 0, /* @@  @A  @C  @G  @U */
        0, 0, 0, -110, 0, /* A@  AA  AC  AG  AU */
        0, 0, 0, 0, 0, /* C@  CA  CC  CG  CU */
        0, -110, 0, 0, 0, /* G@  GA  GC  GG  GU */
        0, 0, 0, 0, -70, /* U@  UA  UC  UG  UU */

        /* GC */
        0, 0, 0, 0, 0, /* @@  @A  @C  @G  @U */
        0, 0, 0, -110, 0, /* A@  AA  AC  AG  AU */
        0, 0, 0, 0, 0, /* C@  CA  CC  CG  CU */
        0, -110, 0, 0, 0, /* G@  GA  GC  GG  GU */
        0, 0, 0, 0, -70, /* U@  UA  UC  UG  UU */

        /* GU */
        0, 0, 0, 0, 0, /* @@  @A  @C  @G  @U */
        0, 70, 70, -40, 70, /* A@  AA  AC  AG  AU */
        0, 70, 70, 70, 70, /* C@  CA  CC  CG  CU */
        0, -40, 70, 70, 70, /* G@  GA  GC  GG  GU */
        0, 70, 70, 70, 0, /* U@  UA  UC  UG  UU */

        /* UG */
        0, 0, 0, 0, 0, /* @@  @A  @C  @G  @U */
        0, 70, 70, -40, 70, /* A@  AA  AC  AG  AU */
        0, 70, 70, 70, 70, /* C@  CA  CC  CG  CU */
        0, -40, 70, 70, 70, /* G@  GA  GC  GG  GU */
        0, 70, 70, 70, 0, /* U@  UA  UC  UG  UU */

        /* AU */
        0, 0, 0, 0, 0, /* @@  @A  @C  @G  @U */
        0, 70, 70, -40, 70, /* A@  AA  AC  AG  AU */
        0, 70, 70, 70, 70, /* C@  CA  CC  CG  CU */
        0, -40, 70, 70, 70, /* G@  GA  GC  GG  GU */
        0, 70, 70, 70, 0, /* U@  UA  UC  UG  UU */

        /* UA */
        0, 0, 0, 0, 0, /* @@  @A  @C  @G  @U */
        0, 70, 70, -40, 70, /* A@  AA  AC  AG  AU */
        0, 70, 70, 70, 70, /* C@  CA  CC  CG  CU */
        0, -40, 70, 70, 70, /* G@  GA  GC  GG  GU */
        0, 70, 70, 70, 0, /* U@  UA  UC  UG  UU */

        /* @@ */
        90, 90, 90, 90, 90,
        90, 90, 90, 90, -20,
        90, 90, 90, 90, 90,
        90, -20, 90, 90, 90,
        90, 90, 90, 90, 20
    ];

    private static readonly MISMATCH_H37: number[] = [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,

        /* CG */
        0, 0, 0, 0, 0, /* @@  @A  @C  @G  @U */
        -90, -150, -150, -140, -180, /* A@  AA  AC  AG  AU */
        -90, -100, -90, -290, -80, /* C@  CA  CC  CG  CU */
        -90, -220, -200, -160, -110, /* G@  GA  GC  GG  GU */
        -90, -170, -140, -180, -200, /* U@  UA  UC  UG  UU */
        /* GC */
        0, 0, 0, 0, 0, /* @@  @A  @C  @G  @U */
        -70, -110, -150, -130, -210, /* A@  AA  AC  AG  AU */
        -70, -110, -70, -240, -50, /* C@  CA  CC  CG  CU */
        -70, -240, -290, -140, -120, /* G@  GA  GC  GG  GU */
        -70, -190, -100, -220, -150, /* U@  UA  UC  UG  UU */
        /* GU */
        0, 0, 0, 0, 0, /* @@  @A  @C  @G  @U */
        0, 20, -50, -30, -30, /* A@  AA  AC  AG  AU */
        0, -10, -20, -150, -20, /* C@  CA  CC  CG  CU */
        0, -90, -110, -30, 0, /* G@  GA  GC  GG  GU */
        0, -30, -30, -40, -110, /* U@  UA  UC  UG  UU */
        /* UG */
        0, 0, 0, 0, 0, /* @@  @A  @C  @G  @U */
        0, -50, -30, -60, -50, /* A@  AA  AC  AG  AU */
        0, -20, -10, -170, 0, /* C@  CA  CC  CG  CU */
        0, -80, -120, -30, -70, /* G@  GA  GC  GG  GU */
        0, -60, -10, -60, -80, /* U@  UA  UC  UG  UU */
        /* AU */
        0, 0, 0, 0, 0, /* @@  @A  @C  @G  @U */
        0, -30, -50, -30, -30, /* A@  AA  AC  AG  AU */
        0, -10, -20, -150, -20, /* C@  CA  CC  CG  CU */
        0, -110, -120, -20, 20, /* G@  GA  GC  GG  GU */
        0, -30, -30, -60, -110, /* U@  UA  UC  UG  UU */
        /* UA */
        0, 0, 0, 0, 0, /* @@  @A  @C  @G  @U */
        0, -50, -30, -60, -50, /* A@  AA  AC  AG  AU */
        0, -20, -10, -120, -0, /* C@  CA  CC  CG  CU */
        0, -140, -120, -70, -20, /* G@  GA  GC  GG  GU */
        0, -30, -10, -50, -80, /* U@  UA  UC  UG  UU */
        /* @@ */
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ];

    private static readonly STACK_37: number[] = [
        /*          CG     GC     GU     UG     AU     UA  */
        EPars.INF, EPars.INF, EPars.INF, EPars.INF, EPars.INF, EPars.INF, EPars.INF, EPars.INF,
        EPars.INF, -240, -330, -210, -140, -210, -210, EPars.NST,
        EPars.INF, -330, -340, -250, -150, -220, -240, EPars.NST,
        EPars.INF, -210, -250, 130, -50, -140, -130, EPars.NST,
        EPars.INF, -140, -150, -50, 30, -60, -100, EPars.NST,
        EPars.INF, -210, -220, -140, -60, -110, -90, EPars.NST,
        EPars.INF, -210, -240, -130, -100, -90, -130, EPars.NST,
        EPars.INF, EPars.NST, EPars.NST, EPars.NST, EPars.NST, EPars.NST, EPars.NST, EPars.NST
    ];

    private static readonly DANGLE5_37: number[] = [
        EPars.INF, EPars.INF, EPars.INF, EPars.INF, EPars.INF, /* no pair */
        EPars.INF, -50, -30, -20, -10, /* CG  (stacks on C) */
        EPars.INF, -20, -30, -0, -0, /* GC  (stacks on G) */
        EPars.INF, -30, -30, -40, -20, /* GU */
        EPars.INF, -30, -10, -20, -20, /* UG */
        EPars.INF, -30, -30, -40, -20, /* AU */
        EPars.INF, -30, -10, -20, -20, /* UA */
        0, 0, 0, 0, 0 /*  @ */
    ];

    private static readonly DANGLE3_37: number[] = [
        /*   @     A     C     G     U   */
        EPars.INF, EPars.INF, EPars.INF, EPars.INF, EPars.INF, /* no pair */
        EPars.INF, -110, -40, -130, -60, /* CG  (stacks on G) */
        EPars.INF, -170, -80, -170, -120, /* GC */
        EPars.INF, -70, -10, -70, -10, /* GU */
        EPars.INF, -80, -50, -80, -60, /* UG */
        EPars.INF, -70, -10, -70, -10, /* AU */
        EPars.INF, -80, -50, -80, -60, /* UA */
        0, 0, 0, 0, 0 /*  @ */
    ];

    private static readonly TETRA_ENERGY_37: number[] = [
        300, -300, -300, -300, -300, -300, -300, -300, -300, -250, -250, -250,
        -250, -250, -200, -200, -200, -200, -200, -150, -150, -150, -150, -150,
        -150, -150, -150, -150, -150, -150];

    private static readonly TETRA_LOOPS: string[] = [
        'GGGGAC', 'GGUGAC', 'CGAAAG', 'GGAGAC', 'CGCAAG', 'GGAAAC', 'CGGAAG', 'CUUCGG', 'CGUGAG', 'CGAAGG',
        'CUACGG', 'GGCAAC', 'CGCGAG', 'UGAGAG', 'CGAGAG', 'AGAAAU', 'CGUAAG', 'CUAACG', 'UGAAAG', 'GGAAGC',
        'GGGAAC', 'UGAAAA', 'AGCAAU', 'AGUAAU', 'CGGGAG', 'AGUGAU', 'GGCGAC', 'GGGAGC', 'GUGAAC', 'UGGAAA'];
}

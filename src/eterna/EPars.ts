import IntLoopPars from 'eterna/IntLoopPars';
import Utility from 'eterna/util/Utility';
import {StyledTextBuilder} from 'flashbang';
import Arrays from 'flashbang/util/Arrays';

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

    public static readonly RNABASE_UNDEFINED: number = 0;
    public static readonly RNABASE_GUANINE: number = 3;
    public static readonly RNABASE_ADENINE: number = 1;
    public static readonly RNABASE_URACIL: number = 4;
    public static readonly RNABASE_CYTOSINE: number = 2;
    public static readonly RNABASE_PAIR: number = 5;
    public static readonly RNABASE_SELECT: number = 6;
    public static readonly RNABASE_MAGIC: number = 7;
    public static readonly RNABASE_RANDOM: number = 8;
    public static readonly RNABASE_AU_PAIR: number = 9;
    public static readonly RNABASE_GU_PAIR: number = 10;
    public static readonly RNABASE_GC_PAIR: number = 11;

    public static readonly RNABASE_ADD_BASE: number = 12;
    public static readonly RNABASE_ADD_PAIR: number = 13;
    public static readonly RNABASE_DELETE: number = 14;
    public static readonly RNABASE_LOCK: number = 15;
    public static readonly RNABASE_BINDING_SITE: number = 16;

    public static readonly RNABASE_SHIFT: number = 17;
    // public static readonly const RNABASE_ADD_ANNOTATION:int = 18; //Variable for adding an annotation by lullujune
    public static readonly RNABASE_CUT: number = 19;
    public static readonly RNABASE_MAGIC_GLUE: number = 20;
    public static readonly RNABASE_BASE_MARK: number = 21;

    // (almost) follows the Vienna convention for the BP array
    public static readonly FORCE_PAIRED: number = -1;
    public static readonly FORCE_PAIRED3P: number = -2;
    public static readonly FORCE_PAIRED5P: number = -3;
    public static readonly FORCE_UNPAIRED: number = -4;
    public static readonly FORCE_IGNORE: number = -5;

    public static readonly RNABASE_DYNAMIC_FIRST: number = 100;

    public static readonly DEFAULT_TEMPERATURE: number = 37;

    public static readonly F_ninio37: number[] = [0, 40, 50, 20, 10];
    /* only F[2] used */

    public static readonly RNABASE_LAST20: number[] = [
        EPars.RNABASE_ADENINE, EPars.RNABASE_ADENINE, EPars.RNABASE_ADENINE, EPars.RNABASE_GUANINE,
        EPars.RNABASE_ADENINE, EPars.RNABASE_ADENINE, EPars.RNABASE_ADENINE, EPars.RNABASE_CYTOSINE,
        EPars.RNABASE_ADENINE, EPars.RNABASE_ADENINE, EPars.RNABASE_CYTOSINE, EPars.RNABASE_ADENINE,
        EPars.RNABASE_ADENINE, EPars.RNABASE_CYTOSINE, EPars.RNABASE_ADENINE, EPars.RNABASE_ADENINE,
        EPars.RNABASE_CYTOSINE, EPars.RNABASE_ADENINE, EPars.RNABASE_ADENINE, EPars.RNABASE_CYTOSINE
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
        let hairpinMatch: RegExpExecArray | null = (/[AGUC]{7}UUCG([AGUC]{7})AAAAGAAACAACAACAACAAC$/i).exec(seq);
        if (hairpinMatch == null) {
            return null;
        }
        return hairpinMatch[1];
    }

    public static getLongestStackLength(pairs: number[]): number {
        let longlen = 0;

        let stackStart = -1;
        let lastStackOther = -1;

        for (let ii = 0; ii < pairs.length; ii++) {
            if (pairs[ii] > ii) {
                if (stackStart < 0) {
                    stackStart = ii;
                }

                let isContinued = false;
                if (lastStackOther < 0) {
                    isContinued = true;
                } else if (pairs[ii] === lastStackOther - 1) {
                    isContinued = true;
                }

                if (isContinued) {
                    lastStackOther = pairs[ii];
                } else {
                    if (stackStart >= 0 && ii - stackStart > longlen) {
                        longlen = ii - stackStart;
                    }

                    lastStackOther = -1;
                    stackStart = -1;
                }
            } else {
                if (stackStart >= 0 && ii - stackStart > longlen) {
                    longlen = ii - stackStart;
                }

                stackStart = -1;
                lastStackOther = -1;
            }
        }

        return longlen;
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

    public static getColoredSequence(seq: string): string {
        let res = '';
        for (let ii = 0; ii < seq.length; ii++) {
            res += EPars.getColoredLetter(seq[ii]);
        }
        return res;
    }

    public static getExpColoredSequence(seq: string, expData: number[]): string {
        if (expData == null) {
            return seq;
        }

        let offset: number = expData[0];
        let maxmax: number = expData[1];
        let minmin: number = expData[1];
        for (let ii = 1; ii < expData.length; ii++) {
            if (expData[ii] > maxmax) {
                maxmax = expData[ii];
            }

            if (expData[ii] < minmin) {
                minmin = expData[ii];
            }
        }

        let avg: number = (maxmax + minmin) / 2.0;

        let res = '';
        for (let ii = 0; ii < seq.length; ii++) {
            if (ii < offset - 1 || ii >= expData.length) {
                res += seq[ii];
            } else if (expData[ii] < avg) {
                res += `<FONT COLOR='#7777FF'>${seq[ii]}</FONT>`;
            } else {
                res += `<FONT COLOR='#FF7777'>${seq[ii]}</FONT>`;
            }
        }

        return res;
    }

    public static countConsecutive(sequence: number[], letter: number, locks: boolean[] | null = null): number {
        let maxConsecutive = 0;

        let ii = 0;
        let startIndex = -1;
        for (ii = 0; ii < sequence.length; ii++) {
            if (sequence[ii] === letter) {
                if (startIndex < 0) {
                    startIndex = ii;
                }
            } else if (startIndex >= 0) {
                if (maxConsecutive < ii - startIndex) {
                    if (locks == null) {
                        maxConsecutive = ii - startIndex;
                    } else {
                        let allLocked = true;
                        let jj: number;
                        for (jj = startIndex; jj < ii; jj++) {
                            allLocked = allLocked && locks[jj];
                        }
                        if (allLocked === false) {
                            maxConsecutive = ii - startIndex;
                        }
                    }
                }
                startIndex = -1;
            }
        }

        if (startIndex >= 0) {
            if (maxConsecutive < ii - startIndex) {
                maxConsecutive = ii - startIndex;
            }
        }

        return maxConsecutive;
    }

    public static getRestrictedConsecutive(
        sequence: number[], letter: number, maxAllowed: number, locks: boolean[] | null = null
    ): number[] {
        let restricted: number[] = [];

        let ii = 0;
        let startIndex = -1;

        if (maxAllowed <= 0) {
            return restricted;
        }

        for (ii = 0; ii < sequence.length; ii++) {
            if (sequence[ii] === letter) {
                if (startIndex < 0) {
                    startIndex = ii;
                }
            } else if (startIndex >= 0) {
                if (maxAllowed < ii - startIndex) {
                    if (locks == null) {
                        restricted.push(startIndex);
                        restricted.push(ii - 1);
                    } else {
                        let allLocked = true;
                        let jj: number;
                        for (jj = startIndex; jj < ii; jj++) {
                            allLocked = allLocked && locks[jj];
                        }
                        if (allLocked === false) {
                            restricted.push(startIndex);
                            restricted.push(ii - 1);
                        }
                    }
                }
                startIndex = -1;
            }
        }

        // gotta check if we found a startIndex without an end...
        if (startIndex >= 0) {
            if (maxAllowed < ii - startIndex) {
                restricted.push(startIndex);
                restricted.push(ii - 1);
            }
        }

        return restricted;
    }

    public static getSequenceRepetition(seqStr: string, n: number): number {
        let dict: Set<string> = new Set<string>();
        let numRepeats = 0;

        for (let ii = 0; ii < seqStr.length - n; ii++) {
            let substr: string = seqStr.substr(ii, n);
            if (dict.has(substr)) {
                numRepeats++;
            } else {
                dict.add(substr);
            }
        }

        return numRepeats++;
    }

    public static nucleotideToString(value: number, allowCut: boolean, allowUnknown: boolean): string {
        if (value === EPars.RNABASE_ADENINE) {
            return 'A';
        } else if (value === EPars.RNABASE_URACIL) {
            return 'U';
        } else if (value === EPars.RNABASE_GUANINE) {
            return 'G';
        } else if (value === EPars.RNABASE_CYTOSINE) {
            return 'C';
        } else if (value === EPars.RNABASE_CUT) {
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

    public static stringToNucleotide(value: string, allowCut: boolean, allowUnknown: boolean): number {
        if (value === 'A' || value === 'a') {
            return EPars.RNABASE_ADENINE;
        } else if (value === 'G' || value === 'g') {
            return EPars.RNABASE_GUANINE;
        } else if (value === 'U' || value === 'u') {
            return EPars.RNABASE_URACIL;
        } else if (value === 'C' || value === 'c') {
            return EPars.RNABASE_CYTOSINE;
        } else if (value === '&' || value === '-' || value === '+') {
            if (allowCut) {
                return EPars.RNABASE_CUT;
            } else {
                throw new Error(`Bad nucleotide '${value}`);
            }
        } else if (allowUnknown) {
            return EPars.RNABASE_UNDEFINED;
        } else {
            throw new Error(`Bad nucleotide '${value}`);
        }
    }

    public static nucleotidePairToString(value: number): 'AU'|'GU'|'GC' {
        if (value === EPars.RNABASE_AU_PAIR) {
            return 'AU';
        } else if (value === EPars.RNABASE_GU_PAIR) {
            return 'GU';
        } else if (value === EPars.RNABASE_GC_PAIR) {
            return 'GC';
        } else {
            throw new Error(`Bad nucleotide "${value}"`);
        }
    }

    public static stringToSequence(seq: string, allowCut: boolean = true, allowUnknown: boolean = true): number[] {
        let seqArray: number[] = [];
        for (const char of seq) {
            seqArray.push(this.stringToNucleotide(char, allowCut, allowUnknown));
        }
        return seqArray;
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
     * @returns array of Nucleotide enums like [RNABASE_ADENINE, ...]
     */
    public static indexedStringToSequence(strInput: string, customNumbering?: (number | null)[]):
    number[] | undefined {
        // make robust to blanks:
        let strChunks: string[] = strInput.trim().split(/\s+/); // spaces
        if (strChunks.length === 0) return []; // blank sequence, no op.
        let seqStr = strChunks[0]; // sequence like ACUGU

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
                return this.stringToSequence(seqStr, true /* allowCut */, true /* allowUnknown */);
            }
            indices = indices.filter((n) => n !== null).map((n) => customNumbering.indexOf(n) + 1);
        }

        let seqArray: number[] = Array(
            Math.max(...(indices.filter((n) => n !== null)) as number[])
        ).fill(EPars.RNABASE_UNDEFINED);

        for (let n = 0; n < indices.length; n++) {
            let ii = indices[n];
            if (ii !== null && ii >= 0) {
                let char = seqStr.charAt(n);
                seqArray[ii - 1] = this.stringToNucleotide(char, true /* allowCut */, true /* allowUnknown */);
            }
        }
        return seqArray;
    }

    public static sequenceToString(sequence: number[], allowCut: boolean = true, allowUnknown: boolean = true): string {
        let str = '';
        for (let value of sequence) {
            str += EPars.nucleotideToString(value, allowCut, allowUnknown);
        }
        return str;
    }

    public static isInternal(index: number, pairs: number[]): number[] | null {
        let pairStartHere = -1;
        let pairEndHere = -1;
        let pairStartThere = -1;
        let pairEndThere = -1;

        if (pairs[index] >= 0) {
            return null;
        }

        let walker: number = index;
        while (walker >= 0) {
            if (pairs[walker] >= 0) {
                pairStartHere = walker;
                pairStartThere = pairs[walker];
                break;
            }
            walker--;
        }

        walker = index;
        while (walker < pairs.length) {
            if (pairs[walker] >= 0) {
                pairEndHere = walker;
                pairEndThere = pairs[walker];
                break;
            }
            walker++;
        }

        if (pairStartHere < 0 || pairEndHere < 0) {
            return null;
        }

        let thereStart: number = Math.min(pairStartThere, pairEndThere);
        let thereEnd: number = Math.max(pairStartThere, pairEndThere);

        if (pairStartHere === thereStart) {
            return null;
        }

        for (let ii: number = thereStart + 1; ii < thereEnd; ii++) {
            if (pairs[ii] >= 0) {
                return null;
            }
        }

        let bases: number[] = [];

        for (let ii = pairStartHere; ii <= pairEndHere; ii++) {
            bases.push(ii);
        }

        for (let ii = thereStart; ii <= thereEnd; ii++) {
            bases.push(ii);
        }

        return bases;
    }

    public static validateParenthesis(
        parenthesis: string, letteronly: boolean = true, lengthLimit: number = -1
    ): string | null {
        let pairStack: number[] = [];

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

    public static parenthesisToPairs(parenthesis: string, pseudoknots: boolean = false): number[] {
        let pairs: number[] = [];
        let pairStack: number[] = [];

        for (let jj = 0; jj < parenthesis.length; jj++) {
            pairs.push(-1);
        }

        for (let jj = 0; jj < parenthesis.length; jj++) {
            if (parenthesis.charAt(jj) === '(') {
                pairStack.push(jj);
            } else if (parenthesis.charAt(jj) === ')') {
                if (pairStack.length === 0) {
                    throw new Error('Invalid parenthesis notation');
                }

                pairs[pairStack[pairStack.length - 1]] = jj;
                pairStack.pop();
            }
        }

        // If pseudoknots should be counted, manually repeat for
        // the char pairs [], {}
        if (pseudoknots) {
            for (let jj = 0; jj < parenthesis.length; jj++) {
                if (parenthesis.charAt(jj) === '[') {
                    pairStack.push(jj);
                } else if (parenthesis.charAt(jj) === ']') {
                    if (pairStack.length === 0) {
                        throw new Error('Invalid parenthesis notation');
                    }

                    pairs[pairStack[pairStack.length - 1]] = jj;
                    pairStack.pop();
                }
            }

            for (let jj = 0; jj < parenthesis.length; jj++) {
                if (parenthesis.charAt(jj) === '{') {
                    pairStack.push(jj);
                } else if (parenthesis.charAt(jj) === '}') {
                    if (pairStack.length === 0) {
                        throw new Error('Invalid parenthesis notation');
                    }

                    pairs[pairStack[pairStack.length - 1]] = jj;
                    pairStack.pop();
                }
            }
            for (let jj = 0; jj < parenthesis.length; jj++) {
                if (parenthesis.charAt(jj) === '<') {
                    pairStack.push(jj);
                } else if (parenthesis.charAt(jj) === '>') {
                    if (pairStack.length === 0) {
                        throw new Error('Invalid parenthesis notation');
                    }

                    pairs[pairStack[pairStack.length - 1]] = jj;
                    pairStack.pop();
                }
            }
        }

        for (let jj = 0; jj < pairs.length; jj++) {
            if (pairs[jj] >= 0) pairs[pairs[jj]] = jj;
        }

        return pairs;
    }

    public static getSatisfiedPairs(pairs: number[], seq: number[]): number[] {
        let retPairs: number[] = new Array(pairs.length);

        for (let ii = 0; ii < pairs.length; ii++) {
            if (pairs[ii] < 0) {
                retPairs[ii] = -1;
            } else if (pairs[ii] > ii) {
                if (EPars.pairType(seq[ii], seq[pairs[ii]]) !== 0) {
                    retPairs[ii] = pairs[ii];
                    retPairs[pairs[ii]] = ii;
                } else {
                    retPairs[ii] = -1;
                    retPairs[pairs[ii]] = -1;
                }
            }
        }

        return retPairs;
    }

    public static pairsToParenthesis(pairs: number[], seq: number[] | null = null,
        pseudoknots: boolean = false): string {
        if (pseudoknots) {
            // given partner-style array, writes dot-parens notation string. handles pseudoknots!
            // example of partner-style array: '((.))' -> [4,3,-1,1,0]
            let bpList: number[] = new Array(pairs.length);

            for (let ii = 0; ii < pairs.length; ii++) {
                bpList[ii] = -1;
            }

            for (let ii = 0; ii < pairs.length; ii++) {
                if (pairs[ii] > ii) {
                    bpList[ii] = pairs[ii];
                    bpList[pairs[ii]] = ii;
                }
            }

            let bps: number[][] = [];
            for (let ii = 0; ii < bpList.length; ++ii) {
                if (bpList[ii] !== -1 && bpList[ii] > ii) {
                    bps.push([ii, bpList[ii]]);
                }
            }

            let stems: number[][][] = [];
            // #bps: list of bp lists
            // # i.e. '((.))' is [[0,4],[1,3]]
            // # Returns list of (list of bp lists), now sorted into stems
            // # i.e. [ list of all bps in stem 1, list of all bps in stem 2]
            // if debug: print(bps)
            for (let ii = 0; ii < bps.length; ++ii) {
                let added = false;
                for (let jj = 0; jj < stems.length; ++jj) {
                    // is this bp adjacent to any element of an existing stem?
                    for (let kk = 0; kk < stems[jj].length; ++kk) {
                        if ((bps[ii][0] - 1 === stems[jj][kk][0] && bps[ii][1] + 1 === stems[jj][kk][1])
                                || (bps[ii][0] + 1 === stems[jj][kk][0] && bps[ii][1] - 1 === stems[jj][kk][1])
                                || (bps[ii][0] - 1 === stems[jj][kk][1] && bps[ii][1] + 1 === stems[jj][kk][0])
                                || (bps[ii][0] + 1 === stems[jj][kk][1] && bps[ii][1] - 1 === stems[jj][kk][0])) {
                            // add to this stem
                            stems[jj].push(bps[ii]);
                            added = true;
                            break;
                        }
                    }
                    if (added) break;
                }
                if (!added) {
                    stems.push([bps[ii]]);
                }
            }
            // if debug: print('stems', stems)

            let dbn: string[] = new Array(pairs.length).fill('.');
            let delimsL = [/\(/i, /\{/i, /\[/i, /</i];// ,'a','b','c']
            let delimsR = [/\)/i, /\}/i, /\]/i, />/i];// ,'a','b','c']
            let charsL = ['(', '{', '[', '<'];
            let charsR = [')', '}', ']', '>'];
            if (stems.length === 0) {
                return dbn.join('');
            } else {
                for (let ii = 0; ii < stems.length; ++ii) {
                    let stem = stems[ii];

                    let pkCtr = 0;
                    let substring = dbn.join('').substring(stem[0][0] + 1, stem[0][1]);
                    // check to see how many delimiter types exist in between where stem is going to go
                    // ah -- it's actually how many delimiters are only half-present, I think.
                    while ((substring.search(delimsL[pkCtr]) !== -1 && substring.search(delimsR[pkCtr]) === -1)
                            || (substring.search(delimsL[pkCtr]) === -1 && substring.search(delimsR[pkCtr]) !== -1)) {
                        pkCtr += 1;
                    }
                    for (let jj = 0; jj < stem.length; ++jj) {
                        let i = stem[jj][0];
                        let j = stem[jj][1];

                        dbn[i] = charsL[pkCtr];
                        dbn[j] = charsR[pkCtr];
                    }
                }
                return dbn.join('');
            }
        }

        let biPairs: number[] = new Array(pairs.length);

        for (let ii = 0; ii < pairs.length; ii++) {
            biPairs[ii] = -1;
        }

        for (let ii = 0; ii < pairs.length; ii++) {
            if (pairs[ii] > ii) {
                biPairs[ii] = pairs[ii];
                biPairs[pairs[ii]] = ii;
            }
        }

        let str = '';

        for (let ii = 0; ii < biPairs.length; ii++) {
            if (biPairs[ii] > ii) {
                str += '(';
            } else if (biPairs[ii] >= 0) {
                str += ')';
            } else if (seq != null && seq[ii] === EPars.RNABASE_CUT) {
                str += '&';
            } else {
                str += '.';
            }
        }

        return str;
    }

    public static filterForPseudoknots(pairs: number[]): number[] {
        // Round-trip to remove all pseudoknots.
        let filtered: string = EPars.pairsToParenthesis(pairs, null, true)
            .replace(/\{/g, '.')
            .replace(/\}/g, '.')
            .replace(/\[/g, '.')
            .replace(/\]/g, '.')
            .replace(/</g, '.')
            .replace(/>/g, '.');
        return EPars.parenthesisToPairs(filtered, true);
    }

    public static onlyPseudoknots(pairs: number[]): number[] {
        // Round-trip to remove all non-pseudoknots.
        let filtered: string = EPars.pairsToParenthesis(pairs, null, true)
            .replace(/\(/g, '.')
            .replace(/\)/g, '.');

        return EPars.parenthesisToPairs(filtered, true);
    }

    public static parenthesisToForcedArray(parenthesis: string): number[] {
        let forced: number[] = [];
        let pairStack: number[] = [];

        for (let jj = 0; jj < parenthesis.length; jj++) {
            forced.push(EPars.FORCE_IGNORE);
        }

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

    public static numPairs(pairs: number[]): number {
        let ret = 0;

        for (let ii = 0; ii < pairs.length; ii++) {
            if (pairs[ii] > ii) {
                ret++;
            }
        }
        return ret;
    }

    public static numGUPairs(sequence: number[], pairs: number[]): number {
        let ret = 0;

        for (let ii = 0; ii < pairs.length; ii++) {
            if (pairs[ii] > ii) {
                if (sequence[ii] === EPars.RNABASE_GUANINE && sequence[pairs[ii]] === EPars.RNABASE_URACIL) {
                    ret++;
                }
                if (sequence[ii] === EPars.RNABASE_URACIL && sequence[pairs[ii]] === EPars.RNABASE_GUANINE) {
                    ret++;
                }
            }
        }

        return ret;
    }

    public static numGCPairs(sequence: number[], pairs: number[]): number {
        let ret = 0;

        for (let ii = 0; ii < pairs.length; ii++) {
            if (pairs[ii] > ii) {
                if (sequence[ii] === EPars.RNABASE_GUANINE && sequence[pairs[ii]] === EPars.RNABASE_CYTOSINE) {
                    ret++;
                }
                if (sequence[ii] === EPars.RNABASE_CYTOSINE && sequence[pairs[ii]] === EPars.RNABASE_GUANINE) {
                    ret++;
                }
            }
        }

        return ret;
    }

    public static numUAPairs(sequence: number[], pairs: number[]): number {
        let ret = 0;

        for (let ii = 0; ii < pairs.length; ii++) {
            if (pairs[ii] > ii) {
                if (sequence[ii] === EPars.RNABASE_ADENINE && sequence[pairs[ii]] === EPars.RNABASE_URACIL) {
                    ret++;
                }
                if (sequence[ii] === EPars.RNABASE_URACIL && sequence[pairs[ii]] === EPars.RNABASE_ADENINE) {
                    ret++;
                }
            }
        }

        return ret;
    }

    public static sequenceDiff(seq1: number[], seq2: number[]): number {
        let diff = 0;
        for (let ii = 0; ii < seq1.length; ii++) {
            if (seq1[ii] !== seq2[ii]) {
                diff++;
            }
        }
        return diff;
    }

    public static arePairsSame(aPairs: number[], bPairs: number[], constraints: boolean[] | null = null): boolean {
        if (aPairs.length !== bPairs.length) {
            return false;
        }

        for (let ii = 0; ii < aPairs.length; ii++) {
            if (bPairs[ii] >= 0) {
                if (bPairs[ii] !== aPairs[ii]) {
                    if (constraints == null || constraints[ii]) {
                        return false;
                    }
                }
            }

            if (aPairs[ii] >= 0) {
                if (bPairs[ii] !== aPairs[ii]) {
                    if (constraints == null || constraints[ii]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    public static hasCut(seq: number[], from: number, to: number): boolean {
        for (let ii: number = from; ii <= to; ii++) {
            if (seq[ii] === EPars.RNABASE_CUT) {
                return true;
            }
        }
        return false;
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
        let ret: number = EPars.DANGLE5_37[t1 * 5 + s];
        if (ret > 0) {
            return 0;
        } else {
            return ret;
        }
    }

    public static getDangle3Score(t1: number, s: number): number {
        let ret: number = EPars.DANGLE3_37[t1 * 5 + s];
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

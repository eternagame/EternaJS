import EPars, {RNABase} from 'eterna/EPars';
import SecStruct from './SecStruct';

export default class Sequence {
    constructor(baseArray: RNABase[]) {
        this._baseArray = baseArray;
    }

    /**
     * Checks if the sequence has a cut.
     * @param from 0-indexed sequence index to start from
     * @param to 0-indexed sequence index to search to (inclusive)
     */
    public hasCut(from: number, to?: number): boolean {
        if (to === undefined) {
            to = from;
        }
        return this.baseArray.slice(from, to + 1).some(
            (c) => c === RNABase.CUT
        );
    }

    /**
     * Constructs a new sequence from a sequence string representation.
     * @param seq The input sequence string
     * @param allowCut Allow a cutpoint in the sequence
     * @param allowUnknown Allow "unknown" positions in the sequence.
     */
    public static fromSequenceString(seq: string, allowCut: boolean = true, allowUnknown: boolean = true) {
        const seqArray: RNABase[] = [];
        for (const char of seq) {
            seqArray.push(EPars.stringToNucleotide(char, allowCut, allowUnknown));
        }
        return new Sequence(seqArray);
    }

    /**
     * Concatenate two sequences
     * @param seq2 the second sequence to be concatenated.
     */
    public concat(seq2: Sequence): Sequence {
        return new Sequence(this._baseArray.concat(seq2.baseArray));
    }

    /**
     * Return a "colored letter" representation, which basically brackets each
     * letter with HTML-like syntax.
     */
    public getColoredSequence(): string {
        let res = '';
        const str = this.sequenceString();
        for (const c of str) {
            res += EPars.getColoredLetter(c);
        }
        return res;
    }

    /**
     * Return a "colored letter" representation, but colored by an array of
     * experimental data.
     */
    public getExpColoredSequence(expData: number[]): string {
        // AMW TODO: how could this be?
        if (expData == null) {
            return this.sequenceString();
        }

        const offset: number = expData[0];
        const maxmax: number = Math.max(...expData.slice(1));
        const minmin: number = Math.min(...expData.slice(1));

        const avg: number = (maxmax + minmin) / 2.0;

        let res = '';
        const str = this.sequenceString();
        for (let ii = 0; ii < this.length; ii++) {
            if (ii < offset - 1 || ii >= expData.length) {
                res += str[ii];
            } else if (expData[ii] < avg) {
                res += `<FONT COLOR='#7777FF'>${str[ii]}</FONT>`;
            } else {
                res += `<FONT COLOR='#FF7777'>${str[ii]}</FONT>`;
            }
        }

        return res;
    }

    /**
     * Count the number of consecutive bases of a particular type, with some
     * allowances made for a possible locked sequence. (An all-locked sequence
     * that's all G shouldn't be counted against you.)
     * @param letter A particular base identity.
     * @param locks An optional locks-array.
     */
    public countConsecutive(letter: RNABase, locks: boolean[] | null = null): number {
        let maxConsecutive = 0;

        let ii = 0;
        let startIndex = -1;
        for (ii = 0; ii < this._baseArray.length; ii++) {
            if (this._baseArray[ii] === letter) {
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

    /**
     * Calculate a big list of all the stretches of `letter` that are longer
     * than `maxAllowed`, ignoring all-locked stretches.
     * @param letter An RNA base letter
     * @param maxAllowed You're allowed this many repeats
     * @param locks An optional locks array
     */
    public getRestrictedConsecutive(
        letter: RNABase, maxAllowed: number, locks: boolean[] | null = null
    ): number[] {
        const restricted: number[] = [];

        let ii = 0;
        let startIndex = -1;

        if (maxAllowed <= 0) {
            return restricted;
        }

        for (ii = 0; ii < this._baseArray.length; ii++) {
            if (this._baseArray[ii] === letter) {
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

    /**
     * The total number of repeats of any n-mer in the sequence.
     * @param n The length of repeat of interest.
     */
    public getSequenceRepetition(n: number): number {
        const dict: Set<string> = new Set<string>();
        let numRepeats = 0;

        for (let ii = 0; ii < this.sequenceString.length - n; ii++) {
            const substr: string = this.sequenceString().substr(ii, n);
            if (dict.has(substr)) {
                numRepeats++;
            } else {
                dict.add(substr);
            }
        }

        return numRepeats++;
    }

    /**
     * Returns the number of GU base pairs in this Sequence, given a SecStruct
     * @param pairs A given secondary structure corresponding to the Sequence.
     */
    public numGUPairs(pairs: SecStruct): number {
        let ret = 0;

        for (let ii = 0; ii < pairs.length; ii++) {
            if (pairs.pairingPartner(ii) > ii) {
                if (this._baseArray[ii] === RNABase.GUANINE
                    && this._baseArray[pairs.pairingPartner(ii)] === RNABase.URACIL) {
                    ret++;
                }
                if (this._baseArray[ii] === RNABase.URACIL
                    && this._baseArray[pairs.pairingPartner(ii)] === RNABase.GUANINE) {
                    ret++;
                }
            }
        }

        return ret;
    }

    /**
     * Returns the number of GC base pairs in this Sequence, given a SecStruct
     * @param pairs A given secondary structure corresponding to the Sequence.
     */
    public numGCPairs(pairs: SecStruct): number {
        let ret = 0;

        for (let ii = 0; ii < pairs.length; ii++) {
            if (pairs.pairingPartner(ii) > ii) {
                if (this._baseArray[ii] === RNABase.GUANINE
                    && this._baseArray[pairs.pairingPartner(ii)] === RNABase.CYTOSINE) {
                    ret++;
                }
                if (this._baseArray[ii] === RNABase.CYTOSINE
                    && this._baseArray[pairs.pairingPartner(ii)] === RNABase.GUANINE) {
                    ret++;
                }
            }
        }

        return ret;
    }

    /**
     * Returns the number of UA base pairs in this Sequence, given a SecStruct
     * @param pairs A given secondary structure corresponding to the Sequence.
     */
    public numUAPairs(pairs: SecStruct): number {
        let ret = 0;

        for (let ii = 0; ii < pairs.length; ii++) {
            if (pairs.pairingPartner(ii) > ii) {
                if (this._baseArray[ii] === RNABase.ADENINE
                    && this._baseArray[pairs.pairingPartner(ii)] === RNABase.URACIL) {
                    ret++;
                }
                if (this._baseArray[ii] === RNABase.URACIL
                    && this._baseArray[pairs.pairingPartner(ii)] === RNABase.ADENINE) {
                    ret++;
                }
            }
        }

        return ret;
    }

    /**
     * The number of appearances of a certain letter
     * @param baseType A letter of interest
     */
    public count(baseType: RNABase) {
        return this._baseArray.reduce(
            (acc, curr) => acc + (curr === baseType ? 1 : 0), 0
        );
    }

    /**
     * The first index where a cut may be found, starting at `startIdx`
     * @param startIdx Starting index for the search
     */
    public findCut(startIdx: number = 0): number {
        return this._baseArray.indexOf(RNABase.CUT, startIdx);
    }

    /**
     * The first index where an undefined residue may be found
     */
    public findUndefined(): number {
        return this._baseArray.indexOf(RNABase.UNDEFINED);
    }

    /**
     * The last index where a cut may be found
     */
    public lastCut(): number {
        return this._baseArray.lastIndexOf(RNABase.CUT);
    }

    public get baseArray(): RNABase[] {
        return this._baseArray;
    }

    public set baseArray(sequence: RNABase[]) {
        this._baseArray = sequence;
    }

    /**
     * Return one sequence position
     * @param ii Sequence position to return
     */
    public nt(ii: number): RNABase {
        return this._baseArray[ii];
    }

    /**
     * Set one sequence position to a new identity
     * @param ii The position
     * @param rb The new identity
     */
    public setNt(ii: number, rb: RNABase) {
        this._baseArray[ii] = rb;
    }

    public sequenceString(allowCut: boolean = true, allowUnknown: boolean = true): string {
        return this._baseArray.map(
            (value) => EPars.nucleotideToString(value, allowCut, allowUnknown)
        ).join('');
    }

    public get length(): number {
        return this._baseArray.length;
    }

    /**
     * Returns a new sequence using indices that obey slice/substr notation, i.e.,
     * start to end-1 are cut out
     * @param start The first index to begin slicing
     * @param end The one-past-the end index; with start === 0, doubles as len
     */
    public slice(start: number, end: number = -1): Sequence {
        if (end === -1) {
            return new Sequence(this._baseArray.slice(start));
        } else {
            return new Sequence(this._baseArray.slice(start, end));
        }
    }

    /**
     * The underlying data, an array of RNABase.
     */
    private _baseArray: RNABase[];
}

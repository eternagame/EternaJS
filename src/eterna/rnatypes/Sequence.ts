import EPars, {RNABase} from 'eterna/EPars';
import SecStruct from './SecStruct';

export default class Sequence {
    constructor(baseArray: RNABase[]) {
        this._baseArray = baseArray;
    }

    public hasCut(from: number, to?: number): boolean {
        if (to === undefined) {
            to = from;
        }
        return this.baseArray.slice(from, to + 1).some(
            (c) => c === RNABase.CUT
        );
    }

    public static fromSequenceString(seq: string, allowCut?: boolean, allowUnknown?: boolean) {
        return new Sequence(EPars.stringToSequence(seq, allowCut, allowUnknown));
    }

    public getColoredSequence(): string {
        let res = '';
        for (const c of this.sequenceString()) {
            res += EPars.getColoredLetter(c);
        }
        return res;
    }

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
        for (let ii = 0; ii < this.sequenceString.length; ii++) {
            if (ii < offset - 1 || ii >= expData.length) {
                res += this.sequenceString()[ii];
            } else if (expData[ii] < avg) {
                res += `<FONT COLOR='#7777FF'>${this.sequenceString()[ii]}</FONT>`;
            } else {
                res += `<FONT COLOR='#FF7777'>${this.sequenceString()[ii]}</FONT>`;
            }
        }

        return res;
    }

    public countConsecutive(letter: number, locks: boolean[] | null = null): number {
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

    public getRestrictedConsecutive(
        letter: number, maxAllowed: number, locks: boolean[] | null = null
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

    public count(baseType: RNABase) {
        return this._baseArray.reduce(
            (acc, curr) => acc + (curr === baseType ? 1 : 0), 0
        );
    }

    public findCut(startIdx: number = 0): number {
        return this._baseArray.indexOf(RNABase.CUT, startIdx);
    }

    public findUndefined(): number {
        return this._baseArray.indexOf(RNABase.UNDEFINED);
    }

    public lastCut(): number {
        return this._baseArray.lastIndexOf(RNABase.CUT);
    }

    public get baseArray(): RNABase[] {
        return this._baseArray;
    }

    public set baseArray(sequence: RNABase[]) {
        this._baseArray = sequence;
    }

    public nt(ii: number): RNABase {
        return this._baseArray[ii];
    }

    public setNt(ii: number, rb: RNABase) {
        this._baseArray[ii] = rb;
    }

    public sequenceString(allowCut: boolean = true, allowUnknown: boolean = true): string {
        return EPars.sequenceToString(this._baseArray, allowCut, allowUnknown);
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

    private _baseArray: RNABase[];
}

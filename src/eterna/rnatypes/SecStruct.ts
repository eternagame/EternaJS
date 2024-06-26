import EPars from 'eterna/EPars';
import Sequence from './Sequence';

export default class SecStruct {
    constructor(pairs: number[] = []) {
        this._pairs = pairs.slice();
    }

    public get length(): number {
        return this._pairs.length;
    }

    public get pairs(): number[] {
        return this._pairs;
    }

    /**
     * A static creator that starts from a dot-bracket notation string.
     * @param str A string in dot-bracket notation
     * @param pseudoknots If true, run through other ()-like characters too, to
     * represent pseudoknots.
     */
    public static fromParens(str: string, pseudoknots: boolean = false): SecStruct {
        const s = new SecStruct();
        s.setPairs(str, pseudoknots);
        return s;
    }

    /**
     * Filter a SecStruct for only the pairs compatible with the sequence given.
     * @param seq A Sequence against which to compare the structure.
     */
    public getSatisfiedPairs(seq: Sequence): SecStruct {
        const retPairs: number[] = new Array(this.length);

        for (let ii = 0; ii < this.length; ii++) {
            if (this.pairs[ii] < 0) {
                retPairs[ii] = -1;
            } else if (this.pairs[ii] > ii) {
                if (EPars.pairType(seq.nt(ii), seq.nt(this.pairs[ii])) !== 0) {
                    retPairs[ii] = this.pairs[ii];
                    retPairs[this.pairs[ii]] = ii;
                } else {
                    retPairs[ii] = -1;
                    retPairs[this.pairs[ii]] = -1;
                }
            }
        }

        return new SecStruct(retPairs);
    }

    /**
     * Is the sequence position paired?
     * @param index
     */
    public isPaired(index: number): boolean {
        return (this._pairs[index] >= 0);
    }

    /**
     * What's the sequence position's pairing partner?
     * @param index
     */
    public pairingPartner(index: number): number {
        return this._pairs[index];
    }

    /**
     * Set the pairing partner to a particular value. If the position was
     * paired to begin with, unpair it first so we don't have an inconsistent
     * state.
     * @param index
     * @param pi
     */
    public setPairingPartner(index: number, pi: number): void {
        if (this.isPaired(index) && this.pairingPartner(index) !== pi) {
            this._pairs[this.pairingPartner(index)] = -1;
        }
        this._pairs[index] = pi;
    }

    /**
     * Set the position, as well as its former pairing partner, to unpaired.
     * @param index
     */
    public setUnpaired(index: number): void {
        this._pairs[this._pairs[index]] = -1;
        this._pairs[index] = -1;
    }

    /**
     * Returns true if there are any pairs.
     */
    public nonempty(): boolean {
        return this._pairs.filter((it) => it !== -1).length !== 0;
    }

    /**
     * Returns null if index is not part of an internal loop; returns all the
     * loop indices otherwise.
     * @param index
     */
    public isInternal(index: number): number[] | null {
        let pairStartHere = -1;
        let pairEndHere = -1;
        let pairStartThere = -1;
        let pairEndThere = -1;

        if (this.pairs[index] >= 0) {
            return null;
        }

        let walker: number = index;
        while (walker >= 0) {
            if (this.pairs[walker] >= 0) {
                pairStartHere = walker;
                pairStartThere = this.pairs[walker];
                break;
            }
            walker--;
        }

        walker = index;
        while (walker < this.pairs.length) {
            if (this.pairs[walker] >= 0) {
                pairEndHere = walker;
                pairEndThere = this.pairs[walker];
                break;
            }
            walker++;
        }

        if (pairStartHere < 0 || pairEndHere < 0) {
            return null;
        }

        const thereStart: number = Math.min(pairStartThere, pairEndThere);
        const thereEnd: number = Math.max(pairStartThere, pairEndThere);

        if (pairStartHere === thereStart) {
            return null;
        }

        for (let ii: number = thereStart + 1; ii < thereEnd; ii++) {
            if (this.pairs[ii] >= 0) {
                return null;
            }
        }

        const bases: number[] = [];

        for (let ii = pairStartHere; ii <= pairEndHere; ii++) {
            bases.push(ii);
        }

        for (let ii = thereStart; ii <= thereEnd; ii++) {
            bases.push(ii);
        }

        return bases;
    }

    /**
     * Return the longest stack length.
     */
    public getLongestStackLength(): number {
        let longlen = 0;

        let stackStart = -1;
        let lastStackOther = -1;

        for (let ii = 0; ii < this._pairs.length; ii++) {
            if (this._pairs[ii] > ii) {
                if (stackStart < 0) {
                    stackStart = ii;
                }

                const isContinued = lastStackOther < 0 || this._pairs[ii] === lastStackOther - 1;

                if (isContinued) {
                    lastStackOther = this._pairs[ii];
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

    /**
     * Set the pairs based on a passed in dot-bracket string, with or without
     * pseudoknots. Used both by the filtering functions and the constructor.
     * @param parenthesis
     * @param pseudoknots
     */
    public setPairs(parenthesis: string, pseudoknots: boolean = false) {
        this._pairs = new Array(parenthesis.length).fill(-1);
        const pairStack: number[] = [];

        for (let jj = 0; jj < parenthesis.length; jj++) {
            if (parenthesis.charAt(jj) === '(') {
                pairStack.push(jj);
            } else if (parenthesis.charAt(jj) === ')') {
                if (pairStack.length === 0) {
                    throw new Error('Invalid parenthesis notation');
                }

                this._pairs[pairStack[pairStack.length - 1]] = jj;
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

                    this._pairs[pairStack[pairStack.length - 1]] = jj;
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

                    this._pairs[pairStack[pairStack.length - 1]] = jj;
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

                    this._pairs[pairStack[pairStack.length - 1]] = jj;
                    pairStack.pop();
                }
            }
        }

        for (let jj = 0; jj < this._pairs.length; jj++) {
            if (this._pairs[jj] >= 0) this._pairs[this._pairs[jj]] = jj;
        }
    }

    public stems(): [number, number][][] {
        const stems: [number, number][][] = [];

        for (let ii = 0; ii < this.length; ++ii) {
            const pi = this.pairingPartner(ii);
            if (ii > pi) {
                continue;
            }

            if (this.isPaired(ii)) {
                // look through stems
                let broke = false;
                for (const stem of stems) {
                    // if there is an adjacent pair, put it on
                    for (const bp of stem) {
                        if ((bp[0] === ii - 1 && bp[1] === pi + 1)
                                || (bp[0] === ii + 1 && bp[1] === pi - 1)
                                || (bp[1] === ii - 1 && bp[0] === pi + 1)
                                || (bp[1] === ii + 1 && bp[0] === pi - 1)) {
                            stem.push([ii, pi]);
                            broke = true;
                            break;
                        }
                    }
                    if (broke) break;
                }
                if (!broke) {
                    stems.push([[ii, pi]]);
                }
            }
        }

        return stems;
    }

    /**
     * Return all the nt that are in a stem with this nt
     * @param idx
     */
    public stemWith(idx: number): [number, number][] {
        const stems = this.stems();
        const pi = this.pairingPartner(idx);
        for (const stem of stems) {
            for (const bp of stem) {
                if ((bp[0] === idx && bp[1] === pi)
                        || (bp[1] === idx && bp[0] === pi)) {
                    return stem;
                }
            }
        }
        return [];
    }

    /**
     * Return the dot-bracket notation.
     * @param seq Sequence passed just for the sake of locating the cutpoint, if
     * there is one.
     * @param pseudoknots Pseudoknots, to help look for places for [] {} <>
     */
    public getParenthesis(seq: Sequence | null = null,
        pseudoknots: boolean = false): string {
        if (pseudoknots) {
            // given partner-style array, writes dot-parens notation string. handles pseudoknots!
            // example of partner-style array: '((.))' -> [4,3,-1,1,0]
            const stems = this.stems();

            const dbn: string[] = new Array(this._pairs.length).fill('.');
            const delimsL = [/\(/i, /\{/i, /\[/i, /</i];// ,'a','b','c']
            const delimsR = [/\)/i, /\}/i, /\]/i, />/i];// ,'a','b','c']
            const charsL = ['(', '{', '[', '<'];
            const charsR = [')', '}', ']', '>'];
            if (stems.length === 0) {
                return dbn.join('');
            } else {
                for (let ii = 0; ii < stems.length; ++ii) {
                    const stem = stems[ii];

                    let pkCtr = 0;
                    const substring = dbn.join('').substring(stem[0][0] + 1, stem[0][1]);
                    // check to see how many delimiter types exist in between where stem is going to go
                    // ah -- it's actually how many delimiters are only half-present, I think.
                    while ((substring.search(delimsL[pkCtr]) !== -1 && substring.search(delimsR[pkCtr]) === -1)
                            || (substring.search(delimsL[pkCtr]) === -1 && substring.search(delimsR[pkCtr]) !== -1)) {
                        pkCtr += 1;
                    }
                    for (let jj = 0; jj < stem.length; ++jj) {
                        const i = stem[jj][0];
                        const j = stem[jj][1];

                        dbn[i] = charsL[pkCtr];
                        dbn[j] = charsR[pkCtr];
                    }
                }
                return dbn.join('');
            }
        }

        const biPairs: number[] = new Array(this._pairs.length).fill(-1);
        for (let ii = 0; ii < this._pairs.length; ii++) {
            if (this._pairs[ii] > ii) {
                biPairs[ii] = this._pairs[ii];
                biPairs[this._pairs[ii]] = ii;
            }
        }

        let str = '';
        for (let ii = 0; ii < biPairs.length; ii++) {
            if (biPairs[ii] > ii) {
                str += '(';
            } else if (biPairs[ii] >= 0) {
                str += ')';
            } else if (seq != null && seq.hasCut(ii)) {
                str += '&';
            } else {
                str += '.';
            }
        }

        return str;
    }

    /**
     * Return a version of the secondary structure with no pseudoknots, useful
     * for visualization.
     */
    public filterForPseudoknots(): SecStruct {
        // Round-trip to remove all pseudoknots.
        const filtered: string = this.getParenthesis(null, true)
            .replace(/\{/g, '.')
            .replace(/\}/g, '.')
            .replace(/\[/g, '.')
            .replace(/\]/g, '.')
            .replace(/</g, '.')
            .replace(/>/g, '.');

        const ss = new SecStruct();
        ss.setPairs(filtered, false);
        return ss;
    }

    /**
     * Return a version of the secondary structure with only pseudoknots, useful
     * for visualization.
     */
    public onlyPseudoknots(): SecStruct {
        // Round-trip to remove all non-pseudoknots.
        const filtered: string = this.getParenthesis(null, true)
            .replace(/\(/g, '.')
            .replace(/\)/g, '.');

        const ss = new SecStruct();
        ss.setPairs(filtered, true);
        return ss;
    }

    /**
     * Return the number of base pairs in total.
     */
    public numPairs(): number {
        let ret = 0;

        for (let ii = 0; ii < this._pairs.length; ii++) {
            if (this._pairs[ii] > ii) {
                ret++;
            }
        }
        return ret;
    }

    /**
     * Return a copy of the SecStruct based on a copy of its underlying data.
     * Importantly, this requires reindexing much of the SecStruct!!
     * @param start
     * @param end
     */
    public slice(start: number, end?: number): SecStruct {
        const pairsB = this._pairs.slice(start, end);

        for (let ii = 0; ii < pairsB.length; ii++) {
            if (pairsB[ii] >= 0) pairsB[ii] -= start;
        }

        return new SecStruct(pairsB);
    }

    /**
     * The underlying data: an array of numbers. These numbers correspond to the
     * base paired index at each position. -1 means unpaired, and a number from
     * zero to len-1 indicates a pairing partner.
     */
    private _pairs: number[] = [];
}

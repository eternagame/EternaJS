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

        if (pseudoknots) {
            const pairStacksLeftMap: Record<string, number[] | undefined> = {
                '(': [],
                '[': [],
                '{': [],
                '<': []
            };

            const pairStacksRightMap: Record<string, number[] | undefined> = {
                ')': pairStacksLeftMap['('],
                ']': pairStacksLeftMap['['],
                '}': pairStacksLeftMap['{'],
                '>': pairStacksLeftMap['<']
            };

            for (let jj = 0; jj < parenthesis.length; jj++) {
                const char = parenthesis.charAt(jj);
                // Note that we forward-declare this and assign in the conditional in order
                // to avoid doing a lookup twice (or introducing extra nesting)
                let pairStack: number[] | undefined;
                if (char === '.') {
                    continue;
                } else if (
                    (pairStack = pairStacksLeftMap[char])
                ) {
                    pairStack.push(jj);
                } else if (char >= 'a' && char <= 'z') {
                    pairStack = [];
                    pairStacksLeftMap[char] = pairStack;
                    pairStacksRightMap[char.toUpperCase()] = pairStack;
                    pairStack.push(jj);
                } else if (
                    (pairStack = pairStacksRightMap[char])
                ) {
                    const partner = pairStack.pop();
                    if (partner === undefined) throw new Error('Invalid parenthesis notation');
                    this._pairs[jj] = partner;
                    this._pairs[partner] = jj;
                } else if (char === '&') {
                    continue;
                } else {
                    throw new Error('Invalid parenthesis notation');
                }
            }
        } else {
            // Faster implementation if we can assume no pseudoknots
            const pairStack: number[] = [];

            for (let jj = 0; jj < parenthesis.length; jj++) {
                const char = parenthesis.charAt(jj);
                if (char === '(') {
                    pairStack.push(jj);
                } else if (char === ')') {
                    const partner = pairStack.pop();
                    if (partner === undefined) throw new Error('Invalid parenthesis notation');
                    this._pairs[jj] = partner;
                    this._pairs[partner] = jj;
                } else if (char !== '.' && char !== '&') {
                    throw new Error(`Invalid dot-bracket character ${char}`);
                }
            }
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
     * @param pseudoknots Whether or not characters representing pseudoknots should be supported
     */
    public getParenthesis(seq: Sequence | null = null,
        pseudoknots: boolean = false): string {
        if (pseudoknots) {
            const dbn: string[] = new Array(this._pairs.length).fill('.');
            const charsL = ['(', '{', '[', '<'];
            const charsR = [')', '}', ']', '>'];
            // Add a-z (left)/A-Z (right)
            for (let i = 0; i < 26; i++) {
                charsL.push(String.fromCharCode(i + 97));
                charsR.push(String.fromCharCode(i + 65));
            }

            // For each pseudoknot degree/character, we maintain an array of base indices
            // which are on the closing end of a pair which is represented with that degree
            // (more specifically, only pairs which it's possible for us to "cross" with a new pair)
            const closingBasesPerDegree: number[][] = new Array(charsL.length).fill(null).map(() => []);

            for (const [bpA, bpB] of this.pairs.entries()) {
                // Skip unpaired bases (already in our structure) and pairs which map the "closing"
                // half to the "opening" half (we've already processed this pair from the other direction)
                if (bpA > bpB || bpB === -1) continue;

                // Find the first pseudoknot degree for which adding this pair would not introduce
                // a "cross" (ie, 1-10 crosses with 2-11, but not 2-9. We can't use this degree
                // if there's a cross because then the characters would match with the wrong bases)
                //
                // We define two pairs (a,b) and (c,d) (with a < b and c < d) as crossed if c > a and
                // d > b - that is, (a,b) starts, then (c,d) starts, but (a,b) ends before
                // (c,d) ends. ((.)) is the normal case, ({.)} is the crossed case.
                //
                // As such, as we walk through each base, we keep tabs on all pairs which
                // have started, but not ended yet.
                let handled = false;
                for (const [degree, closingBases] of closingBasesPerDegree.entries()) {
                    // If we've already moved past the closing half of a pair, we don't have
                    // to worry about it any more - we can't cross with that stem.
                    //
                    // EG: Consider `(.).(.)`. If we're at base 4, we no longer have to worry about
                    // the possibility of crossing pair 1-3 because any future pairs we process
                    // will only pair later in the stem
                    while (closingBases.length && closingBases[0] < bpA) closingBases.shift();
                    // If there are no pairs which have been opened but not closed, or if the next
                    // closing base of a pair is after the closing base of this pair, we can use
                    // this degree. Otherwise, try the next degree (by continuing the loop).
                    //
                    // Eg: `(.(.).)`. When processing pair 3-5, we know we're not crossing
                    // 1-7 because bpA is necessarily after 1-7's start pair and we've confirmed
                    // bpB is before 1-7's end pair
                    if (closingBases.length === 0 || closingBases[0] > bpB) {
                        // Update the structure with this pair
                        dbn[bpA] = charsL[degree];
                        dbn[bpB] = charsR[degree];

                        // If we have a contiguous set of closing bases, we don't need to
                        // store (and check) every single one - we only need a reference to one of them.
                        //
                        // Eg: If 7,8,9 are all closing bases, a pair can either cross all three
                        // or not cross all three. Being able to cross only some of them would
                        // require the crossin pair to start or end in the middle of these bases,
                        // but they're all already paired!
                        if (closingBases.length === 0 || bpB !== closingBases[0] - 1) {
                            // Register the existance of a new pair that we could cross.
                            // We use `unshift` to ensure closingBases stays in ascending order,
                            // (letting us shift off the front any bases we've passed, with the following
                            // base immediately telling us whether there's a cross or not, since if the lowest
                            // closing pair is not a cross because it's after bpB, all other entries must be
                            // after bpB and so can't cross)
                            closingBases.unshift(bpB);
                        }
                        handled = true;
                        // Move on to the next pair
                        break;
                    }
                }
                if (!handled) {
                    throw new Error('Structure has pseudoknot of degree too high to represent as a dot-bracket string');
                }
            }
            return dbn.join('');
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
        // Note including the `.` in the character exclusion isn't necessary for correcness,
        // but it does make a significant performance impact
        const filtered: string = this.getParenthesis(null, true).replace(/[^().]/g, '.');

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
        const filtered: string = this.getParenthesis(null, true).replace(/[()]/g, '.');

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

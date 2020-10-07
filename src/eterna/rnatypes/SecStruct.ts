import EPars, {RNABase} from 'eterna/EPars';
import Sequence from './Sequence';

export default class SecStruct {
    public get length(): number {
        return this._pairs.length;
    }

    public get pairs(): number[] {
        return this._pairs;
    }

    constructor(pairs: number[] = []) {
        this._pairs = pairs.slice();
    }

    public static fromParens(str: string, pseudoknots: boolean = false): SecStruct {
        const s = new SecStruct();
        s.setPairs(str, pseudoknots);
        return s;
    }

    private _pairs: number[] = [];

    public getSatisfiedPairs(seq: Sequence): SecStruct {
        const retPairs: number[] = new Array(this.length);

        for (let ii = 0; ii < this.length; ii++) {
            if (this.pairs[ii] < 0) {
                retPairs[ii] = -1;
            } else if (this.pairs[ii] > ii) {
                if (EPars.pairType(seq.sequence[ii], seq.sequence[this.pairs[ii]]) !== 0) {
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

    public isPaired(index: number): boolean {
        return (this._pairs[index] >= 0);
    }

    public pairingPartner(index: number): number {
        return this._pairs[index];
    }

    public setUnpaired(index: number): void {
        // AMW TODO: Indeed, we should also set the former pairing partner as unpaired.
        this._pairs[this._pairs[index]] = -1;
        this._pairs[index] = -1;
    }

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

    // You may need to make this basically... a setter?
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

    public getParenthesis(seq: number[] | null = null,
        pseudoknots: boolean = false): string {
        if (pseudoknots) {
            // given partner-style array, writes dot-parens notation string. handles pseudoknots!
            // example of partner-style array: '((.))' -> [4,3,-1,1,0]
            const bpList: number[] = new Array(this._pairs.length).fill(-1);

            for (let ii = 0; ii < this._pairs.length; ii++) {
                if (this._pairs[ii] > ii) {
                    bpList[ii] = this._pairs[ii];
                    bpList[this._pairs[ii]] = ii;
                }
            }

            const bps: number[][] = [];
            for (let ii = 0; ii < bpList.length; ++ii) {
                if (bpList[ii] !== -1 && bpList[ii] > ii) {
                    bps.push([ii, bpList[ii]]);
                }
            }

            const stems: number[][][] = [];
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
            } else if (seq != null && seq[ii] === RNABase.CUT) {
                str += '&';
            } else {
                str += '.';
            }
        }

        return str;
    }

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
        ss.setPairs(filtered, true);
        return ss;
    }

    public onlyPseudoknots(): SecStruct {
        // Round-trip to remove all non-pseudoknots.
        const filtered: string = this.getParenthesis(null, true)
            .replace(/\(/g, '.')
            .replace(/\)/g, '.');

        const ss = new SecStruct();
        ss.setPairs(filtered, true);
        return ss;
    }

    public numPairs(): number {
        let ret = 0;

        for (let ii = 0; ii < this._pairs.length; ii++) {
            if (this._pairs[ii] > ii) {
                ret++;
            }
        }
        return ret;
    }

    public slice(start: number, end: number = -1): SecStruct {
        const pairsB = this._pairs.slice(start, end === -1 ? undefined : end);

        for (let ii = 0; ii < pairsB.length; ii++) {
            if (pairsB[ii] >= 0) pairsB[ii] -= start;
        }

        return new SecStruct(pairsB);
    }
}

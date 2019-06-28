import {observable, computed} from "mobx";

enum RNAExtention {
    CUT = "&"
}

export enum BaseType {
    GUANINE = "G",
    ADENINE = "A",
    URACIL = "U",
    CYTOSINE = "C"
}

export enum BasePairType {
    GC = "GC",
    AU = "AU",
    GU = "GU"
}

type ExtendedNucleotide = BaseType | RNAExtention;

enum DotBracket {
    PAIR_LEFT = "(",
    PAIR_RIGHT = ")",
    UNPAIRED = "."
}

type ExtendedDotBracket = DotBracket | RNAExtention;

export class SecondaryStructure {
    @observable public readonly dotBracket: string;

    constructor(dotBracket: string, validate=true) {
        if (validate) {
            let unboundPairs: number = 0;

            for (let char of dotBracket) {
                switch (char) {
                    case DotBracket.PAIR_LEFT:
                        unboundPairs++;
                        break;
                    case DotBracket.PAIR_RIGHT:
                        if (unboundPairs === 0)throw new Error('Unbalanced parenthesis notation: ")" found without matching "("');
                        unboundPairs--;
                        break;
                    case DotBracket.UNPAIRED:
                    case RNAExtention.CUT:
                        break;
                    default:
                        throw new Error(`Unrecognized character ${char}`);
                }
            }

            if (unboundPairs !== 0) {
                throw new Error('Unbalanced parenthesis notation: Unclosed "(" present');
            }

            let oneBaseLoopLocation = dotBracket.indexOf("(.)");
            if (oneBaseLoopLocation >= 0) {
                throw new Error(`There is a length 1 hairpin loop which is impossible at base ${oneBaseLoopLocation + 2}`);
            }

            let twoBaseLoopLocation = dotBracket.indexOf("(..)");

            if (twoBaseLoopLocation >= 0) {
                throw new Error(`There is a length 2 hairpin loop which is impossible at base ${twoBaseLoopLocation + 2}`);
            }
        }

        this.dotBracket = dotBracket;
    }

    @computed public get pairmap(): number[] {
        if (this._pairmap) return this._pairmap;

        let pairs: number[] = [];
        let pair_stack: number[] = [];

        for (let jj = 0; jj < this.dotBracket.length; jj++) {
            pairs.push(-1);
        }

        for (let jj = 0; jj < this.dotBracket.length; jj++) {
            if (this.dotBracket.charAt(jj) === "(") {
                pair_stack.push(jj);
            } else if (this.dotBracket.charAt(jj) === ")") {
                if (pair_stack.length === 0) {
                    throw new Error("Invalid parenthesis notation");
                }

                pairs[pair_stack[pair_stack.length - 1]] = jj;
                pair_stack.pop();
            }
        }

        for (let jj = 0; jj < pairs.length; jj++) {
            if (pairs[jj] >= 0) pairs[pairs[jj]] = jj;
        }

        this._pairmap = pairs;
        return pairs;
    }

    /**
     * @returns Length of structure excluding any oligos
     * 
     * NOTE: Assumes oligos are always at the end - this may not be correct, update if
     * there is a better way to do this
     */
    @computed get strandLength(): number {
        return this.dotBracket.replace(/\&.*/, '').length;
    }

    /**
     * @returns Length of structure including oligos
     */
    @computed get fullLength(): number {
        return this.dotBracket.replace(/\&/g, '').length;
    }

    private _pairmap: number[];
}

export class Sequence {
    public sequenceString: string;

    constructor(sequenceString: string) {
        this.sequenceString = sequenceString.split('')
            .map(char => {
                if (char.toUpperCase() in BaseType) return char.toUpperCase()
                else if (char == "&" || char == "+" || char == "-") return RNAExtention.CUT;
                else throw new Error(`Bad nucleotide ${char}`);
            }).join('');
    }

    public changeBase(baseIndex: number, base: BaseType) {

    }
}

// TODO: Can we make ranges 2-tuples (or 2 tuples or single values) instead?
// To serialize this would require migrating all previous ranges in the backend
export class StrandSubset {
    constructor(initialSelections: boolean[] = []) {
        this._selectionMap = initialSelections;
    }

    public static fromRanges(ranges: number[], zeroIndexed: boolean = true): StrandSubset {
        if (ranges.length % 2 !== 0 ) {
            throw new Error(`Invalid base ranges - range starting with ${ranges.slice(-1)} has no ending index`)
        }

        let selectionMap = new Array(Math.max(...ranges)).fill(false);

        for (let i=0; i<ranges.length; i+=2) {
            selectionMap.fill(true, ranges[i] + (zeroIndexed ? 0 : 1), ranges[i+1] + (zeroIndexed ? 0 : 1));
        }

        return new StrandSubset(selectionMap);
    }

    @computed public get ranges(): number[] {
        let ranges = [];
        let previous = false;

        for (let i=0; i<this._selectionMap.length; i++) {
            let selected = this._selectionMap[i];
            if (previous === false && selected === true) {
                ranges.push(i);
            } else if (previous === true && selected === false) {
                ranges.push(i - 1);
            }
            previous = selected;
        }

        if (ranges.length % 2 === 1) {
            ranges.push(this._selectionMap.length - 1);
        }

        return ranges;
    }
    public indexSelected(baseIndex: number): boolean {
        return this._selectionMap[baseIndex] === true;
    }

    public addIndex(baseIndex: number): void {
        this._selectionMap[baseIndex] = true;
    }

    public removeIndex(baseIndex: number) {
        this._selectionMap[baseIndex] = false;
    }

    public toggleIndex(baseIndex: number) {
        if (this.indexSelected(baseIndex)) {
            this.removeIndex(baseIndex);
        } else {
            this.addIndex(baseIndex);
        }
    }

    public addRange(start: number, end: number) {
        this._selectionMap.fill(true, start, end)
    }

    public removeRange(start: number, end: number) {
        this._selectionMap.fill(false, start, end)
    }

    public toggleRange(start: number, end: number) {
        for (let i=start; i<=end; i++) {
            this.toggleIndex(i);
        }
    }

    @observable private _selectionMap: boolean[];
}
import EPars from 'eterna/EPars';
import PuzzleEditOp from './PuzzleEditOp';

/** Utility functions for pose data */
export default class PoseUtil {
    public static getPairStrength(s1: number, s2: number): number {
        if (PoseUtil.isPair(s1, s2, EPars.RNABASE_ADENINE, EPars.RNABASE_URACIL)) {
            return 2;
        } else if (PoseUtil.isPair(s1, s2, EPars.RNABASE_GUANINE, EPars.RNABASE_URACIL)) {
            return 1;
        } else if (PoseUtil.isPair(s1, s2, EPars.RNABASE_GUANINE, EPars.RNABASE_CYTOSINE)) {
            return 3;
        } else {
            return -1;
        }
    }

    public static addBaseWithIndex(index: number, pairs: number[]): [string, PuzzleEditOp, number[]?] {
        let mutatedPairs: number[];
        mutatedPairs = pairs.slice(0, index);
        mutatedPairs.push(-1);
        mutatedPairs = mutatedPairs.concat(pairs.slice(index, pairs.length));

        for (let ii = 0; ii < mutatedPairs.length; ii++) {
            if (mutatedPairs[ii] >= index) {
                mutatedPairs[ii]++;
            }
        }
        let parenthesis: string = EPars.pairsToParenthesis(mutatedPairs);
        return [parenthesis, PuzzleEditOp.ADD_BASE, mutatedPairs];
    }

    public static addPairWithIndex(index: number, pairs: number[]): [string, PuzzleEditOp, number[]?] {
        let mutatedPairs: number[];
        let parenthesis: string;
        let ii: number;

        // if index is paired
        // add another pair before index
        let pindex: number = pairs[index];
        if (pindex >= 0) {
            if (index > pindex) {
                let tmp: number = index;
                index = pindex;
                pindex = tmp;
            }
            mutatedPairs = pairs.slice(0, index);
            mutatedPairs.push(-1);
            mutatedPairs = mutatedPairs.concat(pairs.slice(index, pindex + 1));
            mutatedPairs.push(-1);
            mutatedPairs = mutatedPairs.concat(pairs.slice(pindex + 1, pairs.length));

            for (ii = 0; ii < mutatedPairs.length; ii++) {
                if (mutatedPairs[ii] > pindex) {
                    mutatedPairs[ii] += 2;
                } else if (mutatedPairs[ii] >= index) {
                    mutatedPairs[ii] += 1;
                }
            }
            mutatedPairs[index] = pindex + 2;
            mutatedPairs[pindex + 2] = index;

            parenthesis = EPars.pairsToParenthesis(mutatedPairs);
            return [parenthesis, PuzzleEditOp.ADD_PAIR];
        } else {
            // add a cycle of length 3
            mutatedPairs = pairs.slice(0, index);
            for (ii = 0; ii < 5; ii++) {
                mutatedPairs.push(-1);
            }
            mutatedPairs = mutatedPairs.concat(pairs.slice(index, pairs.length));
            for (ii = 0; ii < mutatedPairs.length; ii++) {
                if (mutatedPairs[ii] >= index) {
                    mutatedPairs[ii] += 5;
                }
            }
            mutatedPairs[index] = index + 4;
            mutatedPairs[index + 4] = index;

            parenthesis = EPars.pairsToParenthesis(mutatedPairs);
            return [parenthesis, PuzzleEditOp.ADD_CYCLE];
        }
    }

    public static deleteNopairWithIndex(index: number, pairs: number[]): [string, PuzzleEditOp, number[]?] {
        let mutatedPairs: number[];
        let parenthesis: string;
        mutatedPairs = pairs.slice(0, index);
        mutatedPairs = mutatedPairs.concat(pairs.slice(index + 1, pairs.length));
        for (let ii = 0; ii < mutatedPairs.length; ii++) {
            if (mutatedPairs[ii] >= index) {
                mutatedPairs[ii] -= 1;
            }
        }

        parenthesis = EPars.pairsToParenthesis(mutatedPairs);
        return [parenthesis, PuzzleEditOp.DELETE_BASE, mutatedPairs];
    }

    public static deletePairWithIndex(index: number, pairs: number[]): [string, PuzzleEditOp, number[]?] {
        let pindex: number = pairs[index];
        if (pindex < 0) {
            throw new Error("base doesn't have pair");
        }

        let mutatedPairs: number[];
        let parenthesis: string;

        if (index > pindex) {
            let tmp: number = index;
            index = pindex;
            pindex = tmp;
        }
        mutatedPairs = pairs.slice(0, index);
        mutatedPairs = mutatedPairs.concat(pairs.slice(index + 1, pindex));
        mutatedPairs = mutatedPairs.concat(pairs.slice(pindex + 1, pairs.length));
        for (let ii = 0; ii < mutatedPairs.length; ii++) {
            if (mutatedPairs[ii] > pindex) {
                mutatedPairs[ii] -= 2;
            } else if (mutatedPairs[ii] >= index) {
                mutatedPairs[ii] -= 1;
            }
        }

        parenthesis = EPars.pairsToParenthesis(mutatedPairs);
        return [parenthesis, PuzzleEditOp.DELETE_PAIR];
    }

    private static isPair(s1: number, s2: number, type1: number, type2: number): boolean {
        return (s1 === type1 && s2 === type2) || (s1 === type2 && s2 === type1);
    }
}

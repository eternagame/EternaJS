import {EPars} from "../EPars";

/** Utility functions for pose data */
export class PoseUtil {
    public static get_pair_strength(s1: number, s2: number): number {
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

    public static add_base_with_index(index: number, pairs: number[]): any[] {
        let mutated_pairs: number[];
        mutated_pairs = pairs.slice(0, index);
        mutated_pairs.push(-1);
        mutated_pairs = mutated_pairs.concat(pairs.slice(index, pairs.length));

        for (let ii: number = 0; ii < mutated_pairs.length; ii++) {
            if (mutated_pairs[ii] >= index) {
                mutated_pairs[ii]++;
            }
        }
        let parenthesis: string = EPars.pairs_array_to_parenthesis(mutated_pairs);
        return [parenthesis, 0, mutated_pairs];
    }

    public static add_pair_with_index(index: number, pairs: number[]): any[] {
        let mutated_pairs: number[];
        let parenthesis: string;
        let ii: number;

        //if index is paired
        //add another pair before index
        let pindex: number = pairs[index];
        if (pindex >= 0) {
            if (index > pindex) {
                let tmp: number = index;
                index = pindex;
                pindex = tmp;
            }
            mutated_pairs = pairs.slice(0, index);
            mutated_pairs.push(-1);
            mutated_pairs = mutated_pairs.concat(pairs.slice(index, pindex + 1));
            mutated_pairs.push(-1);
            mutated_pairs = mutated_pairs.concat(pairs.slice(pindex + 1, pairs.length));

            for (ii = 0; ii < mutated_pairs.length; ii++) {
                if (mutated_pairs[ii] > pindex) {
                    mutated_pairs[ii] += 2;
                } else if (mutated_pairs[ii] >= index) {
                    mutated_pairs[ii] += 1;
                }
            }
            mutated_pairs[index] = pindex + 2;
            mutated_pairs[pindex + 2] = index;

            parenthesis = EPars.pairs_array_to_parenthesis(mutated_pairs);
            return [parenthesis, 1];

        }
        //add a cycle of length 3
        else {
            mutated_pairs = pairs.slice(0, index);
            for (ii = 0; ii < 5; ii++) {
                mutated_pairs.push(-1);
            }
            mutated_pairs = mutated_pairs.concat(pairs.slice(index, pairs.length));
            for (ii = 0; ii < mutated_pairs.length; ii++) {
                if (mutated_pairs[ii] >= index) {
                    mutated_pairs[ii] += 5;
                }
            }
            mutated_pairs[index] = index + 4;
            mutated_pairs[index + 4] = index;

            parenthesis = EPars.pairs_array_to_parenthesis(mutated_pairs);
            return [parenthesis, 2];
        }
    }

    public static delete_nopair_with_index(index: number, pairs: number[]): any[] {
        let mutated_pairs: number[];
        let parenthesis: string;
        mutated_pairs = pairs.slice(0, index);
        mutated_pairs = mutated_pairs.concat(pairs.slice(index + 1, pairs.length));
        for (let ii: number = 0; ii < mutated_pairs.length; ii++) {
            if (mutated_pairs[ii] >= index) {
                mutated_pairs[ii] -= 1;
            }
        }

        parenthesis = EPars.pairs_array_to_parenthesis(mutated_pairs);
        return [parenthesis, 4, mutated_pairs];
    }

    public static delete_pair_with_index(index: number, pairs: number[]): any[] {
        let pindex: number = pairs[index];
        if (pindex < 0) {
            throw new Error("base doesn't have pair");
        }

        let mutated_pairs: number[];
        let parenthesis: string;

        if (index > pindex) {
            let tmp: number = index;
            index = pindex;
            pindex = tmp;
        }
        mutated_pairs = pairs.slice(0, index);
        mutated_pairs = mutated_pairs.concat(pairs.slice(index + 1, pindex));
        mutated_pairs = mutated_pairs.concat(pairs.slice(pindex + 1, pairs.length));
        for (let ii: number = 0; ii < mutated_pairs.length; ii++) {
            if (mutated_pairs[ii] > pindex) {
                mutated_pairs[ii] -= 2;
            } else if (mutated_pairs[ii] >= index) {
                mutated_pairs[ii] -= 1;
            }
        }

        parenthesis = EPars.pairs_array_to_parenthesis(mutated_pairs);
        return [parenthesis, 3];
    }

    private static isPair(s1: number, s2: number, type1: number, type2: number): boolean {
        return (s1 === type1 && s2 === type2) || (s1 === type2 && s2 === type1);
    }
}

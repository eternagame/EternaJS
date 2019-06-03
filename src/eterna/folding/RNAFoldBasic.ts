import {EPars} from "../EPars";
import {Folder} from "./Folder";

export class RNAFoldBasic extends Folder {
    public static readonly NAME = "Basic";

    /** Asynchronously creates a new instance of the RNAFoldBasic folder. */
    public static create(): Promise<RNAFoldBasic> {
        return Promise.resolve(new RNAFoldBasic());
    }

    public get isFunctional(): boolean {
        return true;
    }

    public get name(): string {
        return RNAFoldBasic.NAME;
    }

    public scoreStructures(seq: number[], pairs: number[], temp: number = 37, outNodes: number[] = null): number {
        let score = 0;

        if (pairs.length !== seq.length) {
            throw new Error("Sequence and pairs lengths don't match");
        }

        for (let ii = 0; ii < pairs.length; ii++) {
            if (pairs[ii] > ii) {
                score++;
            }
        }

        return score;
    }

    public foldSequence(seq: number[], second_best_pairs: number[], desired_pairs: string = null, temp: number = 37): number[] {
        let n: number = seq.length;
        let pairs: number[] = new Array(n);
        let dp_array: number[] = new Array(n * n);
        let trace_array: number[] = new Array(n * n);

        for (let ii = 0; ii < n; ii++) {
            pairs[ii] = -1;

            for (let jj = 0; jj < n; jj++) {
                let index: number = ii * n + jj;

                if (ii > jj + 1) {
                    dp_array[index] = -1;
                } else if ((ii === jj) || (ii + 1 === jj) || (ii === jj + 1)) {
                    dp_array[index] = 0;
                } else {
                    dp_array[index] = -1;
                }

                trace_array[index] = 0;
            }
        }

        for (let iter = 1; iter < n; iter++) {
            let ii_walker = 0;
            let jj_walker: number = iter;

            while (jj_walker < n) {
                let max_case = 0;
                let max_val = -1;
                let current_val = 0;

                if (ii_walker < n - 1 && jj_walker > 0 && ii_walker < jj_walker - 1) {
                    if (EPars.pairType(seq[ii_walker], seq[jj_walker])) {
                        current_val = dp_array[(ii_walker + 1) * n + jj_walker - 1] + 1;

                        if (current_val < 1) {
                            console.warn("Something is wrong with DP case 1", ii_walker, jj_walker);
                        }

                        if (current_val > max_val) {
                            max_val = current_val;
                            max_case = 1;
                        }
                    }
                }

                if (jj_walker > 0) {
                    current_val = dp_array[(ii_walker) * n + jj_walker - 1];

                    if (current_val < 0) {
                        console.warn("Something is wrong with DP case 3", ii_walker, jj_walker);
                    }

                    if (current_val > max_val) {
                        max_val = current_val;
                        max_case = 3;
                    }
                }

                if (ii_walker < n - 1) {
                    current_val = dp_array[(ii_walker + 1) * n + jj_walker];

                    if (current_val < 0) {
                        console.warn("Something is wrong with DP case 2", ii_walker, jj_walker);
                    }

                    if (current_val > max_val) {
                        max_val = current_val;
                        max_case = 2;
                    }
                }

                if (ii_walker + 1 < jj_walker) {
                    for (let kk_walker: number = ii_walker + 1; kk_walker < jj_walker; kk_walker++) {
                        if (dp_array[ii_walker * n + kk_walker] < 0 || dp_array[kk_walker * n + jj_walker] < 0) {
                            console.warn("Something is wrong with DP case k");
                        }

                        current_val = dp_array[ii_walker * n + kk_walker] + dp_array[(kk_walker + 1) * n + jj_walker];

                        if (current_val > max_val) {
                            max_val = current_val;
                            max_case = -kk_walker;
                        }
                    }
                }

                dp_array[ii_walker * n + jj_walker] = max_val;
                trace_array[ii_walker * n + jj_walker] = max_case;

                ii_walker++;
                jj_walker++;
            }
        }

        this.tracePairs(trace_array, pairs, n, 0, n - 1);

        return pairs;
    }

    private tracePairs(trace_array: number[], pairs: number[], n: number, ii_start: number, jj_start: number): void {
        let dir: number = trace_array[ii_start * n + jj_start];

        if (dir === 1) {
            pairs[ii_start] = jj_start;
            pairs[jj_start] = ii_start;

            this.tracePairs(trace_array, pairs, n, ii_start + 1, jj_start - 1);
        } else if (dir === 2) {
            this.tracePairs(trace_array, pairs, n, ii_start + 1, jj_start);
        } else if (dir === 3) {
            this.tracePairs(trace_array, pairs, n, ii_start, jj_start - 1);
        } else if (dir === 0) {

        } else {
            let kk: number = -dir;
            this.tracePairs(trace_array, pairs, n, ii_start, kk);
            this.tracePairs(trace_array, pairs, n, kk + 1, jj_start);
        }
    }
}

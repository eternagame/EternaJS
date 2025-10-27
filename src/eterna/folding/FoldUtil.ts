import * as log from 'loglevel';
import DotPlot from 'eterna/rnatypes/DotPlot';
import SecStruct from 'eterna/rnatypes/SecStruct';
import Sequence from 'eterna/rnatypes/Sequence';
import EPars from 'eterna/EPars';

export enum BasePairProbabilityTransform {
    LEAVE_ALONE,
    SQUARE
}

export default class FoldUtil {
    public static nextPerm(v: number[]): boolean {
        let more = false;
        let ii: number = v.length;
        if (ii <= 1) return more;
        ii--;
        while (true) {
            const jj: number = ii;
            ii--;
            if (v[ii] < v[jj]) {
                let kk: number = v.length;
                do {
                    kk--;
                } while (v[ii] >= v[kk]);
                const vv: number = v[ii];
                v[ii] = v[kk];
                v[kk] = vv;
                const r: number[] = v.slice(jj).reverse();
                v.splice(jj, v.length);
                for (kk = 0; kk < r.length; kk++) v.push(r[kk]);
                more = true;
                break;
            }
            if (ii === 0) {
                v.reverse();
                break;
            }
        }
        return more;
    }

    public static bindingSiteFormed(pairs: SecStruct, groups: number[][]): boolean {
        if (pairs.pairingPartner(groups[0][0]) !== groups[1][groups[1].length - 1]) return false;
        if (pairs.pairingPartner(groups[0][groups[0].length - 1]) !== groups[1][0]) return false;
        for (let ii = 1; ii < groups[0].length - 1; ii++) {
            if (pairs.isPaired(groups[0][ii])) return false;
        }
        for (let ii = 1; ii < groups[1].length - 1; ii++) {
            if (pairs.isPaired(groups[1][ii])) return false;
        }

        return true;
    }

    /**
     * Copies the contents of src into dst.
     *
     * Generally when you need a copy of an array, you'll want to simply make a new array
     * (with e.g. src.slice()). This function is for those times when you need to preserve
     * the existence of dst.
     */
    public static arrayCopy<T>(dst: T[], src: T[]) {
        dst.length = 0;
        for (const value of src) {
            dst.push(value);
        }
    }

    public static pUnpaired(dotArray: DotPlot, seq: Sequence, behavior: BasePairProbabilityTransform) {
        // dotArray is organized as idx, idx, pairprob.
        const probUnpaired: number[] = Array<number>(seq.length);
        for (let idx = 0; idx < seq.length; ++idx) {
            probUnpaired[idx] = 1;
            for (let ii = 0; ii < dotArray.data.length; ii += 3) {
                if (dotArray.data[ii] === idx + 1 || dotArray.data[ii + 1] === idx + 1) {
                    if (behavior === BasePairProbabilityTransform.LEAVE_ALONE) {
                        probUnpaired[idx] -= Math.min(
                            (dotArray.data[ii + 2]),
                            probUnpaired[idx]
                        );
                    } else {
                        probUnpaired[idx] -= Math.min(
                            (dotArray.data[ii + 2] * dotArray.data[ii + 2]),
                            probUnpaired[idx]
                        );
                    }
                }
            }
        }
        return probUnpaired;
    }

    public static checkBpList(bpList: number[][]) {
        // Ensure that the bpList is sorted, then check for duplicated nucleotides
        const newBpList = bpList.slice();
        newBpList.sort((bpA, bpB) => bpA[0] - bpB[0]);
        const nts = newBpList.flat();
        if (nts.length > new Set(nts).size) {
            log.warn('Some nucletotides found in more than 1 base pair');
            newBpList.forEach((bpA, i) => {
                const bpB = newBpList[i + 1] || [];
                if (bpA[0] === bpB[0] && bpA[1] === bpB[1]) {
                    log.warn(`Removing duplicated base pair: ${bpA}`);
                    newBpList.splice(i, 1);
                } else if (bpB.includes(bpA[0])) {
                    log.warn(`bpA: ${bpA}, bpB: ${bpB}`);
                } else if (bpB.includes(bpA[1])) {
                    log.warn(`bpA: ${bpA}, bpB: ${bpB}`);
                }
            });
        }
        return newBpList;
    }

    public static postProcessStruct(
        bpList: number[][],
        sequenceLength: number,
        minLenHelix: number
        // TODO: Implement in SecStruct.stems()
        // Currently stems() interprets bulges as stem breaks
        // allowedBulgeLen: number
    ) {
        // Convert from array of pair tuples to partner pair list
        const partnerPairList = new Array(sequenceLength).fill(-1);
        bpList.forEach((pair) => {
            // Dot Plot returns bpps 1-indexed
            partnerPairList[pair[0] - 1] = pair[1] - 1;
            partnerPairList[pair[1] - 1] = pair[0] - 1;
        });

        // Convert to SecStruct and remove single pair helices
        const structure = new SecStruct(partnerPairList);
        const helices = structure.stems();
        const prunedHelices = helices.filter((stem) => stem.length >= minLenHelix).flat();

        // Convert from array of pair tuples to partner pair list
        const prunedPairList = new Array(structure.length).fill(-1);
        prunedHelices.forEach((pair) => {
            prunedPairList[pair[0]] = pair[1];
            prunedPairList[pair[1]] = pair[0];
        });

        return new SecStruct(prunedPairList);
    }

    // Ported from arnie https://github.com/DasLab/arnie/blob/04ae74d592c240ceb8a01dfbceff55c6342f7d42/src/arnie/pk_predictors.py#L166
    public static threshknot(
        dotArray: DotPlot,
        seq: Sequence,
        bppStatisticBehavior: BasePairProbabilityTransform,
        {
            theta = 0.3,
            maxIterations = 1,
            minLenHelix = 2
            // allowedBulgeLen = 0,
        }: {
            theta?: number,
            maxIterations?: number,
            minLenHelix?: number,
        } = {}
    ): SecStruct {
        const bpps = dotArray.data.slice();
        if (bppStatisticBehavior === BasePairProbabilityTransform.SQUARE) {
            for (let ii = 0; ii < dotArray.data.length; ii += 3) {
                bpps[ii + 2] = (dotArray.data[ii + 2] * dotArray.data[ii + 2]);
            }
        }

        let iteration = 0;
        let newBP = 1;
        const bpList: number[][] = [];

        // Get pairs for each base via Threshknot heuristic
        while (newBP !== 0 && iteration <= maxIterations) {
            const currentBpList: number[][] = [];
            const bpListFlat = bpList.flat();
            const Pmax = new Array(seq.length).fill(0);

            // Find max probability for each base, filtering out already paired bases
            for (let index = 0; index < bpps.length; index += 3) {
                const base1 = bpps[index];
                const base2 = bpps[index + 1];
                const prob = bpps[index + 2];
                if (!(bpListFlat.includes(base1) || bpListFlat.includes(base2))) {
                    // -1 to account for 0 indexing
                    if (prob >= Pmax[base1 - 1]) Pmax[base1 - 1] = prob;
                    if (prob >= Pmax[base2 - 1]) Pmax[base2 - 1] = prob;
                }
            }

            // Compare each COO tuple to Pmax and theta, and add to the list
            // of selected base pairs if the check passes
            for (let index = 0; index < bpps.length; index += 3) {
                const base1 = bpps[index];
                const base2 = bpps[index + 1];
                const prob = bpps[index + 2];
                if (prob === Pmax[base1 - 1] && prob === Pmax[base2 - 1] && prob > theta) {
                    currentBpList.push([base1, base2]);
                }
            }
            // Update iteration flags
            newBP = currentBpList.length;
            iteration += 1;
            if (newBP !== 0 && iteration > maxIterations) {
                log.debug('Reached max iteration, stopping before converged.');
            } else {
                // Add selected base pairs to output list
                bpList.push(...currentBpList);
            }
        }

        return FoldUtil.postProcessStruct(FoldUtil.checkBpList(bpList), seq.length, minLenHelix);
    }

    public static hungarian(
        dotArray: DotPlot,
        seq: Sequence,
        bppStatisticBehavior: BasePairProbabilityTransform,
        {
            probTo0ThresholdPrior = 0,
            probTo1ThresholdPrior = 1,
            theta = 0,
            addPUnpaired = true,
            minLenHelix = 2
            // Left unimplemented as we don't use these, and I wouldn't have tested them
            // exp = 1,
            // sigmoidSlopeFactor = null,
            // ln = false,
            // allowedBulgeLen = 0,
        }: {
            probTo0ThresholdPrior?: number,
            probTo1ThresholdPrior?: number,
            theta?: number,
            addPUnpaired?: boolean,
            minLenHelix?: number,
            // exp?: number,
            // sigmoidSlopeFactor?: null,
            // ln?: boolean,
            // allowedBulgeLen?: number,
        } = {}
    ): SecStruct {
        // Ported from arnie https://github.com/DasLab/arnie/blob/04ae74d592c240ceb8a01dfbceff55c6342f7d42/src/arnie/pk_predictors.py#L108
        const bpps = dotArray.data.slice();
        if (bppStatisticBehavior === BasePairProbabilityTransform.SQUARE) {
            for (let ii = 0; ii < bpps.length; ii += 3) {
                bpps[ii + 2] = (bpps[ii + 2] * bpps[ii + 2]);
            }
        }

        const denseBpps: number[] = new Array(seq.length * seq.length).fill(0);
        for (let ii = 0; ii < bpps.length; ii += 3) {
            const col = bpps[ii] - 1;
            const row = bpps[ii + 1] - 1;
            const prob = bpps[ii + 2];
            denseBpps[row * seq.length + col] = prob;
            denseBpps[col * seq.length + row] = prob;
        }
        const origDenseBpps = denseBpps.slice();

        if (addPUnpaired) {
            const allPunp = FoldUtil.pUnpaired(dotArray, seq, bppStatisticBehavior);
            for (const [i, punp] of allPunp.entries()) {
                denseBpps[i * seq.length + i] = punp;
            }
        }

        for (let i = 0; i < denseBpps.length; i++) {
            if (denseBpps[i] < probTo0ThresholdPrior) denseBpps[i] = 0;
            if (denseBpps[i] > probTo1ThresholdPrior) denseBpps[i] = 1;
            if (denseBpps[i] === -Infinity) denseBpps[i] = -1e10;
            if (denseBpps[i] === Infinity) denseBpps[i] = 1e10;
            denseBpps[i] = -denseBpps[i];
        }

        const {colInd} = FoldUtil.linearSumAssignment(denseBpps, seq.length);
        // Hungarian/linear sum assignment operates on a bipartite graph such that each row is assigned to
        // exactly one column and each column is assigned to exactly one row, however our case is not
        // bipartite. That means some chosen assignments could conflict with others, either creating
        // a "chain" (eg [(0,5), (5,10)]) or cycle (eg [(0,5), (5,10), (10, 0)]). We resolve these
        // conflicts by solving for the maximum weight independent set. (Note that if we have
        // two assignments like [(0,5) and (5,0)] we only need to deduplicate, hence the usage of set).
        const bpAssignmentsSet = new Set<string>();
        for (const [col, row] of colInd.entries()) {
            if (
                origDenseBpps[col * seq.length + row] > theta
                && col !== row
                // This is a condition that is NOT used in arnie - but we want to ensure that
                // we never return invalid pairs
                && EPars.pairType(seq.nt(col), seq.nt(row))
            ) {
                bpAssignmentsSet.add([col, row].sort((a, b) => a - b).join(','));
            }
        }
        let bpAssignments = Array.from(bpAssignmentsSet).map(
            (str) => str.split(',').map((s) => +s) as [number, number]
        );
        const bpList = [];
        while (true) {
            const newBp = bpAssignments.pop();
            if (!newBp) break;
            const bps = [newBp];
            // Start building a chain to the "left"
            let checkNt = bps[0][0];
            while (true) {
                // eslint-disable-next-line no-loop-func
                const conflict = bpAssignments.find((bp) => bp.includes(checkNt));
                if (!conflict) break;
                bps.unshift(conflict);
                bpAssignments = bpAssignments.filter((bp) => bp !== conflict);
                // eslint-disable-next-line no-loop-func
                checkNt = conflict.find((nt) => nt !== checkNt) as number;
            }
            checkNt = bps[bps.length - 1][0];
            while (true) {
                // eslint-disable-next-line no-loop-func
                const conflict = bpAssignments.find((bp) => bp.includes(checkNt));
                if (!conflict) break;
                bps.push(conflict);
                bpAssignments = bpAssignments.filter((bp) => bp !== conflict);
                // eslint-disable-next-line no-loop-func
                checkNt = conflict.find((nt) => nt !== checkNt) as number;
            }

            if (bps.length === 1) {
                bpList.push(...bps);
            } else if (bps.length > 2 && (bps[bps.length].includes(bps[0][0]) || bps[bps.length].includes(bps[0][1]))) {
                // We have a cycle. We need to try both excluding the first element and excluding
                // the last element (only one or the other, or neither, can be present since they conflict)
                const {bps: bpListA, prob: probA} = FoldUtil.maxWeightIndependentSet(
                    bps.slice(1), origDenseBpps, seq.length
                );
                const {bps: bpListB, prob: probB} = FoldUtil.maxWeightIndependentSet(
                    bps.slice(0, bps.length - 1), origDenseBpps, seq.length
                );
                if (probA > probB) {
                    bpList.push(...bpListA);
                } else {
                    bpList.push(...bpListB);
                }
            } else {
                const {bps: maxBpList} = FoldUtil.maxWeightIndependentSet(bps, origDenseBpps, seq.length);
                bpList.push(...maxBpList);
            }
        }

        return FoldUtil.postProcessStruct(
            FoldUtil.checkBpList(bpList.map((bp) => bp.map((nt) => nt + 1))),
            seq.length,
            minLenHelix
        );
    }

    public static maxWeightIndependentSet(pairs: number[][], probs: number[], seqlen: number) {
        const maxSets: {prob: number, bps: number[][]}[] = [];
        for (const bp of pairs) {
            const bpProb = probs[bp[0] * seqlen + bp[1]];

            if (maxSets.length === 0) {
                maxSets.push({prob: bpProb, bps: [bp]});
            } else if (maxSets.length === 1) {
                if (maxSets[0]['prob'] > bpProb) {
                    maxSets.push(maxSets[0]);
                } else if (bpProb > maxSets[0]['prob']) {
                    maxSets.push({prob: bpProb, bps: [bp]});
                } else if (Math.abs(maxSets[0]['bps'][0][0] - maxSets[0]['bps'][0][1]) <= Math.abs(bp[0] - bp[1])) {
                    maxSets.push(maxSets[0]);
                } else {
                    maxSets.push({prob: bpProb, bps: [bp]});
                }
            } else if (maxSets[-1]['prob'] > maxSets[-2]['prob'] + bpProb) {
                maxSets.push(maxSets[maxSets.length - 1]);
            } else if (maxSets[maxSets.length - 2]['prob'] + bpProb > maxSets[maxSets.length - 1]['prob']) {
                maxSets.push({
                    prob: maxSets[maxSets.length - 2]['prob'] + bpProb,
                    bps: [...maxSets[maxSets.length - 2]['bps'], bp]
                });
            } else if (
                Math.abs(maxSets[maxSets.length - 1]['bps'][0][0] - maxSets[maxSets.length - 1]['bps'][0][1])
                    <= Math.abs(bp[0] - bp[1])
            ) {
                maxSets.push(maxSets[maxSets.length - 1]);
            } else {
                maxSets.push({
                    prob: maxSets[maxSets.length - 2]['prob'] + bpProb,
                    bps: [...maxSets[maxSets.length - 2]['bps'], bp]
                });
            }
        }

        return maxSets[maxSets.length - 1];
    }

    /**
     * @param costMatrix Cost matrix (in dense, row-major format)
     * @param size Number of rows (or columns) given costMatrix is square
     */
    public static linearSumAssignment(costMatrix: number[], size: number) {
        // Ported from SciPy https://github.com/scipy/scipy/blob/b421cd64d98c16811f84efbfab7701b335f811be/scipy/optimize/_lsap.c#L37
        // We can take some shortcuts since we know this is a square matrix and never call it with maximize

        const u = Array<number>(size).fill(0);
        const v = Array<number>(size).fill(0);
        const shortestPathCosts = Array<number>(size).fill(0);
        const path = Array<number>(size).fill(-1);
        const col4row = Array<number>(size).fill(-1);
        const row4col = Array<number>(size).fill(-1);
        const SR = Array<boolean>(size).fill(false);
        const SC = Array<boolean>(size).fill(false);
        const remaining = Array<number>(size).fill(0);

        for (let curRow = 0; curRow < size; curRow++) {
            // ----- Start augmenting_path -----
            let i = curRow;

            let minVal = 0;

            let numRemaining = size;
            for (let it = 0; it < size; it++) {
                remaining[it] = size - it - 1;
            }

            SR.fill(false);
            SC.fill(false);
            shortestPathCosts.fill(Infinity);

            let sink = -1;
            while (sink === -1) {
                let index = -1;
                let lowest = Infinity;
                SR[i] = true;

                for (let it = 0; it < numRemaining; it++) {
                    const j = remaining[it];
                    const r = minVal + costMatrix[i * size + j] - u[i] - v[j];
                    if (r < shortestPathCosts[j]) {
                        path[j] = i;
                        shortestPathCosts[j] = r;
                    }

                    if (shortestPathCosts[j] < lowest || (shortestPathCosts[j] === lowest && row4col[j] === -1)) {
                        lowest = shortestPathCosts[j];
                        index = it;
                    }
                }

                minVal = lowest;
                if (minVal === Infinity) {
                    break;
                }

                const j = remaining[index];
                if (row4col[j] === -1) {
                    sink = j;
                } else {
                    i = row4col[j];
                }

                SC[j] = true;
                remaining[index] = remaining[--numRemaining];
            }
            // ----- End augmenting_path -----

            if (sink < 0) {
                throw new Error('Cost matrix is infeasible');
            }

            u[curRow] += minVal;
            for (let ii = 0; ii < size; ii++) {
                if (SR[ii] && ii !== curRow) {
                    u[ii] += minVal - shortestPathCosts[col4row[ii]];
                }
            }

            for (let jj = 0; jj < size; jj++) {
                if (SC[jj]) {
                    v[jj] -= minVal - shortestPathCosts[jj];
                }
            }

            let j = sink;
            while (true) {
                const ii = path[j];
                row4col[j] = ii;
                const tmp = col4row[ii];
                col4row[ii] = j;
                j = tmp;
                if (ii === curRow) {
                    break;
                }
            }
        }

        const a = [];
        const b = [];
        for (let i = 0; i < size; i++) {
            a[i] = i;
            b[i] = col4row[i];
        }

        return {rowInd: a, colInd: b};
    }

    public static bppConfidence(
        targetPairs: SecStruct,
        dotArray: DotPlot | null,
        bppBehavior: BasePairProbabilityTransform
    ): { mcc: number, f1: number } {
        if (dotArray === null || dotArray.data.length === 0) return {mcc: 0, f1: 0};

        const dotMap: Map<string, number> = new Map<string, number>();
        const pairedPer: Map<number, number> = new Map<number, number>();

        for (let jj = 0; jj < dotArray.data.length; jj += 3) {
            const prob: number = bppBehavior === BasePairProbabilityTransform.LEAVE_ALONE
                ? dotArray.data[jj + 2]
                : (dotArray.data[jj + 2] * dotArray.data[jj + 2]);

            if (dotArray.data[jj] < dotArray.data[jj + 1]) {
                dotMap.set([dotArray.data[jj], dotArray.data[jj + 1]].join(','), prob);
            } else if (dotArray.data[jj] > dotArray.data[jj + 1]) {
                dotMap.set([dotArray.data[jj + 1], dotArray.data[jj]].join(','), prob);
            }

            const jjprob = pairedPer.get(dotArray.data[jj]);
            pairedPer.set(dotArray.data[jj], jjprob ? jjprob + prob : prob);

            const jjp1prob = pairedPer.get(dotArray.data[jj + 1]);
            pairedPer.set(dotArray.data[jj + 1], jjp1prob ? jjp1prob + prob : prob);
        }

        let TP = 1e-6;
        // this is the remnant of a clever closed form solution irrelevant here
        let TN = /* 0.5 * targetPairs.length * targetPairs.length - 1 + */ 1e-6;
        let FP = 1e-6;
        let FN = 1e-6;
        const cFP = 1e-6;

        // As formulated in Arnie's MEA routines
        // TP = np.sum(np.multiply(pred_m, probs)) + 1e-6
        // TN = 0.5*N*N-1 - np.sum(pred_m) - np.sum(probs) + TP + 1e-6
        // FP = np.sum(np.multiply(pred_m, 1-probs)) + 1e-6
        // FN = np.sum(np.multiply(1-pred_m, probs)) + 1e-6

        for (let ii = 0; ii < targetPairs.length; ++ii) {
            for (let jj = ii + 1; jj < targetPairs.length; ++jj) {
                const prob = dotMap.get([ii + 1, jj + 1].join(',')) ?? 0;
                // Are ii and jj paired?
                if (targetPairs.pairingPartner(ii) === jj) {
                    TP += prob;
                    FN += 1 - prob;
                } else {
                    FP += prob;
                    TN += 1 - prob;
                }
            }
        }

        return {
            mcc: (TP * TN - (FP - cFP) * FN) / Math.sqrt((TP + FP - cFP) * (TP + FN) * (TN + FP - cFP) * (TN + FN)),
            // Why this check? Otherwise since all bpp contributions would be zeroed out,
            // f1 would be calculated as (2 * 1e6) / (2 * 1e6 + 1e6 - 1e6 + 1e6) = 0.666666666.
            // Really it's undefined (the 1e6 default values are there to prevent that)
            // and "0" is better reflecting our intent
            f1: targetPairs.nonempty() ? (2 * TP) / (2 * TP + FP - cFP + FN) : 0
        };
    }

    public static pkMaskedBppConfidence(
        pairs: SecStruct,
        dotplot: DotPlot | null,
        bppBehavior: BasePairProbabilityTransform
    ): { mcc: number, f1: number } {
        if (dotplot === null || dotplot.data.length === 0) return {mcc: 0, f1: 0};

        // With this formulation, we are effectively saying any nucleotides not predicted to be
        // part of a cross pair are "correct", as we specify they should be unpaired
        // and there are no pairing probabilities at that position > 0. This is specifically tuned
        // for F1, in which the "true negative" component is disgarded in its formula.
        // As put by Rhiju:
        // The motivation for this choice is that in cases with inferred pseudoknots,
        // we really don't care about what residues outside the relevant crossed-pairs are doing.
        // We just want an estimate of whether the specific crossed-pairs will show up in the actual
        // structure. There is an analogy to how we set up the 'crossed pair quality' component for OpenKnotScore.
        const crossedPairs = pairs.getCrossedPairs();

        const bpps = dotplot.data.slice();
        for (let i = 0; i < bpps.length; i += 3) {
            const a = bpps[i] - 1;
            const b = bpps[i + 1] - 1;
            if (!crossedPairs.isPaired(a) && !crossedPairs.isPaired(b)) {
                bpps[i + 2] = 0;
            }
        }

        return FoldUtil.bppConfidence(
            crossedPairs,
            new DotPlot(bpps),
            bppBehavior
        );
    }
}

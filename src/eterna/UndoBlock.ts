import {JSONUtil} from 'flashbang';
import EPars from 'eterna/EPars';
import Plot, {PlotType} from 'eterna/Plot';
import * as log from 'loglevel';
import Pose2D, {Oligo} from './pose2D/Pose2D';
import Folder from './folding/Folder';
import Utility from './util/Utility';


export enum UndoBlockParam {
    GU = 0,
    GC = 1,
    AU = 2,
    MFE = 3,
    REPETITION = 4,
    STACK = 5,
    FE = 6,
    DOTPLOT = 7,
    DOTPLOT_BITMAP = 8,
    MELTPLOT_BITMAP = 9,
    PROB_SCORE = 10,
    MELTING_POINT = 11,
    PAIR_SCORE = 12,
    NNFE_ARRAY = 13,
    MAX = 14,
    MEANPUNP = 15,
    SUMPUNP = 16,
    BRANCHINESS = 17,
}

export default class UndoBlock {
    constructor(seq: number[]) {
        this._sequence = seq.slice();
        this._pairsArray.set(false, []);
        this._pairsArray.set(true, []);
        this._paramsArray.set(false, []);
        this._paramsArray.set(true, []);
    }

    public toJSON(): any {
        // TODO: Updating this requires changing all content in the DB AND
        // migrating all autosave content on boot for however long we want to allow
        // players to migrate their autosaves
        /* eslint-disable @typescript-eslint/camelcase */
        return {
            sequence_: this._sequence,
            pairs_array_: this._pairsArray,
            params_array_: this._paramsArray,
            stable_: this._stable,
            target_oligo_: this._targetOligo,
            target_oligos_: this._targetOligos,
            oligo_order_: this._oligoOrder,
            oligos_paired_: this._oligosPaired,
            target_pairs_: this._targetPairs,
            target_oligo_order_: this._targetOligoOrder,
            puzzle_locks_: this._puzzleLocks,
            forced_struct_: this._forcedStruct,
            target_conditions_: this._targetConditions
        };
        /* eslint-enable @typescript-eslint/camelcase */
    }

    public fromJSON(json: any): void {
        try {
            this._sequence = JSONUtil.require(json, 'sequence_');
            this._pairsArray = JSONUtil.require(json, 'pairs_array_');
            this._paramsArray = JSONUtil.require(json, 'params_array_');
            this._stable = JSONUtil.require(json, 'stable_');
            this._targetOligo = JSONUtil.require(json, 'target_oligo_');
            this._targetOligos = JSONUtil.require(json, 'target_oligos_');
            this._oligoOrder = JSONUtil.require(json, 'oligo_order_');
            this._oligosPaired = JSONUtil.require(json, 'oligos_paired_');
            this._targetPairs = JSONUtil.require(json, 'target_pairs_');
            this._targetOligoOrder = JSONUtil.require(json, 'target_oligo_order_');
            this._puzzleLocks = JSONUtil.require(json, 'puzzle_locks_');
            this._forcedStruct = JSONUtil.require(json, 'forced_struct_');
            this._targetConditions = JSONUtil.require(json, 'target_conditions_');
        } catch (e) {
            throw new Error(`Error parsing UndoBlock JSON: ${e}`);
        }
    }

    public get targetOligos(): Oligo[] {
        return this._targetOligos;
    }

    public set targetOligos(targetOligos: Oligo[]) {
        this._targetOligos = targetOligos == null ? null : JSON.parse(JSON.stringify(targetOligos));
    }

    public get targetOligo(): number[] {
        return this._targetOligo;
    }

    public set targetOligo(targetOligo: number[]) {
        this._targetOligo = targetOligo == null ? null : targetOligo.slice();
    }

    public get oligoMode(): number {
        let tc: any = this.targetConditions;
        if (tc == null) return 0;
        return tc['fold_mode'] == null ? Pose2D.OLIGO_MODE_DIMER : Number(tc['fold_mode']);
    }

    public get oligoName(): string {
        let tc: any = this.targetConditions;
        if (tc == null) {
            return null;
        }
        return Object.prototype.hasOwnProperty.call(tc, 'oligo_name') ? tc['oligo_name'] : null;
    }

    public get oligoOrder(): number[] {
        return this._oligoOrder;
    }

    public set oligoOrder(oligoOrder: number[]) {
        this._oligoOrder = oligoOrder == null ? null : oligoOrder.slice();
    }

    public get oligosPaired(): number {
        return this._oligosPaired;
    }

    public set oligosPaired(oligosPaired: number) {
        this._oligosPaired = oligosPaired;
    }

    public get targetPairs(): number[] {
        return this._targetPairs;
    }

    public set targetPairs(targetPairs: number[]) {
        this._targetPairs = targetPairs.slice();
    }

    public get targetOligoOrder(): number[] {
        return this._targetOligoOrder;
    }

    public set targetOligoOrder(oligoOrder: number[]) {
        this._targetOligoOrder = oligoOrder == null ? null : oligoOrder.slice();
    }

    public get sequence(): number[] {
        return this._sequence;
    }

    public set sequence(seq: number[]) {
        this._sequence = seq.slice();
    }

    public get puzzleLocks(): boolean[] {
        return this._puzzleLocks;
    }

    public set puzzleLocks(locks: boolean[]) {
        this._puzzleLocks = locks;
    }

    public get forcedStruct(): number[] {
        return this._forcedStruct;
    }

    public set forcedStruct(forced: number[]) {
        this._forcedStruct = forced;
    }

    public get targetConditions(): any {
        return (this._targetConditions == null ? null : JSON.parse(this._targetConditions));
    }

    public set targetConditions(conditions: any) {
        this._targetConditions = JSON.stringify(conditions);
    }

    public get stable(): boolean {
        return this._stable;
    }

    public set stable(stable: boolean) {
        this._stable = stable;
    }

    public getPairs(temp: number = 37, pseudoknots: boolean = false): number[] {
        return this._pairsArray.get(pseudoknots)[temp];
    }

    public getParam(index: UndoBlockParam, temp: number = 37, pseudoknots: boolean = false): any {
        if (this._paramsArray.get(pseudoknots)[temp] != null) {
            return this._paramsArray.get(pseudoknots)[temp][index];
        } else {
            return undefined;
        }
    }

    public setPairs(pairs: number[], temp: number = 37, pseudoknots: boolean = false): void {
        this._pairsArray.get(pseudoknots)[temp] = pairs.slice();
    }

    public setParam(index: UndoBlockParam, val: any, temp: number = 37, pseudoknots: boolean = false): void {
        if (this._paramsArray.get(pseudoknots)[temp] == null) {
            this._paramsArray.get(pseudoknots)[temp] = [];
        }
        this._paramsArray.get(pseudoknots)[temp][index] = val;
    }

    public setBasics(folder: Folder, temp: number = 37, pseudoknots: boolean = false): void {
        let bestPairs: number[];
        let seq: number[] = this._sequence;
        bestPairs = this.getPairs(temp, pseudoknots);
        this.setParam(UndoBlockParam.GU, EPars.numGUPairs(seq, bestPairs), temp, pseudoknots);
        this.setParam(UndoBlockParam.GC, EPars.numGCPairs(seq, bestPairs), temp, pseudoknots);
        this.setParam(UndoBlockParam.AU, EPars.numUAPairs(seq, bestPairs), temp, pseudoknots);
        this.setParam(UndoBlockParam.STACK, EPars.getLongestStackLength(bestPairs), temp, pseudoknots);
        this.setParam(UndoBlockParam.REPETITION, EPars.getSequenceRepetition(
            EPars.sequenceToString(seq), 5
        ), temp, pseudoknots);

        let fullSeq: number[] = seq.slice();
        if (this._targetOligo) {
            if (this.oligoMode === Pose2D.OLIGO_MODE_DIMER) fullSeq.push(EPars.RNABASE_CUT);
            if (this.oligoMode === Pose2D.OLIGO_MODE_EXT5P) {
                fullSeq = this._targetOligo.concat(fullSeq);
            } else {
                fullSeq = fullSeq.concat(this._targetOligo);
            }
        } else if (this._targetOligos) {
            for (let ii = 0; ii < this._targetOligos.length; ii++) {
                fullSeq.push(EPars.RNABASE_CUT);
                fullSeq = fullSeq.concat(this._targetOligos[this._oligoOrder[ii]].sequence);
            }
        }
        let nnfe: number[] = [];
        let totalFE = folder.scoreStructures(fullSeq, bestPairs, pseudoknots, temp, nnfe);

        this.setParam(UndoBlockParam.FE, totalFE, temp, pseudoknots);
        this.setParam(UndoBlockParam.NNFE_ARRAY, nnfe, temp, pseudoknots);
    }

    public sumProbUnpaired(dotArray: number[]) {
        // dotArray is organized as idx, idx, pairprob.
        let probUnpaired: number[] = Array<number>(this.sequence.length);
        for (let idx = 0; idx < this.sequence.length; ++idx) {
            probUnpaired[idx] = 1;
            for (let ii = 0; ii < dotArray.length; ii += 3) {
                if (dotArray[ii] === idx + 1) {
                    probUnpaired[idx] -= dotArray[ii + 2];
                }
            }
        }
        for (let idx = 0; idx < this.sequence.length; ++idx) {
            if (probUnpaired[idx] < 0) {
                probUnpaired[idx] = 0;
            }
        }

        // mean prob unpaired
        return probUnpaired.reduce((a, b) => a + b, 0);// / this.sequence.length;
    }

    public branchiness(pairs: number[]) {
        // format of pairs is
        // '((.))' -> [4,3,-1,1,0]
        // note that if you calculate this average, it's fine to double count
        // pairs for obvious reasons! so this is the average difference between
        // idx and val

        let branchiness = 0;
        let count = 0;
        for (let ii = 0; ii < pairs.length; ++ii) {
            if (pairs[ii] === -1) {
                continue;
            }

            if (pairs[ii] > ii) {
                branchiness += pairs[ii] - ii;
            } else {
                branchiness += ii - pairs[ii];
            }
            ++count;
        }

        return branchiness / count;
    }

    public ensembleBranchiness(dotArray: number[]) {
        // format of pairs is
        // '((.))' -> [4,3,-1,1,0]
        // note that if you calculate this average, it's fine to double count
        // pairs for obvious reasons! so this is the average difference between
        // idx and val

        let branchiness = 0;

        // every bp adds jj - ii to branchiness and prob to count.
        let count = 0;

        // dotArray is organized as idx, idx, pairprob.
        for (let ii = 0; ii < dotArray.length; ii += 3) {
            if (dotArray[ii] > dotArray[ii + 1]) {
                branchiness += dotArray[ii] - dotArray[ii + 1];
            } else {
                branchiness += dotArray[ii + 1] - dotArray[ii];
            }
            count += dotArray[ii + 2];
        }
        return branchiness / count;
    }

    public updateMeltingPointAndDotPlot(folder: Folder, pseudoknots: boolean = false): void {
        if (this.getParam(UndoBlockParam.DOTPLOT, 37, pseudoknots) === null) {
            let dotArray: number[] = folder.getDotPlot(this.sequence, this.getPairs(37), 37, pseudoknots);
            // mean+sum prob unpaired
            this.setParam(UndoBlockParam.SUMPUNP, this.sumProbUnpaired(dotArray), 37, pseudoknots);
            this.setParam(UndoBlockParam.MEANPUNP,
                this.sumProbUnpaired(dotArray) / this.sequence.length, 37, pseudoknots);
            // branchiness
            this.setParam(UndoBlockParam.BRANCHINESS, this.ensembleBranchiness(dotArray), 37, pseudoknots);

            this.setParam(UndoBlockParam.DOTPLOT, dotArray, 37, pseudoknots);
            this._dotPlotData = dotArray.slice();
        }

        for (let ii = 37; ii < 100; ii += 10) {
            if (this.getPairs(ii) == null) {
                this.setPairs(folder.foldSequence(this.sequence, null, null, pseudoknots, ii), ii, pseudoknots);
            }

            if (this.getParam(UndoBlockParam.DOTPLOT, ii) == null) {
                let dotTempArray: number[] = folder.getDotPlot(this.sequence, this.getPairs(ii), ii, pseudoknots);
                // mean+sum prob unpaired
                this.setParam(UndoBlockParam.SUMPUNP, this.sumProbUnpaired(dotTempArray), ii, pseudoknots);
                this.setParam(UndoBlockParam.MEANPUNP,
                    this.sumProbUnpaired(dotTempArray) / this.sequence.length, ii, pseudoknots);
                // branchiness
                this.setParam(UndoBlockParam.BRANCHINESS, this.ensembleBranchiness(dotTempArray), ii, pseudoknots);

                this.setParam(UndoBlockParam.DOTPLOT, dotTempArray, ii, pseudoknots);
            }
        }

        let refPairs: number[] = this.getPairs(37);

        let pairScores: number[] = [];
        let maxPairScores: number[] = [];

        for (let ii = 37; ii < 100; ii += 10) {
            if (this.getParam(UndoBlockParam.PROB_SCORE, ii)) {
                pairScores.push(1 - this.getParam(UndoBlockParam.PAIR_SCORE, ii, pseudoknots));
                maxPairScores.push(1.0);
                continue;
            }
            let curDat: number[] = this.getParam(UndoBlockParam.DOTPLOT, ii, pseudoknots);
            let curPairs: number[] = this.getPairs(ii, pseudoknots);
            let probScore = 0;
            let scoreCount = 0;

            for (let jj = 0; jj < curDat.length; jj += 3) {
                let indexI: number = curDat[jj] - 1;
                let indexJ: number = curDat[jj + 1] - 1;

                if (indexI < indexJ) {
                    if (refPairs[indexI] === indexJ) {
                        probScore += Number(curDat[jj + 2]);
                        scoreCount++;
                    }
                } else if (indexJ < indexI) {
                    if (refPairs[indexJ] === indexI) {
                        probScore += Number(curDat[jj + 2]);
                        scoreCount++;
                    }
                }
            }

            if (scoreCount > 0) {
                probScore /= scoreCount;
            }

            let numPaired = 0;
            for (let jj = 0; jj < curPairs.length; jj++) {
                if (curPairs[jj] > jj) {
                    numPaired += 2;
                }
            }
            let pairScore: number = Number(numPaired) / refPairs.length;

            pairScores.push(1 - pairScore);
            maxPairScores.push(1.0);

            this.setParam(UndoBlockParam.PROB_SCORE, probScore, ii, pseudoknots);
            this.setParam(UndoBlockParam.PAIR_SCORE, pairScore, ii, pseudoknots);
        }

        this._meltPlotPairScores = pairScores;
        this._meltPlotMaxPairScores = maxPairScores;

        let initScore: number = this.getParam(UndoBlockParam.PROB_SCORE, 37, pseudoknots);

        let meltpoint = 107;
        for (let ii = 47; ii < 100; ii += 10) {
            let currentScore: number = this.getParam(UndoBlockParam.PROB_SCORE, ii, pseudoknots);
            if (currentScore < initScore * 0.5) {
                meltpoint = ii;
                break;
            }
        }

        this.setParam(UndoBlockParam.MELTING_POINT, meltpoint, 37, pseudoknots);
    }

    public createDotPlot(): Plot {
        let plot = new Plot(PlotType.SCATTER);
        plot.set2DData(this._dotPlotData, this._sequence.length);
        return plot;
    }

    public createMeltPlot(): Plot {
        let plot = new Plot(PlotType.LINE);
        plot.setData(this._meltPlotPairScores, this._meltPlotMaxPairScores);
        return plot;
    }

    /**
     * Return map of current base indices to adjusted base indices when oligos are rearranged
     * according to otherorder
     * @param otherOrder An array of indexes, where the index refers to the new index
     * the oligo at the given position in the old array should be placed at.
     * E.g., given oligos in order A B C, [1,2,0] means their new order should be C, A, B
     * (oligo A, with the old index of 0, should be at new index 1)
     */
    public reorderedOligosIndexMap(otherOrder: number[]): number[] {
        if (this._targetOligos == null) return null;

        let originalIndices: number[][] = [];
        let oligoFirstBaseIndex = this._sequence.length;

        for (let oligo of this._targetOligos) {
            // The + 1 is used to account for the "cut" base denoting split points between strands
            originalIndices.push(Utility.range(oligoFirstBaseIndex, oligoFirstBaseIndex + oligo.sequence.length + 1));
            oligoFirstBaseIndex += oligo.sequence.length + 1;
        }

        let newOrder = otherOrder || Utility.range(this._targetOligos.length);

        return Utility.range(this._sequence.length).concat(
            ...Utility.range(this._targetOligos.length).map((idx) => originalIndices[newOrder.indexOf(idx)])
        );
    }

    private _sequence: number[];
    private _pairsArray: Map<boolean, number[][]> = new Map<boolean, number[][]>();
    private _paramsArray: Map<boolean, any[][]> = new Map<boolean, any[][]>();
    private _stable: boolean = false;
    private _targetOligo: number[] = null;
    private _targetOligos: Oligo[] = null;
    private _oligoOrder: number[] = null;
    private _oligosPaired: number = 0;
    private _targetPairs: number[] = [];
    private _targetOligoOrder: number[] = null;
    private _puzzleLocks: boolean[] = [];
    private _forcedStruct: number[] = [];
    private _targetConditions: string = null;

    private _dotPlotData: number[];
    private _meltPlotPairScores: number[];
    private _meltPlotMaxPairScores: number[];
}

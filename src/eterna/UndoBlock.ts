import {JSONUtil} from "flashbang/util";
import EPars from "eterna/EPars";
import {Folder} from "eterna/folding";
import {default as Plot, PlotType} from "eterna/Plot";
import {Oligo, Pose2D} from "eterna/pose2D";

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
}

export default class UndoBlock {
    public constructor(seq: number[]) {
        this._sequence = seq.slice();
    }

    public toJSON(): any {
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
    }

    public fromJSON(json: any): void {
        try {
            this._sequence = JSONUtil.require(json, "sequence_");
            this._pairsArray = JSONUtil.require(json, "pairs_array_");
            this._paramsArray = JSONUtil.require(json, "params_array_");
            this._stable = JSONUtil.require(json, "stable_");
            this._targetOligo = JSONUtil.require(json, "target_oligo_");
            this._targetOligos = JSONUtil.require(json, "target_oligos_");
            this._oligoOrder = JSONUtil.require(json, "oligo_order_");
            this._oligosPaired = JSONUtil.require(json, "oligos_paired_");
            this._targetPairs = JSONUtil.require(json, "target_pairs_");
            this._targetOligoOrder = JSONUtil.require(json, "target_oligo_order_");
            this._puzzleLocks = JSONUtil.require(json, "puzzle_locks_");
            this._forcedStruct = JSONUtil.require(json, "forced_struct_");
            this._targetConditions = JSONUtil.require(json, "target_conditions_");
        } catch (e) {
            throw new Error(`Error parsing UndoBlock JSON: ${e}`);
        }
    }

    public get targetOligos(): Oligo[] {
        return this._targetOligos;
    }

    public set targetOligos(target_oligos: Oligo[]) {
        this._targetOligos = target_oligos == null ? null : JSON.parse(JSON.stringify(target_oligos));
    }

    public get targetOligo(): number[] {
        return this._targetOligo;
    }

    public set targetOligo(target_oligo: number[]) {
        this._targetOligo = target_oligo == null ? null : target_oligo.slice();
    }

    public get oligoMode(): number {
        let tc: any = this.targetConditions;
        if (tc == null) return 0;
        return tc["fold_mode"] == null ? Pose2D.OLIGO_MODE_DIMER : Number(tc["fold_mode"]);
    }

    public get oligoName(): string {
        let tc: any = this.targetConditions;
        if (tc == null) {
            return null;
        }
        return tc.hasOwnProperty("oligo_name") ? tc["oligo_name"] : null;
    }

    public get oligoOrder(): number[] {
        return this._oligoOrder;
    }

    public set oligoOrder(oligo_order: number[]) {
        this._oligoOrder = oligo_order == null ? null : oligo_order.slice();
    }

    public get oligosPaired(): number {
        return this._oligosPaired;
    }

    public set oligosPaired(oligos_paired: number) {
        this._oligosPaired = oligos_paired;
    }

    public get targetPairs(): number[] {
        return this._targetPairs;
    }

    public set targetPairs(target_pairs: number[]) {
        this._targetPairs = target_pairs.slice();
    }

    public get targetOligoOrder(): number[] {
        return this._targetOligoOrder;
    }

    public set targetOligoOrder(oligo_order: number[]) {
        this._targetOligoOrder = oligo_order == null ? null : oligo_order.slice();
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

    public getPairs(temp: number = 37): number[] {
        return this._pairsArray[temp];
    }

    public getParam(index: UndoBlockParam, temp: number = 37): any {
        if (this._paramsArray[temp] != null) {
            return this._paramsArray[temp][index];
        } else {
            return undefined;
        }
    }

    public setPairs(pairs: number[], temp: number = 37): void {
        this._pairsArray[temp] = pairs.slice();
    }

    public setParam(index: UndoBlockParam, val: any, temp: number = 37): void {
        if (this._paramsArray[temp] == null) {
            this._paramsArray[temp] = [];
        }
        this._paramsArray[temp][index] = val;
    }

    public setBasics(folder: Folder, temp: number = 37): void {
        let best_pairs: number[] = this.getPairs(temp);
        let seq: number[] = this._sequence;

        this.setParam(UndoBlockParam.GU, EPars.numGUPairs(seq, best_pairs), temp);
        this.setParam(UndoBlockParam.GC, EPars.numGCPairs(seq, best_pairs), temp);
        this.setParam(UndoBlockParam.AU, EPars.numUAPairs(seq, best_pairs), temp);
        this.setParam(UndoBlockParam.STACK, EPars.getLongestStackLength(best_pairs), temp);
        this.setParam(UndoBlockParam.REPETITION, EPars.getSequenceRepetition(EPars.sequenceToString(seq), 5), temp);
        let full_seq: number[] = seq.slice();
        if (this._targetOligo) {
            if (this.oligoMode === Pose2D.OLIGO_MODE_DIMER) full_seq.push(EPars.RNABASE_CUT);
            if (this.oligoMode === Pose2D.OLIGO_MODE_EXT5P) {
                full_seq = this._targetOligo.concat(full_seq);
            } else {
                full_seq = full_seq.concat(this._targetOligo);
            }
        } else if (this._targetOligos) {
            for (let ii = 0; ii < this._targetOligos.length; ii++) {
                full_seq.push(EPars.RNABASE_CUT);
                full_seq = full_seq.concat(this._targetOligos[this._oligoOrder[ii]].sequence);
            }
        }
        let nnfe: number[] = [];
        let total_fe: number = folder.scoreStructures(full_seq, best_pairs, temp, nnfe);
        this.setParam(UndoBlockParam.FE, total_fe, temp);
        this.setParam(UndoBlockParam.NNFE_ARRAY, nnfe, temp);
    }

    public updateMeltingPointAndDotPlot(folder: Folder): void {
        if (this.getParam(UndoBlockParam.DOTPLOT, 37) == null) {
            let dot_array: number[] = folder.getDotPlot(this.sequence, this.getPairs(37), 37);
            this.setParam(UndoBlockParam.DOTPLOT, dot_array, 37);
            this._dotPlotData = dot_array.slice();
        }

        for (let ii = 37; ii < 100; ii += 10) {
            if (this.getPairs(ii) == null) {
                this.setPairs(folder.foldSequence(this.sequence, null, null, ii), ii);
            }

            if (this.getParam(UndoBlockParam.DOTPLOT, ii) == null) {
                let dot_temp_array: number[] = folder.getDotPlot(this.sequence, this.getPairs(ii), ii);
                this.setParam(UndoBlockParam.DOTPLOT, dot_temp_array, ii);
            }
        }

        let ref_pairs: number[] = this.getPairs(37);

        let pair_scores: number[] = [];
        let max_pair_scores: number[] = [];

        for (let ii = 37; ii < 100; ii += 10) {
            if (this.getParam(UndoBlockParam.PROB_SCORE, ii)) {
                pair_scores.push(1 - this.getParam(UndoBlockParam.PAIR_SCORE, ii));
                max_pair_scores.push(1.0);
                continue;
            }
            let cur_dat: number[] = this.getParam(UndoBlockParam.DOTPLOT, ii);
            let cur_pairs: number[] = this.getPairs(ii);
            let prob_score = 0;
            let score_count = 0;

            for (let jj = 0; jj < cur_dat.length; jj += 3) {
                let index_i: number = cur_dat[jj] - 1;
                let index_j: number = cur_dat[jj + 1] - 1;

                if (index_i < index_j) {
                    if (ref_pairs[index_i] === index_j) {
                        prob_score += Number(cur_dat[jj + 2]);
                        score_count++;
                    }
                } else if (index_j < index_i) {
                    if (ref_pairs[index_j] === index_i) {
                        prob_score += Number(cur_dat[jj + 2]);
                        score_count++;
                    }
                }
            }

            if (score_count > 0) {
                prob_score /= score_count;
            }

            let num_paired = 0;
            for (let jj = 0; jj < cur_pairs.length; jj++) {
                if (cur_pairs[jj] > jj) {
                    num_paired += 2;
                }
            }
            let pair_score: number = Number(num_paired) / ref_pairs.length;

            pair_scores.push(1 - pair_score);
            max_pair_scores.push(1.0);

            this.setParam(UndoBlockParam.PROB_SCORE, prob_score, ii);
            this.setParam(UndoBlockParam.PAIR_SCORE, pair_score, ii);
        }

        this._meltPlotPairScores = pair_scores;
        this._meltPlotMaxPairScores = max_pair_scores;

        let init_score: number = this.getParam(UndoBlockParam.PROB_SCORE, 37);

        let meltpoint = 107;
        for (let ii = 47; ii < 100; ii += 10) {
            let current_score: number = this.getParam(UndoBlockParam.PROB_SCORE, ii);
            if (current_score < init_score * 0.5) {
                meltpoint = ii;
                break;
            }
        }

        this.setParam(UndoBlockParam.MELTING_POINT, meltpoint, 37);
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

    public getOrderMap(other_order: number[]): number[] {
        if (this._targetOligos == null) return null;

        let idx_map: number[] = [];
        let ofs: number[] = [];
        let ii: number = this._sequence.length;
        for (let jj = 0; jj < this._targetOligos.length; jj++) {
            let kk = (other_order == null ? jj : other_order[jj]);
            ofs[kk] = ii;
            ii += 1 + this._targetOligos[kk].sequence.length;
        }
        for (ii = 0; ii < this._sequence.length; ii++) idx_map[ii] = ii;
        for (let jj = 0; jj < this._targetOligos.length; jj++) {
            let kk = ofs[jj];
            let xx: number;
            for (xx = 0; xx <= this._targetOligos[jj].sequence.length; xx++) {
                idx_map[ii + xx] = kk + xx;
            }
            ii += xx;
        }
        return idx_map;
    }

    private _sequence: number[];
    private _pairsArray: number[][] = [];
    private _paramsArray: any[][] = [];
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

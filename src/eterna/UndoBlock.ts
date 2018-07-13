import {JSONUtil} from "../flashbang/util/JSONUtil";
import {EPars} from "./EPars";
import {Folder} from "./folding/Folder";
import {Plot, PlotType} from "./Plot";
import {Pose2D} from "./pose2D/Pose2D";

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

export class UndoBlock {
    public constructor(seq: number[]) {
        this._sequence = seq.slice();
    }

    public toJson(): any {
        return {
            sequence_: this._sequence,
            pairs_array_: this._pairs_array,
            params_array_: this._params_array,
            stable_: this._stable,
            target_oligo_: this._target_oligo,
            target_oligos_: this._target_oligos,
            oligo_order_: this._oligo_order,
            oligos_paired_: this._oligos_paired,
            target_pairs_: this._target_pairs,
            target_oligo_order_: this._target_oligo_order,
            puzzle_locks_: this._puzzle_locks,
            forced_struct_: this._forced_struct,
            target_conditions_: this._target_conditions
        };
    }

    public fromJson(json: any): void {
        try {
            this._sequence = JSONUtil.require(json, 'sequence_');
            this._pairs_array = JSONUtil.require(json, 'pairs_array_');
            this._params_array = JSONUtil.require(json, 'params_array_');
            this._stable = JSONUtil.require(json, 'stable_');
            this._target_oligo = JSONUtil.require(json, 'target_oligo_');
            this._target_oligos = JSONUtil.require(json, 'target_oligos_');
            this._oligo_order = JSONUtil.require(json, 'oligo_order_');
            this._oligos_paired = JSONUtil.require(json, 'oligos_paired_');
            this._target_pairs = JSONUtil.require(json, 'target_pairs_');
            this._target_oligo_order = JSONUtil.require(json, 'target_oligo_order_');
            this._puzzle_locks = JSONUtil.require(json, 'puzzle_locks_');
            this._forced_struct = JSONUtil.require(json, 'forced_struct_');
            this._target_conditions = JSONUtil.require(json, 'target_conditions_');
        } catch (e) {
            throw new Error(`Error parsing UndoBlock JSON: ${e}`);
        }
    }

    public get_target_oligos(): any[] {
        return this._target_oligos;
    }

    public get_target_oligo(): any[] {
        return this._target_oligo;
    }

    public get_oligo_mode(): number {
        let tc: any = this.get_target_conditions();
        if (tc == null) return 0;
        return tc['fold_mode'] == null ? Pose2D.OLIGO_MODE_DIMER : tc['fold_mode'];
    }

    public get_oligo_name(): string {
        let tc: any = this.get_target_conditions();
        if (tc == null) return null;
        return tc.hasOwnProperty('oligo_name') ? tc['oligo_name'] : null;
    }

    public set_target_oligos(target_oligos: any[]): void {
        this._target_oligos = target_oligos == null ? null : JSON.parse(JSON.stringify(target_oligos));
    }

    public set_target_oligo(target_oligo: any[]): void {
        this._target_oligo = target_oligo == null ? null : target_oligo.slice();
    }

    public get_oligo_order(): number[] {
        return this._oligo_order;
    }

    public set_oligo_order(oligo_order: number[]): void {
        this._oligo_order = oligo_order == null ? null : oligo_order.slice();
    }

    public get_oligos_paired(): number {
        return this._oligos_paired;
    }

    public set_oligos_paired(oligos_paired: number): void {
        this._oligos_paired = oligos_paired;
    }

    public get_target_pairs(): number[] {
        return this._target_pairs;
    }

    public set_target_pairs(target_pairs: number[]): void {
        this._target_pairs = target_pairs.slice();
    }

    public get_target_oligo_order(): any[] {
        return this._target_oligo_order;
    }

    public set_target_oligo_order(oligo_order: any[]): void {
        this._target_oligo_order = oligo_order == null ? null : oligo_order.slice();
    }

    public get_sequence(): number[] {
        return this._sequence;
    }

    public set_sequence(seq: number[]): void {
        this._sequence = seq.slice();
    }

    public get_puzzle_locks(): boolean[] {
        return this._puzzle_locks;
    }

    public set_puzzle_locks(locks: boolean[]): void {
        this._puzzle_locks = locks;
    }

    public get_forced_struct(): any[] {
        return this._forced_struct;
    }

    public set_forced_struct(forced: any[]): void {
        this._forced_struct = forced;
    }

    public set_target_conditions(target_conditions: any): void {
        this._target_conditions = JSON.stringify(target_conditions);
    }

    public get_target_conditions(): any {
        return (this._target_conditions == null ? null : JSON.parse(this._target_conditions));
    }

    public get_pairs(temp: number = 37): number[] {
        return this._pairs_array[temp];
    }

    public get_stable(): boolean {
        return this._stable;
    }

    public get_param(index: UndoBlockParam, temp: number = 37): any {
        if (this._params_array[temp] != null) {
            return this._params_array[temp][index];
        } else {
            return null;
        }
    }

    public set_pairs(pairs: number[], temp: number = 37): void {
        this._pairs_array[temp] = pairs.slice();
    }

    public set_stable(stable: boolean): void {
        this._stable = stable;
    }

    public set_param(index: UndoBlockParam, val: any, temp: number = 37): void {
        if (this._params_array[temp] == null) {
            this._params_array[temp] = [];
        }
        this._params_array[temp][index] = val;
    }

    public set_basics(folder: Folder, temp: number = 37): void {
        let best_pairs: number[] = this.get_pairs(temp);
        let seq: number[] = this._sequence;

        this.set_param(UndoBlockParam.GU, EPars.num_gu_pairs(seq, best_pairs), temp);
        this.set_param(UndoBlockParam.GC, EPars.num_gc_pairs(seq, best_pairs), temp);
        this.set_param(UndoBlockParam.AU, EPars.num_ua_pairs(seq, best_pairs), temp);
        this.set_param(UndoBlockParam.STACK, EPars.get_longest_stack_length(best_pairs), temp);
        this.set_param(UndoBlockParam.REPETITION, EPars.get_sequence_repetition(EPars.sequence_array_to_string(seq), 5), temp);
        let full_seq: number[] = seq.slice();
        if (this._target_oligo) {
            if (this.get_oligo_mode() == Pose2D.OLIGO_MODE_DIMER) full_seq.push(EPars.RNABASE_CUT);
            if (this.get_oligo_mode() == Pose2D.OLIGO_MODE_EXT5P) {
                full_seq = this._target_oligo.concat(full_seq);
            } else {
                full_seq = full_seq.concat(this._target_oligo);
            }
        } else if (this._target_oligos) {
            for (let ii: number = 0; ii < this._target_oligos.length; ii++) {
                full_seq.push(EPars.RNABASE_CUT);
                full_seq = full_seq.concat(this._target_oligos[this._oligo_order[ii]].sequence);
            }
        }
        let nnfe: number[] = [];
        let total_fe: number = folder.score_structures(full_seq, best_pairs, temp, nnfe);
        this.set_param(UndoBlockParam.FE, total_fe, temp);
        this.set_param(UndoBlockParam.NNFE_ARRAY, nnfe, temp);
    }

    public set_meltingpoint_and_dotplot(folder: Folder): void {
        if (this.get_param(UndoBlockParam.DOTPLOT, 37) == null) {
            let dot_array: number[] = folder.get_dot_plot(this.get_sequence(), this.get_pairs(37), 37);
            this.set_param(UndoBlockParam.DOTPLOT, dot_array, 37);
            this._dotplot_data = dot_array.slice();
        }

        for (let ii = 37; ii < 100; ii += 10) {
            if (this.get_pairs(ii) == null) {
                this.set_pairs(folder.fold_sequence(this.get_sequence(), null, null, ii), ii);
            }

            if (this.get_param(UndoBlockParam.DOTPLOT, ii) == null) {
                let dot_temp_array: number[] = folder.get_dot_plot(this.get_sequence(), this.get_pairs(ii), ii);
                this.set_param(UndoBlockParam.DOTPLOT, dot_temp_array, ii);
            }
        }

        let ref_pairs: number[] = this.get_pairs(37);

        let pair_scores: number[] = [];
        let max_pair_scores: number[] = [];

        for (let ii = 37; ii < 100; ii += 10) {
            if (this.get_param(UndoBlockParam.PROB_SCORE, ii)) {
                pair_scores.push(1 - this.get_param(UndoBlockParam.PAIR_SCORE, ii));
                max_pair_scores.push(1.0);
                continue;
            }
            let cur_dat: number[] = this.get_param(UndoBlockParam.DOTPLOT, ii);
            let cur_pairs: number[] = this.get_pairs(ii);
            let prob_score: number = 0;
            let score_count: number = 0;

            for (let jj: number = 0; jj < cur_dat.length; jj += 3) {
                let index_i: number = cur_dat[jj] - 1;
                let index_j: number = cur_dat[jj + 1] - 1;

                if (index_i < index_j) {
                    if (ref_pairs[index_i] == index_j) {
                        prob_score += Number(cur_dat[jj + 2]);
                        score_count++;
                    }
                } else if (index_j < index_i) {
                    if (ref_pairs[index_j] == index_i) {
                        prob_score += Number(cur_dat[jj + 2]);
                        score_count++;
                    }
                }
            }

            if (score_count > 0) {
                prob_score /= score_count;
            }

            let num_paired: number = 0;
            for (let jj = 0; jj < cur_pairs.length; jj++) {
                if (cur_pairs[jj] > jj) {
                    num_paired += 2;
                }
            }
            let pair_score: number = Number(num_paired) / ref_pairs.length;

            pair_scores.push(1 - pair_score);
            max_pair_scores.push(1.0);

            this.set_param(UndoBlockParam.PROB_SCORE, prob_score, ii);
            this.set_param(UndoBlockParam.PAIR_SCORE, pair_score, ii);
        }

        this._meltplot_pairscores = pair_scores;
        this._meltplot_maxpairscores = max_pair_scores;

        let init_score: number = this.get_param(UndoBlockParam.PROB_SCORE, 37);

        let meltpoint: number = 107;
        for (let ii = 47; ii < 100; ii += 10) {
            let current_score: number = this.get_param(UndoBlockParam.PROB_SCORE, ii);
            if (current_score < init_score * 0.5) {
                meltpoint = ii;
                break;
            }
        }

        this.set_param(UndoBlockParam.MELTING_POINT, meltpoint, 37);
    }

    public create_dotplot(): Plot {
        let plot = new Plot();
        plot.set_type(PlotType.SCATTER);
        plot.set_2d_data(this._dotplot_data, this._sequence.length);
        return plot;
    }

    public create_meltplot(): Plot {
        let plot = new Plot();
        plot.set_type(PlotType.LINE);
        plot.set_data(this._meltplot_pairscores, this._meltplot_maxpairscores);
        return plot;
    }

    public get_order_map(other_order: number[]): number[] {
        if (this._target_oligos == null) return null;

        let idx_map: number[] = [];
        let ofs: number[] = [];
        let ii: number = this._sequence.length;
        for (let jj = 0; jj < this._target_oligos.length; jj++) {
            let kk = (other_order == null ? jj : other_order[jj]);
            ofs[kk] = ii;
            ii += 1 + this._target_oligos[kk].sequence.length;
        }
        for (let ii = 0; ii < this._sequence.length; ii++) idx_map[ii] = ii;
        for (let jj = 0; jj < this._target_oligos.length; jj++) {
            let kk = ofs[jj];
            let xx: number;
            for (xx = 0; xx <= this._target_oligos[jj].sequence.length; xx++) {
                idx_map[ii + xx] = kk + xx;
            }
            ii += xx;
        }
        return idx_map;
    }

    private _sequence: number[];
    private _pairs_array: number[][] = [];
    private _params_array: number[][] = [];
    private _stable: boolean = false;
    private _target_oligo: any[] = null;
    private _target_oligos: any[] = null;
    private _oligo_order: number[] = null;
    private _oligos_paired: number = 0;
    private _target_pairs: number[] = [];
    private _target_oligo_order: any[] = null;
    private _puzzle_locks: boolean[] = [];
    private _forced_struct: any[] = [];
    private _target_conditions: string = null;

    private _dotplot_data: number[];
    private _meltplot_pairscores: number[];
    private _meltplot_maxpairscores: number[];
}

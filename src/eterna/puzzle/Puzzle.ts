import {Constants} from "../Constants";
import {EPars} from "../EPars";
import {FolderManager} from "../folding/FolderManager";
import {Vienna} from "../folding/Vienna";
import {EternaURL} from "../net/EternaURL";
import {Pose2D} from "../pose2D/Pose2D";
import {ConstraintType} from "./Constraints";

export enum PuzzleType {
    BASIC = "Basic",
    SWITCH_BASIC = "SwitchBasic",
    CHALLENGE = "Challenge",
    EXPERIMENTAL = "Experimental"
}

export class Puzzle {
    public static is_aptamer_type(tc_type: string): boolean {
        return (Puzzle.T_APTAMER.indexOf(tc_type) >= 0);
    }

    public static is_oligo_type(tc_type: string): boolean {
        return (Puzzle.T_OLIGO.indexOf(tc_type) >= 0);
    }

    public static probe_tail(seq: number[]): number[] {
        if (seq == null) {
            return null;
        }

        seq[0] = EPars.RNABASE_GUANINE;
        seq[1] = EPars.RNABASE_GUANINE;

        let offset: number = seq.length - 20;
        for (let ii: number = 0; ii < 20; ii++) {
            seq[offset + ii] = EPars.RNABASE_LAST20[ii];
        }

        return seq;
    }

    public constructor(nid: number, puzname: string, puzzle_type: PuzzleType) {
        this._nid = nid;
        this._name = puzname;
        this._puzzle_type = puzzle_type;

        if (puzzle_type == PuzzleType.EXPERIMENTAL) {
            this._folder = FolderManager.instance.get_last_used_folder();
        } else {
            this._folder = Vienna.NAME;
        }
    }

    public get_node_id(): number {
        return this._nid;
    }

    public get_secstruct(index: number = 0): string {
        if (this._use_tails) {
            if (this._use_short_tails) {
                return ".." + this._secstructs[index] + "....................";
            } else {
                return "....." + this._secstructs[index] + "....................";
            }
        } else {
            return this._secstructs[index];
        }
    }

    public get_secstructs(index: number = 0): string[] {
        let secstructs: string[] = [];
        for (let ii: number = 0; ii < this._secstructs.length; ii++) {
            secstructs.push(this.get_secstruct(ii));
        }
        return secstructs;
    }

    public get_reward(): number {
        return this._reward;
    }

    public get_next_puzzle(): number {
        return this._next_puzzle;
    }

    public set_rscript(inText: string): void {
        this._rscript_ops = inText;
    }

    public get_rscript(): string {
        return this._rscript_ops;
    }

    public get_hint(): string {
        return this._hint;
    }

    public set_hint(txt: string): void {
        this._hint = txt;
    }

    public get_puzzle_name(linked: boolean = false): string {
        if (linked && this._puzzle_type != PuzzleType.EXPERIMENTAL) {
            let url: string = EternaURL.generate_url({page: "puzzle", nid: this._nid});
            return "<u><A HREF=\"" + url + "\" TARGET=\"_blank\">" + this._name + "</a></u>";
        }

        return this._name;
    }

    public get_puzzle_type(): PuzzleType {
        return this._puzzle_type;
    }

    public get_mission_text(): string {
        return this._mission_text;
    }

    public set_mission_text(text: string) {
        this._mission_text = text;
    }

    public get_folder(): string {
        return this._folder;
    }

    public get_target_conditions(): any[] {
        if (this._target_conditions == null) {
            let target_conditions: any[] = [];
            for (let ii: number = 0; ii < this._secstructs.length; ii++) {
                target_conditions.push(null);
            }
            return target_conditions;
        } else {
            return this._target_conditions;
        }
    }

    public get_constraints(): string[] {
        return this._constraints;
    }

    public get_temporary_constraints(): string[] {
        return this._temp_constraints;
    }

    /** Returns temporary_constraints, if they're set, else constraints */
    public get curConstraints(): string[] {
        return this.get_temporary_constraints() || this.get_constraints();
    }

    public get_puzzle_locks(): boolean[] {
        let puzlocks: boolean[];
        let ii: number;

        if (this._puzzle_locks == null && !this._use_tails) {
            puzlocks = [];
            for (ii = 0; ii < this._secstructs[0].length; ii++) {
                puzlocks.push(false);
            }
            return puzlocks;

        } else if (this._use_tails) {

            puzlocks = [];

            if (this._use_short_tails) {
                puzlocks.push(true);
                puzlocks.push(true);
            } else {
                puzlocks.push(true);
                puzlocks.push(true);
                puzlocks.push(true);
                puzlocks.push(true);
                puzlocks.push(true);
            }
            for (ii = 0; ii < this._secstructs[0].length; ii++) {
                if (this._puzzle_locks != null) {
                    puzlocks.push(this._puzzle_locks[ii]);
                } else {
                    puzlocks.push(false);
                }
            }

            for (ii = 0; ii < 20; ii++) {
                puzlocks.push(true);
            }
            return puzlocks;

        } else {

            return this._puzzle_locks.slice();
        }
    }

    public get_shift_limit(): number {
        return this._shift_limit;
    }

    public set_shift_limit(limit: number): void {
        this._shift_limit = limit;
    }

    public set_secstructs(secstructs: string[]): void {
        this._secstructs = secstructs.slice();
    }

    public has_target_type(tc_type: string): boolean {
        if (this._target_conditions == null) return false;
        for (let ii: number = 0; ii < this._target_conditions.length; ii++) {
            if (this._target_conditions[ii]['type'] == tc_type) {
                return true;
            }
        }
        return false;
    }

    public set_objective(objectives: any[]): void {
        this._target_conditions = objectives.slice();
        this._secstructs = [];
        let concentration: number;

        for (let ii: number = 0; ii < this._target_conditions.length; ii++) {
            if (this._target_conditions[ii]['secstruct'] == null) {
                throw new Error("Can't find secstruct from a target condition");
            }
            this._secstructs.push(this._target_conditions[ii]['secstruct']);

            let tc_type: string = this._target_conditions[ii]['type'];
            // Aptamers

            if (Puzzle.is_aptamer_type(tc_type) && this._target_conditions[ii]['site'] != null) {
                let binding_pairs: any[] = [];
                let binding_site: any[] = this._target_conditions[ii]['site'];
                let target_pairs: number[] = EPars.parenthesis_to_pair_array(this.get_secstruct(ii));

                for (let jj = 0; jj < binding_site.length; jj++) {
                    binding_pairs.push(target_pairs[binding_site[jj]]);
                }

                this._target_conditions[ii]['binding_pairs'] = binding_pairs;
                this._target_conditions[ii]['bonus'] = -0.6 * Math.log(this._target_conditions[ii]['concentration'] / 3) * 100;
            }

            // Simple oligos

            if (Puzzle.is_oligo_type(tc_type) && this._target_conditions[ii].hasOwnProperty('fold_mode') == false) {
                this._target_conditions[ii]['fold_mode'] = Pose2D.OLIGO_MODE_DIMER;
            }

            if (Puzzle.is_oligo_type(tc_type) && this._target_conditions[ii]['oligo_sequence'] != null) {
                concentration = 0;
                if (this._target_conditions[ii]['oligo_concentration'] != null) {
                    concentration = this._target_conditions[ii]['oligo_concentration'];
                } else {
                    concentration = 1.;
                }
                this._target_conditions[ii]['malus'] = -Constants.BOLTZMANN * (Constants.KELVIN_0C + 37) * Math.log(concentration);
            }

            // Multi-strands

            if (this._target_conditions[ii]['type'] == "multistrand") {
                let oligos: any[] = this._target_conditions[ii]['oligos'];
                for (let jj = 0; jj < oligos.length; jj++) {
                    concentration = 0;
                    if (oligos[jj]['concentration'] != null) {
                        concentration = oligos[jj]['concentration'];
                    } else {
                        concentration = 1.;
                    }
                    oligos[jj]['malus'] = -Constants.BOLTZMANN * (Constants.KELVIN_0C + 37) * Math.log(concentration);
                }
            }
        }
    }

    public set_reward(reward: number): void {
        this._reward = reward;
    }

    public set_folder(folder: string): void {
        this._folder = folder;
    }

    public set_next_puzzle(nex: number): void {
        this._next_puzzle = nex;
    }

    public set_puzzle_locks(locks: boolean[]): void {
        this._puzzle_locks = locks.slice();
    }

    public set_beginning_sequence(seq: string): void {
        this._beginning_sequence = EPars.string_to_sequence_array(seq);
    }

    public set_saved_sequence(seq: string): void {
        this._saved_sequence = EPars.string_to_sequence_array(seq);
    }

    public set_ui_specs(ui_spec: string[]): void {
        this._default_mode = "";
        this._use_modes = 0;

        for (let ii: number = 0; ii < ui_spec.length; ii++) {
            if (ui_spec[ii] == "NOMODES") {
                this._use_modes = Puzzle.BOOL_FALSE;
            } else if (ui_spec[ii] == "STARTSTATE") {
                this._default_mode = ui_spec[ii + 1];
                ii++;
            } else if (ui_spec[ii] == "NOTOOLS") {
                this._use_tools = Puzzle.BOOL_FALSE;
            } else if (ui_spec[ii] == "NOPALLETE") {
                this._use_pallete = Puzzle.BOOL_FALSE;
            }
        }
    }

    public set_boosters(obj: any): void {
        this._booster_defs = obj;
    }

    public get_boosters(): any {
        return this._booster_defs;
    }

    public get_beginning_sequence(index: number = 0): number[] {
        let seq: number[] = [];
        if (this._use_tails) {
            if (this._use_short_tails) {
                seq.push(EPars.RNABASE_GUANINE);
                seq.push(EPars.RNABASE_GUANINE);
            } else {
                seq.push(EPars.RNABASE_GUANINE);
                seq.push(EPars.RNABASE_GUANINE);
                seq.push(EPars.RNABASE_ADENINE);
                seq.push(EPars.RNABASE_ADENINE);
                seq.push(EPars.RNABASE_ADENINE);
            }
        }

        // FIXME: This needs revision, see PoseEditMode:2163
        let len: number = this._beginning_sequence != null ? this._beginning_sequence.length : this._secstructs[index].length;
        for (let ii: number = 0; ii < len; ii++) {
            if (this._beginning_sequence != null) {
                seq.push(this._beginning_sequence[ii]);
            } else {
                seq.push(EPars.RNABASE_ADENINE);
            }
        }

        if (this._use_tails) {
            for (let ii = 0; ii < 20; ii++) {
                seq.push(EPars.RNABASE_LAST20[ii]);
            }
        }

        return seq;
    }

    public get_saved_sequence(): number[] {
        return this._saved_sequence;
    }

    public get_barcode_indices(): number[] {
        if (!this._use_barcode) {
            return null;
        }

        let ii: number;

        let barcodes: number[] = [];
        let secstruct: string = this.get_secstruct();
        if (this._use_tails) {
            for (ii = secstruct.length - 39; ii < secstruct.length - 20; ii++) {
                barcodes.push(ii);
            }

        } else {
            for (ii = secstruct.length - 19; ii < secstruct.length; ii++) {
                barcodes.push(ii);
            }
        }
        return barcodes;
    }

    public get_subsequence_without_barcode(seq: any[]): any[] {
        if (!this._use_barcode) {
            return seq.slice();
        }
        let minus: number = 19;
        if (this._use_tails) {
            minus += 20;
        }

        return seq.slice(0, seq.length - minus);
    }

    public is_soft_constraint(): boolean {
        return this._is_soft_constraint;
    }

    public set_use_tails(use_tails: boolean, use_short_tails: boolean): void {
        this._use_tails = use_tails;
        this._use_short_tails = use_short_tails;
    }

    public set_use_barcode(use_barcode: boolean): void {
        this._use_barcode = use_barcode;
    }

    public set_constraints(constraints: string[]): void {
        this._constraints = [];
        let shapes: boolean[] = [];
        let antishapes: boolean[] = [];

        for (let ii = 0; ii < constraints.length; ii += 2) {
            if (constraints[ii] == ConstraintType.SHAPE) {
                shapes[Number(constraints[ii + 1])] = true;
            } else if (constraints[ii] == ConstraintType.ANTISHAPE) {
                antishapes[Number(constraints[ii + 1])] = true;
            }
        }

        for (let ii = shapes.length - 1; ii >= 0; ii--) {
            if (antishapes[ii]) {
                this._constraints.push(ConstraintType.ANTISHAPE);
                this._constraints.push("" + ii);
            }

            if (shapes[ii]) {
                this._constraints.push(ConstraintType.SHAPE);
                this._constraints.push("" + ii);
            }
        }

        for (let ii = 0; ii < constraints.length; ii += 2) {
            if (constraints[ii] != ConstraintType.SHAPE &&
                constraints[ii] != ConstraintType.SOFT &&
                constraints[ii] != ConstraintType.ANTISHAPE) {
                this._constraints.push(constraints[ii]);
                this._constraints.push(constraints[ii + 1]);

            } else if (constraints[ii] == ConstraintType.SOFT) {
                this._is_soft_constraint = true;
            }
        }
    }

    public set_temporary_constraints(constraints: string[]): void {
        if (constraints != null) {
            this._temp_constraints = constraints.slice();
        } else {
            this._temp_constraints = null;
        }
    }

    public set_round(round: number): void {
        this._round = round;
    }

    public get_current_round(): number {
        return this._round;
    }

    public set_num_submissions(num: number): void {
        this._num_submissions = num;
    }

    public get_num_submissions(): number {
        return this._num_submissions;
    }

    public get_use_barcode(): boolean {
        return this._use_barcode;
    }

    public is_undo_zoom_allowed(): boolean {
        if (this._use_tools != 0) {
            return this._use_tools == Puzzle.BOOL_TRUE;
        }

        return true;
    }

    public is_pair_brush_allowed(): boolean {
        let is_basic: boolean = (this._puzzle_type != PuzzleType.BASIC);
        let has_target: boolean = false;
        for (let ii: number = 0; ii < this._constraints.length; ii++) {
            if (this._constraints[ii] == ConstraintType.SHAPE) {
                has_target = true;
            }
        }

        return is_basic || has_target;
    }

    public are_modes_available(): boolean {
        if (this._use_modes != 0) {
            return this._use_modes == Puzzle.BOOL_TRUE;
        }
        return true;
    }

    public is_pallete_allowed(): boolean {
        if (this._use_pallete != 0) {
            return this._use_pallete == Puzzle.BOOL_TRUE;
        }
        return true;
    }

    public default_mode(): string {
        if (this._default_mode.length > 0) {
            return this._default_mode;
        }

        if (this._puzzle_type != PuzzleType.BASIC) {
            return "TARGET";
        } else {
            return "FROZEN";
        }
    }

    public set_default_mode(default_mode: string): void {
        this._default_mode = default_mode;
    }

    public is_using_tails(): boolean {
        return this._use_tails;
    }

    public transform_sequence(seq: number[], target_index: number): number[] {
        if (this._target_conditions != null) {
            if (this._target_conditions[target_index]['sequence'] != null) {
                let target_seq_temp: number[] = EPars.string_to_sequence_array(this._target_conditions[target_index]['sequence']);
                let target_seq: number[] = [];

                if (this._use_tails) {
                    if (this._use_short_tails) {
                        target_seq.push(EPars.RNABASE_GUANINE);
                        target_seq.push(EPars.RNABASE_GUANINE);
                    } else {
                        target_seq.push(EPars.RNABASE_GUANINE);
                        target_seq.push(EPars.RNABASE_GUANINE);
                        target_seq.push(EPars.RNABASE_ADENINE);
                        target_seq.push(EPars.RNABASE_ADENINE);
                        target_seq.push(EPars.RNABASE_ADENINE);
                    }

                }

                for (let ii: number = 0; ii < target_seq_temp.length; ii++) {
                    target_seq.push(target_seq_temp[ii]);
                }

                if (this._use_tails) {
                    for (let ii = 0; ii < 20; ii++) {
                        target_seq.push(EPars.RNABASE_LAST20[ii]);
                    }
                }

                let locks: boolean[] = this.get_puzzle_locks();

                if (locks.length != target_seq.length || target_seq.length != seq.length) {
                    throw new Error("lock length doesn't match object sequence");
                }

                for (let ii = 0; ii < target_seq.length; ii++) {
                    if (!locks[ii]) {
                        target_seq[ii] = seq[ii];
                    }
                }
                return target_seq;

            }
        }
        return seq;
    }

    private readonly _nid: number;
    private readonly _name: string;
    private readonly _puzzle_type: PuzzleType;
    private _secstructs: string[] = [];
    private _mission_text: string = Puzzle.DEFAULT_MISSION_TEXT;
    private _puzzle_locks: boolean[];
    private _shift_limit: number;
    private _beginning_sequence: number[];
    private _saved_sequence: number[];
    private _use_tails: boolean = false;
    private _use_short_tails: boolean = false;
    private _use_barcode: boolean = false;
    private _target_conditions: any[] = null;
    private _constraints: string[] = null;
    private _temp_constraints: string[];
    private _round: number = -1;
    private _num_submissions: number = 3;
    private _folder: string;
    private _reward: number = 0;
    private _rscript_ops: string = "";
    private _default_mode: string = "";
    private _use_tools: number = 0;
    private _use_pallete: number = 0;
    private _use_modes: number = 0;
    private _next_puzzle: number = -1;
    private _hint: string = null;
    private _is_soft_constraint: boolean = false;
    private _booster_defs: Object = null;

    private static readonly T_APTAMER: string[] = ["aptamer", "aptamer+oligo"];
    private static readonly T_OLIGO: string[] = ["oligo", "aptamer+oligo"];

    private static readonly BOOL_TRUE: number = 1;
    private static readonly BOOL_FALSE: number = 2;

    private static readonly DEFAULT_MISSION_TEXT: string = "Match the desired RNA shape!";
}

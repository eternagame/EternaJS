import {Eterna} from "../Eterna";
import {Feedback} from "../Feedback";

export class Solution {
    public constructor(nid: number, puzzle_nid: number) {
        this._nid = nid;
        this._puzzle_nid = puzzle_nid;
    }

    public set_sequence(sequence: string): void {
        this._sequence = sequence;
    }

    public set_title(title: string): void {
        this._title = title;

        let newlinereg: RegExp = /\n/g;
        this._title = this._title.replace(newlinereg, " ");
        newlinereg = /\r/g;
        this._title = this._title.replace(newlinereg, " ");
    }

    public set_num_pairs(gc: number, gu: number, ua: number): void {
        this._num_gcs = gc;
        this._num_gus = gu;
        this._num_uas = ua;
    }

    public set_free_energy(fe: number): void {
        this._free_energy = fe;
    }

    public set_melting_point(mp: number): void {
        this._melting_point = mp;
    }

    public set_round(round: number): void {
        this._round = round;
    }

    public set_num_votes(num_votes: number, num_my_votes: number): void {
        this._num_votes = num_votes;
        this._num_my_votes = num_my_votes;
    }

    public set_desc(desc: string): void {
        this._desc = desc;

        if (this._desc) {
            let newlinereg: RegExp = /\n/g;
            this._short_desc = this._desc.replace(newlinereg, " ");
            newlinereg = /\r/g;
            this._short_desc = this._short_desc.replace(newlinereg, " ");
        } else {
            this._short_desc = "No descrption available";
            this._desc = "No descrption available";
        }
    }

    public set_player(name: string, id: number): void {
        this._player_id = id;
        this._player_name = name;
    }

    public set_synthesis(round: number, score: number): void {
        this._synthesized_round = round;
        if (this._synthesized_round > 0) {
            this._synthesis_score = score;
        } else {
            this._synthesis_score = -1;
        }
    }

    public set_exp_feedback(fb: Feedback): void {
        this._exp_feedback = fb;
    }

    public set_fold_data_available(avail: boolean): void {
        this._has_fold_data = avail;
    }

    public set_fold_data(fd: any[]): void {
        this._fold_data = fd;
        if (this._fold_data != null) this._has_fold_data = true;
    }

    public get_title(): string {
        return this._title;
    }

    public get_node_id(): number {
        return this._nid;
    }

    public get_puzzle_nid(): number {
        return this._puzzle_nid;
    }

    public get_sequence(): string {
        return this._sequence;
    }

    public get_exp_feedback(): Feedback {
        return this._exp_feedback;
    }

    public get_player_id(): number {
        return this._player_id;
    }

    public get_player_name(): string {
        return this._player_name;
    }

    public get_full_description(): string {
        return this._desc;
    }

    public has_fold_data(): boolean {
        return this._has_fold_data;
    }

    public query_fold_data(): Promise<any[]> {
        if (this._has_fold_data) {
            if (this._fold_data != null) {
                return Promise.resolve(this._fold_data);
            } else {
                return Eterna.client.get_solution_info(this._nid).then((json) => {
                    let data: any = json['data'];
                    if (data['solution'] != null) {
                        this.set_fold_data(JSON.parse(data['solution']['fold-data']));
                    }

                    return this._fold_data;
                });
            }
        } else {
            return Promise.resolve(null);
        }
    }

    public get_property(keyword: string): any {
        if (keyword == "Title") {
            return this._title;
        } else if (keyword == "GU Pairs") {
            return this._num_gus;
        } else if (keyword == "GC Pairs") {
            return this._num_gcs;
        } else if (keyword == "UA Pairs") {
            return this._num_uas;
        } else if (keyword == "Melting Point") {
            return this._melting_point;
        } else if (keyword == "Designer") {
            return this._player_name;
        } else if (keyword == "Sequence") {
            return this._sequence;
        } else if (keyword == "Free Energy") {
            return this._free_energy;
        } else if (keyword == "Description") {
            return this._short_desc;
        } else if (keyword == "Round") {
            return this._round;
        } else if (keyword == "Votes") {
            if (this._synthesized_round) {
                return -1;
            }
            return this._num_votes;
        } else if (keyword == "My Votes") {
            if (this._synthesized_round) {
                return -1;
            }
            return this._num_my_votes;
        } else if (keyword == "Synthesized") {
            if (this._synthesized_round > 0) {
                return "y";
            } else {
                return "n";
            }
        } else if (keyword == "Synthesis score") {
            if (this._exp_feedback != null && this._exp_feedback.get_shape_data() != null) {
                return this._synthesis_score;
            } else if (this._exp_feedback != null && this._exp_feedback.is_failed() != 0) {
                return this._exp_feedback.is_failed();
            } else {
                return Feedback.EXPCODES[Feedback.EXPSTRINGS.indexOf("NOT SYNTHESIZED")];
            }
        } else if (keyword == "Id") {
            return this._nid;
        }

        throw new Error("Undefiend solution property " + keyword);
    }

    private readonly _nid: number;
    private readonly _puzzle_nid: number;

    private _sequence: string;
    private _title: string;
    private _player_id: number = -1;
    private _player_name: string = "";
    private _num_gus: number;
    private _num_gcs: number;
    private _num_uas: number;
    private _melting_point: number = -1;
    private _free_energy: number;
    private _desc: string;
    private _round: number;
    private _num_votes: number = 0;
    private _num_my_votes: number = 0;
    private _synthesized_round: number = 0;
    private _synthesis_score: number = 0;
    private _exp_feedback: Feedback;
    private _short_desc: string;
    private _has_fold_data: boolean = false;
    private _fold_data: any[] = null;
}

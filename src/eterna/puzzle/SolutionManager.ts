import {EPars} from "../EPars";
import {Eterna} from "../Eterna";
import {Feedback} from "../Feedback";
import {CSVParser} from "../util/CSVParser";
import {Solution} from "./Solution";

export class SolutionManager {
    public static get instance(): SolutionManager {
        if (SolutionManager._instance == null) {
            SolutionManager._instance = new SolutionManager;
        }
        return SolutionManager._instance;
    }

    public get_solutions_by_puzzle_nid(puznid: number): Promise<Solution[]> {
        return Eterna.client.get_solutions(puznid).then((json) => {
            let data: any = json['data'];
            let solutions: any[] = data['solutions'];
            this._solutions = [];

            for (let ii: number = 0; ii < solutions.length; ii++) {
                this._solutions.push(SolutionManager.process_data(solutions[ii]));
            }

            return this._solutions;
        });
    }

    public get_solutions(): any[] {
        return this._solutions;
    }

    public get_solution_by_sequence(seq: string): Solution {
        for (let ii: number = 0; ii < this._solutions.length; ii++) {
            if (this._solutions[ii].get_sequence() == seq) {
                return this._solutions[ii];
            }
        }

        return null;
    }

    public add_hairpins(hairpins: any[]): void {
        if (hairpins == null)
            return;
        for (let ii: number = 0; ii < hairpins.length; ii++) {
            this._hairpins.push(hairpins[ii]);
        }
    }

    public check_redundancy_by_hairpin(seq: string): boolean {
        let hairpin: string = EPars.get_barcode_hairpin(seq);
        if (hairpin == null)
            return true;

        for (let ii: number = 0; ii < this._hairpins.length; ii++)
            if (this._hairpins[ii] == hairpin) {
                return true;
            }
        return false;
    }

    public my_current_solutions(round: number): any[] {
        let titles: any[] = [];
        let myid: number = Eterna.player_id;
        for (let ii: number = 0; ii < this._solutions.length; ii++) {
            if (this._solutions[ii].get_property("Round") == round && this._solutions[ii].get_player_id() == myid) {
                titles.push(this._solutions[ii].get_title());
            }
        }

        return titles;
    }

    private static process_data(obj: any): Solution {
        let newsol: Solution = new Solution(obj["id"], obj["puznid"]);
        newsol.set_sequence(obj["sequence"]);
        newsol.set_title(obj["title"]);

        let newfb: Feedback = null;

        let player_name: string = "";
        let player_id: number = -1;

        if (obj["name"] != null) {
            player_name = obj["name"];
        }

        if (obj["uid"] != null) {
            player_id = obj["uid"];
        }

        newsol.set_player(player_name, player_id);
        newsol.set_num_pairs(obj["gc"], obj["gu"], obj["au"]);
        newsol.set_melting_point(obj["meltpoint"]);
        newsol.set_free_energy(obj["energy"]);
        newsol.set_desc(obj["body"]);
        newsol.set_round(obj["submitted-round"]);
        newsol.set_synthesis(obj["synthesis-round"], obj["synthesis-score"]);

        if (obj["synthesis-data"] && obj["synthesis-data"].length > 0) {
            let synthesis_data_raw: any = JSON.parse(obj["synthesis-data"]);
            if (Array.isArray(synthesis_data_raw)) {
                let synthesis_data: any[] = synthesis_data_raw;

                for (let ii: number = 0; ii < synthesis_data.length; ii++) {
                    let synthesis: any = synthesis_data[ii];
                    if (synthesis['reactive'] == "SHAPE") {
                        let peaks: any[] = [];
                        peaks.push(synthesis['start_index']);

                        for (let ss: number = 0; ss < synthesis['peaks'].length; ss++) {
                            peaks.push(synthesis['peaks'][ss]);
                        }

                        if (newfb == null) {
                            newfb = new Feedback;
                        }

                        newfb.set_shape_data(peaks, synthesis['target_index'], synthesis['threshold'], synthesis['max'], synthesis['min'], null);
                    }
                }
                /// Ad-hoc handling for different exp types : Brent's theophylline puzzle
            } else if (synthesis_data_raw['type'] == "brent_theo") {
                if (newfb == null) {
                    newfb = new Feedback;
                }
                newfb.set_brent_theo_data(synthesis_data_raw);

            }
        } else if (obj["SHAPE"] != null && obj["SHAPE"].length > 0) {
            if (newfb == null) {
                newfb = new Feedback;
            }

            if (Feedback.EXPSTRINGS.indexOf(obj["SHAPE"]) >= 0) {
                newfb.set_shape_data(null, 0, null, null, null, obj["SHAPE"]);
            } else {
                let shape_array: any[] = CSVParser.parse_into_array(obj["SHAPE"]);
                for (let kk: number = 0; kk < shape_array.length; kk++) {
                    shape_array[kk] = Number(shape_array[kk]);
                }

                let max: Object = null;
                let min: Object = null;
                let threshold: Object = null;

                if (obj["SHAPE-threshold"] != null && obj["SHAPE-threshold"] != "") {
                    threshold = (obj["SHAPE-threshold"]);
                }

                if (obj["SHAPE-max"] != null && obj["SHAPE-max"] != "") {
                    max = (obj["SHAPE-max"]);
                }

                if (obj["SHAPE-min"] != null && obj["SHAPE-min"] != "") {
                    min = (obj["SHAPE-min"]);
                }

                newfb.set_shape_data(shape_array, 0, threshold, max, min, null);
            }
        }

        newsol.set_player(player_name, player_id);
        newsol.set_exp_feedback(newfb);

        if (obj["has-fold-data"] != null) {
            newsol.set_fold_data_available(obj["has-fold-data"] != 0);
        }

        if (obj["fold-data"] != null) {
            newsol.set_fold_data(JSON.parse(obj["fold-data"]));
        }

        return newsol;
    }

    private _solutions: Solution[] = [];
    private _hairpins: any[] = [];

    private static _instance: SolutionManager;
}

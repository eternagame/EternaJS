import * as log from "loglevel";
import {Eterna} from "../Eterna";
import {CSVParser} from "../util/CSVParser";
import {Puzzle} from "./Puzzle";
import {SolutionManager} from "./SolutionManager";

export class PuzzleManager {
    public static get instance(): PuzzleManager {
        if (PuzzleManager._instance == null) {
            PuzzleManager._instance = new PuzzleManager;
        }
        return PuzzleManager._instance;
    }

    public parse_puzzle(json: any): Puzzle {
        let newpuz: Puzzle = new Puzzle(Number(json["id"]), json["title"], json["type"]);

        if (json["body"]) {
            // Convention: mission texts are encapsulated by
            // <span id="mission"> ... </span>
            // This allows to reuse existing descriptions, just insert the span element where appropriate
            // Or one can add a new mission statement, and HTML-hide it if necessary using <!-- ... -->

            let res: RegExpExecArray = PuzzleManager.RE_MISSION_TEXT.exec(json["body"]);
            if (res != null && res.length >= 2) {
                newpuz.set_mission_text(res[1]);
            }
        }

        if (json["locks"] && json["locks"].length > 0) {
            let lock_str: string = json["locks"];
            let locks: boolean[] = [];

            for (let kk = 0; kk < lock_str.length; kk++) {
                locks.push(lock_str.charAt(kk) == "x");
            }
            newpuz.set_puzzle_locks(locks);
        }

        if (json['objective']) {
            let objective: any = JSON.parse(json['objective'])[0];
            if (objective["shift_limit"]) {
                newpuz.set_shift_limit(objective["shift_limit"]);
            } else {
                newpuz.set_shift_limit(0);
            }
        }

        if (json["beginseq"] && json["beginseq"].length > 0) {
            if (json["beginseq"].length != json["secstruct"].length) {
                throw new Error("Beginning sequence length doesn't match pair length for puzzle " + json["Title"]);
            }
            newpuz.set_beginning_sequence(json["beginseq"]);
        }

        if (json["saved_sequence"] && json["saved_sequence"].length > 0) {
            if (json["saved_sequence"].length == json["secstruct"].length && json["type"] == "Challenge") {
                newpuz.set_saved_sequence(json["saved_sequence"]);
            }
        }

        newpuz.set_use_tails(Boolean(json["usetails"]), Number(json["usetails"]) == 2);

        if (json["folder"] && json["folder"].length > 0) {
            newpuz.set_folder(json["folder"]);
        }

        if (json["reward"] && json["reward"].length > 0) {
            newpuz.set_reward(Number(json["reward"]));
        }
        if (json["ui-specs"]) {
            // New style UI elements (scripted) are identified as JSON objects
            if (json["ui-specs"].substr(0, 1) == "{")
                newpuz.set_boosters(JSON.parse(json["ui-specs"]));
            else
            // Fallback for the old tutorials
                newpuz.set_ui_specs(json["ui-specs"].split(","));
        }

        if (json['next-puzzle']) {
            newpuz.set_next_puzzle(Number(json['next-puzzle']));
        }

        if (json["last-round"] != null) {
            newpuz.set_round(Number(json["last-round"]) + 1);
        }

        if (json["objective"] && json["objective"].length > 0) {
            newpuz.set_objective(JSON.parse(json["objective"]));
        } else {
            newpuz.set_secstructs([json["secstruct"]]);
        }
        if (json["check_hairpin"] && Number(json["check_hairpin"])) {
            newpuz.set_use_barcode(true);
        }
        if (json["num-submissions"] != null) {
            newpuz.set_num_submissions(Number(json["num-submissions"]));
        }

        if (json["eterna.rscript"]) {
            newpuz.set_rscript(json["eterna.rscript"]);
        }

        if (json["events"]) {
            newpuz.set_rscript(json["events"]);
        }

        if (json["hint"]) {
            newpuz.set_hint(json["hint"]);
        }

        if (newpuz.get_node_id() == 877668) {
            newpuz.set_objective(JSON.parse(PuzzleManager.OBJECTIVE_877668));
        } else if (newpuz.get_node_id() == 885046) {
            newpuz.set_objective(JSON.parse(PuzzleManager.OBJECTIVE_885046));
        } else if (newpuz.get_node_id() == 1420804) {
            newpuz.set_objective(JSON.parse(PuzzleManager.OBJECTIVE_1420804));
        }

        let target_conditions: any[] = newpuz.get_target_conditions();
        if (target_conditions != null) {
            for (let ii = 0; ii < target_conditions.length; ii++) {
                if (target_conditions[ii] != null) {
                    let constrained_bases: any[] = target_conditions[ii]['structure_constrained_bases'];
                    if (constrained_bases != null) {
                        if (constrained_bases.length % 2 == 0) {
                            target_conditions[ii]['structure_constraints'] = [];
                            for (let jj = 0; jj < target_conditions[ii]['secstruct'].length; jj++)
                                target_conditions[ii]['structure_constraints'][jj] = false;

                            for (let jj = 0; jj < constrained_bases.length; jj += 2) {
                                for (let kk = constrained_bases[jj]; kk <= constrained_bases[jj + 1]; kk++) {
                                    target_conditions[ii]['structure_constraints'][kk] = true;
                                }
                            }
                        }
                    }

                    let anti_constrained_bases: any[] = target_conditions[ii]['anti_structure_constrained_bases'];
                    if (anti_constrained_bases != null) {
                        if (target_conditions[ii]['anti_secstruct'] != null && target_conditions[ii]['anti_secstruct'].length == target_conditions[ii]['secstruct'].length) {
                            if (anti_constrained_bases.length % 2 == 0) {
                                target_conditions[ii]['anti_structure_constraints'] = [];
                                for (let jj = 0; jj < target_conditions[ii]['secstruct'].length; jj++)
                                    target_conditions[ii]['anti_structure_constraints'][jj] = false;

                                for (let jj = 0; jj < anti_constrained_bases.length; jj += 2) {
                                    for (let kk = anti_constrained_bases[jj]; kk <= anti_constrained_bases[jj + 1]; kk++) {
                                        target_conditions[ii]['anti_structure_constraints'][kk] = true;
                                    }
                                }
                            }
                        }
                    }
                }
            }

        }

        if (json["constraints"] && json["constraints"].length > 0) {
            let constraints: string[] = CSVParser.parse_into_array(json["constraints"]);
            if (json["check_hairpin"] && Number(json["check_hairpin"])) {
                constraints.push("BARCODE");
                constraints.push("0");
            }
            newpuz.set_constraints(constraints);
        } else if (json["check_hairpin"] && Number(json["check_hairpin"])) {
            newpuz.set_constraints(["BARCODE", "0"]);
        }

        let replace: boolean = false;

        for (let jj = 0; jj < this._puzzles.length; jj++) {
            if (newpuz.get_node_id() == this._puzzles[jj].get_node_id()) {
                this._puzzles[jj] = newpuz;
                replace = true;
                break;
            }
        }

        if (!replace) {
            this._puzzles.push(newpuz);
        }

        return newpuz;
    }

    public get_puzzle_by_nid(puznid: number, scriptid: number = -1): Promise<Puzzle> {
        for (let ii: number = 0; ii < this._puzzles.length; ii++) {
            if (this._puzzles[ii].get_node_id() == puznid) {
                return Promise.resolve(this._puzzles[ii]);
            }
        }

        log.info(`Loading puzzle [nid=${puznid}, scriptid=${scriptid}...]`);
        return Eterna.client.get_puzzle(puznid, scriptid)
            .then((json: any) => {
                let data: any = json['data'];
                if (data['hairpins']) {
                    SolutionManager.instance.add_hairpins(data['hairpins']);
                }

                let puzzle = this.parse_puzzle(data["puzzle"]);
                log.info(`Loaded puzzle [name=${puzzle.get_puzzle_name()}]`);
                return puzzle;
            });
    }

    private _puzzles: Puzzle[] = [];

    private static _instance: PuzzleManager;

    private static readonly OBJECTIVE_877668: string = '[{"type":"single","secstruct":".....................(((((............)))))"},{"type":"aptamer","site":[2,3,4,5,6,7,8,9,18,19,20,21,22,23,24],"concentration":100,"secstruct":"(((......(((....))).....)))................"}]';
    private static readonly OBJECTIVE_885046: string = '[{"type":"single","secstruct":".....................(((((((............)))))))"},{"type":"aptamer","site":[8,9,10,11,12,13,14,15,26,27,28,29,30,31,32],"concentration":10000,"secstruct":"((((......((((....)))).....))))................"}]';
    private static readonly OBJECTIVE_1420804: string = '[{"type":"single","secstruct":".....................(((((((............)))))))........"},{"type":"aptamer","site":[12,13,14,15,16,17,18,19,33,34,35,36,37,38,39],"concentration":10000,"secstruct":"..(((.((......(((((....)).))).....)))))................"}]';

    private static readonly RE_MISSION_TEXT: RegExp = /<span id="mission">(.*?)<\/span>/s;
}

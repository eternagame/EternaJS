import * as log from "loglevel";
import {Eterna} from "../Eterna";
import {CSVParser} from "../util/CSVParser";
import {Puzzle} from "./Puzzle";
import {SolutionManager} from "./SolutionManager";

export class PuzzleManager {
    public static get instance(): PuzzleManager {
        if (PuzzleManager._instance == null) {
            PuzzleManager._instance = new PuzzleManager();
        }
        return PuzzleManager._instance;
    }

    public parsePuzzle(json: any): Puzzle {
        let newpuz: Puzzle = new Puzzle(Number(json["id"]), json["title"], json["type"]);

        if (json["body"]) {
            // Convention: mission texts are encapsulated by
            // <span id="mission"> ... </span>
            // This allows to reuse existing descriptions, just insert the span element where appropriate
            // Or one can add a new mission statement, and HTML-hide it if necessary using <!-- ... -->

            let res: RegExpExecArray = PuzzleManager.RE_MISSION_TEXT.exec(json["body"]);
            if (res != null && res.length >= 2) {
                newpuz.missionText = res[1];
            }
        }

        if (json["locks"] && json["locks"].length > 0) {
            let lock_str: string = json["locks"];
            let locks: boolean[] = [];

            for (let kk = 0; kk < lock_str.length; kk++) {
                locks.push(lock_str.charAt(kk) === "x");
            }
            newpuz.puzzleLocks = locks;
        }

        if (json["objective"]) {
            let objective: any = JSON.parse(json["objective"])[0];
            if (objective["shift_limit"]) {
                newpuz.shiftLimit = objective["shift_limit"];
            } else {
                newpuz.shiftLimit = 0;
            }
        }

        if (json["beginseq"] && json["beginseq"].length > 0) {
            if (json["beginseq"].length !== json["secstruct"].length) {
                throw new Error(`Beginning sequence length doesn't match pair length for puzzle ${json["Title"]}`);
            }
            newpuz.beginningSequence = json["beginseq"];
        }

        if (json["saved_sequence"] && json["saved_sequence"].length > 0) {
            if (json["saved_sequence"].length === json["secstruct"].length && json["type"] === "Challenge") {
                newpuz.savedSequenceString = json["saved_sequence"];
            }
        }

        let usetails: number = Number(json["usetails"]);
        newpuz.setUseTails(usetails > 0, usetails === 2);

        if (json["folder"] && json["folder"].length > 0) {
            newpuz.folderName = json["folder"];
        }

        if (json["reward"] && json["reward"].length > 0) {
            newpuz.reward = Number(json["reward"]);
        }

        if (json["ui-specs"]) {
            // New style UI elements (scripted) are identified as JSON objects
            if (json["ui-specs"].substr(0, 1) === "{") {
                newpuz.boosters = JSON.parse(json["ui-specs"]);
            } else {
                // Fallback for the old tutorials
                newpuz.uiSpecs = json["ui-specs"].split(",");
            }
        }

        if (json["next-puzzle"]) {
            newpuz.nextPuzzleID = Number(json["next-puzzle"]);
        }

        if (json["last-round"] != null) {
            newpuz.round = Number(json["last-round"]) + 1;
        }

        if (json["objective"] && json["objective"].length > 0) {
            newpuz.objective = JSON.parse(json["objective"]);
        } else {
            newpuz.secstructs = [json["secstruct"]];
        }

        if (json["check_hairpin"] && Number(json["check_hairpin"])) {
            newpuz.useBarcode = true;
        }

        if (json["num-submissions"] != null) {
            newpuz.numSubmissions = Number(json["num-submissions"]);
        }

        if (json["rscript"]) {
            newpuz.rscript = json["rscript"];
        }

        if (json["events"]) {
            newpuz.rscript = json["events"];
        }

        if (json["hint"]) {
            newpuz.hint = json["hint"];
        }

        if (newpuz.nodeID === 877668) {
            newpuz.objective =JSON.parse(PuzzleManager.OBJECTIVE_877668);
        } else if (newpuz.nodeID === 885046) {
            newpuz.objective =JSON.parse(PuzzleManager.OBJECTIVE_885046);
        } else if (newpuz.nodeID === 1420804) {
            newpuz.objective =JSON.parse(PuzzleManager.OBJECTIVE_1420804);
        }

        let target_conditions: any[] = newpuz.targetConditions;
        if (target_conditions != null) {
            for (let ii = 0; ii < target_conditions.length; ii++) {
                if (target_conditions[ii] != null) {
                    let constrained_bases: any[] = target_conditions[ii]["structure_constrained_bases"];
                    if (constrained_bases != null) {
                        if (constrained_bases.length % 2 === 0) {
                            target_conditions[ii]["structure_constraints"] = [];
                            for (let jj = 0; jj < target_conditions[ii]["secstruct"].length; jj++) target_conditions[ii]["structure_constraints"][jj] = false;

                            for (let jj = 0; jj < constrained_bases.length; jj += 2) {
                                for (let kk = constrained_bases[jj]; kk <= constrained_bases[jj + 1]; kk++) {
                                    target_conditions[ii]["structure_constraints"][kk] = true;
                                }
                            }
                        }
                    }

                    let anti_constrained_bases: any[] = target_conditions[ii]["anti_structure_constrained_bases"];
                    if (anti_constrained_bases != null) {
                        if (target_conditions[ii]["anti_secstruct"] != null && target_conditions[ii]["anti_secstruct"].length === target_conditions[ii]["secstruct"].length) {
                            if (anti_constrained_bases.length % 2 === 0) {
                                target_conditions[ii]["anti_structure_constraints"] = [];
                                for (let jj = 0; jj < target_conditions[ii]["secstruct"].length; jj++) target_conditions[ii]["anti_structure_constraints"][jj] = false;

                                for (let jj = 0; jj < anti_constrained_bases.length; jj += 2) {
                                    for (let kk = anti_constrained_bases[jj]; kk <= anti_constrained_bases[jj + 1]; kk++) {
                                        target_conditions[ii]["anti_structure_constraints"][kk] = true;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if (json["constraints"] && json["constraints"].length > 0) {
            let constraints: string[] = CSVParser.splitOnComma(json["constraints"]);
            if (json["check_hairpin"] && Number(json["check_hairpin"])) {
                constraints.push("BARCODE");
                constraints.push("0");
            }
            newpuz.constraints = constraints;
        } else if (json["check_hairpin"] && Number(json["check_hairpin"])) {
            newpuz.constraints = ["BARCODE", "0"];
        }

        let replace: boolean = false;

        for (let jj = 0; jj < this._puzzles.length; jj++) {
            if (newpuz.nodeID === this._puzzles[jj].nodeID) {
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

    public getPuzzleByID(puznid: number, scriptid: number = -1): Promise<Puzzle> {
        for (let puzzle of this._puzzles) {
            if (puzzle.nodeID == puznid) {
                return Promise.resolve(puzzle);
            }
        }

        log.info(`Loading puzzle [nid=${puznid}, scriptid=${scriptid}...]`);
        return Eterna.client.getPuzzle(puznid, scriptid)
            .then((json: any) => {
                let data: any = json["data"];
                if (data["hairpins"]) {
                    SolutionManager.instance.addHairpins(data["hairpins"]);
                }

                let puzzle = this.parsePuzzle(data["puzzle"]);
                log.info(`Loaded puzzle [name=${puzzle.getPuzzleName()}]`);
                return puzzle;
            });
    }

    private _puzzles: Puzzle[] = [];

    private static _instance: PuzzleManager;

    private static readonly OBJECTIVE_877668 = "[{\"type\":\"single\",\"secstruct\":\".....................(((((............)))))\"},{\"type\":\"aptamer\",\"site\":[2,3,4,5,6,7,8,9,18,19,20,21,22,23,24],\"concentration\":100,\"secstruct\":\"(((......(((....))).....)))................\"}]";
    private static readonly OBJECTIVE_885046 = "[{\"type\":\"single\",\"secstruct\":\".....................(((((((............)))))))\"},{\"type\":\"aptamer\",\"site\":[8,9,10,11,12,13,14,15,26,27,28,29,30,31,32],\"concentration\":10000,\"secstruct\":\"((((......((((....)))).....))))................\"}]";
    private static readonly OBJECTIVE_1420804 = "[{\"type\":\"single\",\"secstruct\":\".....................(((((((............)))))))........\"},{\"type\":\"aptamer\",\"site\":[12,13,14,15,16,17,18,19,33,34,35,36,37,38,39],\"concentration\":10000,\"secstruct\":\"..(((.((......(((((....)).))).....)))))................\"}]";

    private static readonly RE_MISSION_TEXT = /<span id="mission">(.*?)<\/span>/s;
}

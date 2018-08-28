import {EPars} from "../EPars";
import {Eterna} from "../Eterna";
import {Feedback} from "../Feedback";
import {CSVParser} from "../util/CSVParser";
import {Solution} from "./Solution";

export class SolutionManager {
    public static get instance(): SolutionManager {
        if (SolutionManager._instance == null) {
            SolutionManager._instance = new SolutionManager();
        }
        return SolutionManager._instance;
    }

    public getSolutionsByPuzzleNid(puznid: number): Promise<Solution[]> {
        return Eterna.client.getSolutions(puznid).then((json) => {
            let data: any = json["data"];
            let solutions: any[] = data["solutions"];
            this._solutions = [];

            for (let ii: number = 0; ii < solutions.length; ii++) {
                this._solutions.push(SolutionManager.processData(solutions[ii]));
            }

            return this._solutions;
        });
    }

    public get solutions(): Solution[] {
        return this._solutions;
    }

    public getSolutionBySequence(seq: string): Solution {
        for (let solution of this._solutions) {
            if (solution.sequence === seq) {
                return solution;
            }
        }

        return null;
    }

    public addHairpins(hairpins: string[]): void {
        if (hairpins == null) {
            return;
        }

        for (let hairpin of hairpins) {
            this._hairpins.push(hairpin);
        }
    }

    public checkRedundancyByHairpin(seq: string): boolean {
        let seqHairpin: string = EPars.getBarcodeHairpin(seq);
        if (seqHairpin == null) {
            return true;
        }

        for (let hairpin of this._hairpins) {
            if (hairpin === seqHairpin) {
                return true;
            }
        }
        return false;
    }

    public myCurrentSolutions(round: number): string[] {
        let titles: string[] = [];
        for (let solution of this._solutions) {
            if (solution.getProperty("Round") === round && solution.playerID === Eterna.playerID) {
                titles.push(solution.title);
            }
        }

        return titles;
    }

    private static processData(obj: any): Solution {
        let newsol: Solution = new Solution(obj["id"], obj["puznid"]);
        newsol.sequence = obj["sequence"];
        newsol.title = obj["title"];

        let newfb: Feedback = null;

        let player_name: string = "";
        let player_id: number = -1;

        if (obj["name"] != null) {
            player_name = obj["name"];
        }

        if (obj["uid"] != null) {
            player_id = obj["uid"];
        }

        newsol.setPlayer(player_name, player_id);
        newsol.setNumPairs(obj["gc"], obj["gu"], obj["au"]);
        newsol.meltingPoint(obj["meltpoint"]);
        newsol.freeEnergy = obj["energy"];
        newsol.desc = obj["body"];
        newsol.round = obj["submitted-round"];
        newsol.setSynthesis(obj["synthesis-round"], obj["synthesis-score"]);

        if (obj["synthesis-data"] && obj["synthesis-data"].length > 0) {
            let synthesis_data_raw: any = JSON.parse(obj["synthesis-data"]);
            if (Array.isArray(synthesis_data_raw)) {
                let synthesis_data: any[] = synthesis_data_raw;

                for (let ii: number = 0; ii < synthesis_data.length; ii++) {
                    let synthesis: any = synthesis_data[ii];
                    if (synthesis["reactive"] === "SHAPE") {
                        let peaks: any[] = [];
                        peaks.push(synthesis["start_index"]);

                        for (let ss: number = 0; ss < synthesis["peaks"].length; ss++) {
                            peaks.push(synthesis["peaks"][ss]);
                        }

                        if (newfb == null) {
                            newfb = new Feedback();
                        }

                        newfb.setShapeData(peaks, synthesis["target_index"], synthesis["threshold"], synthesis["max"], synthesis["min"], null);
                    }
                }
                // / Ad-hoc handling for different exp types : Brent's theophylline puzzle
            } else if (synthesis_data_raw["type"] === "brent_theo") {
                if (newfb == null) {
                    newfb = new Feedback();
                }
                newfb.brentTheoData(synthesis_data_raw);
            }
        } else if (obj["SHAPE"] != null && obj["SHAPE"].length > 0) {
            if (newfb == null) {
                newfb = new Feedback();
            }

            if (Feedback.EXPSTRINGS.indexOf(obj["SHAPE"]) >= 0) {
                newfb.setShapeData(null, 0, null, null, null, obj["SHAPE"]);
            } else {
                let shape_array: any[] = CSVParser.splitOnComma(obj["SHAPE"]);
                for (let kk: number = 0; kk < shape_array.length; kk++) {
                    shape_array[kk] = Number(shape_array[kk]);
                }

                let max: any = null;
                let min: any = null;
                let threshold: any = null;

                if (obj["SHAPE-threshold"] != null && obj["SHAPE-threshold"] !== "") {
                    threshold = (obj["SHAPE-threshold"]);
                }

                if (obj["SHAPE-max"] != null && obj["SHAPE-max"] !== "") {
                    max = (obj["SHAPE-max"]);
                }

                if (obj["SHAPE-min"] != null && obj["SHAPE-min"] !== "") {
                    min = (obj["SHAPE-min"]);
                }

                newfb.setShapeData(shape_array, 0, threshold, max, min, null);
            }
        }

        newsol.setPlayer(player_name, player_id);
        newsol.expFeedback = newfb;

        if (obj["has-fold-data"] != null) {
            newsol.hasFoldData = obj["has-fold-data"] !== 0;
        }

        if (obj["fold-data"] != null) {
            newsol.foldData = JSON.parse(obj["fold-data"]);
        }

        return newsol;
    }

    private _solutions: Solution[] = [];
    private _hairpins: string[] = [];

    private static _instance: SolutionManager;
}

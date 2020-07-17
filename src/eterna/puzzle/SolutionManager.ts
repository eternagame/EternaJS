import * as log from 'loglevel';
import EPars from 'eterna/EPars';
import Eterna from 'eterna/Eterna';
import Feedback from 'eterna/Feedback';
import Solution from './Solution';

export default class SolutionManager {
    public static get instance(): SolutionManager {
        if (SolutionManager._instance == null) {
            SolutionManager._instance = new SolutionManager();
        }
        return SolutionManager._instance;
    }

    public getSolutionsForPuzzle(puzzleID: number): Promise<Solution[]> {
        log.info(`Loading solutions for puzzle ${puzzleID}...`);
        return Eterna.client.getSolutions(puzzleID).then((json) => {
            let solutionsData = json['data']['solutions'];
            this._solutions = [];

            for (let solution of solutionsData) {
                this._solutions.push(SolutionManager.processData(solution));
            }

            return this._solutions;
        });
    }

    public get solutions(): Solution[] {
        return this._solutions;
    }

    public getSolutionBySequence(seq: string): Solution | null {
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
        let seqHairpin: string | null = EPars.getBarcodeHairpin(seq);
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

    public getMyCurrentSolutionTitles(round: number): string[] {
        let titles: string[] = [];
        for (let solution of this._solutions) {
            if (solution.getProperty('Round') === round && solution.playerID === Eterna.playerID) {
                titles.push(solution.title);
            }
        }

        return titles;
    }

    private static processData(obj: any): Solution {
        let newsol: Solution = new Solution(Number(obj['id']), Number(obj['puznid']));
        newsol.sequence = obj['sequence'];
        newsol.title = obj['title'];

        let newfb: Feedback | null = null;

        let playerName = '';
        let playerID = -1;

        if (obj['name'] != null) {
            playerName = obj['name'];
        }

        if (obj['uid'] != null) {
            playerID = Number(obj['uid']);
        }

        newsol.setPlayer(playerName, playerID);
        newsol.setNumPairs(Number(obj['gc']), Number(obj['gu']), Number(obj['au']));
        newsol.meltingPoint(Number(obj['meltpoint']));
        newsol.freeEnergy = Number(obj['energy']);
        newsol.desc = obj['body'];
        newsol.round = Number(obj['submitted-round']);
        newsol.setSynthesis(Number(obj['synthesis-round']), Number(obj['synthesis-score']));

        if (obj['synthesis-data'] && obj['synthesis-data'].length > 0) {
            let synthesisDataRaw: any = JSON.parse(obj['synthesis-data']);
            if (Array.isArray(synthesisDataRaw)) {
                let synthesisData: any[] = synthesisDataRaw;

                for (let ii = 0; ii < synthesisData.length; ii++) {
                    let synthesis: any = synthesisData[ii];
                    if (synthesis['reactive'] === 'SHAPE') {
                        let peaks: number[] = [];
                        peaks.push(Number(synthesis['start_index']));

                        for (let ss = 0; ss < synthesis['peaks'].length; ss++) {
                            peaks.push(Number(synthesis['peaks'][ss]));
                        }

                        if (newfb == null) {
                            newfb = new Feedback();
                        }

                        newfb.setShapeData(
                            peaks,
                            Number(synthesis['target_index']),
                            Number(synthesis['threshold']),
                            Number(synthesis['max']),
                            Number(synthesis['min']),
                            null
                        );
                    }
                }
                // / Ad-hoc handling for different exp types : Brent's theophylline puzzle
            } else if (synthesisDataRaw['type'] === 'brent_theo') {
                if (newfb == null) {
                    newfb = new Feedback();
                }
                newfb.brentTheoData(synthesisDataRaw);
            }
        } else if (obj['SHAPE'] != null && obj['SHAPE'].length > 0) {
            if (newfb == null) {
                newfb = new Feedback();
            }

            if (Feedback.EXPSTRINGS.indexOf(obj['SHAPE']) >= 0) {
                newfb.setShapeData(null, 0, null, null, null, obj['SHAPE']);
            } else {
                let shapeArray = obj['SHAPE'].split(',');
                for (let kk = 0; kk < shapeArray.length; kk++) {
                    shapeArray[kk] = Number(shapeArray[kk]);
                }

                let max: any = null;
                let min: any = null;
                let threshold: any = null;

                if (obj['SHAPE-threshold'] != null && obj['SHAPE-threshold'] !== '') {
                    threshold = Number(obj['SHAPE-threshold']);
                }

                if (obj['SHAPE-max'] != null && obj['SHAPE-max'] !== '') {
                    max = Number(obj['SHAPE-max']);
                }

                if (obj['SHAPE-min'] != null && obj['SHAPE-min'] !== '') {
                    min = Number(obj['SHAPE-min']);
                }

                newfb.setShapeData(shapeArray, 0, threshold, max, min, null);
            }
        }

        newsol.setPlayer(playerName, playerID);
        newsol.expFeedback = newfb;

        if (obj['has-fold-data'] != null) {
            newsol.hasFoldData = obj['has-fold-data'] !== 0;
        }

        if (obj['fold-data'] != null) {
            newsol.foldData = JSON.parse(obj['fold-data']);
        }

        return newsol;
    }

    private _solutions: Solution[] = [];
    private _hairpins: string[] = [];

    private static _instance: SolutionManager;
}

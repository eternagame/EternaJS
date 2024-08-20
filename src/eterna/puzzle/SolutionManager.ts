import log from 'loglevel';
import Eterna from 'eterna/Eterna';
import Feedback, {BrentTheoData} from 'eterna/Feedback';
import Sequence from 'eterna/rnatypes/Sequence';
import {BundledAnnotationData} from 'eterna/AnnotationManager';
import {DesignCategory} from 'eterna/mode/DesignBrowser/DesignBrowserMode';
import SecStruct from 'eterna/rnatypes/SecStruct';
import {ErrorUtil} from 'flashbang';
import Solution from './Solution';

interface SolutionSpec {
    id: string;
    puznid: string;
    sequence: string;
    title: string;
    name: string | null;
    uid: string | null;
    gc: string;
    gu: string;
    au: string;
    meltpoint: string;
    energy: string;
    body: string;
    'submitted-round': string;
    'synthesis-round': string;
    'synthesis-score': string;
    'synthesis-data': string;
    SHAPE: string;
    'SHAPE-threshold': string;
    'SHAPE-max': string;
    'SHAPE-min': string;
    'has-fold-data': number | null;
    'fold-data': string;
    'annotations': BundledAnnotationData[];
    'selected-nts': string;
}

interface ShapeData {
    condition: string;
    reactive: string;
    start_index: string;
    peaks: string[];
    target_index: string;
    threshold: string;
    max: string;
    min: string;
    estimate_structure?: string;
}

interface DegradationData {
    condition: string;
    reactive: string;
    start_index: string;
    target_index: string;
    peaks: string[];
    error: string[];
    signal_to_noise_category: string;
    signal_to_noise: string;
}

export default class SolutionManager {
    public static get instance(): SolutionManager {
        if (SolutionManager._instance == null) {
            SolutionManager._instance = new SolutionManager();
        }
        return SolutionManager._instance;
    }

    public async getSolutionsForPuzzle(puzzleID: number): Promise<Solution[]> {
        log.info(`Loading solutions for puzzle ${puzzleID}...`);
        const PAGE_SIZE = 10000;
        const PAGE_OVERLAP = 10;
        const loaded = new Map<string, SolutionSpec>();
        let skip = 0;
        while (true) {
            // We're explicitly trying to be a good citizen and not overload the server,
            // plus making these requests in parallel would make the concurrency handling harder
            // eslint-disable-next-line no-await-in-loop
            const json = await Eterna.client.getSolutions(puzzleID, PAGE_SIZE, skip);
            if (json['data']['error']) throw new Error(json['data']['error']);
            const page = json['data']['solutions'] as SolutionSpec[];

            // We always explicitly request some solutions we already have. Why? That way if a bunch
            // of solutions get deleted, we can check here to ensure that the list of solutions
            // hasn't shifted so much that we may have accidentally skipped over some solutions.
            if (skip !== 0 && !loaded.has(page[0].id)) {
                skip = Math.max(0, skip - PAGE_OVERLAP);
                continue;
            }

            for (const solution of page) {
                loaded.set(solution.id, solution);
            }

            // If the page doesn't have the maximum amount we requested, it must mean that there aren't
            // any more to return, which means we're done
            if (page.length < PAGE_SIZE) break;

            skip += PAGE_SIZE - PAGE_OVERLAP;
        }
        this._solutions = Array.from(loaded.values()).map((solution) => {
            try {
                return SolutionManager.processData(solution);
            } catch (e) {
                throw new Error(`Failed loading solution ${solution.id}: ${ErrorUtil.getErrString(e, false)}`);
            }
        });
        return this._solutions;
    }

    public get solutions(): Solution[] {
        return this._solutions;
    }

    public getSolutionBySequence(seq: string): Solution | null {
        for (const solution of this._solutions) {
            if (solution.sequence.sequenceString() === seq) {
                return solution;
            }
        }

        return null;
    }

    public addHairpins(hairpins: string[]): void {
        if (hairpins == null) {
            return;
        }

        for (const hairpin of hairpins) {
            this._hairpins.push(hairpin);
        }
    }

    public isHairpinUsed(hairpinToCheck: string): boolean {
        for (const hairpin of this._hairpins) {
            if (hairpin === hairpinToCheck) {
                return true;
            }
        }
        return false;
    }

    public getMyCurrentSolutionTitles(round: number): string[] {
        const titles: string[] = [];
        for (const solution of this._solutions) {
            if (solution.getProperty(DesignCategory.ROUND) === round && solution.playerID === Eterna.playerID) {
                titles.push(solution.title);
            }
        }

        return titles;
    }

    private static processData(obj: SolutionSpec): Solution {
        const newsol: Solution = new Solution(Number(obj['id']), Number(obj['puznid']));
        newsol.sequence = Sequence.fromSequenceString(obj['sequence']);
        newsol.title = obj['title'];

        let newfb: Feedback | null = null;

        const playerName = obj['name'] != null ? obj['name'] : '';
        const playerID = obj['uid'] != null ? Number(obj['uid']) : -1;

        newsol.setPlayer(playerName, playerID);
        newsol.setNumPairs(Number(obj['gc']), Number(obj['gu']), Number(obj['au']));
        newsol.meltingPoint(Number(obj['meltpoint']));
        newsol.freeEnergy = Number(obj['energy']);
        newsol.desc = obj['body'];
        newsol.round = Number(obj['submitted-round']);
        newsol.setSynthesis(Number(obj['synthesis-round']), Number(obj['synthesis-score']));

        if (obj['synthesis-data'] && obj['synthesis-data'].length > 0) {
            const synthesisDataRaw: (ShapeData | DegradationData)[] | BrentTheoData = JSON.parse(obj['synthesis-data']);
            if (Array.isArray(synthesisDataRaw)) {
                const synthesisData: (ShapeData | DegradationData)[] = synthesisDataRaw;

                for (let ii = 0; ii < synthesisData.length; ii++) {
                    let synthesis: ShapeData | DegradationData = synthesisData[ii];
                    if (synthesis['reactive'] === 'SHAPE') {
                        // This means that it's a ShapeData.
                        // Ugh: this is better than the alternative but still a little ridiculous
                        synthesis = synthesis as ShapeData;
                        const peaks: number[] = [];
                        peaks.push(Number(synthesis['start_index']));

                        for (const val of synthesis['peaks']) {
                            peaks.push(Number(val));
                        }

                        if (newfb == null) {
                            newfb = new Feedback();
                        }

                        newfb.setShapeData(
                            peaks,
                            synthesis['condition'] || 'SHAPE',
                            Number(synthesis['target_index']),
                            Number(synthesis['threshold']),
                            Number(synthesis['max']),
                            Number(synthesis['min']),
                            null,
                            synthesis['estimate_structure']
                                ? SecStruct.fromParens(synthesis['estimate_structure'], true)
                                : null
                        );
                    }
                    if (synthesis['reactive'] === 'Degradation') {
                        // This means that it's a ShapeData.
                        // Ugh: this is better than the alternative but still a little ridiculous
                        synthesis = synthesis as DegradationData;
                        const condition = synthesis['condition'];
                        const peaks: number[] = [];
                        peaks.push(Number(synthesis['start_index']));

                        for (const val of synthesis['peaks']) {
                            peaks.push(Number(val));
                        }

                        const error: number[] = [];
                        error.push(Number(synthesis['start_index']));

                        for (const val of synthesis['error']) {
                            error.push(Number(val));
                        }

                        const stnCategory: string = synthesis['signal_to_noise_category'];
                        const stn: string = synthesis['signal_to_noise'];

                        if (newfb == null) {
                            newfb = new Feedback();
                        }
                        newfb.setDegradationData(
                            peaks,
                            condition,
                            Number(synthesis['target_index']),
                            error,
                            stnCategory,
                            Number(stn),
                            null
                        );
                    }
                }
                // / Ad-hoc handling for different exp types : Brent's theophylline puzzle
            } else if (synthesisDataRaw['type'] === 'brent_theo') {
                if (newfb == null) {
                    newfb = new Feedback();
                }
                newfb.brentTheoData = synthesisDataRaw;
            }
        } else if (obj['SHAPE'] != null && obj['SHAPE'].length > 0) {
            if (newfb == null) {
                newfb = new Feedback();
            }

            if (Feedback.EXPSTRINGS.indexOf(obj['SHAPE']) >= 0) {
                newfb.setShapeData(null, 'SHAPE', 0, null, null, null, obj['SHAPE'], null);
            } else {
                const protoshapeArray = obj['SHAPE'].split(',');
                const shapeArray: number[] = protoshapeArray.map(
                    (val) => Number(val)
                );

                const threshold = obj['SHAPE-threshold'] != null && obj['SHAPE-threshold'] !== ''
                    ? Number(obj['SHAPE-threshold'])
                    : null;

                const max = obj['SHAPE-max'] != null && obj['SHAPE-max'] !== ''
                    ? Number(obj['SHAPE-max'])
                    : null;

                const min = obj['SHAPE-min'] != null && obj['SHAPE-min'] !== ''
                    ? Number(obj['SHAPE-min'])
                    : null;

                newfb.setShapeData(shapeArray, 'SHAPE', 0, threshold, max, min, null, null);
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

        if (obj['annotations'] != null) {
            newsol.annotations = obj['annotations'];
        }

        if (obj['selected-nts'] != null) {
            newsol.libraryNT = obj['selected-nts'].split(',').map((n) => +n);
        }

        return newsol;
    }

    public static dispose() {
        this._instance = null;
    }

    private _solutions: Solution[] = [];
    private _hairpins: string[] = [];

    private static _instance: SolutionManager | null;
}

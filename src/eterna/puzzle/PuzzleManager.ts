import * as log from 'loglevel';
import Eterna from 'eterna/Eterna';
import FolderManager from 'eterna/folding/FolderManager';
import Folder from 'eterna/folding/Folder';
import ShapeConstraint, {AntiShapeConstraint} from 'eterna/constraints/constraints/ShapeConstraint';
import {
    MultistrandBindingsConstraint,
    OligoBoundConstraint,
    OligoUnboundConstraint
} from 'eterna/constraints/constraints/BindingConstraint';
import Constraint, {BaseConstraintStatus} from 'eterna/constraints/Constraint';
import {
    ConsecutiveAConstraint, ConsecutiveCConstraint, ConsecutiveUConstraint, ConsecutiveGConstraint
} from 'eterna/constraints/constraints/ConsecutiveBaseConstraint';
import {
    MaximumAConstraint, MaximumCConstraint, MaximumGConstraint, MaximumUConstraint
} from 'eterna/constraints/constraints/MaximumBaseConstraint';
import MaximumMutationConstraint from 'eterna/constraints/constraints/MaximumMutationConstraint';
import {
    MaximumAUConstraint,
    MaximumGCConstraint,
    MaximumGUConstraint
} from 'eterna/constraints/constraints/MaximumPairConstraint';
import {
    MinimumAConstraint, MinimumCConstraint, MinimumGConstraint, MinimumUConstraint
} from 'eterna/constraints/constraints/MinimumBaseConstraint';
import {
    MinimumAUConstraint, MinimumGCConstraint, MinimumGUConstraint, MinimumAnyPairConstraint
} from 'eterna/constraints/constraints/MinimumPairConstraint';
import MinimumStackLengthConstraint from 'eterna/constraints/constraints/MinimumStackLengthConstraint';
import ScriptConstraint from 'eterna/constraints/constraints/ScriptConstraint';
import SynthesisConstraint from 'eterna/constraints/constraints/SynthesisConstraint';
import BarcodeConstraint from 'eterna/constraints/constraints/BarcodeConstraint';
import ExternalInterface from 'eterna/util/ExternalInterface';
import SolutionManager from './SolutionManager';
import Puzzle from './Puzzle';

export default class PuzzleManager {
    public static get instance(): PuzzleManager {
        if (PuzzleManager._instance == null) {
            PuzzleManager._instance = new PuzzleManager();
        }
        return PuzzleManager._instance;
    }

    public parsePuzzle(json: any): Puzzle {
        let newpuz: Puzzle = new Puzzle(Number(json['id']), json['title'], json['type']);

        if (json['body']) {
            // Convention: mission texts are encapsulated by
            // <span id="mission"> ... </span>
            // This allows to reuse existing descriptions, just insert the span element where appropriate
            // Or one can add a new mission statement, and HTML-hide it if necessary using <!-- ... -->

            let res: RegExpExecArray = PuzzleManager.RE_MISSION_TEXT.exec(json['body']);
            if (res != null && res.length >= 2) {
                [, newpuz.missionText] = res;
            }
        }

        if (json['locks'] && json['locks'].length > 0) {
            let lockStr: string = json['locks'];
            let locks: boolean[] = [];

            for (let kk = 0; kk < lockStr.length; kk++) {
                locks.push(lockStr.charAt(kk) === 'x');
            }
            newpuz.puzzleLocks = locks;
        }

        if (json['objective']) {
            let objective: any = JSON.parse(json['objective'])[0];
            if (objective['shift_limit']) {
                newpuz.shiftLimit = objective['shift_limit'];
            } else {
                newpuz.shiftLimit = 0;
            }
        }

        if (json['beginseq'] && json['beginseq'].length > 0) {
            if (json['beginseq'].length !== json['secstruct'].length) {
                throw new Error(`Beginning sequence length doesn't match pair length for puzzle ${json['Title']}`);
            }
            newpuz.beginningSequence = json['beginseq'];
        }

        if (json['saved_sequence'] && json['saved_sequence'].length > 0) {
            if (json['saved_sequence'].length === json['secstruct'].length && json['type'] === 'Challenge') {
                newpuz.savedSequenceString = json['saved_sequence'];
            }
        }

        let usetails = Number(json['usetails']);
        newpuz.setUseTails(usetails > 0, usetails === 2);

        if (json['folder'] && json['folder'].length > 0) {
            newpuz.folderName = json['folder'];
        }

        if (json['reward'] && json['reward'].length > 0) {
            newpuz.reward = Number(json['reward']);
        }

        if (json['ui-specs']) {
            // New style UI elements (scripted) are identified as JSON objects
            if (json['ui-specs'].substr(0, 1) === '{') {
                newpuz.boosters = JSON.parse(json['ui-specs']);
            } else {
                // Fallback for the old tutorials
                newpuz.uiSpecs = json['ui-specs'].split(',');
            }
        }

        if (json['next-puzzle']) {
            newpuz.nextPuzzleID = Number(json['next-puzzle']);
        }

        if (json['last-round'] != null) {
            newpuz.round = Number(json['last-round']) + 1;
        }

        if (json['objective'] && json['objective'].length > 0) {
            newpuz.objective = JSON.parse(json['objective']);
        } else {
            newpuz.secstructs = [json['secstruct']];
        }

        if (json['check_hairpin'] && Number(json['check_hairpin'])) {
            newpuz.useBarcode = true;
        }

        if (json['num-submissions'] != null) {
            newpuz.numSubmissions = Number(json['num-submissions']);
        }

        if (json['rscript']) {
            newpuz.rscript = json['rscript'];
        }

        if (json['events']) {
            newpuz.rscript = json['events'];
        }

        if (json['hint']) {
            newpuz.hint = json['hint'];
        }

        if (newpuz.nodeID === 877668) {
            newpuz.objective = JSON.parse(PuzzleManager.OBJECTIVE_877668);
        } else if (newpuz.nodeID === 885046) {
            newpuz.objective = JSON.parse(PuzzleManager.OBJECTIVE_885046);
        } else if (newpuz.nodeID === 1420804) {
            newpuz.objective = JSON.parse(PuzzleManager.OBJECTIVE_1420804);
        }

        let {targetConditions} = newpuz;
        if (targetConditions != null) {
            for (let ii = 0; ii < targetConditions.length; ii++) {
                if (targetConditions[ii] != null) {
                    let constrainedBases: any[] = targetConditions[ii]['structure_constrained_bases'];
                    if (constrainedBases != null) {
                        if (constrainedBases.length % 2 === 0) {
                            targetConditions[ii]['structure_constraints'] = [];
                            for (let jj = 0; jj < targetConditions[ii]['secstruct'].length; jj++) {
                                targetConditions[ii]['structure_constraints'][jj] = false;
                            }

                            for (let jj = 0; jj < constrainedBases.length; jj += 2) {
                                for (let kk = constrainedBases[jj]; kk <= constrainedBases[jj + 1]; kk++) {
                                    targetConditions[ii]['structure_constraints'][kk] = true;
                                }
                            }
                        }
                    }

                    let antiConstrainedBases: any[] = targetConditions[ii]['anti_structure_constrained_bases'];
                    if (antiConstrainedBases != null) {
                        if (
                            targetConditions[ii]['anti_secstruct'] != null
                            && targetConditions[ii]['anti_secstruct'].length
                                === targetConditions[ii]['secstruct'].length
                        ) {
                            if (antiConstrainedBases.length % 2 === 0) {
                                targetConditions[ii]['anti_structure_constraints'] = [];
                                for (let jj = 0; jj < targetConditions[ii]['secstruct'].length; jj++) {
                                    targetConditions[ii]['anti_structure_constraints'][jj] = false;
                                }

                                for (let jj = 0; jj < antiConstrainedBases.length; jj += 2) {
                                    for (let kk = antiConstrainedBases[jj]; kk <= antiConstrainedBases[jj + 1]; kk++) {
                                        targetConditions[ii]['anti_structure_constraints'][kk] = true;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        let constraints: Constraint<BaseConstraintStatus>[] = [];
        if (json['constraints'] && json['constraints'].length > 0) {
            let constraintDefs: string[] = json['constraints'].split(',');
            if (constraintDefs.length % 2 === 1) {
                throw new Error('Invalid constraint definition - uneven number of constraints and parameters');
            }

            for (let i = 0; i < constraintDefs.length; i += 2) {
                let [name, parameter] = constraintDefs.slice(i, i + 2);
                switch (name) {
                    case 'SOFT':
                        newpuz.isSoftConstraint = true;
                        break;
                    case AntiShapeConstraint.NAME:
                        constraints.push(new AntiShapeConstraint(Number(parameter)));
                        break;
                    case MultistrandBindingsConstraint.NAME:
                        constraints.push(new MultistrandBindingsConstraint(Number(parameter)));
                        break;
                    case OligoBoundConstraint.NAME:
                        constraints.push(new OligoBoundConstraint(Number(parameter)));
                        break;
                    case OligoUnboundConstraint.NAME:
                        constraints.push(new OligoUnboundConstraint(Number(parameter)));
                        break;
                    case ConsecutiveAConstraint.NAME:
                        constraints.push(new ConsecutiveAConstraint(Number(parameter)));
                        break;
                    case ConsecutiveCConstraint.NAME:
                        constraints.push(new ConsecutiveCConstraint(Number(parameter)));
                        break;
                    case ConsecutiveGConstraint.NAME:
                        constraints.push(new ConsecutiveGConstraint(Number(parameter)));
                        break;
                    case ConsecutiveUConstraint.NAME:
                        constraints.push(new ConsecutiveUConstraint(Number(parameter)));
                        break;
                    case MaximumAConstraint.NAME:
                        constraints.push(new MaximumAConstraint(Number(parameter)));
                        break;
                    case MaximumCConstraint.NAME:
                        constraints.push(new MaximumCConstraint(Number(parameter)));
                        break;
                    case MaximumGConstraint.NAME:
                        constraints.push(new MaximumGConstraint(Number(parameter)));
                        break;
                    case MaximumUConstraint.NAME:
                        constraints.push(new MaximumUConstraint(Number(parameter)));
                        break;
                    case MaximumMutationConstraint.NAME:
                        constraints.push(new MaximumMutationConstraint(Number(parameter)));
                        break;
                    case MaximumAUConstraint.NAME:
                        constraints.push(new MaximumAUConstraint(Number(parameter)));
                        break;
                    case MaximumGCConstraint.NAME:
                        constraints.push(new MaximumGCConstraint(Number(parameter)));
                        break;
                    case MaximumGUConstraint.NAME:
                        constraints.push(new MaximumGUConstraint(Number(parameter)));
                        break;
                    case MinimumAConstraint.NAME:
                        constraints.push(new MinimumAConstraint(Number(parameter)));
                        break;
                    case MinimumCConstraint.NAME:
                        constraints.push(new MinimumCConstraint(Number(parameter)));
                        break;
                    case MinimumGConstraint.NAME:
                        constraints.push(new MinimumGConstraint(Number(parameter)));
                        break;
                    case MinimumUConstraint.NAME:
                        constraints.push(new MinimumUConstraint(Number(parameter)));
                        break;
                    case MinimumAUConstraint.NAME:
                        constraints.push(new MinimumAUConstraint(Number(parameter)));
                        break;
                    case MinimumGCConstraint.NAME:
                        constraints.push(new MinimumGCConstraint(Number(parameter)));
                        break;
                    case MinimumGUConstraint.NAME:
                        constraints.push(new MinimumGUConstraint(Number(parameter)));
                        break;
                    case MinimumAnyPairConstraint.NAME:
                        constraints.push(new MinimumAnyPairConstraint(Number(parameter)));
                        break;
                    case MinimumStackLengthConstraint.NAME:
                        constraints.push(new MinimumStackLengthConstraint(Number(parameter)));
                        break;
                    case ScriptConstraint.NAME:
                        constraints.push(new ScriptConstraint(Number(parameter)));
                        break;
                    case ShapeConstraint.NAME:
                        constraints.push(new ShapeConstraint(Number(parameter)));
                        break;
                    case SynthesisConstraint.NAME:
                        constraints.push(new SynthesisConstraint());
                        break;
                    default:
                        log.warn(`Unknown constraint ${name} - skipping`);
                }
            }
        }

        if (json['check_hairpin'] && Number(json['check_hairpin'])) {
            constraints.push(new BarcodeConstraint());
        }

        newpuz.constraints = constraints;

        if (!newpuz.canUseFolder(FolderManager.instance.getFolder(newpuz.folderName))) {
            newpuz.folderName = FolderManager.instance.getNextFolder(
                newpuz.folderName, (folder: Folder) => !newpuz.canUseFolder(folder)
            ).name;
        }

        let replace = false;

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

    public async getPuzzleByID(puznid: number, scriptid: number = -1): Promise<Puzzle> {
        for (let puzzle of this._puzzles) {
            if (puzzle.nodeID === puznid) {
                return Promise.resolve(puzzle);
            }
        }

        log.info(`Loading puzzle [nid=${puznid}, scriptid=${scriptid}...]`);
        let json = await Eterna.client.getPuzzle(puznid, scriptid);
        let data = json['data'];
        if (data['hairpins']) {
            SolutionManager.instance.addHairpins(data['hairpins']);
        }

        let puzzle = this.parsePuzzle(data['puzzle']);

        let isScriptConstraint = (
            constraint: Constraint<BaseConstraintStatus> | ScriptConstraint
        ): constraint is ScriptConstraint => constraint instanceof ScriptConstraint;

        await Promise.all(
            puzzle.constraints.filter(isScriptConstraint)
                .map((scriptConstraint) => ExternalInterface.preloadScript(scriptConstraint.scriptID))
        );
        log.info(`Loaded puzzle [name=${puzzle.getName()}]`);
        return puzzle;
    }

    private _puzzles: Puzzle[] = [];

    private static _instance: PuzzleManager;

    /* eslint-disable max-len */
    private static readonly OBJECTIVE_877668 = '[{"type":"single","secstruct":".....................(((((............)))))"},{"type":"aptamer","site":[2,3,4,5,6,7,8,9,18,19,20,21,22,23,24],"concentration":100,"secstruct":"(((......(((....))).....)))................"}]';
    private static readonly OBJECTIVE_885046 = '[{"type":"single","secstruct":".....................(((((((............)))))))"},{"type":"aptamer","site":[8,9,10,11,12,13,14,15,26,27,28,29,30,31,32],"concentration":10000,"secstruct":"((((......((((....)))).....))))................"}]';
    private static readonly OBJECTIVE_1420804 = '[{"type":"single","secstruct":".....................(((((((............)))))))........"},{"type":"aptamer","site":[12,13,14,15,16,17,18,19,33,34,35,36,37,38,39],"concentration":10000,"secstruct":"..(((.((......(((((....)).))).....)))))................"}]';
    /* eslint-enable max-len */

    private static readonly RE_MISSION_TEXT = /<span id="mission">(.*?)<\/span>/s;
}

interface Array<T> {
    filter<U extends T>(pred: (a: T) => a is U): U[];
}

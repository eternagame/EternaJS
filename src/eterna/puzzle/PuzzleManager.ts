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
import MaximumNonLibraryMutationConstraint from 'eterna/constraints/constraints/MaximumNonLibraryMutationConstraint';
import {
    MaximumAUConstraint,
    MaximumGCConstraint,
    MaximumGUConstraint
} from 'eterna/constraints/constraints/MaximumPairConstraint';
import BranchinessConstraint from 'eterna/constraints/constraints/BranchinessConstraint';
import LibrarySelectionConstraint from 'eterna/constraints/constraints/LibrarySelectionConstraint';
import {
    MinimumAConstraint, MinimumCConstraint, MinimumGConstraint, MinimumUConstraint
} from 'eterna/constraints/constraints/MinimumBaseConstraint';
import {
    MinimumAUConstraint, MinimumGCConstraint, MinimumGUConstraint, MinimumAnyPairConstraint
} from 'eterna/constraints/constraints/MinimumPairConstraint';
import MinimumStackLengthConstraint from 'eterna/constraints/constraints/MinimumStackLengthConstraint';
import TargetExpectedAccuracyConstraint from 'eterna/constraints/constraints/TargetExpectedAccuracyConstraint';
import ScriptConstraint from 'eterna/constraints/constraints/ScriptConstraint';
import SynthesisConstraint from 'eterna/constraints/constraints/SynthesisConstraint';
import BarcodeConstraint from 'eterna/constraints/constraints/BarcodeConstraint';
import ExternalInterface from 'eterna/util/ExternalInterface';
import BoostConstraint from 'eterna/constraints/constraints/BoostConstraint';
import RangePairedMaxConstraint from 'eterna/constraints/constraints/RangePairedMaxConstraint';
import {Assert} from 'flashbang';
import {TargetConditions} from 'eterna/UndoBlock';
import PseudoknotConstraint from 'eterna/constraints/constraints/PseudoknotConstraint';
import SolutionManager from './SolutionManager';
import Puzzle, {PuzzleType} from './Puzzle';

export interface PuzzleJSON {
    id: string;
    title: string;
    type: PuzzleType; // AMW: worried this is actually stored as a string
    body: string;
    username: string;
    locks?: string;
    objective?: string;
    beginseq?: string;
    secstruct: string;
    saved_sequence?: string;
    usetails: string;
    folder?: string; // AMW TODO: make a valid folder name somehow!
    reward?: string;
    'ui-specs'?: string;
    'next-puzzle'?: string;
    'last-round'?: string;
    check_hairpin?: string;
    barcode_start?: string;
    'num-submissions'?: string;
    rscript?: string;
    events?: string;
    hint?: string;
    'max-votes'?: string;
    constraints?: string; // AMW TODO: string formatting restrictions
    '3d_structure'?: string; //
}

interface ObjectiveString {
    shift_limit: number;
}

export default class PuzzleManager {
    public static get instance(): PuzzleManager {
        if (PuzzleManager._instance == null) {
            PuzzleManager._instance = new PuzzleManager();
        }
        return PuzzleManager._instance;
    }

    public async parsePuzzle(json: PuzzleJSON): Promise<Puzzle> {
        const newpuz: Puzzle = new Puzzle(Number(json['id']), json['title'], json['type'], json['username']);

        if (json['body']) {
            // Convention: mission texts are encapsulated by
            // <span id="mission"> ... </span>
            // This allows to reuse existing descriptions, just insert the span element where appropriate
            // Or one can add a new mission statement, and HTML-hide it if necessary using <!-- ... -->

            const res: RegExpExecArray | null = PuzzleManager.RE_MISSION_TEXT.exec(json['body']);
            if (res != null && res.length >= 2) {
                [, newpuz.missionText] = res;
            }
        }

        if (json['locks'] && json['locks'].length > 0) {
            const lockStr: string = json['locks'];
            const locks: boolean[] = lockStr.split('').map(
                (c) => c === 'x'
            );
            newpuz.puzzleLocks = locks;
        }

        if (json['objective']) {
            const objective: ObjectiveString = JSON.parse(json['objective'])[0];
            if (objective['shift_limit']) {
                newpuz.shiftLimit = objective['shift_limit'];
            } else {
                newpuz.shiftLimit = 0;
            }
        }

        if (json['beginseq'] && json['beginseq'].length > 0) {
            if (json['beginseq'].length !== json['secstruct'].length) {
                throw new Error(`Beginning sequence length doesn't match pair length for puzzle ${json['title']}`);
            }
            newpuz.beginningSequence = json['beginseq'];
        }

        if (json['saved_sequence'] && json['saved_sequence'].length > 0) {
            if (json['saved_sequence'].length === json['secstruct'].length && json['type'] === 'Challenge') {
                newpuz.savedSequenceString = json['saved_sequence'];
            }
        }

        const usetails = Number(json['usetails']);
        newpuz.setUseTails(usetails > 0, usetails === 2);

        if (json['folder'] && json['folder'].length > 0) {
            newpuz.folderName = json['folder'];
        }

        if (json['reward'] && json['reward'].length > 0) {
            newpuz.reward = Number(json['reward']);
        }

        if (json['ui-specs']) {
            // New style UI elements (scripted) are identified as JSON objects
            newpuz.boosters = JSON.parse(json['ui-specs']);
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

        if (json['barcode_start']) {
            newpuz.barcodeStart = Number(json['barcode_start']);
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

        if (json['max-votes']) {
            newpuz.maxVotes = Number(json['max-votes']);
        }

        if (json['3d_structure']) {
            newpuz.threePath = json['3d_structure'];
        }

        if (newpuz.nodeID === 877668) {
            newpuz.objective = JSON.parse(PuzzleManager.OBJECTIVE_877668);
        } else if (newpuz.nodeID === 885046) {
            newpuz.objective = JSON.parse(PuzzleManager.OBJECTIVE_885046);
        } else if (newpuz.nodeID === 1420804) {
            newpuz.objective = JSON.parse(PuzzleManager.OBJECTIVE_1420804);
        }

        const {targetConditions} = newpuz;
        if (targetConditions !== undefined) {
            for (let ii = 0; ii < targetConditions.length; ii++) {
                if (targetConditions[ii] === undefined) continue;
                const tc = targetConditions[ii] as TargetConditions;

                const constrainedBases = tc['structure_constrained_bases'];
                if (constrainedBases !== undefined && constrainedBases.length % 2 === 0) {
                    tc['structure_constraints'] = new Array(tc['secstruct'].length).fill(false);

                    for (let jj = 0; jj < constrainedBases.length; jj += 2) {
                        for (let kk = constrainedBases[jj]; kk <= constrainedBases[jj + 1]; kk++) {
                            tc['structure_constraints'][kk] = true;
                        }
                    }
                }

                const aConstrainedBases = tc['anti_structure_constrained_bases'];
                if (aConstrainedBases !== undefined
                        && tc['anti_secstruct'] !== undefined
                        && tc['anti_secstruct'].length === tc['secstruct'].length
                        && aConstrainedBases.length % 2 === 0) {
                    tc['anti_structure_constraints'] = new Array(tc['secstruct'].length).fill(false);

                    for (let jj = 0; jj < aConstrainedBases.length; jj += 2) {
                        for (let kk = aConstrainedBases[jj]; kk <= aConstrainedBases[jj + 1]; kk++) {
                            tc['anti_structure_constraints'][kk] = true;
                        }
                    }
                }
            }
        }

        const constraints: Constraint<BaseConstraintStatus>[] = [];
        if (json['constraints'] && json['constraints'].length > 0) {
            const constraintDefs: string[] = json['constraints'].split(',');
            if (constraintDefs.length % 2 === 1 && (
                // For backwards compatibility, if the last constraint doesn't need a parameter,
                // don't require it to have one
                constraintDefs[constraintDefs.length - 1] !== 'SOFT'
                && constraintDefs[constraintDefs.length - 1] !== SynthesisConstraint.NAME
            )) {
                throw new Error('Invalid constraint definition - uneven number of constraints and parameters');
            }

            for (let i = 0; i < constraintDefs.length; i += 2) {
                const [name, parameter] = constraintDefs.slice(i, i + 2);
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
                    case BranchinessConstraint.NAME:
                        constraints.push(new BranchinessConstraint(Number(parameter)));
                        break;
                    case LibrarySelectionConstraint.NAME:
                        constraints.push(new LibrarySelectionConstraint(Number(parameter)));
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
                    case MaximumNonLibraryMutationConstraint.NAME:
                        constraints.push(new MaximumNonLibraryMutationConstraint(Number(parameter)));
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
                    case TargetExpectedAccuracyConstraint.NAME:
                        constraints.push(new TargetExpectedAccuracyConstraint(Number(parameter)));
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
                    case BoostConstraint.NAME:
                        constraints.push(new BoostConstraint(Number(parameter)));
                        break;
                    case RangePairedMaxConstraint.NAME:
                        constraints.push(new RangePairedMaxConstraint(parameter));
                        break;
                    case PseudoknotConstraint.NAME:
                        constraints.push(new PseudoknotConstraint());
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

        const folder: Folder | null = FolderManager.instance.getFolder(newpuz.folderName);
        Assert.assertIsDefined(folder, `Folder ${newpuz.folderName} cannot be found`);
        if (!newpuz.canUseFolder(folder)) {
            newpuz.folderName = FolderManager.instance.getNextFolder(
                newpuz.folderName,
                (candidateFolder: Folder) => !newpuz.canUseFolder(candidateFolder)
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

        const isScriptConstraint = (
            constraint: Constraint<BaseConstraintStatus> | ScriptConstraint
        ): constraint is ScriptConstraint => constraint instanceof ScriptConstraint;

        await Promise.all(
            newpuz.constraints.filter(isScriptConstraint)
                .map((scriptConstraint) => ExternalInterface.preloadScript(scriptConstraint.scriptID))
        );

        // Pre-load secondary puzzle
        const [, secondaryPuzzleId] = newpuz.rscript.match(/#PRE-PushPuzzle ([0-9]+);/) ?? [null, null];
        if (secondaryPuzzleId) {
            await this.getPuzzleByID(parseInt(secondaryPuzzleId, 10));
        }

        return newpuz;
    }

    public async getPuzzleByID(puznid: number, scriptid: number = -1): Promise<Puzzle> {
        for (const puzzle of this._puzzles) {
            if (puzzle.nodeID === puznid) {
                return puzzle;
            }
        }

        log.info(`Loading puzzle [nid=${puznid}, scriptid=${scriptid}...]`);
        const json = await Eterna.client.getPuzzle(puznid, scriptid);
        const data = json['data'];

        if (data['hairpins']) {
            SolutionManager.instance.addHairpins(data['hairpins']);
        }

        const puzzle = await this.parsePuzzle(data['puzzle']);

        const cleared = data.cleared as { nid: string }[];
        if (cleared) {
            const clearedNIDs = cleared.map((e) => e.nid);
            if (clearedNIDs.some((e) => parseInt(e, 10) === puzzle.nodeID)) {
                puzzle.alreadySolved = true;
            }
        }

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

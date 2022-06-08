import Constants from 'eterna/Constants';
import EPars, {RNABase} from 'eterna/EPars';
import FolderManager from 'eterna/folding/FolderManager';
import Vienna from 'eterna/folding/Vienna';
import Folder from 'eterna/folding/Folder';
import EternaURL from 'eterna/net/EternaURL';
import Constraint, {BaseConstraintStatus} from 'eterna/constraints/Constraint';
import ShapeConstraint from 'eterna/constraints/constraints/ShapeConstraint';
import {TargetConditions, OligoDef} from 'eterna/UndoBlock';
import {BoosterData} from 'eterna/mode/PoseEdit/Booster';
import Utility from 'eterna/util/Utility';
import SecStruct from 'eterna/rnatypes/SecStruct';
import Sequence from 'eterna/rnatypes/Sequence';
import {OligoMode} from 'eterna/rnatypes/Oligo';

export interface BoostersData {
    mission?: Mission;
    paint_tools?: BoosterData[];
    actions?: BoosterData[];
    mission_cleared?: MissionCleared;
}
export interface MissionCleared {
    info: string;
    more: string;
}
export interface Mission {
    text: string;
}

export enum PuzzleType {
    BASIC = 'Basic',
    SWITCH_BASIC = 'SwitchBasic',
    CHALLENGE = 'Challenge',
    EXPERIMENTAL = 'Experimental',
    PROGRESSION = 'Progression'
}

export type TargetType = 'multistrand' | 'aptamer' | 'pseudoknot' | 'aptamer+oligo' | 'oligo' | 'single';

export enum PoseState {
    NATIVE = 'NATIVE',
    FROZEN = 'FROZEN',
    TARGET = 'TARGET',

    // TODO: move these to another enum;
    // they are only used to communicate events to rscript
    PIP = 'PIP',
    NONPIP = 'NONPIP',
    SECOND = 'SECOND',
}

export default class Puzzle {
    public static isAptamerType(tcType: TargetType): boolean {
        return (Puzzle.T_APTAMER.indexOf(tcType) >= 0);
    }

    public static isOligoType(tcType: TargetType): boolean {
        return (Puzzle.T_OLIGO.indexOf(tcType) >= 0);
    }

    public static probeTail(seq: Sequence): Sequence | null {
        if (seq == null) {
            return null;
        }

        seq.setNt(0, RNABase.GUANINE);
        seq.setNt(1, RNABase.GUANINE);

        const offset: number = seq.length - 20;
        for (let ii = 0; ii < 20; ii++) {
            seq.setNt(offset + ii, EPars.RNABase_LAST20[ii]);
        }

        return seq;
    }

    constructor(nid: number, name: string, puzzleType: PuzzleType, puzzleAuthor: string) {
        this._nid = nid;
        this._name = name;
        this._puzzleType = puzzleType;
        this._puzzleAuthor = puzzleAuthor;

        if (puzzleType === PuzzleType.EXPERIMENTAL) {
            this._folder = FolderManager.instance.lastUsedFolder;
        } else {
            this._folder = Vienna.NAME;
        }
    }

    public canUseFolder(folder: Folder): boolean {
        return !(
            (this.hasTargetType('multistrand') && !folder.canMultifold)
            || (this.hasTargetType('aptamer') && !folder.canFoldWithBindingSite)
            || (this.hasTargetType('oligo') && !folder.canCofold)
            || (this.hasTargetType('aptamer+oligo') && !folder.canFoldWithBindingSite)
            || (this.hasTargetType('aptamer+oligo') && !folder.canCofold)
            || (this.hasTargetType('pseudoknot') && !folder.canPseudoknot)
        );
    }

    public get nodeID(): number {
        return this._nid;
    }

    public get reward(): number {
        return this._reward;
    }

    public set reward(reward: number) {
        this._reward = reward;
    }

    public get nextPuzzleID(): number {
        return this._nextPuzzle;
    }

    public set nextPuzzleID(nex: number) {
        this._nextPuzzle = nex;
    }

    public get rscript(): string {
        return this._rscriptOps;
    }

    public set rscript(inText: string) {
        this._rscriptOps = inText;
    }

    public get hint(): string | null {
        return this._hint;
    }

    public set hint(txt: string | null) {
        this._hint = txt;
    }

    public get puzzleType(): PuzzleType {
        return this._puzzleType;
    }

    public get puzzleAuthor(): string {
        return this._puzzleAuthor;
    }

    public get missionText(): string {
        return this._missionText;
    }

    public set missionText(text: string) {
        this._missionText = text;
    }

    public get folderName(): string {
        return this._folder;
    }

    public set folderName(folder: string) {
        this._folder = folder;
    }

    public get targetConditions(): (TargetConditions | undefined)[] {
        if (this._targetConditions == null) {
            const targetConditions: (TargetConditions | undefined)[] = this._secstructs.map(
                (_s) => undefined
            );
            return targetConditions;
        } else {
            return this._targetConditions;
        }
    }

    public get constraints(): Constraint<BaseConstraintStatus>[] | null {
        return this._constraints;
    }

    public set constraints(constraints: Constraint<BaseConstraintStatus>[] | null) {
        this._constraints = constraints;
    }

    public get puzzleLocks(): boolean[] {
        if (this._puzzleLocks == null && !this._useTails) {
            return this._secstructs[0].split('').map(
                (_ii) => false
            );
        } else if (this._useTails) {
            const puzlocks = [];

            if (this._useShortTails) {
                puzlocks.push(true);
                puzlocks.push(true);
            } else {
                puzlocks.push(true);
                puzlocks.push(true);
                puzlocks.push(true);
                puzlocks.push(true);
                puzlocks.push(true);
            }
            for (let ii = 0; ii < this._secstructs[0].length; ii++) {
                if (this._puzzleLocks != null) {
                    puzlocks.push(this._puzzleLocks[ii]);
                } else {
                    puzlocks.push(false);
                }
            }

            for (let ii = 0; ii < 20; ii++) {
                puzlocks.push(true);
            }
            return puzlocks;
        } else {
            return this._puzzleLocks.slice();
        }
    }

    public set puzzleLocks(locks: boolean[]) {
        this._puzzleLocks = locks.slice();
    }

    public get shiftLimit(): number {
        return this._shiftLimit;
    }

    public set shiftLimit(limit: number) {
        this._shiftLimit = limit;
    }

    public set secstructs(secstructs: string[]) {
        this._secstructs = secstructs.slice();
    }

    public set objective(objectives: TargetConditions[]) {
        this._targetConditions = objectives.slice();
        this._secstructs = [];
        let concentration: number;

        for (let ii = 0; ii < this._targetConditions.length; ii++) {
            if (this._targetConditions[ii]['secstruct'] == null) {
                throw new Error("Can't find secstruct from a target condition");
            }
            this._secstructs.push(this._targetConditions[ii]['secstruct']);

            const tcType: TargetType = this._targetConditions[ii]['type'];
            // Aptamers

            if (Puzzle.isAptamerType(tcType) && this._targetConditions[ii]['site'] !== undefined) {
                const bindingSite: number[] = this._targetConditions[ii]['site'] as number[];
                const targetPairs: number[] = SecStruct.fromParens(this.getSecstruct(ii)).pairs;
                const bindingPairs: number[] = bindingSite.map(
                    (jj) => targetPairs[jj]
                );

                // AMW TODO: these do not exist in the schema defined by the JSON
                // entered in the admin interface. Are they only defined here?
                this._targetConditions[ii]['binding_pairs'] = bindingPairs;
                this._targetConditions[ii]['bonus'] = (
                    -0.6 * Math.log(this._targetConditions[ii]['concentration'] as number / 3) * 100
                );
            }

            // Simple oligos

            if (
                Puzzle.isOligoType(tcType)
                && Object.hasOwnProperty.call(this._targetConditions[ii], 'fold_mode') === false
            ) {
                this._targetConditions[ii]['fold_mode'] = OligoMode.DIMER.toString();
            }

            if (Puzzle.isOligoType(tcType) && this._targetConditions[ii]['oligo_sequence'] != null) {
                concentration = 0;
                if (this._targetConditions[ii]['oligo_concentration'] != null) {
                    // AMW: consider altering the JSON online so it is always
                    // a number, not a string-that-can-be-converted.
                    concentration = Number(this._targetConditions[ii]['oligo_concentration']);
                } else {
                    concentration = 1.0;
                }
                this._targetConditions[ii]['malus'] = (
                    -Constants.BOLTZMANN * (Constants.KELVIN_0C + 37) * Math.log(concentration)
                );
            }

            // Multi-strands

            if (this._targetConditions[ii]['type'] === 'multistrand') {
                const oligos: OligoDef[] = this._targetConditions[ii]['oligos'] as OligoDef[];
                for (let jj = 0; jj < oligos.length; jj++) {
                    concentration = 0;
                    if (oligos[jj]['concentration'] != null) {
                        concentration = Number(oligos[jj]['concentration']);
                    } else {
                        concentration = 1.0;
                    }
                    oligos[jj]['malus'] = -Constants.BOLTZMANN * (Constants.KELVIN_0C + 37) * Math.log(concentration);
                }
            }
        }
    }

    public set beginningSequence(seq: string) {
        this._beginningSequence = Sequence.fromSequenceString(seq);
    }

    public set savedSequenceString(seq: string) {
        this._savedSequence = Sequence.fromSequenceString(seq);
    }

    public get boosters(): BoostersData | null {
        return this._boosterDefs;
    }

    public set boosters(obj: BoostersData | null) {
        this._boosterDefs = obj;
    }

    public get savedSequence(): Sequence {
        return this._savedSequence;
    }

    public set barcodeStart(start: number) {
        this._barcodeStart = start;
    }

    public get barcodeIndices(): number[] | null {
        if (!this._useBarcode) {
            return null;
        }

        const barcodes: number[] = [];
        const secstruct: string = this.getSecstruct();
        if (this._barcodeStart !== null) {
            for (let ii = this._barcodeStart; ii < this._barcodeStart + 19; ii++) {
                barcodes.push(ii);
            }
        } else if (this._useTails) {
            for (let ii = secstruct.length - 39; ii < secstruct.length - 20; ii++) {
                barcodes.push(ii);
            }
        } else {
            for (let ii = secstruct.length - 19; ii < secstruct.length; ii++) {
                barcodes.push(ii);
            }
        }
        return barcodes;
    }

    public get isSoftConstraint(): boolean {
        return this._isSoftConstraint;
    }

    public set isSoftConstraint(isSoftConstraint: boolean) {
        this._isSoftConstraint = isSoftConstraint;
    }

    public get round(): number {
        return this._round;
    }

    public set round(round: number) {
        this._round = round;
    }

    public get numSubmissions(): number {
        return this._numSubmissions;
    }

    public set numSubmissions(num: number) {
        this._numSubmissions = num;
    }

    public get useBarcode(): boolean {
        return this._useBarcode;
    }

    public set useBarcode(useBarcode: boolean) {
        this._useBarcode = useBarcode;
    }

    public get isPairBrushAllowed(): boolean {
        const isBasic: boolean = (this._puzzleType !== PuzzleType.BASIC);
        const hasTarget = this._constraints !== null && this._constraints.some(
            (constraint) => constraint instanceof ShapeConstraint
        );

        return isBasic || hasTarget;
    }

    public get defaultMode(): PoseState {
        if (this._defaultPoseState != null) {
            return this._defaultPoseState;
        } else if (this._puzzleType !== PuzzleType.BASIC) {
            return PoseState.TARGET;
        } else {
            return PoseState.FROZEN;
        }
    }

    public set defaultMode(defaultMode: PoseState) {
        this._defaultPoseState = defaultMode;
    }

    public get isUsingTails(): boolean {
        return this._useTails;
    }

    public set maxVotes(max: number) {
        this._maxVotes = max;
    }

    public get maxVotes(): number {
        return this._maxVotes;
    }

    public getSecstruct(index: number = 0): string {
        if (this._useTails) {
            if (this._useShortTails) {
                return `..${this._secstructs[index]}....................`;
            } else {
                return `.....${this._secstructs[index]}....................`;
            }
        } else {
            return this._secstructs[index];
        }
    }

    public getSecstructs(): string[] {
        const secstructs: string[] = [];
        for (let ii = 0; ii < this._secstructs.length; ii++) {
            secstructs.push(this.getSecstruct(ii));
        }
        return secstructs;
    }

    public getName(linked: boolean = false): string {
        // The DOMObject will need to allow markup to allow the link,
        // but we don't want users to be able to add markup to their puzzle titles
        const plainName = Utility.sanitizeAndMarkup(this._name);
        if (linked) {
            const url: string = EternaURL.createURL({page: 'puzzle', nid: this._nid});
            return `<u><A HREF="${url}" TARGET="_blank">${plainName}</a></u>`;
        }

        return plainName;
    }

    public hasTargetType(tcType: string): boolean {
        if (this._targetConditions == null) return false;
        for (let ii = 0; ii < this._targetConditions.length; ii++) {
            if (this._targetConditions[ii]['type'] === tcType) {
                return true;
            }
        }
        return false;
    }

    public getBeginningSequence(index: number = 0): Sequence {
        const seq: RNABase[] = [];
        if (this._useTails) {
            if (this._useShortTails) {
                seq.push(RNABase.GUANINE);
                seq.push(RNABase.GUANINE);
            } else {
                seq.push(RNABase.GUANINE);
                seq.push(RNABase.GUANINE);
                seq.push(RNABase.ADENINE);
                seq.push(RNABase.ADENINE);
                seq.push(RNABase.ADENINE);
            }
        }

        // FIXME: This needs revision, see https://github.com/EteRNAgame/eterna/blob/1e537defaad17674b189df697ee6f1c7cca070c0/flash-rna/flash-rna/PoseEdit.as#L2163
        const len = this._beginningSequence != null ? this._beginningSequence.length : this._secstructs[index].length;
        for (let ii = 0; ii < len; ii++) {
            if (this._beginningSequence != null) {
                seq.push(this._beginningSequence.nt(ii));
            } else {
                seq.push(RNABase.ADENINE);
            }
        }

        if (this._useTails) {
            for (let ii = 0; ii < 20; ii++) {
                seq.push(EPars.RNABase_LAST20[ii]);
            }
        }

        return new Sequence(seq);
    }

    public getSubsequenceWithoutBarcode(seq: Sequence): Sequence {
        if (!this._useBarcode) {
            return seq.slice(0);
        }
        let minus = 19;
        if (this._useTails) {
            minus += 20;
        }

        return seq.slice(0, seq.length - minus);
    }

    public setUseTails(useTails: boolean, useShortTails: boolean): void {
        this._useTails = useTails;
        this._useShortTails = useShortTails;
    }

    public transformSequence(seq: Sequence, targetIndex: number): Sequence {
        if (this._targetConditions == null) {
            return seq;
        }
        if (this._targetConditions[targetIndex]['sequence'] === undefined) {
            return seq;
        }

        const targetSeqTemp: Sequence = Sequence.fromSequenceString(
            this._targetConditions[targetIndex]['sequence'] as string
        );
        const targetSeq: RNABase[] = [];

        if (this._useTails) {
            if (this._useShortTails) {
                targetSeq.push(RNABase.GUANINE);
                targetSeq.push(RNABase.GUANINE);
            } else {
                targetSeq.push(RNABase.GUANINE);
                targetSeq.push(RNABase.GUANINE);
                targetSeq.push(RNABase.ADENINE);
                targetSeq.push(RNABase.ADENINE);
                targetSeq.push(RNABase.ADENINE);
            }
        }

        for (let ii = 0; ii < targetSeqTemp.length; ii++) {
            targetSeq.push(targetSeqTemp.nt(ii));
        }

        if (this._useTails) {
            for (let ii = 0; ii < 20; ii++) {
                targetSeq.push(EPars.RNABase_LAST20[ii]);
            }
        }

        const locks: boolean[] = this.puzzleLocks;

        if (locks.length !== targetSeq.length || targetSeq.length !== seq.length) {
            throw new Error("lock length doesn't match object sequence");
        }

        for (let ii = 0; ii < targetSeq.length; ii++) {
            if (!locks[ii]) {
                targetSeq[ii] = seq.nt(ii);
            }
        }

        return new Sequence(targetSeq);
    }

    public get alreadySolved() {
        return this._alreadySolved;
    }

    public set alreadySolved(alreadySolved: boolean) {
        this._alreadySolved = alreadySolved;
    }

    public get threePath(): string | null {
        return this._threePath;
    }

    public set threePath(path: string | null) {
        this._threePath = path;
    }

    private _threePath: string | null = null;
    private readonly _nid: number;
    private readonly _name: string;
    private readonly _puzzleType: PuzzleType;
    private readonly _puzzleAuthor: string;
    private _secstructs: string[] = [];
    private _missionText: string = Puzzle.DEFAULT_MISSION_TEXT;
    private _puzzleLocks: boolean[];
    private _shiftLimit: number;
    private _beginningSequence: Sequence;
    private _savedSequence: Sequence;
    private _useTails: boolean = false;
    private _useShortTails: boolean = false;
    private _useBarcode: boolean = false;
    private _barcodeStart: number | null = null;
    private _targetConditions: TargetConditions[] | null = null;
    private _constraints: Constraint<BaseConstraintStatus>[] | null = null;
    private _round: number = -1;
    private _numSubmissions: number = 3;
    private _folder: string;
    private _reward: number = 0;
    private _rscriptOps: string = '';
    private _defaultPoseState: PoseState | null;
    private _nextPuzzle: number = -1;
    private _hint: string | null = null;
    private _isSoftConstraint: boolean = false;
    private _boosterDefs: BoostersData | null = null;
    private _maxVotes: number = 0;
    private _alreadySolved: boolean = false;

    private static readonly T_APTAMER: string[] = ['aptamer', 'aptamer+oligo'];
    private static readonly T_OLIGO: string[] = ['oligo', 'aptamer+oligo'];

    private static readonly DEFAULT_MISSION_TEXT: string = 'Match the desired RNA shape!';
}

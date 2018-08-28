import {Constants} from "../Constants";
import {EPars} from "../EPars";
import {FolderManager} from "../folding/FolderManager";
import {Vienna} from "../folding/Vienna";
import {EternaURL} from "../net/EternaURL";
import {Pose2D} from "../pose2D/Pose2D";
import {ConstraintType} from "./Constraints";

export interface BoostersData {
    mission?: any;
    paint_tools?: any;
    actions?: any;
    mission_cleared?: any;
}

export enum PuzzleType {
    BASIC = "Basic",
    SWITCH_BASIC = "SwitchBasic",
    CHALLENGE = "Challenge",
    EXPERIMENTAL = "Experimental"
}

export enum PoseState {
    NATIVE = "NATIVE",
    FROZEN = "FROZEN",
    TARGET = "TARGET",

    // TODO: move these to another enum;
    // they are only used to communicate events to rscript
    PIP = "PIP",
    NONPIP = "NONPIP",
    SECOND = "SECOND",
}

export class Puzzle {
    public static isAptamerType(tc_type: string): boolean {
        return (Puzzle.T_APTAMER.indexOf(tc_type) >= 0);
    }

    public static isOligoType(tc_type: string): boolean {
        return (Puzzle.T_OLIGO.indexOf(tc_type) >= 0);
    }

    public static probeTail(seq: number[]): number[] {
        if (seq == null) {
            return null;
        }

        seq[0] = EPars.RNABASE_GUANINE;
        seq[1] = EPars.RNABASE_GUANINE;

        let offset: number = seq.length - 20;
        for (let ii: number = 0; ii < 20; ii++) {
            seq[offset + ii] = EPars.RNABASE_LAST20[ii];
        }

        return seq;
    }

    public constructor(nid: number, name: string, puzzleType: PuzzleType) {
        this._nid = nid;
        this._name = name;
        this._puzzleType = puzzleType;

        if (puzzleType === PuzzleType.EXPERIMENTAL) {
            this._folder = FolderManager.instance.lastUsedFolder;
        } else {
            this._folder = Vienna.NAME;
        }
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

    public get hint(): string {
        return this._hint;
    }

    public set hint(txt: string) {
        this._hint = txt;
    }

    public get puzzleType(): PuzzleType {
        return this._puzzleType;
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

    public get targetConditions(): any[] {
        if (this._targetConditions == null) {
            let target_conditions: any[] = [];
            for (let ii: number = 0; ii < this._secstructs.length; ii++) {
                target_conditions.push(null);
            }
            return target_conditions;
        } else {
            return this._targetConditions;
        }
    }

    public get constraints(): string[] {
        return this._constraints;
    }

    public set constraints(constraints: string[]) {
        this._constraints = [];
        let shapes: boolean[] = [];
        let antishapes: boolean[] = [];

        for (let ii = 0; ii < constraints.length; ii += 2) {
            if (constraints[ii] === ConstraintType.SHAPE) {
                shapes[Number(constraints[ii + 1])] = true;
            } else if (constraints[ii] === ConstraintType.ANTISHAPE) {
                antishapes[Number(constraints[ii + 1])] = true;
            }
        }

        for (let ii = shapes.length - 1; ii >= 0; ii--) {
            if (antishapes[ii]) {
                this._constraints.push(ConstraintType.ANTISHAPE);
                this._constraints.push(`${ii}`);
            }

            if (shapes[ii]) {
                this._constraints.push(ConstraintType.SHAPE);
                this._constraints.push(`${ii}`);
            }
        }

        for (let ii = 0; ii < constraints.length; ii += 2) {
            if (constraints[ii] !== ConstraintType.SHAPE
                && constraints[ii] !== ConstraintType.SOFT
                && constraints[ii] !== ConstraintType.ANTISHAPE) {
                this._constraints.push(constraints[ii]);
                this._constraints.push(constraints[ii + 1]);
            } else if (constraints[ii] === ConstraintType.SOFT) {
                this._isSoftConstraint = true;
            }
        }
    }

    public get temporaryConstraints(): string[] {
        return this._tempConstraints;
    }

    public set temporaryConstraints(constraints: string[]) {
        if (constraints != null) {
            this._tempConstraints = constraints.slice();
        } else {
            this._tempConstraints = null;
        }
    }

    /** Returns temporary_constraints, if they're set, else constraints */
    public get curConstraints(): string[] {
        return this.temporaryConstraints || this.constraints;
    }

    public get puzzleLocks(): boolean[] {
        let puzlocks: boolean[];
        let ii: number;

        if (this._puzzleLocks == null && !this._useTails) {
            puzlocks = [];
            for (ii = 0; ii < this._secstructs[0].length; ii++) {
                puzlocks.push(false);
            }
            return puzlocks;
        } else if (this._useTails) {
            puzlocks = [];

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
            for (ii = 0; ii < this._secstructs[0].length; ii++) {
                if (this._puzzleLocks != null) {
                    puzlocks.push(this._puzzleLocks[ii]);
                } else {
                    puzlocks.push(false);
                }
            }

            for (ii = 0; ii < 20; ii++) {
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

    public set objective(objectives: any[]) {
        this._targetConditions = objectives.slice();
        this._secstructs = [];
        let concentration: number;

        for (let ii: number = 0; ii < this._targetConditions.length; ii++) {
            if (this._targetConditions[ii]["secstruct"] == null) {
                throw new Error("Can't find secstruct from a target condition");
            }
            this._secstructs.push(this._targetConditions[ii]["secstruct"]);

            let tc_type: string = this._targetConditions[ii]["type"];
            // Aptamers

            if (Puzzle.isAptamerType(tc_type) && this._targetConditions[ii]["site"] != null) {
                let binding_pairs: any[] = [];
                let binding_site: any[] = this._targetConditions[ii]["site"];
                let target_pairs: number[] = EPars.parenthesisToPairs(this.getSecstruct(ii));

                for (let jj = 0; jj < binding_site.length; jj++) {
                    binding_pairs.push(target_pairs[binding_site[jj]]);
                }

                this._targetConditions[ii]["binding_pairs"] = binding_pairs;
                this._targetConditions[ii]["bonus"] = -0.6 * Math.log(this._targetConditions[ii]["concentration"] / 3) * 100;
            }

            // Simple oligos

            if (Puzzle.isOligoType(tc_type) && this._targetConditions[ii].hasOwnProperty("fold_mode") === false) {
                this._targetConditions[ii]["fold_mode"] = Pose2D.OLIGO_MODE_DIMER;
            }

            if (Puzzle.isOligoType(tc_type) && this._targetConditions[ii]["oligo_sequence"] != null) {
                concentration = 0;
                if (this._targetConditions[ii]["oligo_concentration"] != null) {
                    concentration = this._targetConditions[ii]["oligo_concentration"];
                } else {
                    concentration = 1.0;
                }
                this._targetConditions[ii]["malus"] = -Constants.BOLTZMANN * (Constants.KELVIN_0C + 37) * Math.log(concentration);
            }

            // Multi-strands

            if (this._targetConditions[ii]["type"] === "multistrand") {
                let oligos: any[] = this._targetConditions[ii]["oligos"];
                for (let jj = 0; jj < oligos.length; jj++) {
                    concentration = 0;
                    if (oligos[jj]["concentration"] != null) {
                        concentration = oligos[jj]["concentration"];
                    } else {
                        concentration = 1.0;
                    }
                    oligos[jj]["malus"] = -Constants.BOLTZMANN * (Constants.KELVIN_0C + 37) * Math.log(concentration);
                }
            }
        }
    }

    public set beginningSequence(seq: string) {
        this._beginningSequence = EPars.stringToSequence(seq);
    }

    public set savedSequenceString(seq: string) {
        this._savedSequence = EPars.stringToSequence(seq);
    }

    public set uiSpecs(ui_spec: string[]) {
        this._defaultPoseState = null;
        this._useModes = 0;

        for (let ii: number = 0; ii < ui_spec.length; ii++) {
            if (ui_spec[ii] === "NOMODES") {
                this._useModes = Puzzle.BOOL_FALSE;
            } else if (ui_spec[ii] === "STARTSTATE") {
                this._defaultPoseState = <PoseState>(ui_spec[ii + 1].toUpperCase());
                ii++;
            } else if (ui_spec[ii] === "NOTOOLS") {
                this._useTools = Puzzle.BOOL_FALSE;
            } else if (ui_spec[ii] === "NOPALLETE") {
                this._usePallete = Puzzle.BOOL_FALSE;
            }
        }
    }

    public get boosters(): BoostersData {
        return this._boosterDefs;
    }

    public set boosters(obj: BoostersData) {
        this._boosterDefs = obj;
    }

    public get savedSequence(): number[] {
        return this._savedSequence;
    }

    public get barcodeIndices(): number[] {
        if (!this._useBarcode) {
            return null;
        }

        let ii: number;

        let barcodes: number[] = [];
        let secstruct: string = this.getSecstruct();
        if (this._useTails) {
            for (ii = secstruct.length - 39; ii < secstruct.length - 20; ii++) {
                barcodes.push(ii);
            }
        } else {
            for (ii = secstruct.length - 19; ii < secstruct.length; ii++) {
                barcodes.push(ii);
            }
        }
        return barcodes;
    }

    public get isSoftConstraint(): boolean {
        return this._isSoftConstraint;
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

    public set useBarcode(use_barcode: boolean) {
        this._useBarcode = use_barcode;
    }

    public get isUndoZoomAllowed(): boolean {
        if (this._useTools !== 0) {
            return this._useTools === Puzzle.BOOL_TRUE;
        }

        return true;
    }

    public get isPairBrushAllowed(): boolean {
        let is_basic: boolean = (this._puzzleType !== PuzzleType.BASIC);
        let has_target: boolean = false;
        for (let ii: number = 0; ii < this._constraints.length; ii++) {
            if (this._constraints[ii] === ConstraintType.SHAPE) {
                has_target = true;
            }
        }

        return is_basic || has_target;
    }

    public get areModesAvailable(): boolean {
        if (this._useModes !== 0) {
            return this._useModes === Puzzle.BOOL_TRUE;
        }
        return true;
    }

    public get isPalleteAllowed(): boolean {
        if (this._usePallete !== 0) {
            return this._usePallete === Puzzle.BOOL_TRUE;
        }
        return true;
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

    public set defaultMode(default_mode: PoseState) {
        this._defaultPoseState = default_mode;
    }

    public get isUsingTails(): boolean {
        return this._useTails;
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

    public getSecstructs(index: number = 0): string[] {
        let secstructs: string[] = [];
        for (let ii: number = 0; ii < this._secstructs.length; ii++) {
            secstructs.push(this.getSecstruct(ii));
        }
        return secstructs;
    }

    public getPuzzleName(linked: boolean = false): string {
        if (linked && this._puzzleType !== PuzzleType.EXPERIMENTAL) {
            let url: string = EternaURL.createURL({page: "puzzle", nid: this._nid});
            return `<u><A HREF="${url}" TARGET="_blank">${this._name}</a></u>`;
        }

        return this._name;
    }

    public hasTargetType(tc_type: string): boolean {
        if (this._targetConditions == null) return false;
        for (let ii: number = 0; ii < this._targetConditions.length; ii++) {
            if (this._targetConditions[ii]["type"] === tc_type) {
                return true;
            }
        }
        return false;
    }

    public getBeginningSequence(index: number = 0): number[] {
        let seq: number[] = [];
        if (this._useTails) {
            if (this._useShortTails) {
                seq.push(EPars.RNABASE_GUANINE);
                seq.push(EPars.RNABASE_GUANINE);
            } else {
                seq.push(EPars.RNABASE_GUANINE);
                seq.push(EPars.RNABASE_GUANINE);
                seq.push(EPars.RNABASE_ADENINE);
                seq.push(EPars.RNABASE_ADENINE);
                seq.push(EPars.RNABASE_ADENINE);
            }
        }

        // FIXME: This needs revision, see PoseEditMode:2163
        let len: number = this._beginningSequence != null ? this._beginningSequence.length : this._secstructs[index].length;
        for (let ii: number = 0; ii < len; ii++) {
            if (this._beginningSequence != null) {
                seq.push(this._beginningSequence[ii]);
            } else {
                seq.push(EPars.RNABASE_ADENINE);
            }
        }

        if (this._useTails) {
            for (let ii = 0; ii < 20; ii++) {
                seq.push(EPars.RNABASE_LAST20[ii]);
            }
        }

        return seq;
    }

    public getSubsequenceWithoutBarcode(seq: any[]): any[] {
        if (!this._useBarcode) {
            return seq.slice();
        }
        let minus: number = 19;
        if (this._useTails) {
            minus += 20;
        }

        return seq.slice(0, seq.length - minus);
    }

    public setUseTails(use_tails: boolean, use_short_tails: boolean): void {
        this._useTails = use_tails;
        this._useShortTails = use_short_tails;
    }

    public transformSequence(seq: number[], target_index: number): number[] {
        if (this._targetConditions != null) {
            if (this._targetConditions[target_index]["sequence"] != null) {
                let target_seq_temp: number[] = EPars.stringToSequence(this._targetConditions[target_index]["sequence"]);
                let target_seq: number[] = [];

                if (this._useTails) {
                    if (this._useShortTails) {
                        target_seq.push(EPars.RNABASE_GUANINE);
                        target_seq.push(EPars.RNABASE_GUANINE);
                    } else {
                        target_seq.push(EPars.RNABASE_GUANINE);
                        target_seq.push(EPars.RNABASE_GUANINE);
                        target_seq.push(EPars.RNABASE_ADENINE);
                        target_seq.push(EPars.RNABASE_ADENINE);
                        target_seq.push(EPars.RNABASE_ADENINE);
                    }
                }

                for (let ii: number = 0; ii < target_seq_temp.length; ii++) {
                    target_seq.push(target_seq_temp[ii]);
                }

                if (this._useTails) {
                    for (let ii = 0; ii < 20; ii++) {
                        target_seq.push(EPars.RNABASE_LAST20[ii]);
                    }
                }

                let locks: boolean[] = this.puzzleLocks;

                if (locks.length !== target_seq.length || target_seq.length !== seq.length) {
                    throw new Error("lock length doesn't match object sequence");
                }

                for (let ii = 0; ii < target_seq.length; ii++) {
                    if (!locks[ii]) {
                        target_seq[ii] = seq[ii];
                    }
                }
                return target_seq;
            }
        }
        return seq;
    }

    private readonly _nid: number;
    private readonly _name: string;
    private readonly _puzzleType: PuzzleType;
    private _secstructs: string[] = [];
    private _missionText: string = Puzzle.DEFAULT_MISSION_TEXT;
    private _puzzleLocks: boolean[];
    private _shiftLimit: number;
    private _beginningSequence: number[];
    private _savedSequence: number[];
    private _useTails: boolean = false;
    private _useShortTails: boolean = false;
    private _useBarcode: boolean = false;
    private _targetConditions: any[] = null;
    private _constraints: string[] = null;
    private _tempConstraints: string[];
    private _round: number = -1;
    private _numSubmissions: number = 3;
    private _folder: string;
    private _reward: number = 0;
    private _rscriptOps: string = "";
    private _defaultPoseState: PoseState;
    private _useTools: number = 0;
    private _usePallete: number = 0;
    private _useModes: number = 0;
    private _nextPuzzle: number = -1;
    private _hint: string = null;
    private _isSoftConstraint: boolean = false;
    private _boosterDefs: BoostersData = null;

    private static readonly T_APTAMER: string[] = ["aptamer", "aptamer+oligo"];
    private static readonly T_OLIGO: string[] = ["oligo", "aptamer+oligo"];

    private static readonly BOOL_TRUE: number = 1;
    private static readonly BOOL_FALSE: number = 2;

    private static readonly DEFAULT_MISSION_TEXT: string = "Match the desired RNA shape!";
}

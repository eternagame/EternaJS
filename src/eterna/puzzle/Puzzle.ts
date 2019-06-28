import { Vienna, FolderManager, Folder } from "eterna/folding";
import { SecondaryStructure, Sequence, StrandSubset } from "../util/RNA";
import { RNAScript } from "eterna/rscript";
import Constraint from "eterna/constraints/Constraint";
import { EternaURL } from "eterna/net";
import { Booster } from "eterna/boosters";

export enum PuzzleType {
    BASIC = "Basic", // Deprecated
    SWITCH_BASIC = "SwitchBasic", // Probably deprecated?
    CHALLENGE = "Challenge",
    EXPERIMENTAL = "Experimental",
    PROGRESSION = "Progression"
}

export interface LigandCondition {
    bindingSiteBases: number[];
    bindingPairs: number[];
    concentration: number;
    bonus: number;
    foldVersion?: number;
}

export enum OligoFoldMode {
    DIMER=1,
    EXT3P=2,
    EXT5P=3
}

export interface OligoCondition {
    label?: string;
    name?: string;
    sequence: Sequence;
    concentration?: number;
    malus: number;
    foldMode?: OligoFoldMode;
}

export interface MultistrandCondition {
    name?: string;
    concentration: number;
    malus: number;
    sequence: Sequence;
    bind?: boolean;
}

export interface StateCondition {
    targetStructure: SecondaryStructure;
    structureRequiredBases?: StrandSubset;
    targetAntiStructure?: SecondaryStructure;
    antiStructureRequiredBases?: StrandSubset;
    stateName?: string;
    IUPACBaseRestrictions?: string;
    ligandCondition?: LigandCondition;
    oligoCondition?: OligoCondition;
    multistrandConditions?: MultistrandCondition[];
}

export interface PuzzleOptionalParams {
    nid?: number;
    name?: string;
    puzzleType?: PuzzleType;
    reward?: number;
    nextPuzzleID?: number;
    rscript?: RNAScript;
    hint?: string;
    defaultFolder?: string;
    softConstraints?: boolean;
    locks?: StrandSubset;
    beginningSequence?: Sequence;
    boosters?: Booster[];
    missionText?: string;
    missionClearedMessage?: string;
    missionClearedExtraInfo?: string;
    barcodeIndices?: StrandSubset;
    round?: number;
    submissionsRemaining?: number;
}

export default class Puzzle {
    public id: number;
    public name: string;
    public puzzleType: PuzzleType;
    public stateConditions: StateCondition[];
    public constraints: Constraint[];
    public reward: number;
    public nextPuzzleID: number;
    public rscript: RNAScript;
    public hint: string;
    public defaultFolder: string;
    public softConstraints: boolean;
    public locks: StrandSubset;
    public beginningSequence: Sequence;
    public boosters: Booster[];
    public missionText: string;
    public missionClearedMessage: string;
    public missionClearedExtraInfo: string;
    public barcodeIndices: StrandSubset;
    public round: number;
    public submissionsRemaining: number;

    constructor(
        stateConditions: StateCondition[], constraints: Constraint[],
        {
            nid, name, puzzleType, reward, nextPuzzleID, rscript, hint, defaultFolder,
            softConstraints=false, locks, beginningSequence, boosters,
            missionText="Match the desired RNA shape", missionClearedMessage, missionClearedExtraInfo,
            barcodeIndices, round, submissionsRemaining
        }: PuzzleOptionalParams = {}
    ) {
        this.id = nid;
        this.name = name;
        this.puzzleType = puzzleType;
        this.stateConditions = stateConditions;
        this.constraints = constraints;
        this.reward = reward;
        this.nextPuzzleID = nextPuzzleID;
        this.rscript = rscript;
        this.hint = hint;
        if (defaultFolder) {
            this.defaultFolder = defaultFolder;
        } else if (puzzleType === PuzzleType.EXPERIMENTAL) {
            // TODO: This should be moved into the mode
            this.defaultFolder = FolderManager.instance.lastUsedFolder;
        } else {
            // TODO: Also move into mode
            this.defaultFolder = Vienna.NAME;
        }
        // TODO: Also also move into mode
        if (!this.canUseFolder(FolderManager.instance.getFolder(this.defaultFolder))) {
            this.defaultFolder = FolderManager.instance.getNextFolder(this.defaultFolder, (folder: Folder) => !this.canUseFolder(folder)).name;
        }

        this.softConstraints = softConstraints;
        this.locks = locks || new StrandSubset();
        this.beginningSequence = beginningSequence ||
            new Sequence('A'.repeat(stateConditions[0].targetStructure.strandLength));
        this.boosters = boosters;
        this.missionText = missionText;
        this.missionClearedMessage = missionClearedMessage;
        this.missionClearedExtraInfo = missionClearedExtraInfo;
        this.barcodeIndices = barcodeIndices;
        this.round = round;
        this.submissionsRemaining = submissionsRemaining;
    }

    public get linkedName(): string {
        let url: string = EternaURL.createURL({page: "puzzle", nid: this.id});
            return `<u><A HREF="${url}" TARGET="_blank">${this.name}</a></u>`;
    }

    public toJSON() {
        // TODO
    }

    public canUseFolder(folder: Folder): boolean {
        return !(
            (this.stateConditions.some(cond => cond.multistrandConditions) && !folder.canMultifold)
            || (this.stateConditions.some(cond => cond.ligandCondition) && !folder.canFoldWithBindingSite)
            || (this.stateConditions.some(cond => cond.multistrandConditions) && !folder.canCofold)
        );
    }
}
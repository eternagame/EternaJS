import "assets/styles.css"; // css-loader will pick up on this and embed our stylesheet
import * as log from "loglevel";
import {FlashbangApp} from "flashbang/core";
import {SaveGameManager} from "flashbang/settings";
import {ErrorUtil, TextureUtil} from "flashbang/util";
import ChatManager from "eterna/ChatManager";
import Eterna from "eterna/Eterna";
import {
    Folder, FolderManager, LinearFoldC, LinearFoldV, NuPACK, RNAFoldBasic, Vienna, Vienna2
} from "eterna/folding";
import {
    LoadingMode, FeedbackViewMode, DesignBrowserFilter, DesignBrowserMode,
    PoseEditMode, PoseEditParams, PuzzleEditMode, PuzzleEditPoseData
} from "eterna/mode-old";
import {GameClient} from "eterna/net";
import {
    Puzzle, PuzzleManager, Solution, SolutionManager
} from "eterna/puzzle";
import {Bitmaps, SoundManager} from "eterna/resources";
import {EternaSettings} from "eterna/settings";
import {ExternalInterface, ExternalInterfaceCtx, Fonts} from "eterna/util";

enum PuzzleID {
    FunAndEasy = 4350940,
    Tulip2 = 467887,
    TryptophanASameState = 8787266,
    NandosZippers = 3562529,
    TheRealXORChallenge = 6096060, // multi-state
    AAMismatchPilotRun = 3263276, // locks, tails
    TheophyllineRibozymeSwitch = 2390140, // aux info
    MicrofluidicChip = 6502997, // level 4/7 - MissionCleared info
    AandB_RO = 6892307, // Oligos
    Tutorial1 = 6502927, // rscript
    Tutorial4 = 6502944,
    Tutorial6 = 6502945,
    Tutorial8 = 6502947,
    LiquidRobotics10_of_11 = 6503036, // Script constraints
    EternaCon2018 = 8952159,
    SameState_TryptophanB = 7656242, // Booster paint tool
    TemporalAnomaly = 7796345, // Really big!
    Switch2pt5_left_Right = 8984178, // molecule
    JieuxAppetit_2 = 8980331, // unbound molecule
}

interface SolutionAndPuzzleID {
    puzzleID: number;
    solutionID: number;
}

let CloudLab19Solution: SolutionAndPuzzleID = {
    puzzleID: 2333436,
    solutionID: 2694684
};

export enum InitialAppMode {
    PUZZLE = "puzzle", // load a puzzle
    PUZZLEMAKER = "puzzlemaker", // load the puzzlemaker
    SOLUTION_SEE_RESULT = "solution_see_result", // load a solution into FeedbackViewMode
    SOLUTION_COPY_AND_VIEW = "solution_copy_and_view", // load a solution into PoseEditMode
    DESIGN_BROWSER = "design_browser", // load a puzzle into DesignBrowserMode
}

export interface EternaAppParams {
    containerID?: string;
    chatboxID?: string;
    width?: number;
    height?: number;

    // initialization options
    mode?: InitialAppMode;
    puzzleID?: number;
    solutionID?: number;
    puzzleEditNumTargets?: number;
    folderName?: string;
    sequence?: string;
    designBrowserFilters?: DesignBrowserFilter[];
}

/** Entry point for the game */
export default class EternaApp extends FlashbangApp {
    public constructor(params: EternaAppParams) {
        super();

        // Default param values
        params.mode = params.mode || InitialAppMode.PUZZLE;
        params.containerID = params.containerID || "maingame";
        params.chatboxID = params.chatboxID || "chat-container";
        params.width = params.width || 1280;
        params.height = params.height || 1024;
        params.puzzleID = params.puzzleID || PuzzleID.Tutorial1;
        params.solutionID = params.solutionID || CloudLab19Solution.solutionID;
        params.puzzleEditNumTargets = params.puzzleEditNumTargets || 1;

        this._params = params;

        let eternaContainer: HTMLElement = document.getElementById(params.containerID);
        eternaContainer.style.position = "relative";

        let pixiContainer: HTMLElement = document.createElement("div");
        pixiContainer.id = Eterna.PIXI_CONTAINER_ID;
        eternaContainer.appendChild(pixiContainer);

        let overlay: HTMLElement = document.createElement("div");
        overlay.id = Eterna.OVERLAY_DIV_ID;
        eternaContainer.appendChild(overlay);

        ExternalInterface.init(eternaContainer);
    }

    /* override */
    protected setup(): void {
        Eterna.app = this;
        Eterna.saveManager = new SaveGameManager("EternaSaveGame");
        Eterna.settings = new EternaSettings();
        Eterna.client = new GameClient(Eterna.SERVER_URL);
        Eterna.sound = new SoundManager(Eterna.settings);
        Eterna.chat = new ChatManager(this._params.chatboxID, Eterna.settings);
        Eterna.gameDiv = document.getElementById(this._params.containerID);

        this.setLoadingText("Authenticating...");

        this.authenticate()
            .then(() => {
                this.setLoadingText("Loading assets...");
                return Promise.all([this.initFoldingEngines(), TextureUtil.load(Bitmaps.all), Fonts.loadFonts()]);
            })
            .then(() => this.initScriptInterface())
            .then(async () => {
                switch (this._params.mode) {
                case InitialAppMode.PUZZLEMAKER:
                    return this.loadPuzzleEditor(this._params.puzzleEditNumTargets);
                case InitialAppMode.PUZZLE:
                    return this.loadPoseEdit(this._params.puzzleID, {
                        initialFolder: this._params.folderName,
                        initSequence: this._params.sequence
                    });
                case InitialAppMode.SOLUTION_SEE_RESULT:
                case InitialAppMode.SOLUTION_COPY_AND_VIEW:
                    return this.loadSolutionViewer(this._params.puzzleID, this._params.solutionID,
                        this._params.mode === InitialAppMode.SOLUTION_COPY_AND_VIEW);
                case InitialAppMode.DESIGN_BROWSER:
                    return this.loadDesignBrowser(this._params.puzzleID, this._params.designBrowserFilters);
                default:
                    return Promise.reject(`Unrecognized mode '${this._params.mode}'`);
                }
            })
            .catch((err) => {
                this.popLoadingMode();
                Eterna.onFatalError(err);
            });
    }

    /** Creates a PoseEditMode and removes all other modes from the stack */
    public loadPoseEdit(puzzleOrID: number | Puzzle, params: PoseEditParams): Promise<void> {
        return this.loadPuzzle(puzzleOrID)
            .then(async puzzle => this._modeStack.unwindToMode(new PoseEditMode(
                puzzle,
                params,
                await Eterna.saveManager.load(PoseEditMode.savedDataTokenName(puzzle.nodeID))
            )));
    }

    /** Creates a PuzzleEditMode and removes all other modes from the stack */
    public async loadPuzzleEditor(numTargets?: number, initialPoseData?: PuzzleEditPoseData[]): Promise<void> {
        const initPoseData = initialPoseData
            || await Eterna.saveManager.load(PuzzleEditMode.savedDataTokenName(this._params.puzzleEditNumTargets)) || null;
        this._modeStack.unwindToMode(new PuzzleEditMode(false, numTargets, initPoseData));
        return Promise.resolve();
    }

    /** Creates a FeedbackViewMode (or a PoseEditMode, if loadInPoseEdit is true), and removes all other modes from the stack */
    public loadSolutionViewer(puzzleID: number, solutionID: number, loadInPoseEdit: boolean = false): Promise<void> {
        return this.loadSolution(puzzleID, solutionID)
            .then(([puzzle, solution]) => {
                if (loadInPoseEdit) {
                    this._modeStack.unwindToMode(new PoseEditMode(puzzle, {initSolution: solution}));
                } else {
                    this._modeStack.unwindToMode(new FeedbackViewMode(solution, puzzle));
                }
            });
    }

    /** Creates a DesignBrowser for the given puzzle, and removes all other modes from the stack. */
    public loadDesignBrowser(puzzleOrID: number | Puzzle, initialFilters?: DesignBrowserFilter[]): Promise<void> {
        return this.loadPuzzle(puzzleOrID)
            .then(puzzle => this._modeStack.unwindToMode(new DesignBrowserMode(puzzle, false, initialFilters)));
    }

    /**
     * If a DesignBrowserMode for the given puzzle is already on the mode stack, move it to the top of the stack.
     * Otherwise, push a new DesignBrowserMode to the stack, retaining any existing modes.
     */
    public switchToDesignBrowser(puzzleOrID: number | Puzzle): Promise<void> {
        const puzzleID = (puzzleOrID instanceof Puzzle ? puzzleOrID.nodeID : puzzleOrID);
        const existingBrowser = this.modeStack.modes.find(mode => mode instanceof DesignBrowserMode) as DesignBrowserMode;
        if (existingBrowser != null && existingBrowser.puzzleID == puzzleID) {
            this.modeStack.setModeIndex(existingBrowser, -1);
            return Promise.resolve();
        } else {
            return this.loadPuzzle(puzzleOrID)
                .then((puzzle) => {
                    if (existingBrowser != null) {
                        this.modeStack.removeMode(existingBrowser);
                    }
                    this.modeStack.pushMode(new DesignBrowserMode(puzzle));
                });
        }
    }

    /**
     * If a PoseEditMode for the given puzzle is already on the mode stack, and `canSwitchToExisting` is true,
     * move the existing PoseEditMode to the top of the stack. Otherwise, push a new PoseEditMode to the stack,
     * retaining any existing modes.
     */
    public switchToPoseEdit(puzzleOrID: number | Puzzle, canSwitchToExisting: boolean, params: PoseEditParams = {}): Promise<void> {
        const puzzleID = (puzzleOrID instanceof Puzzle ? puzzleOrID.nodeID : puzzleOrID);
        const existingPoseEdit = this.existingPoseEditMode;
        if (existingPoseEdit != null && canSwitchToExisting && existingPoseEdit.puzzleID == puzzleID) {
            this.modeStack.setModeIndex(existingPoseEdit, -1);
            return Promise.resolve();
        } else {
            return this.loadPuzzle(puzzleOrID)
                .then((puzzle) => {
                    if (existingPoseEdit != null) {
                        this.modeStack.removeMode(existingPoseEdit);
                    }
                    this.modeStack.pushMode(new PoseEditMode(puzzle, params));
                });
        }
    }

    public switchToFeedbackView(puzzleOrID: number | Puzzle, solutionOrID: number | Solution): Promise<void> {
        const puzzleID = (puzzleOrID instanceof Puzzle ? puzzleOrID.nodeID : puzzleOrID);
        const solutionID = (solutionOrID instanceof Solution ? solutionOrID.nodeID : solutionOrID);

        const existingMode = this.modeStack.modes.find(mode => mode instanceof FeedbackViewMode) as FeedbackViewMode;
        if (existingMode != null && existingMode.puzzleID == puzzleID && existingMode.solutionID == solutionID) {
            this.modeStack.setModeIndex(existingMode, -1);
            return Promise.resolve();
        } else {
            return this.loadSolution(puzzleOrID, solutionOrID)
                .then(([puzzle, solution]) => {
                    if (existingMode != null) {
                        this.modeStack.removeMode(existingMode);
                    }
                    this.modeStack.pushMode(new FeedbackViewMode(solution, puzzle));
                });
        }
    }

    /** Returns an existing PoseEditMode, if there's one on the mode stack */
    public get existingPoseEditMode(): PoseEditMode {
        return this.modeStack.modes.find(mode => mode instanceof PoseEditMode) as PoseEditMode;
    }

    private loadSolution(puzzleOrID: number | Puzzle, solutionOrID: number | Solution): Promise<[Puzzle, Solution]> {
        const puzzleID = (puzzleOrID instanceof Puzzle ? puzzleOrID.nodeID : puzzleOrID);
        const solutionID = (solutionOrID instanceof Solution ? solutionOrID.nodeID : solutionOrID);

        const puzzlePromise: Promise<Puzzle> = (puzzleOrID instanceof Puzzle)
            ? Promise.resolve(puzzleOrID)
            : PuzzleManager.instance.getPuzzleByID(puzzleOrID);

        const solutionPromise: Promise<Solution> = (solutionOrID instanceof Solution)
            ? Promise.resolve(solutionOrID)
            : SolutionManager.instance.getSolutionsForPuzzle(puzzleID)
                .then((solutions) => {
                    for (let solution of solutions) {
                        if (solution.nodeID === solutionID) {
                            return Promise.resolve(solution);
                        }
                    }

                    return Promise.reject(
                        `No such solution for given puzzle [puzzleID=${puzzleID}, solutionID=${solutionID}`
                    );
                });

        this.setLoadingText(`Loading solution ${solutionID}...`);
        return Promise.all([puzzlePromise, solutionPromise])
            .then((result) => {
                this.popLoadingMode();
                return result;
            });
    }

    private loadPuzzle(puzzleOrID: number | Puzzle): Promise<Puzzle> {
        if (puzzleOrID instanceof Puzzle) {
            return Promise.resolve(puzzleOrID);
        } else {
            this.setLoadingText(`Loading puzzle ${puzzleOrID}...`);
            return PuzzleManager.instance.getPuzzleByID(puzzleOrID)
                .then((puzzle) => {
                    this.popLoadingMode();
                    return puzzle;
                });
        }
    }

    protected onKeyboardEvent(e: KeyboardEvent): void {
        // if a form element is focused, don't trigger hotkeys
        let selected = document.body.querySelectorAll(":focus")[0];
        if (selected && (["INPUT", "TEXTAREA", "OPTION", "SELECT", "BUTTON"].includes(selected.tagName))) return;

        super.onKeyboardEvent(e);
    }

    protected onUncaughtError(err: any): void {
        let errstring = ErrorUtil.getErrString(err);
        if (errstring.startsWith("Error: Failed to set the 'buffer' property on 'AudioBufferSourceNode'")) {
            log.debug("pixi-sound is misbehaving again");
        } else {
            Eterna.onFatalError(err);
        }
    }

    protected createPixi(): PIXI.Application {
        // When roundPixels is true, the renderer floor()s pixel locations
        // to avoid pixel interpolation. This makes our text look much better,
        // though slow movement animation will end up looking a bit worse.
        // Eterna isn't an animation-heavy game, so the tradeoff seems worth it.

        return new PIXI.Application(this._params.width, this._params.height, {
            backgroundColor: 0x0,
            transparent: true,
            antialias: true,
            roundPixels: true,
            autoResize: true,
            resolution: devicePixelRatio
        });
    }

    protected get pixiParent(): HTMLElement {
        return document.getElementById(Eterna.PIXI_CONTAINER_ID);
    }

    private setLoadingText(text: string): void {
        if (this._modeStack.topMode instanceof LoadingMode) {
            (this._modeStack.topMode as LoadingMode).text = text;
        } else {
            this._modeStack.pushMode(new LoadingMode(text));
        }
    }

    private popLoadingMode(): void {
        if (this._modeStack.topMode instanceof LoadingMode) {
            this._modeStack.removeMode(this._modeStack.topMode);
        }
    }

    private authenticate(): Promise<void> {
        if (!Eterna.DEV_MODE) {
            return Eterna.client.authenticate()
                .then(([username, uid]) => {
                    log.debug(`Authenticated as [name=${username}, uid=${uid}]`);
                    Eterna.setPlayer(username, uid);
                });
        } else {
            let playerID = process.env["DEBUG_PLAYER_ID"];
            // If no player is specified, ensure that no user is authenticated,
            // allowing for testing as a nonauthenticated user
            if (playerID.length === 0) {
                return Eterna.client.logout()
                    .then(() => {
                    })
                    .catch((err) => {
                        log.debug(`Logout error: ${err}`);
                    });
            }

            let playerPassword = process.env["DEBUG_PLAYER_PASSWORD"];
            log.debug(`Logging in ${playerID}...`);
            return Eterna.client.login(playerID, playerPassword).then((uid) => {
                log.debug(`Logged in [name=${playerID}, uid=${uid}]`);
                Eterna.setPlayer(playerID, uid);
            });
        }
    }

    private initFoldingEngines(): Promise<void> {
        log.info("Initializing folding engines...");
        return Promise.all([
            Vienna.create(),
            Vienna2.create(),
            NuPACK.create(),
            LinearFoldC.create(),
            LinearFoldV.create(),
            RNAFoldBasic.create()])
            .then((folders: Folder[]) => {
                log.info("Folding engines intialized");
                for (let folder of folders) {
                    FolderManager.instance.addFolder(folder);
                }
            });
    }

    private initScriptInterface(): void {
        this._scriptInterface.addCallback("test_tutorial", (puzzleID: number, rscript: string): void => {
            this.loadPoseEdit(puzzleID, {rscript, isReset: true})
                .catch(e => Eterna.onFatalError(e));
        });

        this._scriptInterface.addCallback("load_puzzle", (puzzleID: number, doneCallback: string): void => {
            this.loadPoseEdit(puzzleID, {isReset: true})
                .then(() => {
                    ExternalInterface.call(doneCallback);
                })
                .catch(e => Eterna.onFatalError(e));
        });

        ExternalInterface.pushContext(this._scriptInterface);
    }

    private readonly _params: EternaAppParams;
    private readonly _scriptInterface: ExternalInterfaceCtx = new ExternalInterfaceCtx();
}

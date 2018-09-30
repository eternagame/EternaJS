import "assets/styles.css"; // css-loader will pick up on this and embed our stylesheet
import * as log from "loglevel";
import {FlashbangApp} from "../flashbang/core/FlashbangApp";
import {TextureUtil} from "../flashbang/util/TextureUtil";
import {ChatManager} from "./ChatManager";
import {TestMode} from "./debug/TestMode";
import {Eterna} from "./Eterna";
import {Folder} from "./folding/Folder";
import {FolderManager} from "./folding/FolderManager";
import {LinearFold} from "./folding/LinearFold";
import {NuPACK} from "./folding/NuPACK";
import {RNAFoldBasic} from "./folding/RNAFoldBasic";
import {Vienna} from "./folding/Vienna";
import {Vienna2} from "./folding/Vienna2";
import {DesignBrowserFilter, DesignBrowserMode} from "./mode/DesignBrowser/DesignBrowserMode";
import {FeedbackViewMode} from "./mode/FeedbackView/FeedbackViewMode";
import {LoadingMode} from "./mode/LoadingMode";
import {PoseEditMode, PoseEditParams} from "./mode/PoseEdit/PoseEditMode";
import {PuzzleEditMode, PuzzleEditPoseData} from "./mode/PuzzleEdit/PuzzleEditMode";
import {GameClient} from "./net/GameClient";
import {Puzzle} from "./puzzle/Puzzle";
import {PuzzleManager} from "./puzzle/PuzzleManager";
import {Solution} from "./puzzle/Solution";
import {SolutionManager} from "./puzzle/SolutionManager";
import {Bitmaps} from "./resources/Bitmaps";
import {SoundManager} from "./resources/SoundManager";
import {EternaSettings} from "./settings/EternaSettings";
import {ExternalInterface, ExternalInterfaceCtx} from "./util/ExternalInterface";
import {Fonts} from "./util/Fonts";

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
    LiquidRobotics10_of_11 = 6503036,   // Script constraints
    EternaCon2018 = 8952159,
    SameState_TryptophanB = 7656242,    // Booster paint tool
    TemporalAnomaly = 7796345,          // Really big!
    Switch2pt5_left_Right = 8984178,    // molecule
    JieuxAppetit_2 = 8980331,           // unbound molecule
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
    PUZZLE = "puzzle",                                  // load a puzzle
    PUZZLEMAKER = "puzzlemaker",                        // load the puzzlemaker
    SOLUTION_SEE_RESULT = "solution_see_result",        // load a solution into FeedbackViewMode
    SOLUTION_COPY_AND_VIEW = "solution_copy_and_view",  // load a solution into PoseEditMode
    DESIGN_BROWSER = "design_browser",                  // load a puzzle into DesignBrowserMode
    TEST = "test",                                      // load the debugging test mode
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
export class EternaApp extends FlashbangApp {
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
        pixiContainer.id = EternaApp.PIXI_CONTAINER_ID;
        eternaContainer.appendChild(pixiContainer);

        let overlay: HTMLElement = document.createElement("div");
        overlay.id = Eterna.OVERLAY_DIV_ID;
        eternaContainer.appendChild(overlay);

        ExternalInterface.init(eternaContainer);
    }

    /* override */
    protected setup(): void {
        Eterna.app = this;
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
            .then(() => {
                switch (this._params.mode) {
                case InitialAppMode.TEST:
                    this._modeStack.unwindToMode(new TestMode());
                    return Promise.resolve();
                case InitialAppMode.PUZZLEMAKER:
                    return this.loadPuzzleEditor(this._params.puzzleEditNumTargets);
                case InitialAppMode.PUZZLE:
                    return this.loadPoseEdit(this._params.puzzleID, {
                        initialFolder: this._params.folderName,
                        initialSequence: this._params.sequence,
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
            .catch(err => Eterna.onFatalError(err));
    }

    /** Creates a PoseEditMode and removes all other modes from the stack */
    public loadPoseEdit(puzzleOrID: number | Puzzle, params: PoseEditParams): Promise<void> {
        return this.loadPuzzle(puzzleOrID)
            .then(puzzle => this._modeStack.unwindToMode(new PoseEditMode(puzzle, params)));
    }

    /** Creates a PuzzleEditMode and removes all other modes from the stack */
    public loadPuzzleEditor(numTargets?: number, initialPoseData?: PuzzleEditPoseData[]): Promise<void> {
        this._modeStack.unwindToMode(new PuzzleEditMode(false, numTargets, initialPoseData));
        return Promise.resolve();
    }

    /** Creates a FeedbackViewMode (or a PoseEditMode, if loadInPoseEdit is true), and removes all other modes from the stack */
    public loadSolutionViewer(puzzleID: number, solutionID: number, loadInPoseEdit: boolean = false): Promise<void> {
        this.setLoadingText(`Loading solution ${solutionID}...`);
        let loadPuzzle = PuzzleManager.instance.getPuzzleByID(puzzleID);
        let loadSolutions = SolutionManager.instance.getSolutionsForPuzzle(puzzleID);
        return Promise.all([loadPuzzle, loadSolutions])
            .then(([puzzle, solutions]) => {
                let requestedSolution: Solution;
                for (let solution of solutions) {
                    if (solution.nodeID === solutionID) {
                        requestedSolution = solution;
                        break;
                    }
                }

                if (requestedSolution == null) {
                    throw new Error(`No such solution for given puzzle [puzzleID=${puzzleID}, solutionID=${solutionID}`);
                }

                if (loadInPoseEdit) {
                    this._modeStack.unwindToMode(new PoseEditMode(puzzle, {
                        initialSequence: requestedSolution.sequence
                    }));
                } else {
                    this._modeStack.unwindToMode(new FeedbackViewMode(requestedSolution, puzzle));
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
        const existingBrowser =
            this.modeStack.modes.find(mode => mode instanceof DesignBrowserMode) as DesignBrowserMode;
        if (existingBrowser != null && existingBrowser.puzzleID == puzzleID) {
            this.modeStack.setModeIndex(existingBrowser, -1);
            return Promise.resolve();
        } else {
            return this.loadPuzzle(puzzleOrID)
                .then(puzzle => {
                    if (existingBrowser != null) {
                        this.modeStack.removeMode(existingBrowser);
                    }
                    this.modeStack.pushMode(new DesignBrowserMode(puzzle))
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
                .then(puzzle => {
                    if (existingPoseEdit != null) {
                        this.modeStack.removeMode(existingPoseEdit);
                    }
                    this.modeStack.pushMode(new PoseEditMode(puzzle, params))
                });
        }
    }

    /** Returns an existing PoseEditMode, if there's one on the mode stack */
    public get existingPoseEditMode(): PoseEditMode {
        return this.modeStack.modes.find(mode => mode instanceof PoseEditMode) as PoseEditMode;
    }

    private loadPuzzle(puzzleOrID: number | Puzzle): Promise<Puzzle> {
        if (puzzleOrID instanceof Puzzle) {
            return Promise.resolve(puzzleOrID);
        } else {
            this.setLoadingText(`Loading puzzle ${puzzleOrID}...`);
            return PuzzleManager.instance.getPuzzleByID(puzzleOrID)
                .then(puzzle => {
                    this.popLoadingMode();
                    return puzzle;
                });
        }
    }

    protected onUncaughtError(err: any): void {
        Eterna.onFatalError(err);
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
        return document.getElementById(EternaApp.PIXI_CONTAINER_ID);
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
            this._modeStack.popMode();
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
            LinearFold.create(),
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
            this.loadPoseEdit(puzzleID, {rscript: rscript, isReset: true})
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

    private static readonly PIXI_CONTAINER_ID = "pixi-container";
}

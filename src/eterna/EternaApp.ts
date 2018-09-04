import "assets/styles.css"; // css-loader will pick up on this and embed our stylesheet
import * as log from "loglevel";
import {FlashbangApp} from "../flashbang/core/FlashbangApp";
import {TextureUtil} from "../flashbang/util/TextureUtil";
import {Eterna} from "./Eterna";
import {Folder} from "./folding/Folder";
import {FolderManager} from "./folding/FolderManager";
import {LinearFold} from "./folding/LinearFold";
import {NuPACK} from "./folding/NuPACK";
import {RNAFoldBasic} from "./folding/RNAFoldBasic";
import {Vienna} from "./folding/Vienna";
import {Vienna2} from "./folding/Vienna2";
import {FeedbackViewMode} from "./mode/FeedbackView/FeedbackViewMode";
import {LoadingMode} from "./mode/LoadingMode";
import {PoseEditMode} from "./mode/PoseEdit/PoseEditMode";
import {PuzzleEditMode, PuzzleEditPoseData} from "./mode/PuzzleEdit/PuzzleEditMode";
import {GameClient} from "./net/GameClient";
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
    POSE_EDIT = "puzzle",
    PUZZLE_EDIT = "puzzlemaker",
    SOLUTION = "solution",
}

export interface EternaAppParameters {
    initialAppMode?: InitialAppMode;
    containerID?: string,
    width?: number,
    height?: number,
    puzzleID?: number,
    solutionID?: number,
    puzzleEditNumTargets?: number;
    folderName?: string,
}

/** Entry point for the game */
export class EternaApp extends FlashbangApp {
    public constructor(params: EternaAppParameters) {
        super();

        // Default param values
        params.initialAppMode = params.initialAppMode || InitialAppMode.POSE_EDIT;
        params.containerID = params.containerID || "maingame";
        params.width = params.width || 1280;
        params.height = params.height || 1024;
        params.puzzleID = params.puzzleID || CloudLab19Solution.puzzleID;
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

        this.setLoadingText("Authenticating...");

        this.authenticate()
            .then(() => {
                this.setLoadingText("Loading assets...");
                return Promise.all([this.initFoldingEngines(), TextureUtil.load(Bitmaps.all), Fonts.loadFonts()]);
            })
            .then(() => this.initScriptInterface())
            // .then(() => {
            //     this._modeStack.unwindToMode(new TestMode());
            // })
            .then(() => {
                switch (this._params.initialAppMode) {
                case InitialAppMode.PUZZLE_EDIT:
                    return this.loadPuzzleEditor(this._params.puzzleEditNumTargets);
                case InitialAppMode.POSE_EDIT:
                    return this.loadPoseEdit(this._params.puzzleID, this._params.folderName);
                case InitialAppMode.SOLUTION:
                    return this.loadFeedbackView(this._params.puzzleID, this._params.solutionID);
                default:
                    log.warn(`Unrecognized mode '${this._params.initialAppMode}'`);
                    return this.loadPoseEdit(this._params.puzzleID, this._params.folderName);
                }
            })
            .catch(err => Eterna.onFatalError(err));
    }

    public loadPoseEdit(puzzleID: number, folderName?: string, rscript?: string): Promise<void> {
        this.setLoadingText(`Loading puzzle ${puzzleID}...`);
        return PuzzleManager.instance.getPuzzleByID(puzzleID)
            .then(puzzle => {
                let folder: Folder = null;
                if (folderName != null) {
                    if (FolderManager.instance.isFolder(folderName)) {
                        folder = FolderManager.instance.getFolder(folderName)
                    } else {
                        log.warn(`No such folder '${folderName}'`);
                    }
                }
                if (rscript != null) {
                    puzzle.rscript = rscript;
                }
                this._modeStack.unwindToMode(new PoseEditMode(puzzle, null, false, folder));
            });
    }

    public loadPuzzleEditor(numTargets?: number, initialPoseData?: PuzzleEditPoseData[]): Promise<void> {
        this._modeStack.unwindToMode(new PuzzleEditMode(false, numTargets, initialPoseData));
        return Promise.resolve();
    }

    public loadFeedbackView(puzzleID: number, solutionID: number): Promise<void> {
        this.setLoadingText(`Loading solution ${solutionID}...`);
        let loadPuzzle = PuzzleManager.instance.getPuzzleByID(puzzleID);
        let loadSolutions = SolutionManager.instance.getSolutionsByPuzzleNid(puzzleID);
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

                this._modeStack.unwindToMode(new FeedbackViewMode(requestedSolution, puzzle));
            });
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
            backgroundColor: 0x061A34,
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
            this.loadPoseEdit(puzzleID, null, rscript)
                .catch(e => Eterna.onFatalError(e));
        });

        this._scriptInterface.addCallback("load_puzzle", (puzzleID: number, doneCallback: string): void => {
            this.loadPoseEdit(puzzleID)
                .then(() => {
                    ExternalInterface.call(doneCallback);
                })
                .catch(e => Eterna.onFatalError(e));
        });

        ExternalInterface.pushContext(this._scriptInterface);
    }

    private readonly _params: EternaAppParameters;
    private readonly _scriptInterface: ExternalInterfaceCtx = new ExternalInterfaceCtx();

    private static readonly PIXI_CONTAINER_ID = "pixi-container";
}

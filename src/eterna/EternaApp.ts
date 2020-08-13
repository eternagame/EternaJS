import 'assets/Styles/styles.css'; // css-loader will pick up on this and embed our stylesheet
import {settings, Application, utils} from 'pixi.js';
import * as log from 'loglevel';
import {
    FlashbangApp, SaveGameManager, TextureUtil, ErrorUtil, Flashbang, Assert
} from 'flashbang';
import ChatManager from 'eterna/ChatManager';
import Eterna from 'eterna/Eterna';
import {SaveStoreItem} from 'flashbang/settings/SaveGameManager';
import DesignBrowserMode, {DesignBrowserFilter} from './mode/DesignBrowser/DesignBrowserMode';
import ExternalInterface, {ExternalInterfaceCtx} from './util/ExternalInterface';
import EternaSettings from './settings/EternaSettings';
import GameClient from './net/GameClient';
import Bitmaps from './resources/Bitmaps';
import TestMode from './debug/TestMode';
import Puzzle from './puzzle/Puzzle';
import PoseEditMode, {PoseEditParams} from './mode/PoseEdit/PoseEditMode';
import PuzzleEditMode, {PuzzleEditPoseData} from './mode/PuzzleEdit/PuzzleEditMode';
import FeedbackViewMode from './mode/FeedbackViewMode';
import Solution from './puzzle/Solution';
import PuzzleManager from './puzzle/PuzzleManager';
import SolutionManager from './puzzle/SolutionManager';
import LoadingMode from './mode/LoadingMode';
import Vienna from './folding/Vienna';
import Vienna2 from './folding/Vienna2';
import NuPACK from './folding/NuPACK';
import Contrafold from './folding/Contrafold';
import EternaFold from './folding/Eternafold';
import RNAFoldBasic from './folding/RNAFoldBasic';
import FolderManager from './folding/FolderManager';
import LayoutEngineManager from './layout/LayoutEngineManager';
import LayoutEngine from './layout/LayoutEngine';
import RNApuzzler from './layout/RNApuzzler';
import LinearFoldC from './folding/LinearFoldC';
import LinearFoldE from './folding/LinearFoldE';
import LinearFoldV from './folding/LinearFoldV';
import Folder from './folding/Folder';
import RSignals from './rscript/RSignals';

enum PuzzleID {
    FunAndEasy = 4350940,
    Tulip2 = 467887,
    TryptophanASameState = 8787266,
    NandosZippers = 3562529,
    TheRealXORChallenge = 6096060, // multi-state
    AAMismatchPilotRun = 3263276, // locks, tails
    TheophyllineRibozymeSwitch = 2390140, // aux info
    MicrofluidicChip = 6502997, // level 4/7 - MissionCleared info
    AandBRO = 6892307, // Oligos
    Tutorial1 = 6502927, // rscript
    Tutorial4 = 6502944,
    Tutorial6 = 6502945,
    Tutorial8 = 6502947,
    LiquidRobotics10of11 = 6503036, // Script constraints
    EternaCon2018 = 8952159,
    SameStateTryptophanB = 7656242, // Booster paint tool
    TemporalAnomaly = 7796345, // Really big!
    Switch2pt5leftRight = 8984178, // molecule
    JieuxAppetit2 = 8980331, // unbound molecule
    PTCCustomLayout = 9386237 // customLayout
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
    PUZZLE = 'puzzle', // load a puzzle
    PUZZLEMAKER = 'puzzlemaker', // load the puzzlemaker
    SOLUTION_SEE_RESULT = 'solution_see_result', // load a solution into FeedbackViewMode
    SOLUTION_COPY_AND_VIEW = 'solution_copy_and_view', // load a solution into PoseEditMode
    DESIGN_BROWSER = 'design_browser', // load a puzzle into DesignBrowserMode
    TEST = 'test', // load the debugging test mode
}

interface EternaAppParams {
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

interface ProcessedEternaAppParams extends EternaAppParams {
    containerID: string;
    chatboxID: string;
    width: number;
    height: number;
    mode: InitialAppMode;
    puzzleID: number;
    solutionID: number;
    puzzleEditNumTargets: number;
}

/** Entry point for the game */
export default class EternaApp extends FlashbangApp {
    constructor(params: EternaAppParams) {
        super();

        // Default param values
        params.mode = params.mode || InitialAppMode.PUZZLE;
        params.containerID = params.containerID || 'maingame';
        params.chatboxID = params.chatboxID || 'chat-container';
        params.width = params.width || 1280;
        params.height = params.height || 1024;
        params.puzzleID = params.puzzleID || PuzzleID.Tutorial1;
        params.solutionID = params.solutionID || CloudLab19Solution.solutionID;
        params.puzzleEditNumTargets = params.puzzleEditNumTargets || 1;

        this._params = params as ProcessedEternaAppParams;

        let eternaContainer: HTMLElement | null = document.getElementById(params.containerID);
        if (!eternaContainer) {
            throw new Error(`Could not find HTML element with ID ${params.containerID}`);
        }
        eternaContainer.style.position = 'relative';

        let pixiContainer: HTMLElement = document.createElement('div');
        pixiContainer.id = Eterna.PIXI_CONTAINER_ID;
        eternaContainer.appendChild(pixiContainer);

        let overlay: HTMLElement = document.createElement('div');
        overlay.id = Eterna.OVERLAY_DIV_ID;
        eternaContainer.appendChild(overlay);

        ExternalInterface.init(eternaContainer);

        RSignals.pushPuzzle.connect(async (puzzleId) => {
            const puzzle = await PuzzleManager.instance.getPuzzleByID(puzzleId);
            this._modeStack.pushMode(new PoseEditMode(puzzle, {}));
        });

        RSignals.popPuzzle.connect(() => this._modeStack.popMode());
    }

    public run(): void {
        let wasmError = typeof WebAssembly === 'object' ? '' : 'WebAssembly';
        let webGLError = utils.isWebGLSupported() ? '' : 'WebGL';
        let unsupported = wasmError || webGLError;
        if (unsupported) {
            const errorEl = document.createElement('div');
            errorEl.className = 'eterna-support-error';
            const errorText = `
                We're sorry, but your browser configuration is not supported by Eterna.
                <br><br>
                The following feature must be available in order to play: ${unsupported}
                <br><br>
                For troubleshooting tips, pelase visit:
                <a href="https://forum.eternagame.org/t/eterna-browser-support-troubleshooting/3594">
                    https://forum.eternagame.org/t/eterna-browser-support-troubleshooting/3594
                </a>
            `;
            errorEl.innerHTML = errorText;

            let eternaContainer = document.getElementById(this._params.containerID);
            Assert.assertIsDefined(eternaContainer);
            eternaContainer.appendChild(errorEl);
        } else {
            super.run();
        }
    }

    /* override */
    protected setup(): void {
        Eterna.app = this;
        Eterna.saveManager = new SaveGameManager('EternaSaveGame');
        Eterna.settings = new EternaSettings();
        Eterna.client = new GameClient(Eterna.SERVER_URL);
        Eterna.gameDiv = document.getElementById(this._params.containerID);

        Assert.assertIsDefined(this._regs);

        this._regs.add(Eterna.settings.soundMute.connectNotify((mute) => {
            Flashbang.sound.muted = mute;
        }));

        this._regs.add(Eterna.settings.soundVolume.connectNotify((volume) => {
            Flashbang.sound.volume = volume;
        }));

        this.setLoadingText('Authenticating...', null);

        this.authenticate()
            .then(() => {
                // We can only do this now, since we need the username and UID to connect
                Eterna.chat = new ChatManager(this._params.chatboxID, Eterna.settings);
                this.setLoadingText('Loading game...', null);
                return Promise.all([
                    this.initFoldingEngines(),
                    this.initLayoutEngines(),
                    TextureUtil.load(Bitmaps.all)
                ]);
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
                        if (this._params.puzzleID === undefined) {
                            throw new Error("Can't load the puzzle app mode with an undefined Puzzle ID!");
                        }
                        return this.loadPoseEdit(this._params.puzzleID, {
                            initialFolder: this._params.folderName,
                            initSequence: this._params.sequence
                        });
                    case InitialAppMode.SOLUTION_SEE_RESULT:
                    case InitialAppMode.SOLUTION_COPY_AND_VIEW:
                        if (this._params.puzzleID === undefined) {
                            throw new Error("Can't load the solution app mode with an undefined Puzzle ID!");
                        }
                        if (this._params.solutionID === undefined) {
                            throw new Error("Can't load the solution app mode with an undefined Solution ID!");
                        }
                        return this.loadSolutionViewer(this._params.puzzleID, this._params.solutionID,
                            this._params.mode === InitialAppMode.SOLUTION_COPY_AND_VIEW);
                    case InitialAppMode.DESIGN_BROWSER:
                        if (this._params.puzzleID === undefined) {
                            throw new Error("Can't load the design browser with an undefined Puzzle ID!");
                        }
                        return this.loadDesignBrowser(this._params.puzzleID, this._params.designBrowserFilters);
                    default:
                        return Promise.reject(new Error(`Unrecognized mode '${this._params.mode}'`));
                }
            })
            .catch((err) => {
                this.popLoadingMode();
                Eterna.onFatalError(err);
            });
    }

    /** Creates a PoseEditMode and removes all other modes from the stack */
    public async loadPoseEdit(puzzleOrID: number | Puzzle, params: PoseEditParams) {
        const puzzle = await this.loadPuzzle(puzzleOrID);

        let autoSaveData: SaveStoreItem | null = null;

        const hasRscript = Boolean(puzzle.rscript) && (puzzle.rscript.trim().length > 0);
        if (hasRscript) {
            // Clear saved progress if puzzle has a tutorial script
            await Eterna.saveManager.remove(PoseEditMode.savedDataTokenName(puzzle.nodeID));
        } else {
            autoSaveData = await Eterna.saveManager.load(PoseEditMode.savedDataTokenName(puzzle.nodeID));
        }

        await this._modeStack.unwindToMode(new PoseEditMode(puzzle, params, autoSaveData));
    }

    /** Creates a PuzzleEditMode and removes all other modes from the stack */
    public async loadPuzzleEditor(numTargets?: number, initialPoseData?: SaveStoreItem): Promise<void> {
        if (this._params.puzzleEditNumTargets === undefined) {
            throw new Error("puzzleEditNumTargets can't be undefined here!");
        }
        const initPoseData = initialPoseData
            || await Eterna.saveManager.load(PuzzleEditMode.savedDataTokenName(this._params.puzzleEditNumTargets))
            || undefined;
        this._modeStack.unwindToMode(new PuzzleEditMode(false, numTargets, initPoseData));
        return Promise.resolve();
    }

    /**
     * Creates a FeedbackViewMode (or a PoseEditMode, if loadInPoseEdit is true),
     * and removes all other modes from the stack
     */
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
            .then((puzzle) => this._modeStack.unwindToMode(new DesignBrowserMode(puzzle, false, initialFilters)));
    }

    /**
     * If a DesignBrowserMode for the given puzzle is already on the mode stack, move it to the top of the stack.
     * Otherwise, push a new DesignBrowserMode to the stack, retaining any existing modes.
     */
    public switchToDesignBrowser(
        puzzleOrID: number | Puzzle,
        solution?: Solution,
        sortOnSolution: boolean = false
    ): Promise<void> {
        const puzzleID = (puzzleOrID instanceof Puzzle ? puzzleOrID.nodeID : puzzleOrID);
        Assert.assertIsDefined(this.modeStack.modes);
        const existingBrowser = this.modeStack.modes.find(
            (mode) => mode instanceof DesignBrowserMode
        ) as DesignBrowserMode;
        if (existingBrowser != null && existingBrowser.puzzleID === puzzleID) {
            this.modeStack.setModeIndex(existingBrowser, -1);
            if (sortOnSolution && solution) {
                existingBrowser.sortOnSolution(solution);
            }
            return Promise.resolve();
        } else {
            return this.loadPuzzle(puzzleOrID)
                .then((puzzle) => {
                    if (existingBrowser != null) {
                        this.modeStack.removeMode(existingBrowser);
                    }
                    this.modeStack.pushMode(new DesignBrowserMode(puzzle, false, null, solution));
                });
        }
    }

    /**
     * If a PoseEditMode for the given puzzle is already on the mode stack, and `canSwitchToExisting` is true,
     * move the existing PoseEditMode to the top of the stack. Otherwise, push a new PoseEditMode to the stack,
     * retaining any existing modes.
     */
    public switchToPoseEdit(
        puzzleOrID: number | Puzzle, canSwitchToExisting: boolean, params: PoseEditParams = {}
    ): Promise<void> {
        const puzzleID = (puzzleOrID instanceof Puzzle ? puzzleOrID.nodeID : puzzleOrID);
        const existingPoseEdit = this.existingPoseEditMode;
        if (existingPoseEdit != null && canSwitchToExisting && existingPoseEdit.puzzleID === puzzleID) {
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

        Assert.assertIsDefined(this.modeStack.modes);
        const existingMode = this.modeStack.modes.find((mode) => mode instanceof FeedbackViewMode) as FeedbackViewMode;
        if (existingMode != null && existingMode.puzzleID === puzzleID && existingMode.solutionID === solutionID) {
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
        Assert.assertIsDefined(this.modeStack.modes);
        return this.modeStack.modes.find((mode) => mode instanceof PoseEditMode) as PoseEditMode;
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
                        new Error(`No such solution for given puzzle [puzzleID=${puzzleID}, solutionID=${solutionID}`)
                    );
                });

        this.setLoadingText(`Loading solution ${solutionID}...`, null);
        return Promise.all([puzzlePromise, solutionPromise])
            .then((result) => {
                this.popLoadingMode();
                return result;
            });
    }

    private async loadPuzzle(puzzleOrID: number | Puzzle): Promise<Puzzle> {
        if (puzzleOrID instanceof Puzzle) {
            return puzzleOrID;
        } else {
            this.setLoadingText('Loading puzzle...', null);
            let puzzle = await PuzzleManager.instance.getPuzzleByID(puzzleOrID);
            this.popLoadingMode();
            return puzzle;
        }
    }

    protected onKeyboardEvent(e: KeyboardEvent): void {
        // if a form element is focused, don't trigger hotkeys
        let selected = document.body.querySelectorAll(':focus')[0];
        if (selected && (['INPUT', 'TEXTAREA', 'OPTION', 'SELECT', 'BUTTON'].includes(selected.tagName))) return;

        super.onKeyboardEvent(e);
    }

    protected onUncaughtError(err: ErrorEvent): void {
        let errstring = ErrorUtil.getErrString(err);
        if (errstring.startsWith("Error: Failed to set the 'buffer' property on 'AudioBufferSourceNode'")) {
            log.debug('pixi-sound is misbehaving again');
        } else {
            Eterna.onFatalError(err);
        }
    }

    protected createPixi(): Application {
        // When roundPixels is true, the renderer floor()s pixel locations
        // to avoid pixel interpolation. This makes our text look much better,
        // though slow movement animation will end up looking a bit worse.
        // Eterna isn't an animation-heavy game, so the tradeoff seems worth it.

        settings.ROUND_PIXELS = true;

        return new Application({
            width: this._params.width,
            height: this._params.height,
            backgroundColor: 0x0,
            transparent: true,
            antialias: true,
            autoDensity: true,
            resolution: devicePixelRatio
        });
    }

    protected get pixiParent(): HTMLElement | null {
        return document.getElementById(Eterna.PIXI_CONTAINER_ID);
    }

    private setLoadingText(text: string, extraBlurbText: string | null): void {
        if (this._modeStack.topMode instanceof LoadingMode) {
            (this._modeStack.topMode as LoadingMode).text = text;
            if (extraBlurbText) (this._modeStack.topMode as LoadingMode).extraBlurbText = extraBlurbText;
        } else {
            this._modeStack.pushMode(new LoadingMode(text, extraBlurbText));
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
            const playerID = process.env['DEBUG_PLAYER_ID'];
            // If no player is specified, ensure that no user is authenticated,
            // allowing for testing as a nonauthenticated user
            if (playerID === undefined || playerID.length === 0) {
                return Eterna.client.logout()
                    .catch((err) => {
                        log.debug(`Logout error: ${err}`);
                    });
            }

            let playerPassword = process.env['DEBUG_PLAYER_PASSWORD'];
            if (playerPassword === undefined || playerPassword.length === 0) {
                return Eterna.client.logout()
                    .then(() => {
                    })
                    .catch((err) => {
                        log.debug(`Logout error: ${err}`);
                    });
            }
            log.debug(`Logging in ${playerID}...`);
            return Eterna.client.login(playerID, playerPassword).then((uid) => {
                log.debug(`Logged in [name=${playerID}, uid=${uid}]`);
                Eterna.setPlayer(playerID, uid);
            });
        }
    }

    private initFoldingEngines(): Promise<void> {
        log.info('Initializing folding engines...');
        return Promise.all([
            Vienna.create(),
            Vienna2.create(),
            NuPACK.create(),
            LinearFoldC.create(),
            LinearFoldE.create(),
            LinearFoldV.create(),
            Contrafold.create(),
            EternaFold.create(),
            RNAFoldBasic.create()])
            .then((folders: (Folder | null)[]) => {
                log.info('Folding engines intialized');
                for (let folder of folders) {
                    if (folder !== null) {
                        FolderManager.instance.addFolder(folder);
                    }
                }
            });
    }

    private initLayoutEngines(): Promise<void> {
        log.info('Initializing layout engines...');
        return Promise.all([RNApuzzler.create()])
            .then((layoutEngines: LayoutEngine[]) => {
                log.info('Layout engines intialized');
                for (let layoutEngine of layoutEngines) {
                    LayoutEngineManager.instance.addLayoutEngine(layoutEngine);
                }
            });
    }

    private initScriptInterface(): void {
        this._scriptInterface.addCallback('test_tutorial', (puzzleID: number, rscript: string): void => {
            this.loadPoseEdit(puzzleID, {rscript, isReset: true})
                .catch((e) => Eterna.onFatalError(e));
        });

        this._scriptInterface.addCallback('load_puzzle', (puzzleID: number, doneCallback: string): void => {
            this.loadPoseEdit(puzzleID, {isReset: true})
                .then(() => {
                    ExternalInterface.call(doneCallback);
                })
                .catch((e) => Eterna.onFatalError(e));
        });

        ExternalInterface.pushContext(this._scriptInterface);
    }

    private readonly _params: ProcessedEternaAppParams;
    private readonly _scriptInterface: ExternalInterfaceCtx = new ExternalInterfaceCtx();
}

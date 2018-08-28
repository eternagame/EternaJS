import * as log from "loglevel";
import {FlashbangApp} from "../flashbang/core/FlashbangApp";
import {TextureUtil} from "../flashbang/util/TextureUtil";
import {TestMode} from "./debug/TestMode";
import {Eterna} from "./Eterna";
import {Folder} from "./folding/Folder";
import {FolderManager} from "./folding/FolderManager";
import {LinearFold} from "./folding/LinearFold";
import {NuPACK} from "./folding/NuPACK";
import {RNAFoldBasic} from "./folding/RNAFoldBasic";
import {Vienna} from "./folding/Vienna";
import {Vienna2} from "./folding/Vienna2";
import {LoadingMode} from "./mode/LoadingMode";
import {PoseEditMode} from "./mode/PoseEdit/PoseEditMode";
import {PuzzleEditMode} from "./mode/PuzzleEdit/PuzzleEditMode";
import {GameClient} from "./net/GameClient";
import {PuzzleManager} from "./puzzle/PuzzleManager";
import {Bitmaps} from "./resources/Bitmaps";
import {EternaSettings} from "./settings/EternaSettings";
import {ExternalInterface} from "./util/ExternalInterface";
import {Fonts} from "./util/Fonts";
import {SoundManager} from "./resources/SoundManager";

// css-loader will pick up on this and embed our stylesheet
import "assets/styles.css";

enum PuzzleID {
    FunAndEasy = 4350940,
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

export enum InitialAppMode {
    POSE_EDIT = "puzzle",
    PUZZLE_EDIT = "puzzlemaker",
}

export interface EternaAppParameters {
    initialAppMode?: InitialAppMode;
    containerID?: string,
    width?: number,
    height?: number,
    puzzleID?: number,
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
        params.puzzleID = params.puzzleID || PuzzleID.SameState_TryptophanB;
        params.puzzleEditNumTargets = params.puzzleEditNumTargets || 1;

        this._params = params;

        const containerID = params.containerID || "maingame";
        let eternaContainer: HTMLElement = document.getElementById(containerID);
        eternaContainer.style.position = "relative";

        let pixiContainer: HTMLElement = document.createElement("div");
        pixiContainer.id = EternaApp.PIXI_CONTAINER_ID;
        eternaContainer.appendChild(pixiContainer);

        let overlay: HTMLElement = document.createElement("div");
        overlay.id = Eterna.OVERLAY_DIV_ID;
        eternaContainer.appendChild(overlay);

        ExternalInterface.init(eternaContainer);
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

    /* override */
    protected setup(): void {
        Eterna.settings = new EternaSettings();
        Eterna.client = new GameClient(Eterna.serverURL);
        Eterna.sound = new SoundManager(Eterna.settings);

        this.setLoadingText("Authenticating...");

        this.authenticate()
            .then(() => {
                this.setLoadingText("Loading assets...");
                return Promise.all([this.initFoldingEngines(), TextureUtil.load(Bitmaps.all), Fonts.loadFonts()]);
            })
            // .then(() => {
            //     this._modeStack.unwindToMode(new TestMode());
            // })
            .then(() => {
                switch (this._params.initialAppMode) {
                case InitialAppMode.PUZZLE_EDIT:
                    return this.loadPuzzleEditor(this._params.puzzleEditNumTargets);
                case InitialAppMode.POSE_EDIT:
                    return this.loadPoseEdit(this._params.puzzleID, this._params.folderName);
                default:
                    log.warn(`Unrecognized mode '${this._params.initialAppMode}'`);
                    return this.loadPoseEdit(this._params.puzzleID, this._params.folderName);
                }
            })
            .catch(err => Eterna.onFatalError(err));
    }

    protected onUncaughtError(err: any): void {
        Eterna.onFatalError(err);
    }

    private setLoadingText(text: string): void {
        if (this._modeStack.topMode instanceof LoadingMode) {
            (this._modeStack.topMode as LoadingMode).text = text;
        } else {
            this._modeStack.pushMode(new LoadingMode(text));
        }
    }

    public loadPoseEdit(puzzleID: number, folderName: string): Promise<void> {
        this.setLoadingText(`Loading puzzle ${this._params.puzzleID}...`);
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
                this._modeStack.unwindToMode(new PoseEditMode(puzzle, null, false, folder));
            });
    }

    public loadPuzzleEditor(numTargets: number): Promise<void> {
        this._modeStack.unwindToMode(new PuzzleEditMode(false, numTargets));
        return Promise.resolve();
    }

    private authenticate(): Promise<void> {
        if (!Eterna.isDebugMode) {
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
                    .then(() => {})
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

    private readonly _params: EternaAppParameters;

    private static readonly PIXI_CONTAINER_ID = "pixi-container";
}

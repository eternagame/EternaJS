import * as log from "loglevel";
import {FlashbangApp} from "../flashbang/core/FlashbangApp";
import {TextureUtil} from "../flashbang/util/TextureUtil";
import {TestMode} from "./debug/TestMode";
import {Eterna} from "./Eterna";
import {Folder} from "./folding/Folder";
import {FolderManager} from "./folding/FolderManager";
import {NuPACK} from "./folding/NuPACK";
import {RNAFoldBasic} from "./folding/RNAFoldBasic";
import {Vienna} from "./folding/Vienna";
import {Vienna2} from "./folding/Vienna2";
import {LoadingMode} from "./mode/LoadingMode";
import {PoseEditMode} from "./mode/PoseEdit/PoseEditMode";
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
}

interface EternaAppParameters {
    containerID?: string,
    width?: number,
    height?: number,
    puzzleID?: number,
}

/** Entry point for the game */
export class EternaApp extends FlashbangApp {
    public constructor({containerID = "maingame", width, height, puzzleID}: EternaAppParameters) {
        super();

        let eternaContainer: HTMLElement = document.getElementById(containerID);
        eternaContainer.style.position = "relative";

        let pixiContainer: HTMLElement = document.createElement("div");
        pixiContainer.id = EternaApp.PIXI_CONTAINER_ID;
        eternaContainer.appendChild(pixiContainer);

        let overlay: HTMLElement = document.createElement("div");
        overlay.id = Eterna.OVERLAY_DIV_ID;
        eternaContainer.appendChild(overlay);

        if (width) this._width = width;
        if (height) this._height = height;
        if (puzzleID) this._puzzleID = puzzleID;

        ExternalInterface.init(eternaContainer);
    }

    protected createPixi(): PIXI.Application {
        // When roundPixels is true, the renderer floor()s pixel locations
        // to avoid pixel interpolation. This makes our text look much better,
        // though slow movement animation will end up looking a bit worse.
        // Eterna isn't an animation-heavy game, so the tradeoff seems worth it.
        PIXI.settings.RENDER_OPTIONS.roundPixels = true;
        return new PIXI.Application(this._width, this._height, {backgroundColor: 0x061A34/*, forceCanvas: true*/});
    }

    protected get pixiParent(): HTMLElement {
        return document.getElementById(EternaApp.PIXI_CONTAINER_ID);
    }

    /* override */
    protected setup(): void {
        Eterna.settings = new EternaSettings();
        Eterna.client = new GameClient(process.env["APP_SERVER_URL"]);
        Eterna.sound = new SoundManager(Eterna.settings);

        let loadingMode = new LoadingMode("");
        this._modeStack.unwindToMode(loadingMode);

        Fonts.loadFonts()
            .then(() => {
                loadingMode.text = "Authenticating...";
                return this.authenticate();
            })
            .then(() => {
                loadingMode.text = "Loading assets...";
                return Promise.all([this.initFoldingEngines(), TextureUtil.load(Bitmaps.all)]);
            })
            // .then(() => {
            //     this._modeStack.unwindToMode(new TestMode());
            // })
            .then(() => {
                loadingMode.text = `Loading puzzle ${this._puzzleID}...`;
                return PuzzleManager.instance.get_puzzle_by_nid(this._puzzleID);
            })
            .then((puzzle) => {
                this._modeStack.unwindToMode(new PoseEditMode(puzzle, null, false));
            })
            .catch(err => Eterna.onFatalError(err));
    }

    protected onUncaughtError(err: any): void {
        Eterna.onFatalError(err);
    }

    private authenticate(): Promise<void> {
        if (!Eterna.is_debug_mode) {
            return Eterna.client.authenticate()
                .then(([username, uid]) => {
                    log.debug(`Authenticated as [name=${username}, uid=${uid}]`);
                    Eterna.set_player(username, uid);
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
                Eterna.set_player(playerID, uid);
            });
        }
    }

    private initFoldingEngines(): Promise<void> {
        log.info("Initializing folding engines...");
        return Promise.all([Vienna.create(), Vienna2.create(), NuPACK.create(), RNAFoldBasic.create()])
            .then((folders: Folder[]) => {
                log.info("Folding engines intialized");
                for (let folder of folders) {
                    FolderManager.instance.add_folder(folder);
                }
            });
    }

    private readonly _width: number = 1280;
    private readonly _height: number = 1024;
    private readonly _puzzleID: number = PuzzleID.AAMismatchPilotRun;

    private static readonly PIXI_CONTAINER_ID = "pixi-container";
}

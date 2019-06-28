import * as log from "loglevel";
import {Flashbang} from "flashbang/core";
import {SaveGameManager} from "../flashbang/settings";
import {ErrorUtil} from "flashbang/util";
import ChatManager from "eterna/ChatManager";
import EternaApp from "eterna/EternaApp";
import {ErrorDialogMode} from "eterna/mode-old";
import {GameClient} from "eterna/net";
import {EternaSettings} from "eterna/settings";
import {SoundManager} from "eterna/resources";

/** Constants and global managers */
export default class Eterna {
    public static readonly OVERLAY_DIV_ID = "overlay";
    public static readonly PIXI_CONTAINER_ID = "pixi-container";
    public static readonly MAX_PUZZLE_EDIT_LENGTH = 400; // max length of PuzzleEditMode input

    public static readonly DEV_MODE: boolean = ParseBool(process.env["DEBUG"]);
    public static readonly SERVER_URL: string = GetServerURL();

    public static gameDiv: HTMLElement;

    public static app: EternaApp;
    public static settings: EternaSettings;
    public static saveManager: SaveGameManager;
    public static client: GameClient;
    public static sound: SoundManager;
    public static chat: ChatManager;

    public static playerID: number;
    public static playerName: string;

    public static setPlayer(name: string, id: number): void {
        this.playerName = name;
        this.playerID = id;
    }

    public static onFatalError(err: any): void {
        log.error("Fatal error error", ErrorUtil.getErrorObj(err) || ErrorUtil.getErrString(err));
        if (Flashbang.app != null
            && Flashbang.app.modeStack != null
            && !(Flashbang.app.modeStack.topMode instanceof ErrorDialogMode)) {
            Flashbang.app.modeStack.pushMode(new ErrorDialogMode(err));
        } else if (process.env.NODE_ENV !== "production") {
            try {
                alert(ErrorUtil.getErrorObj(err) || ErrorUtil.getErrString(err));
            } catch (alertError) {
                log.error("An error occurred while trying to display an error", alertError);
            }
        }
    }
}

/** Return env.APP_SERVER_URL; if unspecified, default to window.location.origin */
function GetServerURL(): string {
    const url = process.env["APP_SERVER_URL"];
    return (url != null && url != "" ? url : window.location.origin);
}

function ParseBool(value: string): boolean {
    return value.toLowerCase() === "true";
}

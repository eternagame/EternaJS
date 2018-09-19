import * as log from "loglevel";
import {ErrorUtil} from "../flashbang/util/ErrorUtil";
import {ChatManager} from "./ChatManager";
import {EternaApp} from "./EternaApp";
import {GameClient} from "./net/GameClient";
import {EternaSettings} from "./settings/EternaSettings";
import {SoundManager} from "./resources/SoundManager";

/** Constants and global managers */
export class Eterna {
    public static readonly OVERLAY_DIV_ID = "overlay";
    public static readonly MAX_PUZZLE_EDIT_LENGTH = 400; // max length of PuzzleEditMode input

    public static readonly DEV_MODE: boolean = ParseBool(process.env["DEBUG"]);
    public static readonly SERVER_URL: string = GetServerURL();

    public static gameDiv: HTMLElement;

    public static app: EternaApp;
    public static settings: EternaSettings;
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
        let errstring = ErrorUtil.getErrString(err);

        if (errstring.startsWith("Error: Failed to set the 'buffer' property on 'AudioBufferSourceNode'")) {
            log.debug("pixi-sound is misbehaving again");
            return;
        }

        log.error("Uncaught error", ErrorUtil.getErrorObj(err) || errstring);
        if (process.env.NODE_ENV !== "production") {
            try {
                alert(ErrorUtil.getErrorObj(err) || errstring);
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

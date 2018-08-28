import * as log from "loglevel";
import {ErrorUtil} from "../flashbang/util/ErrorUtil";
import {GameClient} from "./net/GameClient";
import {EternaSettings} from "./settings/EternaSettings";
import {SoundManager} from "./resources/SoundManager";

/** Constants and global managers */
export class Eterna {
    public static readonly OVERLAY_DIV_ID = "overlay";
    public static readonly MAX_PUZZLE_EDIT_LENGTH = 400; // max length of PuzzleEditMode input

    public static settings: EternaSettings;

    public static playerID: number;
    public static playerName: string;
    public static readonly isDevMode: boolean = true; // TODO: what does this mean?
    public static readonly isDebugMode: boolean = parseBool(process.env["DEBUG"]);
    public static readonly serverURL: string = process.env["APP_SERVER_URL"];

    public static client: GameClient;
    public static sound: SoundManager;

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

        log.error("Uncaught error", errstring);
        if (process.env.NODE_ENV !== "production") {
            try {
                alert(errstring);
            } catch (e) {
                log.error("An error occurred while trying to display an error", e);
            }
        }
    }
}

function parseBool(value: string): boolean {
    return value.toLowerCase() === "true";
}

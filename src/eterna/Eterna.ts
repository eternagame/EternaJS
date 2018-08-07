import * as log from "loglevel";
import {ErrorUtil} from "../flashbang/util/ErrorUtil";
import {GameClient} from "./net/GameClient";
import {EternaSettings} from "./settings/EternaSettings";
import {SoundManager} from "./resources/SoundManager";

/** Constants and managers */
export class Eterna {
    public static readonly OVERLAY_DIV_ID: string = "overlay";

    public static settings: EternaSettings;

    public static player_id: number;
    public static player_name: string;
    public static readonly is_dev_mode: boolean = true; // TODO: what does this mean?
    public static readonly is_debug_mode: boolean = parseBool(process.env["DEBUG"]);

    public static client: GameClient;
    public static sound: SoundManager;

    public static set_player(player_name: string, uid: number): void {
        this.player_name = player_name;
        this.player_id = uid;
    }

    public static onFatalError(err: any): void {
        let errstring = ErrorUtil.getErrString(err);

        if (errstring.startsWith("Error: Failed to set the 'buffer' property on 'AudioBufferSourceNode'")) {
            log.debug("TODO: Tim, fix this audio bug");
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

import * as log from "loglevel";
import {GameClient} from "./net/GameClient";

/** Constants and managers */
export class Eterna {
    public static readonly GET_URI: String = "/get/";
    public static readonly POST_URI: String = "/post/";

    public static player_id: number = 1;
    public static is_dev_mode: boolean = true;

    public static client: GameClient;

    public static onFatalError(err: any): void {
        log.error("Uncaught error", err);
    }
}

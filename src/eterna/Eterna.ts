import * as log from "loglevel";
import {GameClient} from "./net/GameClient";
import {EternaSettings} from "./settings/EternaSettings";

/** Constants and managers */
export class Eterna {
    public static settings: EternaSettings;

    public static player_id: number = 1;
    public static is_dev_mode: boolean = true;

    public static client: GameClient;

    public static onFatalError(err: any): void {
        log.error("Uncaught error", err);
    }
}

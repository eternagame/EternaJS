import * as log from "loglevel";
import {ErrorUtil} from "../flashbang/util/ErrorUtil";
import {GameClient} from "./net/GameClient";
import {EternaSettings} from "./settings/EternaSettings";
import {SoundManager} from "./util/SoundManager";

/** Constants and managers */
export class Eterna {
    public static settings: EternaSettings;

    public static player_id: number = 1;
    public static is_dev_mode: boolean = true;

    public static client: GameClient;
    public static sound: SoundManager;

    public static onFatalError(err: any): void {
        log.error("Uncaught error", ErrorUtil.getErrString(err));

        if (process.env.NODE_ENV !== "production") {
            try {
                alert(ErrorUtil.getErrString(err));
            } catch (e) {
                log.error("An error occurred while trying to display an error", e);
            }
        }
    }
}

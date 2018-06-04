import * as log from 'loglevel';
import {Application} from "pixi.js";
import {FlashbangApp} from "../flashbang/core/FlashbangApp";
import {PoseTestMode} from "./debug/PoseTestMode";
import {Eterna} from "./Eterna";
import {Folder} from "./folding/Folder";
import {FolderManager} from "./folding/FolderManager";
import {Vienna} from "./folding/Vienna";
import {GameClient} from "./net/GameClient";
import {Fonts} from "./util/Fonts";

export class EternaApp extends FlashbangApp {
    protected createPixi(): Application {
        return new Application(1024, 768, {backgroundColor: 0x061A34});
    }

    /*override*/
    protected setup(): void {
        Eterna.client = new GameClient(process.env['APP_SERVER_URL']);

        Promise.all([this.initFoldingEngines(), Fonts.loadFonts()])
            .then(() => {
                this._modeStack.pushMode(new PoseTestMode());
            })
            .catch((err) => Eterna.onFatalError(err));
    }

    private initFoldingEngines(): Promise<void> {
        log.info("Initializing folding engines...");
        return Promise.all([Vienna.create()])
            .then((folders: Folder[]) => {
                log.info("Folding engines intialized");
                for (let folder of folders) {
                    FolderManager.instance.add_folder(folder);
                }
            })
            .catch((e) => log.error("Error loading folding engines: ", e));
    }
}

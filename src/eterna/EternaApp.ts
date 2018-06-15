import * as log from 'loglevel';
import {FlashbangApp} from "../flashbang/core/FlashbangApp";
import {TextureUtil} from "../flashbang/util/TextureUtil";
import {PoseTestMode} from "./debug/PoseTestMode";
import {Eterna} from "./Eterna";
import {Folder} from "./folding/Folder";
import {FolderManager} from "./folding/FolderManager";
import {NuPACK} from "./folding/NuPACK";
import {Vienna} from "./folding/Vienna";
import {Vienna2} from "./folding/Vienna2";
import {LoadingMode} from "./mode/LoadingMode";
import {PoseEditMode} from "./mode/PoseEdit/PoseEditMode";
import {GameClient} from "./net/GameClient";
import {PuzzleManager} from "./puzzle/PuzzleManager";
import {BitmapManager} from "./util/BitmapManager";
import {Fonts} from "./util/Fonts";

enum PuzzleID {
    FunAndEasy = 4350940,
    TryptophanASameState = 8787266,
    NandosZippers = 3562529,
    TheRealXORChallenge = 6096060,  // multi-state
}

export class EternaApp extends FlashbangApp {
    protected createPixi(): PIXI.Application {
        return new PIXI.Application(1024, 768, {backgroundColor: 0x061A34});
    }

    /*override*/
    protected setup(): void {
        Eterna.client = new GameClient(process.env['APP_SERVER_URL']);

        Fonts.loadFonts()
            .then(() => {
                this._modeStack.unwindToMode(new LoadingMode("Loading assets..."));
                return Promise.all([this.initFoldingEngines(), TextureUtil.load(BitmapManager.pose2DURLs)])
            })
            .then(() => {
                const puzid = PuzzleID.TheRealXORChallenge;
                this._modeStack.unwindToMode(new LoadingMode(`Loading puzzle ${puzid}...`));
                return PuzzleManager.instance.get_puzzle_by_nid(puzid);
            })
            .then((puzzle) => {
                this._modeStack.unwindToMode(new PoseEditMode(puzzle, null, false));
                // this._modeStack.unwindToMode(new PoseTestMode());
            })
            .catch((err) => Eterna.onFatalError(err));
    }

    private initFoldingEngines(): Promise<void> {
        log.info("Initializing folding engines...");
        return Promise.all([Vienna.create(), Vienna2.create(), NuPACK.create()])
            .then((folders: Folder[]) => {
                log.info("Folding engines intialized");
                for (let folder of folders) {
                    FolderManager.instance.add_folder(folder);
                }
            });
    }
}

import {Application} from "pixi.js";
import {AppMode} from "../flashbang/core/AppMode";
import {FlashbangApp} from "../flashbang/core/FlashbangApp";
import {Background} from "./Background";
import {Folder} from "./folding/Folder";
import {FolderManager} from "./folding/FolderManager";
import {Vienna} from "./folding/Vienna";
import * as log from 'loglevel';

export class EternaApp extends FlashbangApp {
    protected createPixi (): Application {
        return new Application(1024, 768, {backgroundColor: 0x1099bb});
    }

    /*override*/
    protected setup (): void {
        this._modeStack.pushMode(new TestMode());

        this.loadFoldingEngines().catch((e) => {
            log.error('Error loading folding engines', e);
        });
    }

    private loadFoldingEngines (): Promise<void> {
        log.info("Initializing folding engines...");
        return Promise.all([Vienna.create()]).then((folders: Folder[]) => {
            for (let folder of folders) {
                FolderManager.instance.add_folder(folder);
            }
        });
    }
}

class TestMode extends AppMode {
    protected setup (): void {
        this.addObject(new Background(20, false), this.modeSprite);

        // const SNOWFLAKE_SEQ = 'GUGGACAAGAUGAAACAUCAGUAACAAGCGCAAAGCGCGGGCAAAGCCCCCGGAAACCGGAAGUUACAGAACAAAGUUCAAGUUUACAAGUGGACAAGUUGAAACAACAGUUACAAGACGAAACGUCGGCCAAAGGCCCCAUAAAAUGGAAGUAACACUUGAAACAAGAAGUUUACAAGUUGACAAGUUCAAAGAACAGUUACAAGUGGAAACCACGCGCAAAGCGCCUCCAAAGGAGAAGUAACAGAAGAAACUUCAAGUUAGCAAGUGGUCAAGUACAAAGUACAGUAACAACAUCAAAGAUGGCGCAAAGCGCGAGCAAAGCUCAAGUUACAGAACAAAGUUCAAGAUUACAAGAGUGCAAGAAGAAACUUCAGAUAGAACUGCAAAGCAGCACCAAAGGUGGGGCAAAGCCCAACUAUCAGUUGAAACAACAAGUAUUCAAGAGGUCAAGAUCAAAGAUCAGUAACAAGUGCAAAGCACGGGCAAAGCCCGACCAAAGGUCAAGUUACAGUUCAAAGAACAAGAUUUC';
        //
        // const SNOWFLAKE_STRUCT = '((((((..(((.....))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))';
        //
        // Vienna.create().then((vienna: Folder) => {
        //     let result = vienna.fold_sequence(EPars.string_to_sequence_array(SNOWFLAKE_SEQ), null, SNOWFLAKE_STRUCT);
        //     log.info(result);
        //
        //     AutosaveManager.saveObjects([vienna.get_folder_name()], "folder-" + Eterna.player_id);
        //     let pref: any[] = AutosaveManager.loadObjects("folder-" + Eterna.player_id);
        //     let name: string = pref === null ? Vienna.NAME : pref[0];
        //     log.info(name);
        //     AutosaveManager.clear();
        // });
    }
}

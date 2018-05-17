import {Application} from "pixi.js";
import {AppMode} from "../flashbang/core/AppMode";
import {FlashbangApp} from "../flashbang/core/FlashbangApp";
import {Background} from "./Background";
import {EPars} from "./EPars";
import {Eterna} from "./Eterna";
import {Folder} from "./folding/Folder";
import {Vienna} from "./folding/Vienna";
import {AutosaveManager} from "./util/AutosaveManager";

export class EternaApp extends FlashbangApp {
    protected createPixi (): Application {
        return new Application(1024, 768, {backgroundColor: 0x1099bb});
    }

    protected setup (): void {
        this._modeStack.pushMode(new TestMode());
    }
}

class TestMode extends AppMode {
    protected setup (): void {
        this.addObject(new Background(20, false), this.modeSprite);

        const SNOWFLAKE_SEQ = 'GUGGACAAGAUGAAACAUCAGUAACAAGCGCAAAGCGCGGGCAAAGCCCCCGGAAACCGGAAGUUACAGAACAAAGUUCAAGUUUACAAGUGGACAAGUUGAAACAACAGUUACAAGACGAAACGUCGGCCAAAGGCCCCAUAAAAUGGAAGUAACACUUGAAACAAGAAGUUUACAAGUUGACAAGUUCAAAGAACAGUUACAAGUGGAAACCACGCGCAAAGCGCCUCCAAAGGAGAAGUAACAGAAGAAACUUCAAGUUAGCAAGUGGUCAAGUACAAAGUACAGUAACAACAUCAAAGAUGGCGCAAAGCGCGAGCAAAGCUCAAGUUACAGAACAAAGUUCAAGAUUACAAGAGUGCAAGAAGAAACUUCAGAUAGAACUGCAAAGCAGCACCAAAGGUGGGGCAAAGCCCAACUAUCAGUUGAAACAACAAGUAUUCAAGAGGUCAAGAUCAAAGAUCAGUAACAAGUGCAAAGCACGGGCAAAGCCCGACCAAAGGUCAAGUUACAGUUCAAAGAACAAGAUUUC';

        const SNOWFLAKE_STRUCT = '((((((..(((.....))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))..((((((..((((...)))).(((((..((((...))))((((...))))((((...))))..))))).((((...))))..))))))';

        Vienna.Create().then((vienna: Folder) => {
            let result = vienna.fold_sequence(EPars.string_to_sequence_array(SNOWFLAKE_SEQ), null, SNOWFLAKE_STRUCT);
            console.log(result);

            AutosaveManager.saveObjects([vienna.get_folder_name()], "folder-" + Eterna.player_id);
            let pref: any[] = AutosaveManager.loadObjects("folder-" + Eterna.player_id);
            let name: string = pref === null ? Vienna.NAME : pref[0];
            console.log(name);
            AutosaveManager.clear();
        });
    }
}

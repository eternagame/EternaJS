import {Point} from "pixi.js";
import {Align} from "../../flashbang/core/Align";
import {Flashbang} from "../../flashbang/core/Flashbang";
import {KeyCode} from "../../flashbang/input/KeyCode";
import {DisplayUtil} from "../../flashbang/util/DisplayUtil";
import {UndoBlock} from "../UndoBlock";
import {Dialog} from "./Dialog";
import {GameButton} from "./GameButton";
import {SpecBox} from "./SpecBox";

/**
 * Displays a SpecBox in a modal dialog.
 * If the "Minimize Window" button is clicked, the dialog will be closed with "true". The owning mode
 * should display a docked SpecBox.
 */
export class SpecBoxDialog extends Dialog<boolean> {
    public constructor(datablock: UndoBlock) {
        super();
        this._datablock = datablock;
    }

    protected added(): void {
        super.added();

        let spec_box = new SpecBox();
        spec_box.set_spec(this._datablock);
        spec_box.set_size(Flashbang.stageWidth * 0.7, Flashbang.stageHeight * 0.7);
        this.addObject(spec_box, this.container);

        DisplayUtil.positionRelativeToStage(spec_box.display, Align.CENTER, Align.CENTER, Align.CENTER, Align.CENTER);

        let cancel_button: GameButton = new GameButton().label("Ok", 12).hotkey(KeyCode.KeyS);
        cancel_button.display.position = new Point(
            spec_box.width - cancel_button.container.width - 20,
            spec_box.height - cancel_button.container.height - 20);
        spec_box.addObject(cancel_button, spec_box.container);

        cancel_button.clicked.connect(() => this.close(false));

        let add_thumbnail_button: GameButton = new GameButton()
            .label("Minimize Window", 12)
            .tooltip("Minimize")
            .hotkey(KeyCode.KeyM);
        add_thumbnail_button.display.position = new Point(
            spec_box.width - cancel_button.container.width - 20 - add_thumbnail_button.container.width - 20,
            spec_box.height - add_thumbnail_button.container.height - 20);
        spec_box.addObject(add_thumbnail_button, spec_box.container);

        add_thumbnail_button.clicked.connect(() => this.close(true));
    }

    private readonly _datablock: UndoBlock;
}

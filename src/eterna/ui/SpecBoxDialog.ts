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

        spec_box.display.position.x = (Flashbang.stageWidth - spec_box.width) * 0.5;
        spec_box.display.position.y = (Flashbang.stageHeight - spec_box.height) * 0.5;

        let cancel_button: GameButton = new GameButton().label("Ok", 14).hotkey(KeyCode.KeyS);
        spec_box.addObject(cancel_button, spec_box.container);
        cancel_button.display.position = new Point(
            spec_box.width - cancel_button.container.width - 20,
            spec_box.height - cancel_button.container.height - 20
        );

        cancel_button.clicked.connect(() => this.close(false));

        let add_thumbnail_button: GameButton = new GameButton()
            .label("Minimize Window", 14)
            .tooltip("Minimize")
            .hotkey(KeyCode.KeyM);
        spec_box.addObject(add_thumbnail_button, spec_box.container);
        DisplayUtil.positionRelative(
            add_thumbnail_button.display, Align.RIGHT, Align.CENTER,
            cancel_button.display, Align.LEFT, Align.CENTER,
            -20, 0
        );

        add_thumbnail_button.clicked.connect(() => this.close(true));
    }

    private readonly _datablock: UndoBlock;
}

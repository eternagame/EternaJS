import {Point} from "pixi.js";
import {HAlign, VAlign} from "../../flashbang/core/Align";
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

        let specBox = new SpecBox();
        specBox.set_spec(this._datablock);
        specBox.set_size(Flashbang.stageWidth * 0.7, Flashbang.stageHeight * 0.7);
        this.addObject(specBox, this.container);

        let cancel_button: GameButton = new GameButton().label("Ok", 14).hotkey(KeyCode.KeyS);
        specBox.addObject(cancel_button, specBox.container);
        cancel_button.display.position = new Point(
            specBox.width - cancel_button.container.width - 20,
            specBox.height - cancel_button.container.height - 20
        );

        cancel_button.clicked.connect(() => this.close(false));

        let add_thumbnail_button: GameButton = new GameButton()
            .label("Minimize Window", 14)
            .tooltip("Minimize")
            .hotkey(KeyCode.KeyM);
        specBox.addObject(add_thumbnail_button, specBox.container);
        DisplayUtil.positionRelative(
            add_thumbnail_button.display, HAlign.RIGHT, VAlign.CENTER,
            cancel_button.display, HAlign.LEFT, VAlign.CENTER,
            -20, 0
        );

        add_thumbnail_button.clicked.connect(() => this.close(true));

        let updateLocation = () => {
            specBox.display.position.x = (Flashbang.stageWidth - specBox.width) * 0.5;
            specBox.display.position.y = (Flashbang.stageHeight - specBox.height) * 0.5;
        };
        updateLocation();
        this.regs.add(this.mode.resized.connect(updateLocation));
    }

    private readonly _datablock: UndoBlock;
}

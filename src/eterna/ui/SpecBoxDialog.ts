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
    public constructor(datablock: UndoBlock, showMinimizeButton: boolean = true) {
        super();
        this._datablock = datablock;
        this._showMinimizeButton = showMinimizeButton;
    }

    protected added(): void {
        super.added();

        let specBox = new SpecBox();
        specBox.setSpec(this._datablock);
        specBox.setSize(Flashbang.stageWidth * 0.7, Flashbang.stageHeight * 0.7);
        this.addObject(specBox, this.container);

        let cancelButton = new GameButton().label("Ok", 14).hotkey(KeyCode.KeyS);
        specBox.addObject(cancelButton, specBox.container);
        cancelButton.display.position = new Point(
            specBox.width - cancelButton.container.width - 20,
            specBox.height - cancelButton.container.height - 20
        );

        cancelButton.clicked.connect(() => this.close(false));

        if (this._showMinimizeButton) {
            let minimizeButton = new GameButton()
                .label("Minimize Window", 14)
                .tooltip("Minimize")
                .hotkey(KeyCode.KeyM);
            specBox.addObject(minimizeButton, specBox.container);
            DisplayUtil.positionRelative(
                minimizeButton.display, HAlign.RIGHT, VAlign.CENTER,
                cancelButton.display, HAlign.LEFT, VAlign.CENTER,
                -20, 0
            );

            minimizeButton.clicked.connect(() => this.close(true));
        }

        let updateLocation = () => {
            specBox.display.position.x = (Flashbang.stageWidth - specBox.width) * 0.5;
            specBox.display.position.y = (Flashbang.stageHeight - specBox.height) * 0.5;
        };
        updateLocation();
        this.regs.add(this.mode.resized.connect(updateLocation));
    }

    private readonly _datablock: UndoBlock;
    private readonly _showMinimizeButton: boolean;
}

import {Point} from 'pixi.js';
import UndoBlock from 'eterna/UndoBlock';
import {
    KeyCode, Flashbang, DisplayUtil, HAlign, VAlign, Assert
} from 'flashbang';
import Dialog from './Dialog';
import GameButton from './GameButton';
import SpecBox from './SpecBox';

/**
 * Displays a SpecBox in a modal dialog.
 * If the "Minimize Window" button is clicked, the dialog will be closed with "true". The owning mode
 * should display a docked SpecBox.
 */
export default class SpecBoxDialog extends Dialog<boolean> {
    constructor(datablock: UndoBlock, showMinimizeButton: boolean = true) {
        super();
        this._datablock = datablock;
        this._showMinimizeButton = showMinimizeButton;
    }

    protected added(): void {
        super.added();

        let specBox = new SpecBox();
        this.addObject(specBox, this.container);

        specBox.setSpec(this._datablock);

        let cancelButton = new GameButton().label('Ok', 14).hotkey(KeyCode.KeyS);
        specBox.addObject(cancelButton, specBox.container);
        cancelButton.clicked.connect(() => this.close(false));

        let minimizeButton: GameButton;
        if (this._showMinimizeButton) {
            minimizeButton = new GameButton()
                .label('Minimize Window', 14)
                .tooltip('Minimize')
                .hotkey(KeyCode.KeyM);
            specBox.addObject(minimizeButton, specBox.container);
            minimizeButton.clicked.connect(() => this.close(true));
        }

        let updateBounds = () => {
            Assert.assertIsDefined(Flashbang.stageWidth);
            Assert.assertIsDefined(Flashbang.stageHeight);
            specBox.setSize(Flashbang.stageWidth * 0.7, Flashbang.stageHeight * 0.7);
            specBox.display.position.x = (Flashbang.stageWidth - specBox.width) * 0.5;
            specBox.display.position.y = (Flashbang.stageHeight - specBox.height) * 0.5;

            cancelButton.display.position = new Point(
                specBox.width - cancelButton.container.width - 20,
                specBox.height - cancelButton.container.height - 20
            );

            if (minimizeButton != null) {
                DisplayUtil.positionRelative(
                    minimizeButton.display, HAlign.RIGHT, VAlign.CENTER,
                    cancelButton.display, HAlign.LEFT, VAlign.CENTER,
                    -20, 0
                );
            }
        };
        updateBounds();
        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mode.resized.connect(updateBounds));
    }

    private readonly _datablock: UndoBlock;
    private readonly _showMinimizeButton: boolean;
}

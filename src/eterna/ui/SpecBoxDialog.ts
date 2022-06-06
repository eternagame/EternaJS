import UndoBlock from 'eterna/UndoBlock';
import {
    KeyCode, Flashbang, DisplayUtil, HAlign, VAlign, Assert
} from 'flashbang';
import FloatDialog from './FloatDialog';
import GameButton from './GameButton';
import FloatSpecBox from './FloatSpecBox';

/**
 * Displays a SpecBox in a modal dialog.
 * If the "Minimize Window" button is clicked, the dialog will be closed with "true". The owning mode
 * should display a docked SpecBox.
 */
export default class SpecBoxDialog extends FloatDialog<boolean> {
    private specBox: FloatSpecBox;
    private cancelButton: GameButton;
    private minimizeButton: GameButton;
    constructor(datablock: UndoBlock, showMinimizeButton: boolean = true) {
        super('RNA Spec');
        this._datablock = datablock;
        this._showMinimizeButton = showMinimizeButton;
    }

    protected added(): void {
        super.added();

        this.specBox = new FloatSpecBox();
        this.addObject(this.specBox, this.contentVLay);

        this.specBox.setSpec(this._datablock);

        this.cancelButton = new GameButton().label('Ok', 14).hotkey(KeyCode.KeyS);
        this.specBox.addObject(this.cancelButton, this.specBox.container);
        this.cancelButton.clicked.connect(() => this.close(false));

        if (this._showMinimizeButton) {
            this.minimizeButton = new GameButton()
                .label('Minimize Window', 14)
                .tooltip('Minimize')
                .hotkey(KeyCode.KeyM);
            this.specBox.addObject(this.minimizeButton, this.specBox.container);
            this.minimizeButton.clicked.connect(() => this.close(true));
        }

        this.updateFinalFloatLocation();
    }

    public updateFinalFloatLocation() {
        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);
        this.specBox.setSize(Flashbang.stageWidth * 0.7, Flashbang.stageHeight * 0.7);
        this.specBox.display.position.x = (Flashbang.stageWidth - this.specBox.width) * 0.5;
        this.specBox.display.position.y = (Flashbang.stageHeight - this.specBox.height) * 0.5;

        this.cancelButton.display.position.set(
            this.specBox.width - this.cancelButton.container.width - 20,
            this.specBox.height - this.cancelButton.container.height - 20
        );

        if (this.minimizeButton != null && this.minimizeButton !== undefined) {
            DisplayUtil.positionRelative(
                this.minimizeButton.display, HAlign.RIGHT, VAlign.CENTER,
                this.cancelButton.display, HAlign.LEFT, VAlign.CENTER,
                -20, 0
            );
        }
        super.updateFloatLocation();
    }

    public resize(w: number, h: number): void {
        super.resize(w, h);
    }

    private readonly _datablock: UndoBlock;
    private readonly _showMinimizeButton: boolean;
}

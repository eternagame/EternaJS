import UndoBlock from 'eterna/UndoBlock';
import {
    KeyCode, Flashbang, Assert
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
    private minimizeButton: GameButton;
    private maxSpecWidth: number = 100;
    private maxSpecHeight: number = 100;

    constructor(datablock: UndoBlock, showMinimizeButton: boolean = true) {
        super('RNA Spec');
        this._datablock = datablock;
        this._showMinimizeButton = showMinimizeButton;
        this.minWidth = 320;
        this.minHeight = 560;
    }

    protected added(): void {
        super.added();

        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);

        let scale = 0.6;
        if ((Flashbang.stageWidth - this.getThumbSize() - 50) * scale < this.minWidth) {
            scale = Math.max(0.8, this.minWidth / (Flashbang.stageWidth - this.getThumbSize() - 50));
        }
        this.maxSpecWidth = Math.max(this.minWidth, (Flashbang.stageWidth - this.getThumbSize() - 50) * scale);
        this.maxSpecHeight = Math.max(this.minHeight, (Flashbang.stageHeight - 120) * scale);

        this.specBox = new FloatSpecBox();
        this.addObject(this.specBox, this.contentVLay);

        this.specBox.setSpec(this._datablock);

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

    private updateButtons() {
        const cWidth = this.specBox.width;
        const w = this.minimizeButton.display.width;
        this.minimizeButton.display.position.set(
            10 + (cWidth - w) / 2,
            this.specBox.height - this.minimizeButton.container.height
        );
    }

    public updateFinalFloatLocation() {
        this.specBox.setSize(this.maxSpecWidth, this.maxSpecHeight);
        this.specBox.display.position.x = 0;
        this.specBox.display.position.y = 0;

        this.updateButtons();

        super.updateFloatLocation();
    }

    public resize(w: number, h: number): void {
        const padding = this.getPadding();
        this.specBox.setSize(
            w - 20 - this.getThumbSize() - padding.left - padding.right,
            h - this.getTitleHeight() - this.getThumbSize() - padding.top - padding.bottom
        );
        this.specBox.display.position.x = 0;
        this.specBox.display.position.y = 0;
        this.updateButtons();
        this.updateFloatLocation(false);
        super.resize(w, h);
    }

    private readonly _datablock: UndoBlock;
    private readonly _showMinimizeButton: boolean;
}

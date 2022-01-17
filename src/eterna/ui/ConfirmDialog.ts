import {
    VLayoutContainer, HAlign, HLayoutContainer, AlphaTask, Flashbang, Assert
} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import Dialog, {DialogCanceledError} from './Dialog';
import GameButton from './GameButton';
import GamePanel, {GamePanelType} from './GamePanel';
import HTMLTextObject from './HTMLTextObject';

export default class ConfirmDialog extends Dialog<boolean> {
    constructor(prompt: string, promptIsHTML: boolean = false) {
        super();
        this._prompt = prompt;
        this._useHTML = promptIsHTML;
    }

    /**
     * Returns a new Promise that will resolve if the dialog is confirmed,
     * and reject with a DialogCanceledError otherwise.
     */
    public get confirmed(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.closed.then((value) => {
                if (value) {
                    resolve();
                } else {
                    reject(new DialogCanceledError());
                }
            });
        });
    }

    protected added() {
        super.added();

        const panel = new GamePanel({
            type: GamePanelType.NORMAL,
            alpha: 1.0,
            color: 0x152843,
            borderAlpha: 0.27,
            borderColor: 0xC0DCE7
        });
        panel.title = 'Are you sure?';
        this.addObject(panel, this.container);

        const panelLayout = new VLayoutContainer(0, HAlign.CENTER);
        panel.container.addChild(panelLayout);

        if (this._useHTML) {
            const text = new HTMLTextObject(this._prompt, undefined, undefined, true)
                .font(Fonts.STDFONT)
                .fontSize(15)
                .selectable(false)
                .color(0xC0DCE7)
                .maxWidth(300);
            panel.addObject(text, panelLayout);
        } else {
            const text = Fonts.std(this._prompt, 15).color(0xC0DCE7).wordWrap(true, 300).build();
            panelLayout.addChild(text);
        }

        const buttonLayout = new HLayoutContainer(12);
        panelLayout.addVSpacer(10);
        panelLayout.addChild(buttonLayout);

        const yesButton: GameButton = new GameButton().label('Yes', 16);
        panel.addObject(yesButton, buttonLayout);
        yesButton.clicked.connect(() => this.close(true));

        const noButton: GameButton = new GameButton().label('No', 16);
        panel.addObject(noButton, buttonLayout);
        noButton.clicked.connect(() => this.close(false));

        const W_MARGIN = 10;
        const H_MARGIN = 10;

        panelLayout.layout();
        panel.setSize(panelLayout.width + (W_MARGIN * 2), panel.titleHeight + panelLayout.height + (H_MARGIN * 2));
        panelLayout.position.set(W_MARGIN, H_MARGIN + panel.titleHeight);

        panel.display.alpha = 0;
        panel.addObject(new AlphaTask(1, 0.3));

        const updateLocation = () => {
            Assert.assertIsDefined(Flashbang.stageWidth);
            Assert.assertIsDefined(Flashbang.stageHeight);
            panel.display.position.set(
                (Flashbang.stageWidth - panel.width) * 0.5,
                (Flashbang.stageHeight - panel.height) * 0.5
            );
        };

        updateLocation();
        Assert.assertIsDefined(this._mode);
        this.regs.add(this._mode.resized.connect(updateLocation));
    }

    protected onBGClicked(): void {
        // Is there a good reason not to enable this?
        // this.close(null);
    }

    private readonly _prompt: string;
    private readonly _useHTML: boolean;
}

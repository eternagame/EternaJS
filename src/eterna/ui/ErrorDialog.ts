import {
    VLayoutContainer, HAlign, HLayoutContainer, AlphaTask
} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import GameButton from './GameButton';
import GamePanel, {GamePanelType} from './GamePanel';
import FloatDialog from './FloatDialog';
import {DialogCanceledError} from './Dialog';

export default class ErrorDialog extends FloatDialog<boolean> {
    constructor(prompt: string) {
        super('Error', true);
        this.setPadding(0);
        this._prompt = prompt;
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
        this.addObject(panel, this.contentVLay);

        const panelLayout = new VLayoutContainer(0, HAlign.CENTER);
        panel.container.addChild(panelLayout);

        const text = Fonts.std(this._prompt, 15).color(0xC0DCE7).wordWrap(true, 300).build();
        panelLayout.addChild(text);

        const buttonLayout = new HLayoutContainer(12);
        panelLayout.addVSpacer(10);
        panelLayout.addChild(buttonLayout);

        const yesButton: GameButton = new GameButton().label('Close', 16);
        panel.addObject(yesButton, buttonLayout);
        yesButton.clicked.connect(() => this.close(true));

        const W_MARGIN = 10;
        const H_MARGIN = 10;

        panelLayout.layout();
        panel.setSize(panelLayout.width + (W_MARGIN * 2), panel.titleHeight + panelLayout.height + (H_MARGIN * 2));
        panelLayout.position.set(W_MARGIN, H_MARGIN + panel.titleHeight);

        panel.display.alpha = 0;
        panel.addObject(new AlphaTask(1, 0.3));

        this.updateFloatLocation();
    }

    private readonly _prompt: string;
}

import {
    Assert, Flashbang, HAlign, HLayoutContainer, KeyCode, VAlign, VLayoutContainer
} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import TextInputObject from 'eterna/ui/TextInputObject';
import GameButton from 'eterna/ui/GameButton';
import GamePanel from 'eterna/ui/GamePanel';
import Dialog from './Dialog';

export default class ExplosionFactorDialog extends Dialog<number> {
    constructor(initialFactor?: number) {
        super();

        this._initialFactor = initialFactor ?? 1;
    }

    protected added() {
        super.added();

        this._panel = new GamePanel({
            alpha: 1.0,
            color: 0x152843,
            borderAlpha: 0.27,
            borderColor: 0xC0DCE7
        });

        this.addObject(this._panel, this.container);
        this._panel.title = 'Explosion Factor';

        this._panelLayout = new VLayoutContainer(10, HAlign.CENTER);
        this._panel.container.addChild(this._panelLayout);

        const errorText = Fonts.std()
            .fontSize(14)
            .color(0xEE0000)
            .build();
        errorText.visible = false;
        this._panelLayout.addChild(errorText);

        const inputLayout = new HLayoutContainer(10, VAlign.CENTER);
        this._panelLayout.addChild(inputLayout);

        const decreaseButton: GameButton = new GameButton().label('-', 16);
        this._panel.addObject(decreaseButton, inputLayout);
        decreaseButton.hotkey(KeyCode.BracketLeft);
        decreaseButton.tooltip('Decrease space between paired bases ([)');

        const input: TextInputObject = new TextInputObject({
            fontSize: 14,
            width: 45,
            rows: 1
        }).font(Fonts.STDFONT);
        input.text = this._initialFactor.toString();
        this._panel.addObject(input, inputLayout);

        const increaseButton: GameButton = new GameButton().label('+', 16);
        this._panel.addObject(increaseButton, inputLayout);
        increaseButton.hotkey(KeyCode.BracketRight);
        increaseButton.tooltip('Increase space between paired bases (])');

        decreaseButton.clicked.connect(() => {
            const factor = Math.max(0, Math.round((parseFloat(input.text) - 0.25) * 1000) / 1000);
            input.text = (Number.isNaN(factor) ? 1 : factor).toString();
        });

        increaseButton.clicked.connect(() => {
            const factor = Math.max(0, Math.round((parseFloat(input.text) + 0.25) * 1000) / 1000);
            input.text = (Number.isNaN(factor) ? 1 : factor).toString();
        });

        const buttonLayout = new HLayoutContainer(12);
        this._panelLayout.addChild(buttonLayout);

        const yesButton: GameButton = new GameButton().label('Ok', 16);
        this._panel.addObject(yesButton, buttonLayout);
        yesButton.clicked.connect(() => {
            const factor = parseFloat(input.text);
            this.close(factor);
        });

        input.valueChanged.connect((val) => {
            const factor = parseFloat(val);
            const prevText = errorText.text;
            const wasVisible = errorText.visible;

            if (val === '') {
                // Don't annoy the user with an error message if they're just deleting the contents
                // to type something else in, but don't let them submit an empty form either.
                errorText.visible = false;
                yesButton.enabled = false;
            } else if (Number.isNaN(factor)) {
                errorText.text = 'Please enter a valid number';
                errorText.visible = true;
                yesButton.enabled = false;
            } else if (factor < 0) {
                errorText.text = 'Explosion factor must not be negative';
                errorText.visible = true;
                yesButton.enabled = false;
            } else {
                errorText.visible = false;
                yesButton.enabled = true;
            }

            if (errorText.visible !== wasVisible || prevText !== errorText.text) {
                this.layout();
            }
        });

        const noButton: GameButton = new GameButton().label('Cancel', 16);
        this._panel.addObject(noButton, buttonLayout);
        noButton.clicked.connect(() => this.close(null));

        this.layout();

        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mode.resized.connect(this.updateLocation));
    }

    private layout(): void {
        this._panelLayout.layout(true);
        this._panel.setSize(
            this._panelLayout.width + (ExplosionFactorDialog.W_MARGIN * 2),
            this._panel.titleHeight + this._panelLayout.height + (ExplosionFactorDialog.H_MARGIN * 2)
        );
        this._panelLayout.position.set(
            ExplosionFactorDialog.W_MARGIN,
            ExplosionFactorDialog.H_MARGIN + this._panel.titleHeight
        );
        this.updateLocation();
    }

    private updateLocation(): void {
        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);
        this._panel.display.position.x = (Flashbang.stageWidth - this._panel.width) * 0.5;
        this._panel.display.position.y = (Flashbang.stageHeight - this._panel.height) * 0.5;
    }

    private _panel: GamePanel;
    private _panelLayout: VLayoutContainer;

    private _initialFactor: number;

    private static readonly W_MARGIN: number = 40;
    private static readonly H_MARGIN: number = 20;
}

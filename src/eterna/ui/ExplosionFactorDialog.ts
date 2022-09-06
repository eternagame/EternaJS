import {
    HAlign, HLayoutContainer, KeyCode, VAlign, VLayoutContainer
} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import TextInputObject from 'eterna/ui/TextInputObject';
import GameButton from 'eterna/ui/GameButton';
import GamePanel from 'eterna/ui/GamePanel';
import FloatDialog from './FloatDialog';

export default class ExplosionFactorDialog extends FloatDialog<number> {
    private okCallback: (arg0: number)=>void;
    constructor(initialFactor: number, callback: (arg0: number)=>void) {
        super('Explosion Factor');
        this.okCallback = callback;
        this.setPadding(12, 12, 0, 0);

        this._initialFactor = initialFactor ?? 1;
    }

    protected added() {
        super.added();

        this._panel = new GamePanel({
            alpha: 1.0,
            color: 0x152843
            // borderAlpha: 0.27,
            // borderColor: 0xC0DCE7
        });

        this.addObject(this._panel, this.contentVLay);

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
            this.okCallback(parseFloat(input.text));
        });

        increaseButton.clicked.connect(() => {
            const factor = Math.max(0, Math.round((parseFloat(input.text) + 0.25) * 1000) / 1000);
            input.text = (Number.isNaN(factor) ? 1 : factor).toString();
            this.okCallback(parseFloat(input.text));
        });

        const buttonLayout = new HLayoutContainer(12);
        this._panelLayout.addChild(buttonLayout);

        input.valueChanged.connect((val) => {
            const factor = parseFloat(val);
            const prevText = errorText.text;
            const wasVisible = errorText.visible;

            if (val === '') {
                // Don't annoy the user with an error message if they're just deleting the contents
                // to type something else in, but don't let them submit an empty form either.
                errorText.visible = false;
            } else if (Number.isNaN(factor)) {
                errorText.text = 'Please enter a valid number';
                errorText.visible = true;
            } else if (factor < 0) {
                errorText.text = 'Explosion factor must not be negative';
                errorText.visible = true;
            } else {
                errorText.visible = false;
                this.okCallback(factor);
            }

            if (errorText.visible !== wasVisible || prevText !== errorText.text) {
                this.layout();
            }
        });

        // const noButton: GameButton = new GameButton().label('Cancel', 16);
        // this._panel.addObject(noButton, buttonLayout);
        // noButton.clicked.connect(() => this.close(null));

        this.layout();
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
        this.updateFloatLocation();
    }

    private _panel: GamePanel;
    private _panelLayout: VLayoutContainer;

    private _initialFactor: number;

    private static readonly W_MARGIN: number = 40;
    private static readonly H_MARGIN: number = 20;
}

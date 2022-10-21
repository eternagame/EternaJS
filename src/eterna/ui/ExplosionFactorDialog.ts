import Fonts from 'eterna/util/Fonts';
import {HLayoutContainer, KeyCode, VLayoutContainer} from 'flashbang';
import {Value} from 'signals';
import GameButton from './GameButton';
import TextInputObject from './TextInputObject';
import WindowDialog from './WindowDialog';

export default class ExplosionFactorDialog extends WindowDialog<void> {
    public factor: Value<number>;

    constructor(initialFactor: number) {
        super({title: 'Explosion Factor'});
        this.factor = new Value(initialFactor);
    }

    protected added() {
        super.added();

        const content = new VLayoutContainer(20);
        this._window.content.addChild(content);

        const errorText = Fonts.std()
            .fontSize(14)
            .color(0xff7070)
            .bold()
            .build();
        errorText.visible = false;
        content.addChild(errorText);

        const inputLayout = new HLayoutContainer(10);
        content.addChild(inputLayout);

        const decreaseButton = new GameButton('secondary').label('-', 14);
        this.addObject(decreaseButton, inputLayout);
        decreaseButton.hotkey(KeyCode.BracketLeft);
        decreaseButton.tooltip('Decrease space between paired bases ([)');

        const input = new TextInputObject({
            fontSize: 14,
            width: 45,
            rows: 1,
            domParent: this._window.contentHtmlWrapper
        }).font(Fonts.STDFONT);
        input.text = this.factor.value.toString();
        this.addObject(input, inputLayout);

        const increaseButton: GameButton = new GameButton('secondary').label('+', 14);
        this.addObject(increaseButton, inputLayout);
        increaseButton.hotkey(KeyCode.BracketRight);
        increaseButton.tooltip('Increase space between paired bases (])');

        input.setFocus();

        decreaseButton.clicked.connect(() => {
            const factor = Math.max(0, Math.round((parseFloat(input.text) - 0.25) * 1000) / 1000);
            input.text = (Number.isNaN(factor) ? 1 : factor).toString();
            this.factor.value = parseFloat(input.text);
        });

        increaseButton.clicked.connect(() => {
            const factor = Math.max(0, Math.round((parseFloat(input.text) + 0.25) * 1000) / 1000);
            input.text = (Number.isNaN(factor) ? 1 : factor).toString();
            this.factor.value = parseFloat(input.text);
        });

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
                this.factor.value = factor;
            }

            if (errorText.visible !== wasVisible || prevText !== errorText.text) {
                content.layout(true);
                this._window.layout();
            }
        });

        content.layout(true);
        this._window.layout();
    }
}

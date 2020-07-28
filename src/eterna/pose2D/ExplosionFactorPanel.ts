import {Point, Text} from 'pixi.js';
import {Signal} from 'signals';
import {KeyCode} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import TextInputObject from 'eterna/ui/TextInputObject';
import GameButton from 'eterna/ui/GameButton';
import GamePanel from 'eterna/ui/GamePanel';

export default class ExplosionFactorPanel extends GamePanel {
    public readonly factorUpdated: Signal<number> = new Signal();

    constructor() {
        super();

        this.setup(0, 1.0, 0x152843, 0.27, 0xC0DCE7);
    }

    protected added() {
        super.added();

        let heightWalker: number = ExplosionFactorPanel.HMARGIN;

        let label: Text = Fonts.std('Explosion Factor', 14).color(0xC0DCE7).hAlignCenter().build();
        label.position = new Point(ExplosionFactorPanel.WMARGIN, heightWalker);
        this.container.addChild(label);

        heightWalker += label.height + 10;

        let widthWalker: number = ExplosionFactorPanel.WMARGIN;

        let input: TextInputObject = new TextInputObject({
            fontSize: 14,
            width: 40,
            rows: 1
        }).font(Fonts.STDFONT);
        input.text = '1';
        input.display.position = new Point(widthWalker, heightWalker);
        this.addObject(input, this.container);
        input.valueChanged.connect((val) => {
            let factor = parseFloat(val);
            if (Number.isNaN(factor)) return;
            if (factor < 0) return;
            this.factorUpdated.emit(factor);
        });

        widthWalker += /* input.width */ 50 + 5;

        let decreaseButton: GameButton = new GameButton().label('-', 16);
        decreaseButton.display.position = new Point(widthWalker, heightWalker);
        this.addObject(decreaseButton, this.container);
        decreaseButton.clicked.connect(() => {
            let factor = Math.max(0, Math.round((parseFloat(input.text) - 0.25) * 1000) / 1000);
            input.text = (Number.isNaN(factor) ? 1 : factor).toString();
            this.factorUpdated.emit(parseFloat(input.text));
        });
        decreaseButton.hotkey(KeyCode.BracketLeft);
        decreaseButton.tooltip('Decrease space between paired bases ([)');

        widthWalker += /* decreaseButton.container.width */20 + 5;

        let increaseButton: GameButton = new GameButton().label('+', 16);
        increaseButton.display.position = new Point(widthWalker, heightWalker);
        this.addObject(increaseButton, this.container);
        increaseButton.clicked.connect(() => {
            let factor = Math.max(0, Math.round((parseFloat(input.text) + 0.25) * 1000) / 1000);
            input.text = (Number.isNaN(factor) ? 1 : factor).toString();
            this.factorUpdated.emit(parseFloat(input.text));
        });
        increaseButton.hotkey(KeyCode.BracketRight);
        increaseButton.tooltip('Increase space between paired bases (])');

        // Prevent PoseField from adding a drag surface over our buttons when we're trying to click, not drag
        decreaseButton.pointerDown.connect((e) => e.stopPropagation());
        increaseButton.pointerDown.connect((e) => e.stopPropagation());

        widthWalker += /* increaseButton.container.width */20;
        heightWalker += /* increaseButton.container.height */26;

        this.setSize(
            Math.max(label.width, widthWalker + ExplosionFactorPanel.WMARGIN),
            heightWalker + ExplosionFactorPanel.HMARGIN
        );
    }

    private readonly _input: TextInputObject;
    private readonly _decreaseButton: GameButton;
    private readonly _increaseButton: GameButton;

    private static readonly WMARGIN: number = 20;
    private static readonly HMARGIN: number = 20;
}

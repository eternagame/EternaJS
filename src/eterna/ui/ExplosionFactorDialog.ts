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

        const panel = new GamePanel({
            alpha: 1.0,
            color: 0x152843,
            borderAlpha: 0.27,
            borderColor: 0xC0DCE7
        });

        this.addObject(panel, this.container);
        panel.title = 'Explosion Factor';

        const panelLayout = new VLayoutContainer(0, HAlign.CENTER);
        panel.container.addChild(panelLayout);

        const inputLayout = new HLayoutContainer(0, VAlign.CENTER);
        panelLayout.addChild(inputLayout);

        // Create now since the decrease button needs to reference it, but wait to add it
        // until after the button so that it shows up in the middle
        const input: TextInputObject = new TextInputObject({
            fontSize: 14,
            width: 45,
            rows: 1
        }).font(Fonts.STDFONT);
        input.text = this._initialFactor.toString();

        const decreaseButton: GameButton = new GameButton().label('-', 16);
        panel.addObject(decreaseButton, inputLayout);
        decreaseButton.clicked.connect(() => {
            const factor = Math.max(0, Math.round((parseFloat(input.text) - 0.25) * 1000) / 1000);
            input.text = (Number.isNaN(factor) ? 1 : factor).toString();
        });
        decreaseButton.hotkey(KeyCode.BracketLeft);
        decreaseButton.tooltip('Decrease space between paired bases ([)');

        inputLayout.addHSpacer(10);

        panel.addObject(input, inputLayout);

        inputLayout.addHSpacer(10);

        const increaseButton: GameButton = new GameButton().label('+', 16);
        panel.addObject(increaseButton, inputLayout);
        increaseButton.clicked.connect(() => {
            const factor = Math.max(0, Math.round((parseFloat(input.text) + 0.25) * 1000) / 1000);
            input.text = (Number.isNaN(factor) ? 1 : factor).toString();
        });
        increaseButton.hotkey(KeyCode.BracketRight);
        increaseButton.tooltip('Increase space between paired bases (])');

        const buttonLayout = new HLayoutContainer(12);
        panelLayout.addVSpacer(10);
        panelLayout.addChild(buttonLayout);

        const yesButton: GameButton = new GameButton().label('Ok', 16);
        panel.addObject(yesButton, buttonLayout);
        yesButton.clicked.connect(() => {
            const factor = parseFloat(input.text);
            // TODO: Display error message instead of failing silently?
            if (Number.isNaN(factor)) this.close(null);
            if (factor < 0) this.close(null);
            this.close(factor);
        });

        const noButton: GameButton = new GameButton().label('Cancel', 16);
        panel.addObject(noButton, buttonLayout);
        noButton.clicked.connect(() => this.close(null));

        panelLayout.layout();
        panel.setSize(
            panelLayout.width + (ExplosionFactorDialog.W_MARGIN * 2),
            panel.titleHeight + panelLayout.height + (ExplosionFactorDialog.H_MARGIN * 2)
        );
        panelLayout.position.set(ExplosionFactorDialog.W_MARGIN, ExplosionFactorDialog.H_MARGIN + panel.titleHeight);

        const updateLocation = () => {
            Assert.assertIsDefined(Flashbang.stageWidth);
            Assert.assertIsDefined(Flashbang.stageHeight);
            panel.display.position.x = (Flashbang.stageWidth - panel.width) * 0.5;
            panel.display.position.y = (Flashbang.stageHeight - panel.height) * 0.5;
        };
        updateLocation();
        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mode.resized.connect(updateLocation));
    }

    private _initialFactor: number;

    private static readonly W_MARGIN: number = 40;
    private static readonly H_MARGIN: number = 20;
}

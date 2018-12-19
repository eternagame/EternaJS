import {Point, Text} from "pixi.js";
import {GamePanel} from "../ui/GamePanel";
import {Signal} from "../../signals/Signal";
import {GameButton} from "../ui/GameButton";
import {TextInputObject} from "../ui/TextInputObject";
import {Fonts} from "../util/Fonts";

export class ExplosionFactorPanel extends GamePanel {
    public readonly factorUpdated: Signal<number> = new Signal();

    public constructor() {
        super();

        this.setup(0, 1.0, 0x152843, 0.27, 0xC0DCE7);
    }

    protected added() {
        super.added();

        let heightWalker: number = ExplosionFactorPanel.HMARGIN;

        let label: Text = Fonts.arial('Explosion Factor', 14).color(0xC0DCE7).hAlignCenter().build();
        label.position = new Point(ExplosionFactorPanel.WMARGIN, heightWalker);
        this.container.addChild(label);

        heightWalker += label.height + 10;

        let widthWalker: number = ExplosionFactorPanel.WMARGIN;

        let input: TextInputObject = new TextInputObject(14, 40, 1).font(Fonts.ARIAL);
        input.text = '1';
        input.display.position = new Point(widthWalker, heightWalker);
        this.addObject(input, this.container);
        input.valueChanged.connect(val => this.factorUpdated.emit(parseFloat(val)));

        widthWalker += /*input.width*/ 50 + 5;

        let decreaseButton: GameButton = new GameButton().label('-', 16);
        decreaseButton.display.position = new Point(widthWalker, heightWalker);
        this.addObject(decreaseButton, this.container);
        decreaseButton.clicked.connect(() => {
            input.text = (Math.round((parseFloat(input.text) - 0.05)*1000)/1000).toString();
            this.factorUpdated.emit(parseFloat(input.text));
        });

        widthWalker += /*decreaseButton.container.width*/20 + 5;

        let increaseButton: GameButton = new GameButton().label('+', 16);
        increaseButton.display.position = new Point(widthWalker, heightWalker);
        this.addObject(increaseButton, this.container);
        increaseButton.clicked.connect(() => {
            input.text = (Math.round((parseFloat(input.text)+ 0.05)*1000)/1000).toString();
            this.factorUpdated.emit(parseFloat(input.text));
        });

        // Prevent PoseField from adding a drag surface over our buttons when we're trying to click, not drag
        decreaseButton.pointerDown.connect((e) => e.stopPropagation());
        increaseButton.pointerDown.connect((e) => e.stopPropagation());

        widthWalker += /*increaseButton.container.width*/20;
        heightWalker += /*increaseButton.container.height*/26;

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

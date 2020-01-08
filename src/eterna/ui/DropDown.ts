import {
    ContainerObject, DisplayUtil, HAlign, VAlign, DisplayObjectPointerTarget, InputUtil, Flashbang
} from 'flashbang';
import {
    Graphics, Point, Text, Container, Texture
} from 'pixi.js';
import Fonts from 'eterna/util/Fonts';
import GamePanel, {GamePanelType} from './GamePanel';
import GameButton from './GameButton';

export default class DropDown extends ContainerObject {
    public text: string;

    constructor(fontSize: number, options: string[], defaultOption: string) {
        super();
        this._fontSize = fontSize;
        this._options = options;
        this._defaultOption = defaultOption || 'Select One...';
    }

    protected added() {
        this._box = new Graphics();
        this.container.addChild(this._box);
        this._drawBox(false);

        this.pointerOver.connect(() => {
            this._hovered = true;
            this._drawBox(this._hovered);
        });
        this.pointerOut.connect(() => {
            this._hovered = false;
            this._drawBox(this._hovered);
        });

        this._arrow = new Graphics();
        this.container.addChild(this._arrow);
        this._drawArrow();

        this._selectedText = new Text('', {
            fontSize: this._fontSize,
            fontFamily: Fonts.STDFONT_REGULAR,
            fill: 0xD0DCE7
        });
        this.container.addChild(this._selectedText);
        DisplayUtil.positionRelative(
            this._selectedText, HAlign.LEFT, VAlign.CENTER,
            this._box, HAlign.LEFT, VAlign.CENTER,
            this._LINE_WIDTH + this._PADDING
        );
        this._selectOption(this._defaultOption);

        this.pointerTap.connect(() => this._showPopup());
    }

    private _showPopup(): void {
        let bg = new Graphics();
        this.mode.container.addChild(bg);

        // Eat mouse events
        let bgTarget = new DisplayObjectPointerTarget(bg);

        bgTarget.pointerDown.connect((e) => {
            if (InputUtil.IsLeftMouse(e)) {
                // TODO: Close Popup
            }
            e.stopPropagation();
        });
        bgTarget.pointerUp.connect(e => e.stopPropagation());
        bgTarget.pointerMove.connect(e => e.stopPropagation());

        let updateBG = () => {
            bg.clear()
                .beginFill(0x0, 0)
                .drawRect(0, 0, Flashbang.stageWidth, Flashbang.stageHeight)
                .endFill();
        };
        updateBG();
        this.regs.add(this.mode.resized.connect(updateBG));

        let popup = new GamePanel(GamePanelType.NORMAL, 1, 0x152843, 1.0, 0xC0DCE7);
        this.addObject(popup, this.mode.container);
        let globalBoxBounds = DisplayUtil.getBoundsRelative(this._box, this.mode.container);
        DisplayUtil.positionRelativeToBounds(
            popup.container, HAlign.LEFT, VAlign.TOP,
            globalBoxBounds, HAlign.LEFT, VAlign.BOTTOM
        );

        let yWalker = 0;
        let maxWidth = 0;
        for (let option of this._options) {
            // TODO: Don't use a GameButton, it really isn't what we want (more like the rows in the data browser)
            // We also want it to scroll after some sane height...
            /* let button = new GameButton().allStates(Texture.EMPTY).label(option);
            popup.addObject(button, popup.container);
            button.display.y = yWalker;
            yWalker += button.display.height;
            button.clicked.connect(() => console.log('clicked!!'));
            maxWidth = Math.max(button.display.width, maxWidth); */
        }

        popup.setSize(maxWidth, yWalker);
    }

    private _drawBox(hover: boolean) {
        const TEXT_WIDTH = this._options.concat(this._defaultOption).reduce(
            (max, opt) => Math.max(max, opt.length),
            0
        ) * this._fontSize;
        // There should be an extra _PADDING between the text and the arrow
        const ARROW_WIDTH = this._ARROW_SIDE_SIZE + this._PADDING;

        let width = this._width || (TEXT_WIDTH + ARROW_WIDTH + this._PADDING * 2);

        this._box.clear();
        this._box.lineStyle(this._LINE_WIDTH, 0xC0DCE7);
        this._box.beginFill(hover ? 0x999999 : 0x0, 0.5);
        this._box.drawRect(0, 0, width, this._fontSize + this._PADDING * 2);
        this._box.endFill();
    }

    private _drawArrow() {
        const ARROW_HEIGHT = (this._ARROW_SIDE_SIZE * Math.sqrt(3)) / 2;

        this._arrow.clear();
        this._arrow.beginFill(0xD0DCE7);
        this._arrow.drawPolygon([
            new Point(0, 0),
            new Point(this._ARROW_SIDE_SIZE, 0),
            new Point(this._ARROW_SIDE_SIZE / 2, ARROW_HEIGHT)
        ]);
        this._arrow.endFill();

        DisplayUtil.positionRelative(
            this._arrow, HAlign.RIGHT, VAlign.CENTER,
            this._box, HAlign.RIGHT, VAlign.CENTER,
            -(this._PADDING + this._LINE_WIDTH)
        );
    }

    public get height(): number {
        return this._fontSize + this._PADDING * 2;
    }

    public get width(): number {
        return this.display.width;
    }

    private _selectOption(option: string) {
        this._selectedText.text = option;
        this.text = option;
    }

    public overrideWidth(width: number) {
        if (!this._mask) {
            this._mask = new Graphics();
            this.container.addChild(this._mask);
            this._selectedText.mask = this._mask;
        }

        this._width = width;

        this._drawBox(this._hovered);
        this._drawArrow();

        const NEW_TEXT_WIDTH = width - this._LINE_WIDTH - this._PADDING * 2 - this._ARROW_SIDE_SIZE;

        this._mask.clear();
        this._mask.beginFill(0x00FF00, 1);
        this._mask.drawRect(0, 0, NEW_TEXT_WIDTH, this.height - this._LINE_WIDTH);
        this._mask.endFill();
    }

    private _fontSize: number;
    private _options: string[];
    private _defaultOption: string;

    private _width: number;
    private _hovered: boolean = false;

    private _box: Graphics;
    private _arrow: Graphics;
    private _selectedText: Text;
    private _mask: Graphics;

    private readonly _LINE_WIDTH: number = 2;
    private readonly _PADDING: number = 3;
    private readonly _ARROW_SIDE_SIZE = 8;
}

import {
    ContainerObject, DisplayUtil, HAlign, VAlign, DisplayObjectPointerTarget, InputUtil, Flashbang
} from 'flashbang';
import {
    Graphics, Point, Text
} from 'pixi.js';
import Fonts from 'eterna/util/Fonts';
import {Value} from 'signals';
import GamePanel, {GamePanelType} from './GamePanel';
import TextBalloon from './TextBalloon';

export default class GameDropdown extends ContainerObject {
    public readonly selectedOption: Value<string>;
    public readonly options: string[];

    constructor(
        fontSize: number,
        options: string[],
        defaultOption: string = 'Select One...',
        borderWidth: number = 1
    ) {
        super();
        this._fontSize = fontSize;
        this.options = options;
        this._borderWidth = borderWidth;

        this.selectedOption = new Value(defaultOption);
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

        this.container.addChild(this._arrow);
        this._drawArrow();

        this._selectedText = new Text('', {
            fontSize: this._fontSize,
            fontFamily: Fonts.STDFONT,
            fill: 0xD0DCE7
        });
        this.container.addChild(this._selectedText);
        DisplayUtil.positionRelative(
            this._selectedText, HAlign.LEFT, VAlign.CENTER,
            this._box, HAlign.LEFT, VAlign.CENTER,
            this._borderWidth + this._PADDING
        );

        this.regs.add(
            this.selectedOption.connectNotify((selected) => {
                this._selectedText.text = selected;
            })
        );

        this.regs.add(
            this.pointerTap.connect(() => {
                if (!this.disabled) {
                    if (this._popupVisible) this._hidePopup();
                    else this._showPopup();
                }
            })
        );

        this._popup = new GamePanel(GamePanelType.NORMAL, 1, 0x152843, 1.0, 0xC0DCE7);
        this._setupPopup();
        this._hidePopup();
    }

    private _setupPopup() {
        let bg = new Graphics();
        if (this.mode?.container) this.mode.container.addChild(bg);

        // Eat mouse events (except pointerMove, the other buttons need it for pointerOut to fire)
        let bgTarget = new DisplayObjectPointerTarget(bg);

        bgTarget.pointerDown.connect((e) => {
            if (InputUtil.IsLeftMouse(e)) {
                this._hidePopup();
            }
            e.stopPropagation();
        });
        bgTarget.pointerUp.connect((e) => e.stopPropagation());
        // bgTarget.pointerMove.connect((e) => e.stopPropagation());

        let updateBG = () => {
            bg.clear()
                .beginFill(0x0, 0)
                .drawRect(-this._PADDING, 0, Flashbang.stageWidth || 0, Flashbang.stageHeight || 0)
                .endFill();
        };
        updateBG();
        if (this.mode) this.regs.add(this.mode.resized.connect(updateBG));

        if (!this.mode || !this.mode.container) return;
        this.addObject(this._popup, this.mode.container);
        let globalBoxBounds = DisplayUtil.getBoundsRelative(this._box, this.mode.container);
        DisplayUtil.positionRelativeToBounds(
            this._popup.container, HAlign.LEFT, VAlign.TOP,
            globalBoxBounds, HAlign.LEFT, VAlign.BOTTOM
        );

        let yWalker = 0;
        let maxWidth = this._box.width;
        for (let option of this.options) {
            let text = new TextBalloon(option, 0x152843);
            text.setText(option, this._fontSize, 0xC0DCE7);
            this._popup.addObject(text, this._popup.container);
            text.display.y = yWalker;
            yWalker += text.display.height;
            text.pointerTap.connect(() => {
                this.selectedOption.value = option;
                this._hidePopup();
            });
            // Same as GameButton colors
            text.pointerOver.connect(() => {
                text.setText(option, this._fontSize, 0xFFFFFF);
            });
            text.pointerOut.connect(() => {
                text.setText(option, this._fontSize, 0xC0DCE7);
            });
            text.pointerUp.connect(() => {
                text.setText(option, this._fontSize, 0xC0DCE7);
            });
            text.pointerDown.connect(() => {
                text.setText(option, this._fontSize, 0x333333);
            });
            maxWidth = Math.max(text.display.width + this._PADDING, maxWidth);
        }

        this._popup.setSize(maxWidth, yWalker);
    }

    private _showPopup(): void {
        this._popupVisible = true;
        this._popup.display.visible = true;
        if (!this.mode || !this.mode.container) return;
        let globalBoxBounds = DisplayUtil.getBoundsRelative(this._box, this.mode.container);
        DisplayUtil.positionRelativeToBounds(
            this._popup.container, HAlign.LEFT, VAlign.TOP,
            globalBoxBounds, HAlign.LEFT, VAlign.BOTTOM
        );
    }

    private _hidePopup(): void {
        this._popupVisible = false;
        this._popup.display.visible = false;
    }

    private _drawBox(hover: boolean) {
        const TEXT_WIDTH = (this.options.reduce(
            (max, opt) => Math.max(max, opt.length),
            0
        ) * this._fontSize) / 1.5;
        // There should be an extra _PADDING between the text and the arrow
        const ARROW_WIDTH = this._ARROW_SIDE_SIZE + this._PADDING;

        let width = this._width || (TEXT_WIDTH + ARROW_WIDTH + this._PADDING * 2);

        this._box.clear();
        this._box.lineStyle(this._borderWidth, 0xC0DCE7);
        this._box.beginFill(0x33465F, 0.5);
        this._box.drawRoundedRect(0, 0, width, this._fontSize + this._PADDING * 2, 4);
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
            -(this._PADDING + this._borderWidth)
        );
    }

    public get height(): number {
        return this._fontSize + this._PADDING * 2;
    }

    public get width(): number {
        return this.display.width;
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

        const NEW_TEXT_WIDTH = width - this._borderWidth - this._PADDING * 2 - this._ARROW_SIDE_SIZE;

        this._mask.clear();
        this._mask.beginFill(0x00FF00, 1);
        this._mask.drawRect(0, 0, NEW_TEXT_WIDTH, this.height - this._borderWidth);
        this._mask.endFill();
    }

    public set disabled(disabled: boolean) {
        this._disabled = disabled;
        this._arrow.visible = !disabled;
    }

    public get disabled() {
        return this._disabled;
    }

    private _fontSize: number;

    private _width: number;
    private _hovered: boolean = false;
    private _popupVisible: boolean = false;
    private _borderWidth: number;
    private _disabled: boolean = false;

    private _box: Graphics;
    private _arrow: Graphics = new Graphics();
    private _selectedText: Text;
    private _mask: Graphics;
    private _popup: GamePanel;

    private readonly _PADDING: number = 3;
    private readonly _ARROW_SIDE_SIZE = 8;
}

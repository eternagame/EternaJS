import {
    ContainerObject,
    DisplayUtil,
    HAlign,
    PointerCapture,
    VAlign,
    VLayoutContainer
} from 'flashbang';
import {
    Graphics,
    Point,
    Text,
    Container,
    Sprite,
    Texture
} from 'pixi.js';
import Fonts from 'eterna/util/Fonts';
import {Value} from 'signals';
import {FontWeight} from 'flashbang/util/TextBuilder';
import GameCheckbox from 'eterna/ui/GameCheckbox';
import GamePanel, {GamePanelType} from './GamePanel';
import TextBalloon from './TextBalloon';
import VScrollBox from './VScrollBox';

interface GameDropdownProps {
    fontSize: number;
    options: string[];
    defaultOption: string;
    icons?: {txt:string, icon:string}[];
    borderWidth: number;
    borderColor?: number;
    color?: number;
    textColor?: number;
    textWeight?: FontWeight;
    width?: number;
    height?: number;
    dropShadow?: boolean;
    checkboxes?: boolean;
}

interface OptionItem {
    textBalloon: TextBalloon;
    checkbox?: GameCheckbox;
    icon?: Sprite;
}

export default class GameDropdown extends ContainerObject {
    public readonly selectedOption: Value<string>;
    public readonly options: string[];
    private iconMap: Map<string, Texture> = new Map();

    constructor(props: GameDropdownProps) {
        super();
        this._fontSize = props.fontSize;
        this.options = props.options;
        this._borderWidth = props.borderWidth !== undefined ? props.borderWidth : 1;
        this._borderColor = props.borderColor || 0xC0DCE7;
        this._boxColor = props.color || 0x324B73;
        this._textColor = props.textColor || 0xD0DCE7;
        this._textWeight = props.textWeight || FontWeight.MEDIUM;
        this._checkboxes = props.checkboxes || false;

        if (props.width) {
            this._width = props.width;
        }
        if (props.height) {
            this._height = props.height;
        }

        this.selectedOption = new Value(props.defaultOption);
        if (props.icons) {
            props.icons.forEach((v) => {
                this.iconMap.set(v.txt, Texture.from(v.icon));
            });
        }
    }

    protected added(): void {
        super.added();

        // Use pointer cursor
        if (this._disabled) {
            this.container.cursor = 'not-allowed';
        } else {
            this.container.cursor = 'pointer';
        }

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
            fill: this._textColor,
            fontWeight: this._textWeight
        });

        if (this.iconMap.size > 0) {
            this._selectedIcon = new Sprite();
            this._selectedIcon.width = GameDropdown._ICON_SIZE;
            this._selectedIcon.height = GameDropdown._ICON_SIZE;
            this.container.addChild(this._selectedIcon);
        }
        this.container.addChild(this._selectedText);

        if (this._selectedIcon) {
            DisplayUtil.positionRelative(
                this._selectedIcon, HAlign.LEFT, VAlign.CENTER,
                this._box, HAlign.LEFT, VAlign.CENTER,
                this._borderWidth
            );
        }
        DisplayUtil.positionRelative(
            this._selectedText, HAlign.LEFT, VAlign.CENTER,
            this._box, HAlign.LEFT, VAlign.CENTER,
            this._borderWidth + GameDropdown._HORIZONTAL_PADDING + (this._selectedIcon ? GameDropdown._ICON_SIZE : 0)
        );

        this.regs.add(
            this.selectedOption.connectNotify((selected) => {
                this._selectedText.text = selected;
                const t = this.iconMap.get(selected);
                if (t && this._selectedIcon) this._selectedIcon.texture = t;
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

        this._setupPopup();
        this._hidePopup();
    }

    private _setupPopup() {
        if (!this.mode || !this.mode.container) return;
        this._popup = new ContainerObject();
        this.addObject(this._popup, this.mode.container);
        const scrollViewContainer = new Container();
        this._popup.display.addChild(scrollViewContainer);
        const dropShadowPanel = new GamePanel({
            type: GamePanelType.NORMAL,
            alpha: 1,
            color: this._boxColor,
            dropShadow: true
        });

        this._popup.addObject(dropShadowPanel, scrollViewContainer);
        this._scrollView = new VScrollBox(
            this._box.width,
            GameDropdown._POPUP_VERTICAL_HEIGHT,
            GameDropdown._BORDER_RADIUS
        );
        this._popup.addObject(this._scrollView, scrollViewContainer);
        const contentLayout = new VLayoutContainer(0, HAlign.CENTER);
        this._scrollView.content.addChild(contentLayout);
        const popupPanel = new GamePanel({
            type: GamePanelType.NORMAL,
            alpha: 1,
            color: this._boxColor
        });
        this._popup.addObject(popupPanel, contentLayout);
        this._scrollView.doLayout();

        const globalBoxBounds = DisplayUtil.getBoundsRelative(this._box, this.mode.container);
        DisplayUtil.positionRelativeToBounds(
            this._popup.container, HAlign.LEFT, VAlign.TOP,
            globalBoxBounds, HAlign.LEFT, VAlign.BOTTOM,
            0, GameDropdown._POPUP_VERTICAL_OFFSET
        );

        let yWalker = 0;
        let maxWidth = this._box.width;
        const texts: TextBalloon[] = [];
        for (const option of this.options) {
            const balloonColor = option === this.selectedOption.value ? 0x4471A2 : this._boxColor;
            const iconSize = this._selectedIcon ? GameDropdown._ICON_SIZE : 0;
            const text = new TextBalloon(
                option,
                balloonColor,
                0, // this._width ? 1 : 0.07,
                0,
                0,
                this._width,
                this._width ? GameDropdown._POPUP_ITEM_HEIGHT : null,
                0,
                this._checkboxes
                    ? GameDropdown._POPUP_CHECKBOX_HEIGHT + 2 * GameDropdown._POPUP_CHECKBOX_PADDING + iconSize
                    : iconSize
            );
            text.setText(option, this._fontSize, 0xC0DCE7);
            const txtBack = new Graphics();
            txtBack.clear();
            txtBack.beginFill(this._boxColor, 1);
            txtBack.drawRect(0, 0, this._width ? this._width : 500, GameDropdown._POPUP_ITEM_HEIGHT);
            txtBack.endFill();
            text.display.addChildAt(txtBack, 0);
            this._popup.addObject(text, contentLayout);
            texts.push(text);

            let checkbox: GameCheckbox | null;
            if (this.iconMap.size > 0) {
                const icon = new Sprite(this.iconMap.get(option));
                icon.width = GameDropdown._ICON_SIZE;
                icon.height = GameDropdown._ICON_SIZE;
                icon.x = GameDropdown._HORIZONTAL_PADDING / 2;
                icon.y = (text.display.height - GameDropdown._ICON_SIZE) / 2;
                this.addObject(new ContainerObject(icon), text.display);
                this._optionItems.push({icon, textBalloon: text});
            } else if (this._checkboxes) {
                checkbox = new GameCheckbox(GameDropdown._POPUP_CHECKBOX_HEIGHT, '', true);
                checkbox.enabled = false;
                checkbox.toggled.value = option === this.selectedOption.value;
                checkbox.display.x = GameDropdown._POPUP_CHECKBOX_HEIGHT + 2;
                checkbox.display.y = GameDropdown._POPUP_CHECKBOX_HEIGHT + 2;
                this.addObject(checkbox, text.display);

                // Save to option item array
                this._optionItems.push({textBalloon: text, checkbox});
            } else {
                this._optionItems.push({textBalloon: text});
            }

            text.display.y = yWalker;
            yWalker += text.display.height;
            text.pointerTap.connect(() => {
                this.selectedOption.value = option;
                // Reset all option colors
                for (const optionItem of this._optionItems) {
                    if (optionItem.textBalloon.display.parent) {
                        optionItem.textBalloon.setBalloonColor(this._boxColor);
                    }
                    if (optionItem.checkbox && optionItem.checkbox.display.parent) {
                        optionItem.checkbox.toggled.value = false;
                    }
                }
                // Set selected color
                if (text.display.parent) {
                    text.setBalloonColor(0x4471A2);
                }

                // Check checkbox
                if (this._checkboxes && checkbox && checkbox.display.parent) {
                    checkbox.toggled.value = true;
                }
                this._hidePopup();
            });
            // Same as GameButton colors
            text.pointerOver.connect(() => {
                text.setText(option, this._fontSize, 0xFFFFFF);
                // Only change background if not selected
                if (text.text.text !== this.selectedOption.value) {
                    text.setBalloonColor(0x053E7A);
                }
                txtBack.clear();
                txtBack.beginFill(this._boxColor + 0x202020, 1);
                txtBack.drawRect(0, 0, this._width ? this._width : 500, GameDropdown._POPUP_ITEM_HEIGHT);
                txtBack.endFill();
            });
            text.pointerOut.connect(() => {
                text.setText(option, this._fontSize, 0xC0DCE7);
                if (text.text.text !== this.selectedOption.value) {
                    text.setBalloonColor(this._boxColor);
                }
                txtBack.clear();
                txtBack.beginFill(this._boxColor, 1);
                txtBack.drawRect(0, 0, this._width ? this._width : 500, GameDropdown._POPUP_ITEM_HEIGHT);
                txtBack.endFill();
            });
            text.pointerUp.connect(() => {
                text.setText(option, this._fontSize, 0xC0DCE7);
                if (text.text.text !== this.selectedOption.value) {
                    text.setBalloonColor(this._boxColor);
                }
            });
            text.pointerDown.connect(() => {
                text.setText(option, this._fontSize, 0x333333);
            });
            maxWidth = Math.max(text.display.width + GameDropdown._HORIZONTAL_PADDING, maxWidth);
        }
        for (const text of texts) {
            text.setSize(maxWidth, text.height);
        }
        popupPanel.setSize(this._box.width, yWalker);
        let popupPanelHeight = GameDropdown._POPUP_VERTICAL_HEIGHT;
        if (GameDropdown._POPUP_VERTICAL_HEIGHT / this.options.length > GameDropdown._POPUP_ITEM_HEIGHT) {
            // Make popup panel height shorter if there aren't enough items in it fill default height
            popupPanelHeight = this.options.length * GameDropdown._POPUP_ITEM_HEIGHT;
        }
        dropShadowPanel.setSize(this._box.width, popupPanelHeight);
        this._scrollView.updateScrollThumb();
    }

    public repositionPopup() {
        if (!this.mode || !this.mode.container) return;
        const globalBoxBounds = DisplayUtil.getBoundsRelative(this._box, this.mode.container);
        DisplayUtil.positionRelativeToBounds(
            this._popup.container, HAlign.LEFT, VAlign.TOP,
            globalBoxBounds, HAlign.LEFT, VAlign.BOTTOM,
            0, GameDropdown._POPUP_VERTICAL_OFFSET
        );
    }

    private _showPopup(): void {
        this._popupVisible = true;
        this._popup.display.visible = true;
        if (!this.mode || !this.mode.container) return;
        const globalBoxBounds = DisplayUtil.getBoundsRelative(this._box, this.mode.container);
        DisplayUtil.positionRelativeToBounds(
            this._popup.container, HAlign.LEFT, VAlign.TOP,
            globalBoxBounds, HAlign.LEFT, VAlign.BOTTOM,
            0, GameDropdown._POPUP_VERTICAL_OFFSET
        );

        this._activeCapture = new PointerCapture(this._popup.display, (e) => {
            if (e.type === 'pointertap') {
                this._hidePopup();
            }
            e.stopPropagation();
        });
        this._popup.addObject(this._activeCapture);
    }

    private _hidePopup(): void {
        this._popupVisible = false;
        this._popup.display.visible = false;
        if (this._activeCapture && this.isLiveObject) {
            this._popup.removeObject(this._activeCapture);
            this._activeCapture = null;
        }
    }

    private _drawBox(_hover: boolean) {
        let TEXT_WIDTH = this.options.reduce(
            (max, opt) => Math.max(max, opt.length),
            0
        );
        if (this.disabled) TEXT_WIDTH = this.selectedOption.value.length;
        TEXT_WIDTH *= this._fontSize / 1.5;
        // There should be an extra _PADDING between the text and the arrow
        const ARROW_WIDTH = GameDropdown._ARROW_SIDE_SIZE + GameDropdown._HORIZONTAL_PADDING;

        let width = 0;
        if (this.disabled) {
            width = TEXT_WIDTH + GameDropdown._HORIZONTAL_PADDING;
        } else if (!this.disabled && this._width && this._width !== 0) {
            width = this._width;
        } else {
            width = TEXT_WIDTH + ARROW_WIDTH + GameDropdown._HORIZONTAL_PADDING;
        }
        if (this.iconMap.size > 0) width += GameDropdown._ICON_SIZE;

        let height = 0;
        if (this._height && this._height !== 0) {
            height = this._height;
        } else {
            height = this._fontSize + GameDropdown._VERTICAL_PADDING * 2;
        }

        this._box.clear();
        this._box.lineStyle(this._borderWidth, this._borderColor);
        this._box.beginFill(this._boxColor, 1);
        this._box.drawRoundedRect(0, 0, width, height, GameDropdown._BORDER_RADIUS);
        this._box.endFill();
    }

    private _drawArrow() {
        const ARROW_HEIGHT = (GameDropdown._ARROW_SIDE_SIZE * Math.sqrt(3)) / 3;

        this._arrow.clear();
        this._arrow.beginFill(this._textColor);
        this._arrow.drawPolygon([
            new Point(0, 0),
            new Point(GameDropdown._ARROW_SIDE_SIZE, 0),
            new Point(GameDropdown._ARROW_SIDE_SIZE / 2, ARROW_HEIGHT)
        ]);
        this._arrow.endFill();

        DisplayUtil.positionRelative(
            this._arrow, HAlign.RIGHT, VAlign.CENTER,
            this._box, HAlign.RIGHT, VAlign.CENTER,
            -(GameDropdown._HORIZONTAL_PADDING + this._borderWidth)
        );
    }

    public get height(): number {
        return this._fontSize + GameDropdown._VERTICAL_PADDING * 2;
    }

    public get width(): number {
        return this.display.width;
    }

    public set disabled(disabled: boolean) {
        this._disabled = disabled;
        this._arrow.visible = !disabled;
        if (disabled) {
            this.container.cursor = 'not-allowed';
        } else {
            this.container.cursor = 'pointer';
        }
    }

    public get disabled() {
        return this._disabled;
    }

    private _fontSize: number;

    private _width: number | null;
    private _height: number | null;
    private _hovered: boolean = false;
    private _popupVisible: boolean = false;
    private _borderWidth: number;
    private _borderColor: number;
    private _textColor: number;
    private _textWeight: FontWeight;
    private _disabled: boolean = false;
    private _boxColor: number;
    private _checkboxes: boolean;

    private _box: Graphics;
    private _arrow: Graphics = new Graphics();
    private _selectedText: Text;
    private _selectedIcon?: Sprite;
    private _popup: ContainerObject;
    private _scrollView: VScrollBox;
    private _activeCapture: PointerCapture | null;

    private _optionItems: OptionItem[] = [];

    private static readonly _HORIZONTAL_PADDING: number = 10;
    private static readonly _VERTICAL_PADDING: number = 3;
    private static readonly _BORDER_RADIUS: number = 4;
    private static readonly _ARROW_SIDE_SIZE = 10;
    private static readonly _POPUP_VERTICAL_OFFSET = 5;
    private static readonly _POPUP_VERTICAL_HEIGHT = 120;
    private static readonly _POPUP_ITEM_HEIGHT = 30;
    private static readonly _ICON_SIZE = 20;
    private static readonly _POPUP_CHECKBOX_HEIGHT = 18;
    private static readonly _POPUP_CHECKBOX_PADDING = 5;
}

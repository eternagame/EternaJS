import {
    Container, DisplayObject, Graphics, Rectangle, Sprite, Text, Texture
} from 'pixi.js';
import {Registration, Registrations, Value} from 'signals';
import {
    Button, KeyboardListener, ButtonState, TextBuilder, KeyboardEventType, DisplayUtil, HAlign, VAlign, Assert
} from 'flashbang';
import {RScriptUIElementID} from 'eterna/rscript/RScriptUIElement';
import ROPWait from 'eterna/rscript/ROPWait';
import Fonts from 'eterna/util/Fonts';
import Sounds from 'eterna/resources/Sounds';
import Tooltips from './Tooltips';

export default class GameButton extends Button implements KeyboardListener {
    public readonly toggled: Value<boolean> = new Value<boolean>(false);
    public static readonly DEFAULT_DOWN_SOUND: string = Sounds.SoundButtonClick;
    public size: number = 0;
    public age: number = 0;
    public name: string | null = null;

    constructor() {
        super();

        this.downSound = GameButton.DEFAULT_DOWN_SOUND;

        this._content = new Container();
        this.container.addChild(this._content);
    }

    public setName(name: string): GameButton {
        this.name = name;
        this.display.name = name;
        return this;
    }

    protected added(): void {
        super.added();

        this.toggled.connect((toggled) => this.onToggledChanged(toggled));
        this.clicked.connect(() => {
            if (this._selectedState != null) {
                this.toggle();
            }
        });

        this.setupHotkey();
        this.setupTooltip();
    }

    public up(display: DisplayObject | Texture | string| undefined): GameButton {
        return this.setIconForState(ButtonState.UP, display);
    }

    public over(display: DisplayObject | Texture | string| undefined): GameButton {
        return this.setIconForState(ButtonState.OVER, display);
    }

    public down(display: DisplayObject | Texture | string| undefined): GameButton {
        return this.setIconForState(ButtonState.DOWN, display);
    }

    public disabled(display?: DisplayObject | Texture | string): GameButton {
        return this.setIconForState(ButtonState.DISABLED, display);
    }

    /** Sets a single DisplayObect for all states */
    public allStates(display: DisplayObject | Texture | string| undefined): GameButton {
        return this.up(display).over(display).down(display).disabled(display);
    }

    public selected(display: DisplayObject | Texture | string): GameButton {
        this._selectedState = GameButton.getDisplayObject(display);
        return this;
    }

    public rscriptID(value: RScriptUIElementID): GameButton {
        if (this._rscriptID !== value) {
            this._rscriptID = value;
            this._rscriptClickReg.close();
            if (value != null) {
                this._rscriptClickReg = this.clicked.connect(() => {
                    ROPWait.notifyClickUI(this._rscriptID);
                });
            }
        }
        return this;
    }

    public get isSelected(): boolean {
        return this.toggled.value;
    }

    public customStyleBox(stylebox: Graphics): GameButton {
        this._customStyleBox = stylebox;
        return this;
    }

    public label(
        text: string | TextBuilder,
        fontSize?: number,
        background?: boolean,
        customTextColors?: Map<ButtonState, number>
    ): GameButton {
        if (typeof (text) === 'string') {
            this._labelBuilder = Fonts.std(text as string).fontSize(fontSize || 22).bold().color(0xFFFFFF);
        } else {
            this._labelBuilder = text as TextBuilder;
        }
        this._labelBackground = background;
        this._customTextColors = customTextColors;
        this.needsRedraw();
        return this;
    }

    public fixedLabelWidth(width: number): GameButton {
        if (this._fixedLabelWidth !== width) {
            this._fixedLabelWidth = width;
            this.needsRedraw();
        }
        return this;
    }

    public scaleBitmapToLabel(): GameButton {
        this._scaleIconToLabel = true;
        this.needsRedraw();
        return this;
    }

    public scaleTo(size:number): GameButton {
        this.size = size;
        this.needsRedraw();
        return this;
    }

    public tooltip(text: string): GameButton {
        if (this._tooltip !== text) {
            this._tooltip = text;
            if (this.isLiveObject) {
                this.setupTooltip();
            }
        }
        return this;
    }

    public hotkey(keycode?: string, ctrl: boolean = false): GameButton {
        if (keycode !== this._hotkey || ctrl !== this._hotkeyCtrl) {
            this._hotkey = keycode ?? null;
            this._hotkeyCtrl = ctrl;
            if (this.isLiveObject) {
                this.setupHotkey();
            }
        }

        return this;
    }

    public onKeyboardEvent(e: KeyboardEvent): boolean {
        if (this.enabled
            && this.display.visible
            && e.type === KeyboardEventType.KEY_UP
            && e.code === this._hotkey
            && e.ctrlKey === this._hotkeyCtrl) {
            this.click();
            return true;
        }

        return false;
    }

    public toggle(): void {
        this.toggled.value = !this.toggled.value;
    }

    protected onToggledChanged(_toggled: boolean): void {
        this.showState(this._state);
    }

    protected showState(state: ButtonState): void {
        this._content.removeChildren();
        this._content.alpha = 1;

        let icon = this.getIconForState(state, this.isSelected);
        if (icon == null && state === ButtonState.DISABLED) {
            // If we're missing the disabled state, use the UP state at 50% alpha
            icon = this.getIconForState(ButtonState.UP, this.isSelected);
            this._content.alpha = 0.5;
        }

        if (icon != null) {
            icon.x = 0;
            icon.y = 0;
            icon.scale.x = 1;
            icon.scale.y = 1;
            this._content.addChild(icon);
        }

        // Create label
        let label: Text | null = null;
        if (this._labelBuilder != null) {
            const textColor = this._customTextColors?.get(state) ?? GameButton.TEXT_COLORS.get(state);
            label = this._labelBuilder.color(textColor ?? 0xffffff).build();
            this._content.addChild(label);
        }

        // Stylebox (shown when we have text and no background image)
        const drawStyleBox = this._customStyleBox == null
            && icon == null
            && label !== null
            && this._labelBackground !== false;

        if (drawStyleBox) {
            // We can safely assert label is non-null because
            // that is a requirement for drawStyleBox
            Assert.assertIsDefined(label);
            const labelWidth = this._fixedLabelWidth > 0 ? this._fixedLabelWidth : label.width;
            const styleBox = new Graphics()
                .beginFill(GameButton.STYLEBOX_COLORS.get(state) || 0x0)
                .drawRoundedRect(0, 0,
                    labelWidth + (GameButton.WMARGIN * 2),
                    label.height + (GameButton.HMARGIN * 2),
                    3)
                .endFill();
            this._content.addChildAt(styleBox, 0);
        }

        if (this._customStyleBox) {
            this._content.addChildAt(this._customStyleBox, 0);
        }

        // Position label
        if (label != null) {
            if (this._scaleIconToLabel && icon != null) {
                const scale: number = (1.5 * label.height) / this._content.height;
                icon.scale.set(scale, scale);
            }

            this._content.addChild(label);
            if (this._customStyleBox) {
                DisplayUtil.positionRelative(
                    label, HAlign.CENTER, VAlign.CENTER,
                    this._customStyleBox, HAlign.CENTER, VAlign.CENTER
                );
            } else if (icon == null) {
                label.position.set(GameButton.WMARGIN, GameButton.HMARGIN);
            } else {
                DisplayUtil.positionRelative(
                    label, HAlign.LEFT, VAlign.CENTER,
                    icon, HAlign.RIGHT, VAlign.CENTER,
                    5, 0
                );
            }

            if (icon != null) {
                // if we have an icon, add an invisible hitbox to prevent unclickable pixels
                // between the icon and the label
                const bounds = this._content.getLocalBounds(GameButton.SCRATCH_RECT);
                const hitbox = new Graphics()
                    .beginFill(0xff0000, 0)
                    .drawRect(bounds.x, bounds.y, bounds.width, bounds.height)
                    .endFill();
                this._content.addChildAt(hitbox, 0);
            }
        } else if (this.size > 0 && icon != null) {
            const scale: number = this.size / this._content.height;
            icon.scale.set(scale, scale);
        }
    }

    private setupHotkey(): void {
        if (this._hotkeyReg != null) {
            this._hotkeyReg.close();
            this._hotkeyReg = null;
        }

        if (this._hotkey != null) {
            Assert.assertIsDefined(this.mode);
            this._hotkeyReg = this.regs.add(this.mode.keyboardInput.pushListener(this));
        }
    }

    private setupTooltip(): void {
        if (this._tooltipReg != null) {
            this._tooltipReg.close();
            this._tooltipReg = null;
        }

        if (this._tooltip != null && this._tooltip !== '' && Tooltips.instance != null) {
            this._tooltipReg = this.regs.add(Tooltips.instance.addTooltip(this, this._tooltip));
        }
    }

    public activateTooltip() {

    }

    public deactivateTooltip() {

    }

    private needsRedraw() {
        if (this.isLiveObject) {
            this.showState(this._state);
        }
    }

    private setIconForState(state: ButtonState, displayOrTex?: DisplayObject | Texture | string): GameButton {
        if (this._buttonIcons == null) {
            this._buttonIcons = [];
        }

        this._buttonIcons[state] = GameButton.getDisplayObject(displayOrTex);
        this.needsRedraw();
        return this;
    }

    private getIconForState(state: ButtonState, selected: boolean): DisplayObject | null {
        if (state !== ButtonState.DISABLED && selected && this._selectedState != null) {
            return this._selectedState;
        } else {
            return this._buttonIcons != null && this._buttonIcons.length > state
                ? this._buttonIcons[state]
                : null;
        }
    }

    private static getDisplayObject(displayOrTex?: DisplayObject | Texture | string): DisplayObject | null {
        if (displayOrTex instanceof DisplayObject) {
            return displayOrTex;
        } else if (displayOrTex instanceof Texture) {
            return new Sprite(displayOrTex);
        } else if (typeof (displayOrTex) === 'string') {
            if (displayOrTex.includes('.svg')) {
                const texture = Texture.from(displayOrTex, {resourceOptions: {scale: 2}});
                const sprite = new Sprite(texture);
                return sprite;
            } else return Sprite.from(displayOrTex);
        } else {
            return null;
        }
    }

    public getContent() {
        return this._content;
    }

    private readonly _content: Container;

    private _labelBuilder: TextBuilder;
    private _labelBackground?: boolean;
    private _fixedLabelWidth: number = 0;
    private _scaleIconToLabel: boolean = false;
    private _tooltip: string;
    private _hotkey: string | null;
    private _hotkeyCtrl: boolean;
    private _buttonIcons: (DisplayObject | null)[];
    private _selectedState: DisplayObject | null;
    private _customStyleBox?: Graphics;
    private _customTextColors?: Map<ButtonState, number>;

    private _rscriptID: RScriptUIElementID;
    private _rscriptClickReg: Registration = Registrations.Null();

    private _hotkeyReg: Registration | null;
    private _tooltipReg: Registration | null;

    private static readonly TEXT_COLORS: Map<ButtonState, number> = new Map([
        [ButtonState.UP, 0xC0DCE7],
        [ButtonState.OVER, 0xFFFFFF],
        [ButtonState.DOWN, 0x333333],
        [ButtonState.DISABLED, 0x999999]
    ]);

    private static readonly STYLEBOX_COLORS: Map<ButtonState, number> = new Map([
        [ButtonState.UP, 0x2D4159],
        [ButtonState.OVER, 0x2D4159],
        [ButtonState.DOWN, 0xFFCC00],
        [ButtonState.DISABLED, 0x2D4159]
    ]);

    private static readonly WMARGIN = 5;
    private static readonly HMARGIN = 4;

    private static readonly SCRATCH_RECT = new Rectangle();
}

import {
    Container, DisplayObject, Graphics, Point, Rectangle, Sprite, Text, Texture
} from 'pixi.js';
import {Registration, Registrations, Value} from 'signals';
import {
    Button, KeyboardListener, ButtonState, TextBuilder, KeyboardEventType, DisplayUtil, HAlign, VAlign
} from 'flashbang';
import {RScriptUIElementID} from 'eterna/rscript/RScriptUIElement';
import ROPWait from 'eterna/rscript/ROPWait';
import Fonts from 'eterna/util/Fonts';
import Sounds from 'eterna/resources/Sounds';
import Tooltips from './Tooltips';

export default class GameButton extends Button implements KeyboardListener {
    public readonly toggled: Value<boolean> = new Value<boolean>(false);
    public static readonly DEFAULT_DOWN_SOUND: string = Sounds.SoundButtonClick;

    constructor() {
        super();

        this.downSound = GameButton.DEFAULT_DOWN_SOUND;

        this._content = new Container();
        this.container.addChild(this._content);
    }

    protected added(): void {
        super.added();

        this.toggled.connect(toggled => this.onToggledChanged(toggled));
        this.clicked.connect(() => {
            if (this._selectedState != null) {
                this.toggle();
            }
        });

        this.setupHotkey();
        this.setupTooltip();
    }

    public up(display: DisplayObject | Texture | string): GameButton {
        return this.setIconForState(ButtonState.UP, display);
    }

    public over(display: DisplayObject | Texture | string): GameButton {
        return this.setIconForState(ButtonState.OVER, display);
    }

    public down(display: DisplayObject | Texture | string): GameButton {
        return this.setIconForState(ButtonState.DOWN, display);
    }

    public disabled(display: DisplayObject | Texture | string): GameButton {
        return this.setIconForState(ButtonState.DISABLED, display);
    }

    /** Sets a single DisplayObect for all states */
    public allStates(display: DisplayObject | Texture | string): GameButton {
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

    public label(text: string | TextBuilder, fontSize?: number): GameButton {
        if (typeof (text) === 'string') {
            this._labelBuilder = Fonts.arial(text as string).fontSize(fontSize || 22).bold().color(0xFFFFFF);
        } else {
            this._labelBuilder = text as TextBuilder;
        }
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

    public tooltip(text: string): GameButton {
        if (this._tooltip !== text) {
            this._tooltip = text;
            if (this.isLiveObject) {
                this.setupTooltip();
            }
        }
        return this;
    }

    public hotkey(keycode: string, ctrl: boolean = false): GameButton {
        if (keycode !== this._hotkey || ctrl !== this._hotkeyCtrl) {
            this._hotkey = keycode;
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
            && e.type === KeyboardEventType.KEY_DOWN
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

    protected onToggledChanged(toggled: boolean): void {
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
        let label: Text;
        if (this._labelBuilder != null) {
            label = this._labelBuilder.color(GameButton.TEXT_COLORS.get(state) || 0xffffff).build();
            this._content.addChild(label);
        }

        // Stylebox (shown when we have text and no background image)
        const drawStyleBox = icon == null && label != null;
        if (drawStyleBox) {
            const labelWidth = this._fixedLabelWidth > 0 ? this._fixedLabelWidth : label.width;
            let styleBox = new Graphics()
                .beginFill(GameButton.STYLEBOX_COLORS.get(state) || 0x0)
                .drawRoundedRect(0, 0,
                    labelWidth + (GameButton.WMARGIN * 2),
                    label.height + (GameButton.HMARGIN * 2),
                    3)
                .endFill();
            this._content.addChildAt(styleBox, 0);
        }

        // Position label
        if (label != null) {
            if (this._scaleIconToLabel && icon != null) {
                let scale: number = 1.5 * label.height / this._content.height;
                icon.scale = new Point(scale, scale);
            }

            this._content.addChild(label);
            if (icon == null) {
                label.position = new Point(GameButton.WMARGIN, GameButton.HMARGIN);
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
                let bounds = this._content.getLocalBounds(GameButton.SCRATCH_RECT);
                let hitbox = new Graphics()
                    .beginFill(0xff0000, 0)
                    .drawRect(bounds.x, bounds.y, bounds.width, bounds.height)
                    .endFill();
                this._content.addChildAt(hitbox, 0);
            }
        }
    }

    private setupHotkey(): void {
        if (this._hotkeyReg != null) {
            this._hotkeyReg.close();
            this._hotkeyReg = null;
        }

        if (this._hotkey != null) {
            this._hotkeyReg = this.regs.add(this.mode.keyboardInput.pushListener(this));
        }
    }

    private setupTooltip(): void {
        if (this._tooltipReg != null) {
            this._tooltipReg.close();
            this._tooltipReg = null;
        }

        if (this._tooltip != null && Tooltips.instance != null) {
            this._tooltipReg = this.regs.add(Tooltips.instance.addButtonTooltip(this, this._tooltip));
        }
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

    private getIconForState(state: ButtonState, selected: boolean): DisplayObject {
        if (state !== ButtonState.DISABLED && selected && this._selectedState != null) {
            return this._selectedState;
        } else {
            return this._buttonIcons != null && this._buttonIcons.length > state
                ? this._buttonIcons[state]
                : null;
        }
    }

    private static getDisplayObject(displayOrTex: DisplayObject | Texture | string): DisplayObject {
        if (displayOrTex instanceof DisplayObject) {
            return displayOrTex;
        } else if (displayOrTex instanceof Texture) {
            return new Sprite(displayOrTex);
        } else if (typeof (displayOrTex) === 'string') {
            return Sprite.fromImage(displayOrTex);
        } else {
            return null;
        }
    }

    private readonly _content: Container;

    private _labelBuilder: TextBuilder;
    private _fixedLabelWidth: number = 0;
    private _scaleIconToLabel: boolean = false;
    private _tooltip: string;
    private _hotkey: string;
    private _hotkeyCtrl: boolean;
    private _buttonIcons: DisplayObject[];
    private _selectedState: DisplayObject;

    private _rscriptID: RScriptUIElementID;
    private _rscriptClickReg: Registration = Registrations.Null();

    private _hotkeyReg: Registration;
    private _tooltipReg: Registration;

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

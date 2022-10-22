import {
    Container, Graphics, Sprite, Text, Texture
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

export type ButtonTheme = 'primary' | 'secondary';

export default class GameButton extends Button implements KeyboardListener {
    public readonly toggled: Value<boolean> = new Value<boolean>(false);
    public static readonly DEFAULT_DOWN_SOUND: string = Sounds.SoundButtonClick;
    public size: number = 0;
    public age: number = 0;

    constructor(theme: ButtonTheme = 'primary') {
        super();

        this._theme = theme;
        this.downSound = GameButton.DEFAULT_DOWN_SOUND;

        this._content = new Container();
        this.container.addChild(this._content);
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
        this.needsRedraw();
    }

    public up(display: Container | Texture | string| undefined): GameButton {
        return this.setIconForState(ButtonState.UP, display);
    }

    public over(display: Container | Texture | string| undefined): GameButton {
        return this.setIconForState(ButtonState.OVER, display);
    }

    public down(display: Container | Texture | string| undefined): GameButton {
        return this.setIconForState(ButtonState.DOWN, display);
    }

    public disabled(display?: Container | Texture | string): GameButton {
        return this.setIconForState(ButtonState.DISABLED, display);
    }

    /** Sets a single DisplayObect for all states */
    public allStates(display: Container | Texture | string| undefined): GameButton {
        return this.up(display).over(display).down(display).disabled(display);
    }

    public selected(display: Container | Texture | string): GameButton {
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
            const textColor = this._customTextColors?.get(state) ?? GameButton.TEXT_COLORS.get(this._theme)?.get(state);
            label = this._labelBuilder.color(textColor ?? 0xffffff).build();
            this._content.addChild(label);
        }

        // Stylebox (shown when we have text and no background image)
        const drawStyleBox = (this._customStyleBox == null
            && icon == null
            && label !== null
            && this._labelBackground !== false) || this._labelBackground === true;

        if (drawStyleBox) {
            // We can safely assert label is non-null because
            // that is a requirement for drawStyleBox
            Assert.assertIsDefined(label);
            const labelWidth = this._fixedLabelWidth > 0 ? this._fixedLabelWidth : label.width + (icon?.width ?? 0);
            const styleBox = new Graphics()
                .beginFill(GameButton.STYLEBOX_COLORS.get(this._theme)?.get(state) || 0x0)
                .drawRoundedRect(0, 0,
                    labelWidth + (GameButton.WMARGIN * 2),
                    label.height + (GameButton.HMARGIN * 2),
                    5)
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
                label.position.set(
                    (this._customStyleBox.width - label.width) / 2,
                    (this._customStyleBox.height - label.height) / 2
                );
                DisplayUtil.positionRelative(
                    label, HAlign.CENTER, VAlign.CENTER,
                    this._customStyleBox, HAlign.CENTER, VAlign.CENTER
                );
            } else if (icon == null) {
                label.position.set(GameButton.WMARGIN, GameButton.HMARGIN);
            } else {
                label.position.set(
                    icon.x + icon.width + 5,
                    (icon.height - label.height) / 2
                );
            }
        }

        if (!drawStyleBox && !this._skipHitArea) {
            this.display.hitArea = DisplayUtil.getBoundsRelative(this._content, this.display);
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

    private needsRedraw() {
        if (this.isLiveObject) {
            this.showState(this._state);
        }
    }

    private setIconForState(state: ButtonState, displayOrTex?: Container | Texture | string): GameButton {
        if (this._buttonIcons == null) {
            this._buttonIcons = [];
        }

        this._buttonIcons[state] = GameButton.getDisplayObject(displayOrTex);
        this.needsRedraw();
        return this;
    }

    private getIconForState(state: ButtonState, selected: boolean): Container | null {
        if (state !== ButtonState.DISABLED && selected && this._selectedState != null) {
            return this._selectedState;
        } else {
            return this._buttonIcons != null && this._buttonIcons.length > state
                ? this._buttonIcons[state]
                : null;
        }
    }

    private static getDisplayObject(displayOrTex?: Container | Texture | string): Container | null {
        if (displayOrTex instanceof Container) {
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

    protected centerContent(width: number, height: number) {
        if (this._content.width < width) this._content.position.x = (width - this._content.width) / 2;
        if (this._content.height < height) this._content.position.y = (height - this._content.height) / 2;
    }

    private readonly _content: Container;

    private _labelBuilder: TextBuilder;
    private _labelBackground?: boolean;
    private _fixedLabelWidth: number = 0;
    private _scaleIconToLabel: boolean = false;
    private _tooltip: string;
    private _hotkey: string | null;
    private _hotkeyCtrl: boolean;
    private _buttonIcons: (Container | null)[];
    private _selectedState: Container | null;
    private _customStyleBox?: Graphics;
    private _customTextColors?: Map<ButtonState, number>;
    protected _skipHitArea = false;

    private _rscriptID: RScriptUIElementID;
    private _rscriptClickReg: Registration = Registrations.Null();

    private _hotkeyReg: Registration | null;
    private _tooltipReg: Registration | null;

    private _theme: ButtonTheme;

    private static readonly TEXT_COLORS: Map<ButtonTheme, Map<ButtonState, number>> = new Map([
        [
            'primary',
            new Map([
                [ButtonState.UP, 0xFFFFFF],
                [ButtonState.OVER, 0xFFFFFF],
                [ButtonState.DOWN, 0x46A840],
                [ButtonState.DISABLED, 0xFFFFFF]
            ])
        ],
        [
            'secondary',
            new Map([
                [ButtonState.UP, 0xFFFFFF],
                [ButtonState.OVER, 0xFFFFFF],
                [ButtonState.DOWN, 0x2888c3],
                [ButtonState.DISABLED, 0xFFFFFF]
            ])
        ]
    ]);

    private static readonly STYLEBOX_COLORS: Map<ButtonTheme, Map<ButtonState, number>> = new Map([
        [
            'primary',
            new Map([
                [ButtonState.UP, 0x54B54E],
                [ButtonState.OVER, 0x46A840],
                [ButtonState.DOWN, 0xFFFFFF],
                // FIXME: I picked this relatively arbitrary, we could probably do better
                [ButtonState.DISABLED, 0x73A770]
            ])
        ],
        [
            'secondary',
            new Map([
                [ButtonState.UP, 0x2f94d1],
                [ButtonState.OVER, 0x2888c3],
                [ButtonState.DOWN, 0xFFFFFF],
                // FIXME: I picked this relatively arbitrary, we could probably do better
                [ButtonState.DISABLED, 0x5a9bc2]
            ])
        ]
    ]);

    private static readonly WMARGIN = 12;
    private static readonly HMARGIN = 6;
}

import {Graphics, Point, Sprite, Text, Texture} from "pixi.js";
import {KeyboardEventType} from "../../flashbang/input/KeyboardEventType";
import {KeyboardListener} from "../../flashbang/input/KeyboardInput";
import {Button, ButtonState} from "../../flashbang/objects/Button";
import {TextBuilder} from "../../flashbang/util/TextBuilder";
import {Registration} from "../../signals/Registration";
import {Registrations} from "../../signals/Registrations";
import {Value} from "../../signals/Value";
import {ROPWait} from "../rscript/ROPWait";
import {RScriptUIElementID} from "../rscript/RScriptUIElement";
import {Fonts} from "../util/Fonts";

export class GameButton extends Button implements KeyboardListener {
    public readonly toggled: Value<boolean> = new Value(false);

    public constructor() {
        super();

        this._img = new Sprite();
        this.container.addChild(this._img);
    }

    protected added(): void {
        super.added();

        this.toggled.connect((toggled: boolean) => this.onToggledChanged(toggled));
        this.clicked.connect(() => {
            if (this._selectedTexture != null) {
                this.toggle();
            }
        });

        this.installHotkeyListener();
    }

    public up(tex: Texture | string): GameButton {
        return this.setTexture(ButtonState.UP, tex);
    }

    public over(tex: Texture | string): GameButton {
        return this.setTexture(ButtonState.OVER, tex);
    }

    public down(tex: Texture | string): GameButton {
        return this.setTexture(ButtonState.DOWN, tex);
    }

    public disabled(tex: Texture | string): GameButton {
        return this.setTexture(ButtonState.DISABLED, tex);
    }

    /** Sets a single texture for all states */
    public allStates(tex: Texture | string): GameButton {
        return this.up(tex).over(tex).down(tex).disabled(tex);
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

    public selected(tex: Texture | string): GameButton {
        this._selectedTexture = (tex instanceof Texture ? tex as Texture : Texture.fromImage(tex as string));
        return this;
    }

    public get isSelected(): boolean {
        return this.toggled.value;
    }

    public label(text: string | TextBuilder, fontSize?: number): GameButton {
        if (typeof (text) === "string") {
            this._labelBuilder = Fonts.arial(text as string).fontSize(fontSize || 22).bold().color(0xFFFFFF);
        } else {
            this._labelBuilder = text as TextBuilder;
        }
        this.needsRedraw();
        return this;
    }

    public scaleBitmapToLabel(): GameButton {
        this._scaleBitmapToLabel = true;
        this.needsRedraw();
        return this;
    }

    public tooltip(text: string): GameButton {
        // TODO
        this._tooltip = text;
        return this;
    }

    public hotkey(keycode: string, ctrl: boolean = false): GameButton {
        if (keycode !== this._hotkey || ctrl !== this._hotkeyCtrl) {
            this._hotkey = keycode;
            this._hotkeyCtrl = ctrl;
            if (this.isLiveObject) {
                this.installHotkeyListener();
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
        this._img.alpha = 1;
        let tex: Texture = this.getTexture(state, this.isSelected);
        if (tex == null && state == ButtonState.DISABLED) {
            // If we're missing the disabled texture, use the UP texture at 50% alpha
            tex = this.getTexture(ButtonState.UP, this.isSelected);
            this._img.alpha = 0.5;
        }
        this._img.texture = tex || Texture.EMPTY;

        // Create label
        if (this._label != null) {
            this._label.destroy({children: true});
            this._label = null;
        }

        if (this._labelBuilder != null) {
            this._label = this._labelBuilder.color(GameButton.TEXT_COLORS.get(state) || 0xffffff).build();
        }

        // Stylebox (shown when we have text and no background image)
        const drawStyleBox: boolean = tex == null && this._label != null;
        if (drawStyleBox) {
            if (this._styleBox == null) {
                this._styleBox = new Graphics();
                this.container.addChildAt(this._styleBox, 1);
            }

            this._styleBox.clear();
            this._styleBox.beginFill(GameButton.STYLEBOX_COLORS.get(state) || 0x0);
            this._styleBox.drawRoundedRect(0, 0,
                this._label.width + (GameButton.WMARGIN * 2),
                this._label.height + (GameButton.HMARGIN * 2),
                3);
            this._styleBox.endFill();
        } else if (this._styleBox != null) {
            this._styleBox.destroy({children: true});
            this._styleBox = null;
        }

        // Position label
        this._img.scale = new Point(1, 1);
        if (this._label != null) {
            if (this._scaleBitmapToLabel) {
                let scale: number = 1.5 * this._label.height / this._img.height;
                this._img.scale = new Point(scale, scale);
            }

            this._label.position = tex == null
                ? new Point(GameButton.WMARGIN, GameButton.HMARGIN)
                : new Point(this._img.width + 5, (this._img.height - this._label.height) * 0.5);
            this.container.addChild(this._label);
        }
    }

    private installHotkeyListener(): void {
        if (this._hotkeyReg != null) {
            this._hotkeyReg.close();
            this._hotkeyReg = null;
        }

        if (this._hotkey != null) {
            this._hotkeyReg = this.regs.add(this.mode.keyboardInput.pushListener(this));
        }
    }

    private setTexture(state: ButtonState, tex?: Texture | string) :GameButton {
        if (this._buttonStateTextures == null) {
            this._buttonStateTextures = [];
        }

        if (tex instanceof Texture) {
            this._buttonStateTextures[state] = tex;
        } else if (typeof(tex) === "string") {
            this._buttonStateTextures[state] = Texture.fromImage(tex);
        } else {
            this._buttonStateTextures[state] = null;
        }

        this.needsRedraw();

        return this;
    }

    private needsRedraw() {
        if (this.isLiveObject) {
            this.showState(this._state);
        }
    }

    private getTexture(state: ButtonState, selected: boolean): Texture {
        if (state != ButtonState.DISABLED && selected && this._selectedTexture != null) {
            return this._selectedTexture;
        } else {
            return this._buttonStateTextures != null && this._buttonStateTextures.length > state
                ? this._buttonStateTextures[state]
                : null;
        }
    }

    private readonly _img: Sprite;
    private _label: Text;
    private _styleBox: Graphics;

    private _labelBuilder: TextBuilder;
    private _scaleBitmapToLabel: boolean = false;
    private _tooltip: string;
    private _hotkey: string;
    private _hotkeyCtrl: boolean;
    private _buttonStateTextures: Texture[];
    private _selectedTexture: Texture;

    private _rscriptID: RScriptUIElementID;
    private _rscriptClickReg: Registration = Registrations.Null();

    private _hotkeyReg: Registration;

    private static TEXT_COLORS: Map<ButtonState, number> = new Map([
        [ButtonState.UP, 0xC0DCE7],
        [ButtonState.OVER, 0xFFFFFF],
        [ButtonState.DOWN, 0x333333]
    ]);

    private static STYLEBOX_COLORS: Map<ButtonState, number> = new Map([
        [ButtonState.UP, 0x2D4159],
        [ButtonState.OVER, 0x2D4159],
        [ButtonState.DOWN, 0xFFCC00]
    ]);

    private static readonly WMARGIN: number = 5;
    private static readonly HMARGIN: number = 4;
}

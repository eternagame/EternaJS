import {Container, DisplayObject, Graphics, Point, Sprite, Text, Texture} from "pixi.js";
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
import {Tooltips} from "./Tooltips";

export class GameButton extends Button implements KeyboardListener {
    public readonly toggled: Value<boolean> = new Value(false);

    public constructor() {
        super();

        this._stateDispParent = new Container();
        this.container.addChild(this._stateDispParent);
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
        return this.setStateDisplay(ButtonState.UP, display);
    }

    public over(display: DisplayObject | Texture | string): GameButton {
        return this.setStateDisplay(ButtonState.OVER, display);
    }

    public down(display: DisplayObject | Texture | string): GameButton {
        return this.setStateDisplay(ButtonState.DOWN, display);
    }

    public disabled(display: DisplayObject | Texture | string): GameButton {
        return this.setStateDisplay(ButtonState.DISABLED, display);
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
        if (typeof(text) === "string") {
            this._labelBuilder = Fonts.arial(text as string).fontSize(fontSize || 22).bold().color(0xFFFFFF);
        } else {
            this._labelBuilder = text as TextBuilder;
        }
        this.needsRedraw();
        return this;
    }

    public fixedLabelWidth(width: number): GameButton {
        if (this._fixedLabelWidth != width) {
            this._fixedLabelWidth = width;
            this.needsRedraw();
        }
        return this;
    }

    public scaleBitmapToLabel(): GameButton {
        this._scaleBitmapToLabel = true;
        this.needsRedraw();
        return this;
    }

    public tooltip(text: string): GameButton {
        if (this._tooltip != text) {
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
        this._stateDispParent.removeChildren();
        this._stateDispParent.alpha = 1;

        let stateDisp = this.getStateDisplay(state, this.isSelected);
        if (stateDisp == null && state == ButtonState.DISABLED) {
            // If we're missing the disabled state, use the UP state at 50% alpha
            stateDisp = this.getStateDisplay(ButtonState.UP, this.isSelected);
            this._stateDispParent.alpha = 0.5;
        }

        if (stateDisp != null) {
            this._stateDispParent.addChild(stateDisp);
        }

        // Create label
        if (this._label != null) {
            this._label.destroy({children: true});
            this._label = null;
        }

        if (this._labelBuilder != null) {
            this._label = this._labelBuilder.color(GameButton.TEXT_COLORS.get(state) || 0xffffff).build();
        }

        // Stylebox (shown when we have text and no background image)
        const drawStyleBox: boolean = stateDisp == null && this._label != null;
        if (drawStyleBox) {
            if (this._styleBox == null) {
                this._styleBox = new Graphics();
                this.container.addChildAt(this._styleBox, 1);
            }

            let labelWidth = this._fixedLabelWidth > 0 ? this._fixedLabelWidth : this._label.width;

            this._styleBox.clear();
            this._styleBox.beginFill(GameButton.STYLEBOX_COLORS.get(state) || 0x0);
            this._styleBox.drawRoundedRect(0, 0,
                labelWidth + (GameButton.WMARGIN * 2),
                this._label.height + (GameButton.HMARGIN * 2),
                3);
            this._styleBox.endFill();
        } else if (this._styleBox != null) {
            this._styleBox.destroy({children: true});
            this._styleBox = null;
        }

        // Position label
        this._stateDispParent.scale = new Point(1, 1);
        if (this._label != null) {
            if (this._scaleBitmapToLabel) {
                let scale: number = 1.5 * this._label.height / this._stateDispParent.height;
                this._stateDispParent.scale = new Point(scale, scale);
            }

            this._label.position = stateDisp == null
                ? new Point(GameButton.WMARGIN, GameButton.HMARGIN)
                : new Point(this._stateDispParent.width + 5, (this._stateDispParent.height - this._label.height) * 0.5);
            this.container.addChild(this._label);
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

        if (this._tooltip != null) {
            this._tooltipReg = this.regs.add(Tooltips.instance.addButtonTooltip(this, this._tooltip));
        }
    }

    private needsRedraw() {
        if (this.isLiveObject) {
            this.showState(this._state);
        }
    }

    private setStateDisplay(state: ButtonState, displayOrTex?: DisplayObject | Texture | string) :GameButton {
        if (this._buttonStates == null) {
            this._buttonStates = [];
        }

        this._buttonStates[state] = GameButton.getDisplayObject(displayOrTex);
        this.needsRedraw();
        return this;
    }

    private getStateDisplay(state: ButtonState, selected: boolean): DisplayObject {
        if (state != ButtonState.DISABLED && selected && this._selectedState != null) {
            return this._selectedState;
        } else {
            return this._buttonStates != null && this._buttonStates.length > state
                ? this._buttonStates[state]
                : null;
        }
    }

    private static getDisplayObject(displayOrTex: DisplayObject | Texture | string): DisplayObject {
        if (displayOrTex instanceof DisplayObject) {
            return displayOrTex;
        } else if (displayOrTex instanceof Texture) {
            return new Sprite(displayOrTex);
        } else if (typeof(displayOrTex) === "string") {
            return Sprite.fromImage(displayOrTex);
        } else {
            return null;
        }
    }

    private readonly _stateDispParent: Container;
    private _label: Text;
    private _styleBox: Graphics;

    private _labelBuilder: TextBuilder;
    private _fixedLabelWidth: number = 0;
    private _scaleBitmapToLabel: boolean = false;
    private _tooltip: string;
    private _hotkey: string;
    private _hotkeyCtrl: boolean;
    private _buttonStates: DisplayObject[];
    private _selectedState: DisplayObject;

    private _rscriptID: RScriptUIElementID;
    private _rscriptClickReg: Registration = Registrations.Null();

    private _hotkeyReg: Registration;
    private _tooltipReg: Registration;

    private static readonly TEXT_COLORS: Map<ButtonState, number> = new Map([
        [ButtonState.UP, 0xC0DCE7],
        [ButtonState.OVER, 0xFFFFFF],
        [ButtonState.DOWN, 0x333333],
        [ButtonState.DISABLED, 0x999999],
    ]);

    private static readonly STYLEBOX_COLORS: Map<ButtonState, number> = new Map([
        [ButtonState.UP, 0x2D4159],
        [ButtonState.OVER, 0x2D4159],
        [ButtonState.DOWN, 0xFFCC00],
        [ButtonState.DISABLED, 0x2D4159],
    ]);

    private static readonly WMARGIN = 5;
    private static readonly HMARGIN = 4;
}

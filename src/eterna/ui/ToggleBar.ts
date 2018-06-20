import {Graphics, Point, Text} from "pixi.js";
import {KeyboardListener} from "../../flashbang/input/KeyboardInput";
import {KeyCode} from "../../flashbang/input/KeyCode";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {LocationTask} from "../../flashbang/tasks/LocationTask";
import {Easing} from "../../flashbang/util/Easing";
import {Signal} from "../../signals/Signal";
import {ROPWait} from "../rscript/ROPWait";
import {Fonts} from "../util/Fonts";
import {SoundManager} from "../util/SoundManager";

type InteractionEvent = PIXI.interaction.InteractionEvent;

export class ToggleBar extends ContainerObject implements KeyboardListener {
    /** Emitted when our state changes */
    public readonly stateChanged: Signal<number> = new Signal();

    constructor(num_states: number) {
        super();

        this._num_states = num_states;

        this._bg = new Graphics();
        this.container.addChild(this._bg);

        this._bg.clear();
        this._bg.beginFill(ToggleBar.COLOR_DARK, 0.6);
        this._bg.lineStyle(2, ToggleBar.COLOR_LIGHT, 0.85);
        this._bg.drawRoundedRect(0, 0, ToggleBar.BUTTON_SIZE * this._num_states, ToggleBar.BUTTON_SIZE, ToggleBar.BUTTON_SIZE / 2);
        this._bg.endFill();

        this._bg_active = new Graphics();
        this.container.addChild(this._bg_active);

        this._bg_active.clear();
        this._bg_active.beginFill(ToggleBar.COLOR_MEDIUM, 0.45);
        this._bg_active.drawRoundedRect(0, 0, ToggleBar.BUTTON_SIZE, ToggleBar.BUTTON_SIZE, ToggleBar.BUTTON_SIZE / 2);
        this._bg_active.endFill();
        this._bg_active.visible = false;

        this._bg_selected = new Graphics();
        this.container.addChild(this._bg_selected);

        this._bg_selected.clear();
        this._bg_selected.beginFill(ToggleBar.COLOR_LIGHT, 0.85);
        this._bg_selected.drawRoundedRect(0, 0, ToggleBar.BUTTON_SIZE, ToggleBar.BUTTON_SIZE, ToggleBar.BUTTON_SIZE / 2);
        this._bg_selected.endFill();

        for (let ii = 0; ii < this._num_states; ii++) {
            this._labels[ii] = Fonts.arial("" + (ii + 1), 12).color(ToggleBar.COLOR_TEXT).build();
            this._labels[ii].position = new Point(ii * ToggleBar.BUTTON_SIZE, 4);
            this.container.addChild(this._labels[ii]);
        }

        this.set_state(0);

        this.pointerTap.connect((event) => this.on_click(event));
        this.pointerOut.connect((event) => this.on_mouse_out(event));
        this.pointerMove.connect((event) => this.on_mouse_move(event));
    }

    protected added(): void {
        super.added();
        this.regs.add(this.mode.keyboardInput.pushListener(this));
    }

    public register_ui_for_rscript(id: string): void {
        this._rscript_name = id;
    }

    public set_state(new_state: number): void {
        if (new_state != this._current_state) {
            if ((this._current_state >= 0) && (this._current_state < this._num_states)) {
                this._labels[this._current_state].style.fill = ToggleBar.COLOR_TEXT;
            }

            this._current_state = new_state;
            this.replaceNamedObject("BGSelectedAnim",
                new LocationTask(this._current_state * ToggleBar.BUTTON_SIZE, 0, 0.5, Easing.easeInOut, this._bg_selected));
            this._labels[this._current_state].style.fill = ToggleBar.COLOR_HIGH;

            SoundManager.instance.play_se(SoundManager.SoundSwitch);
            this.stateChanged.emit(new_state);
        }
    }

    public onKeyboardEvent(e: KeyboardEvent): boolean {
        if (e.code == KeyCode.Tab && !e.ctrlKey) {
            this.set_state((this._current_state + 1) % this._num_states);
            return true;
        } else {
            return false;
        }
    }

    public set_disabled(disabled: boolean): void {
        this.display.alpha = disabled ? 0.3 : 1.0;
    }

    private on_click(e: InteractionEvent): void {
        let state: number = this.getClickedState(e);
        if ((state == this._current_state) || (state < 0) || (state >= this._num_states)) {
            return;
        }

        this.set_state(state);
        ROPWait.NotifyClickUI("SWITCH");
    }

    private on_mouse_out(e: InteractionEvent): void {
        this._bg_active.visible = false;
        if ((this._current_over >= 0) && (this._current_over != this._current_state)) {
            this._labels[this._current_over].style.fill = ToggleBar.COLOR_TEXT;
        }
        this._current_over = -1;
    }

    private on_mouse_move(e: InteractionEvent): void {
        let state: number = this.getClickedState(e);
        if ((state == this._current_over) || (state < 0) || (state >= this._num_states)) {
            return;
        }

        if (this._current_over >= 0 && this._current_over != this._current_state) {
            this._labels[this._current_over].style.fill = ToggleBar.COLOR_TEXT;
        }

        this._current_over = state;
        if (this._current_over == this._current_state) {
            this._bg_active.visible = false;
            return;
        }

        this._bg_active.visible = true;
        this._bg_active.position = new Point(this._current_over * ToggleBar.BUTTON_SIZE, 0);
        this._labels[this._current_over].style.fill = ToggleBar.COLOR_HIGH;
    }

    private getClickedState(e: InteractionEvent): number {
        e.data.getLocalPosition(this.display, ToggleBar.P);
        return Math.floor(ToggleBar.P.x / ToggleBar.BUTTON_SIZE);
    }

    private readonly _bg: Graphics;
    private readonly _bg_active: Graphics;
    private readonly _bg_selected: Graphics;

    private readonly _num_states: number;

    private _current_state: number = -1;
    private _current_over: number = -1;
    private _labels: Text[] = [];
    private _rscript_name: string = "";

    private static readonly BUTTON_SIZE: number = 25;
    private static readonly COLOR_DARK: number = 0x1C304C;
    private static readonly COLOR_MEDIUM: number = 0x3E566A;
    private static readonly COLOR_LIGHT: number = 0x88A1B1;
    private static readonly COLOR_TEXT: number = 0xBEDCE7;
    private static readonly COLOR_HIGH: number = 0xFFFFFF;

    private static readonly P: Point = new Point();
}

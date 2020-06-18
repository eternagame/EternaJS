import {Point} from 'pixi.js';
import {UnitSignal} from 'signals';
import SerialTask from 'flashbang/tasks/SerialTask';
import CallbackTask from 'flashbang/tasks/CallbackTask';
import DelayTask from 'flashbang/tasks/DelayTask';
import PointerCapture from 'flashbang/input/PointerCapture';
import InputUtil from 'flashbang/input/InputUtil';
import DisplayUtil from 'flashbang/util/DisplayUtil';
import Flashbang from 'flashbang/core/Flashbang';
import Enableable from './Enableable';
import ContainerObject from './ContainerObject';

type InteractionEvent = PIXI.interaction.InteractionEvent;

export enum ButtonState {
    UP = 0, OVER, DOWN, DISABLED
}

/** A button base class. */
export default abstract class Button extends ContainerObject implements Enableable {
    /** Fired when the button is clicked */
    public readonly clicked: UnitSignal = new UnitSignal();

    /** Fired when the button is down and the mouse is released outside the hitbounds */
    public readonly clickCanceled: UnitSignal = new UnitSignal();

    /** Sound played when the button is pressed (null for no sound) */
    public downSound: string | null = null;

    /** Sound played when the button is pressed while disabled (null for no sound) */
    public disabledSound: string | null = null;

    /* override */
    protected added(): void {
        super.added();

        this.showState(this._state);

        this.regs.add(this.pointerOver.connect(() => this.onPointerOver()));
        this.regs.add(this.pointerOut.connect(() => this.onPointerOut()));
        this.regs.add(this.pointerDown.filter(InputUtil.IsLeftMouse).connect(() => this.onPointerDown()));
        this.regs.add(this.pointerUp.filter(InputUtil.IsLeftMouse).connect(() => this.onPointerUp(false)));
        this.regs.add(this.pointerTap.filter(InputUtil.IsLeftMouse).connect(() => {
            if (this.enabled) {
                this.clicked.emit();
            }
        }));
    }

    /* override */
    protected dispose(): void {
        this.endCapture();
        super.dispose();
    }

    public get enabled(): boolean {
        return (this._state !== ButtonState.DISABLED);
    }

    public set enabled(val: boolean) {
        if (val !== this.enabled) {
            this.setState(val ? ButtonState.UP : ButtonState.DISABLED);
        }
    }

    /**
     * Simulates a click on the button. If it's not disabled, the button will fire the
     * clicked signal and show a short down-up animation.
     */
    public click(): void {
        if (this.enabled) {
            this.clicked.emit();

            // We can be destroyed as the result of the clicked signal, so ensure we're still
            // live before proceeding
            if (this.isLiveObject && this._state !== ButtonState.DOWN) {
                this.addObject(new SerialTask(
                    new CallbackTask(() => {
                        this.showState(ButtonState.DOWN);
                    }),
                    new DelayTask(0.1),
                    new CallbackTask(() => {
                        this.showState(this._state);
                    })
                ));
            }
        }
    }

    /** Subclasses override this to display the appropriate state */
    protected abstract showState(state: ButtonState): void;

    protected onPointerOver(): void {
        this.isPointerOver = true;
    }

    protected onPointerOut(): void {
        this.isPointerOver = false;
    }

    protected onPointerDown(): void {
        if (this.enabled && this._pointerCapture == null) {
            if (!Flashbang.supportsTouch) {
                this.beginCapture();
            }
            this._isPointerDown = true;
            this._isPointerOver = true;
            this.updateEnabledState();
        } else if (!this.enabled && this.disabledSound != null) {
            this.playDisabledSound();
        }
    }

    protected onPointerUp(wasClicked: boolean): void {
        this._isPointerDown = false;
        this._isPointerOver = wasClicked;
        this.updateEnabledState();
        this.endCapture();
    }

    protected beginCapture(): void {
        if (this._pointerCapture != null) {
            return;
        }

        this._pointerCapture = new PointerCapture(this.display);
        this._pointerCapture.beginCapture((e: InteractionEvent) => {
            e.stopPropagation();

            if (InputUtil.IsLeftMouse(e) && (e.type === 'pointerup' || e.type === 'pointerupoutside')) {
                this.onPointerUp(false);
            } else if (e.type === 'pointercancel') {
                this.endCapture(true);
            } else {
                this.onPointerMove(e);
            }
        });
    }

    protected endCapture(emitCancelEvent: boolean = false): void {
        if (this._pointerCapture == null) {
            return;
        }

        this._pointerCapture.endCapture();
        this._pointerCapture = null;
        if (emitCancelEvent) {
            this.clickCanceled.emit();
        }
    }

    protected onPointerMove(e: InteractionEvent): void {
        this.isPointerOver = this.hitTest(e.data.global);
    }

    protected set isPointerDown(val: boolean) {
        if (this._isPointerDown !== val) {
            this._isPointerDown = val;
            this.updateEnabledState();
        }
    }

    protected set isPointerOver(val: boolean) {
        if (this._isPointerOver !== val) {
            this._isPointerOver = val;
            this.updateEnabledState();
        }
    }

    protected updateEnabledState(): void {
        if (this._state === ButtonState.DISABLED) {
            return;
        }

        if (this._isPointerDown) {
            this.setState(this._isPointerOver ? ButtonState.DOWN : ButtonState.UP);
        } else {
            this.setState(this._isPointerOver ? ButtonState.OVER : ButtonState.UP);
        }
    }

    protected setState(newState: ButtonState): void {
        if (this._state !== newState) {
            let oldState: ButtonState = this._state;
            this._state = newState;
            if (this._state === ButtonState.DISABLED) {
                this.endCapture();
            }
            this.showState(this._state);
            this.playStateTransitionSound(oldState, this._state);
        }
    }

    protected hitTest(globalLoc: Point): boolean {
        return this.isLiveObject && DisplayUtil.hitTest(this.display, globalLoc);
    }

    /**
     * Plays a sound associated with a state transition.
     * By default, it plays the sound named "sfx_button_down", if it exists, when transitioning
     * to the DOWN state. Subclasses can override to customize the behavior.
     */
    protected playStateTransitionSound(fromState: ButtonState, toState: ButtonState): void {
        // TODO: make SoundManager part of Flashbang
        if (toState === ButtonState.DOWN && this.downSound != null) {
            Flashbang.sound.playSound(this.downSound);
        }
    }

    protected playDisabledSound(): void {
        if (this.disabledSound != null) {
            Flashbang.sound.playSound(this.disabledSound);
        }
    }

    protected _state: ButtonState = ButtonState.UP;
    protected _isPointerOver: boolean;
    protected _isPointerDown: boolean;
    protected _pointerCapture: PointerCapture | null;
}

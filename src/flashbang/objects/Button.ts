import {UnitSignal} from 'signals';
import SerialTask from 'flashbang/tasks/SerialTask';
import CallbackTask from 'flashbang/tasks/CallbackTask';
import DelayTask from 'flashbang/tasks/DelayTask';
import InputUtil from 'flashbang/input/InputUtil';
import Flashbang from 'flashbang/core/Flashbang';
import Enableable from './Enableable';
import ContainerObject from './ContainerObject';

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

        // Use pointer cursor
        this.container.cursor = 'pointer';

        this.showState(this._state);

        this.regs.add(this.pointerOver.connect(() => {
            this.isPointerOver = true;
        }));
        this.regs.add(this.pointerOut.connect(() => {
            this.isPointerOver = false;
        }));
        this.regs.add(this.pointerCancel.connect(() => {
            this.isPointerOver = false;
            this.isPointerDown = false;
        }));
        this.regs.add(this.pointerDown.filter(InputUtil.IsLeftMouse).connect(() => {
            if (this.enabled) {
                this.isPointerDown = true;
            } else if (!this.enabled && this.disabledSound != null) {
                this.playDisabledSound();
            }
        }));
        this.regs.add(this.pointerUp.filter(InputUtil.IsLeftMouse).connect(() => {
            this.isPointerDown = false;
        }));
        this.regs.add(this.pointerTap.filter(InputUtil.IsLeftMouse).connect(() => {
            if (this.enabled) this.clicked.emit();
        }));
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

    private set isPointerDown(val: boolean) {
        if (this._isPointerDown !== val) {
            this._isPointerDown = val;
            this.updateEnabledState();
        }
    }

    private set isPointerOver(val: boolean) {
        if (this._isPointerOver !== val) {
            this._isPointerOver = val;
            this.updateEnabledState();
        }
    }

    private updateEnabledState(): void {
        if (this._state === ButtonState.DISABLED) {
            return;
        }

        if (this._isPointerDown) {
            this.setState(this._isPointerOver ? ButtonState.DOWN : ButtonState.UP);
        } else {
            this.setState(this._isPointerOver ? ButtonState.OVER : ButtonState.UP);
        }
    }

    private setState(newState: ButtonState): void {
        if (this._state !== newState) {
            const oldState: ButtonState = this._state;
            this._state = newState;
            this.showState(this._state);
            this.playStateTransitionSound(oldState, this._state);
        }
    }

    /**
     * Plays a sound associated with a state transition.
     * By default, it plays the sound named "sfx_button_down", if it exists, when transitioning
     * to the DOWN state. Subclasses can override to customize the behavior.
     */
    private playStateTransitionSound(_fromState: ButtonState, toState: ButtonState): void {
        if (toState === ButtonState.DOWN && _fromState === ButtonState.OVER && this.downSound != null) {
            Flashbang.sound.playSound(this.downSound);
        }
    }

    private playDisabledSound(): void {
        if (this.disabledSound != null) {
            Flashbang.sound.playSound(this.disabledSound);
        }
    }

    protected _state: ButtonState = ButtonState.UP;
    protected _isPointerOver: boolean;
    protected _isPointerDown: boolean;
}

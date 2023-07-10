import {DisplayObject} from 'pixi.js';
import {SignalView} from 'signals';
import GameObject from 'flashbang/core/GameObject';
import PointerTarget from 'flashbang/input/PointerTarget';
import DisplayObjectPointerTarget from 'flashbang/input/DisplayObjectPointerTarget';
import {FederatedPointerEvent, FederatedWheelEvent} from '@pixi/events';

/** A convenience class that manages a DisplayObject directly. */
export default class SceneObject<T extends DisplayObject = DisplayObject> extends GameObject implements PointerTarget {
    constructor(displayObject: T) {
        super();
        this._display = displayObject;
    }

    public /* final */ get display(): T {
        return this._display;
    }

    public get target(): T {
        return this._display;
    }

    public get pointerEnter(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerEnter;
    }

    public get pointerOver(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerOver;
    }

    public get pointerOut(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerOut;
    }

    public get pointerLeave(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerLeave;
    }

    public get pointerDown(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerDown;
    }

    public get pointerMove(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerMove;
    }

    public get pointerUp(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerUp;
    }

    public get pointerUpOutside(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerUpOutside;
    }

    public get pointerCancel(): SignalView<PointerEvent> {
        return this.getPointerTarget().pointerCancel;
    }

    public get pointerTap(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerTap;
    }

    public get mouseWheel(): SignalView<FederatedWheelEvent> {
        return this.getPointerTarget().mouseWheel;
    }

    public get pointerEnterCapture(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerEnterCapture;
    }

    public get pointerOverCapture(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerOverCapture;
    }

    public get pointerOutCapture(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerOutCapture;
    }

    public get pointerLeaveCapture(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerLeaveCapture;
    }

    public get pointerDownCapture(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerDownCapture;
    }

    public get pointerMoveCapture(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerMoveCapture;
    }

    public get pointerUpCapture(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerUpCapture;
    }

    public get pointerUpOutsideCapture(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerUpOutsideCapture;
    }

    public get pointerCancelCapture(): SignalView<PointerEvent> {
        return this.getPointerTarget().pointerCancelCapture;
    }

    public get pointerTapCapture(): SignalView<FederatedPointerEvent> {
        return this.getPointerTarget().pointerTapCapture;
    }

    public get mouseWheelCapture(): SignalView<FederatedWheelEvent> {
        return this.getPointerTarget().mouseWheelCapture;
    }

    protected getPointerTarget(): PointerTarget {
        if (this._pointerTarget == null) {
            this._pointerTarget = new DisplayObjectPointerTarget(this._display);
        }
        return this._pointerTarget;
    }

    protected readonly _display: T;
    private _pointerTarget: PointerTarget; // lazily instantiated
}

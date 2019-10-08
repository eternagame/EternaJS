import {DisplayObject} from 'pixi.js';
import {SignalView} from 'signals';
import GameObject from 'flashbang/core/GameObject';
import PointerTarget from 'flashbang/input/PointerTarget';
import DisplayObjectPointerTarget from 'flashbang/input/DisplayObjectPointerTarget';

type InteractionEvent = PIXI.interaction.InteractionEvent;

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

    public get pointerOver(): SignalView<InteractionEvent> {
        return this.getPointerTarget().pointerOver;
    }

    public get pointerOut(): SignalView<InteractionEvent> {
        return this.getPointerTarget().pointerOut;
    }

    public get pointerDown(): SignalView<InteractionEvent> {
        return this.getPointerTarget().pointerDown;
    }

    public get pointerMove(): SignalView<InteractionEvent> {
        return this.getPointerTarget().pointerMove;
    }

    public get pointerUp(): SignalView<InteractionEvent> {
        return this.getPointerTarget().pointerUp;
    }

    public get pointerTap(): SignalView<InteractionEvent> {
        return this.getPointerTarget().pointerTap;
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

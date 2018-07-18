import {DisplayObject} from "pixi.js";
import {SignalView} from "../../signals/SignalView";
import {GameObject} from "../core/GameObject";
import {PointerTarget} from "../input/PointerTarget";
import {DisplayObjectPointerTarget} from "../input/DisplayObjectPointerTarget";

type InteractionEvent = PIXI.interaction.InteractionEvent;

/** A convenience class that manages a displayObject directly. */
export class SceneObject extends GameObject implements PointerTarget {
    constructor(displayObject: DisplayObject) {
        super();
        this._displayObject = displayObject;
    }

    public /*final*/ get display(): DisplayObject {
        return this._displayObject;
    }

    public get target(): DisplayObject {
        return this._displayObject;
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
            this._pointerTarget = new DisplayObjectPointerTarget(this._displayObject);
        }
        return this._pointerTarget;
    }

    protected _displayObject: DisplayObject;
    protected _pointerTarget: PointerTarget; // lazily instantiated
}

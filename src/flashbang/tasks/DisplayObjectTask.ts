import {Assert} from "../util/Assert";
import {EasingFunc} from "../util/Easing";
import {InterpolatingTask} from "./InterpolatingTask";
import {DisplayObject} from "pixi.js";

export class DisplayObjectTask extends InterpolatingTask {
    constructor(time: number, easing: EasingFunc, target: DisplayObject) {
        super(time, easing);
        this._target = target;
    }

    /* override */
    protected added(): void {
        super.added();
        // If we weren't given a target, operate on our parent object
        if (this._target == null) {
            Assert.notNull(this.parent.display, "parent does not have a DisplayObject");
            this._target = this.parent.display;
        }
    }

    protected _target: DisplayObject;
}

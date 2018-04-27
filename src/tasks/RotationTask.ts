import {DisplayObject} from "pixi.js";
import {EasingFunc} from "../util/Easing";
import {DisplayObjectTask} from "./DisplayObjectTask";

export class RotationTask extends DisplayObjectTask {
    constructor (radians :number, time :number = 0, easingFn :EasingFunc = null, target :DisplayObject = null)  {
        super(time, easingFn, target);
        this._to = radians;
    }

    /*override*/ protected updateValues () :void {
        if (isNaN(this._from)) {
            this._from = this._target.rotation;
        }
        this._target.rotation = this.interpolate(this._from, this._to);
    }

    protected _to :number;
    protected _from :number = NaN;
}

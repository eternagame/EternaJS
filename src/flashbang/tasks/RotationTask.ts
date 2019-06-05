import {DisplayObject} from "pixi.js";
import {EasingFunc} from "../util";
import {DisplayObjectTask} from ".";

export default class RotationTask extends DisplayObjectTask {
    constructor(radians: number, time: number = 0, easingFn: EasingFunc = null, target: DisplayObject = null) {
        super(time, easingFn, target);
        this._to = radians;
    }

    /* override */
    protected updateValues(): void {
        if (this._from === undefined) {
            this._from = this._target.rotation;
        }
        this._target.rotation = this.interpolate(this._from, this._to);
    }

    private readonly _to: number;
    private _from: number = undefined;
}

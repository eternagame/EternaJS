import {DisplayObject} from "pixi.js";
import {EasingFunc} from "../util";
import DisplayObjectTask from "./DisplayObjectTask";

export default class AlphaTask extends DisplayObjectTask {
    constructor(alpha: number, time: number = 0, easingFn: EasingFunc = null, target: DisplayObject = null) {
        super(time, easingFn, target);
        this._to = alpha;
    }

    /* override */
    protected updateValues(): void {
        if (this._from === undefined) {
            this._from = this._target.alpha;
        }
        this._target.alpha = this.interpolate(this._from, this._to);
    }

    private readonly _to: number;
    private _from: number = undefined;
}

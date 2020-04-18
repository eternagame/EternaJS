import {DisplayObject} from 'pixi.js';
import {EasingFunc} from 'flashbang/util/Easing';
import DisplayObjectTask from './DisplayObjectTask';
import { Assert } from 'flashbang';

export default class RotationTask extends DisplayObjectTask {
    constructor(radians: number, time: number = 0, easingFn: EasingFunc | null = null, target: DisplayObject | null = null) {
        super(time, easingFn, target);
        this._to = radians;
    }

    /* override */
    protected updateValues(): void {
        Assert.assertIsDefined(this._target);
        if (this._from === undefined) {
            this._from = this._target.rotation;
        }
        this._target.rotation = this.interpolate(this._from, this._to);
    }

    private readonly _to: number;
    private _from?: number = undefined;
}

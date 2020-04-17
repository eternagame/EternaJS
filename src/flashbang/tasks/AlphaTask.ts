import {DisplayObject} from 'pixi.js';
import {EasingFunc} from 'flashbang/util/Easing';
import DisplayObjectTask from './DisplayObjectTask';
import Assert from 'flashbang/util/Assert';

export default class AlphaTask extends DisplayObjectTask {
    constructor(alpha: number, time: number = 0, easingFn: EasingFunc | null = null, target: DisplayObject | null = null) {
        super(time, easingFn, target);
        this._to = alpha;
    }

    /* override */
    protected updateValues(): void {
        Assert.assertIsDefined(this._target);
        if (this._from === undefined) {
            this._from = this._target.alpha;
        }
        this._target.alpha = this.interpolate(this._from, this._to);
    }

    private readonly _to: number;
    private _from?: number = undefined;
}

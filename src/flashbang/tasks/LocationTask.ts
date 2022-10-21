import {DisplayObject} from 'pixi.js';
import {EasingFunc} from 'flashbang/util/Easing';
import Assert from 'flashbang/util/Assert';
import DisplayObjectTask from './DisplayObjectTask';

export default class LocationTask extends DisplayObjectTask {
    private callback: ()=>void;
    constructor(
        x: number | null, y: number | null, time: number = 0, easingFn: EasingFunc | null = null,
        target: DisplayObject | null = null, callback: ()=>void = () => {}
    ) {
        super(time, easingFn, target);
        this._toX = x;
        this._toY = y;
        this.callback = callback;
    }

    /* override */
    protected updateValues(): void {
        Assert.assertIsDefined(this._target);
        if (this._fromX === undefined || this._fromY === undefined) {
            this._fromX = this._target.x;
            this._fromY = this._target.y;
        }
        if (this._toX !== null) this._target.x = this.interpolate(this._fromX, this._toX);
        if (this._toY !== null) this._target.y = this.interpolate(this._fromY, this._toY);
        if (this.callback) this.callback();
    }

    private readonly _toX: number | null;
    private readonly _toY: number | null;
    private _fromX?: number = undefined;
    private _fromY?: number = undefined;
}

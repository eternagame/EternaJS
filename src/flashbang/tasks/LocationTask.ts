import {DisplayObject} from 'pixi.js';
import {EasingFunc} from '../util';
import DisplayObjectTask from './DisplayObjectTask';

export default class LocationTask extends DisplayObjectTask {
    constructor(x: number, y: number, time: number = 0, easingFn: EasingFunc = null, target: DisplayObject = null) {
        super(time, easingFn, target);
        this._toX = x;
        this._toY = y;
    }

    /* override */
    protected updateValues(): void {
        if (this._fromX === undefined) {
            this._fromX = this._target.x;
            this._fromY = this._target.y;
        }
        this._target.x = this.interpolate(this._fromX, this._toX);
        this._target.y = this.interpolate(this._fromY, this._toY);
    }

    private readonly _toX: number;
    private readonly _toY: number;
    private _fromX: number = undefined;
    private _fromY: number = undefined;
}

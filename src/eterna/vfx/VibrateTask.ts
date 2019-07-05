import {DisplayObject, Point} from 'pixi.js';
import {DisplayObjectTask} from 'flashbang/tasks';
import {Easing} from 'flashbang/util';

export default class VibrateTask extends DisplayObjectTask {
    constructor(duration: number, target: DisplayObject = null) {
        super(duration, Easing.linear, target);
    }

    protected updateValues(): void {
        if (this._startLoc == null) {
            this._startLoc = new Point(this._target.position.x, this._target.position.y);
        }

        if (this._elapsedTime < this._totalTime) {
            this._target.position.x = this._startLoc.x;
            this._target.position.y = this._startLoc.y + (Math.random() * 2 - 1) * 4;
        } else {
            // Complete
            this._target.position = this._startLoc;
        }
    }

    private _startLoc: Point;
}

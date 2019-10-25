import {DisplayObject} from 'pixi.js';
import {EasingFunc} from 'flashbang/util/Easing';
import Assert from 'flashbang/util/Assert';
import InterpolatingTask from './InterpolatingTask';

export default class DisplayObjectTask extends InterpolatingTask {
    constructor(time: number, easing: EasingFunc, target: DisplayObject) {
        super(time, easing);
        this._target = target;
    }

    /* override */
    protected added(): void {
        super.added();
        // If we weren't given a target, operate on our parent object
        if (this._target == null) {
            Assert.notNull(this.parent.display, 'parent does not have a DisplayObject');
            this._target = this.parent.display;
        }
    }

    protected _target: DisplayObject;
}

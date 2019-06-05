import {ObjectTask, Updatable} from "../core";
import {Easing, EasingFunc} from "../util";

export default class InterpolatingTask extends ObjectTask implements Updatable {
    constructor(time: number = 0, easingFn: EasingFunc = null) {
        super();
        this._totalTime = Math.max(time, 0);
        this._easingFn = (easingFn != null ? easingFn : Easing.linear);
    }

    public update(dt: number): void {
        this._elapsedTime = Math.min(this._elapsedTime + dt, this._totalTime);
        this.updateValues();
        if (this._elapsedTime >= this._totalTime) {
            this.destroySelf();
        }
    }

    protected updateValues(): void {
        // subclasses do processing here
    }

    protected interpolate(from: number, to: number): number {
        return this._easingFn(from, to, Math.min(this._elapsedTime, this._totalTime), this._totalTime);
    }

    protected _totalTime: number = 0;
    protected _elapsedTime: number = 0;

    protected _easingFn: EasingFunc;
}

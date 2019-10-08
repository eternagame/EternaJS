import ObjectTask from 'flashbang/core/ObjectTask';
import Updatable from 'flashbang/core/Updatable';

/** Delays for the given number of frames. (Unlike DelayTask, which delays for a specific amount of time.) */
export default class FrameDelayTask extends ObjectTask implements Updatable {
    constructor(frames: number = 1) {
        super();
        this._frames = frames;
    }

    public update(dt: number): void {
        if (this._frames-- <= 0) {
            this.destroySelf();
        }
    }

    private _frames: number;
}

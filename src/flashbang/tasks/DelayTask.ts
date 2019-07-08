import ObjectTask from 'flashbang/core/ObjectTask';
import Updatable from 'flashbang/core/Updatable';

export default class DelayTask extends ObjectTask implements Updatable {
    constructor(time: number) {
        super();
        this._time = time;
    }

    public update(dt: number): void {
        this._time -= dt;
        if (this._time <= 0) {
            this.destroySelf();
        }
    }

    protected _time: number;
}

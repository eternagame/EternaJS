import {ObjectTask} from "../core/ObjectTask";
import {Updatable} from "../core/Updatable";

export class DelayTask extends ObjectTask implements Updatable {
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

import {ObjectTask} from "../core/ObjectTask";
import {Updatable} from "../core/Updatable";

/** A Task that calls a function continuously until the function returns true */
export class FunctionTask extends ObjectTask implements Updatable {
    constructor(callback: (dt: number) => boolean) {
        super();
        this._callback = callback;
    }

    public update(dt: number): void {
        if (this._callback(dt)) {
            this.destroySelf();
        }
    }

    private readonly _callback: (dt: number) => boolean;
}

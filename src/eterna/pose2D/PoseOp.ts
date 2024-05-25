export default class PoseOp {
    public sn?: number;

    constructor(sn: number | null, fn: () => void | Promise<void> | unknown) {
        if (!sn) {
            this.sn = undefined;
        } else {
            this.sn = sn;
        }
        this._fn = fn;
    }

    public fn() {
        if (this.state !== 'pending') throw new Error('PoseOp has already been run');

        const res = this._fn();
        if (res instanceof Promise) {
            this._state = 'running';
            res.then(() => { this._state = 'done'; });
        } else {
            this._state = 'done';
        }
    }

    public get state() {
        return this._state;
    }

    private _state: 'pending' | 'running' | 'done' = 'pending';
    private _fn: () => void | Promise<void> | unknown;
}

export default class PowerEaser {
    constructor(pow: number) {
        this._pow = pow;
    }

    public readonly easeIn = (from: number, to: number, dt: number, t: number): number => {
        if (t === 0) {
            return to;
        }
        return from + ((to - from) * ((dt / t) ** this._pow));
    };

    public readonly easeOut = (from: number, to: number, dt: number, t: number): number => {
        if (t === 0) {
            return to;
        }
        return from + ((to - from) * (1 - ((1 - dt / t) ** this._pow)));
    };

    public readonly easeInOut = (from: number, to: number, dt: number, t: number): number => {
        if (t === 0) {
            return to;
        }

        let mid: number = from + (to - from) * 0.5;
        t *= 0.5;
        return (dt <= t ? this.easeIn(from, mid, dt, t) : this.easeOut(mid, to, dt - t, t));
    };

    private readonly _pow: number;
}

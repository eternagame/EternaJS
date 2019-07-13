import PowerEaser from './PowerEaser';

export type EasingFunc = (from: number, to: number, dt: number, t: number) => number;

export default class Easing {
    public static quadratic: PowerEaser = new PowerEaser(2);
    public static cubic: PowerEaser = new PowerEaser(3);
    public static quartic: PowerEaser = new PowerEaser(4);
    public static quintic: PowerEaser = new PowerEaser(5);

    public static easeIn: EasingFunc = Easing.cubic.easeIn;
    public static easeOut: EasingFunc = Easing.cubic.easeOut;
    public static easeInOut: EasingFunc = Easing.cubic.easeInOut;

    public static linear = (from: number, to: number, dt: number, t: number): number => {
        if (t === 0) {
            return to;
        }
        return from + ((to - from) * (dt / t));
    };

    public static none = (from: number, to: number, dt: number, t: number): number => (dt >= t ? to : from);
}

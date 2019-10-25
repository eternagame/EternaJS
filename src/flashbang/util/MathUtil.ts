export default class MathUtil {
    /** Degrees-to-radians */
    public static readonly deg2Rad: number = Math.PI / 180;

    /** Radians-to-degrees */
    public static readonly rad2Deg: number = 180 / Math.PI;

    /** Returns the value of n clamped to be within the range [min, max]. */
    public static clamp(n: number, min: number, max: number): number {
        if (n < min) return min;
        else if (n > max) return max;
        else return n;
    }
}

export class MathUtil {
    /** Returns the value of n clamped to be within the range [min, max]. */
    public static clamp (n :number, min :number, max :number) :number {
        return (n < min ? min : (n > max ? max : n));
    }
}

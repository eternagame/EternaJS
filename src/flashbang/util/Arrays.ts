export class Arrays {
    /** True if two Arrays hold the same contents */
    public static shallowEqual<T>(a: T[], b: T[]): boolean {
        if (a === b) {
            return true;
        } else if (a == null || b == null || a.length !== b.length) {
            return false;
        }

        for (let ii = 0; ii < a.length; ++ii) {
            if (a[ii] !== b[ii]) {
                return false;
            }
        }

        return true;
    }
}

export default class Arrays {
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

    public static swap<T>(array: T[], i: number, j: number): void {
        let temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }

    public static addAt<T>(array: T[], element: T, idx: number): void {
        if (idx === 0) {
            array.unshift(element);
        } else if (idx === array.length) {
            array.push(element);
        } else {
            array.splice(idx, 0, element);
        }
    }
}

export default class Assert {
    public static ok(predicate: () => boolean, message?: string): void {
        if (process.env.NODE_ENV !== 'production' && !predicate()) {
            throw new Error(message || 'assertion failure!');
        }
    }

    public static isTrue(predicate: boolean, message?: string): void {
        Assert.ok(() => predicate, message);
    }

    public static isFalse(predicate: boolean, message?: string): void {
        Assert.ok(() => !predicate, message);
    }

    public static notNull(arg: any, message?: string): void {
        Assert.ok(() => arg != null, message);
    }

    /**
     * Avoid lint errors in switch statements over enums which have no use for a
     * default case. Remove once https://github.com/typescript-eslint/typescript-eslint/issues/281 is resolved
     * @param v The switch statement operand (should be an enum)
     */
    public static unreachable(v: never): never {
        return v;
    }
}

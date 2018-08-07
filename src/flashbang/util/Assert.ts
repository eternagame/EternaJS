export class Assert {
    public static ok(predicate: () => boolean, message?: string): void {
        if (process.env.NODE_ENV !== "production" && !predicate()) {
            throw new Error(message || "assertion failure!");
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
}

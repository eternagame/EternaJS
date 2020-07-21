/** Wraps a Promise and allows it to be resolved or rejected later. */
export default class Deferred<T> {
    public readonly promise: Promise<T>;

    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
    }

    /** True if the promise has been resolved or rejected */
    public get isSealed(): boolean {
        return this._resolve == null;
    }

    public resolve(value?: PromiseLike<T> | T): void {
        if (this.isSealed) {
            throw new Error("Can't resolve sealed promise");
        }

        let fn = this._resolve;
        // this._resolve = null;
        // this._reject = null;
        fn(value);
    }

    public reject(reason?: Error): void {
        if (this.isSealed) {
            throw new Error("Can't reject sealed promise");
        }

        let fn = this._reject;
        // this._resolve = null;
        // this._reject = null;
        fn(reason);
    }

    private _resolve: (value?: PromiseLike<T> | T) => void;
    private _reject: (reason?: Error) => void;
}

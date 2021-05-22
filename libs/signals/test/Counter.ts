export default class Counter<T> {
    public get slot(): (value: T) => void {
        return this.onEmit.bind(this);
    }

    public trigger(): void {
        this._count++;
    }

    public assertTriggered(count: number, _message = ''): void {
        expect(count).toBe(this._count);
    }

    public reset(): void {
        this._count = 0;
    }

    public onEmit(_value: T | null = null): void {
        this.trigger();
    }

    private _count = 0;
}

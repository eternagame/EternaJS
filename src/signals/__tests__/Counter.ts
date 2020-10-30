export default class Counter {
    public get slot(): (value: any) => void {
        return this.onEmit;
    }

    public trigger(): void {
        this._count++;
    }

    public assertTriggered(count: number, message: string = ""): void {
        expect(count).toBe(this._count);
    }

    public reset(): void {
        this._count = 0;
    }

    public onEmit(value: any = null): void {
        this.trigger();
    }

    private _count: number = 0;
}

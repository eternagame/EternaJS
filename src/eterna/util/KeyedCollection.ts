/** Simplified type defining an object that can be encoded to JSON without issue  */
interface KeyObject {
    [key: string]: string | number | boolean | undefined | null | KeyObject | KeyObject[];
}

export default class KeyedCollection<Key extends KeyObject, Value> {
    public set(key: Key, value: Value) {
        this._data.set(JSON.stringify(key), value);
    }

    public get(key: Key): Value | undefined {
        return this._data.get(JSON.stringify(key));
    }

    public getWhere(pred: (key: Key) => boolean): Iterable<[Key, Value]> {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const _this = this;
        return {
            * [Symbol.iterator]() {
                for (const [k, v] of _this._data.entries()) {
                    const key = JSON.parse(k);
                    if (pred(key)) yield [key, v];
                }
            }
        };
    }

    public delete(key: Key): boolean {
        return this._data.delete(JSON.stringify(key));
    }

    public deleteWhere(pred: (key: Key) => boolean): boolean {
        let deleted = false;
        for (const k of this._data.keys()) {
            const key = JSON.parse(k);
            if (pred(key)) {
                deleted = deleted || this._data.delete(k);
            }
        }
        return deleted;
    }

    public get size(): number {
        return this._data.size;
    }

    private _data: Map<string, Value> = new Map();
}

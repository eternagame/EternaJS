/**
 * Simplified type defining an object that can be encoded to JSON without issue
 *
 * Note that sub-objects and arrays are not permitted. This is because it is liable to
 * cause errors in key reliability - we want to make sure we can reliably sort the sub-keys
 * so that no matter how the key object is constructed when passed in, we still get the same
 * value out
 */
interface KeyObject {
    [key: string]: string | number | boolean | undefined | null;
}

export default class KeyedCollection<Key extends KeyObject, Value> {
    public set(key: Key, value: Value) {
        this._data.set(this.getStringKey(key), value);
    }

    public get(key: Key): Value | undefined {
        return this._data.get(this.getStringKey(key));
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

    public entries(): Iterable<[Key, Value]> {
        return this.getWhere(() => true);
    }

    public delete(key: Key): boolean {
        return this._data.delete(this.getStringKey(key));
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

    private getStringKey(key: Key): string {
        return JSON.stringify(
            Object.entries(key)
                // We sort to ensure that no matter how the key is constructed when setting or
                // getting, it always gets the value with the same properties
                .sort(([aKey], [bKey]) => (aKey < bKey ? -1 : 1))
        );
    }

    private _data: Map<string, Value> = new Map();
}

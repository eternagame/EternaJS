import * as localforage from 'localforage';

export type SaveStoreItem = [number, number[], ...string[]];

export default class SaveGameManager {
    constructor(namespace: string) {
        this._store = localforage.createInstance({
            name: namespace
        });
    }

    public async load(name: string): Promise<SaveStoreItem | null> {
        return this._store.getItem(name);
    }

    public async save(name: string, obj: SaveStoreItem): Promise<SaveStoreItem> {
        return this._store.setItem(name, obj);
    }

    public async remove(name: string): Promise<void> {
        return this._store.removeItem(name);
    }

    public async clear(): Promise<void> {
        return this._store.clear();
    }

    private _store: LocalForage;
}

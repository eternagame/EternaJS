import * as localforage from 'localforage';

export type SaveStoreItem = [number, number[], ...string[]];

export default class SaveGameManager {
    constructor(namespace: string) {
        if (SaveGameManager.ALL_NAMESPACES.has(namespace)) {
            throw new Error(`SaveGameManager namespace '${namespace}' already taken`);
        }
        SaveGameManager.ALL_NAMESPACES.add(namespace);

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

    protected static readonly ALL_NAMESPACES: Set<string> = new Set();
    private _store: LocalForage;
}

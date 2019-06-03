import * as localforage from "localforage";

export class SaveGameManager {
    constructor(namespace: string) {
        if (SaveGameManager.ALL_NAMESPACES.has(namespace)) {
            throw new Error(`SaveGameManager namespace '${namespace}' already taken`);
        }
        SaveGameManager.ALL_NAMESPACES.add(namespace);

        this._store = localforage.createInstance({
            name: namespace
        });
    }

    public async load(name: string): Promise<any> {
        return await this._store.getItem(name);
    }

    public async save(name: string, obj: any): Promise<any> {
        return await this._store.setItem(name, obj);
    }

    public async remove(name: string): Promise<void> {
        return await this._store.removeItem(name);
    }

    public async clear(): Promise<void> {
        return await this._store.clear();
    }

    protected static readonly ALL_NAMESPACES: Set<string> = new Set();
    private _store: LocalForage;
}

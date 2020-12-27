import * as storejs from 'store';
import Setting from './Setting';

export default abstract class Settings {
    protected constructor(namespace: string) {
        if (Settings.ALL_NAMESPACES.has(namespace)) {
            throw new Error(`Settings namespace '${namespace}' already taken`);
        }
        Settings.ALL_NAMESPACES.add(namespace);

        this._namespace = storejs.namespace(namespace);
    }

    /** Saves an object to this Settings namespace */
    public saveObject<T>(name: string, obj: T): void {
        if (this._allSettings.has(name)) {
            throw new Error(`'${name}' is used by a setting`);
        }

        this._namespace.set(name, obj);
    }

    /** Loads an object from this Settings, if it exists */
    public loadObject<T>(name: string): T {
        return this._namespace.get(name);
    }

    /** Deletes an object from this Settings, if it exists */
    public removeObject(name: string): void {
        this._namespace.remove(name);
    }

    protected setting<T>(name: string, defaultVal: T): Setting<T> {
        if (this._allSettings.has(name)) {
            throw new Error(`Setting '${name}' already taken`);
        }
        this._allSettings.add(name);

        return new Setting<T>(this._namespace, name, defaultVal);
    }

    protected clear(): void {
        this._namespace.clearAll();
    }

    protected readonly _namespace: StoreJsAPI;
    protected readonly _allSettings: Set<string> = new Set();

    protected static readonly ALL_NAMESPACES: Set<string> = new Set();
}

import {Setting} from "./Setting";
import * as store from "store";

export abstract class AbstractSettings {
    protected constructor(namespace: string) {
        if (AbstractSettings.ALL_NAMESPACES.has(namespace)) {
            throw new Error(`Settings namespace '${namespace}' already taken`);
        }
        AbstractSettings.ALL_NAMESPACES.add(namespace);

        this._namespace = store.namespace(namespace);
    }

    protected setting<T>(name: string, defaultVal: T): Setting<T> {
        return new Setting<T>(this._namespace, name, defaultVal);
    }

    protected readonly _namespace: StoreJsAPI;

    protected static readonly ALL_NAMESPACES: Set<string> = new Set();
}

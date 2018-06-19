import {Setting} from "./Setting";
import * as storejs from "store";

export abstract class AbstractSettings {
    protected constructor(namespace: string) {
        if (AbstractSettings.ALL_NAMESPACES.has(namespace)) {
            throw new Error(`Settings namespace '${namespace}' already taken`);
        }
        AbstractSettings.ALL_NAMESPACES.add(namespace);

        this._namespace = storejs.namespace(namespace);
    }

    protected setting<T>(name: string, defaultVal: T): Setting<T> {
        return new Setting<T>(this._namespace, name, defaultVal);
    }

    protected clear(): void {
        this._namespace.clearAll();
    }

    protected readonly _namespace: StoreJsAPI;

    protected static readonly ALL_NAMESPACES: Set<string> = new Set();
}

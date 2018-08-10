import * as log from "loglevel";
import {Assert} from "../../flashbang/util/Assert";

/**
 * Exposes named functions to external scripts.
 * This mirrors Flash's ExternalInterface class: it installs functions on the "maingame" <div> that the Eterna
 * app lives inside, and also calls into functions exposed by `script-interface.coffee`, a set of javascript functions
 * loaded by the page.
 */
export class ExternalInterface {
    public static init(scriptRoot: HTMLElement) {
        Assert.isTrue(this._scriptRoot === undefined, "Already initialized");
        this._scriptRoot = scriptRoot;
    }

    public static addCallback(name: string, callback: Function): void {
        this._scriptRoot[name] = callback;
        ExternalInterface._callbacks.add(name);
    }

    public static removeCallback(name: string): void {
        if (ExternalInterface._callbacks.delete(name)) {
            delete this._scriptRoot[name];
        }
    }

    public static call(name: string, ...args: any[]): any {
        try {
            let [thisVal, f] = getDeepProperty(window as any, name);
            return (f as Function).apply(thisVal, args);
        } catch (e) {
            log.error(`ExternalInterface: error calling '${name}': ${e}`);
            return undefined;
        }
    }

    private static _scriptRoot: any;
    private static _callbacks: Set<string> = new Set();
}

function getDeepProperty(obj: any, name: string): [any, any] {
    if (name === "") {
        return [obj, undefined];
    } else {
        let prop = obj;
        let parent;
        for (let component of name.split(".")) {
            if (prop === undefined) {
                throw new Error(`'${name}' is not a property of ${obj}`);
            }
            parent = prop;
            prop = prop[component];
        }
        return [parent, prop];
    }
}

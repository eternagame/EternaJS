import {Flashbang} from "../../flashbang/core/Flashbang";
import * as log from "loglevel";

/** Exposes named functions to external scripts  */
export class ExternalInterface {
    // TODO: remove me
    public static readonly isAvailable: boolean = true;

    public static addCallback(name: string, callback: Function): void {
        let root: any = (Flashbang.app as any);
        root[name] = callback;
        ExternalInterface._callbacks.add(name);
    }

    public static removeCallback(name: string): void {
        let root: any = (Flashbang.app as any);

        if (ExternalInterface._callbacks.delete(name)) {
            delete root[name];
        }
    }

    public static call(name: string, ...args: any[]): any {
        try {
            let f = getDeepProperty(window as any, name) as Function;
            return f.apply(null, args);
        } catch (e) {
            log.error(`ExternalInterface: error calling '${name}': ${e}`);
            return undefined;
        }
    }

    private static _callbacks: Set<string> = new Set();
}


function getDeepProperty(obj: any, name: string): any {
    let prop = obj;
    for (let component of name.split(".")) {
        if (prop === undefined) {
            throw new Error(`'${name}' is not a property of ${obj}`);
        }
        prop = prop[component];
    }
    return prop;
}

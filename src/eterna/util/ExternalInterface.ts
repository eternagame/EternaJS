import * as log from "loglevel";
import {Assert} from "../../flashbang/util/Assert";
import {Registration} from "../../signals/Registration";
import {UnitSignal} from "../../signals/UnitSignal";

/**
 * A collection of externally registered callbacks.
 * GameModes can build an ExternalInterfaceCtx, push it to ExternalInterface when they are active,
 * and pop when they become inactive or destroyed, ensuring that stale callbacks won't linger.
 */
export class ExternalInterfaceCtx {
    public readonly callbacks = new Map<string, Function>();
    public readonly changed = new UnitSignal();

    public addCallback(name: string, callback: Function): void {
        this.callbacks.set(name, callback);
        this.changed.emit();
    }

    public removeCallback(name: string): void {
        if (this.callbacks.delete(name)) {
            this.changed.emit();
        } else {
            log.warn(`No such callback '${name}'`);
        }
    }
}

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

    public static pushContext(ctx: ExternalInterfaceCtx): void {
        let updateReg = ctx.changed.connect(() => this.updateCallbacks());
        this._registeredContexts.push({ctx: ctx, reg: updateReg});
        if (ctx.callbacks.size > 0) {
            this.updateCallbacks();
        }
    }

    public static popContext(ctx: ExternalInterfaceCtx): void {
        let idx = this._registeredContexts.findIndex(registered => registered.ctx === ctx);
        if (idx >= 0) {
            let registered = this._registeredContexts[idx];
            registered.reg.close();
            this._registeredContexts.splice(idx, 1);
            this.updateCallbacks();
        } else {
            log.warn("Can't pop unregistered context");
        }
    }

    public static runScript(scriptID: string | number, params: any = {}, sync: boolean = false): void {
        log.info(`Running script ${scriptID}...`);
        return ExternalInterface.call("ScriptInterface.evaluate_script_with_nid", "" + scriptID, params, null, sync);
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

    private static updateCallbacks(): void {
        // Clear all existing callbacks and re-register them in context order
        for (let name of this._currentCallbackNames) {
            delete this._scriptRoot[name];
        }
        this._currentCallbackNames.clear();

        for (let ctx of this._registeredContexts) {
            for (let [name, callback] of ctx.ctx.callbacks.entries()) {
                this._scriptRoot[name] = callback;
                this._currentCallbackNames.add(name);
            }
        }
    }

    private static _scriptRoot: any;
    private static readonly _registeredContexts: RegisteredCtx[] = [];
    private static readonly _currentCallbackNames = new Set<string>();
}

interface RegisteredCtx {
    ctx: ExternalInterfaceCtx;
    reg: Registration;
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

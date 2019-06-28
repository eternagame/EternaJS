import * as log from "loglevel";
import {Assert, Deferred} from "flashbang/util";
import {Registration, UnitSignal} from "signals";

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

export interface RunScriptOptions {
    params?: any;
    ctx?: ExternalInterfaceCtx;
    checkValid?: () => boolean;
}

/**
 * Exposes named functions to external scripts.
 * This mirrors Flash's ExternalInterface class: it installs functions on the "maingame" <div> that the Eterna
 * app lives inside, and also calls into functions exposed by `script-interface.coffee`, a set of javascript functions
 * loaded by the page.
 */
export default class ExternalInterface {
    public static init(scriptRoot: HTMLElement) {
        Assert.isTrue(this._scriptRoot === undefined, "Already initialized");
        this._scriptRoot = scriptRoot;
    }

    public static pushContext(ctx: ExternalInterfaceCtx): void {
        let updateReg = ctx.changed.connect(() => this.updateCallbacks());
        this._registeredContexts.push({ctx, reg: updateReg});
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

    /** True if there are any running or pending synchronous scripts */
    public static get hasRunningScripts(): boolean {
        return this._curSyncScript != null || this._pendingScripts.length > 0;
    }

    /** @return A promise that will resolve when there are no running or pending synchronous scripts */
    public static waitForScriptCompletion(): Promise<void> {
        if (this.hasRunningScripts) {
            if (this._noPendingScripts == null) {
                this._noPendingScripts = new Deferred();
            }
            return this._noPendingScripts.promise;
        } else {
            return Promise.resolve();
        }
    }

    /**
     * Requests execution of an external script.
     * runScript requests are processed in order, and only one script can run at a time, except for
     * scripts that indicate that they're asynchronous.
     *
     * @return a Promise that will resolve with the results of the script.
     */
    public static runScript(scriptID: string | number, options: RunScriptOptions = {}): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this._pendingScripts.push({
                scriptID: `${scriptID}`,
                options,
                resolve,
                reject,
                synchronous: false
            });

            this.maybeRunNextScript();
        });
    }

    /**
     * Requests execution of an external script, and attempts to get its return value synchronously.
     * Promises are always resolved asynchronously, so this runScript flavor eschews Promises and takes a
     * callback that will be called immediately *if possible*.
     *
     * This doesn't guarantee synchronous execution - another script may already be running, or the script itself
     * may be asynchronous, or the script may need to be fetched from the network if it hasn't already been
     * cached. In fact, the entire premise is folly, ScriptInterface cannot make the guarantee that it claims
     * to, and this function is only here because PoseEditMode.checkConstraint was designed to resolve its
     * constraints synchronously. Use the async version of this function if possible!
     *
     * @return true if the script ran to completion, and false if it couldn't run synchronously and is instead
     * queued to be executed asynchronously.
     */
    public static runScriptMaybeSynchronously(scriptID: string | number, options: RunScriptOptions, callback: (result: any, error: any) => void): boolean {
        let completed = false;
        const complete = (result: any, error: any) => {
            if (completed) {
                return;
            }
            completed = true;
            callback(result, error);
        };

        this._pendingScripts.push({
            scriptID: `${scriptID}`,
            options,
            resolve: result => complete(result, undefined),
            reject: err => complete(undefined, err),
            synchronous: true
        });

        this.maybeRunNextScript();

        // Omit this warning because it'll be fired whenever a puzzle with script constraints is loaded.
        // This is some seriously busted functionality, and script-interface and/or constraint evaluation
        // should be refactored to either always assume async results, or guarantee synchronous return.

        // if (!completed) {
        //     log.warn(`Script did not complete synchronously, but it was supposed to! [scriptID=${scriptID}]`);
        // }

        return completed;
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

    private static maybeRunNextScript(): void {
        while (this._pendingScripts.length > 0 && this._curSyncScript == null) {
            let nextScript = this._pendingScripts.shift();
            if (nextScript.options.checkValid != null && !nextScript.options.checkValid()) {
                log.info(`Not running stale request for script ${nextScript.scriptID}`);
            } else {
                this.runPendingScript(nextScript);
            }
        }

        if (!this.hasRunningScripts && this._noPendingScripts != null) {
            let promise = this._noPendingScripts;
            this._noPendingScripts = null;
            promise.resolve();
        }
    }

    private static runPendingScript(script: PendingScript): void {
        let {ctx} = script.options;
        if (ctx == null) {
            ctx = new ExternalInterfaceCtx();
        }

        let isComplete = false;
        let isAsync = false;

        const complete = (successValue: any, error: any) => {
            if (isComplete) {
                return;
            }
            isComplete = true;

            this.popContext(ctx);

            if (this._curSyncScript === script) {
                this._curSyncScript = null;
            }

            if (error !== undefined) {
                log.warn(`Script ${script.scriptID}: error: ${error}`);
                script.reject(error);
            } else {
                log.info(`Completed ${isAsync ? "async" : ""} script ${script.scriptID}`);
                script.resolve(successValue);
            }

            this.maybeRunNextScript();
        };

        // Create a new "end_" callback
        ctx.addCallback(`end_${script.scriptID}`, (returnValue: any) => {
            if (!this.isAsync(returnValue)) {
                complete(returnValue, undefined);
            } else if (!isAsync) {
                // Scripts can indicate that they run asynchronously by calling their end_
                // function with { "cause": { "async": "true" } }. (They must later
                // call the end_ function normally, when they've actually completed.)
                // If the script indicates that it's async, we immediately relinquish
                // our lock on curSyncScript, and allow other scripts to run.

                log.info(`Script ${script.scriptID} is async. Allowing other scripts to run.`);
                isAsync = true;
                if (this._curSyncScript === script) {
                    this._curSyncScript = null;
                    this.maybeRunNextScript();
                }
            }
        });

        this.pushContext(ctx);

        log.info(`Running script ${script.scriptID}...`);
        this._curSyncScript = script;

        try {
            this.call(
                "ScriptInterface.evaluate_script_with_nid",
                script.scriptID,
                script.options.params || {},
                null,
                script.synchronous
            );
        } catch (err) {
            complete(undefined, err || `Unknown error in script ${script.scriptID}`);
        }
    }

    private static isAsync(returnValue: any): boolean {
        if (returnValue == null || returnValue.cause == null || returnValue.cause.async == null) {
            return false;
        }

        return (
            Boolean(returnValue.cause.async) === true
            || (typeof returnValue.cause.async === "string" && returnValue.cause.async.toLowerCase() === "true")
        );
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

    private static readonly _registeredContexts: RegisteredCtx[] = [];
    private static readonly _currentCallbackNames = new Set<string>();
    private static readonly _pendingScripts: PendingScript[] = [];

    private static _scriptRoot: any;
    private static _curSyncScript: PendingScript;
    private static _noPendingScripts: Deferred<void>;
}

interface PendingScript {
    scriptID: string;
    options: RunScriptOptions;
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
    synchronous: boolean;
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

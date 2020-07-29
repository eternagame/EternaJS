import * as log from 'loglevel';
import {Registration, UnitSignal} from 'signals';
import {Deferred, Assert} from 'flashbang';

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

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface RunScriptOptions {
    params?: any;
    ctx?: ExternalInterfaceCtx;
    checkValid?: () => boolean;
}

function getDeepProperty(obj: any, name: string): [any, any] {
    if (name === '') {
        return [obj, undefined];
    } else {
        let prop = obj;
        let parent;
        for (let component of name.split('.')) {
            if (prop === undefined) {
                throw new Error(`'${name}' is not a property of ${obj}`);
            }
            parent = prop;
            prop = prop[component];
        }
        return [parent, prop];
    }
}

/**
 * Exposes named functions to external scripts.
 * This mirrors Flash's ExternalInterface class: it installs functions on the "maingame" <div> that the Eterna
 * app lives inside, and also calls into functions exposed by `script-interface.coffee`, a set of javascript functions
 * loaded by the page.
 */
export default class ExternalInterface {
    public static init(scriptRoot: HTMLElement) {
        Assert.isTrue(this._scriptRoot === undefined, 'Already initialized');
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
        let idx = this._registeredContexts.findIndex((registered) => registered.ctx === ctx);
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
     * Request a script over the network and cache it.
     * The script interface lazily loads scripts and caches them. By requesting it ahead of time,
     * we can ensure that a script can be executed synchronously (as long as the script itself runs
     * synchronously)
     */
    public static preloadScript(scriptID: string | number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.call(
                'Script.get_script',
                scriptID,
                () => {
                    this._preloadedScripts.push(`${scriptID}`);
                    resolve();
                },
                () => {
                    reject(new Error(`Script preloading failed for script ${scriptID}`));
                }
            );
        });
    }

    /**
     * Requests execution of an external script.
     * runScript requests are processed in order, and only one script can run at a time, except for
     * scripts that indicate that they're asynchronous.
     *
     * @return a Promise that will resolve with the results of the script.
     */
    public static runScriptThroughQueue(scriptID: string | number, options: RunScriptOptions = {}): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this._pendingScripts.push({
                scriptID: `${scriptID}`,
                options,
                resolve,
                reject
            });

            this.maybeRunNextScript();
        });
    }

    /**
     * Requests execution of an external script, and attempts to get its return value synchronously.
     * Promises are always resolved asynchronously, so this runScript flavor eschews Promises.
     *
     * preloadScript **MUST** be used in order to ensure sychronous execution. Note that nothing is stopping script
     * authors from using code such as setTimeout, setInterval, async net requests, or so forth. There are a couple
     * basic checks to detect that happening (specifically, if the author does not know this and tries indicating
     * the script as async, an error will be thrown). Naturally if nothing is synchronously returned, then the script
     * will be useless to whatever functionality calls this function. Beyond that, any asynchronous code in a script
     * run by this function may lead to undefined behavior.
     *
     * The primary reason for the existance of this function is for SCRIPT constraints, which are designed to be
     * executed synchronously. If at all possible, use the async version of this function.
     */
    public static runScriptSync(scriptID: string | number, options: RunScriptOptions): any {
        if (!this._preloadedScripts.includes(`${scriptID}`)) {
            // If we try to do this it's almost certainly going to break (scripts have to be asynchronously loaded once,
            // so this can't be synchronous), so just... don't.
            throw new Error('runScriptSync attempted to run a script which has not been preloaded');
        }

        let scriptReturn: any = null;

        this.runScriptInternal(
            `${scriptID}`,
            options,
            true,
            (result) => { scriptReturn = result; },
            (error) => { throw new Error(error); }
        );

        return scriptReturn;
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
            Assert.assertIsDefined(nextScript);
            if (nextScript.options.checkValid != null && !nextScript.options.checkValid()) {
                log.info(`Not running stale request for script ${nextScript.scriptID}`);
            } else {
                this._curSyncScript = nextScript;
                let cleanup = () => {
                    this._curSyncScript = null;
                    this.maybeRunNextScript();
                };

                this.runScriptInternal(
                    nextScript.scriptID,
                    nextScript.options,
                    false,
                    (result) => {
                        Assert.assertIsDefined(nextScript);
                        nextScript.resolve(result);
                        cleanup();
                    },
                    (error) => {
                        Assert.assertIsDefined(nextScript);
                        nextScript.reject(error instanceof Error ? error : new Error(error));
                        cleanup();
                    }
                );
            }
        }

        if (!this.hasRunningScripts && this._noPendingScripts != null) {
            let promise = this._noPendingScripts;
            this._noPendingScripts = null;
            promise.resolve();
        }
    }

    /**
     * Runs a named script. Calls a callback with the result of the script, or a different one if
     * the script has an error.
     *
     * This function uses callbacks instead of a Promise because Promise callbacks never run syncronously
     *
     * @param script The name of the script
     * @param options RunScriptOptions
     * @param requireSynchronous If true:
     * 1. if the script doesn't complete immediately, the error callback will be called
     * 2. The syncronous flag is passed ScriptInterface.evaluate_script_with_nid (forcing the preloaded script to
     * be returned immediately in Script.get_script)
     * @param onSuccess Callback on successful script execution
     * @param onError Callback on unsuccessful script execution
     */
    private static runScriptInternal(
        scriptID: string,
        options: RunScriptOptions,
        requireSynchronous: boolean,
        onSuccess: (result: any) => void,
        onError: (reason: any) => void
    ): void {
        let ctx = options.ctx || new ExternalInterfaceCtx();

        let isComplete = false;
        let declaredAsync = false;

        const complete = (successValue: any, error: any) => {
            if (isComplete) {
                // We can only resolve/reject once
                return;
            }
            isComplete = true;

            this.popContext(ctx);

            if (error !== undefined) {
                log.warn(`Script ${scriptID}: error: ${error}`);
                onError(error);
            } else {
                log.info(`Completed ${declaredAsync ? 'async' : ''} script ${scriptID}`);
                onSuccess(successValue);
            }
        };

        ctx.addCallback(`end_${scriptID}`, (returnValue: any) => {
            if (!this.isAsync(returnValue)) {
                complete(returnValue, undefined);
            } else if (!declaredAsync) {
                // This should only be run once, if the script indicates that it's async multiple times, ignore it

                if (requireSynchronous) {
                    complete(undefined, `Script requested to run asynchronously, which is not supported for this script type [scriptID=${scriptID}]`);
                }
                // Scripts can indicate that they run asynchronously by calling their end_
                // function with { "cause": { "async": "true" } }. (They must later
                // call the end_ function normally, when they've actually completed.)
                declaredAsync = true;
            }
        });

        this.pushContext(ctx);

        log.info(`Running script ${scriptID}...`);

        try {
            this.call(
                'ScriptInterface.evaluate_script_with_nid',
                scriptID,
                options.params || {},
                null,
                requireSynchronous
            );
        } catch (err) {
            complete(undefined, err || `Unknown error in script ${scriptID}`);
        }

        if (!isComplete && requireSynchronous) {
            complete(undefined, `Script did not complete synchronously, but it was supposed to! [scriptID=${scriptID}]`);
        }
    }

    private static isAsync(returnValue: any): boolean {
        if (returnValue == null || returnValue.cause == null || returnValue.cause.async == null) {
            return false;
        }

        return (
            Boolean(returnValue.cause.async) === true
            || (typeof returnValue.cause.async === 'string' && returnValue.cause.async.toLowerCase() === 'true')
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
    private static _curSyncScript: PendingScript | null;
    private static _noPendingScripts: Deferred<void> | null;
    private static _preloadedScripts: string[] = [];
}

interface PendingScript {
    scriptID: string;
    options: RunScriptOptions;
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

interface RegisteredCtx {
    ctx: ExternalInterfaceCtx;
    reg: Registration;
}

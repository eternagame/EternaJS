// import Cons from "./Cons";
import {Cons} from ".";

export type RListener = (arg1?: any, arg2?: any, arg3?: any) => void;

/**
 * A base class for all reactive classes. This is an implementation detail, but is public so that
 * third parties may use it to create their own reactive classes, if desired.
 */
export default abstract class Reactor {
    /** true if this reactor has at least one connection. */
    public get hasConnections(): boolean {
        return this._listeners != null;
    }

    protected addConnection(listener: RListener): Cons {
        if (listener == null) {
            throw new Error("Null listener");
        }
        return this._addCons(new Cons(this, listener));
    }

    protected removeConnection(listener: RListener): void {
        if (this.isDispatching) {
            this._pendingRuns = Reactor.insert(this._pendingRuns, new Runs((): void => {
                this._listeners = Cons.removeAll(this._listeners, listener);
                this.connectionRemoved();
            }));
        } else {
            this._listeners = Cons.removeAll(this._listeners, listener);
            this.connectionRemoved();
        }
    }

    /**
     * Emits the supplied event to all connected slots.
     */
    protected notify(a1?: any, a2?: any, a3?: any): void {
        if (this._listeners == null) {
            // Bail early if we have no listeners
            return;
        } else if (this._listeners === Reactor.DISPATCHING) {
            throw new Error("Initiated notify while notifying");
        }

        let lners: Cons = this._listeners;
        this._listeners = Reactor.DISPATCHING;

        let error: Error = null;
        try {
            for (let cons: Cons = lners; cons != null; cons = cons.next) {
                // cons.listener will be null if Cons was closed after iteration started
                if (cons.listener != null) {
                    try {
                        cons.listener(a1, a2, a3);
                    } catch (e) {
                        error = e;
                    }
                    if (cons.oneShot()) {
                        cons.close();
                    }
                }
            }

            if (error != null) {
                throw error;
            }
        } finally {
            // note that we're no longer dispatching
            this._listeners = lners;

            // now remove listeners any queued for removing and add any queued for adding
            for (; this._pendingRuns != null; this._pendingRuns = this._pendingRuns.next) {
                this._pendingRuns.action();
            }
        }
    }

    /**
     * Called prior to mutating any underlying model; allows subclasses to reject mutation.
     */
    protected checkMutate(): void {
        // noop
    }

    protected checkOtherMutate(): void {
        // noop
    }

    /**
     * Called when a connection has been added to this reactor.
     */
    protected connectionAdded(): void {
        // noop
    }

    /**
     * Called when a connection may have been removed from this reactor.
     */
    protected connectionRemoved(): void {
        // noop
    }

    /* internal */
    _addCons(cons: Cons): Cons {
        if (this.isDispatching) {
            this._pendingRuns = Reactor.insert(this._pendingRuns, new Runs(() => {
                this._listeners = Cons.insert(this._listeners, cons);
                this.connectionAdded();
            }));
        } else {
            this._listeners = Cons.insert(this._listeners, cons);
            this.connectionAdded();
        }
        return cons;
    }

    /* internal */
    _removeCons(cons: Cons): void {
        if (this.isDispatching) {
            this._pendingRuns = Reactor.insert(this._pendingRuns, new Runs(() => {
                this._listeners = Cons.remove(this._listeners, cons);
                this.connectionRemoved();
            }));
        } else {
            this._listeners = Cons.remove(this._listeners, cons);
            this.connectionRemoved();
        }
    }

    private get isDispatching(): boolean {
        return this._listeners === Reactor.DISPATCHING;
    }

    protected static insert(head: Runs, action: Runs): Runs {
        if (head == null) {
            return action;
        } else {
            head.next = Reactor.insert(head.next, action);
            return head;
        }
    }

    protected _listeners: Cons;
    protected _pendingRuns: Runs;

    protected static DISPATCHING: Cons = new Cons(null, null);
}

class Runs {
    public next: Runs;
    public action: () => void;

    constructor(action: () => void) {
        this.action = action;
    }
}

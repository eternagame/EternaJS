import Cons from './Cons';

export type RListenerArgs = [...unknown[]];
export type RListener<Args extends RListenerArgs> = (...args: Args) => void;

/**
 * A base class for all reactive classes. This is an implementation detail, but is public so that
 * third parties may use it to create their own reactive classes, if desired.
 */
export default abstract class Reactor<ListenerArgs extends RListenerArgs> {
    /** true if this reactor has at least one connection. */
    public get hasConnections(): boolean {
        return this._listeners != null;
    }

    protected addConnection(
        listener: RListener<ListenerArgs>
    ): Cons<ListenerArgs> {
        if (listener == null) {
            throw new Error('Null listener');
        }
        return this._addCons(new Cons(this, listener));
    }

    protected removeConnection(listener: RListener<ListenerArgs>): void {
        if (this.isDispatching) {
            this._pendingRuns = Reactor.insert(
                this._pendingRuns,
                new Runs((): void => {
                    this._listeners = Cons._removeAll(
                        this._listeners,
                        listener
                    );
                    this.connectionRemoved();
                })
            );
        } else {
            this._listeners = Cons._removeAll(this._listeners, listener);
            this.connectionRemoved();
        }
    }

    /**
     * Emits the supplied event to all connected slots.
     */
    protected notify(...args: ListenerArgs): void {
        if (this._listeners == null) {
            // Bail early if we have no listeners
            return;
        }

        if (this._listeners === this.DISPATCHING) {
            throw new Error('Initiated notify while notifying');
        }

        const lners: Cons<ListenerArgs> = this._listeners;
        this._listeners = this.DISPATCHING;

        let error: unknown | null = null;
        try {
            for (
                let cons: Cons<ListenerArgs> | null = lners;
                cons != null;
                cons = cons.next
            ) {
                try {
                    cons.listener(...args);
                } catch (e) {
                    error = e;
                }
                if (cons.oneShot()) {
                    cons.close();
                }
            }

            if (error != null) {
                throw error;
            }
        } finally {
            // note that we're no longer dispatching
            this._listeners = lners;

            // now remove listeners any queued for removing and add any queued for adding
            for (
                ;
                this._pendingRuns != null;
                this._pendingRuns = this._pendingRuns.next
            ) {
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
    public _addCons(cons: Cons<ListenerArgs>): Cons<ListenerArgs> {
        if (this.isDispatching) {
            this._pendingRuns = Reactor.insert(
                this._pendingRuns,
                new Runs(() => {
                    this._listeners = Cons._insert(this._listeners, cons);
                    this.connectionAdded();
                })
            );
        } else {
            this._listeners = Cons._insert(this._listeners, cons);
            this.connectionAdded();
        }
        return cons;
    }

    /* internal */
    public _removeCons(cons: Cons<ListenerArgs>): void {
        if (this.isDispatching) {
            this._pendingRuns = Reactor.insert(
                this._pendingRuns,
                new Runs(() => {
                    this._listeners = Cons._remove(this._listeners, cons);
                    this.connectionRemoved();
                })
            );
        } else {
            this._listeners = Cons._remove(this._listeners, cons);
            this.connectionRemoved();
        }
    }

    private get isDispatching(): boolean {
        return this._listeners === this.DISPATCHING;
    }

    protected static insert(head: Runs | null, action: Runs): Runs {
        if (head == null) {
            return action;
        }

        // eslint-disable-next-line no-param-reassign
        head.next = Reactor.insert(head.next, action);
        return head;
    }

    protected _listeners: Cons<ListenerArgs> | null = null;
    protected _pendingRuns: Runs | null = null;

    // AMW: this shouldn't be static. then it can't match up with template
    // params...
    // TODO: if this breaks things, maybe that's a sign that we need this... to
    // be nullable or something.
    protected DISPATCHING: Cons<ListenerArgs> = new Cons<ListenerArgs>(
        null,
        () => {}
    );
}

class Runs {
    public next: Runs | null = null;
    public action: () => void;

    constructor(action: () => void) {
        this.action = action;
    }
}

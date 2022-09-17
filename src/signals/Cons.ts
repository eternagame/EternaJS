import Reactor, {RListener, RListenerArgs} from './Reactor';

import Connection from './Connection';

/**
 * Implements {@link Connection} and a linked-list style listener list for {@link Reactor}s.
 */
export default class Cons<ListenerArgs extends RListenerArgs> implements Connection {
    /** The next connection in our chain. */
    public next: Cons<ListenerArgs> | null;

    constructor(owner: Reactor<ListenerArgs> | null, listener: RListener<ListenerArgs> | null) {
        this._owner = owner;
        this._listener = listener;
    }

    /** Indicates whether this connection is one-shot or persistent. */
    public /* final */ oneShot(): boolean {
        return this._oneShot;
    }

    /** Returns the listener for this cons cell. */
    public get listener(): RListener<ListenerArgs> | null {
        return this._listener;
    }

    public close(): void {
        // multiple disconnects are OK, we just NOOP after the first one
        if (this._owner != null) {
            this._owner._removeCons(this);
            this._owner = null;
            this._listener = null;
        }
    }

    public once(): Connection {
        this._oneShot = true;
        return this;
    }

    public atPriority(priority: number): Connection {
        if (this._owner == null) {
            throw new Error('Cannot change priority of disconnected connection.');
        }
        this._owner._removeCons(this);
        this.next = null;
        this._priority = priority;
        this._owner._addCons(this);
        return this;
    }

    /* internal */
    public static _insert<ListenerArgs extends RListenerArgs>(
        head: Cons<ListenerArgs> | null,
        cons: Cons<ListenerArgs>
    ): Cons<ListenerArgs> {
        if (head == null) {
            return cons;
        } else if (cons._priority > head._priority) {
            cons.next = head;
            return cons;
        } else {
            head.next = Cons._insert(head.next, cons);
            return head;
        }
    }

    /* internal */
    public static _remove<ListenerArgs extends RListenerArgs>(
        head: Cons<ListenerArgs> | null,
        cons: Cons<ListenerArgs>
    ): Cons<ListenerArgs> | null {
        if (head == null) {
            return head;
        } else if (head === cons) {
            return head.next;
        } else {
            head.next = Cons._remove(head.next, cons);
            return head;
        }
    }

    /* internal */
    public static _removeAll<ListenerArgs extends RListenerArgs>(
        head: Cons<ListenerArgs> | null,
        listener: RListener<ListenerArgs>
    ): Cons<ListenerArgs> | null {
        if (head == null) {
            return null;
        } else if (head.listener === listener) {
            return Cons._removeAll(head.next, listener);
        } else {
            head.next = Cons._removeAll(head.next, listener);
            return head;
        }
    }

    private _owner: Reactor<ListenerArgs> | null;
    private _listener: RListener<ListenerArgs> | null;
    private _oneShot: boolean;
    private _priority: number = 0;
}

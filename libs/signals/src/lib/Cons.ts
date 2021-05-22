import Reactor, {RListener} from './Reactor';

import Connection from './Connection';

/**
 * Implements {@link Connection} and a linked-list style listener list for {@link Reactor}s.
 */
export default class Cons<T1, T2, T3> implements Connection {
    /** The next connection in our chain. */
    public next: Cons<T1, T2, T3> | null;

    constructor(owner: Reactor<T1, T2, T3> | null, listener: RListener<T1, T2, T3> | null) {
        this._owner = owner;
        this._listener = listener;
    }

    /** Indicates whether this connection is one-shot or persistent. */
    public /* final */ oneShot(): boolean {
        return this._oneShot;
    }

    /** Returns the listener for this cons cell. */
    public get listener(): RListener<T1, T2, T3> | null {
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
    public static _insert<T1, T2, T3>(head: Cons<T1, T2, T3> | null, cons: Cons<T1, T2, T3>): Cons<T1, T2, T3> {
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
    public static _remove<T1, T2, T3>(head: Cons<T1, T2, T3> | null, cons: Cons<T1, T2, T3>): Cons<T1, T2, T3> | null {
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
    public static _removeAll<T1, T2, T3>(
        head: Cons<T1, T2, T3> | null,
        listener: RListener<T1, T2, T3>
    ): Cons<T1, T2, T3> | null {
        if (head == null) {
            return null;
        } else if (head.listener === listener) {
            return Cons._removeAll(head.next, listener);
        } else {
            head.next = Cons._removeAll(head.next, listener);
            return head;
        }
    }

    private _owner: Reactor<T1, T2, T3> | null;
    private _listener: RListener<T1, T2, T3> | null;
    private _oneShot: boolean;
    private _priority: number = 0;
}

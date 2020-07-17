import {Registration} from 'signals';

export interface LinkedElement<T> {
    next: LinkedElement<T> | null;
    data: T | null;
}

/** A singly-linked list. */
export default class LinkedList<T> {
    /** Return true if the list is empty. During iteration, isEmpty will always return false. */
    public get isEmpty(): boolean {
        return this._head == null;
    }

    public dispose(): void {
        for (let cons: Cons<T> | null = this._head; cons != null; cons = cons._next) {
            cons.data = null;
            cons.owner = null;
        }

        this._head = null;
        this._iterating = null;
        this._pendingRuns = null;
    }

    public pushFront(data: T): Registration {
        return this.addCons(new Cons(this, data), true);
    }

    public pushBack(data: T): Registration {
        return this.addCons(new Cons(this, data), false);
    }

    public remove(data: T): void {
        if (this.isIterating) {
            this._pendingRuns = LinkedList.pend(this._pendingRuns, new Runs(() => {
                this._head = Cons.removeData(this._head, data);
            }));
        } else {
            this._head = Cons.removeData(this._head, data);
        }
    }

    public get isIterating(): boolean {
        return this._head === this.ITERATING;
    }

    public clear(): void {
        if (this.isIterating) {
            this._pendingRuns = LinkedList.pend(this._pendingRuns, new Runs(this.clear));
        } else {
            for (let cons: Cons<T> | null = this._head; cons != null; cons = cons._next) {
                cons.data = null;
                cons.owner = null;
            }
            this._head = null;
        }
    }

    public beginIteration(): LinkedElement<T> | null {
        if (this._head === this.ITERATING) {
            throw new Error('Initiated beginIteration while iterating');
        }
        this._iterating = this._head;
        this._head = this.ITERATING;
        return this._iterating;
    }

    public endIteration(): void {
        // note that we're no longer dispatching
        if (this._head !== this.ITERATING) {
            throw new Error('Not iterating');
        }

        this._head = this._iterating;
        this._iterating = null;

        // now remove listeners any queued for removing and add any queued for adding
        for (; this._pendingRuns != null; this._pendingRuns = this._pendingRuns.next) {
            this._pendingRuns.action();
        }
    }

    private addCons(cons: Cons<T>, atFront: boolean): Cons<T> {
        if (this.isIterating) {
            this._pendingRuns = LinkedList.pend(this._pendingRuns, new Runs(() => {
                this._head = (atFront ? Cons.insertFront(this._head, cons) : Cons.insertBack(this._head, cons));
            }));
        } else {
            this._head = (atFront ? Cons.insertFront(this._head, cons) : Cons.insertBack(this._head, cons));
        }
        return cons;
    }

    /* internal */
    public _removeCons(cons: Cons<T>): void {
        if (this.isIterating) {
            this._pendingRuns = LinkedList.pend(this._pendingRuns, new Runs(() => {
                this._head = Cons.remove(this._head, cons);
            }));
        } else {
            this._head = Cons.remove(this._head, cons);
        }
    }

    private static pend(head: Runs | null, action: Runs): Runs {
        if (head == null) {
            return action;
        } else {
            head.next = LinkedList.pend(head.next, action);
            return head;
        }
    }

    private _head: Cons<T> | null;
    private _iterating: Cons<T> | null;
    private _pendingRuns: Runs | null;

    private readonly ITERATING: Cons<T> = new Cons<T>(null, null);
}

class Runs {
    public next: Runs;
    public action: () => void;

    constructor(action: () => void) {
        this.action = action;
    }
}

/** Implements {@link Registration} and a linked-list style list. */
class Cons<T> implements Registration, LinkedElement<T> {
    public _next: Cons<T> | null;
    public data: T | null;
    public owner: LinkedList<T> | null;

    constructor(owner: LinkedList<T> | null, data: T | null) {
        this.owner = owner;
        this.data = data;
    }

    public get next(): LinkedElement<T> | null {
        return this._next;
    }

    public close(): void {
        // multiple disconnects are OK, we just NOOP after the first one
        if (this.owner != null) {
            this.owner._removeCons(this);
            this.owner = null;
            this.data = null;
        }
    }

    public static insertFront<T>(head: Cons<T> | null, cons: Cons<T>): Cons<T> {
        if (head == null) {
            return cons;
        } else {
            cons._next = head;
            return cons;
        }
    }

    public static insertBack<T>(head: Cons<T> | null, cons: Cons<T>): Cons<T> {
        if (head == null) {
            return cons;
        } else {
            head._next = Cons.insertBack(head._next, cons);
            return head;
        }
    }

    public static remove<T>(head: Cons<T> | null, cons: Cons<T>): Cons<T> | null {
        if (head == null) {
            return head;
        } else if (head === cons) {
            return head._next;
        } else {
            head._next = Cons.remove(head._next, cons);
            return head;
        }
    }

    public static removeData<T>(head: Cons<T> | null, data: T): Cons<T> | null {
        if (head == null) {
            return head;
        } else if (head.data === data) {
            return head._next;
        } else {
            head._next = Cons.removeData(head._next, data);
            return head;
        }
    }
}

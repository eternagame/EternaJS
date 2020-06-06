import AbstractSignal from './AbstractSignal';
import SignalView from './SignalView';
import Connection from './Connection';
import FilteredSignal from './FilteredSignal';

/**
 * Plumbing to implement mapped signals in such a way that they automatically manage a connection
 * to their underlying signal. When the mapped signal adds its first connection, it establishes a
 * connection to the underlying signal, and when it removes its last connection it clears its
 * connection from the underlying signal.
 */
export default abstract class MappedSignal<T> extends AbstractSignal<T> {
    public static create<TMapped, TSource>(
        source: SignalView<TSource>,
        f: (value: TSource) => TMapped
    ): MappedSignal<TMapped> {
        return new MappedSignalImpl(source, f);
    }

    /**
     * Establishes a connection to our source signal. Called when we go from zero to one listeners.
     * When we go from one to zero listeners, the connection will automatically be cleared.
     *
     * @return the newly established connection.
     */
    protected abstract connectToSource(): Connection;

    public map<U>(func: (value: T) => U): SignalView<U> {
        return MappedSignal.create(this, func);
    }

    public filter(pred: (value: T) => boolean): SignalView<T> {
        return new FilteredSignal(this, pred);
    }

    /* override */
    protected connectionAdded(): void {
        super.connectionAdded();
        if (this._conn == null) {
            this._conn = this.connectToSource();
        }
    }

    /* override */
    protected connectionRemoved(): void {
        super.connectionRemoved();
        if (!this.hasConnections && this._conn != null) {
            this._conn.close();
            this._conn = null;
        }
    }

    protected _conn: Connection | null;
}

class MappedSignalImpl<TMapped, TSource> extends MappedSignal<TMapped> {
    constructor(source: SignalView<TSource>, f: (value: TSource) => TMapped) {
        super();
        this._source = source;
        this._f = f;
    }

    /* override */ protected connectToSource(): Connection {
        return this._source.connect((value): void => { this.notifyEmit(this._f(value)); });
    }

    protected _source: SignalView<TSource>;
    protected _f: (value: TSource) => TMapped;
}

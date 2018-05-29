import {AbstractSignal} from "./AbstractSignal";
import {SignalView} from "./SignalView";
import {Connection} from "./Connection";

/**
 * Plumbing to implement mapped signals in such a way that they automatically manage a connection
 * to their underlying signal. When the mapped signal adds its first connection, it establishes a
 * connection to the underlying signal, and when it removes its last connection it clears its
 * connection from the underlying signal.
 */
export abstract class MappedSignal<T> extends AbstractSignal<T> {
    public static create<TMapped, TSource>(source: SignalView<TSource>, f: (value: TSource) => TMapped): MappedSignal<TMapped> {
        return new MappedSignalImpl(source, f);
    }

    /**
     * Establishes a connection to our source signal. Called when we go from zero to one listeners.
     * When we go from one to zero listeners, the connection will automatically be cleared.
     *
     * @return the newly established connection.
     */
    protected abstract connectToSource(): Connection;

    /*override*/
    protected connectionAdded(): void {
        super.connectionAdded();
        if (this._conn == null) {
            this._conn = this.connectToSource();
        }
    }

    /*override*/
    protected connectionRemoved(): void {
        super.connectionRemoved();
        if (!this.hasConnections && this._conn != null) {
            this._conn.close();
            this._conn = null;
        }
    }

    protected _conn: Connection;
}

class MappedSignalImpl<TMapped, TSource> extends MappedSignal<TMapped> {
    constructor(source: SignalView<TSource>, f: (value: TSource) => TMapped) {
        super();
        this._source = source;
        this._f = f;
    }

    /*override*/ protected connectToSource(): Connection {
        return this._source.connect(this.onSourceEmit);
    }

    protected onSourceEmit(value: TSource): void {
        this.notifyEmit(this._f(value));
    }

    protected _source: SignalView<TSource>;
    protected _f: (value: TSource) => TMapped;
}

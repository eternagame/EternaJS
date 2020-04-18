import AbstractValue from './AbstractValue';
import ValueView from './ValueView';
import Connection from './Connection';

/**
 * Plumbing to implement mapped values in such a way that they automatically manage a connection to
 * their underlying value. When the mapped value adds its first connection, it establishes a
 * connection to the underlying value, and when it removes its last connection it clears its
 * connection from the underlying value.
 */
export default abstract class MappedValue<T> extends AbstractValue<T> {
    public static create<T, U>(source: ValueView<T>, map: (value: T) => U): ValueView<U> {
        return new MappedValueImpl(source, map);
    }

    public map<U>(func: (value: T) => U): ValueView<U> {
        return MappedValue.create(this, func);
    }

    /**
     * Establishes a connection to our source value. Called when we go from zero to one listeners.
     * When we go from one to zero listeners, the connection will automatically be cleared.
     *
     * @return the newly established connection.
     */
    protected abstract connectToSource(): Connection;

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

class MappedValueImpl<TMapped, TSource> extends MappedValue<TMapped> {
    constructor(source: ValueView<TSource>, f: (value: TSource) => TMapped) {
        super();
        this._source = source;
        this._f = f;
    }

    /* override */
    public get value(): TMapped {
        return this._f(this._source.value);
    }

    /* override */
    protected connectToSource(): Connection {
        return this._source.connect((value: TSource, ovalue: TSource): void => {
            this.notifyChange(this._f(value), this._f(ovalue));
        });
    }

    private readonly _source: ValueView<TSource>;
    private readonly _f: (value: TSource) => TMapped;
}

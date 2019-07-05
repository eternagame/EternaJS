import Connection from './Connection';

/**
 * A view of a {@link Signal}, on which slots may listen, but to which one cannot emit events. This
 * is generally used to provide signal-like views of changing entities. See {@link AbstractValue}
 * for an example.
 */
export default interface SignalView<T> {
    /**
     * Creates a signal that maps this signal via a function. When this signal emits a value, the
     * mapped signal will emit that value as transformed by the supplied function. The mapped value
     * will retain a connection to this signal for as long as it has connections of its own.
     */
    map<U>(func: (value: T) => U): SignalView<U>;

    /**
     * Creates a signal that emits a value only when the supplied filter function returns true. The
     * filtered signal will retain a connection to this signal for as long as it has connections of
     * its own.
     */
    filter(pred: (value: T) => boolean): SignalView<T>;

    /**
     * Connects this signal to the supplied function, such that when an event is emitted from this
     * signal, the function will be called.
     *
     * @return a connection instance which can be used to cancel the connection.
     */
    connect(slot: (value: T) => void): Connection;

    /**
     * Disconnects the supplied function from this signal if connect was called with it.
     * If the slot has been connected multiple times, all connections are cancelled.
     */
    disconnect(slot: (value: T) => void): void;
}

import Connection from './Connection';

/**
 * A view of a {@link AbstractValue} subclass, to which listeners may be added, but which one
 * cannot update. Value consumers should require only a view on a value, rather than a
 * concrete value.
 */
export default interface ValueView<T> {
    /** Returns the current value. */
    value: T;

    /**
     * Creates a value that maps this value via a function. When this value changes, the mapped
     * listeners will be notified, regardless of whether the new and old mapped values differ. The
     * mapped value will retain a connection to this value for as long as it has connections of its
     * own.
     */
    map<U>(func: (value: T) => U): ValueView<U>;

    /**
     * Connects the supplied Function to this value, such that it will be notified when this value
     * changes.
     * @return a connection instance which can be used to cancel the connection.
     */
    connect(listener: (value: T, ovalue: T) => void): Connection;

    /**
     * Connects the supplied listener to this value, such that it will be notified when this value
     * changes. Also immediately notifies the listener of the current value. Note that the previous
     * value supplied with this notification will be null. If the notification triggers an
     * unchecked exception, the slot will automatically be disconnected and the caller need not
     * worry about cleaning up after itself.
     * @return a connection instance which can be used to cancel the connection.
     */
    connectNotify(listener: (value: T, ovalue: T) => void): Connection;

    /**
     * Disconnects the supplied listener from this value if it's connected. If the listener has been
     * connected multiple times, all connections are cancelled.
     */
    disconnect(listener: (value: T, ovalue: T) => void): void;
}

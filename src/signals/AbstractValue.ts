import Assert from 'flashbang/util/Assert';
import Connection from './Connection';
import Cons from './Cons';
import Reactor from './Reactor';
import ValueView from './ValueView';

/**
 * Handles the machinery of connecting listeners to a value and notifying them, without exposing a
 * public interface for updating the value. This can be used by libraries which wish to provide
 * observable values, but must manage the maintenance and distribution of value updates themselves
 * (so that they may send them over the network, for example).
 */
export default abstract class AbstractValue<T> extends Reactor<T, T, undefined> implements ValueView<T> {
    public abstract get value(): T;

    /** Returns a "slot" Function which simply calls through to the Value's setter function. */
    public get slot(): (value: T) => T {
        return (value: T) => this.updateAndNotifyIf(value);
    }

    public abstract map<U>(func: (value: T) => U): ValueView<U>;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public connect(listener: (value: any, ovalue: any) => void): Connection {
        return this.addConnection(listener);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public connectNotify(listener: (value: any, ovalue: any) => void): Connection {
        // connect before calling emit; if the listener changes the value in the body of onEmit, it
        // will expect to be notified of that change; however if onEmit throws a runtime exception,
        // we need to take care of disconnecting the listener because the returned connection
        // instance will never reach the caller
        let cons: Cons<T, T, undefined> = this.addConnection(listener);
        try {
            Assert.assertIsDefined(cons.listener);
            cons.listener(this.value);
        } catch (e) {
            cons.close();
            throw e;
        }
        return cons;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public disconnect(listener: (value: any, ovalue: any) => void): void {
        this.removeConnection(listener);
    }

    /**
     * Updates the value contained in this instance and notifies registered listeners iff said
     * value is not equal to the value already contained in this instance.
     */
    protected updateAndNotifyIf(value: T): T {
        return this.updateAndNotify(value, false);
    }

    /**
     * Updates the value contained in this instance and notifies registered listeners.
     * @return the previously contained value.
     */
    protected updateAndNotify(value: T, force: boolean = true): T {
        this.checkMutate();
        let ovalue: T = this.updateLocal(value);
        if (force || !this.valuesAreEqual(value, ovalue)) {
            this.emitChange(value, ovalue);
        }
        return ovalue;
    }

    /**
     * Emits a change notification. Default implementation immediately notifies listeners.
     */
    protected emitChange(value: T, oldValue: T): void {
        this.notifyChange(value, oldValue);
    }

    /**
     * Notifies our listeners of a value change.
     */
    protected notifyChange(value: T, oldValue: T): void {
        this.notify(value, oldValue);
    }

    /**
     * Updates our locally stored value. Default implementation throws IllegalOperationError.
     * @return the previously stored value.
     */
    protected updateLocal(value: T): T {
        throw new Error('IllegalOperationError');
    }

    /**
     * Override to customize the comparison done in updateAndNotify to decide if an update will
     * be performed if a force is not requested.
     */
    protected valuesAreEqual(value1: T, value2: T): boolean {
        return value1 === value2;
    }
}

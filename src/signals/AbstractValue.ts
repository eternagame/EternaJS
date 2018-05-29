import {Connection} from "./Connection";
import {Cons} from "./Cons";
import {MappedValue} from "./MappedValue";
import {Reactor} from "./Reactor";
import {RListener} from "./RListener";
import {ValueView} from "./ValueView";

/**
 * Handles the machinery of connecting listeners to a value and notifying them, without exposing a
 * public interface for updating the value. This can be used by libraries which wish to provide
 * observable values, but must manage the maintenance and distribution of value updates themselves
 * (so that they may send them over the network, for example).
 */
export abstract class AbstractValue<T> extends Reactor implements ValueView<T> {
    public abstract get value(): T;

    /** Returns a "slot" Function which simply calls through to the Value's setter function. */
    public get slot(): Function {
        return this.updateAndNotifyIf;
    }

    public map<U>(func: (value: T) => U): ValueView<U> {
        return MappedValue.create(this, func);
    }

    public connect(listener: (value: T, ovalue: T) => void): Connection {
        return this.addConnection(listener);
    }

    public connectNotify(listener: (value: T, ovalue: T) => void): Connection {
        // connect before calling emit; if the listener changes the value in the body of onEmit, it
        // will expect to be notified of that change; however if onEmit throws a runtime exception,
        // we need to take care of disconnecting the listener because the returned connection
        // instance will never reach the caller
        let cons: Cons = this.addConnection(listener);
        try {
            cons.listener.onChange(this.value, null);
        } catch (e) {
            cons.close();
            throw e;
        }
        return cons;
    }

    public disconnect(listener: (value: T, ovalue: T) => void): void {
        this.removeConnection(listener);
    }

    /**
     * Updates the value contained in this instance and notifies registered listeners iff said
     * value is not equal to the value already contained in this instance.
     */
    protected updateAndNotifyIf(value: T): Object {
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
    protected emitChange(value: Object, oldValue: Object): void {
        this.notifyChange(value, oldValue);
    }

    /**
     * Notifies our listeners of a value change.
     */
    protected notifyChange(value: any, oldValue: any): void {
        this.notify(AbstractValue.CHANGE, value, oldValue, null);
    }

    /**
     * Updates our locally stored value. Default implementation throws IllegalOperationError.
     * @return the previously stored value.
     */
    protected updateLocal(value: T): T {
        throw new Error("IllegalOperationError");
    }

    /**
     * Override to customize the comparison done in updateAndNotify to decide if an update will
     * be performed if a force is not requested.
     */
    protected valuesAreEqual(value1: T, value2: T): boolean {
        return value1 == value2;
    }

    protected static readonly CHANGE = (l: RListener, value: any, oldValue: any, _: any) => {
        l.onChange(value, oldValue);
    }
}

import AbstractValue from './AbstractValue';
import MappedValue from './MappedValue';
import ValueView from './ValueView';

export default class Value<T> extends AbstractValue<T> implements ValueView<T> {
    /** Creates an instance with the supplied starting value. */
    constructor(value: T) {
        super();
        this._value = value;
    }

    public get value(): T {
        return this._value;
    }

    /**
     * Updates this instance with the supplied value. Registered listeners are notified only if the
     * value differs from the current value.
     * @return the previous value contained by this instance.
     */
    public set value(value: T) {
        this.updateAndNotifyIf(value);
    }

    public map<U>(func: (value: T) => U): ValueView<U> {
        return MappedValue.create(this, func);
    }

    /**
     * Updates this instance with the supplied value. Registered listeners are notified regardless
     * of whether the new value is equal to the old value.
     * @return the previous value contained by this instance.
     */
    public updateForce(value: T): T {
        return this.updateAndNotify(value);
    }

    /* override */
    protected updateLocal(value: T): T {
        let oldValue: T = this._value;
        this._value = value;
        return oldValue;
    }

    protected _value: T;
}

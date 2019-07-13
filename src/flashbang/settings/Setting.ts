import {AbstractValue, MappedValue, ValueView} from 'signals';

export default class Setting<T> extends AbstractValue<T> {
    constructor(store: StoreJsAPI, name: string, defaultVal: T) {
        super();
        this._store = store;
        this._name = name;
        this._defaultVal = defaultVal;
    }

    /** Returns true if the setting has been created (even if its value is null) */
    public get exists(): boolean {
        return this._store.get(this._name) !== undefined;
    }

    /**
     * Updates this instance with the supplied value. Registered listeners are notified only if the
     * value differs from the current value.
     * @return the previous value contained by this instance.
     */
    public set value(value: T) {
        this.updateAndNotifyIf(value);
    }

    /* override */
    public get value(): T {
        return (this.exists ? this._store.get(this._name) : this._defaultVal);
    }

    public remove(): void {
        this._store.remove(this._name);
    }

    public map<U>(func: (value: T) => U): ValueView<U> {
        return MappedValue.create(this, func);
    }

    /* override */
    protected updateLocal(value: T): T {
        let oldValue: T = this.value;
        this._store.set(this._name, value);
        return oldValue;
    }

    private readonly _store: StoreJsAPI;
    private readonly _name: string;
    private readonly _defaultVal: T;
}

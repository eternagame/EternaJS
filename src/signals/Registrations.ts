import Registration from './Registration';

export default class Registrations {
    /** Returns a Registration that will call the given function when disconnected */
    public static createWithFunction(f: () => void): Registration {
        return new FunctionRegistration(f);
    }

    /** Returns a Registration that does nothing. */
    public static Null(): Registration {
        if (Registrations._null == null) {
            Registrations._null = new NullRegistration();
        }
        return Registrations._null;
    }

    private static _null: NullRegistration;
}

class NullRegistration implements Registration {
    public close(): void {
    }
}

class FunctionRegistration implements Registration {
    constructor(f: () => void) {
        this._f = f;
    }

    public close(): void {
        if (this._f != null) {
            let f = this._f;
            this._f = null;
            f();
        }
    }

    private _f: (() => void) | null;
}

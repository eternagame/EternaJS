export abstract class RListener {
    public static create(f: Function): RListener {
        switch (f.length) {
        case 2: return new RListener2(f);
        case 1: return new RListener1(f);
        default: return new RListener0(f);
        }
    }

    public abstract onEmit(val: Object): void;

    public abstract onChange(val1: Object, val2: Object): void;

    protected constructor(f: Function) {
        this._f = f;
    }

    /*internal*/
    get f(): Function {
        return this._f;
    }

    protected _f: Function;
}

class RListener0 extends RListener {
    constructor(f: Function) {
        super(f);
    }

    /*override*/
    public onEmit(val: Object): void {
        this._f();
    }

    /*override*/
    public onChange(val1: Object, val2: Object): void {
        this._f();
    }
}

class RListener1 extends RListener {
    constructor(f: Function) {
        super(f);
    }

    /*override*/
    public onEmit(val: Object): void {
        this._f(val);
    }

    /*override*/
    public onChange(val1: Object, val2: Object): void {
        this._f(val1);
    }
}

class RListener2 extends RListener {
    constructor(f: Function) {
        super(f);
    }

    /*override*/
    public onEmit(val: Object): void {
        this._f(val, undefined);
    }

    /*override*/
    public onChange(val1: Object, val2: Object): void {
        this._f(val1, val2);
    }
}

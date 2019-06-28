import Constraint from "./Constraint";

export class MultistrandBindingsConstraint extends Constraint {
    public static readonly NAME = "BINDINGS";

    constructor(stateIndex: number) {
        super();
        this._stateIndex = stateIndex;
    }

    private _stateIndex: number;
}

export class OligoBoundConstraint extends Constraint {
    public static readonly NAME = "OLIGO_BOUND";

    constructor(stateIndex: number) {
        super();
        this._stateIndex = stateIndex;
    }

    private _stateIndex: number;
}

export class OligoUnboundConstraint extends Constraint {
    public static readonly NAME = "OLIGO_UNBOUND";

    constructor(stateIndex: number) {
        super();
        this._stateIndex = stateIndex;
    }

    private _stateIndex: number;
}
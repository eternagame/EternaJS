import Constraint from "./Constraint";

export default class AntiShapeConstraint extends Constraint {
    public static readonly NAME = "ANTISHAPE";

    constructor(stateIndex: number) {
        super();
        this._stateIndex = stateIndex;
    }

    private _stateIndex: number;
}
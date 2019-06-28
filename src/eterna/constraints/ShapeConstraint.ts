import Constraint from "./Constraint";

export default class ShapeConstraint extends Constraint {
    public static readonly NAME = "SHAPE";

    constructor(stateIndex: number) {
        super();
        this._stateIndex = stateIndex;
    }

    private _stateIndex: number;
}
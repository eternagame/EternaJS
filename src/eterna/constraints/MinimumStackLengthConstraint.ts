import Constraint from "./Constraint";

export default class MinimumStackLengthConstraint extends Constraint {
    public static readonly NAME = "STACK";

    constructor(count: number) {
        super();
        this._count = count;
    }

    private _count: number;
}
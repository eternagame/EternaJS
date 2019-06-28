import Constraint from "./Constraint";

export default class MaximumMutationConstraint extends Constraint {
    public static readonly NAME = "MUTATION";

    constructor(count: number) {
        super();
        this._count = count;
    }

    private _count: number;
}
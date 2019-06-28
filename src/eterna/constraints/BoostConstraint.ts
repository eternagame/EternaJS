import Constraint from "./Constraint";

class BoostConstraint extends Constraint {
    public static readonly NAME = "BOOST;"

    constructor(count: number) {
        super();
        throw new Error("BOOST constraint is unimplemented");
        this._count = count;
    }

    private _count: number;
}
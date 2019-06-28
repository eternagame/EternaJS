import Constraint from "./Constraint";
import { BaseType } from "eterna/util/RNA";

abstract class MinimumBaseConstraint extends Constraint {
    constructor(baseType: BaseType, count: number) {
        super();
        this._baseType = baseType;
        this._count = count;
    }

    private _baseType: BaseType;
    private _count: number;
}

export class MinimumAConstraint extends MinimumBaseConstraint {
    public static readonly NAME: "A";

    constructor(count: number) {
        super(BaseType.ADENINE, count)
    }
}

export class MinimumUConstraint extends MinimumBaseConstraint {
    public static readonly NAME: "U";

    constructor(count: number) {
        super(BaseType.URACIL, count)
    }
}

export class MinimumGConstraint extends MinimumBaseConstraint {
    public static readonly NAME: "G";

    constructor(count: number) {
        super(BaseType.GUANINE, count)
    }
}

export class MinimumCConstraint extends MinimumBaseConstraint {
    public static readonly NAME: "C";

    constructor(count: number) {
        super(BaseType.CYTOSINE, count)
    }
}
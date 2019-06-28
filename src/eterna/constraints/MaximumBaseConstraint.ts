import Constraint from "./Constraint";
import { BaseType } from "eterna/util/RNA";

abstract class MaximumBaseConstraint extends Constraint {
    constructor(baseType: BaseType, count: number) {
        super();
        this._baseType = baseType;
        this._count = count;
    }

    private _baseType: BaseType;
    private _count: number;
}

export class MaximumAConstraint extends MaximumBaseConstraint {
    public static readonly NAME: "AMAX";

    constructor(count: number) {
        super(BaseType.ADENINE, count)
    }
}

export class MaximumUConstraint extends MaximumBaseConstraint {
    public static readonly NAME: "UMAX";
    
    constructor(count: number) {
        super(BaseType.URACIL, count)
    }
}

export class MaximumGConstraint extends MaximumBaseConstraint {
    public static readonly NAME: "GMAX";
    
    constructor(count: number) {
        super(BaseType.GUANINE, count)
    }
}

export class MaximumCConstraint extends MaximumBaseConstraint {
    public static readonly NAME: "CMAX";
    
    constructor(count: number) {
        super(BaseType.CYTOSINE, count)
    }
}
import Constraint from "./Constraint";
import { BasePairType } from "eterna/util/RNA";

abstract class MaximumPairConstraint extends Constraint {
    constructor(pairType: BasePairType, count: number) {
        super();
        this._pairType = pairType;
        this._count = count;
    }

    private _pairType: BasePairType;
    private _count: number;
}

export class MaximumGCConstraint extends MaximumPairConstraint {
    public static readonly NAME = "GC";

    constructor(count: number) {
        super(BasePairType.GC, count);
    }
}

export class MaximumAUConstraint extends MaximumPairConstraint {
    public static readonly NAME = "AUMAX";
   
    constructor(count: number) {
        super(BasePairType.AU, count);
    }
}

export class MaximumGUConstraint extends MaximumPairConstraint {
    public static readonly NAME = "GUMAX";
    
    constructor(count: number) {
        super(BasePairType.AU, count);
    }
}
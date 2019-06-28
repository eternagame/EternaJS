import Constraint from "./Constraint";
import { BasePairType } from "eterna/util/RNA";

abstract class MinimumPairConstraint extends Constraint {
    constructor(pairType: BasePairType, count: number) {
        super();
        this._pairType = pairType;
        this._count = count;
    }

    private _pairType: BasePairType;
    private _count: number;
}

export class MinimumGCConstraint extends MinimumPairConstraint {
    public static readonly NAME = "GCMIN";
    
    constructor(count: number) {
        super(BasePairType.GC, count);
    }
}

export class MinimumAUConstraint extends MinimumPairConstraint {
    public static readonly NAME = "AU";
    
    constructor(count: number) {
        super(BasePairType.AU, count);
    }
}

export class MinimumGUConstraint extends MinimumPairConstraint {
    public static readonly NAME = "GU";
    
    constructor(count: number) {
        super(BasePairType.AU, count);
    }
}

export class MinimumAnyPairConstraint extends MinimumPairConstraint {
    public static readonly NAME = "PAIRS";

    constructor(count: number) {
        super(null, count);
    }
}
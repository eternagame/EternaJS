import Constraint from "./Constraint";
import { BaseType } from "eterna/util/RNA";

abstract class ConsecutiveBaseConstraint extends Constraint {
    constructor(baseType: BaseType, count: number) {
        super();
        this._baseType = baseType;
        this._count = count;
    }

    private _baseType: BaseType;
    private _count: number;
}

export class ConsecutiveAConstraint extends ConsecutiveBaseConstraint {
    public static readonly NAME: "CONSECUTIVE_A";
    
    constructor(count: number) {
        super(BaseType.ADENINE, count)
    }
}

export class ConsecutiveUConstraint extends ConsecutiveBaseConstraint {
    public static readonly NAME: "CONSECUTIVE_U";
    
    constructor(count: number) {
        super(BaseType.URACIL, count)
    }
}

export class ConsecutiveGConstraint extends ConsecutiveBaseConstraint {
    public static readonly NAME: "CONSECUTIVE_G";
    
    constructor(count: number) {
        super(BaseType.GUANINE, count)
    }
}

export class ConsecutiveCConstraint extends ConsecutiveBaseConstraint {
    public static readonly NAME: "CONSECUTIVE_C";
    
    constructor(count: number) {
        super(BaseType.CYTOSINE, count)
    }
}
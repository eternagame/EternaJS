export enum ConstraintType {
    SHAPE = "SHAPE",
    ANTISHAPE = "ANTISHAPE",
    SOFT = "SOFT",

    A = "A",
    U = "U",
    G = "G",
    C = "C",

    AMAX = "AMAX",
    UMAX = "UMAX",
    GMAX = "GMAX",
    CMAX = "CMAX",

    CONSECUTIVE_G = "CONSECUTIVE_G",
    CONSECUTIVE_C = "CONSECUTIVE_C",
    CONSECUTIVE_A = "CONSECUTIVE_A",

    GU = "GU",
    AU = "AU",
    GC = "GC",

    GCMIN = "GCMIN",
    NOGC = "NOGC",
    NOGU = "NOGU",
    AUMAX = "AUMAX",

    BOOST = "BOOST",
    PAIRS = "PAIRS",
    STACK = "STACK",
    MUTATION = "MUTATION",
    BINDINGS = "BINDINGS",
    BARCODE = "BARCODE",
    OLIGO_BOUND = "OLIGO_BOUND",
    OLIGO_UNBOUND = "OLIGO_UNBOUND",

    LAB_REQUIREMENTS = "LAB_REQUIREMENTS",
    SCRIPT = "SCRIPT",
}

export class Constraints {
    public static count(sequence: number[], type: number): number {
        let total: number = 0;
        for (let value of sequence) {
            if (value === type) {
                total++;
            }
        }
        return total;
    }
}

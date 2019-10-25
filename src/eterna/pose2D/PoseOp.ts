export default class PoseOp {
    public sn?: number;
    public fn: () => void;

    constructor(sn: number | null, fn: () => void) {
        this.sn = sn;
        this.fn = fn;
    }
}

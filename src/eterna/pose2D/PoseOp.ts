export default class PoseOp {
    public sn?: number;
    public fn: () => void;

    constructor(sn: number | undefined, fn: () => void) {
        this.sn = sn;
        this.fn = fn;
    }
}

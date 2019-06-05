export default class PoseOp {
    public sn?: number;
    public fn: () => void;

    public constructor(sn: number | null, fn: () => void) {
        this.sn = sn;
        this.fn = fn;
    }
}

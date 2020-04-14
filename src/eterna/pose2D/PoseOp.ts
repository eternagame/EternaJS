export default class PoseOp {
    public sn?: number;
    public fn: () => void;

    constructor(sn: number | null, fn: () => void) {
        if (!sn) {
            this.sn = undefined;
        } else {
            this.sn = sn;
        }
        this.fn = fn;
    }
}

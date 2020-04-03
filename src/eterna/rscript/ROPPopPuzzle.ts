import RScriptOp from './RScriptOp';
import RSignals from './RSignals';

export default class ROPPopPuzzle extends RScriptOp {
    constructor() {
        // tslint:disable-next-line
        super({} as any);
    }

    public exec(): void {
        RSignals.popPuzzle.emit();
    }
}

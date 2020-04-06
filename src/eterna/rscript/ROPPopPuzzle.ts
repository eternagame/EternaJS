import RScriptOp from './RScriptOp';
import RSignals from './RSignals';
import RScriptEnv from './RScriptEnv';

export default class ROPPopPuzzle extends RScriptOp {

    constructor(env: RScriptEnv) {
        super(env);
    }

    public exec(): void {
        RSignals.popPuzzle.emit();
    }
}

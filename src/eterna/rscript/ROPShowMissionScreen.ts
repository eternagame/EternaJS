import RScriptOp from './RScriptOp';
import RScriptEnv from './RScriptEnv';

export default class ROPShowMissionScreen extends RScriptOp {
    constructor(env: RScriptEnv) {
        super(env);
    }

    public exec(): void {
        this._env.ui.showMissionScreen(true);
    }
}

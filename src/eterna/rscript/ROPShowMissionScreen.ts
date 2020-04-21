import RScriptOp from './RScriptOp';
import RScriptEnv from './RScriptEnv';

export default class ROPShowMissionScreen extends RScriptOp {
    // eslint-disable-next-line no-useless-constructor
    constructor(env: RScriptEnv) {
        super(env);
    }

    public exec(): void {
        this._env.ui.showMissionScreen(true);
    }
}

import RScriptOp from './RScriptOp';
import RScriptEnv from './RScriptEnv';

export default class ROPShowMissionScreen extends RScriptOp {
    private _show: boolean;

    constructor(show: boolean, env: RScriptEnv) {
        super(env);
        this._show = show;
    }

    public exec(): void {
        this._env.ui.showMissionScreen(this._show);
    }
}

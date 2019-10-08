import RScriptEnv from './RScriptEnv';
import RScriptOp from './RScriptOp';

export default class ROPUI extends RScriptOp {
    constructor(env: RScriptEnv, isVisible: boolean, isDisabled: boolean) {
        super(env);
        this._visible = isVisible;
        this._disabled = isDisabled;
    }

    /* override */
    public exec(): void {
        this._env.showHideUI(this._elementID, this._visible, this._disabled);
    }

    /* override */
    protected parseArgument(arg: string, i: number): void {
        if (i > 0) {
            throw new Error(`Invalid number of arguments for ROP UI: ${i}`);
        }
        this._elementID = arg;
    }

    private readonly _visible: boolean;
    private readonly _disabled: boolean;

    private _elementID: string;
}

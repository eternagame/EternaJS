import {RScriptOp} from "./RScriptOp";
import {RScriptEnv} from "./RScriptEnv";

export class ROPUI extends RScriptOp {
    constructor(env: RScriptEnv, isVisible: boolean, isDisabled: boolean) {
        super(env);
        this._op_visible = isVisible;
        this._op_disabled = isDisabled;
    }

    /*override*/
    public exec(): void {
        this._env.ShowHideUI(this._element_id, this._op_visible, this._op_disabled);
    }

    /*override*/
    protected ParseArgument(arg: string, i: number): void {
        if (i > 0) {
            throw new Error("Invalid number of arguments for ROP UI: " + i);
        }
        this._element_id = arg;
    }

    private readonly _op_visible: boolean;
    private readonly _op_disabled: boolean;

    private _element_id: string;
}

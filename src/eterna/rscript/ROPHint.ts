import {Point} from "pixi.js";
import {NovaPaintHint} from "./NovaPaintHint";
import {RScriptEnv} from "./RScriptEnv";
import {RScriptOp} from "./RScriptOp";

export class ROPHint extends RScriptOp {
    public constructor(isVisible: boolean, env: RScriptEnv) {
        super(env);
        this._op_visible = isVisible;
    }

    /* override */
    public InitializeROP(op: string, args: string): void {
        super.InitializeROP(op, args);
        this._id = ROPHint.ProcessId(this._id);
    }

    /* override */
    public exec(): void {
        // Remove hint with ID.
        if (this._env.Exists(this._id)) {
            this._env.DeleteVar(this._id);
        }

        if (!this._op_visible) {
            return;
        }

        let startPoint: Point = this._env.GetRNA().getBaseXY(this._start_idx);
        let endPoint: Point = this._env.GetRNA().getBaseXY(this._end_idx);

        let hint: NovaPaintHint = new NovaPaintHint(startPoint, endPoint, this._loop);
        hint.set_anchor_nucleotide(this._env.GetRNA(), this._start_idx);
        hint.InitializeHint();
        this._env.GetUI().addObject(hint, this._env.GetUI().container);
        this._env.StoreVar(this._id, hint, this._env.GetUI());
    }

    /* override */
    protected ParseArgument(arg: string, i: number): void {
        switch (i) {
        case 0:
            if (!this._op_visible) {
                this._id = this._env.GetStringRef(arg);
            } else {
                this._start_idx = Number(arg) - 1;
            }
            break;
        case 1:
            this._end_idx = Number(arg);
            break;
        case 2:
            this._id = this._env.GetStringRef(arg);
            break;
        case 3:
            this._loop = (arg.toUpperCase() === "TRUE");
            break;
        default:
            throw (`Invalid argument to ROPHint: ${arg}`);
        }
    }

    private static ProcessId(inId: string): string {
        if (!inId) return ROPHint.id_postfix;
        return inId + ROPHint.id_postfix;
    }

    private readonly _op_visible: boolean;
    private _id: string = "";
    private _start_idx: number = 0;
    private _end_idx: number = 0;
    private _loop: boolean;

    private static readonly id_postfix: string = "_hint_";
}

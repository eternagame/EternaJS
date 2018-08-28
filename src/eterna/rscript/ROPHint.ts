import {Point} from "pixi.js";
import {NovaPaintHint} from "./NovaPaintHint";
import {RScriptEnv} from "./RScriptEnv";
import {RScriptOp} from "./RScriptOp";

export class ROPHint extends RScriptOp {
    public constructor(isVisible: boolean, env: RScriptEnv) {
        super(env);
        this._opVisible = isVisible;
    }

    /* override */
    public initialize(op: string, args: string): void {
        super.initialize(op, args);
        this._id = ROPHint.processId(this._id);
    }

    /* override */
    public exec(): void {
        // Remove hint with ID.
        if (this._env.Exists(this._id)) {
            this._env.DeleteVar(this._id);
        }

        if (!this._opVisible) {
            return;
        }

        let startPoint: Point = this._env.GetRNA().getBaseXY(this._startIdx);
        let endPoint: Point = this._env.GetRNA().getBaseXY(this._endIdx);

        let hint: NovaPaintHint = new NovaPaintHint(startPoint, endPoint, this._loop);
        hint.setAnchorNucleotide(this._env.GetRNA(), this._startIdx);
        hint.initialize();
        this._env.GetUI().addObject(hint, this._env.GetUI().container);
        this._env.StoreVar(this._id, hint, this._env.GetUI());
    }

    /* override */
    protected parseArgument(arg: string, i: number): void {
        switch (i) {
        case 0:
            if (!this._opVisible) {
                this._id = this._env.GetStringRef(arg);
            } else {
                this._startIdx = Number(arg) - 1;
            }
            break;
        case 1:
            this._endIdx = Number(arg);
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

    private static processId(inId: string): string {
        return inId ? inId + ROPHint.id_postfix : ROPHint.id_postfix;
    }

    private readonly _opVisible: boolean;
    private _id: string = "";
    private _startIdx: number = 0;
    private _endIdx: number = 0;
    private _loop: boolean;

    private static readonly id_postfix: string = "_hint_";
}

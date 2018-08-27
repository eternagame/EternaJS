import {MathUtil} from "../../flashbang/util/MathUtil";
import {PoseEditMode} from "../mode/PoseEdit/PoseEditMode";
import {StringToPaletteTargetType} from "../ui/NucleotidePalette";
import {RScriptEnv} from "./RScriptEnv";
import {RScriptOp} from "./RScriptOp";

export enum ROPRNAType {
    SETBASE = "SETBASE",
    CHANGEMODE = "CHANGEMODE",
    ENABLEMODIFICATION = "ENABLEMODIFICATION",
    SETPAINTER = "SETPAINTER",
    CHANGESTATE = "CHANGESTATE",
    SETZOOM = "SETZOOM",
    SETPIP = "SETPIP",
}

export class ROPRNA extends RScriptOp {
    constructor(type: ROPRNAType, env: RScriptEnv) {
        super(env);
        this._type = type;
    }

    /* override */
    public exec(): void {
        if (this._type === ROPRNAType.SETBASE) {
            this._env.GetRNA().set_base_color(this._nuc_idx,
                RScriptEnv.ConvertNucleotideStringToInt(this._color));
        } else if (this._type === ROPRNAType.CHANGEMODE) {
            if (this._fold_mode === 0) {
                this._env.GetUI().ropSetToNativeMode();
            } else {
                this._env.GetUI().rop_set_to_target_mode();
            }
        } else if (this._type === ROPRNAType.ENABLEMODIFICATION) {
            this._env.GetRNA().force_editable(this._enabled, this._scope);
        } else if (this._type === ROPRNAType.SETPAINTER) {
            let ui: PoseEditMode = this._env.GetUI();
            if (this._color === "SWAP") {
                ui.toolbar.pair_swap_button.click();
            } else {
                let paletteTargetType = StringToPaletteTargetType(this._color);
                if (paletteTargetType != null) {
                    ui.toolbar.palette.clickTarget(paletteTargetType);
                }
            }
        } else if (this._type === ROPRNAType.CHANGESTATE) {
            this._env.GetUI().rop_change_target(this._state);
        } else if (this._type === ROPRNAType.SETZOOM) {
            this._env.GetRNA().set_zoom_level(this._zoom_level, this._animate, this._center);
        } else if (this._type === ROPRNAType.SETPIP) {
            this._env.GetUI().rop_set_pip(this._enabled);
        }
    }

    /* override */
    protected ParseArgument(arg: string, i: number): void {
        switch (i) {
        case 0: // Nucleotide index when changing nucleotide color. Fold mode in Mode 1.
            if (this._type === ROPRNAType.SETBASE) {
                this._nuc_idx = Number(arg) - 1;
            } else if (this._type === ROPRNAType.CHANGEMODE) {
                this._fold_mode = Number(arg);
            } else if (this._type === ROPRNAType.ENABLEMODIFICATION || this._type === ROPRNAType.SETPIP) {
                this._enabled = (arg.toUpperCase() === "TRUE");
            } else if (this._type === ROPRNAType.SETPAINTER) {
                this._color = this._env.GetStringRef(arg);
            } else if (this._type === ROPRNAType.CHANGESTATE) {
                this._state = Number(arg) - 1;
            } else if (this._type === ROPRNAType.SETZOOM) {
                this._zoom_level = MathUtil.clamp(Number(arg), 0, 4);
            }
            break;
        case 1:
            if (this._type === ROPRNAType.SETBASE) {
                this._color = this._env.GetStringRef(arg);
            } else if (this._type === ROPRNAType.ENABLEMODIFICATION) {
                this._scope = [];
                this._scope.push(Number(arg) - 1);
            } else if (this._type === ROPRNAType.SETZOOM) {
                this._animate = (arg.toUpperCase() === "TRUE");
            }
            break;
        default:
            if (this._type === ROPRNAType.ENABLEMODIFICATION) {
                this._scope.push(Number(arg) - 1);
            } else if (this._type === ROPRNAType.SETZOOM) {
                this._center = (arg.toUpperCase() === "TRUE");
            } else {
                throw new Error(`Invalid argument for ROP: RNA -- ${this._env.GetStringRef(arg)}`);
            }
            break;
        }
    }

    private readonly _type: ROPRNAType;

    private _nuc_idx: number = 0;
    private _color: string;
    private _fold_mode: number;
    private _enabled: boolean;
    private _scope: number[] = null;
    private _state: number;
    private _zoom_level: number;
    private _animate: boolean = true;
    private _center: boolean = false;
}

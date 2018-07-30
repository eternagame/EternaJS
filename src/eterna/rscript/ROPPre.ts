import {RScriptEnv} from "./RScriptEnv";
import {RScriptOp} from "./RScriptOp";

export class ROPPre extends RScriptOp {
    constructor(command: string, env: RScriptEnv) {
        super(env);
        this._type = null;

        const disMissionScreenRegex: RegExp = /DisableMissionScreen/ig;
        const altPaletteRegex: RegExp = /UseAlternatePalette/ig;
        const disableHintRegex: RegExp = /DisableHintSystem/ig;
        const hideObjRegex: RegExp = /HideObjectives/ig;
        const hideUIRegex: RegExp = /(Hide|Show|Disable|Enable)UI/ig;
        const disableRNAMod: RegExp = /(DisableRNAModification)/ig;
        const modeRegex: RegExp = /^(Native|Target)Mode$/ig;

        let regResult: RegExpExecArray;
        if ((regResult = disMissionScreenRegex.exec(command)) != null) {
            this._type = ROPPreType.DISABLE_MISSION_SCREEN;
        } else if ((regResult = altPaletteRegex.exec(command)) != null) {
            this._type = ROPPreType.USE_ALTERNATE_PALETTE;
        } else if ((regResult = disableHintRegex.exec(command)) != null) {
            this._type = ROPPreType.DISABLE_HINTS;
        } else if ((regResult = hideObjRegex.exec(command)) != null) {
            this._type = ROPPreType.DISABLE_OBJECTIVES;
        } else if ((regResult = hideUIRegex.exec(command)) != null) {
            this._type = ROPPreType.DISABLE_UI_ELEMENT;
            this._doVisible = (regResult[1].toUpperCase() != "HIDE");
            this._doDisable = (regResult[1].toUpperCase() == "DISABLE");
        } else if ((regResult = disableRNAMod.exec(command))) {
            this._type = ROPPreType.DISABLE_RNA_CHANGE;
        } else if ((regResult = modeRegex.exec(command)) != null) {
            this._type = ROPPreType.SET_DEFAULT_FOLD_MODE;
            this._fold_mode = (regResult[1].toUpperCase() == "NATIVE" ? "NATIVE" : "TARGET");
        }
    }

    public InitArgs(args: string): void {
        this._allArgs = args.split(",");
        for (let i: number = 0; i < this._allArgs.length; ++i) {
            this._allArgs[i] = this._allArgs[i].replace(/^\s*/, "");
            this._allArgs[i] = this._allArgs[i].replace(/\s*$/, "");
        }
    }

    /*override*/
    public exec(): void {
        switch (this._type) {
        case ROPPreType.DISABLE_MISSION_SCREEN:
            this._env.GetUI().set_show_mission_screen(false);
            break;
        case ROPPreType.USE_ALTERNATE_PALETTE:
            this._env.GetUI().toolbar.palette.set_override_no_pair();
            this._env.GetUI().toolbar.palette.change_no_pair_mode();
            break;
        case ROPPreType.DISABLE_HINTS:
            //_env.GetUI().remove_hint_system(true);
            break;
        case ROPPreType.DISABLE_OBJECTIVES:
            this._env.GetUI().set_show_constraints(false);
            break;
        case ROPPreType.DISABLE_UI_ELEMENT:
            for (let i: number = 0; i < this._allArgs.length; ++i) {
                if (this._allArgs[i].toUpperCase() == "ENERGY") {
                    this._env.GetUI().rop_set_display_score_texts(this._doVisible);
                    continue;
                }
                if (this._allArgs[i].toUpperCase() == "BASENUMBERING") {
                    this._env.GetUI().rop_set_show_numbering(this._doVisible);
                    continue;
                }
                if (this._allArgs[i].toUpperCase() == "TOTALENERGY") {
                    this._env.GetUI().rop_set_show_total_energy(this._doVisible);
                    continue;
                }
                this._env.ShowHideUI(this._allArgs[i], this._doVisible, this._doDisable);
                if (!this._doVisible) {
                    if (this._allArgs[i].toUpperCase() == "OBJECTIVES") {
                        this._env.GetUI().set_show_constraints(false);
                    }
                }
            }
            break;
        case ROPPreType.DISABLE_RNA_CHANGE:
            // no-op. What was this for?
            break;
        case ROPPreType.SET_DEFAULT_FOLD_MODE:
            this._env.GetPuzzle().set_default_mode(this._fold_mode);
            break;
        default:
            throw new Error("Invalid Preprocessing Command: " + this._type);
        }
    }

    private readonly _type: ROPPreType;
    private readonly _doVisible: boolean;
    private readonly _doDisable: boolean;
    private readonly _fold_mode: string;
    private _allArgs: string[];
}

enum ROPPreType {
    DISABLE_MISSION_SCREEN = "DISABLE_MISSION_SCREEN",
    USE_ALTERNATE_PALETTE = "USE_ALTERNATE_PALETTE",
    DISABLE_HINTS = "DISABLE_HINTS",
    DISABLE_OBJECTIVES = "DISABLE_OBJECTIVES",
    DISABLE_UI_ELEMENT = "DISABLE_UI_ELEMENT",
    DISABLE_RNA_CHANGE = "DISABLE_RNA_CHANGE",
    SET_DEFAULT_FOLD_MODE = "SET_DEFAULT_FOLD_MODE",
}

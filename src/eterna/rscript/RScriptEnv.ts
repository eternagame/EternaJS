import * as log from "loglevel";
import {GameObject} from "../../flashbang/core/GameObject";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {EPars} from "../EPars";
import {PoseEditMode} from "../mode/PoseEdit/PoseEditMode";
import {Pose2D} from "../pose2D/Pose2D";
import {Puzzle} from "../puzzle/Puzzle";
import {TextBalloon} from "../ui/TextBalloon";

export enum UIElementType {
    ACTION_MENU = "ACTION_MENU",
    OBJECTIVES = "OBJECTIVES",
    SHAPEOBJECTIVE = "SHAPEOBJECTIVE",
    OBJECTIVE = "OBJECTIVE-",
    SWITCH = "SWITCH",
    TOTALENERGY = "TOTALENERGY",
    PRIMARY_ENERGY = "PRIMARY_ENERGY",
    SECONDARY_ENERGY = "SECONDARY_ENERGY",
    PALETTE = "PALETTE",
    PALETTEALT = "PALETTEALT",
    TOGGLENATURAL = "TOGGLENATURAL",
    TOGGLETARGET = "TOGGLETARGET",
    TOGGLEBAR = "TOGGLEBAR",
    ZOOMIN = "ZOOMIN",
    ZOOMOUT = "ZOOMOUT",
    ACTIONBAR = "ACTIONBAR",
    RESET = "RESET",
    UNDO = "UNDO",
    REDO = "REDO",
    SWAP = "SWAP",
    PIP = "PIP",
    A = "A",
    U = "U",
    G = "G",
    C = "C",
    AU = "AU",
    UA = "UA",
    AUCOMPLETE = "AUCOMPLETE",
    UACOMPLETE = "UACOMPLETE",
    GU = "GU",
    UG = "UG",
    GUCOMPLETE = "GUCOMPLETE",
    UGCOMPLETE = "UGCOMPLETE",
    GC = "GC",
    CG = "CG",
    GCCOMPLETE = "GCCOMPLETE",
    CGCOMPLETE = "CGCOMPLETE",
}

/**
 * RScript Environment.
 * Can take care of variables and scope and such.
 */
export class RScriptEnv extends ContainerObject {
    public static ConvertNucleotideStringToInt(s: string): number {
        return EPars.stringToNucleotide(s, true, false);
    }

    public static ConvertNucleotideIntToString(i: number): string {
        return EPars.nucleotideToString(i, true, false);
    }

    public constructor(ui: PoseEditMode, puz: Puzzle) {
        super();
        this._ui = ui;
        this._puz = puz;
        this._mapping = new Map();
    }

    public SetTextboxVisible(id: string, isVisible: boolean): void {
        if (id == "" || !this._mapping.hasOwnProperty("id")) {
            return;
        }

        let textBox: TextBalloon = this.GetVar(id);
        textBox.display.visible = isVisible;
    }

    /** Generate string reference name. */
    public GenerateStringRefName(): string {
        // Strings will be referenced via $$STRING_REF:ID_HERE
        ++this._string_count;
        return "$$STRING_REF:" + this._string_count.toString();
    }

    public GetStringRef(ref: string): string {
        // Check if it's an actual ref.
        // If it's not, return it back unchanged
        if (ref.indexOf("$$STRING_REF:") != 0) {
            return ref;
        } else {
            return this.GetVar(ref);
        }
    }

    /** Remove all stored highlights and hints and stuff. */
    public Cleanup(): void {
        for (let key in this._mapping) {
            this.DeleteVar(key);
        }
    }

    public GetUI(): PoseEditMode {
        return this._ui;
    }

    public GetPuzzle(): Puzzle {
        return this._puz;
    }

    public GetRNA(): Pose2D {
        return this._ui.get_pose(0);
    }

    // Handles parsing the element ID and getting the right object.
    // Returns: UI Element, its UI ID, and the alternate parameter (integer) that may
    // 	have been passed in.
    public GetUIElementFromId(key: string): any[] {
        // Highlight UI.
        let obj: any;

        // Used UI Element ID.
        let splitId: string[] = key.split("-");

        // Detect a number if it is included in the ui element key.
        // So for the objectives: objective-### (format).
        // The input number will always come after the dash. The dash should be
        // included in the key that is passed.
        let usable_id: string = splitId[0] + (splitId.length > 1 ? "-" : "");

        if (splitId.length > 2) {
            throw new Error("Invalid UI Element ID format");
        }

        let altParam: number = -1;
        if (splitId.length > 1) {
            altParam = Number(splitId[1]);
            obj = this.GetUIElement(usable_id, altParam);
        } else {
            obj = this.GetUIElement(usable_id);
        }
        return [obj, usable_id, altParam];
    }

    public GetTotalConstraints(): number {
        return this.GetUI().get_constraint_count();
    }

    public ShowHideUI(elementID: string, visible: boolean, disabled: boolean): void {
        if (elementID.toUpperCase() == "ENERGY") {
            this.GetUI().set_display_score_texts(visible);
            return;
        } else if (elementID.toUpperCase() == "BASENUMBERING") {
            this.GetUI().set_show_numbering(visible);
            return;
        } else if (elementID.toUpperCase() == "TOTALENERGY") {
            this.GetUI().set_show_total_energy(visible);
            return;
        } else if (elementID.toUpperCase() == "HINT") {
            // no-op
            return;
        } else if (elementID.toUpperCase() == "TOGGLEBAR") {
            this.ShowHideUI("TOGGLETARGET", visible, disabled);
            this.ShowHideUI("TOGGLENATURAL", visible, disabled);
            return;
        } else if (elementID.toUpperCase() == "SWITCH") {
            this.GetUIElementFromId(elementID)[0].visible = visible;
            return;
        }

        log.debug("TODO: ShowHideUI");

        if (visible) {
            if (elementID.toUpperCase() == "PALETTE") {
                this.GetUI().toolbar.palette.set_override_default();
                this.GetUI().toolbar.palette.change_default_mode();
            } else if (elementID.toUpperCase() == "PALETTEALT") {
                this.GetUI().toolbar.palette.set_override_no_pair();
                this.GetUI().toolbar.palette.change_no_pair_mode();
            }
        }

        // let obj: GameObject = this.GetUIElementFromId(elementID)[0];
        // obj.override_visible(true, visible);
        // RScriptEnv.SetUIVisible(obj, visible);
        // if (visible) {
        //     if (obj.hasOwnProperty("set_disabled")) {
        //         if (obj instanceof GameButton) {
        //             GameButton(obj).override_disable(true, disabled);
        //             GameButton(obj).set_disabled(disabled);
        //         }
        //         obj.set_disabled(disabled);
        //     }
        // }
    }

    public GetUIElement(key: string, i: number = -1): any {
        log.debug("TODO: GetUIElement");
        return undefined;
        // let type: UIElementType = key.toUpperCase() as UIElementType;
        // switch (type) {
        // case UIElementType.ACTION_MENU:
        //     return this.GetUI().get_action_menu();
        // case UIElementType.OBJECTIVES:
        //     return this.GetUI().get_constraint_container();
        // case UIElementType.SHAPEOBJECTIVE:
        //     return this.GetUI().get_shape_box(0);
        // case UIElementType.OBJECTIVE:
        //     return this.GetUI().get_constraint(i);
        // case UIElementType.SWITCH:
        //     return this.GetUI().get_switch_bar();
        // case UIElementType.TOTALENERGY:
        // case UIElementType.PRIMARY_ENERGY:
        //     return this.GetRNA().get_primary_score_display();
        // case UIElementType.SECONDARY_ENERGY:
        //     return this.GetRNA().get_secondary_score_display();
        // case UIElementType.PALETTE:
        // case UIElementType.PALETTEALT:
        //     return this.GetUI().toolbar.palette;
        // case UIElementType.TOGGLENATURAL:
        //     return this.GetUI().get_native_button();
        // case UIElementType.TOGGLETARGET:
        //     return this.GetUI().get_target_button();
        // case UIElementType.TOGGLEBAR:
        //     // NOTE: There is no longer a toggle bar...
        //     return this.GetUI().get_native_button();
        // case UIElementType.ZOOMIN:
        //     return this.GetUI().get_zoom_in_button();
        // case UIElementType.ZOOMOUT:
        //     return this.GetUI().get_zoom_out_button();
        // case UIElementType.ACTIONBAR:
        //     // NOTE: There is no longer an action bar...
        //     return this.GetUI().get_zoom_in_button();
        // case UIElementType.RESET:
        //     return this.GetUI().get_retry_button();
        // case UIElementType.UNDO:
        //     return this.GetUI().get_undo_button();
        // case UIElementType.REDO:
        //     return this.GetUI().get_redo_button();
        // case UIElementType.SWAP:
        //     return this.GetUI().get_swap_button();
        // case UIElementType.PIP:
        //     return this.GetUI().get_pip_button();
        // case UIElementType.A:
        //     return this.GetUI().toolbar.palette.a_box;
        // case UIElementType.U:
        //     return this.GetUI().toolbar.palette.u_box;
        // case UIElementType.G:
        //     return this.GetUI().toolbar.palette.g_box;
        // case UIElementType.C:
        //     return this.GetUI().toolbar.palette.c_box;
        // case UIElementType.AU:
        // case UIElementType.UA:
        // case UIElementType.AUCOMPLETE:
        // case UIElementType.UACOMPLETE:
        //     return this.GetUI().toolbar.palette.au_box;
        // case UIElementType.GU:
        // case UIElementType.UG:
        // case UIElementType.GUCOMPLETE:
        // case UIElementType.UGCOMPLETE:
        //     return this.GetUI().toolbar.palette.ug_box;
        // case UIElementType.GC:
        // case UIElementType.CG:
        // case UIElementType.GCCOMPLETE:
        // case UIElementType.CGCOMPLETE:
        //     return this.GetUI().toolbar.palette.gc_box;
        // default:
        //     throw new Error("Invalid UI Element: " + key);
        // }
    }

    public StoreVar(key: string, inValue: any, parent: any): void {
        this._mapping.set(key, {val: inValue, par: parent});
    }

    public GetVar(key: string): any {
        let scriptVar = this._mapping.get(key);
        return scriptVar != null ? scriptVar.val : null;
    }

    public DeleteVar(key: string, actualDelete: boolean = true): void {
        let scriptVar = this._mapping.get(key);
        if (scriptVar == null) {
            return;
        }

        // Make sure it's removed
        if (scriptVar.par && scriptVar.val instanceof GameObject) {
            scriptVar.par.remove_object(scriptVar.val);
        }

        if (actualDelete) {
            this._mapping.delete(key);
        }
    }

    public Exists(key: string): boolean {
        return this._mapping.has(key);
    }

    private readonly _ui: PoseEditMode;
    private readonly _puz: Puzzle;
    private readonly _mapping: Map<string, ScriptVar>;

    private _string_count: number = 0;
}

interface ScriptVar {
    val: any;
    par: any;
}

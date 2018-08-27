import * as log from "loglevel";
import {Container, DisplayObject} from "pixi.js";
import {GameObject} from "../../flashbang/core/GameObject";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {Enableable} from "../../flashbang/objects/Enableable";
import {EPars} from "../EPars";
import {PoseEditMode} from "../mode/PoseEdit/PoseEditMode";
import {Pose2D, RNAHighlightState} from "../pose2D/Pose2D";
import {Puzzle} from "../puzzle/Puzzle";
import {PaletteTargetType} from "../ui/NucleotidePalette";
import {TextBalloon} from "../ui/TextBalloon";
import {ToggleBar} from "../ui/ToggleBar";
import {RScriptUIElement, RScriptUIElementID} from "./RScriptUIElement";

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
        if (id === "" || !this._mapping.hasOwnProperty("id")) {
            return;
        }

        let value = this.GetVar(id);
        if (value instanceof TextBalloon) {
            value.display.visible = isVisible;
        } else {
            log.warn(`'${id}' is not a Textbox`);
        }
    }

    /** Generate string reference name. */
    public GenerateStringRefName(): string {
        // Strings will be referenced via $$STRING_REF:ID_HERE
        ++this._string_count;
        return `$$STRING_REF:${this._string_count}`;
    }

    public GetStringRef(ref: string): string {
        // Check if it's an actual ref.
        // If it's not, return it back unchanged
        if (ref.indexOf("$$STRING_REF:") !== 0) {
            return ref;
        } else {
            let value = this.GetVar(ref);
            if (typeof (value) === "string") {
                return value;
            } else {
                log.warn(`'${ref}' is not a string`);
                return ref;
            }
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
        return this._ui.getPose(0);
    }

    // Handles parsing the element ID and getting the right object.
    // Returns: UI Element, its UI ID, and the alternate parameter (integer) that may
    //  have been passed in.
    public GetUIElementFromId(key: string): [RScriptUIElement, RScriptUIElementID, number] {
        // Highlight UI.
        let uiElement: RScriptUIElement;

        // Used UI Element ID.
        let splitId: string[] = key.split("-");

        // Detect a number if it is included in the ui element key.
        // So for the objectives: objective-### (format).
        // The input number will always come after the dash. The dash should be
        // included in the key that is passed.
        let idString: string = splitId[0] + (splitId.length > 1 ? "-" : "");
        let elementID: RScriptUIElementID = (idString.toUpperCase()) as RScriptUIElementID;

        if (splitId.length > 2) {
            throw new Error("Invalid UI Element ID format");
        }

        let altParam: number = -1;
        if (splitId.length > 1) {
            altParam = Math.floor(Number(splitId[1]));
            if (Number.isNaN(altParam)) {
                // If splitId[1] is malformed, altParam will be NaN.
                // The Flash version of the game interprets this as a 0,
                // and some tutorials rely on this behavior. (E.g. tutorial level 2 references "Objective-#0", rather
                // than "Objective-0"). Ideally we'd throw an error here, but that would break puzzles in the wild.
                log.warn(`Malformed UIElementID '${key}'`);
                altParam = 0;
            }
            uiElement = this.GetUIElement(elementID, altParam);
        } else {
            uiElement = this.GetUIElement(elementID);
        }
        return [uiElement, elementID, altParam];
    }

    public GetTotalConstraints(): number {
        return this.GetUI().constraintCount;
    }

    public ShowHideUI(elementID: string, visible: boolean, disabled: boolean): void {
        elementID = elementID.toUpperCase();

        if (elementID === RScriptUIElementID.ENERGY) {
            this.GetUI().setDisplayScoreTexts(visible);
        } else if (elementID === RScriptUIElementID.BASENUMBERING) {
            this.GetUI().setShowNumbering(visible);
        } else if (elementID === RScriptUIElementID.TOTALENERGY) {
            this.GetUI().setShowTotalEnergy(visible);
        } else if (elementID === RScriptUIElementID.HINT) {
            // no-op
        } else if (elementID === RScriptUIElementID.TOGGLEBAR) {
            this.ShowHideUI(RScriptUIElementID.TOGGLETARGET, visible, disabled);
            this.ShowHideUI(RScriptUIElementID.TOGGLENATURAL, visible, disabled);
        } else if (elementID === RScriptUIElementID.SWITCH) {
            (this.GetUIElementFromId(elementID)[0] as ToggleBar).display.visible = visible;
        } else {
            if (visible && elementID === RScriptUIElementID.PALETTE) {
                this.GetUI().toolbar.palette.set_override_default();
                this.GetUI().toolbar.palette.change_default_mode();
            } else if (visible && elementID === RScriptUIElementID.PALETTEALT) {
                this.GetUI().toolbar.palette.set_override_no_pair();
                this.GetUI().toolbar.palette.change_no_pair_mode();
            }

            let obj: RScriptUIElement = this.GetUIElementFromId(elementID)[0];
            if (obj instanceof DisplayObject) {
                obj.visible = visible;
            } else if (obj instanceof GameObject && obj.display != null) {
                obj.display.visible = visible;
            }

            if ((<Enableable>(obj as any)).enabled !== undefined) {
                (<Enableable>(obj as any)).enabled = visible && !disabled;
            }
        }
    }

    public GetUIElement(type: RScriptUIElementID, i: number = -1): RScriptUIElement {
        switch (type) {
        case RScriptUIElementID.ACTION_MENU:
            return this.GetUI().toolbar.actionMenu;
        case RScriptUIElementID.OBJECTIVES:
            return this.GetUI().constraintsLayer;
        case RScriptUIElementID.SHAPEOBJECTIVE:
            return this.GetUI().get_shape_box(0);
        case RScriptUIElementID.OBJECTIVE:
            return this.GetUI().getConstraint(i);
        case RScriptUIElementID.SWITCH:
            return this.GetUI().toolbar.puzzleStateToggle;
        case RScriptUIElementID.TOTALENERGY:
        case RScriptUIElementID.PRIMARY_ENERGY:
            return this.GetRNA().get_primary_score_display();
        case RScriptUIElementID.SECONDARY_ENERGY:
            return this.GetRNA().get_secondary_score_display();
        case RScriptUIElementID.PALETTE:
        case RScriptUIElementID.PALETTEALT:
            return this.GetUI().toolbar.palette;
        case RScriptUIElementID.TOGGLENATURAL:
            return this.GetUI().toolbar.native_button;
        case RScriptUIElementID.TOGGLETARGET:
            return this.GetUI().toolbar.target_button;
        case RScriptUIElementID.TOGGLEBAR:
            // NOTE: There is no longer a toggle bar...
            return this.GetUI().toolbar.native_button;
        case RScriptUIElementID.ZOOMIN:
            return this.GetUI().toolbar.zoom_in_button;
        case RScriptUIElementID.ZOOMOUT:
            return this.GetUI().toolbar.zoom_out_button;
        case RScriptUIElementID.ACTIONBAR:
            // NOTE: There is no longer an action bar...
            return this.GetUI().toolbar.zoom_in_button;
        case RScriptUIElementID.RESET:
            return this.GetUI().toolbar.retry_button;
        case RScriptUIElementID.UNDO:
            return this.GetUI().toolbar.undo_button;
        case RScriptUIElementID.REDO:
            return this.GetUI().toolbar.redo_button;
        case RScriptUIElementID.SWAP:
            return this.GetUI().toolbar.pair_swap_button;
        case RScriptUIElementID.PIP:
            return this.GetUI().toolbar.pip_button;
        case RScriptUIElementID.A:
            return this.GetUI().toolbar.palette.getTarget(PaletteTargetType.A);
        case RScriptUIElementID.U:
            return this.GetUI().toolbar.palette.getTarget(PaletteTargetType.U);
        case RScriptUIElementID.G:
            return this.GetUI().toolbar.palette.getTarget(PaletteTargetType.G);
        case RScriptUIElementID.C:
            return this.GetUI().toolbar.palette.getTarget(PaletteTargetType.C);
        case RScriptUIElementID.AU:
        case RScriptUIElementID.UA:
        case RScriptUIElementID.AUCOMPLETE:
        case RScriptUIElementID.UACOMPLETE:
            return this.GetUI().toolbar.palette.getTarget(PaletteTargetType.AU);
        case RScriptUIElementID.GU:
        case RScriptUIElementID.UG:
        case RScriptUIElementID.GUCOMPLETE:
        case RScriptUIElementID.UGCOMPLETE:
            return this.GetUI().toolbar.palette.getTarget(PaletteTargetType.UG);
        case RScriptUIElementID.GC:
        case RScriptUIElementID.CG:
        case RScriptUIElementID.GCCOMPLETE:
        case RScriptUIElementID.CGCOMPLETE:
            return this.GetUI().toolbar.palette.getTarget(PaletteTargetType.GC);
        default:
            throw new Error(`Invalid UI Element: ${type}`);
        }
    }

    public StoreVar(key: string, inValue: RScriptVarType, parent: any): void {
        this._mapping.set(key, {val: inValue, par: parent});
    }

    public GetVar(key: string): RScriptVarType {
        let scriptVar = this._mapping.get(key);
        return scriptVar != null ? scriptVar.val : null;
    }

    public DeleteVar(key: string): void {
        let scriptVar = this._mapping.get(key);
        if (scriptVar == null) {
            return;
        }

        // Make sure it's removed
        if (scriptVar.val instanceof GameObject) {
            scriptVar.val.destroySelf();
        } else if (scriptVar.val instanceof Container) {
            scriptVar.val.destroy({children: true});
        } else if (scriptVar.val instanceof DisplayObject) {
            scriptVar.val.destroy();
        }

        this._mapping.delete(key);
    }

    public Exists(key: string): boolean {
        return this._mapping.has(key);
    }

    private readonly _ui: PoseEditMode;
    private readonly _puz: Puzzle;
    private readonly _mapping: Map<string, ScriptVar>;

    private _string_count: number = 0;
}

export type RScriptVarType = GameObject | DisplayObject | RNAHighlightState | string;

interface ScriptVar {
    val: RScriptVarType;
    par: any;
}

import * as log from "loglevel";
import {Graphics, Point} from "pixi.js";
import {SceneObject} from "../../flashbang/objects/SceneObject";
import {AlphaTask} from "../../flashbang/tasks/AlphaTask";
import {RepeatingTask} from "../../flashbang/tasks/RepeatingTask";
import {SerialTask} from "../../flashbang/tasks/SerialTask";
import {RNAHighlightState} from "../pose2D/Pose2D";
import {ConstraintBox} from "../ui/ConstraintBox";
import {ColorUtil} from "../util/ColorUtil";
import {RScriptEnv, UIElementType} from "./RScriptEnv";
import {RScriptOp} from "./RScriptOp";

export enum ROPHighlightMode {
    RNA = "RNA",
    UI = "UI"
}

export class ROPHighlight extends RScriptOp {
    public static readonly id_postfix: string = "_highlight_";

    public constructor(isVisible: boolean, inMode: ROPHighlightMode, env: RScriptEnv) {
        super(env);
        this._op_visible = isVisible;
        this._mode = inMode;
    }

    /*override*/
    public InitializeROP(op: string, args: string): void {
        super.InitializeROP(op, args);
        this._id = ROPHighlight.ProcessId(this._id);

    }

    /*override*/
    public exec(): void {
        // Remove highlight with ID.
        if (this._env.Exists(this._id)) {
            let existing: any = this._env.GetVar(this._id);
            if (existing instanceof SceneObject) {
                existing.destroySelf();
            } else if (existing instanceof RNAHighlightState) {
                this.RemoveHighlight(existing);
            }
            this._env.DeleteVar(this._id);
        }

        if (this._op_visible && this._mode == ROPHighlightMode.RNA) {
            // Highlight nucleotides.
            let res: number[] = [];
            for (let i: number = this._start_idx; i <= this._end_idx; ++i) {
                res.push(i);
            }
            let rnaHighlight: RNAHighlightState = this._env.GetRNA().create_new_highlight(res);
            this._env.StoreVar(this._id, rnaHighlight, this._env.GetRNA());

        } else if (this._op_visible && this._mode == ROPHighlightMode.UI) {
            const [uiElement, elementID, altParam] = this._env.GetUIElementFromId(this._uiElementID);
            const highlightParent: any = this.GetUIElementReference(elementID, altParam);
            if (highlightParent == null) {
                log.warn(`ROPHighlight: missing highlight parent [id='${this._uiElementID}']`);
                return;
            }

            // Draw highlight around the UI element.
            // Give it a bit of padding so the highlight isn't so tight.
            const padding = new Point(5, 5);
            const offset: Point = ROPHighlight.GetUIElementOffset(elementID);
            const realWidth: Point = this.GetUIElementSize(uiElement, padding, elementID);

            const new_x: number = (highlightParent == uiElement ? 0 : uiElement.x) - padding.x + offset.x;
            const new_y: number = (highlightParent == uiElement ? 0 : uiElement.y) - padding.y + offset.y;

            const highlight = new Graphics();
            highlight.alpha = 0;
            highlight.clear();
            highlight.lineStyle(5, this._color, 0.7);
            highlight.drawRoundedRect(new_x, new_y, realWidth.x, realWidth.y, 10);

            const highlightObj = new SceneObject(highlight);
            highlightObj.addObject(new RepeatingTask(() => {
                return new SerialTask(
                    new AlphaTask(1, 0.5),
                    new AlphaTask(0, 0.5)
                );
            }));

            highlightParent.addObject(highlightObj, highlightParent.container);
            this._env.StoreVar(this._id, highlight, highlightParent);
        }
    }

    /*override*/
    protected ParseArgument(arg: string, i: number): void {
        switch (i) {
        case 0:
            if (!this._op_visible) {
                this._id = this._env.GetStringRef(arg);
            } else {
                if (this._mode == ROPHighlightMode.RNA) {
                    this._start_idx = Number(arg) - 1;
                } else if (this._mode == ROPHighlightMode.UI) {
                    this._uiElementID = this._env.GetStringRef(arg).toUpperCase();
                }
            }
            break;
        case 1:
            if (this._mode == ROPHighlightMode.RNA) {
                this._end_idx = Number(arg) - 1;
            } else if (this._mode == ROPHighlightMode.UI) {
                this._id = this._env.GetStringRef(arg);
            }
            break;
        case 2:
            if (this._mode == ROPHighlightMode.RNA) {
                this._id = this._env.GetStringRef(arg);
            } else if (this._mode == ROPHighlightMode.UI) {
                this._color = ColorUtil.fromString(`#${this._env.GetStringRef(arg)}`);
            }
            break;
        case 3:
            this._color = ColorUtil.fromString(`#${this._env.GetStringRef(arg)}`);
            break;
        }
    }

    private GetUIElementSize(obj: any, padding: Point, key: string): Point {
        if (obj == null) {
            return new Point(0, 0);
        }

        let p: Point = new Point(obj.width + 2 * padding.x, obj.height + 2 * padding.y);
        switch (key.toUpperCase()) {
        case "OBJECTIVES":
            let n: number = this._env.GetUI().get_constraint_count();
            let firstObj: ConstraintBox = this._env.GetUI().get_constraint(0);
            let lastObj: ConstraintBox = this._env.GetUI().get_constraint(n - 1);
            p.x = lastObj.display.x - firstObj.display.x + lastObj.real_width() + 2 * padding.x;
            p.y = 84;
            break;
        case "SHAPEOBJECTIVE":
            p.x = 84;
            p.y = 84;
            break;
        case "OBJECTIVE-":
            p.x = 10 + obj.real_width();
            p.y = 84;
            break;
        case "SWAP":
            p.x -= 6;
            break;
        case "ACTION_MENU":
            p = new Point(obj.get_width(false) + 2 * padding.x, obj.get_height() + 2 * padding.y);
            // no break statement, intentional!
        case "ZOOMIN":
        case "ZOOMOUT":
        case "UNDO":
        case "REDO":
        case "RESET":
        case "PIP":
            p.x -= 5;
            break;
        case "AU":
        case "UA":
        case "GU":
        case "UG":
        case "GC":
        case "CG":
            p.x = 30;
            p.y = 15;
            break;
        case "AUCOMPLETE":
        case "UACOMPLETE":
        case "GUCOMPLETE":
        case "UGCOMPLETE":
        case "GCCOMPLETE":
        case "CGCOMPLETE":
            p.x += 24;
            break;
        case "HELP":
            p.x -= 6;
            break;
        case "TOGGLENATURAL":
        case "TOGGLETARGET":

            break;
        }
        return p;
    }

    private GetUIElementReference(key: string, altParam: number = -1): any {
        switch (key.toUpperCase()) {
        case "A":
        case "U":
        case "G":
        case "C":
        case "AU":
        case "UA":
        case "GU":
        case "UG":
        case "GC":
        case "CG":
        case "AUCOMPLETE":
        case "UACOMPLETE":
        case "GUCOMPLETE":
        case "UGCOMPLETE":
        case "GCCOMPLETE":
        case "CGCOMPLETE":
            return this._env.GetUIElement(UIElementType.PALETTE);
        case "OBJECTIVES":
            return this._env.GetUIElement(UIElementType.OBJECTIVE, 0);
        case "OBJECTIVE-":
            return this._env.GetUIElement(UIElementType.OBJECTIVE, altParam);
        case UIElementType.ACTION_MENU:
        case UIElementType.SWAP:
        case UIElementType.TOGGLENATURAL:
        case UIElementType.TOGGLETARGET:
        case UIElementType.ZOOMIN:
        case UIElementType.ZOOMOUT:
        case UIElementType.UNDO:
        case UIElementType.REDO:
        case UIElementType.PIP:
        case UIElementType.SWITCH:
            return this._env.GetUIElement(key as UIElementType);
        }
        return this._env.GetUI();
    }

    private RemoveHighlight(obj: RNAHighlightState): void {
        this._env.GetRNA().remove_new_highlight(obj);
    }

    private static ProcessId(inId: string): string {
        if (!inId) return ROPHighlight.id_postfix;
        return inId + ROPHighlight.id_postfix;
    }

    private static GetUIElementOffset(key: string): Point {
        let offset: Point = new Point(0, 0);
        switch (key.toUpperCase()) {
        case "SWAP":
            offset = new Point(4, 0);
            break;
        case "A":
        case "U":
        case "G":
        case "C":
            break;
        case "AU":
        case "UA":
        case "GU":
        case "UG":
        case "GC":
        case "CG":
            offset = new Point(9, 11);
            break;
        case "AUCOMPLETE":
        case "UACOMPLETE":
        case "GUCOMPLETE":
        case "UGCOMPLETE":
        case "GCCOMPLETE":
        case "CGCOMPLETE":
            offset = new Point(-19, 0);
            break;
        case "TOGGLENATURAL":
        case "TOGGLETARGET":
        case "RESET":
        case "ZOOMIN":
        case "ZOOMOUT":
        case "UNDO":
        case "REDO":
        case "PIP":
            break;
        case "OBJECTIVES":
            offset = new Point(-5, 0);
            break;
        }
        return offset;
    }

    private readonly _op_visible: boolean;
    private readonly _mode: ROPHighlightMode;

    private _start_idx: number = -1;
    private _end_idx: number = -1;
    private _id: string = "";
    private _color: number = 0xffffff;
    private _uiElementID: string;
}

import * as log from "loglevel";
import {Graphics, Point} from "pixi.js";
import {GameObject} from "../../flashbang/core/GameObject";
import {SceneObject} from "../../flashbang/objects/SceneObject";
import {AlphaTask} from "../../flashbang/tasks/AlphaTask";
import {RepeatingTask} from "../../flashbang/tasks/RepeatingTask";
import {SerialTask} from "../../flashbang/tasks/SerialTask";
import {Easing} from "../../flashbang/util/Easing";
import {RNAHighlightState} from "../pose2D/Pose2D";
import {ConstraintBox} from "../ui/ConstraintBox";
import {EternaMenu} from "../ui/EternaMenu";
import {ColorUtil} from "../util/ColorUtil";
import {RScriptEnv} from "./RScriptEnv";
import {RScriptOp} from "./RScriptOp";
import {GetRScriptUIElementBounds, RScriptUIElement, RScriptUIElementID} from "./RScriptUIElement";

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

    /* override */
    public InitializeROP(op: string, args: string): void {
        super.InitializeROP(op, args);
        this._id = ROPHighlight.ProcessId(this._id);
    }

    /* override */
    public exec(): void {
        // Remove highlight with ID.
        if (this._env.Exists(this._id)) {
            let existing: any = this._env.GetVar(this._id);
            if (existing instanceof GameObject) {
                existing.destroySelf();
            } else if (existing instanceof RNAHighlightState) {
                this.RemoveHighlight(existing);
            }
            this._env.DeleteVar(this._id);
        }

        if (this._op_visible && this._mode === ROPHighlightMode.RNA) {
            // Highlight nucleotides.
            let res: number[] = [];
            for (let i: number = this._start_idx; i <= this._end_idx; ++i) {
                res.push(i);
            }
            let rnaHighlight: RNAHighlightState = this._env.GetRNA().create_new_highlight(res);
            this._env.StoreVar(this._id, rnaHighlight, this._env.GetRNA());
        } else if (this._op_visible && this._mode === ROPHighlightMode.UI) {
            const [uiElement, elementID, altParam] = this._env.GetUIElementFromId(this._uiElementString);
            const highlightParent: any = this.GetUIElementReference(elementID, altParam);
            if (highlightParent == null) {
                log.warn(`ROPHighlight: missing highlight parent [id='${this._uiElementString}']`);
                return;
            }

            // Draw highlight around the UI element.
            // Give it a bit of padding so the highlight isn't so tight.
            const padding = new Point(5, 5);
            const offset: Point = ROPHighlight.GetUIElementOffset(elementID);
            const elementSize: Point = this.GetUIElementSize(uiElement, padding, elementID);

            const uiElementBounds = GetRScriptUIElementBounds(uiElement);
            const new_x: number = (highlightParent === uiElement ? 0 : uiElementBounds.x) - padding.x + offset.x;
            const new_y: number = (highlightParent === uiElement ? 0 : uiElementBounds.y) - padding.y + offset.y;

            const highlight = new Graphics();
            highlight.alpha = 0;
            highlight.clear();
            highlight.lineStyle(5, this._color, 0.7);
            highlight.drawRoundedRect(new_x, new_y, elementSize.x, elementSize.y, 4);

            const highlightObj = new SceneObject(highlight);
            highlightObj.addObject(new RepeatingTask(() => new SerialTask(
                new AlphaTask(1, 0.75, Easing.easeInOut),
                new AlphaTask(0, 0.75, Easing.easeInOut)
            )));

            highlightParent.addObject(highlightObj, highlightParent.container);
            this._env.StoreVar(this._id, highlight, highlightParent);
        }
    }

    /* override */
    protected ParseArgument(arg: string, i: number): void {
        switch (i) {
        case 0:
            if (!this._op_visible) {
                this._id = this._env.GetStringRef(arg);
            } else if (this._mode === ROPHighlightMode.RNA) {
                this._start_idx = Number(arg) - 1;
            } else if (this._mode === ROPHighlightMode.UI) {
                this._uiElementString = (this._env.GetStringRef(arg).toUpperCase() as RScriptUIElementID);
            }
            break;
        case 1:
            if (this._mode === ROPHighlightMode.RNA) {
                this._end_idx = Number(arg) - 1;
            } else if (this._mode === ROPHighlightMode.UI) {
                this._id = this._env.GetStringRef(arg);
            }
            break;
        case 2:
            if (this._mode === ROPHighlightMode.RNA) {
                this._id = this._env.GetStringRef(arg);
            } else if (this._mode === ROPHighlightMode.UI) {
                this._color = ColorUtil.fromString(`#${this._env.GetStringRef(arg)}`);
            }
            break;
        case 3:
            this._color = ColorUtil.fromString(`#${this._env.GetStringRef(arg)}`);
            break;
        }
    }

    private GetUIElementSize(uiObj: RScriptUIElement, padding: Point, key: RScriptUIElementID): Point {
        const bounds = GetRScriptUIElementBounds(uiObj);
        let size: Point = new Point(bounds.width + (2 * padding.x), bounds.height + (2 * padding.y));

        switch (key) {
        case RScriptUIElementID.OBJECTIVES:
            let n: number = this._env.GetUI().get_constraint_count();
            let firstObj: ConstraintBox = this._env.GetUI().get_constraint(0);
            let lastObj: ConstraintBox = this._env.GetUI().get_constraint(n - 1);
            size.x = lastObj.display.x - firstObj.display.x + lastObj.real_width() + 2 * padding.x;
            size.y = 84;
            break;
        case RScriptUIElementID.SHAPEOBJECTIVE:
            size.x = 84;
            size.y = 84;
            break;
        case RScriptUIElementID.OBJECTIVE:
            size.x = 10 + (uiObj as ConstraintBox).real_width();
            size.y = 84;
            break;
        case RScriptUIElementID.SWAP:
            size.x -= 6;
            break;
        case RScriptUIElementID.ACTION_MENU:
            size = new Point(
                (uiObj as EternaMenu).get_width(false) + 2 * padding.x,
                (uiObj as EternaMenu).get_height() + 2 * padding.y
            );
            // no break statement, intentional!
        case RScriptUIElementID.ZOOMIN:
        case RScriptUIElementID.ZOOMOUT:
        case RScriptUIElementID.UNDO:
        case RScriptUIElementID.REDO:
        case RScriptUIElementID.RESET:
        case RScriptUIElementID.PIP:
            size.x -= 5;
            break;
        case RScriptUIElementID.AU:
        case RScriptUIElementID.UA:
        case RScriptUIElementID.GU:
        case RScriptUIElementID.UG:
        case RScriptUIElementID.GC:
        case RScriptUIElementID.CG:
            size.x = 30;
            size.y = 15;
            break;
        case RScriptUIElementID.AUCOMPLETE:
        case RScriptUIElementID.UACOMPLETE:
        case RScriptUIElementID.GUCOMPLETE:
        case RScriptUIElementID.UGCOMPLETE:
        case RScriptUIElementID.GCCOMPLETE:
        case RScriptUIElementID.CGCOMPLETE:
            size.x += 24;
            break;
        case RScriptUIElementID.HELP:
            size.x -= 6;
            break;
        case RScriptUIElementID.TOGGLENATURAL:
        case RScriptUIElementID.TOGGLETARGET:

            break;
        }
        return size;
    }

    private GetUIElementReference(key: RScriptUIElementID, altParam: number = -1): any {
        switch (key) {
        case RScriptUIElementID.A:
        case RScriptUIElementID.U:
        case RScriptUIElementID.G:
        case RScriptUIElementID.C:
        case RScriptUIElementID.AU:
        case RScriptUIElementID.UA:
        case RScriptUIElementID.GU:
        case RScriptUIElementID.UG:
        case RScriptUIElementID.GC:
        case RScriptUIElementID.CG:
        case RScriptUIElementID.AUCOMPLETE:
        case RScriptUIElementID.UACOMPLETE:
        case RScriptUIElementID.GUCOMPLETE:
        case RScriptUIElementID.UGCOMPLETE:
        case RScriptUIElementID.GCCOMPLETE:
        case RScriptUIElementID.CGCOMPLETE:
            return this._env.GetUIElement(RScriptUIElementID.PALETTE);
        case RScriptUIElementID.OBJECTIVES:
            return this._env.GetUIElement(RScriptUIElementID.OBJECTIVE, 0);
        case RScriptUIElementID.OBJECTIVE:
            return this._env.GetUIElement(RScriptUIElementID.OBJECTIVE, altParam);
        case RScriptUIElementID.ACTION_MENU:
        case RScriptUIElementID.SWAP:
        case RScriptUIElementID.TOGGLENATURAL:
        case RScriptUIElementID.TOGGLETARGET:
        case RScriptUIElementID.ZOOMIN:
        case RScriptUIElementID.ZOOMOUT:
        case RScriptUIElementID.UNDO:
        case RScriptUIElementID.REDO:
        case RScriptUIElementID.PIP:
        case RScriptUIElementID.SWITCH:
            return this._env.GetUIElement(key);
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

    private static GetUIElementOffset(id: RScriptUIElementID): Point {
        let offset: Point = new Point(0, 0);
        switch (id) {
        case RScriptUIElementID.SWAP:
            offset = new Point(4, 0);
            break;
        case RScriptUIElementID.A:
        case RScriptUIElementID.U:
        case RScriptUIElementID.G:
        case RScriptUIElementID.C:
            break;
        case RScriptUIElementID.AU:
        case RScriptUIElementID.UA:
        case RScriptUIElementID.GU:
        case RScriptUIElementID.UG:
        case RScriptUIElementID.GC:
        case RScriptUIElementID.CG:
            offset = new Point(8, 7);
            break;
        case RScriptUIElementID.AUCOMPLETE:
        case RScriptUIElementID.UACOMPLETE:
        case RScriptUIElementID.GUCOMPLETE:
        case RScriptUIElementID.UGCOMPLETE:
        case RScriptUIElementID.GCCOMPLETE:
        case RScriptUIElementID.CGCOMPLETE:
            offset = new Point(-19, 0);
            break;
        case RScriptUIElementID.TOGGLENATURAL:
        case RScriptUIElementID.TOGGLETARGET:
        case RScriptUIElementID.RESET:
        case RScriptUIElementID.ZOOMIN:
        case RScriptUIElementID.ZOOMOUT:
        case RScriptUIElementID.UNDO:
        case RScriptUIElementID.REDO:
        case RScriptUIElementID.PIP:
            break;
        case RScriptUIElementID.OBJECTIVES:
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
    private _uiElementString: string;
}

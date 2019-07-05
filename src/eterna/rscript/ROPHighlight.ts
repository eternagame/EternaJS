import * as log from 'loglevel';
import {Graphics, Point} from 'pixi.js';
import {GameObject} from 'flashbang/core';
import {SceneObject} from 'flashbang/objects';
import {AlphaTask, RepeatingTask, SerialTask} from 'flashbang/tasks';
import {ColorUtil, Easing, Assert} from 'flashbang/util';
import {RNAHighlightState} from 'eterna/pose2D';
import {ConstraintBox, EternaMenu} from 'eterna/ui';
import RScriptEnv from './RScriptEnv';
import RScriptOp from './RScriptOp';
import {RScriptUIElement, GetRScriptUIElementBounds, RScriptUIElementID} from './RScriptUIElement';

export enum ROPHighlightMode {
    RNA = 'RNA',
    UI = 'UI'
}

export default class ROPHighlight extends RScriptOp {
    public static readonly ID_POSTFIX = '_highlight_';

    constructor(isVisible: boolean, inMode: ROPHighlightMode, env: RScriptEnv) {
        super(env);
        this._opVisible = isVisible;
        this._mode = inMode;
    }

    /* override */
    public initialize(op: string, args: string): void {
        super.initialize(op, args);
        this._id = ROPHighlight.processId(this._id);
    }

    /* override */
    public exec(): void {
        // Remove highlight with ID.
        if (this._env.hasVar(this._id)) {
            let existing: any = this._env.getVar(this._id);
            if (existing instanceof GameObject) {
                existing.destroySelf();
            } else if (existing instanceof RNAHighlightState) {
                this.removeHighlight(existing);
            }
            this._env.deleteVar(this._id);
        }

        if (this._opVisible && this._mode === ROPHighlightMode.RNA) {
            // Highlight nucleotides.
            let res: number[] = [];
            for (let i: number = this._startIdx; i <= this._endIdx; ++i) {
                res.push(i);
            }
            let rnaHighlight: RNAHighlightState = this._env.pose.createNewHighlight(res);
            this._env.setVar(this._id, rnaHighlight);
        } else if (this._opVisible && this._mode === ROPHighlightMode.UI) {
            const [uiElement, elementID, altParam] = this._env.getUIElementFromID(this._uiElementString);
            const highlightParent: any = this.getUiElementReference(elementID, altParam);
            if (highlightParent == null) {
                log.warn(`ROPHighlight: missing highlight parent [id='${this._uiElementString}']`);
                return;
            }

            // Draw highlight around the UI element.
            // Give it a bit of padding so the highlight isn't so tight.
            const padding = new Point(5, 5);
            const offset: Point = ROPHighlight.getUiElementOffset(elementID);
            const elementSize: Point = this.getUiElementSize(uiElement, padding, elementID);

            const uiElementBounds = GetRScriptUIElementBounds(uiElement);
            const newX: number = (highlightParent === uiElement ? 0 : uiElementBounds.x) - padding.x + offset.x;
            const newY: number = (highlightParent === uiElement ? 0 : uiElementBounds.y) - padding.y + offset.y;

            const highlight = new Graphics();
            highlight.alpha = 0;
            highlight.clear();
            highlight.lineStyle(5, this._color, 0.7);
            highlight.drawRoundedRect(newX, newY, elementSize.x, elementSize.y, 4);

            const highlightObj = new SceneObject(highlight);
            highlightObj.addObject(new RepeatingTask(() => new SerialTask(
                new AlphaTask(0.2, 0.75, Easing.easeInOut),
                new AlphaTask(1.0, 0.75, Easing.easeInOut),
            )));

            highlightParent.addObject(highlightObj, highlightParent.container);
            this._env.setVar(this._id, highlight);
        }
    }

    /* override */
    protected parseArgument(arg: string, i: number): void {
        switch (i) {
            case 0:
                if (!this._opVisible) {
                    this._id = this._env.getStringRef(arg);
                } else if (this._mode === ROPHighlightMode.RNA) {
                    this._startIdx = Number(arg) - 1;
                } else if (this._mode === ROPHighlightMode.UI) {
                    this._uiElementString = (this._env.getStringRef(arg).toUpperCase() as RScriptUIElementID);
                }
                break;
            case 1:
                if (this._mode === ROPHighlightMode.RNA) {
                    this._endIdx = Number(arg) - 1;
                } else if (this._mode === ROPHighlightMode.UI) {
                    this._id = this._env.getStringRef(arg);
                }
                break;
            case 2:
                if (this._mode === ROPHighlightMode.RNA) {
                    this._id = this._env.getStringRef(arg);
                } else if (this._mode === ROPHighlightMode.UI) {
                    this._color = ColorUtil.fromString(`#${this._env.getStringRef(arg)}`);
                }
                break;
            case 3:
                this._color = ColorUtil.fromString(`#${this._env.getStringRef(arg)}`);
                break;
            default:
                log.warn(`ROPHighlight has no argument at position ${i}`);
        }
    }

    private getUiElementSize(uiObj: RScriptUIElement, padding: Point, key: RScriptUIElementID): Point {
        const bounds = GetRScriptUIElementBounds(uiObj);
        let size = new Point(bounds.width + (2 * padding.x), bounds.height + (2 * padding.y));

        switch (key) {
            case RScriptUIElementID.OBJECTIVES: {
                let n: number = this._env.ui.constraintCount;
                let firstObj: ConstraintBox = this._env.ui.getConstraint(0);
                let lastObj: ConstraintBox = this._env.ui.getConstraint(n - 1);
                size.x = lastObj.display.x - firstObj.display.x + lastObj.width + 2 * padding.x;
                size.y = 84;
                break;
            }
            case RScriptUIElementID.SHAPEOBJECTIVE:
                size.x = 84;
                size.y = 84;
                break;
            case RScriptUIElementID.OBJECTIVE:
                size.x = 10 + (uiObj as ConstraintBox).width;
                size.y = 84;
                break;
            case RScriptUIElementID.SWAP:
                size.x -= 6;
                break;
            case RScriptUIElementID.ACTION_MENU:
                size = new Point(
                    (uiObj as EternaMenu).getWidth(false) + 2 * padding.x,
                    (uiObj as EternaMenu).height + 2 * padding.y
                );
                // break omitted
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
            default:
                log.warn(`UI element does not have size: ${key}`);
        }
        return size;
    }

    private getUiElementReference(key: RScriptUIElementID, altParam: number = -1): any {
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
                return this._env.getUIElement(RScriptUIElementID.PALETTE);
            case RScriptUIElementID.OBJECTIVES:
                return this._env.getUIElement(RScriptUIElementID.OBJECTIVE, 0);
            case RScriptUIElementID.OBJECTIVE:
                return this._env.getUIElement(RScriptUIElementID.OBJECTIVE, altParam);
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
                return this._env.getUIElement(key);
            default:
                log.warn(`No reference exist for UI element ${key}`);
        }
        return this._env.ui;
    }

    private removeHighlight(obj: RNAHighlightState): void {
        this._env.pose.removeNewHighlight(obj);
    }

    private static processId(inId: string): string {
        if (!inId) return ROPHighlight.ID_POSTFIX;
        return inId + ROPHighlight.ID_POSTFIX;
    }

    private static getUiElementOffset(id: RScriptUIElementID): Point {
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
            default:
                log.warn(`UIElement ${id} has no defined offset`);
        }
        return offset;
    }

    private readonly _opVisible: boolean;
    private readonly _mode: ROPHighlightMode;

    private _startIdx: number = -1;
    private _endIdx: number = -1;
    private _id: string = '';
    private _color: number = 0xffffff;
    private _uiElementString: string;
}

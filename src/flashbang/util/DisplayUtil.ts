import {DisplayObject, Graphics, Matrix, Point, Rectangle} from "pixi.js";
import {Align} from "../core/Align";
import {Flashbang} from "../core/Flashbang";
import {RectangleUtil} from "./RectangleUtil";

// the @types file for upng-js is broken, so we just require it directly
const UPNG = require("upng-js");

export class DisplayUtil {
    public static renderToPNG(target: DisplayObject): ArrayBuffer {
        let pixels = Flashbang.app.pixi.renderer.extract.pixels(target);
        return UPNG.encode([pixels.buffer], DisplayUtil.width(target), DisplayUtil.height(target));
    }

    /**
     * Removes the given DisplayObject from its parent, if it has one.
     * Use DisplayObject.destroy() if you want to dispose of the object (destroy() also removes the object
     * from its parent.)
     */
    public static removeFromParent(disp: DisplayObject): void {
        if (disp.parent != null) {
            disp.parent.removeChild(disp);
        }
    }

    /** @return true if potentialAncestor is an ancestor of potentialDescendent */
    public static isAncestor(potentialAncestor: DisplayObject, potentialDescendent: DisplayObject): boolean {
        let cur = potentialDescendent.parent;
        while (cur != null) {
            if (cur === potentialAncestor) {
                return true;
            }
            cur = cur.parent;
        }
        return false;
    }

    /** @return true if the given global point is within the DisplayObject's hit area */
    public static hitTest(disp: DisplayObject, globalLoc: Point): boolean {
        disp.toLocal(globalLoc, null, DisplayUtil.P, false);

        return (disp.hitArea != null
            ? disp.hitArea.contains(DisplayUtil.P.x, DisplayUtil.P.y)
            : disp.getLocalBounds(DisplayUtil.R).contains(DisplayUtil.P.x, DisplayUtil.P.y));
    }

    /** Returns a rectangle filled with the given color */
    public static fillRect(width: number, height: number, color: number, alpha: number = 1): Graphics {
        let r: Graphics = new Graphics();
        r.beginFill(color, alpha);
        r.drawRect(0, 0, width, height);
        r.endFill();
        return r;
    }

    public static fillStageRect(color: number, alpha: number = 1): Graphics {
        return this.fillRect(Flashbang.stageWidth, Flashbang.stageHeight, color, alpha);
    }

    public static width(disp: DisplayObject): number {
        return disp.getLocalBounds(DisplayUtil.R).width;
    }

    public static height(disp: DisplayObject): number {
        return disp.getLocalBounds(DisplayUtil.R).height;
    }

    /** Transforms a point from one DisplayObject's coordinate space to another's. */
    public static transformPoint(p: Point, from: DisplayObject, to: DisplayObject, out: Point = null): Point {
        return to.toLocal(from.toGlobal(p, DisplayUtil.P), null, out);
    }

    private static readonly GET_TRANSFORMATION_MATRIX: Matrix = new Matrix();

    /** Creates a matrix that represents the transformation from the local coordinate system
     *  to another. If you pass an <code>out</code>-matrix, the result will be stored in this
     *  matrix instead of creating a new object.
     *  (Adapted from Starling-Framework) */
    public static getTransformationMatrix(disp: DisplayObject, targetSpace: DisplayObject, out: Matrix = null): Matrix {
        let commonParent: DisplayObject;
        let currentObject: DisplayObject;

        if (out) {
            out.identity();
        } else {
            out = new Matrix();
        }

        if (targetSpace === disp) {
            return out;
        } else if (targetSpace === disp.parent || (targetSpace == null && disp.parent == null)) {
            disp.localTransform.copy(out);
            return out;
        } else if (targetSpace == null || targetSpace === DisplayUtil.base(disp)) {
            // targetCoordinateSpace 'null' represents the target space of the base object.
            // -> move up from this to base
            currentObject = disp;
            while (currentObject !== targetSpace) {
                out.append(currentObject.localTransform);
                currentObject = currentObject.parent;
            }

            return out;
        } else if (targetSpace.parent === disp) {
            // optimization
            DisplayUtil.getTransformationMatrix(targetSpace, disp, out);
            out.invert();

            return out;
        }

        // 1. find a common parent of this and the target space

        commonParent = DisplayUtil.findCommonParent(disp, targetSpace);

        // 2. move up from this to common parent

        currentObject = disp;
        while (currentObject !== commonParent) {
            out.append(currentObject.localTransform);
            currentObject = currentObject.parent;
        }

        if (commonParent === targetSpace) {
            return out;
        }

        // 3. now move up from target until we reach the common parent

        DisplayUtil.GET_TRANSFORMATION_MATRIX.identity();
        currentObject = targetSpace;
        while (currentObject !== commonParent) {
            DisplayUtil.GET_TRANSFORMATION_MATRIX.append(currentObject.localTransform);
            currentObject = currentObject.parent;
        }

        // 4. now combine the two matrices

        DisplayUtil.GET_TRANSFORMATION_MATRIX.invert();
        out.append(DisplayUtil.GET_TRANSFORMATION_MATRIX);

        return out;
    }

    private static readonly GET_BOUNDS_RELATIVE_MATRIX: Matrix = new Matrix();

    /**
     * Returns the bounds the given DisplayObject transformed to another DisplayObject's coordinate system.
     * (Adapted from Starling-Framework)
     */
    public static getBoundsRelative(disp: DisplayObject, targetSpace: DisplayObject, out: Rectangle = null): Rectangle {
        if (out == null) out = new Rectangle();

        if (targetSpace === disp) {
            disp.getLocalBounds(out);
        } else if (targetSpace === disp.parent && !DisplayUtil.isRotated(disp)) {
            // optimization
            let scaleX: number = disp.scale.x;
            let scaleY: number = disp.scale.y;

            disp.getLocalBounds(out);

            RectangleUtil.setTo(out,
                disp.x + out.x - disp.pivot.x * scaleX,
                disp.y + out.y - disp.pivot.y * scaleY,
                out.width * scaleX,
                out.height * scaleY);

            if (scaleX < 0) {
                out.width *= -1;
                out.x -= out.width;
            }
            if (scaleY < 0) {
                out.height *= -1;
                out.y -= out.height;
            }
        } else {
            DisplayUtil.getTransformationMatrix(disp, targetSpace, DisplayUtil.GET_BOUNDS_RELATIVE_MATRIX);
            RectangleUtil.getBounds(disp.getLocalBounds(out), DisplayUtil.GET_BOUNDS_RELATIVE_MATRIX, out);
        }

        return out;
    }

    /** Transforms a Rectangle from one DisplayObject's coordinate space to another's. */
    public static transformRect(r: Rectangle, from: DisplayObject, to: DisplayObject, out: Rectangle = null): Rectangle {
        let left: number = Number.MAX_VALUE;
        let top: number = Number.MAX_VALUE;
        let right: number = -Number.MAX_VALUE;
        let bottom: number = -Number.MAX_VALUE;

        // top-left
        DisplayUtil.P.set(r.left, r.top);
        DisplayUtil.transformPoint(DisplayUtil.P, from, to, DisplayUtil.P);
        left = Math.min(left, DisplayUtil.P.x);
        right = Math.max(right, DisplayUtil.P.x);
        top = Math.min(top, DisplayUtil.P.y);
        bottom = Math.max(bottom, DisplayUtil.P.y);

        // top-right
        DisplayUtil.P.set(r.right, r.top);
        DisplayUtil.transformPoint(DisplayUtil.P, from, to, DisplayUtil.P);
        left = Math.min(left, DisplayUtil.P.x);
        right = Math.max(right, DisplayUtil.P.x);
        top = Math.min(top, DisplayUtil.P.y);
        bottom = Math.max(bottom, DisplayUtil.P.y);

        // bottom-left
        DisplayUtil.P.set(r.left, r.bottom);
        DisplayUtil.transformPoint(DisplayUtil.P, from, to, DisplayUtil.P);
        left = Math.min(left, DisplayUtil.P.x);
        right = Math.max(right, DisplayUtil.P.x);
        top = Math.min(top, DisplayUtil.P.y);
        bottom = Math.max(bottom, DisplayUtil.P.y);

        // bottom-right
        DisplayUtil.P.set(r.right, r.bottom);
        DisplayUtil.transformPoint(DisplayUtil.P, from, to, DisplayUtil.P);
        left = Math.min(left, DisplayUtil.P.x);
        right = Math.max(right, DisplayUtil.P.x);
        top = Math.min(top, DisplayUtil.P.y);
        bottom = Math.max(bottom, DisplayUtil.P.y);

        if (out == null) {
            out = new Rectangle();
        }
        out.left = left;
        out.top = top;
        out.width = right - left;
        out.height = bottom - top;
        return out;
    }

    private static readonly POSITION_RELATIVE_RECT: Rectangle = new Rectangle();

    /** Positions a DisplayObject in relation to another DisplayObject */
    public static positionRelative(
        disp: DisplayObject,
        dispHAlign: Align, dispVAlign: Align,
        relativeTo: DisplayObject,
        targetHAlign: Align, targetVAlign: Align,
        xOffset: number = 0, yOffset: number = 0
    ): void {
        DisplayUtil.positionRelativeToBounds(disp,
            dispHAlign, dispVAlign,
            DisplayUtil.getBoundsRelative(relativeTo, disp.parent || relativeTo, DisplayUtil.POSITION_RELATIVE_RECT),
            targetHAlign, targetVAlign,
            xOffset, yOffset);
    }

    private static SCREEN_BOUNDS: Rectangle = new Rectangle();

    /** Positions a DisplayObject relative to the screen */
    public static positionRelativeToStage(
        disp: DisplayObject,
        dispHAlign: Align, dispVAlign: Align,
        targetHAlign: Align, targetVAlign: Align,
        xOffset: number = 0, yOffset: number = 0
    ): void {
        RectangleUtil.setTo(DisplayUtil.SCREEN_BOUNDS, 0, 0, Flashbang.stageWidth, Flashbang.stageHeight);
        if (disp.parent != null) {
            RectangleUtil.getBounds(DisplayUtil.SCREEN_BOUNDS, disp.parent.localTransform, DisplayUtil.SCREEN_BOUNDS);
        }

        DisplayUtil.positionRelativeToBounds(disp,
            dispHAlign, dispVAlign,
            DisplayUtil.SCREEN_BOUNDS,
            targetHAlign, targetVAlign,
            xOffset, yOffset);
    }

    public static readonly POSITION_RELATIVE_TO_BOUNDS_RECT: Rectangle = new Rectangle();

    public static positionRelativeToBounds(
        disp: DisplayObject,
        dispHAlign: Align, dispVAlign: Align,
        relativeTo: Rectangle,
        targetHAlign: Align, targetVAlign: Align,
        xOffset: number = 0, yOffset: number = 0
    ): void {
        let x: number = xOffset;
        let y: number = yOffset;

        switch (targetHAlign) {
        case Align.LEFT:
            x += relativeTo.left;
            break;
        case Align.RIGHT:
            x += relativeTo.right;
            break;
        case Align.CENTER:
            x += relativeTo.left + (relativeTo.width * 0.5);
            break;
        }
        switch (targetVAlign) {
        case Align.TOP:
            y += relativeTo.top;
            break;
        case Align.BOTTOM:
            y += relativeTo.bottom;
            break;
        case Align.CENTER:
            y += relativeTo.top + (relativeTo.height * 0.5);
            break;
        }

        disp.x = 0;
        disp.y = 0;
        let dispBounds = DisplayUtil.getBoundsRelative(disp, disp.parent, DisplayUtil.POSITION_RELATIVE_TO_BOUNDS_RECT);
        // should this be relative to self or parent?
        // let dispBounds = DisplayUtil.getBoundsRelative(disp, disp, DisplayUtil.POSITION_RELATIVE_TO_BOUNDS_RECT);
        switch (dispHAlign) {
        case Align.LEFT:
            x -= dispBounds.left;
            break;
        case Align.RIGHT:
            x -= dispBounds.right;
            break;
        case Align.CENTER:
            x -= dispBounds.left + (dispBounds.width * 0.5);
            break;
        }
        switch (dispVAlign) {
        case Align.TOP:
            y -= dispBounds.top;
            break;
        case Align.BOTTOM:
            y -= dispBounds.bottom;
            break;
        case Align.CENTER:
            y -= dispBounds.top + (dispBounds.height * 0.5);
            break;
        }

        disp.x = x;
        disp.y = y;
    }

    private static findCommonParent(object1: DisplayObject, object2: DisplayObject): DisplayObject {
        let currentObject: DisplayObject = object1;

        while (currentObject) {
            DisplayUtil.sAncestors.push(currentObject);
            currentObject = currentObject.parent;
        }

        currentObject = object2;
        while (currentObject && DisplayUtil.sAncestors.indexOf(currentObject) === -1) {
            currentObject = currentObject.parent;
        }

        DisplayUtil.sAncestors.length = 0;

        if (currentObject) {
            return currentObject;
        } else {
            throw new Error("Object not connected to target");
        }
    }

    private static isRotated(disp: DisplayObject): boolean {
        return disp.rotation !== 0 || disp.skew.x !== 0 || disp.skew.y !== 0;
    }

    /** The topmost object in the display tree the object is part of. */
    private static base(disp: DisplayObject): DisplayObject {
        let currentObject: DisplayObject = disp;
        while (currentObject.parent) currentObject = currentObject.parent;
        return currentObject;
    }

    private static readonly P: Point = new Point();
    private static readonly R: Rectangle = new Rectangle();
    private static readonly sAncestors: DisplayObject[] = [];
}

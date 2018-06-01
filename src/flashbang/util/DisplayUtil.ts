import {DisplayObject, Point, Rectangle, Graphics} from "pixi.js";

export class DisplayUtil {
    /** Removes the given DisplayObject from its parent, if it has one */
    public static removeFromParent(disp: DisplayObject): void {
        if (disp.parent != null) {
            disp.parent.removeChild(disp);
        }
    }

    /** @return true if potentialAncestor is an ancestor of potentialDescendent */
    public static isAncestor(potentialAncestor: DisplayObject, potentialDescendent: DisplayObject): boolean {
        let cur = potentialDescendent.parent;
        while (cur != null) {
            if (cur == potentialAncestor) {
                return true;
            }
            cur = cur.parent;
        }
        return false;
    }

    /** @return true if the given global point is within the DisplayObject's hit area */
    public static hitTest(disp: DisplayObject, globalLoc: Point): boolean {
        disp.toLocal(globalLoc, null, DisplayUtil.P, false);

        return (disp.hitArea != null ?
            disp.hitArea.contains(DisplayUtil.P.x, DisplayUtil.P.y) :
            disp.getLocalBounds(DisplayUtil.R).contains(DisplayUtil.P.x, DisplayUtil.P.y));
    }

    /** Returns a rectangle filled with the given color */
    public static fillRect(width: number, height: number, color: number, alpha: number = 1): Graphics {
        let r: Graphics = new Graphics();
        r.beginFill(color, alpha);
        r.drawRect(0, 0, width, height);
        r.endFill();
        return r;
    }

    public static width(disp: DisplayObject): number {
        return disp.getLocalBounds(DisplayUtil.R).width;
    }

    public static height(disp: DisplayObject): number {
        return disp.getLocalBounds(DisplayUtil.R).height;
    }

    private static readonly P: Point = new Point();
    private static readonly R: Rectangle = new Rectangle();
}

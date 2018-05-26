import {DisplayObject} from "pixi.js";

export class DisplayUtil {
    /** Removes the given DisplayObject from its parent, if it has one */
    public static removeFromParent(disp: DisplayObject): void {
        if (disp.parent != null) {
            disp.parent.removeChild(disp);
        }
    }
}

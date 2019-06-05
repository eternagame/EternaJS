import {DisplayObject} from "pixi.js";
import {ObjectTask} from "../core";
import {Assert} from "../util";

export default class VisibleTask extends ObjectTask {
    constructor(visible: boolean, target: DisplayObject = null) {
        super();
        this._visible = visible;
        this._target = target;
    }

    /* override */
    protected added(): void {
        // If we weren't given a target, operate on our parent object
        let target = this._target;
        if (target == null) {
            Assert.notNull(this.parent.display, "parent does not have a DisplayObject");
            target = this.parent.display;
        }

        target.visible = this._visible;
        this.destroySelf();
    }

    private readonly _target: DisplayObject;
    private readonly _visible: boolean;
}

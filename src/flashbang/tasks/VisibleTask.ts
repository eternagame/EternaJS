import {Container} from 'pixi.js';
import ObjectTask from 'flashbang/core/ObjectTask';
import Assert from 'flashbang/util/Assert';

export default class VisibleTask extends ObjectTask {
    constructor(visible: boolean, target: Container | null = null) {
        super();
        this._visible = visible;
        this._target = target;
    }

    /* override */
    protected added(): void {
        // If we weren't given a target, operate on our parent object
        let target = this._target;
        if (target == null && this.parent !== null) {
            Assert.notNull(this.parent.display, 'parent does not have a DisplayObject');
            target = this.parent.display;
        }

        if (target) target.visible = this._visible;
        this.destroySelf();
    }

    private readonly _target: Container | null;
    private readonly _visible: boolean;
}

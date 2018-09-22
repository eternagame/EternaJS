import {DisplayObject} from "pixi.js";
import {Button, ButtonState} from "../../flashbang/objects/Button";

export class SingleStateButton extends Button {
    public constructor(disp: DisplayObject) {
        super();
        this.container.addChild(disp);
    }

    protected showState(state: ButtonState): void {
        // do nothing!
    }
}

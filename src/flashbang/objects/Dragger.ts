import {Container, Graphics} from "pixi.js";
import {UnitSignal} from "signals";
import {Flashbang, GameObject} from "../core";
import {DisplayObjectPointerTarget} from "../input";

/** A utility object that captures mouse input and dispatches update events until a mouseUp occurs */
export default class Dragger extends GameObject {
    public readonly dragged = new UnitSignal();
    public readonly dragComplete = new UnitSignal();

    // Global mouse coordinates
    public startX: number = 0;
    public startY: number = 0;
    public curX: number = 0;
    public curY: number = 0;

    public constructor(displayParent: Container = null) {
        super();
        this._displayParent = displayParent;
    }

    public get offsetX(): number {
        return this.curX - this.startX;
    }

    public get offsetY(): number {
        return this.curY - this.startY;
    }

    protected added(): void {
        super.added();

        let parent = this._displayParent || this.mode.container;
        parent.addChild(this._disp);
        this.updateSize();

        this.startX = this.curX = Flashbang.globalMouse.x;
        this.startY = this.curY = Flashbang.globalMouse.y;

        let touchable = new DisplayObjectPointerTarget(this._disp);
        this.regs.add(touchable.pointerMove.connect((e) => {
            this.updateMouseLoc();
            this.dragged.emit();

            e.stopPropagation();
        }));

        this.regs.add(touchable.pointerUp.connect((e) => {
            this.complete();
            this.destroySelf();

            e.stopPropagation();
        }));
    }

    protected removed(): void {
        // Ensure we complete even if we were interrupted
        this.complete();
        super.removed();
    }

    protected dispose(): void {
        this._disp.destroy({children: true});
        this._disp = null;
        super.dispose();
    }

    private updateMouseLoc(): void {
        this.curX = Flashbang.globalMouse.x;
        this.curY = Flashbang.globalMouse.y;
    }

    private updateSize(): void {
        this._disp.clear().beginFill(0x0, 0).drawRect(0, 0, Flashbang.stageWidth, Flashbang.stageHeight).endFill();
    }

    private complete(): void {
        if (!this._complete) {
            this._complete = true;
            this.updateMouseLoc();
            this.dragComplete.emit();
        }
    }

    private readonly _displayParent: Container;
    private _disp: Graphics = new Graphics();
    private _complete: boolean;
}

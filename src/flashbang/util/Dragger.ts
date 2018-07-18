import {Point} from "pixi.js";
import {UnitSignal} from "../../signals/UnitSignal";
import {Flashbang} from "../core/Flashbang";
import {GameObject} from "../core/GameObject";
import {DisplayObjectPointerTarget} from "../input/DisplayObjectPointerTarget";

/** A utility object that captures mouse input and dispatches update events until a mouseUp occurs */
export class Dragger extends GameObject {
    public readonly dragged = new UnitSignal();
    public readonly dragComplete = new UnitSignal();

    // Global mouse coordinates
    public startX: number = 0;
    public startY: number = 0;
    public curX: number = 0;
    public curY: number = 0;

    public get offsetX(): number {
        return this.curX - this.startX;
    }

    public get offsetY(): number {
        return this.curY - this.startY;
    }

    protected added(): void {
        super.added();

        this.startX = this.curX = Flashbang.globalMouse.x;
        this.startY = this.curY = Flashbang.globalMouse.y;

        let touchable = new DisplayObjectPointerTarget(this.mode.modeSprite);
        this.regs.add(touchable.pointerMove.connect(e => {
            this.updateMouseLoc();
            this.dragged.emit();

            e.stopPropagation();
        }));

        this.regs.add(touchable.pointerUp.connect(e => {
            this.updateMouseLoc();
            this.dragComplete.emit();
            this.destroySelf();

            e.stopPropagation();
        }))
    }

    private updateMouseLoc(): void {
        this.curX = Flashbang.globalMouse.x;
        this.curY = Flashbang.globalMouse.y;
    }

    private static readonly P: Point = new Point();
}

import {Container, Graphics} from 'pixi.js';
import {UnitSignal} from 'signals';
import GameObject from 'flashbang/core/GameObject';
import Flashbang from 'flashbang/core/Flashbang';
import DisplayObjectPointerTarget from 'flashbang/input/DisplayObjectPointerTarget';
import { Assert } from 'flashbang';

/** A utility object that captures mouse input and dispatches update events until a mouseUp occurs */
export default class Dragger extends GameObject {
    public readonly dragged = new UnitSignal();
    public readonly dragComplete = new UnitSignal();

    // Global mouse coordinates
    public startX: number = 0;
    public startY: number = 0;
    public curX: number = 0;
    public curY: number = 0;

    constructor(displayParent: Container | null = null) {
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

        let parent = this._displayParent || (this.mode && this.mode.container);
        Assert.assertIsDefined(this._disp);
        if (parent) parent.addChild(this._disp);
        this.updateSize();

        Assert.assertIsDefined(Flashbang.globalMouse);
        this.startX = Flashbang.globalMouse.x;
        this.curX = Flashbang.globalMouse.x;
        this.startY = Flashbang.globalMouse.y;
        this.curY = Flashbang.globalMouse.y;

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
        if (this._disp) this._disp.destroy({children: true});
        this._disp = null;
        super.dispose();
    }

    private updateMouseLoc(): void {
        Assert.assertIsDefined(Flashbang.globalMouse);
        this.curX = Flashbang.globalMouse.x;
        this.curY = Flashbang.globalMouse.y;
    }

    private updateSize(): void {
        Assert.assertIsDefined(Flashbang.stageHeight);
        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(this._disp);
        this._disp.clear().beginFill(0x0, 0).drawRect(0, 0, Flashbang.stageWidth, Flashbang.stageHeight).endFill();
    }

    private complete(): void {
        if (!this._complete) {
            this._complete = true;
            this.updateMouseLoc();
            this.dragComplete.emit();
        }
    }

    private readonly _displayParent: Container | null;
    private _disp: Graphics | null = new Graphics();
    private _complete: boolean;
}

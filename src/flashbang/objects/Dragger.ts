import {Container, Graphics, Point} from 'pixi.js';
import {UnitSignal, Signal} from 'signals';
import GameObject from 'flashbang/core/GameObject';
import Flashbang from 'flashbang/core/Flashbang';
import DisplayObjectPointerTarget from 'flashbang/input/DisplayObjectPointerTarget';
import {Assert} from 'flashbang';

/** A utility object that captures mouse input and dispatches update events until a mouseUp occurs */
export default class Dragger extends GameObject {
    public readonly dragged = new Signal<Point>();
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

        if (!Flashbang.supportsTouch) {
            Assert.assertIsDefined(Flashbang.globalMouse);
            this.startX = Flashbang.globalMouse.x;
            this.curX = Flashbang.globalMouse.x;
            this.startY = Flashbang.globalMouse.y;
            this.curY = Flashbang.globalMouse.y;
        } else {
            this.startX = -1;
            this.startY = -1;
        }

        let touchable = new DisplayObjectPointerTarget(this._disp);
        this.regs.add(touchable.pointerMove.connect((e) => {
            const point = new Point(e.data.global.x, e.data.global.y);
            this.updateMouseLoc(point);
            this.dragged.emit(point);

            e.stopPropagation();
        }));

        this.regs.add(touchable.pointerUp.connect((e) => {
            this.complete(new Point(e.data.global.x, e.data.global.y));
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

    private updateMouseLoc(point: Point): void {
        this.curX = point.x;
        this.curY = point.y;
        if (this.startX < 0) {
            this.startX = this.curX;
        }
        if (this.startY < 0) {
            this.startY = this.curY;
        }
    }

    private updateSize(): void {
        Assert.assertIsDefined(Flashbang.stageHeight);
        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(this._disp);
        this._disp.clear().beginFill(0x0).drawRect(0, 0, Flashbang.stageWidth, Flashbang.stageHeight).endFill();
        this._disp.alpha = 0;
    }

    private complete(point?: Point): void {
        if (!this._complete) {
            this._complete = true;
            if (point) {
                this.updateMouseLoc(point);
            }
            this.dragComplete.emit();
        }
    }

    private readonly _displayParent: Container | null;
    private _disp: Graphics | null = new Graphics();
    private _complete: boolean;
}

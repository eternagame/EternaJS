import {Container, Graphics} from "pixi.js";
import {MathUtil} from "flashbang/util";

export default class ScrollContainer extends Container {
    public readonly content = new Container();

    public constructor(width: number, height: number) {
        super();

        this.addChild(this.content);
        this.addChild(this._contentMask);
        this.content.mask = this._contentMask;

        this.setSize(width, height);
    }

    public get scrollX(): number {
        return -this.content.x;
    }

    public set scrollX(value: number) {
        this.setScroll(value, this.scrollY);
    }

    public get maxScrollX(): number {
        return Math.max(this.content.width - this._width, 0);
    }

    public get scrollY(): number {
        return -this.content.y;
    }

    public set scrollY(value: number) {
        this.setScroll(this.scrollX, value);
    }

    public get maxScrollY(): number {
        return Math.max(this.content.height - this._height, 0);
    }

    public setScroll(scrollX: number, scrollY: number): void {
        this.content.x = -MathUtil.clamp(scrollX, 0, this.maxScrollX);
        this.content.y = -MathUtil.clamp(scrollY, 0, this.maxScrollY);
    }

    /** Sets the size of the container's content viewport */
    public setSize(width: number, height: number): void {
        if (this._width === width && this._height === height) {
            return;
        }

        let prevScrollX = this.scrollX;
        let prevScrollY = this.scrollY;

        this._width = width;
        this._height = height;

        this._contentMask.clear().beginFill(0x00ff00, 0).drawRect(0, 0, this._width, this._height).endFill();
        this.setScroll(prevScrollX, prevScrollY);
    }

    private readonly _contentMask = new Graphics();

    private _width: number;
    private _height: number;
}

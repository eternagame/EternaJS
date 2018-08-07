import {DisplayObject, Rectangle} from "pixi.js";

// TODO: get rid of this
export class UDim {
    public constructor(rel_x: number = 1, rel_y: number = 1, pix_x: number = 0, pix_y: number = 0) {
        this._rel_x = rel_x;
        this._rel_y = rel_y;
        this._pix_x = pix_x;
        this._pix_y = pix_y;
    }

    public set_xy(rel_x: number, rel_y: number, pix_x: number, pix_y: number): void {
        this._rel_x = rel_x;
        this._rel_y = rel_y;
        this._pix_x = pix_x;
        this._pix_y = pix_y;
    }

    public get_x(parentWidth: number): number {
        return parentWidth * this._rel_x + this._pix_x;
    }

    public get_y(parentHeight: number): number {
        return parentHeight * this._rel_y + this._pix_y;
    }

    public setPos(disp: DisplayObject, relativeToParent: DisplayObject = null) :void {
        let parentWidth: number = 0;
        let parentHeight: number = 0;

        if (relativeToParent == null) {
            relativeToParent = disp.parent;
        }

        if (relativeToParent != null) {
            relativeToParent.getLocalBounds(UDim.R);
            parentWidth = UDim.R.width;
            parentHeight = UDim.R.height;
        }

        disp.x = this.get_x(parentWidth);
        disp.y = this.get_y(parentHeight);
    }

    private _rel_x: number;
    private _rel_y: number;
    private _pix_x: number;
    private _pix_y: number;

    private static readonly R: Rectangle = new Rectangle();
}

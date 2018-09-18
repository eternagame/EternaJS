import {Graphics} from "pixi.js";

export class MaskBox extends Graphics {
    public setSize(width: number, height: number): void {
        if (this._width == width && this._height == height) {
            return;
        }

        this._width = width;
        this._height = height;

        this.clear();
        this.beginFill(0x18202b, 0.9);
        this.drawRoundedRect(0, 0, this._width, this._height, 20);
        this.endFill();
    }

    private _width: number = 0;
    private _height :number = 0;
}

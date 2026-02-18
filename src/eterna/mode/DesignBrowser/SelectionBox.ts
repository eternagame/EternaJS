import {Graphics, Rectangle} from 'pixi.js';

export default class SelectionBox extends Graphics {
    constructor(color: number) {
        super();
        this._color = color;
        this.hitArea = new Rectangle();
    }

    public setSize(width: number, height: number): void {
        if (this._width === width && this._height === height) {
            return;
        }
        this._width = width;
        this._height = height;

        this.clear()
            .rect(0, 0, width, height)
            .fill({color: this._color, alpha: 0.3});
    }

    protected readonly _color: number;
    protected _width: number = 0;
    protected _height: number = 0;
}

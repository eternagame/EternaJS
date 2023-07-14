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

        this.clear();
        this.beginFill(this._color, 0.3);
        this.drawRect(0, 0, width, height);
        this.endFill();
    }

    protected readonly _color: number;
    protected _width: number = 0;
    protected _height: number = 0;
}

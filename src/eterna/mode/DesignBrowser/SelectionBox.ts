import {Graphics} from 'pixi.js';

export default class SelectionBox extends Graphics {
    constructor(color: number) {
        super();
        this._color = color;
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
    private _width: number = 0;
    private _height: number = 0;
}

import {Graphics} from 'pixi.js';
import UITheme from 'eterna/ui/UITheme';

// GridLines class written by Jerry Fu
// Draws any number of lines covering the entire width of the design browser at a specified interval,
// starting from the top heading down
export default class GridLines extends Graphics {
    constructor(thickness: number, color: number, intervalSpacing: number) {
        super();
        this._thickness = thickness;
        this._color = color;
        this._intervalSpacing = intervalSpacing;
    }

    public setSize(width: number, height: number): void {
        if (this._width === width && this._height === height) {
            return;
        }

        this._width = width;
        this._height = height;
        this.clear();

        const {designBrowser: theme} = UITheme;
        this.lineStyle(this._thickness, this._color);
        for (let ii = 1; ii < Math.ceil(height / this._intervalSpacing); ii++) {
            const y = ii * this._intervalSpacing - theme.dataPadding / 2;
            this.moveTo(0, y);
            this.lineTo(width, y);
        }
    }

    private readonly _thickness: number;
    private readonly _color: number;
    private readonly _intervalSpacing: number;

    private _width: number = 0;
    private _height: number = 0;
}

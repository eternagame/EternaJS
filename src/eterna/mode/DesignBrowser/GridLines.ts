import {Graphics} from "pixi.js";
import {int} from "../../util/int";

// GridLines class written by Jerry Fu
// Draws any number of lines covering the entire width of the design browser at a specified interval, starting from the top heading down
export class GridLines extends Graphics {
    constructor(thickness: number, color: number, interval_spacing: number) {
        super();
        this._thickness = thickness;
        this._color = color;
        this._interval_spacing = interval_spacing;
    }

    public redraw(width: number, yPos: number) {
        this.clear();
        this.lineStyle(this._thickness, this._color);
        for (let ii = 0; ii < int((width - 32 - yPos) / this._interval_spacing); ii++) {
            this.moveTo(5, ii * this._interval_spacing);
            this.lineTo(width - 5, ii * this._interval_spacing);
        }
    }

    private readonly _thickness: number;
    private readonly _color: number;
    private readonly _interval_spacing: number;
}

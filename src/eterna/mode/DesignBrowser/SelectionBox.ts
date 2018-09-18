import {Graphics} from "pixi.js";

export class SelectionBox extends Graphics {
    public constructor(color: number) {
        super();
        this._color = color;
    }

    public redraw(width: number, height: number): void {
        this.clear();
        this.beginFill(this._color, 0.3);
        this.drawRect(0, 0, width, height);
        this.endFill();
    }

    protected readonly _color: number;
}

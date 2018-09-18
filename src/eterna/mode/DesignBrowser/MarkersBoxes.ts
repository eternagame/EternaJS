import {Container, Point} from "pixi.js";
import {SelectionBox} from "./SelectionBox";

export class MarkersBoxes extends Container {
    constructor(color: number, initPosX: number, initPosY: number, size: Point, verticle_offset: number) {
        super();

        this._markers = [];
        this._indices = [];
        this._color = color;
        this._initPosX = initPosX;
        this._initPosY = initPosY;
        this._size = size.clone();
        this._verticalOffset = verticle_offset;
    }

    public setSize(width: number, height: number): void {
        this._width = width;
        this._height = height;
    }

    public clear(): void {
        for (let marker of this._markers) {
            marker.destroy({children: true});
        }

        this._markers = [];
        this._indices = [];
    }

    public add_marker(index: number, id: number): void {
        for (let ii = 0; ii < this._indices.length; ii++) {
            if (index == this._indices[ii]) {
                return;
            }
        }

        let sel = new MarkerBox(this._color, id);
        sel.redraw(this._size.x, this._size.y);
        sel.position = new Point(this._initPosX, this._initPosY + index * this._verticalOffset);
        sel.visible = false;
        this._markers.push(sel);
        this._indices.push(index);

        this.addChild(sel);
    }

    public is_selected(index: number): boolean {
        for (let ii = 0; ii < this._indices.length; ii++) {
            if (index == this._indices[ii]) {
                return this._markers[ii].visible;
            }
        }
        return false;
    }

    public del_marker(index: number): void {
        let removeIndex = -1;
        for (let ii = 0; ii < this._indices.length; ii++) {
            if (index == this._indices[ii]) {
                removeIndex = ii;
                break;
            }
        }

        let marker = this._markers[removeIndex];
        marker.destroy({children: true});

        this._markers.splice(removeIndex, 1);
        this._indices.splice(removeIndex, 1);
    }

    public on_draw(start: number): void {
        if (this._markers == null || this._markers.length == 0) {
            return;
        }

        for (let ii = 0; ii < this._indices.length; ii++) {
            let sel: MarkerBox = this._markers[ii];

            sel.visible = false;
            if (this._indices[ii] >= start) {
                let y_pos: number = this._initPosY + (this._indices[ii] - start) * this._verticalOffset;
                if (y_pos + this._verticalOffset < this._height) {
                    sel.visible = true;
                    sel.position = new Point(this._initPosX, y_pos);
                    sel.redraw(this._size.x, this._size.y);
                }
            }
        }
    }

    private readonly _color: number;
    private readonly _initPosX: number;
    private readonly _initPosY: number;
    private readonly _verticalOffset: number;
    private readonly _size: Point;

    private _width: number = 0;
    private _height: number = 0;

    private _markers: MarkerBox[];
    private _indices: number[];
}

class MarkerBox extends SelectionBox {
    public readonly id: number;

    constructor(color: number, id: number) {
        super(color);
        this.id = id;
        this.visible = false;
    }
}

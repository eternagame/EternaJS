import {Container, Point} from "pixi.js";
import {SelectionBox} from "./SelectionBox";

export class MarkersBoxes extends Container {
    constructor(color: number, initPosX: number, initPosY: number, markerHeight: number) {
        super();

        this._markers = [];
        this._indices = [];
        this._color = color;
        this._initPosX = initPosX;
        this._initPosY = initPosY;
        this._markerHeight = markerHeight;
    }

    public setWidth(width: number): void {
        if (this._width === width) {
            return;
        }

        this._width = width;
    }

    public clear(): void {
        for (let marker of this._markers) {
            marker.destroy({children: true});
        }

        this._markers = [];
        this._indices = [];
    }

    public addMarker(index: number): void {
        if (this._indices.indexOf(index) >= 0) {
            return;
        }

        let box = new SelectionBox(this._color);
        box.setSize(this._width, this._markerHeight);
        box.position = new Point(this._initPosX, this._initPosY + index * this._markerHeight);
        this.addChild(box);

        this._markers.push(box);
        this._indices.push(index);
    }

    public isSelected(index: number): boolean {
        return this._indices.indexOf(index) >= 0;
    }

    public removeMarker(index: number): void {
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

    public updateView(start: number): void {
        if (this._markers == null || this._markers.length == 0) {
            return;
        }

        for (let ii = 0; ii < this._indices.length; ii++) {
            let box = this._markers[ii];

            box.visible = false;
            if (this._indices[ii] >= start) {
                let y_pos: number = this._initPosY + (this._indices[ii] - start) * this._markerHeight;
                if (y_pos + this._markerHeight < this._markerHeight) {
                    box.visible = true;
                    box.position = new Point(this._initPosX, y_pos);
                    box.setSize(this._width, this._markerHeight);
                }
            }
        }
    }

    private readonly _color: number;
    private readonly _initPosX: number;
    private readonly _initPosY: number;
    private readonly _markerHeight: number;

    private _width: number = 0;

    private _markers: SelectionBox[];
    private _indices: number[];
}

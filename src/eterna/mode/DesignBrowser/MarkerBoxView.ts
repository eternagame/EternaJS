import {Container, Point} from 'pixi.js';
import SelectionBox from './SelectionBox';

export default class MarkerBoxView extends Container {
    constructor(color: number, markerHeight: number) {
        super();

        this._markers = [];
        this._indices = [];
        this._color = color;
        this._markerHeight = markerHeight;
    }

    public setSize(width: number, height: number): void {
        if (this._width === width && this._height === height) {
            return;
        }

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

    public addMarker(index: number): void {
        if (this._indices.indexOf(index) >= 0) {
            return;
        }

        let box = new SelectionBox(this._color);
        box.setSize(this._width, this._markerHeight);
        box.position = new Point(0, index * this._markerHeight);
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
            if (index === this._indices[ii]) {
                removeIndex = ii;
                break;
            }
        }

        let marker = this._markers[removeIndex];
        marker.destroy({children: true});

        this._markers.splice(removeIndex, 1);
        this._indices.splice(removeIndex, 1);
    }

    public updateView(firstVisIdx: number): void {
        if (this._markers == null || this._markers.length === 0) {
            return;
        }

        for (let ii = 0; ii < this._indices.length; ii++) {
            let box = this._markers[ii];

            box.visible = false;
            if (this._indices[ii] >= firstVisIdx) {
                let yPos = (this._indices[ii] - firstVisIdx) * this._markerHeight;
                if (yPos + this._markerHeight < this._height) {
                    box.visible = true;
                    box.position = new Point(0, yPos);
                    box.setSize(this._width, this._markerHeight);
                }
            }
        }
    }

    private readonly _color: number;
    private readonly _markerHeight: number;

    private _width: number = 0;
    private _height: number = 0;

    private _markers: SelectionBox[];
    private _indices: number[];
}

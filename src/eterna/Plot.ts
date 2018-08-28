import {Graphics, Text, Container} from "pixi.js";
import {ColorUtil} from "../flashbang/util/ColorUtil";
import {Fonts} from "./util/Fonts";

export enum PlotType {
    LINE, BAR, SCATTER
}

export class Plot extends Container {
    public type: PlotType = PlotType.BAR;

    public constructor(type: PlotType = PlotType.BAR) {
        super();
        this.type = type;
        this._graphics = new Graphics();
        this.addChild(this._graphics);
    }

    public setSize(width: number, height: number) {
        this._width = width;
        this._height = height;
    }

    public setData(data: number[], maxvals: number[], labels: string[] = null, ghost_data: number[] = null): void {
        this._data = (data != null ? data.slice() : null);
        this._labels = (labels != null ? labels.slice() : null);
        this._upperBounds = (maxvals != null ? maxvals.slice() : null);

        if (ghost_data != null) {
            if (ghost_data.length !== data.length) {
                throw new Error("Data lengths don't match");
            }
            this._ghostData = ghost_data.slice();
        } else {
            this._ghostData = null;
        }
    }

    public set2DData(data_2d: number[], num_bases: number): void {
        if (data_2d) {
            this._data2D = data_2d;
        }

        this._numBases = num_bases;
    }

    public replot(): void {
        this.replotWithBase(0, 0);
    }

    public replotWithBase(x: number, y: number): void {
        this._graphics.clear();

        if (this._data == null && this._data2D == null) {
            return;
        }

        if (this._numBases === 0) {
            if (this._data != null && this._data.length === 0) {
                return;
            }
            this._numBases = this._data.length;
        }

        const horizontal_space: number = this._width / this._numBases;
        const vertical_space: number = this._height / this._numBases;

        this._graphics.clear();
        this._graphics.lineStyle(1, 0);
        this._graphics.beginFill(0xFFFFFF);
        this._graphics.drawRect(0, 0, this._width, this._height);
        this._graphics.endFill();

        if (this.type === PlotType.BAR) {
            this._graphics.lineStyle(0, 0xFFFFFF);
            for (let ii = 0; ii < this._data.length; ii++) {
                let len: number = (this._data[ii] / this._upperBounds[ii]) * this._height;

                if (this._ghostData == null) {
                    this._graphics.beginFill(0x00AA00);
                    this._graphics.drawRect(Plot.W_MARGIN + (ii + 1) * horizontal_space - horizontal_space / 2.0, Plot.H_MARGIN + this._height - len, horizontal_space / 2.0, len);
                } else {
                    let ghostlen: number = (this._ghostData[ii] / this._upperBounds[ii]) * this._height;
                    this._graphics.beginFill(0x00AA00);
                    this._graphics.drawRect(Plot.W_MARGIN + (ii + 1) * horizontal_space - horizontal_space / 2.0, Plot.H_MARGIN + this._height - len, horizontal_space / 4.0, len);
                    this._graphics.beginFill(0xAA0000);
                    this._graphics.drawRect(Plot.W_MARGIN + (ii + 1) * horizontal_space - horizontal_space / 4.0, Plot.H_MARGIN + this._height - ghostlen, horizontal_space / 4.0, ghostlen);
                }
            }
        } else if (this.type === PlotType.LINE) {
            this._graphics.lineStyle(1, 0xAAAAAA, 1);
            for (let ii = 0; ii < this._data.length; ii++) {
                let x_coord = Plot.W_MARGIN + (ii + 1) * horizontal_space - horizontal_space / 2.0 + x;
                this._graphics.moveTo(x_coord, 0);
                this._graphics.lineTo(x_coord, this._height);
            }

            for (let ii = 0; ii < 10; ii++) {
                let y_coord = ii / 10 * (this._height - Plot.H_MARGIN) + y;
                this._graphics.moveTo(0, y_coord + Plot.H_MARGIN);
                this._graphics.lineTo(this._width, y_coord + Plot.H_MARGIN);
            }

            this._graphics.lineStyle(2, 0x00AA00);
            for (let ii = 0; ii < this._data.length; ii++) {
                let hlen: number = (this._data[ii] / (this._upperBounds[ii])) * (this._height - Plot.H_MARGIN);
                if (ii === 0) {
                    this._graphics.moveTo(Plot.W_MARGIN + (ii + 1) * horizontal_space - horizontal_space / 2.0, this._height - hlen);
                } else {
                    this._graphics.lineTo(Plot.W_MARGIN + (ii + 1) * horizontal_space - horizontal_space / 2.0, this._height - hlen);
                }
            }

            if (this._ghostData != null) {
                this._graphics.lineStyle(2, 0xAA0000);
                for (let ii = 0; ii < this._ghostData.length; ii++) {
                    let ghosthlen: number = (this._ghostData[ii] / this._upperBounds[ii]) * this._height;
                    if (ii === 0) {
                        this._graphics.moveTo(Plot.W_MARGIN + (ii + 1) * horizontal_space - horizontal_space / 2.0, Plot.H_MARGIN + this._height - ghosthlen);
                    } else {
                        this._graphics.lineTo(Plot.W_MARGIN + (ii + 1) * horizontal_space - horizontal_space / 2.0, Plot.H_MARGIN + this._height - ghosthlen);
                    }
                }
            }
        } else if (this.type === PlotType.SCATTER) {
            this._graphics.lineStyle(1, 0xAAAAAA, 1);
            for (let ii = 10; ii < this._numBases; ii += 10) {
                let x_coord = (ii / this._numBases) * this._width + x;
                let y_coord = (ii / this._numBases) * this._height + y;

                this._graphics.moveTo(x_coord, 0);
                this._graphics.lineTo(x_coord, this._height);

                this._graphics.moveTo(0, y_coord);
                this._graphics.lineTo(this._width, y_coord);
            }

            for (let ii = 0; ii < this._data2D.length; ii += 3) {
                let x_coord = ((this._data2D[ii + 1])) * horizontal_space + x;
                let y_coord = ((this._data2D[ii])) * vertical_space - 1 + y;

                let min_col: number = 0.1;
                let prob_r: number = 1.0 - ((this._data2D[ii + 2]) * (1 - min_col) + min_col);
                let prob_g: number = 1.0 - ((this._data2D[ii + 2]) * (1 - min_col) + min_col);
                let prob_b: number = 1.0 - ((this._data2D[ii + 2]) * (1 - min_col) + min_col);

                let prob_color: number = ColorUtil.compose(prob_r, prob_g, prob_b);

                this._graphics.lineStyle(0, 0, 0);
                this._graphics.beginFill(prob_color);
                this._graphics.drawRect(x_coord, y_coord, horizontal_space, vertical_space);
                this._graphics.endFill();
            }

            this._graphics.lineStyle(1, 0);
            this._graphics.moveTo(0, 0);
            this._graphics.lineTo(this._width, this._height);
        }

        this._graphics.lineStyle(1, 0);
        this._graphics.drawRect(0, 0, this._width, this._height);

        if (this._labelFields != null) {
            for (let label of this._labelFields) {
                this.removeChild(label);
            }
            this._labelFields = null;
        }

        if (this._labels) {
            this._labelFields = [];

            for (let ii = 0; ii < this._labels.length; ii++) {
                let labelString: string = this._labels[ii];
                if (labelString.length > 0) {
                    let label: Text = Fonts.arial(labelString).color(0xffffff).build();
                    label.width = horizontal_space;
                    label.x = Plot.W_MARGIN + (ii + 0.5) * horizontal_space;
                    label.y = Plot.H_MARGIN + this._height;
                    this.addChild(label);
                    this._labelFields.push(label);
                }
            }
        }
    }

    private readonly _graphics: Graphics;
    private _data: number[];
    private _data2D: number[];
    private _numBases: number = 0;
    private _ghostData: number[];
    private _labels: string[];
    private _upperBounds: number[];
    private _labelFields: Text[];

    private _width: number = 100;
    private _height: number = 100;

    private static readonly W_MARGIN = 0;
    private static readonly H_MARGIN = 20;
}

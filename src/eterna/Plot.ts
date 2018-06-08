import {Graphics, Text, Container} from "pixi.js";
import {Fonts} from "./util/Fonts";

export enum PlotType {
    LINE, BAR, SCATTER
}

export class Plot extends Container {
    public constructor() {
        super();
        this._graphics = new Graphics();
        this.addChild(this._graphics);
        this._type = PlotType.BAR;
    }

    public setSize(width: number, height: number) {
        this._width = width;
        this._height = height;
    }

    public set_type(type: number): void {
        this._type = type;
    }

    public set_data(data: number[], maxvals: number[], labels: string[] = null, ghost_data: number[] = null): void {
        this._data = (data != null ? data.slice() : null);
        this._labels = (labels != null ? labels.slice() : null);
        this._upper_bounds = (maxvals != null ? maxvals.slice() : null);

        if (ghost_data != null) {
            if (ghost_data.length != data.length) {
                throw new Error("Data lengths don't match");
            }
            this._ghost_data = ghost_data.slice();
        } else {
            this._ghost_data = null;
        }
    }

    public set_2d_data(data_2d: number[], num_bases: number): void {
        if (data_2d) {
            this._data_2d = data_2d;
        }

        this._num_bases = num_bases;
    }

    public replot(): void {
        this.replotWithBase(0, 0);
    }

    public replotWithBase(x: number, y: number): void {
        this._graphics.clear();

        if (this._data == null && this._data_2d == null) {
            return;
        }

        if (this._num_bases == 0) {
            if (this._data != null && this._data.length == 0) {
                return;
            }
            this._num_bases = this._data.length;
        }

        let horizontal_space: number = this._width / this._num_bases;
        let vertical_space: number = this._height / this._num_bases;
        let x_coord: number;
        let y_coord: number;

        this._graphics.clear();
        this._graphics.lineStyle(1, 0);
        this._graphics.beginFill(0xFFFFFF);
        this._graphics.drawRect(0, 0, this._width, this._height);
        this._graphics.endFill();

        if (this._type == PlotType.BAR) {
            this._graphics.lineStyle(0, 0xFFFFFF);
            for (let ii = 0; ii < this._data.length; ii++) {
                let len: number = (this._data[ii] / this._upper_bounds[ii]) * this._height;

                if (this._ghost_data == null) {
                    this._graphics.beginFill(0x00AA00);
                    this._graphics.drawRect(Plot.W_MARGIN + (ii + 1) * horizontal_space - horizontal_space / 2.0, Plot.H_MARGIN + this._height - len, horizontal_space / 2.0, len);
                } else {
                    let ghostlen: number = (this._ghost_data[ii] / this._upper_bounds[ii]) * this._height;
                    this._graphics.beginFill(0x00AA00);
                    this._graphics.drawRect(Plot.W_MARGIN + (ii + 1) * horizontal_space - horizontal_space / 2.0, Plot.H_MARGIN + this._height - len, horizontal_space / 4.0, len);
                    this._graphics.beginFill(0xAA0000);
                    this._graphics.drawRect(Plot.W_MARGIN + (ii + 1) * horizontal_space - horizontal_space / 4.0, Plot.H_MARGIN + this._height - ghostlen, horizontal_space / 4.0, ghostlen);
                }
            }
        } else if (this._type == PlotType.LINE) {

            this._graphics.lineStyle(1, 0xAAAAAA, 1);
            for (let ii = 0; ii < this._data.length; ii++) {
                x_coord = Plot.W_MARGIN + (ii + 1) * horizontal_space - horizontal_space / 2.0 + x;
                this._graphics.moveTo(x_coord, 0);
                this._graphics.lineTo(x_coord, this._height);
            }

            for (let ii = 0; ii < 10; ii++) {
                y_coord = ii / 10 * (this._height - Plot.H_MARGIN) + y;
                this._graphics.moveTo(0, y_coord + Plot.H_MARGIN);
                this._graphics.lineTo(this._width, y_coord + Plot.H_MARGIN);
            }

            this._graphics.lineStyle(2, 0x00AA00);
            for (let ii = 0; ii < this._data.length; ii++) {

                let hlen: number = (this._data[ii] / (this._upper_bounds[ii])) * (this._height - Plot.H_MARGIN);
                if (ii == 0) {
                    this._graphics.moveTo(Plot.W_MARGIN + (ii + 1) * horizontal_space - horizontal_space / 2.0, this._height - hlen);
                } else {
                    this._graphics.lineTo(Plot.W_MARGIN + (ii + 1) * horizontal_space - horizontal_space / 2.0, this._height - hlen);
                }
            }

            if (this._ghost_data != null) {
                this._graphics.lineStyle(2, 0xAA0000);
                for (let ii = 0; ii < this._ghost_data.length; ii++) {
                    let ghosthlen: number = (this._ghost_data[ii] / this._upper_bounds[ii]) * this._height;
                    if (ii == 0) {
                        this._graphics.moveTo(Plot.W_MARGIN + (ii + 1) * horizontal_space - horizontal_space / 2.0, Plot.H_MARGIN + this._height - ghosthlen);
                    } else {
                        this._graphics.lineTo(Plot.W_MARGIN + (ii + 1) * horizontal_space - horizontal_space / 2.0, Plot.H_MARGIN + this._height - ghosthlen);
                    }
                }
            }

        } else if (this._type == PlotType.SCATTER) {

            let high_prob_count: number = 0;

            this._graphics.lineStyle(1, 0xAAAAAA, 1);
            for (let ii = 10; ii < this._num_bases; ii += 10) {
                x_coord = (ii / this._num_bases) * this._width + x;
                y_coord = (ii / this._num_bases) * this._height + y;

                this._graphics.moveTo(x_coord, 0);
                this._graphics.lineTo(x_coord, this._height);

                this._graphics.moveTo(0, y_coord);
                this._graphics.lineTo(this._width, y_coord);
            }

            for (let ii = 0; ii < this._data_2d.length; ii += 3) {
                x_coord = ((this._data_2d[ii + 1])) * horizontal_space + x;
                y_coord = ((this._data_2d[ii])) * vertical_space - 1 + y;
                //graphics.drawRect(W_MARGIN + (ii+1) * horizontal_space - horizontal_space/2.0, H_MARGIN + _height - len,horizontal_space/2.0, len);

                let min_col: number = 0.1;
                let prob_r: number = 255 * (1.0 - ((this._data_2d[ii + 2]) * (1 - min_col) + min_col));
                let prob_g: number = 255 * (1.0 - ((this._data_2d[ii + 2]) * (1 - min_col) + min_col));
                let prob_b: number = 255 * (1.0 - ((this._data_2d[ii + 2]) * (1 - min_col) + min_col));

                let prob_color: number = prob_r * 256 * 256 + prob_g * 256 + prob_b;

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

        if (this._label_fields != null) {
            for (let label of this._label_fields) {
                this.removeChild(label);
            }
            this._label_fields = null;
        }

        if (this._labels) {
            this._label_fields = [];

            for (let ii = 0; ii < this._labels.length; ii++) {
                let labelString: string = this._labels[ii];
                if (labelString.length > 0) {
                    let label: Text = Fonts.arial(labelString).color(0xffffff).build();
                    label.width = horizontal_space;
                    label.x = Plot.W_MARGIN + (ii + 0.5) * horizontal_space;
                    label.y = Plot.H_MARGIN + this._height;
                    this.addChild(label);
                    this._label_fields.push(label);
                }
            }
        }
    }

    private readonly _graphics: Graphics;
    private _type: PlotType = PlotType.BAR;
    private _data: number[];
    private _data_2d: number[];
    private _num_bases: number;
    private _ghost_data: number[];
    private _labels: string[];
    private _upper_bounds: number[];
    private _label_fields: Text[];

    private _width: number = 100;
    private _height: number = 100;

    private static readonly W_MARGIN: number = 0;
    private static readonly H_MARGIN: number = 20;
}

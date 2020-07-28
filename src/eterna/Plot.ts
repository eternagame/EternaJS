import {Graphics, Text, Container} from 'pixi.js';
import {ColorUtil, Assert} from 'flashbang';
import Fonts from './util/Fonts';

export enum PlotType {
    LINE, BAR, SCATTER
}

export default class Plot extends Container {
    public type: PlotType = PlotType.BAR;

    constructor(type: PlotType = PlotType.BAR) {
        super();
        this.type = type;
        this._graphics = new Graphics();
        this.addChild(this._graphics);
    }

    public setSize(width: number, height: number) {
        this._width = width;
        this._height = height;
    }

    public setData(
        data: number[], maxvals: number[],
        labels: string[] | null = null, ghostData: number[] | null = null
    ): void {
        this._data = (data != null ? data.slice() : null);
        this._labels = (labels != null ? labels.slice() : null);
        this._upperBounds = (maxvals != null ? maxvals.slice() : null);

        if (ghostData != null) {
            if (ghostData.length !== data.length) {
                throw new Error("Data lengths don't match");
            }
            this._ghostData = ghostData.slice();
        } else {
            this._ghostData = null;
        }
    }

    public set2DData(data2D: number[] | null, numBases: number): void {
        if (data2D) {
            this._data2D = data2D;
        }

        this._numBases = numBases;
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
            Assert.assertIsDefined(this._data);
            this._numBases = this._data.length;
        }

        const horizontalSpace: number = this._width / this._numBases;
        const verticalSpace: number = this._height / this._numBases;

        this._graphics.clear();
        this._graphics.lineStyle(1, 0);
        this._graphics.beginFill(0xFFFFFF);
        this._graphics.drawRect(0, 0, this._width, this._height);
        this._graphics.endFill();

        if (this.type === PlotType.BAR) {
            this._graphics.lineStyle(0, 0xFFFFFF);
            Assert.assertIsDefined(this._data);
            Assert.assertIsDefined(this._upperBounds);
            for (let ii = 0; ii < this._data.length; ii++) {
                let len: number = (this._data[ii] / this._upperBounds[ii]) * this._height;

                if (this._ghostData == null) {
                    this._graphics.beginFill(0x00AA00);
                    this._graphics.drawRect(
                        Plot.W_MARGIN + (ii + 1) * horizontalSpace - horizontalSpace / 2.0,
                        Plot.H_MARGIN + this._height - len, horizontalSpace / 2.0, len
                    );
                } else {
                    let ghostlen: number = (this._ghostData[ii] / this._upperBounds[ii]) * this._height;
                    this._graphics.beginFill(0x00AA00);
                    this._graphics.drawRect(
                        Plot.W_MARGIN + (ii + 1) * horizontalSpace - horizontalSpace / 2.0,
                        Plot.H_MARGIN + this._height - len, horizontalSpace / 4.0, len
                    );
                    this._graphics.beginFill(0xAA0000);
                    this._graphics.drawRect(
                        Plot.W_MARGIN + (ii + 1) * horizontalSpace - horizontalSpace / 4.0,
                        Plot.H_MARGIN + this._height - ghostlen, horizontalSpace / 4.0, ghostlen
                    );
                }
            }
        } else if (this.type === PlotType.LINE) {
            this._graphics.lineStyle(1, 0xAAAAAA, 1);
            Assert.assertIsDefined(this._data);
            for (let ii = 0; ii < this._data.length; ii++) {
                let xCoord = Plot.W_MARGIN + (ii + 1) * horizontalSpace - horizontalSpace / 2.0 + x;
                this._graphics.moveTo(xCoord, 0);
                this._graphics.lineTo(xCoord, this._height);
            }

            for (let ii = 0; ii < 10; ii++) {
                let yCoord = (ii / 10) * (this._height - Plot.H_MARGIN) + y;
                this._graphics.moveTo(0, yCoord + Plot.H_MARGIN);
                this._graphics.lineTo(this._width, yCoord + Plot.H_MARGIN);
            }

            this._graphics.lineStyle(2, 0x00AA00);
            Assert.assertIsDefined(this._upperBounds);
            for (let ii = 0; ii < this._data.length; ii++) {
                let hlen: number = (this._data[ii] / (this._upperBounds[ii])) * (this._height - Plot.H_MARGIN);
                if (ii === 0) {
                    this._graphics.moveTo(
                        Plot.W_MARGIN + (ii + 1) * horizontalSpace - horizontalSpace / 2.0,
                        this._height - hlen
                    );
                } else {
                    this._graphics.lineTo(
                        Plot.W_MARGIN + (ii + 1) * horizontalSpace - horizontalSpace / 2.0,
                        this._height - hlen
                    );
                }
            }

            if (this._ghostData != null) {
                this._graphics.lineStyle(2, 0xAA0000);
                for (let ii = 0; ii < this._ghostData.length; ii++) {
                    let ghosthlen: number = (this._ghostData[ii] / this._upperBounds[ii]) * this._height;
                    if (ii === 0) {
                        this._graphics.moveTo(
                            Plot.W_MARGIN + (ii + 1) * horizontalSpace - horizontalSpace / 2.0,
                            Plot.H_MARGIN + this._height - ghosthlen
                        );
                    } else {
                        this._graphics.lineTo(
                            Plot.W_MARGIN + (ii + 1) * horizontalSpace - horizontalSpace / 2.0,
                            Plot.H_MARGIN + this._height - ghosthlen
                        );
                    }
                }
            }
        } else if (this.type === PlotType.SCATTER) {
            this._graphics.lineStyle(1, 0xAAAAAA, 1);
            for (let ii = 10; ii < this._numBases; ii += 10) {
                let xCoord = (ii / this._numBases) * this._width + x;
                let yCoord = (ii / this._numBases) * this._height + y;

                this._graphics.moveTo(xCoord, 0);
                this._graphics.lineTo(xCoord, this._height);

                this._graphics.moveTo(0, yCoord);
                this._graphics.lineTo(this._width, yCoord);
            }

            for (let ii = 0; ii < this._data2D.length; ii += 3) {
                let xCoord = ((this._data2D[ii + 1])) * horizontalSpace + x;
                let yCoord = ((this._data2D[ii])) * verticalSpace - 1 + y;

                let minCol = 0.1;
                let probR: number = 1.0 - ((this._data2D[ii + 2]) * (1 - minCol) + minCol);
                let probG: number = 1.0 - ((this._data2D[ii + 2]) * (1 - minCol) + minCol);
                let probB: number = 1.0 - ((this._data2D[ii + 2]) * (1 - minCol) + minCol);

                let probColor: number = ColorUtil.compose(probR, probG, probB);

                this._graphics.lineStyle(0, 0, 0);
                this._graphics.beginFill(probColor);
                this._graphics.drawRect(xCoord, yCoord, horizontalSpace, verticalSpace);
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
                    let label: Text = Fonts.std(labelString).color(0xffffff).build();
                    label.width = horizontalSpace;
                    label.x = Plot.W_MARGIN + (ii + 0.5) * horizontalSpace;
                    label.y = Plot.H_MARGIN + this._height;
                    this.addChild(label);
                    this._labelFields.push(label);
                }
            }
        }
    }

    private readonly _graphics: Graphics;
    private _data: number[] | null;
    private _data2D: number[];
    private _numBases: number = 0;
    private _ghostData: number[] | null;
    private _labels: string[] | null;
    private _upperBounds: number[] | null;
    private _labelFields: Text[] | null;

    private _width: number = 100;
    private _height: number = 100;

    private static readonly W_MARGIN = 0;
    private static readonly H_MARGIN = 20;
}

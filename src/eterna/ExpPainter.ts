import {MathUtil, ColorUtil} from 'flashbang';
import Constants from 'eterna/Constants';

export default class ExpPainter {
    public static readonly NUM_COLORS = 5;

    public static transformData(data: number[], dataMax: number, dataMin: number): number[] {
        let dataRet: number[] = data.slice();
        let absMax: number = 2 * dataMax - dataMin;

        for (let ii = 0; ii < dataRet.length; ii++) {
            dataRet[ii] = MathUtil.clamp(dataRet[ii], dataMin, absMax);
        }

        return dataRet;
    }

    public static getColorByLevel(lev: number): number {
        if (lev > 2 * ExpPainter.NUM_COLORS) {
            return ExpPainter.EXPCOLOR_NODATA;
        }

        let diff: number = (1.0 / ExpPainter.NUM_COLORS) * lev;

        if (diff > 1) {
            return ColorUtil.blend(ExpPainter.EXPCOLOR_OVEREXPOSED, ExpPainter.EXPCOLOR_EXPOSED, diff - 1);
        } else if (diff > 0) {
            return ColorUtil.blend(ExpPainter.EXPCOLOR_EXPOSED, ExpPainter.EXPCOLOR_MID, diff);
        } else {
            return ColorUtil.blend(ExpPainter.EXPCOLOR_UNEXPOSED, ExpPainter.EXPCOLOR_MID, diff * -1);
        }
    }

    constructor(data: number[], startIndex: number) {
        if (data == null || data.length === 0) {
            throw new Error('ExpPainter got empty array');
        }

        this._data = data.slice();

        this._dataMin = this._data[0];
        this._dataMax = this._data[0];
        this._dataAvg = this._data[0];

        this._startIdx = startIndex;

        this._continuous = false;
        this._extended = false;

        for (let ii = 1; ii < this._data.length; ii++) {
            this._dataMin = Math.min(this._dataMin, this._data[ii]);
            this._dataMax = Math.max(this._dataMax, this._data[ii]);

            this._dataAvg += this._data[ii];
        }

        this._dataAvg /= this._data.length;
    }

    public getColor(ii: number): number {
        if (ii < this._startIdx) {
            return ExpPainter.EXPCOLOR_NODATA;
        } else if (ii - this._startIdx >= this._data.length) {
            return ExpPainter.EXPCOLOR_NODATA;
        } else {
            let diff: number = (this._data[ii - this._startIdx] - this._dataAvg);

            if (diff > 0) {
                if (Math.abs(this._dataMax - this._dataAvg) < Constants.EPSILON) {
                    diff = 0;
                } else {
                    diff /= (this._dataMax - this._dataAvg);
                    diff = MathUtil.clamp(diff, 0, 1);
                }

                // / SUPER HACK - binary coloring
                if (!this._continuous) {
                    diff = 1;
                }

                return ColorUtil.blend(ExpPainter.EXPCOLOR_EXPOSED, ExpPainter.EXPCOLOR_MID, diff);
            } else {
                if (Math.abs(this._dataMin - this._dataAvg) < Constants.EPSILON) {
                    diff = 0;
                } else {
                    diff *= -1;
                    diff /= (this._dataAvg - this._dataMin);
                }

                // / SUPER HACK - binary coloring
                if (!this._continuous) {
                    diff = 1;
                }

                return ColorUtil.blend(ExpPainter.EXPCOLOR_UNEXPOSED, ExpPainter.EXPCOLOR_MID, diff);
            }
        }
    }

    public getColorWithMidpoint(ii: number, midpoint: number): number {
        if (ii < this._startIdx) {
            return ExpPainter.EXPCOLOR_NODATA;
        } else if (ii - this._startIdx >= this._data.length) {
            return ExpPainter.EXPCOLOR_NODATA;
        } else {
            let diff: number = (this._data[ii - this._startIdx] - midpoint);

            if (diff > 0) {
                if (Math.abs(this._dataMax - midpoint) < Constants.EPSILON) {
                    diff = 0;
                } else {
                    diff /= (this._dataMax - midpoint);
                    diff = MathUtil.clamp(diff, 0, 1);
                }
                // / SUPER HACK - binary coloring
                if (!this._continuous) {
                    diff = 1;
                }

                return ColorUtil.blend(ExpPainter.EXPCOLOR_EXPOSED, ExpPainter.EXPCOLOR_MID, diff);
            } else {
                if (Math.abs(this._dataMin - midpoint) < Constants.EPSILON) {
                    diff = 0;
                } else {
                    diff *= -1;
                    diff /= (midpoint - this._dataMin);
                }

                // / SUPER HACK - binary coloring
                if (!this._continuous) {
                    diff = 1;
                }

                return ColorUtil.blend(ExpPainter.EXPCOLOR_UNEXPOSED, ExpPainter.EXPCOLOR_MID, diff);
            }
        }
    }

    public getColorLevelWithMidpoint(jj: number, mid: number, hi: number): number {
        if (jj < this._startIdx || jj >= this._startIdx + this._data.length) {
            return ExpPainter.NUM_COLORS * 3 + 1;
        } else {
            let diff: number = (this._data[jj - this._startIdx] - hi);

            if (this._extended && diff > 0) {
                if (Math.abs(this._dataMax - hi) < Constants.EPSILON) {
                    return 2 * ExpPainter.NUM_COLORS;
                }

                if (!this._continuous) {
                    return ExpPainter.NUM_COLORS * 2;
                } else {
                    diff /= (this._dataMax - hi);
                    diff = MathUtil.clamp(diff, 0, 1);
                    return Math.round(ExpPainter.NUM_COLORS * diff) + 2 * ExpPainter.NUM_COLORS;
                }
            }

            diff = (this._data[jj - this._startIdx] - mid);

            if (diff > 0) {
                if (Math.abs(hi - mid) < Constants.EPSILON) {
                    return ExpPainter.NUM_COLORS;
                }

                // / SUPER HACK - binary coloring
                if (!this._continuous) {
                    return ExpPainter.NUM_COLORS * 2;
                } else {
                    diff /= (hi - mid);
                    diff = MathUtil.clamp(diff, 0, 1);
                    return Math.round(ExpPainter.NUM_COLORS * diff) + ExpPainter.NUM_COLORS;
                }
            } else {
                if (Math.abs(this._dataMin - mid) < Constants.EPSILON) {
                    return ExpPainter.NUM_COLORS;
                }

                // / SUPER HACK - binary coloring
                if (!this._continuous) {
                    return 0;
                } else {
                    diff *= -1;
                    diff /= (mid - this._dataMin);
                    diff = MathUtil.clamp(diff, 0, 1);
                    return Math.round(ExpPainter.NUM_COLORS * diff) * -1 + ExpPainter.NUM_COLORS;
                }
            }
        }
    }

    public getColorLevel(jj: number): number {
        if (jj < this._startIdx || jj >= this._startIdx + this._data.length) {
            return ExpPainter.NUM_COLORS * 3 + 1;
        } else {
            let diff: number = (this._data[jj - this._startIdx] - this._dataAvg);

            if (diff > 0) {
                // / SUPER HACK - binary coloring
                if (!this._continuous) {
                    return ExpPainter.NUM_COLORS * 2;
                } else {
                    diff /= (this._dataMax - this._dataAvg);
                    diff = MathUtil.clamp(diff, 0, 1);
                    return Math.round(ExpPainter.NUM_COLORS * diff) + ExpPainter.NUM_COLORS;
                }
            } else if (!this._continuous) {
                // / SUPER HACK - binary coloring
                return 0;
            } else {
                diff *= -1;
                diff /= (this._dataAvg - this._dataMin);
                diff = MathUtil.clamp(diff, 0, 1);

                return Math.round(ExpPainter.NUM_COLORS * diff) * -1 + ExpPainter.NUM_COLORS;
            }
        }
    }

    public set continuous(continuous: boolean) {
        this._continuous = continuous;
    }

    public set extendedScale(extended: boolean) {
        this._extended = extended;
    }

    private readonly _data: number[];
    private readonly _dataMin: number;
    private readonly _dataMax: number;
    private readonly _dataAvg: number;
    private readonly _startIdx: number;
    private _continuous: boolean;
    private _extended: boolean;

    private static readonly EXPCOLOR_OVEREXPOSED = 0xFF2200;
    private static readonly EXPCOLOR_EXPOSED = 0xFFFF00;
    private static readonly EXPCOLOR_MID = 0xFFFFFF;
    private static readonly EXPCOLOR_UNEXPOSED = 0x2222FF;

    private static readonly EXPCOLOR_NODATA = 0xAAAAAA;
}

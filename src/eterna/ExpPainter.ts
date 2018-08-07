import {Constants} from "./Constants";
import {ColorUtil} from "./util/ColorUtil";
import {MathUtil} from "../flashbang/util/MathUtil";

export class ExpPainter {
    public static NUM_COLORS: number = 5;

    public static transform_data(data: number[], data_max: number, data_min: number): number[] {
        let data_ret: number[] = data.slice();
        let abs_max: number = 2 * data_max - data_min;

        for (let ii: number = 0; ii < data_ret.length; ii++) {
            data_ret[ii] = MathUtil.clamp(data_ret[ii], data_min, abs_max);
        }

        return data_ret;
    }

    public static get_color_by_level(lev: number): number {
        if (lev > 2 * ExpPainter.NUM_COLORS) {
            return ExpPainter.EXPCOLOR_NODATA;
        }

        let diff: number = 1.0 / ExpPainter.NUM_COLORS * lev;

        if (diff > 1) {
            return ColorUtil.blend(ExpPainter.EXPCOLOR_OVEREXPOSED, ExpPainter.EXPCOLOR_EXPOSED, diff - 1);
        } else if (diff > 0) {
            return ColorUtil.blend(ExpPainter.EXPCOLOR_EXPOSED, ExpPainter.EXPCOLOR_MID, diff);
        } else {
            return ColorUtil.blend(ExpPainter.EXPCOLOR_UNEXPOSED, ExpPainter.EXPCOLOR_MID, diff * -1);
        }
    }

    constructor(data: number[], start_index: number) {
        if (data == null || data.length === 0) {
            throw new Error("ExpPainter got empty array");
        }

        this._data = data.slice();

        this._data_min = this._data[0];
        this._data_max = this._data[0];
        this._data_avg = this._data[0];

        this._start_index = start_index;

        this._continuous = false;
        this._extended = false;

        for (let ii: number = 1; ii < this._data.length; ii++) {
            this._data_min = Math.min(this._data_min, this._data[ii]);
            this._data_max = Math.max(this._data_max, this._data[ii]);

            this._data_avg += this._data[ii];
        }

        this._data_avg /= this._data.length;
    }

    public get_color(ii: number): number {
        if (ii < this._start_index) {
            return ExpPainter.EXPCOLOR_NODATA;
        } else if (ii - this._start_index >= this._data.length) {
            return ExpPainter.EXPCOLOR_NODATA;
        } else {
            let diff: number = (this._data[ii - this._start_index] - this._data_avg);

            if (diff > 0) {
                if (Math.abs(this._data_max - this._data_avg) < Constants.EPSILON) {
                    diff = 0;
                } else {
                    diff /= (this._data_max - this._data_avg);
                    diff = MathUtil.clamp(diff, 0, 1);
                }

                // / SUPER HACK - binary coloring
                if (!this._continuous) {
                    diff = 1;
                }

                return ColorUtil.blend(ExpPainter.EXPCOLOR_EXPOSED, ExpPainter.EXPCOLOR_MID, diff);
            } else {
                if (Math.abs(this._data_min - this._data_avg) < Constants.EPSILON) {
                    diff = 0;
                } else {
                    diff *= -1;
                    diff /= (this._data_avg - this._data_min);
                }

                // / SUPER HACK - binary coloring
                if (!this._continuous) {
                    diff = 1;
                }

                return ColorUtil.blend(ExpPainter.EXPCOLOR_UNEXPOSED, ExpPainter.EXPCOLOR_MID, diff);
            }
        }
    }

    public get_color_with_midpoint(ii: number, midpoint: number): number {
        if (ii < this._start_index) {
            return ExpPainter.EXPCOLOR_NODATA;
        } else if (ii - this._start_index >= this._data.length) {
            return ExpPainter.EXPCOLOR_NODATA;
        } else {
            let diff: number = (this._data[ii - this._start_index] - midpoint);

            if (diff > 0) {
                if (Math.abs(this._data_max - midpoint) < Constants.EPSILON) {
                    diff = 0;
                } else {
                    diff /= (this._data_max - midpoint);
                    diff = MathUtil.clamp(diff, 0, 1);
                }
                // / SUPER HACK - binary coloring
                if (!this._continuous) {
                    diff = 1;
                }

                return ColorUtil.blend(ExpPainter.EXPCOLOR_EXPOSED, ExpPainter.EXPCOLOR_MID, diff);
            } else {
                if (Math.abs(this._data_min - midpoint) < Constants.EPSILON) {
                    diff = 0;
                } else {
                    diff *= -1;
                    diff /= (midpoint - this._data_min);
                }

                // / SUPER HACK - binary coloring
                if (!this._continuous) {
                    diff = 1;
                }

                return ColorUtil.blend(ExpPainter.EXPCOLOR_UNEXPOSED, ExpPainter.EXPCOLOR_MID, diff);
            }
        }
    }

    public get_color_level_with_midpoint(jj: number, mid: number, hi: number): number {
        if (jj < this._start_index || jj >= this._start_index + this._data.length) {
            return ExpPainter.NUM_COLORS * 3 + 1;
        } else {
            let diff: number = (this._data[jj - this._start_index] - hi);

            if (this._extended && diff > 0) {
                if (Math.abs(this._data_max - hi) < Constants.EPSILON) {
                    return 2 * ExpPainter.NUM_COLORS;
                }

                if (!this._continuous) {
                    return ExpPainter.NUM_COLORS * 2;
                } else {
                    diff /= (this._data_max - hi);
                    diff = MathUtil.clamp(diff, 0, 1);
                    return Math.round(ExpPainter.NUM_COLORS * diff) + 2 * ExpPainter.NUM_COLORS;
                }
            }

            diff = (this._data[jj - this._start_index] - mid);

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
                if (Math.abs(this._data_min - mid) < Constants.EPSILON) {
                    return ExpPainter.NUM_COLORS;
                }

                // / SUPER HACK - binary coloring
                if (!this._continuous) {
                    return 0;
                } else {
                    diff *= -1;
                    diff /= (mid - this._data_min);
                    diff = MathUtil.clamp(diff, 0, 1);
                    return Math.round(ExpPainter.NUM_COLORS * diff) * -1 + ExpPainter.NUM_COLORS;
                }
            }
        }
    }

    public get_color_level(jj: number): number {
        if (jj < this._start_index || jj >= this._start_index + this._data.length) {
            return ExpPainter.NUM_COLORS * 3 + 1;
        } else {
            let diff: number = (this._data[jj - this._start_index] - this._data_avg);

            if (diff > 0) {
                // / SUPER HACK - binary coloring
                if (!this._continuous) {
                    return ExpPainter.NUM_COLORS * 2;
                } else {
                    diff /= (this._data_max - this._data_avg);
                    diff = MathUtil.clamp(diff, 0, 1);
                    return Math.round(ExpPainter.NUM_COLORS * diff) + ExpPainter.NUM_COLORS;
                }
            } else {
                // / SUPER HACK - binary coloring
                if (!this._continuous) {
                    return 0;
                } else {
                    diff *= -1;
                    diff /= (this._data_avg - this._data_min);
                    diff = MathUtil.clamp(diff, 0, 1);

                    return Math.round(ExpPainter.NUM_COLORS * diff) * -1 + ExpPainter.NUM_COLORS;
                }
            }
        }
    }

    public set_continuous(continuous: boolean): void {
        this._continuous = continuous;
    }

    public set_extended_scale(extended: boolean): void {
        this._extended = extended;
    }

    private readonly _data: number[];
    private readonly _data_min: number;
    private readonly _data_max: number;
    private readonly _data_avg: number;
    private readonly _start_index: number;
    private _continuous: boolean;
    private _extended: boolean;

    private static EXPCOLOR_OVEREXPOSED: number = 0xFF2200;
    private static EXPCOLOR_EXPOSED: number = 0xFFFF00;
    private static EXPCOLOR_MID: number = 0xFFFFFF;
    private static EXPCOLOR_UNEXPOSED: number = 0x2222FF;

    private static EXPCOLOR_NODATA: number = 0xAAAAAA;
}

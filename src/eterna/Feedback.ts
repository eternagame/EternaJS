export class Feedback {
    public static readonly EXPCODES: number[] = [1, -100, -200];
    public static readonly EXPSTRINGS: string[] = ["NOT SYNTHESIZED", "FAILED", "NOT INTERPRETABLE"];
    public static readonly EXPDISPLAYS: string[] = ["-", "<FONT COLOR='#FF3333'>Failed</FONT>", "<FONT COLOR='#FF33FF'>Unreadable</FONT>"];
    public static readonly EXPDISPLAYS_LONG: string[] = ["Not synthesized",
        "<B><FONT COLOR='#FF3333'>[FAILED..]</FONT></B> This design failed to synthesize in test tubes.",
        "<B><FONT COLOR='#FF33FF'>[Unreadable..]</FONT></B> The synthesis result of this was not interpretable."];
    public static readonly EXPSCORES: number[] = [0, 10, 15];

    public static score_feedback(shapedata: number[], secstruct: string, start_index: number, min: number, threshold: number, max: number): number {
        let score: number = 0;

        for (let ii: number = 0; ii < secstruct.length; ii++) {
            if (ii < start_index) {
                continue;
            }
            if (ii - start_index >= shapedata.length) {
                continue;
            }

            let char: string = secstruct.charAt(ii);

            if (char == ".") {
                if (shapedata[ii - start_index] > (threshold / 4 + min / 4 * 3)) {
                    score++;
                }
            } else {
                if (shapedata[ii - start_index] < threshold) {
                    score++;
                }
            }
        }

        return Math.round(score / shapedata.length * 100);
    }

    /// Ad-hoc object for Brent's theophylline puzzle
    public set_brent_theo_data(dat: Object): void {
        this._brent_theo_data = dat;
    }

    public get_brent_theo_data(): Object {
        return this._brent_theo_data;
    }

    public set_shape_data(dat: any[], index: number, threshold: Object, max: Object, min: Object, failed: string): void {
        if (dat != null) {

            this._shape_starts[index] = dat[0] - 1;
            dat.splice(0, 1);
            this._shape_data[index] = dat.slice();
            let shape_data: any[] = this._shape_data[index];

            let smax: number = shape_data[0];
            let smin: number = shape_data[0];
            let savg: number = shape_data[0];

            for (let ii: number = 0; ii < shape_data.length; ii++) {
                if (shape_data[ii] > smax) {
                    smax = shape_data[ii];
                }

                if (shape_data[ii] < smin) {
                    smin = shape_data[ii];
                }

                savg += shape_data[ii];
            }

            if (shape_data.length > 0) {
                savg /= shape_data.length;
            }

            if (threshold != null) {
                this._shape_thresholds[index] = threshold;
            } else {
                this._shape_thresholds[index] = savg;
            }

            if (max != null) {
                this._shape_maxs[index] = max;
            } else {
                this._shape_maxs[index] = smax;
            }

            if (min != null) {
                this._shape_mins[index] = min;
            } else {
                this._shape_mins[index] = smin;
            }
        } else if (failed != null) {
            this._faileds[index] = Feedback.EXPCODES[Feedback.EXPSTRINGS.indexOf(failed)];
        }
    }

    public get_shape_data(index: number = 0): number[] {
        if (this._shape_data[index] != null) {
            return this._shape_data[index];
        } else {
            let shape: number[] = [];
            shape.push(0.5);
            return shape;
        }
    }

    public get_shape_start_index(index: number = 0): number {
        if (this._shape_data[index] != null)
            return this._shape_starts[index];
        else
            return 0.5;
    }

    public get_shape_threshold(index: number = 0): number {
        if (this._shape_data[index] != null)
            return this._shape_thresholds[index];
        else
            return 0.5;
    }

    public get_shape_max(index: number = 0): number {
        if (this._shape_data[index] != null)
            return this._shape_maxs[index];
        else
            return 1.0;
    }

    public get_shape_min(index: number = 0): number {
        if (this._shape_data[index] != null)
            return this._shape_mins[index];
        else
            return 0.0;
    }

    public is_failed(index: number = 0): number {
        return this._faileds[index];
    }

    private _shape_data: any[] = [];
    private _shape_starts: any[] = [];
    private _shape_thresholds: any[] = [];
    private _shape_maxs: any[] = [];
    private _shape_mins: any[] = [];
    private _faileds: any[] = [];
    /// Ad-hoc data storage object for Brent's theophylline puzzle
    private _brent_theo_data: any = null;

}

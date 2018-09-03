export class Feedback {
    public static readonly EXPCODES: number[] = [1, -100, -200];
    public static readonly EXPSTRINGS: string[] = ["NOT SYNTHESIZED", "FAILED", "NOT INTERPRETABLE"];
    public static readonly EXPDISPLAYS: string[] = ["-", "<FONT COLOR='#FF3333'>Failed</FONT>", "<FONT COLOR='#FF33FF'>Unreadable</FONT>"];
    public static readonly EXPDISPLAYS_LONG: string[] = ["Not synthesized",
        "<B><FONT COLOR='#FF3333'>[FAILED..]</FONT></B> This design failed to synthesize in test tubes.",
        "<B><FONT COLOR='#FF33FF'>[Unreadable..]</FONT></B> The synthesis result of this was not interpretable."];

    public static readonly EXPSCORES: number[] = [0, 10, 15];

    public static scoreFeedback(shapedata: number[], secstruct: string, start_index: number, min: number, threshold: number, max: number): number {
        let score: number = 0;

        for (let ii: number = 0; ii < secstruct.length; ii++) {
            if (ii < start_index) {
                continue;
            }
            if (ii - start_index >= shapedata.length) {
                continue;
            }

            let char: string = secstruct.charAt(ii);

            if (char === ".") {
                if (shapedata[ii - start_index] > (threshold / 4 + min / 4 * 3)) {
                    score++;
                }
            } else if (shapedata[ii - start_index] < threshold) {
                score++;
            }
        }

        return Math.round(score / shapedata.length * 100);
    }

    // / Ad-hoc object for Brent's theophylline puzzle
    public set brentTheoData(dat: any) {
        this._brentTheoData = dat;
    }

    public get brentTheoData(): any {
        return this._brentTheoData;
    }

    public setShapeData(dat: number[], index: number, threshold: any, max: any, min: any, failed: string): void {
        if (dat != null) {
            this._shapeStarts[index] = dat[0] - 1;
            dat.splice(0, 1);
            this._shapeData[index] = dat.slice();
            let shape_data: number[] = this._shapeData[index];

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
                this._shapeThresholds[index] = threshold;
            } else {
                this._shapeThresholds[index] = savg;
            }

            if (max != null) {
                this._shapeMaxs[index] = max;
            } else {
                this._shapeMaxs[index] = smax;
            }

            if (min != null) {
                this._shapeMins[index] = min;
            } else {
                this._shapeMins[index] = smin;
            }
        } else if (failed != null) {
            this._faileds[index] = Feedback.EXPCODES[Feedback.EXPSTRINGS.indexOf(failed)];
        }
    }

    public getShapeData(index: number = 0): number[] {
        if (this._shapeData[index] != null) {
            return this._shapeData[index];
        } else {
            let shape: number[] = [];
            shape.push(0.5);
            return shape;
        }
    }

    public getShapeStartIndex(index: number = 0): number {
        if (this._shapeData[index] != null) return this._shapeStarts[index];
        else return 0.5;
    }

    public getShapeThreshold(index: number = 0): number {
        if (this._shapeData[index] != null) return this._shapeThresholds[index];
        else return 0.5;
    }

    public getShapeMax(index: number = 0): number {
        if (this._shapeData[index] != null) return this._shapeMaxs[index];
        else return 1.0;
    }

    public getShapeMin(index: number = 0): number {
        if (this._shapeData[index] != null) return this._shapeMins[index];
        else return 0.0;
    }

    public isFailed(index: number = 0): number {
        return this._faileds[index];
    }

    private _shapeData: number[][] = [];
    private _shapeStarts: number[] = [];
    private _shapeThresholds: number[] = [];
    private _shapeMaxs: number[] = [];
    private _shapeMins: number[] = [];
    private _faileds: number[] = [];
    // / Ad-hoc data storage object for Brent's theophylline puzzle
    private _brentTheoData: any = null;
}

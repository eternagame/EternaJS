export interface BrentTheoData {
    type: string;
    score: number;
    ribo_with_theo: number;
    ribo_without_theo: number;
}

export default class Feedback {
    public static readonly EXPCODES: number[] = [1, -100, -200];
    public static readonly EXPSTRINGS: string[] = ['NOT SYNTHESIZED', 'FAILED', 'NOT INTERPRETABLE'];
    public static readonly EXPDISPLAYS: string[] = [
        '-', "<FONT COLOR='#FF3333'>Failed</FONT>", "<FONT COLOR='#FF33FF'>Unreadable</FONT>"
    ];

    public static readonly EXPDISPLAYS_LONG: string[] = ['Not synthesized',
        "<B><FONT COLOR='#FF3333'>[FAILED..]</FONT></B> This design failed to synthesize in test tubes.",
        "<B><FONT COLOR='#FF33FF'>[Unreadable..]</FONT></B> The synthesis result of this was not interpretable."];

    public static readonly EXPSCORES: number[] = [0, 10, 15];

    public static scoreFeedback(
        shapedata: number[], secstruct: string, startIndex: number, min: number, threshold: number, max: number
    ): number {
        let score = 0;

        for (let ii = 0; ii < secstruct.length; ii++) {
            if (ii < startIndex) {
                continue;
            }
            if (ii - startIndex >= shapedata.length) {
                continue;
            }

            let char: string = secstruct.charAt(ii);

            if (char === '.') {
                if (shapedata[ii - startIndex] > (threshold / 4 + (min / 4) * 3)) {
                    score++;
                }
            } else if (shapedata[ii - startIndex] < threshold) {
                score++;
            }
        }

        return Math.round((score / shapedata.length) * 100);
    }

    // / Ad-hoc object for Brent's theophylline puzzle
    public set brentTheoData(dat: BrentTheoData | undefined) {
        this._brentTheoData = dat;
    }

    public get brentTheoData(): BrentTheoData | undefined {
        return this._brentTheoData;
    }

    public setShapeData(
        dat: number[] | null, index: number,
        threshold: number | null, max: number | null, min: number | null, failed: string | null
    ): void {
        if (dat != null) {
            this._shapeStarts[index] = dat[0] - 1;
            dat.splice(0, 1);
            this._shapeData[index] = dat.slice();
            let shapeData: number[] = this._shapeData[index];

            let smax: number = shapeData[0];
            let smin: number = shapeData[0];
            let savg: number = shapeData[0];

            for (let ii = 0; ii < shapeData.length; ii++) {
                if (shapeData[ii] > smax) {
                    smax = shapeData[ii];
                }

                if (shapeData[ii] < smin) {
                    smin = shapeData[ii];
                }

                savg += shapeData[ii];
            }

            if (shapeData.length > 0) {
                savg /= shapeData.length;
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
        return index < this._faileds.length ? this._faileds[index] : 0;
    }

    private _shapeData: number[][] = [];
    private _shapeStarts: number[] = [];
    private _shapeThresholds: number[] = [];
    private _shapeMaxs: number[] = [];
    private _shapeMins: number[] = [];
    private _faileds: number[] = [];
    // / Ad-hoc data storage object for Brent's theophylline puzzle
    private _brentTheoData: BrentTheoData | undefined = undefined;
}

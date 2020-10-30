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

    // / Ad-hoc object for Brent's theophylline puzzle
    public set brentTheoData(dat: BrentTheoData | undefined) {
        this._brentTheoData = dat;
    }

    public get brentTheoData(): BrentTheoData | undefined {
        return this._brentTheoData;
    }

    public setShapeData(
        dat: number[] | null, condition: string, index: number,
        threshold: number | null, max: number | null, min: number | null, failed: string | null
    ): void {
        if (dat != null) {
            if (this._shapeStarts.get(condition) === undefined) {
                this._shapeStarts.set(condition, []);
            }
            const shapeStarts = this._shapeStarts.get(condition);
            if (shapeStarts !== undefined) {
                shapeStarts[index] = dat[0] - 1;
            }

            dat.splice(0, 1);
            if (this._shapeData.get(condition) === undefined) {
                this._shapeData.set(condition, []);
            }
            const shapeDatas = this._shapeData.get(condition);
            let shapeData: number[] = [];
            if (shapeDatas !== undefined) {
                shapeDatas[index] = dat.slice();
                shapeData = shapeDatas[index];
            }

            const smax: number = Math.max(...shapeData);
            const smin: number = Math.min(...shapeData);
            const savg: number = shapeData.length > 0
                ? shapeData.reduce((sum, item) => sum + item) / shapeData.length
                : 0;

            if (this._shapeThresholds.get(condition) === undefined) {
                this._shapeThresholds.set(condition, []);
            }
            const shapeThreshold = this._shapeThresholds.get(condition);
            if (threshold != null && shapeThreshold !== undefined) {
                shapeThreshold[index] = threshold;
            } else if (shapeThreshold !== undefined) {
                shapeThreshold[index] = savg;
            }

            if (this._shapeMaxs.get(condition) === undefined) {
                this._shapeMaxs.set(condition, []);
            }
            const shapeMaxs = this._shapeMaxs.get(condition);
            if (max != null && shapeMaxs !== undefined) {
                shapeMaxs[index] = max;
            } else if (shapeMaxs !== undefined) {
                shapeMaxs[index] = smax;
            }

            if (this._shapeMins.get(condition) === undefined) {
                this._shapeMins.set(condition, []);
            }
            const shapeMins = this._shapeMins.get(condition);
            if (shapeMins !== undefined) {
                if (min != null) {
                    shapeMins[index] = min;
                } else if (shapeMins !== undefined) {
                    shapeMins[index] = smin;
                }
            }
        } else if (failed != null) {
            if (this._faileds.get(condition) === undefined) {
                this._faileds.set(condition, []);
            }
            const faileds = this._faileds.get(condition);
            if (faileds !== undefined) {
                faileds[index] = Feedback.EXPCODES[Feedback.EXPSTRINGS.indexOf(failed)];
            }
        }
    }

    public setDegradationData(
        dat: number[] | null, condition: string, index: number,
        _error: number[] | null, _stnCat: string | null, _stn: number | null, failed: string | null
    ): void {
        if (dat != null) {
            if (this._degradationStarts.get(condition) === undefined) {
                this._degradationStarts.set(condition, []);
            }
            const degradationStarts = this._degradationStarts.get(condition);
            if (degradationStarts !== undefined) {
                degradationStarts[index] = dat[0] - 1;
            }
            dat.splice(0, 1);
            if (this._degradationData.get(condition) === undefined) {
                this._degradationData.set(condition, []);
            }
            const degradationDatas = this._degradationData.get(condition);
            let degradationData: number[] = [];
            if (degradationDatas !== undefined) {
                degradationDatas[index] = dat.slice();
                degradationData = degradationDatas[index];
            }

            let smax: number = degradationData[0];
            let smin: number = degradationData[0];
            let savg: number = degradationData[0];

            for (let ii = 0; ii < degradationData.length; ii++) {
                if (degradationData[ii] > smax) {
                    smax = degradationData[ii];
                }

                if (degradationData[ii] < smin) {
                    smin = degradationData[ii];
                }

                savg += degradationData[ii];
            }

            if (degradationData.length > 0) {
                savg /= degradationData.length;
            }

            if (this._degradationThresholds.get(condition) === undefined) {
                this._degradationThresholds.set(condition, []);
            }
            const degradationThreshold = this._degradationThresholds.get(condition);
            // if (threshold != null && shapeThreshold !== undefined) {
            //     shapeThreshold[index] = threshold;
            // } else
            if (degradationThreshold !== undefined) {
                degradationThreshold[index] = savg;
            }

            if (this._degradationMaxs.get(condition) === undefined) {
                this._degradationMaxs.set(condition, []);
            }
            const degradationMax = this._degradationMaxs.get(condition);
            // if (max != null && shapeMaxs !== undefined) {
            //     shapeMaxs[index] = max;
            // } else
            if (degradationMax !== undefined) {
                degradationMax[index] = smax;
            }

            if (this._degradationMins.get(condition) === undefined) {
                this._degradationMins.set(condition, []);
            }
            const degradationMin = this._degradationMins.get(condition);
            // if (shapeMins !== undefined) {
            //     if (min != null) {
            //         shapeMins[index] = min;
            //     } else
            if (degradationMin !== undefined) {
                degradationMin[index] = smin;
            }
            // }
        } else if (failed != null) {
            if (this._faileds.get(condition) === undefined) {
                this._faileds.set(condition, []);
            }
            const faileds = this._faileds.get(condition);
            if (faileds !== undefined) {
                faileds[index] = Feedback.EXPCODES[Feedback.EXPSTRINGS.indexOf(failed)];
            }
        }
    }

    public getShapeData(index: number = 0, condition: string = 'SHAPE'): number[] {
        const shapeData = this._shapeData.get(condition);
        if (shapeData === undefined) {
            return [0.5];
        }
        if (shapeData[index] != null) {
            return shapeData[index];
        } else {
            const shape: number[] = [];
            shape.push(0.5);
            return shape;
        }
    }

    public getShapeStartIndex(index: number = 0, condition: string = 'SHAPE'): number {
        const shapeStarts = this._shapeStarts.get(condition);
        if (shapeStarts === undefined) {
            return 0.5;
        }
        if (shapeStarts[index] != null) return shapeStarts[index];
        else return 0.5;
    }

    public getShapeThreshold(index: number = 0, condition: string = 'SHAPE'): number {
        const shapeThresholds = this._shapeThresholds.get(condition);
        if (shapeThresholds === undefined) {
            return 0.5;
        }
        if (shapeThresholds[index] != null) return shapeThresholds[index];
        else return 0.5;
    }

    public getShapeMax(index: number = 0, condition: string = 'SHAPE'): number {
        const shapeMaxs = this._shapeMaxs.get(condition);
        if (shapeMaxs === undefined) {
            return 1.0;
        }
        if (shapeMaxs[index] != null) return shapeMaxs[index];
        else return 1.0;
    }

    public getShapeMin(index: number = 0, condition: string = 'SHAPE'): number {
        const shapeMins = this._shapeMins.get(condition);
        if (shapeMins === undefined) {
            return 0.0;
        }
        if (shapeMins[index] != null) return shapeMins[index];
        else return 0.0;
    }

    public getDegradationData(index: number = 0, condition: string): number[] {
        const degradationData = this._degradationData.get(condition);
        if (degradationData === undefined) {
            return [0.5];
        }
        if (degradationData[index] != null) {
            return degradationData[index];
        } else {
            const shape: number[] = [];
            shape.push(0.5);
            return shape;
        }
    }

    public getDegradationStartIndex(index: number = 0, condition: string): number {
        const degradationStarts = this._degradationStarts.get(condition);
        if (degradationStarts === undefined) {
            return 0.5;
        }
        if (degradationStarts[index] != null) return degradationStarts[index];
        else return 0.5;
    }

    public getDegradationThreshold(index: number = 0, condition: string): number {
        const degradationThresholds = this._degradationThresholds.get(condition);
        if (degradationThresholds === undefined) {
            return 0.5;
        }
        if (degradationThresholds[index] != null) return degradationThresholds[index];
        else return 0.5;
    }

    public getDegradationMax(index: number = 0, condition: string): number {
        const degradationMaxs = this._degradationMaxs.get(condition);
        if (degradationMaxs === undefined) {
            return 1.0;
        }
        if (degradationMaxs[index] != null) return degradationMaxs[index];
        else return 1.0;
    }

    public getDegradationMin(index: number = 0, condition: string): number {
        const degradationMins = this._degradationMins.get(condition);
        if (degradationMins === undefined) {
            return 0.0;
        }
        if (degradationMins[index] != null) return degradationMins[index];
        else return 0.0;
    }

    public isFailed(index: number = 0, condition: string = 'SHAPE'): number {
        const faileds = this._faileds.get(condition);
        if (faileds === undefined) {
            return 0;
        }
        return index < faileds.length ? faileds[index] : 0;
    }

    public get conditions(): string[] {
        const conds = ['SHAPE'];
        return Array.prototype.concat(conds, Array.from(this._degradationData.keys()));
    }

    private _shapeData: Map<string, number[][]> = new Map<string, number[][]>();
    private _shapeStarts: Map<string, number[]> = new Map<string, number[]>();
    private _shapeThresholds: Map<string, number[]> = new Map<string, number[]>();
    private _shapeMaxs: Map<string, number[]> = new Map<string, number[]>();
    private _shapeMins: Map<string, number[]> = new Map<string, number[]>();

    private _degradationData: Map<string, number[][]> = new Map<string, number[][]>();
    private _degradationStarts: Map<string, number[]> = new Map<string, number[]>();
    private _degradationThresholds: Map<string, number[]> = new Map<string, number[]>();
    private _degradationMaxs: Map<string, number[]> = new Map<string, number[]>();
    private _degradationMins: Map<string, number[]> = new Map<string, number[]>();
    // private _degradationErrors: Map<string, number[][]> = new Map<string, number[][]>();
    // private _degradationStnCats: Map<string, string[]> = new Map<string, string[]>();
    // private _degradationStns: Map<string, number[]> = new Map<string, number[]>();

    private _faileds: Map<string, number[]> = new Map<string, number[]>();
    // / Ad-hoc data storage object for Brent's theophylline puzzle
    private _brentTheoData: BrentTheoData | undefined = undefined;
}

import {MathUtil, ColorUtil} from 'flashbang';
import Constants from 'eterna/Constants';
import {Tensor, InferenceSession} from 'onnxjs';
import EPars from './EPars';
// import {score} from './prediction/xgbr_deg_1day_pH10';

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

    private static getMotifs(pairs: number[]) {
        // set all paired bases to S
        // set unpaired bases to the appropriate motif
        let motifs = [];
        let base = 0;
        let endbase = pairs.length - 1;
        while (pairs[endbase] === -1) {
            motifs[endbase] = 'E';
            endbase--;
        }
        while (pairs[base] === -1) {
            motifs[base] = 'E';
            base++;
        }
        let xbase = base;
        while (xbase < endbase) {
            if (pairs[xbase] > -1) {
                xbase = pairs[xbase] + 1;
            } else {
                motifs[xbase] = 'X';
                xbase++;
            }
        }
        while (base <= endbase) {
            if (pairs[base] > -1) {
                motifs[base] = 'S';
                base++;
            } else {
                xbase = base;
                // eslint-disable-next-line no-empty
                while (pairs[++base] === -1) {}
                // eslint-disable-next-line no-empty
                if (motifs[xbase] === 'X') {
                // check if this is a hairpin
                } else if (pairs[base] === xbase - 1) {
                    while (xbase < base) { motifs[xbase] = 'H'; xbase++; }
                // check if this is a bulge
                } else if (pairs[pairs[base] + 1] === xbase - 1) {
                    while (xbase < base) { motifs[xbase] = 'B'; xbase++; }
                // this is either an internal loop or a multiloop
                } else {
                    let ibase = pairs[base];
                    // eslint-disable-next-line no-empty
                    while (pairs[++ibase] === -1) {}
                    // check if this is an internal loop
                    if (pairs[ibase] === xbase - 1) {
                        while (xbase < base) {
                            motifs[xbase] = 'I';
                            xbase++;
                        }
                    // must be a multiloop
                    } else {
                        while (xbase < base) {
                            motifs[xbase] = 'M';
                            xbase++;
                        }
                    }
                }
            }
        }

        return motifs;
    }

    public static windowedOhe(seq: string, struct: string, windowSize: number) {
        // feature_kernel=[]
        // if seq:
        //     feature_kernel.extend(['A','U','G','C'])
        // if struct:
        //     feature_kernel.extend(['H','E','I','M','B','S','X'])
        // if use_bpps:
        //     feature_kernel.extend(list(range(pad, MAX_LEN)))

        // feature_names = ['%s_%d' % (k, val) for val in range(-1*window_size, window_size+1) for k in feature_kernel]
        const MAX_LEN = 68;
        const pad = 10;

        const bpRNA = ExpPainter.getMotifs(EPars.parenthesisToPairs(struct));

        const arr = new Array(MAX_LEN).fill(0).map(() => new Array(11).fill(0));
        // np.zeros([MAX_LEN,len(feature_kernel)])
        // seq_bpps = get_bpps(row['ID'])

        for (let index = pad; index < MAX_LEN; ++index) {
            let ctr = 0;

            for (let char of ['A', 'U', 'G', 'C']) {
                if (seq[index] === char) {
                    arr[index][ctr] = 1;
                }
                ctr += 1;
            }

            for (let char of ['H', 'E', 'I', 'M', 'B', 'S', 'X']) {
                if (bpRNA[index] === char) {
                    arr[index][ctr] += 1;
                }
                ctr += 1;
            }

            // if use_bpps:
            //     for ii in range(pad,MAX_LEN):
            //         arr[index, ctr] = seq_bpps[index, ii]
            //         ctr += 1
        }

        // add zero padding to the side
        const padding: number[][] = new Array(windowSize).fill(0).map(() => new Array(11).fill(0));
        const paddedArr: number[][] = [];
        for (const row of padding) {
            paddedArr.push(row);
        }
        for (const row of arr.slice(pad)) {
            paddedArr.push(row);
        }
        for (const row of padding) {
            paddedArr.push(row);
        }
        // padded_arr = np.vstack([np.zeros([windowSize,11]),arr[pad:], np.zeros([windowSize,11])])

        let inpts: number[][] = [];
        for (let index = pad; index < MAX_LEN; ++index) {
            const newIndex = index + windowSize - pad;
            let tmp = paddedArr.slice(newIndex - windowSize, newIndex + windowSize + 1);
            // inpts.push(tmp.flat());
            // outpts.append(row[data_type][index])
            // inpts.push([].concat(...tmp));
            inpts.push(tmp.reduce((acc, val) => acc.concat(val), []));
        }

        return inpts; // .reduce((acc, val) => acc.concat(val), []); // np.array(inpts), outpts, feature_names
    }

    // public static async getDegData(seq: string, struct: string): Promise<number[]> {
    public static getDegData(seq: string, struct: string): number[] {
        // ohe seq + string in windows
        const vec = ExpPainter.windowedOhe(seq, struct, 20);
        return [0]; // vec.map((v) => score(v));
        // const session = new InferenceSession();
        // const url = 'assets/HGBR_deg_1week_50C.onnx';
        // await session.loadModel(url);
        // const inputs = [
        //     new Tensor(new Float32Array(vec), 'float32', [58, 451])
        // ];
        // const outputMap = await session.run(inputs);
        // const outputTensorData = outputMap.values().next().value.data;
        // return outputTensorData;
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

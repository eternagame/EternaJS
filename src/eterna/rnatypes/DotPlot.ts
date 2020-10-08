export default class DotPlot {
    // Methods: should get bpp from i to j
    constructor(data: number[]) {
        this._data = data.slice();
    }

    public get data(): number[] {
        return this._data;
    }

    private _data: number[];
}

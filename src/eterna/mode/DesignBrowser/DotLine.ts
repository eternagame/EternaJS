import {Graphics} from 'pixi.js';

export default class DotLine extends Graphics {
    constructor(thickness: number, color: number) {
        super();
        this._thickness = thickness;
        this._color = color;
    }

    public get length(): number {
        return this._length;
    }

    public set length(value: number) {
        if (this._length === value) {
            return;
        }
        this._length = value;

        this.clear();
        this.lineStyle(this._thickness, this._color);

        let wWalker = 0;
        let index = 0;
        while (1) {
            let lenToGo = 0;
            if (index % 3 === 0) {
                lenToGo = DotLine.LONG_LEN;
            } else {
                lenToGo = DotLine.SHORT_LEN;
            }

            if (lenToGo + wWalker >= this._length) {
                lenToGo = this._length - lenToGo;
                break;
            }

            this.moveTo(wWalker, 0);
            this.lineTo(wWalker + lenToGo, 0);

            wWalker += lenToGo + DotLine.SHORT_LEN;
            index++;
        }
    }

    private readonly _thickness: number;
    private readonly _color: number;

    private _length: number = 0;

    private static readonly LONG_LEN = 15;
    private static readonly SHORT_LEN = 5;
}

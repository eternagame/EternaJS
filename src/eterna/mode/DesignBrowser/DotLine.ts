import {Graphics} from "pixi.js";

export class DotLine extends Graphics {
    public constructor(thickness: number, color: number) {
        super();
        this._thickness = thickness;
        this._color = color;
    }

    public get length(): number {
        return this._length;
    }

    public set length(value: number) {
        if (this._length == value) {
            return;
        }
        this._length = value;

        this.clear();
        this.lineStyle(this._thickness, this._color);

        let w_walker = 0;
        let index = 0;
        while (1) {
            let len_to_go: number = 0;
            if (index % 3 == 0) {
                len_to_go = DotLine.LONG_LEN;
            } else {
                len_to_go = DotLine.SHORT_LEN;
            }

            if (len_to_go + w_walker >= this._length) {
                len_to_go = this._length - len_to_go;
                break;
            }

            this.moveTo(w_walker, 0);
            this.lineTo(w_walker + len_to_go, 0);

            w_walker += len_to_go + DotLine.SHORT_LEN;
            index++;
        }
    }

    private readonly _thickness: number;
    private readonly _color: number;

    private _length: number = 0;

    private static readonly LONG_LEN = 15;
    private static readonly SHORT_LEN = 5;
}

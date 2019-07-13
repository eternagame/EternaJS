import {Graphics, DisplayObject} from 'pixi.js';
import {GameObject, Flashbang, Updatable} from 'flashbang';
import EPars from 'eterna/EPars';

export default class PaintCursor extends GameObject implements Updatable {
    constructor() {
        super();
        this._graphics = new Graphics();
        this._color = PaintCursor.WHITE;
        this._outColor = PaintCursor.NULL;
    }

    /* override */
    public get display(): DisplayObject {
        return this._graphics;
    }

    public setColor(col: number): void {
        this._color = col;
    }

    public setShape(shape: number): void {
        switch (shape) {
            case EPars.RNABASE_ADENINE:
                this._color = PaintCursor.YELLOW;
                this._outColor = PaintCursor.NULL;
                break;

            case EPars.RNABASE_URACIL:
                this._color = PaintCursor.BLUE;
                this._outColor = PaintCursor.NULL;
                break;

            case EPars.RNABASE_DELETE:
            case EPars.RNABASE_GUANINE:
                this._color = PaintCursor.RED;
                this._outColor = PaintCursor.NULL;
                break;

            case EPars.RNABASE_CYTOSINE:
                this._color = PaintCursor.GREEN;
                this._outColor = PaintCursor.NULL;
                break;

            case EPars.RNABASE_AU_PAIR:
                this._color = PaintCursor.YELLOW;
                this._outColor = PaintCursor.BLUE;
                break;

            case EPars.RNABASE_GU_PAIR:
                this._color = PaintCursor.BLUE;
                this._outColor = PaintCursor.RED;
                break;

            case EPars.RNABASE_GC_PAIR:
                this._color = PaintCursor.RED;
                this._outColor = PaintCursor.GREEN;
                break;

            case EPars.RNABASE_ADD_BASE:
            case EPars.RNABASE_ADD_PAIR:
                this._color = PaintCursor.YELLOW;
                this._outColor = PaintCursor.NULL;
                break;

            default:
                this._color = PaintCursor.WHITE;
                this._outColor = PaintCursor.NULL;
        }
    }

    /* override */
    public update(dt: number): void {
        this._graphics.clear();

        let ic: number = this._color;
        let oc: number = this._outColor;

        if (Flashbang.app.isShiftKeyDown) {
            ic = PaintCursor.NULL;
            oc = PaintCursor.GREY;
        } else if (Flashbang.app.isAltKeyDown) {
            ic = PaintCursor.CYAN;
            oc = PaintCursor.NULL;
        }

        if (oc !== PaintCursor.NULL) {
            this._graphics.beginFill(ic, 0);
            this._graphics.lineStyle(4, oc, 0.5);
            this._graphics.drawCircle(0, 0, 8 + 3 * Math.cos(new Date().getTime() / 300.0));
            this._graphics.endFill();

            this._graphics.beginFill(ic, 0.5);
            this._graphics.lineStyle(0, 0x0, 0.0);
            this._graphics.drawCircle(0, 0, 6 + 3 * Math.cos(new Date().getTime() / 300.0));
            this._graphics.endFill();
        } else {
            this._graphics.beginFill(ic, 0.5);
            this._graphics.drawCircle(0, 0, 10 + 3 * Math.cos(new Date().getTime() / 300.0));
            this._graphics.endFill();
        }
    }

    private readonly _graphics: Graphics;
    private _color: number;
    private _outColor: number;

    private static readonly YELLOW = 0xFFFF00;
    private static readonly BLUE = 0x0000FF;
    private static readonly RED = 0xFF0000;
    private static readonly GREEN = 0x00FF00;
    private static readonly WHITE = 0xFFFFFF;
    private static readonly CYAN = 0x7EFFFF;
    private static readonly GREY = 0xC0C0C0;
    private static readonly NULL = 0x0;
}

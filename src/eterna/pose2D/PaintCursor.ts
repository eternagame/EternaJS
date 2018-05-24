import {Graphics, DisplayObject} from "pixi.js";
import {Flashbang} from "../../flashbang/core/Flashbang";
import {GameObject} from "../../flashbang/core/GameObject";
import {Updatable} from "../../flashbang/core/Updatable";
import {EPars} from "../EPars";

class PaintCursor extends GameObject implements Updatable {
    public constructor() {
        super();
        this._graphics = new Graphics();
        this._color = PaintCursor.WHITE;
        this._outer_color = PaintCursor.NULL;
    }

    /*override*/
    public get display(): DisplayObject {
        return this._graphics;
    }

    public set_color(col: number): void {
        this._color = col;
    }

    public set_shape(shape: number): void {
        switch (shape) {
        case EPars.RNABASE_ADENINE:
            this._color = PaintCursor.YELLOW;
            this._outer_color = PaintCursor.NULL;
            break;

        case EPars.RNABASE_URACIL:
            this._color = PaintCursor.BLUE;
            this._outer_color = PaintCursor.NULL;
            break;

        case EPars.RNABASE_DELETE:
        case EPars.RNABASE_GUANINE:
            this._color = PaintCursor.RED;
            this._outer_color = PaintCursor.NULL;
            break;

        case EPars.RNABASE_CYTOSINE:
            this._color = PaintCursor.GREEN;
            this._outer_color = PaintCursor.NULL;
            break;

        case EPars.RNABASE_AU_PAIR:
            this._color = PaintCursor.YELLOW;
            this._outer_color = PaintCursor.BLUE;
            break;

        case EPars.RNABASE_GU_PAIR:
            this._color = PaintCursor.BLUE;
            this._outer_color = PaintCursor.RED;
            break;

        case EPars.RNABASE_GC_PAIR:
            this._color = PaintCursor.RED;
            this._outer_color = PaintCursor.GREEN;
            break;

        case EPars.RNABASE_ADD_BASE:
        case EPars.RNABASE_ADD_PAIR:
            this._color = PaintCursor.YELLOW;
            this._outer_color = PaintCursor.NULL;
            break;

        default:
            this._color = PaintCursor.WHITE;
            this._outer_color = PaintCursor.NULL;
        }
    }

    /*override*/
    public update(dt: number): void {
        this._graphics.clear();

        let ic: number = this._color;
        let oc: number = this._outer_color;

        if (Flashbang.app.isShiftKeyDown) {
            ic = PaintCursor.NULL;
            oc = PaintCursor.GREY;
        } else if (Flashbang.app.isAltKeyDown) {
            ic = PaintCursor.CYAN;
            oc = PaintCursor.NULL;
        }

        if (oc != PaintCursor.NULL) {
            this._graphics.beginFill(ic, 0);
            this._graphics.lineStyle(4, oc, 0.5);
            this._graphics.drawCircle(0, 0, 8 + 3 * Math.cos(this.mode.time / 300.0));
            this._graphics.endFill();

            this._graphics.beginFill(ic, 0.5);
            this._graphics.lineStyle(0, 0x0, 0.0);
            this._graphics.drawCircle(0, 0, 6 + 3 * Math.cos(this.mode.time / 300.0));
            this._graphics.endFill();
        } else {
            this._graphics.beginFill(ic, 0.5);
            this._graphics.drawCircle(0, 0, 10 + 3 * Math.cos(this.mode.time / 300.0));
            this._graphics.endFill();
        }
    }

    private readonly _graphics: Graphics;
    private _color: number;
    private _outer_color: number;

    private static YELLOW: number = 0xFFFF00;
    private static BLUE: number = 0x0000FF;
    private static RED: number = 0xFF0000;
    private static GREEN: number = 0x00FF00;
    private static WHITE: number = 0xFFFFFF;
    private static CYAN: number = 0x7EFFFF;
    private static GREY: number = 0xC0C0C0;
    private static NULL: number = 0x0;
}


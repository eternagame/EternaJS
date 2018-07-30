import {SceneObject} from "../../flashbang/objects/SceneObject";
import {Graphics} from "pixi.js";
import {GraphicsUtil} from "../util/GraphicsUtil";

export class RScriptArrow extends SceneObject {
    public constructor(triSize: number = 75, baseLength: number = 60, outlineColor: number = 0xDAE8F6, fillColor: number = 0xDAE8F6) {
        let graphics = new Graphics();
        super(graphics);

        this._graphics = graphics;
        this._triSize = triSize;
        this._baseLength = baseLength;
        this._outlineColor = outlineColor;
        this._fillColor = fillColor;
        this._needsRedraw = true;
        this.redrawIfDirty();
    }

    public get triSize(): number { return this._triSize; }
    public get baseLength(): number { return this._baseLength; }
    public get outlineColor(): number { return this._outlineColor; }
    public get fillColor(): number { return this._fillColor; }

    public redrawIfDirty(): void {
        if (this._needsRedraw) {
            GraphicsUtil.drawArrow(this._triSize, this._baseLength, this._outlineColor, this._fillColor, this._graphics);
            this._needsRedraw = false;
        }
    }

    public set triSize(value: number) {
        if (this._triSize != value) {
            this._triSize = value;
            this._needsRedraw = true;
        }
    }

    public set baseLength(value: number) {
        if (this._baseLength != value) {
            this._baseLength = value;
            this._needsRedraw = true;
        }
    }

    public set outlineColor(value: number) {
        if (this._outlineColor != value) {
            this._outlineColor = value;
            this._needsRedraw = true;
        }
    }

    public set fillColor(value: number) {
        if (this._fillColor != value) {
            this._fillColor = value;
            this._needsRedraw = true;
        }
    }

    private readonly _graphics: Graphics;

    private _triSize: number;
    private _baseLength: number;
    private _outlineColor: number;
    private _fillColor: number;
    private _needsRedraw: boolean;
}

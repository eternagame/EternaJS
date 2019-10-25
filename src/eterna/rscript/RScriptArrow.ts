import {Graphics} from 'pixi.js';
import {SceneObject, MathUtil} from 'flashbang';
import GraphicsUtil from 'eterna/util/GraphicsUtil';

export default class RScriptArrow extends SceneObject {
    constructor(
        triSize: number = 75, baseLength: number = 60, outlineColor: number = 0xDAE8F6, fillColor: number = 0xDAE8F6
    ) {
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

    public get rotation(): number {
        return MathUtil.rad2Deg * this.display.rotation;
    }

    public set rotation(degrees: number) {
        this.display.rotation = MathUtil.deg2Rad * degrees;
    }

    public redrawIfDirty(): void {
        if (this._needsRedraw) {
            GraphicsUtil.drawArrow(
                this._triSize, this._baseLength, this._outlineColor, this._fillColor, this._graphics
            );
            this._needsRedraw = false;
        }
    }

    public set triSize(value: number) {
        if (this._triSize !== value) {
            this._triSize = value;
            this._needsRedraw = true;
        }
    }

    public get triSize(): number { return this._triSize; }

    public set baseLength(value: number) {
        if (this._baseLength !== value) {
            this._baseLength = value;
            this._needsRedraw = true;
        }
    }

    public get baseLength(): number { return this._baseLength; }

    public set outlineColor(value: number) {
        if (this._outlineColor !== value) {
            this._outlineColor = value;
            this._needsRedraw = true;
        }
    }

    public get outlineColor(): number { return this._outlineColor; }

    public set fillColor(value: number) {
        if (this._fillColor !== value) {
            this._fillColor = value;
            this._needsRedraw = true;
        }
    }

    public get fillColor(): number { return this._fillColor; }

    private readonly _graphics: Graphics;

    private _triSize: number;
    private _baseLength: number;
    private _outlineColor: number;
    private _fillColor: number;
    private _needsRedraw: boolean;
}

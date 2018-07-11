import {GlowFilter} from "pixi-filters";
import {Graphics, Point} from "pixi.js";
import {Vector2} from "../../flashbang/geom/Vector2";
import {SceneObject} from "../../flashbang/objects/SceneObject";
import {AlphaTask} from "../../flashbang/tasks/AlphaTask";
import {SerialTask} from "../../flashbang/tasks/SerialTask";
import {VisibleTask} from "../../flashbang/tasks/VisibleTask";
import {EPars} from "../EPars";

export class LightRay extends SceneObject {
    constructor(color: number = 0xFFFF00) {
        let graphics = new Graphics();
        super(graphics);
        this._graphics = graphics;

        this.set_color(color);
    }

    public fadeIn(): void {
        this.display.alpha = 0;
        this.replaceNamedObject(LightRay.ANIM, new AlphaTask(1, 0.5));
    }

    public fadeOutAndHide(): void {
        this.replaceNamedObject(LightRay.ANIM, new SerialTask(
            new AlphaTask(0, 1.5),
            new VisibleTask(false)
        ));
    }

    public draw_ray(from_to: Point): void {
        const v: Vector2 = Vector2.fromPoint(from_to);
        const len: number = v.length;

        this._graphics.clear();
        this._graphics.lineStyle(0, 0, 0);

        // let matrix: Matrix = new Matrix;
        // matrix.createGradientBox(len + 37, 40);
        // this.beginGradientFill("linear", [0xFFFFFF, 0xFFFFFF], [1, 0], [0, 255], matrix);

        this._graphics.beginFill(0xffffff, 0.8);
        this._graphics.moveTo(0, 2);
        this._graphics.lineTo(len, 30);
        for (let ii: number = 1; ii <= 7; ii++) {
            let lineAngle: number = Math.PI * (ii - 4) / 8;
            this._graphics.lineTo(len + Math.cos(lineAngle) * 30, -Math.sin(lineAngle) * 30);
        }

        this._graphics.lineTo(len, -30);
        this._graphics.lineTo(0, -2);
        this._graphics.endFill();

        this._graphics.rotation = v.angle;
    }

    public setColorFromBase(baseType: number): void {
        if (baseType == EPars.RNABASE_ADENINE) {
            this.set_color(0xFFFF00);
        } else if (baseType == EPars.RNABASE_URACIL) {
            this.set_color(0x0000FF);
        } else if (baseType == EPars.RNABASE_GUANINE) {
            this.set_color(0xFF0000);
        } else if (baseType == EPars.RNABASE_CYTOSINE) {
            this.set_color(0x00FF00);
        } else {
            this.set_color(0xFFFFFF);
        }
    }

    public set_color(color: number): void {
        let color1 = color | 0x88000000;
        let color2 = 0x88ffffff;
        let strength = 3;
        let distance = 3;
        let quality = 1;
        this._graphics.filters = [
            new GlowFilter(distance, strength, 0, color1, quality),
            // new GlowFilter(distance, 0, strength, color2, quality),
        ];

        // filters = [ new GlowFilter(raycol,0.5,6,6,3), new GlowFilter(0xFFFFFF,0.5,6,6,3,1,true) ];
    }

    private readonly _graphics: Graphics;

    private static readonly ANIM: string = "Anim";
}

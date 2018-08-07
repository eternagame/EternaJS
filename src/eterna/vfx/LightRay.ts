import {GlowFilter} from "pixi-filters";
import {Graphics} from "pixi.js";
import {Vector2} from "../../flashbang/geom/Vector2";
import {SceneObject} from "../../flashbang/objects/SceneObject";
import {AlphaTask} from "../../flashbang/tasks/AlphaTask";
import {SerialTask} from "../../flashbang/tasks/SerialTask";
import {VisibleTask} from "../../flashbang/tasks/VisibleTask";
import {EPars} from "../EPars";

export class LightRay extends SceneObject {
    constructor() {
        let graphics = new Graphics();
        super(graphics);
        this._graphics = graphics;
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

    public draw_ray(v: Vector2, baseType: number): void {
        const color = LightRay.getColor(baseType);

        const len: number = v.length;

        this._graphics.clear();
        this._graphics.lineStyle(0, 0, 0);

        // let matrix: Matrix = new Matrix;
        // matrix.createGradientBox(len + 37, 40);
        // this.beginGradientFill("linear", [0xFFFFFF, 0xFFFFFF], [1, 0], [0, 255], matrix);

        this._graphics.beginFill(color, 0.4);
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

        const distance = 5;
        const outerStrength = 3;
        const innerStrength = 0;
        const quality = 1;
        this._graphics.filters = [
            new GlowFilter(distance, outerStrength, innerStrength, 0xffffff, quality)
        ];
    }

    private static getColor(baseType: number): number {
        if (baseType == EPars.RNABASE_ADENINE) {
            return 0xFFFF00;
        } else if (baseType == EPars.RNABASE_URACIL) {
            return 0x0000FF;
        } else if (baseType == EPars.RNABASE_GUANINE) {
            return 0xFF0000;
        } else if (baseType == EPars.RNABASE_CYTOSINE) {
            return 0x00FF00;
        } else {
            return 0xFFFFFF;
        }
    }

    private readonly _graphics: Graphics;

    private static readonly ANIM: string = "Anim";
}

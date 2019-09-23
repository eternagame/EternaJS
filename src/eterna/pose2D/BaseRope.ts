import {DisplayObject, Graphics, Point} from "pixi.js";
import {GameObject} from "../../flashbang/core/GameObject";
import {LateUpdatable} from "../../flashbang/core/LateUpdatable";
import {ObjectTask} from "../../flashbang/core/ObjectTask";
import {Vector2} from "../../flashbang/geom/Vector2";
import {AlphaTask} from "../../flashbang/tasks/AlphaTask";
import {RepeatingTask} from "../../flashbang/tasks/RepeatingTask";
import {SerialTask} from "../../flashbang/tasks/SerialTask";
import {Pose2D} from "./Pose2D";


/** BaseRope: A class for drawing a smooth 'rope' through bases. **/
export class BaseRope extends GameObject implements LateUpdatable {

    public constructor( pose : Pose2D ) {
        super();
        this._pose = pose;
        this._graphics = new Graphics();
    }

    public get display(): DisplayObject {
        return this._graphics;
    }

    public update(): void {
        this._graphics.clear();

        let baseposX: number[] = [];
        let baseposY: number[] = [];
        for (let i = 0; i < this._pose.fullSequence.length; i++) {
            const center = this._pose.getBaseXY(i);
            if (center) {
                baseposX.push(center.x);
                baseposY.push(center.y);
            }
        }

        // draw thick line and thin line on top
        this._graphics.lineStyle(10, 0x777777, 0.2);
        this.drawBaseRopeLine(baseposX, baseposY);
        this._graphics.lineStyle(7, 0xEEEEEE, 0.2);
        this.drawBaseRopeLine(baseposX, baseposY);
    }

    private drawBaseRopeLine(baseposX: number[], baseposY: number[]): void {
        // by drawing twice, can get a nice looking texture.
        this._graphics.moveTo(baseposX[0], baseposY[0]);
        // Update the points to correspond with base locations
        // Note that this could be way smarter -- just look at rope segments that need to be updated, not entire rope.
        let smooth_factor: integer = 5;
        for (let i = 1; i < this._pose.fullSequence.length * smooth_factor; i++) {
            // Smooth the curve with cubic interpolation to prevent sharp edges.
            const ix = this.cubicInterpolation(baseposX, i / smooth_factor);
            const iy = this.cubicInterpolation(baseposY, i / smooth_factor);
            this._graphics.lineTo(ix, iy);
        }
    }

    // adapted directly from  demo    
    //         https://pixijs.io/examples/#/demos-advanced/mouse-trail.js
    /**
     * Cubic interpolation based on https://github.com/osuushi/Smooth.js
     */
    private cubicInterpolation(array, t, tangentFactor) {
        if (tangentFactor == null) tangentFactor = 1;

        const k = Math.floor(t);
        const m = [this.getTangent(k, tangentFactor, array), this.getTangent(k + 1, tangentFactor, array)];
        const p = [this.clipInput(k, array), this.clipInput(k + 1, array)];
        t -= k;
        const t2 = t * t;
        const t3 = t * t2;
        return (2 * t3 - 3 * t2 + 1) * p[0] + (t3 - 2 * t2 + t) * m[0] + (-2 * t3 + 3 * t2) * p[1] + (t3 - t2) * m[1];
    }

    private getTangent(k, factor, array) {
        return factor * (this.clipInput(k + 1, array) - this.clipInput(k - 1, array)) / 2;
    }
    private clipInput(k, arr) {
        if (k < 0) k = 0;
        if (k > arr.length - 1) k = arr.length - 1;
        return arr[k];
    }

    private readonly _pose: Pose2D;
    private readonly _graphics: Graphics;

}

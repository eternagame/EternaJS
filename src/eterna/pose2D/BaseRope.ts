import { DisplayObject, Graphics, Point } from "pixi.js";
import { GameObject } from "../../flashbang/core/GameObject";
import { LateUpdatable } from "../../flashbang/core/LateUpdatable";
import { Pose2D } from "./Pose2D";
import { Spline } from "cubic-spline"

/** BaseRope: A class for drawing a smooth 'rope' through bases. **/
export class BaseRope extends GameObject implements LateUpdatable {

    public constructor(pose: Pose2D) {
        super();
        this._pose = pose;
        this._graphics = new Graphics();
    }

    public get display(): DisplayObject {
        return this._graphics;
    }

    public update(): void {
        this._graphics.clear();

        let idx: number[] = [];
        let baseposX: number[] = [];
        let baseposY: number[] = [];
        for (let i = 0; i < this._pose.fullSequence.length; i++) {
            let center: Point = this._pose.getBaseXY(i);
            if (center) {
                idx.push(i);
                baseposX.push(center.x);
                baseposY.push(center.y);
            }
        }

        const Spline = require('cubic-spline');
        const splineX = new Spline(idx, baseposX);
        const splineY = new Spline(idx, baseposY);

        // by drawing twice, can get a nice looking texture.
        // draw thick line and thin line on top
        this._graphics.lineStyle(10, 0x777777, 0.2);
        this._graphics.moveTo(baseposX[0], baseposY[0]);
        this.drawBaseRopeLine(splineX, splineY);

        this._graphics.lineStyle(7, 0xEEEEEE, 0.2);
        this._graphics.moveTo(baseposX[0], baseposY[0]);
        this.drawBaseRopeLine(splineX, splineY);
    }

    private drawBaseRopeLine(splineX: Spline, splineY: Spline): void {
        let smooth_factor: integer = 5;
        for (let i = 1; i < this._pose.fullSequence.length * smooth_factor; i++) {
            // Smooth the curve with cubic interpolation to prevent sharp edges.
            const ix = splineX.at(i / smooth_factor);
            const iy = splineY.at(i / smooth_factor);
            this._graphics.lineTo(ix, iy);
        }
    }

    private readonly _pose: Pose2D;
    private readonly _graphics: Graphics;

}

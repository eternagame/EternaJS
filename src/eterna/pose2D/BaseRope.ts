import {DisplayObject, Graphics, Point} from 'pixi.js';
import {
    GameObject, LateUpdatable, Vector2, Arrays
} from 'flashbang';
import pchip from 'pchip';
import Pose2D from './Pose2D';

/** BaseRope: A class for drawing a smooth 'rope' through bases. * */
export default class BaseRope extends GameObject implements LateUpdatable {
    constructor(pose: Pose2D) {
        super();
        this._pose = pose;
        this._graphics = new Graphics();
        this._enabled = false;
    }

    public get display(): DisplayObject {
        return this._graphics;
    }

    public set enabled(value: boolean) {
        if (value === this._enabled) {
            return;
        }
        this._enabled = value;
    }

    public lateUpdate(dt: number): void {
        for (let i = 0; i < this._pose.fullSequence.length; i++) {
            if (this._pose.getBase(i).isAnimating) {
                this.redraw(false);
                return;
            }
        }
    }

    public redraw(forceBaseXY: boolean): void {
        if (!this._enabled) {
            if (this._graphics.currentPath !== null) this._graphics.clear();
            return;
        }

        let idx: number[] = [];
        let basePosX: number[] = [];
        let basePosY: number[] = [];
        for (let i = 0; i < this._pose.fullSequence.length; i++) {
            let center: Point = this._pose.getBaseLoc(i);
            if (!forceBaseXY && !this._pose.getBase(i).needRedraw) {
                // this logic took a long time to figure out -- the event
                //  loop boolean settings are way too confusing -- rhiju.
                center = this._pose.getBase(i).getLastDrawnPos();
            }
            if (center) {
                idx.push(i);
                basePosX.push(center.x);
                basePosY.push(center.y);
            }
        }

        if (Arrays.shallowEqual(basePosX, this._lastBasePosX)
            && Arrays.shallowEqual(basePosY, this._lastBasePosY)
            && this._graphics.currentPath !== null) {
            // base positions haven't changed, baseRope is drawn,
            // so no need to update -- just return.
            return;
        }

        this.updateInterpBasePos(basePosX, basePosY, idx);
        this._lastBasePosX = basePosX;
        this._lastBasePosY = basePosY;
        this.drawBaseRope();
    }

    /**
     * drawBaseRope()
     *  by drawing twice, can get a nice looking texture.
     *   draw thick line and thin line on top
     *
     * TODO: explore passing in coordinates (rather than storing in BaseRope class), to make
     *             code easier to understand
     * TODO: instead of clearing Graphics every time, just edit its currentPath GraphicsData (which holds
     *         the two BaseRope lines )
     *
     */
    private drawBaseRope(): void {
        this._graphics.clear();
        const OUTER_ROPE_THICKNESS: number = 0.30 * Pose2D.ZOOM_SPACINGS[this._pose.zoomLevel];
        this._graphics.lineStyle(OUTER_ROPE_THICKNESS, 0x777777, 0.2);
        this.drawBaseRopeLine();

        const INNER_ROPE_THICKNESS: number = 0.25 * Pose2D.ZOOM_SPACINGS[this._pose.zoomLevel];
        this._graphics.lineStyle(INNER_ROPE_THICKNESS, 0xE8E8E8, 0.2);
        this.drawBaseRopeLine();
    }

    private drawBaseRopeLine(): void {
        this._graphics.moveTo(this._lastBasePosX[0], this._lastBasePosY[0]);
        for (let ii = 0; ii < this._interpBasePosX.length; ii++) {
            this._graphics.lineTo(this._interpBasePosX[ii], this._interpBasePosY[ii]);
        }
    }

    /**
     * This function updates the _interpBasePosX and _interpBasePosY class variables.
     * Currently allows use of cubic interpolation or Pchip -- if we are still using
     * only Pchip in mid-2020, get rid of cubic, and consolidate functions.
     */
    private updateInterpBasePos(basePosX: number[], basePosY: number[], idx: number[]) {
        const smoothFactor = 5;
        // this.updateInterpBasePosCubic( smoothFactor, basePosX, basePosY, idx);
        this.updateInterpBasePosPchip(smoothFactor, basePosX, basePosY, idx);
    }

    /**
     * Use Cubic interpolation between points. Smooth, but can get wiggly if segments are far apart.
     *  Note that this function updates the _interpBasePosX and _interpBasePosY class variables.
     * @param smoothFactor
     * @param basePosX
     * @param basePosY
     */
    private updateInterpBasePosCubic(smoothFactor: number, basePosX: number[], basePosY: number[]): void {
        this._interpBasePosX = [];
        this._interpBasePosY = [];
        for (let i = 1; i < this._pose.fullSequence.length * smoothFactor; i++) {
            this._interpBasePosX.push(this.cubicInterpolation(basePosX, i / smoothFactor));
            this._interpBasePosY.push(this.cubicInterpolation(basePosY, i / smoothFactor));
        }
    }

    /**
     * PCHIP ( Piecewise Cubic Hermite Interpolating Polynomial) interpolation between points.
     * A little choppier, but keeps lines in stacks straight.
     *  Note that this function updates the _interpBasePosX and _interpBasePosY class variables.
     * @param basePosX
     * @param basePosY
     * @param idx
     */
    private updateInterpBasePosPchip(smoothFactor: number, basePosX: number[], basePosY: number[],
        idx: number[]): void {
        this._interpBasePosX = this.interpPchip(smoothFactor, basePosX, idx);
        this._interpBasePosY = this.interpPchip(smoothFactor, basePosY, idx);
    }

    private interpPchip(smoothFactor: number, points: number[], idx: number[]): number[] {
        let inputPoints: Array<[number, number]> = [];
        for (let ii = 0; ii < points.length; ii++) {
            inputPoints.push([idx[ii], points[ii]]);
        }
        let pchipFitPoints = pchip.fit(inputPoints, smoothFactor, 'shape_preserving');
        let interpBasePos: number[] = [];
        for (const point of pchipFitPoints) {
            interpBasePos.push(point[1]);
        }
        return interpBasePos;
    }

    // adapted directly from  demo
    //         https://pixijs.io/examples/#/demos-advanced/mouse-trail.js
    //  Cubic interpolation based on https://github.com/osuushi/Smooth.js
    //
    // Note: This is way faster than cubic-interpolation.js available through NPM.
    //
    private cubicInterpolation(array: number[], t: number, tangentFactor: number = 1) {
        const k = Math.floor(t);
        const m = [this.getTangent(k, tangentFactor, array), this.getTangent(k + 1, tangentFactor, array)];
        const p = [this.clipInput(k, array), this.clipInput(k + 1, array)];
        t -= k;
        const t2 = t * t;
        const t3 = t * t2;
        return (2 * t3 - 3 * t2 + 1) * p[0] + (t3 - 2 * t2 + t) * m[0] + (-2 * t3 + 3 * t2) * p[1] + (t3 - t2) * m[1];
    }

    private getTangent(k: number, factor: number, array: number[]) {
        return (factor * (this.clipInput(k + 1, array) - this.clipInput(k - 1, array))) / 2;
    }

    private clipInput(k: number, arr: number[]) {
        if (k < 0) k = 0;
        if (k > arr.length - 1) k = arr.length - 1;
        return arr[k];
    }

    // following not in use -- delete if still not in use in 2020.
    public makeVisibleIfLongSpacings(): void {
        if (this._enabled) return;
        for (let i = 1; i < this._pose.fullSequence.length; i++) {
            let vec: Vector2 = Vector2.fromPoint(this._pose.getBaseLoc(i)).subtract(
                Vector2.fromPoint(this._pose.getBaseLoc(i - 1))
            );
            if (vec.length > Pose2D.ZOOM_SPACINGS[0]) {
                this._enabled = true;
                return;
            }
        }
    }

    private readonly _pose: Pose2D;
    private readonly _graphics: Graphics;
    private _enabled: boolean;

    private _lastBasePosX: Array<number> = [];
    private _lastBasePosY: Array<number> = [];

    private _interpBasePosX: Array<number> = [];
    private _interpBasePosY: Array<number> = [];
}

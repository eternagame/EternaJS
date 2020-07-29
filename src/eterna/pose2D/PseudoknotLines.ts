import {DisplayObject, Graphics, Point} from 'pixi.js';
import {
    GameObject, LateUpdatable, Vector2, Arrays
} from 'flashbang';
import pchip from 'pchip';
import Pose2D from './Pose2D';

/** PseudoknotLines: A class for drawing a smooth 'rope' through bases. * */
export default class PseudoknotLines extends GameObject implements LateUpdatable {
    constructor(pose: Pose2D) {
        super();
        this._pose = pose;
        this._graphics = new Graphics();
        this._enabled = (this._pose.pseudoknotPairs.filter((it) => it !== -1).length !== 0);
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
            // clear if not cleared.
            // if (this._graphics.currentPath !== null)
            this._graphics.clear();
            return;
        }

        let idx: number[] = [];
        let starts: Point[] = [];
        let ends: Point[] = [];
        // for (let i = 0; i < this._pose.fullSequence.length; i++) {
        //     let center: Point = this._pose.getBaseLoc(i);
        //     if (!forceBaseXY && !this._pose.getBase(i).needRedraw) {
        //         center = this._pose.getBase(i).getLastDrawnPos();
        //     }
        //     if (center) {
        //         idx.push(i);
        //         basePosX.push(center.x);
        //         basePosY.push(center.y);
        //     }
        // }

        // Iterate over this._pose.pseudoknotPairs. If val isn't -1 and val is > idx,
        // push back idx's coords onto start and val's coords onto end.
        for (let ii = 0; ii < this._pose.pseudoknotPairs.length; ++ii) {
            if (this._pose.pseudoknotPairs[ii] === -1
                    || this._pose.pseudoknotPairs[ii] < ii) {
                continue;
            }

            let start: Point = this._pose.getBaseLoc(ii);
            if (!forceBaseXY && !this._pose.getBase(ii).needRedraw) {
                start = this._pose.getBase(ii).getLastDrawnPos();
            }
            let end: Point = this._pose.getBaseLoc(this._pose.pseudoknotPairs[ii]);
            if (!forceBaseXY && !this._pose.getBase(this._pose.pseudoknotPairs[ii]).needRedraw) {
                end = this._pose.getBase(this._pose.pseudoknotPairs[ii]).getLastDrawnPos();
            }

            if (start) {
                idx.push(ii);
                starts.push(start);
                ends.push(end);
            }
        }

        if (Arrays.shallowEqual(starts, this._laststarts)
            && Arrays.shallowEqual(ends, this._lastends)
            /* && this._graphics.currentPath !== null */) {
            // base positions haven't changed, and pseudoknotLines have not been cleared,
            // so no need to update -- just return.
            return;
        }

        this._laststarts = starts;
        this._lastends = ends;
        this.drawPseudoknotLines(starts, ends);
    }

    /**
     * drawPseudoknotLines()
     *  draw lines to denote pseudoknotted base pairs.
     */
    private drawPseudoknotLines(starts: Point[], ends: Point[]): void {
        this._graphics.clear();

        const INNER_LINE_THICKNESS: number = 0.1 * Pose2D.ZOOM_SPACINGS[this._pose.zoomLevel];
        this._graphics.lineStyle(INNER_LINE_THICKNESS, 0xE8E8E8, 0.6);
        this.drawPseudoknotLine(starts, ends);
    }

    private drawPseudoknotLine(starts: Point[], ends: Point[]): void {
        for (let ii = 0; ii < starts.length; ii++) {
            this._graphics.moveTo(starts[ii].x, starts[ii].y);
            this._graphics.lineTo(ends[ii].x, ends[ii].y);
        }
    }

    /**
     * Currently allows use of cubic interpolation or Pchip -- if we are still using
     *   only Pchip in mid-2020, get rid of cubic, and consolidate functions.
     *
     * The most beautiful  solution would be to use planar elastica, either Euler's solution (which
     *   still requires a numerical integral) or numerical minmization of a discrete elastica--
     *
     *  Let rhiju know if you want to try it. =)
     */
    private updateInterpBasePos(basePosX: number[], basePosY: number[]): Array<[number, number]> {
        const smoothFactor = 5;
        // return this.updateInterpBasePosCubic( smoothFactor, basePosX, basePosY);
        return this.updateInterpBasePosPchip(smoothFactor, basePosX, basePosY);
    }

    /**
     * PCHIP ( Piecewise Cubic Hermite Interpolating Polynomial) interpolation between points.
     * A little choppier, but keeps lines in stacks straight.
     *  Note that this function updates the _interpBasePosX and _interpBasePosY class variables.
     * @param smoothFactor number of interpolation points between each input point
     * @param basePosX input points' X values
     * @param basePosY input points' Y values
     */
    private updateInterpBasePosPchip(smoothFactor: number, basePosX: number[], basePosY: number[]):
    Array<[number, number]> {
        let interpBasePosX = this.interpPchip(smoothFactor, basePosX);
        let interpBasePosY = this.interpPchip(smoothFactor, basePosY);
        let interpBasePosXY: Array<[number, number]> = interpBasePosX.map((x, idx) => [x, interpBasePosY[idx]]);
        return interpBasePosXY;
    }

    private interpPchip(smoothFactor: number, points: number[]): number[] {
        // have to pack in ii for pchip.fit
        let inputPoints = points.map((x, idx) => [idx, x]);
        let pchipFitPoints: Array<[number, number]> = pchip.fit(inputPoints, smoothFactor, 'shape_preserving');
        let interpBasePos = pchipFitPoints.map((x) => x[1]);
        return interpBasePos;
    }

    private readonly _pose: Pose2D;
    private readonly _graphics: Graphics;
    private _enabled: boolean;

    private _laststarts: Array<Point> = [];
    private _lastends: Array<Point> = [];
}

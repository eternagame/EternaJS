import {DisplayObject, Graphics, Point} from 'pixi.js';
import {
    GameObject, LateUpdatable, Vector2, Arrays
} from 'flashbang';
import Pose2D from './Pose2D';

/** PseudoknotLines: A class for drawing a smooth 'rope' through bases. * */
export default class PseudoknotLines extends GameObject implements LateUpdatable {
    constructor(pose: Pose2D) {
        super();
        this._pose = pose;
        this._graphics = new Graphics();
        this._enabled = (this._pose.pseudoknotPairs.nonempty());
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

        const idx: number[] = [];
        const starts: Point[] = [];
        const ends: Point[] = [];
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
            if (!this._pose.pseudoknotPairs.isPaired(ii)
                    || this._pose.pseudoknotPairs.pairingPartner(ii) < ii) {
                continue;
            }

            const start: Point = !forceBaseXY && !this._pose.getBase(ii).needRedraw
                ? this._pose.getBase(ii).getLastDrawnPos()
                : this._pose.getBaseLoc(ii);
            const end: Point = !forceBaseXY
                && !this._pose.getBase(this._pose.pseudoknotPairs.pairingPartner(ii)).needRedraw
                ? this._pose.getBase(this._pose.pseudoknotPairs.pairingPartner(ii)).getLastDrawnPos()
                : this._pose.getBaseLoc(this._pose.pseudoknotPairs.pairingPartner(ii));

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

    private readonly _pose: Pose2D;
    private readonly _graphics: Graphics;
    private _enabled: boolean;

    private _laststarts: Array<Point> = [];
    private _lastends: Array<Point> = [];
}

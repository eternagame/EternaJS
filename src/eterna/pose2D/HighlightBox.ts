import {DisplayObject, Graphics, Point} from 'pixi.js';
import {GameObject, LateUpdatable, ObjectTask} from 'flashbang/core';
import {Vector2} from 'flashbang/geom';
import {AlphaTask, RepeatingTask, SerialTask} from 'flashbang/tasks';
import {Assert} from 'flashbang/util';
import Pose2D from './Pose2D';

export enum HighlightType {
    STACK = 0,
    LOOP = 1,
    RESTRICTED = 2,
    FORCED = 3,
    DESIGN = 4,
    UNSTABLE = 5,
    SHIFT = 6,
    USER_DEFINED = 7,
}


/** A class for highlighting groups of bases in a Pose2D */
export default class HighlightBox extends GameObject implements LateUpdatable {
    constructor(pose: Pose2D) {
        super();
        this._pose = pose;
        this._graphics = new Graphics();
    }

    public get display(): DisplayObject {
        return this._graphics;
    }

    public getQueue(): number[] {
        return this._queue == null ? null : this._queue.slice();
    }

    public get sameQueue(): boolean {
        return this._lastKnownQueue === this._queue;
    }

    public get isOn(): boolean {
        return this._on;
    }

    public set isOn(on: boolean) {
        // TODO: TSC get rid of "on"
        this._on = on;
    }

    public get enabled(): boolean {
        return this._enabled;
    }

    public set enabled(value: boolean) {
        if (value === this._enabled) {
            return;
        }

        this._enabled = value;
        this.display.visible = value;
        if (!value) {
            this.removeNamedObjects(HighlightBox.ANIM);
        }
    }

    public clear(): void {
        this.removeNamedObjects(HighlightBox.ANIM);
        this._graphics.clear();
        this._queue = null;
        this._lastKnownQueue = null;
        this._on = false;
        this._prevPosition = null;
        this._dirty = false;
    }

    public setHighlight(type: HighlightType, elems: number[]): void {
        // TODO: don't store type in _queue
        if (elems.length === 0) {
            this._queue = null;
        } else {
            this._queue = [type];
            for (let ii = 0; ii < elems.length; ii++) {
                this._queue.push(elems[ii]);
            }
        }

        this._dirty = true;
    }

    public isInQueue(basenum: number): boolean {
        if (this._queue == null) return false;
        for (let ii = 1; ii < this._queue.length; ii += 2) {
            if (basenum >= this._queue[ii] && basenum <= this._queue[ii + 1]) return true;
        }
        return false;
    }

    public lateUpdate(dt: number): void {
        if (this._pose.isAnimating || !this.enabled) {
            // Hide when we're disabled or the Pose is animating
            this.display.visible = false;
        } else {
            // Redraw when we're dirty or the zoom level has changed
            this.display.visible = true;
            if (this._dirty || this._pose.zoomLevel !== this._prevZoomLevel || this.basePositionChanged) {
                this.redraw();
                this._prevZoomLevel = this._pose.zoomLevel;
                this._dirty = false;
            }
        }
    }

    private static readonly P: Point = new Point();
    private get basePositionChanged(): boolean {
        if (this._queue == null) {
            return false;
        }

        let pos: Point = this._pose.getBaseLoc(this._queue[1], HighlightBox.P);
        return this._prevPosition.x !== pos.x || this._prevPosition.y !== pos.y;
    }

    private redraw(): void {
        let color: number;
        let baseSize: number;
        let fadeTime = 0.85;
        let zoomLevel: number = this._pose.zoomLevel;

        this.display.alpha = 0;
        this.display.visible = true;
        this._graphics.clear();

        if (this._queue == null) {
            return;
        }

        this._prevPosition = this._pose.getBaseLoc(this._queue[1], this._prevPosition);
        this._lastKnownQueue = this._queue;

        let type: HighlightType = this._queue[0];

        if (type === HighlightType.STACK) {
            baseSize = 25;
        } else if (zoomLevel === 0) {
            baseSize = 18;
        } else if (zoomLevel === 1) {
            baseSize = 14;
        } else if (zoomLevel === 2) {
            baseSize = 10;
        } else if (zoomLevel === 3) {
            baseSize = 7;
        } else {
            baseSize = 4;
        }

        switch (type) {
            case HighlightType.STACK:
                color = 0xFFFFFF;
                break;
            case HighlightType.LOOP:
                color = 0xFF0000;
                break;
            case HighlightType.RESTRICTED:
                color = 0xFFFF7E;
                break;
            case HighlightType.FORCED:
                color = 0x00FF00;
                break;
            case HighlightType.DESIGN:
                color = 0x7EFFFF;
                break;
            case HighlightType.UNSTABLE:
                color = 0xFF0000;
                break;
            case HighlightType.SHIFT:
                color = 0xC0C0C0;
                break;
            case HighlightType.USER_DEFINED:
                color = 0x32CD32;
                fadeTime = 1.0;
                break;
            default:
                Assert.unreachable(type);
        }

        if (type === HighlightType.STACK) {
            this.renderStack(color, baseSize);
        } else {
            this.renderLoop(color, baseSize);
        }

        this.replaceNamedObject(HighlightBox.ANIM, new RepeatingTask((): ObjectTask => new SerialTask(
            new AlphaTask(1, fadeTime),
            new AlphaTask(0.2, fadeTime)
        )));

        this._on = true;
    }

    private renderStack(color: number, baseSize: number): void {
        let pairs: number[] = this._pose.pairs;

        for (let ii = 1; ii < this._queue.length; ii += 2) {
            let stackStart: number = this._queue[ii];
            let stackEnd: number = this._queue[ii + 1];

            if (pairs[stackStart] < 0 || pairs[stackEnd] < 0) {
                throw new Error(`Invalid stack highlight from ${stackStart.toString()} to ${stackEnd.toString()}`);
            }

            let p0: Point = this._pose.getBaseLoc(stackStart);
            let p1: Point = this._pose.getBaseLoc(pairs[stackEnd]);

            let maxX = Math.max(p0.x, p1.x);
            let minX = Math.min(p0.x, p1.x);

            let maxY = Math.max(p0.y, p1.y);
            let minY = Math.min(p0.y, p1.y);

            this._graphics.lineStyle(5, color, 0.7);
            this._graphics.drawRoundedRect(
                minX - baseSize,
                minY - baseSize,
                maxX - minX + 2 * baseSize,
                maxY - minY + 2 * baseSize, 10
            );
        }
    }

    private renderLoop(_color: number, baseSize: number): void {
        let pairs: number[] = this._pose.pairs;
        let fullLen: number = this._pose.fullSequence.length;
        let strict: boolean = (this._queue[0] === HighlightType.LOOP);

        for (let i = 1; i < this._queue.length; i += 2) {
            let loopStart: number = this._queue[i];
            let loopEnd: number = this._queue[i + 1];

            if (strict && (pairs[loopStart] >= 0 || pairs[loopEnd] >= 0)) {
                throw new Error(`Invalid loop highlight from ${loopStart.toString()} to ${loopEnd.toString()}`);
            }

            let axes: Point[] = [];
            let baseLoc: Point;

            let startFrom: Point = new Point();
            let endTo: Point = new Point();

            for (let ii: number = loopStart; ii <= loopEnd; ii++) {
                let numGos = 0;
                let axis: Vector2 = new Vector2(0, 0);
                baseLoc = this._pose.getBaseLoc(ii);

                if (ii > 0) {
                    let prevBaseLoc: Point = this._pose.getBaseLoc(ii - 1);
                    let fromPrev: Vector2 = new Vector2((baseLoc.x - prevBaseLoc.x), (baseLoc.y - prevBaseLoc.y));
                    fromPrev.normalizeLocal();
                    axis.x += fromPrev.x;
                    axis.y += fromPrev.y;
                    numGos++;

                    if (ii === loopStart) {
                        startFrom.x = fromPrev.x;
                        startFrom.y = fromPrev.y;
                    }

                    if (ii === loopEnd && ii === fullLen - 1) {
                        endTo.x = fromPrev.x;
                        endTo.y = fromPrev.y;
                    }
                }

                if (ii < fullLen - 1) {
                    let nextBaseLoc: Point = this._pose.getBaseLoc(ii + 1);
                    let toNext = new Vector2((nextBaseLoc.x - baseLoc.x), (nextBaseLoc.y - baseLoc.y));
                    toNext.normalizeLocal();
                    axis.x += toNext.x;
                    axis.y += toNext.y;
                    numGos++;

                    if (ii === loopStart) {
                        startFrom.x = toNext.x;
                        startFrom.y = toNext.y;
                    }

                    if (ii === loopEnd) {
                        endTo.x = toNext.x;
                        endTo.y = toNext.y;
                    }
                }

                if (numGos === 0) {
                    throw new Error('Something wrong with loop highlight!');
                }

                axis.normalizeLocal();
                axes.push(new Point(axis.y, -axis.x));
            }

            let loopStartLoc: Point = this._pose.getBaseLoc(loopStart);
            let loopEndLoc: Point = this._pose.getBaseLoc(loopEnd);
            let loopStartAxis: Point = axes[0];
            let loopEndAxis: Point = axes[loopEnd - loopStart];

            this._graphics.lineStyle(5, _color, 0.7);
            this._graphics.moveTo(
                loopStartLoc.x + loopStartAxis.x * baseSize - startFrom.x * baseSize,
                loopStartLoc.y + loopStartAxis.y * baseSize - startFrom.y * baseSize
            );

            for (let ii = loopStart; ii <= loopEnd; ii++) {
                baseLoc = this._pose.getBaseLoc(ii);
                this._graphics.lineTo(
                    baseLoc.x + axes[ii - loopStart].x * baseSize, baseLoc.y + axes[ii - loopStart].y * baseSize
                );
            }

            if (this._queue[0] !== HighlightType.USER_DEFINED) {
                this._graphics.lineTo(
                    loopEndLoc.x + loopEndAxis.x * baseSize + endTo.x * baseSize,
                    loopEndLoc.y + loopEndAxis.y * baseSize + endTo.y * baseSize
                );
                this._graphics.lineTo(
                    loopEndLoc.x - loopEndAxis.x * baseSize + endTo.x * baseSize,
                    loopEndLoc.y - loopEndAxis.y * baseSize + endTo.y * baseSize
                );

                for (let ii = loopEnd; ii >= loopStart; ii--) {
                    baseLoc = this._pose.getBaseLoc(ii);
                    this._graphics.lineTo(
                        baseLoc.x - axes[ii - loopStart].x * baseSize, baseLoc.y - axes[ii - loopStart].y * baseSize
                    );
                }

                this._graphics.lineTo(
                    loopStartLoc.x - loopStartAxis.x * baseSize - startFrom.x * baseSize,
                    loopStartLoc.y - loopStartAxis.y * baseSize - startFrom.y * baseSize
                );
                this._graphics.lineTo(
                    loopStartLoc.x + loopStartAxis.x * baseSize - startFrom.x * baseSize,
                    loopStartLoc.y + loopStartAxis.y * baseSize - startFrom.y * baseSize
                );
            }
        }
    }

    private readonly _pose: Pose2D;
    private readonly _graphics: Graphics;

    private _dirty: boolean;
    private _enabled: boolean = true;
    private _queue: number[];
    private _lastKnownQueue: number[];
    private _on: boolean;
    private _prevPosition: Point;
    private _prevZoomLevel: number = -1;

    private static readonly ANIM = 'anim';
}

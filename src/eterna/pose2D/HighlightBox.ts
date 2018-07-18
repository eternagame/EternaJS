import {DisplayObject, Graphics, Point} from "pixi.js";
import {GameObject} from "../../flashbang/core/GameObject";
import {LateUpdatable} from "../../flashbang/core/LateUpdatable";
import {ObjectTask} from "../../flashbang/core/ObjectTask";
import {Vector2} from "../../flashbang/geom/Vector2";
import {AlphaTask} from "../../flashbang/tasks/AlphaTask";
import {RepeatingTask} from "../../flashbang/tasks/RepeatingTask";
import {SerialTask} from "../../flashbang/tasks/SerialTask";
import {Pose2D} from "./Pose2D";

/** A class for highlighting groups of bases in a Pose2D */
export class HighlightBox extends GameObject implements LateUpdatable {
    public constructor(pose: Pose2D) {
        super();
        this._pose = pose;
        this._graphics = new Graphics();
    }

    public get display(): DisplayObject {
        return this._graphics;
    }

    public get_queue(): number[] {
        return this._queue == null ? null : this._queue.slice();
    }

    public same_queue(): boolean {
        return this._last_known_queue == this._queue;
    }

    public is_on(): boolean {
        return this._on;
    }

    public set_on(on: boolean): void {
        // TODO: TSC get rid of "on"
        this._on = on;
    }

    public get enabled() :boolean {
        return this._enabled;
    }

    public set enabled(value: boolean) {
        if (value == this._enabled){
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
        this._last_known_queue = null;
        this._on = false;
        this._prevPosition = null;
        this._dirty = false;
    }

    public set_highlight(type: HighlightType, elems: number[]): void {
        // TODO: don't store type in _queue
        if (elems.length == 0) {
            this._queue = null;
        } else {
            this._queue = [type];
            for (let ii = 0; ii < elems.length; ii++) {
                this._queue.push(elems[ii]);
            }
        }

        this._dirty = true;
    }

    public is_in_queue(basenum: number): boolean {
        if (this._queue == null) return false;
        for (let ii: number = 1; ii < this._queue.length; ii += 2) {
            if (basenum >= this._queue[ii] && basenum <= this._queue[ii + 1])
                return true;
        }
        return false;
    }

    public lateUpdate(dt: number): void {
        if (this._pose.isAnimating || !this.enabled) {
            // Hide when we're disabled or the Pose is animating
            this.display.visible = false;

        } else  {
            // Redraw when we're dirty or the zoom level has changed
            this.display.visible = true;
            if (this._dirty || this._pose.get_zoom_level() != this._prevZoomLevel || this.basePositionChanged) {
                this.redraw();
                this._prevZoomLevel = this._pose.get_zoom_level();
                this._dirty = false;
            }
        }
    }

    private static readonly P: Point = new Point();
    private get basePositionChanged(): boolean {
        if (this._queue == null) {
            return false;
        }

        let pos: Point = this._pose.get_base_xy(this._queue[1], HighlightBox.P);
        return this._prevPosition.x != pos.x || this._prevPosition.y != pos.y;
    }

    private redraw(): void {
        let color: number;
        let base_size: number;
        let fadeTime: number = 1;//0.5;
        let zoom_level: number = this._pose.get_zoom_level();

        this.display.alpha = 0;
        this.display.visible = true;
        this._graphics.clear();

        if (this._queue == null) {
            return;
        }

        this._prevPosition = this._pose.get_base_xy(this._queue[1], this._prevPosition);
        this._last_known_queue = this._queue;

        let type: HighlightType = this._queue[0];

        if (type == HighlightType.STACK) {
            base_size = 25;
        } else if (zoom_level == 0) {
            base_size = 18;
        } else if (zoom_level == 1) {
            base_size = 14;
        } else if (zoom_level == 2) {
            base_size = 10;
        } else if (zoom_level == 3) {
            base_size = 7;
        } else {
            base_size = 4;
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
        }

        if (type == HighlightType.STACK) {
            this.render_stack(color, base_size);
        } else {
            this.render_loop(color, base_size);
        }

        this.replaceNamedObject(HighlightBox.ANIM, new RepeatingTask((): ObjectTask => {
            return new SerialTask(
                new AlphaTask(1, fadeTime),
                new AlphaTask(0, fadeTime)
            );
        }));

        this._on = true;
    }

    private render_stack(_color: number, base_size: number): void {
        let pairs: number[] = this._pose.get_pairs();

        for (let ii: number = 1; ii < this._queue.length; ii += 2) {
            let stack_start: number = this._queue[ii];
            let stack_end: number = this._queue[ii + 1];

            if (pairs[stack_start] < 0 || pairs[stack_end] < 0) {
                throw new Error("Invalid stack highlight from " + stack_start.toString() + " to " + stack_end.toString());
            }

            let p0: Point = this._pose.get_base_xy(stack_start);
            let p1: Point = this._pose.get_base_xy(pairs[stack_end]);

            let max_x: number = Math.max(p0.x, p1.x);
            let min_x: number = Math.min(p0.x, p1.x);

            let max_y: number = Math.max(p0.y, p1.y);
            let min_y: number = Math.min(p0.y, p1.y);

            this._graphics.lineStyle(5, _color, 0.7);
            this._graphics.drawRoundedRect(
                min_x - base_size,
                min_y - base_size,
                max_x - min_x + 2 * base_size,
                max_y - min_y + 2 * base_size, 10);
        }
    }

    private render_loop(_color: number, base_size: number): void {
        let pairs: number[] = this._pose.get_pairs();
        let full_len: number = this._pose.get_full_sequence().length;
        let strict: boolean = (this._queue[0] == HighlightType.LOOP);

        for (let i: number = 1; i < this._queue.length; i += 2) {
            let loop_start: number = this._queue[i];
            let loop_end: number = this._queue[i + 1];

            if (strict && (pairs[loop_start] >= 0 || pairs[loop_end] >= 0)) {
                throw new Error("Invalid loop highlight from " + loop_start.toString() + " to " + loop_end.toString());
            }

            let axes: Point[] = [];
            let base_xy: Point;

            let start_from: Point = new Point;
            let end_to: Point = new Point;

            for (let ii: number = loop_start; ii <= loop_end; ii++) {
                let num_gos: number = 0;
                let axis: Vector2 = new Vector2(0, 0);
                base_xy = this._pose.get_base_xy(ii);

                if (ii > 0) {
                    let prev_base_xy: Point = this._pose.get_base_xy(ii - 1);
                    let from_prev: Vector2 = new Vector2((base_xy.x - prev_base_xy.x), (base_xy.y - prev_base_xy.y));
                    from_prev.normalizeLocal();
                    axis.x += from_prev.x;
                    axis.y += from_prev.y;
                    num_gos++;

                    if (ii == loop_start) {
                        start_from.x = from_prev.x;
                        start_from.y = from_prev.y;
                    }

                    if (ii == loop_end && ii == full_len - 1) {
                        end_to.x = from_prev.x;
                        end_to.y = from_prev.y;
                    }
                }

                if (ii < full_len - 1) {
                    let next_base_xy: Point = this._pose.get_base_xy(ii + 1);
                    let to_next: Vector2 = new Vector2((next_base_xy.x - base_xy.x), (next_base_xy.y - base_xy.y));
                    to_next.normalizeLocal();
                    axis.x += to_next.x;
                    axis.y += to_next.y;
                    num_gos++;

                    if (ii == loop_start) {
                        start_from.x = to_next.x;
                        start_from.y = to_next.y;
                    }

                    if (ii == loop_end) {
                        end_to.x = to_next.x;
                        end_to.y = to_next.y;
                    }
                }

                if (num_gos == 0) {
                    throw new Error("Something wrong with loop highlight!");
                }

                axis.normalizeLocal();
                axes.push(new Point(axis.y, -axis.x));
            }

            let loop_start_xy: Point = this._pose.get_base_xy(loop_start);
            let loop_end_xy: Point = this._pose.get_base_xy(loop_end);
            let loop_start_axis: Point = axes[0];
            let loop_end_axis: Point = axes[loop_end - loop_start];

            this._graphics.lineStyle(5, _color, 0.7);
            this._graphics.moveTo(loop_start_xy.x + loop_start_axis.x * base_size - start_from.x * base_size, loop_start_xy.y + loop_start_axis.y * base_size - start_from.y * base_size);

            for (let ii = loop_start; ii <= loop_end; ii++) {
                base_xy = this._pose.get_base_xy(ii);
                this._graphics.lineTo(base_xy.x + axes[ii - loop_start].x * base_size, base_xy.y + axes[ii - loop_start].y * base_size);
            }

            if (this._queue[0] != HighlightType.USER_DEFINED) {
                this._graphics.lineTo(loop_end_xy.x + loop_end_axis.x * base_size + end_to.x * base_size, loop_end_xy.y + loop_end_axis.y * base_size + end_to.y * base_size);
                this._graphics.lineTo(loop_end_xy.x - loop_end_axis.x * base_size + end_to.x * base_size, loop_end_xy.y - loop_end_axis.y * base_size + end_to.y * base_size);

                for (let ii = loop_end; ii >= loop_start; ii--) {
                    base_xy = this._pose.get_base_xy(ii);
                    this._graphics.lineTo(base_xy.x - axes[ii - loop_start].x * base_size, base_xy.y - axes[ii - loop_start].y * base_size);
                }

                this._graphics.lineTo(loop_start_xy.x - loop_start_axis.x * base_size - start_from.x * base_size, loop_start_xy.y - loop_start_axis.y * base_size - start_from.y * base_size);
                this._graphics.lineTo(loop_start_xy.x + loop_start_axis.x * base_size - start_from.x * base_size, loop_start_xy.y + loop_start_axis.y * base_size - start_from.y * base_size);
            }
        }
    }

    private readonly _pose: Pose2D;
    private readonly _graphics: Graphics;

    private _dirty: boolean;
    private _enabled: boolean = true;
    private _queue: number[];
    private _last_known_queue: number[];
    private _on: boolean;
    private _prevPosition: Point;
    private _prevZoomLevel: number = -1;

    private static readonly ANIM: string = "anim";
}

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

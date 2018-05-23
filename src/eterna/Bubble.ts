import {Sprite, Point} from "pixi.js";
import {Flashbang} from "../flashbang/core/Flashbang";
import {Updatable} from "../flashbang/core/Updatable";
import {SpriteObject} from "../flashbang/objects/SpriteObject";
import {AlphaTask} from "../flashbang/tasks/AlphaTask";
import {ParallelTask} from "../flashbang/tasks/ParallelTask";
import {ScaleTask} from "../flashbang/tasks/ScaleTask";
import {Easing} from "../flashbang/util/Easing";
import {BitmapManager} from "./util/BitmapManager";

export class Bubble extends SpriteObject implements Updatable {
    public is_paused: boolean = false;

    constructor(foreground: boolean) {
        super();

        this._foreground = foreground;

        // TSC: clean up this badness
        let useBlueBubble: boolean;
        let bubbleType: number = 0;
        if (this._foreground) {
            this._bubbleSize = 3;
            useBlueBubble = (Math.random() < 0.75);
        } else {
            useBlueBubble = (Math.random() < 0.5);

            let size_number: number = Math.random();
            if (size_number < 0.33) this._bubbleSize = 0;
            else if (size_number < 0.66) this._bubbleSize = 1;
            else this._bubbleSize = 2;
        }

        if (useBlueBubble) {
            if (this._bubbleSize == 0) bubbleType = 0;
            else if (this._bubbleSize == 1) bubbleType = 1;
            else if (this._bubbleSize == 2) bubbleType = 2;
            else bubbleType = 3;
        } else {
            if (this._bubbleSize == 0) bubbleType = 4;
            else if (this._bubbleSize == 1) bubbleType = 5;
            else if (this._bubbleSize == 2) bubbleType = 6;
            else bubbleType = 7;
        }

        if (!this._foreground) {
            this._bitmap = Sprite.fromImage(Bubble.BUBBLE_NAMES[bubbleType]);
            this.sprite.addChild(this._bitmap);
        }

        this.set_auto_hide(false);
    }

    public init(): void {
        this._accX = 0;
        this._accY = 0;

        if (!this._foreground) {
            this.sprite.scale.x = 0;
            this.sprite.scale.y = 0;
            this.sprite.alpha = 0;
            this.sprite.x = Math.random() * Flashbang.stageWidth;
            this.sprite.y = Math.random() * Flashbang.stageHeight;

            this.addObject(new ParallelTask(
                new ScaleTask(1, 1, 1),
                new AlphaTask(1, 1, Easing.easeOut)
            ));

        } else {
            this.sprite.x = Math.random() * Flashbang.stageWidth;
            this.sprite.y = (Math.random() * (Flashbang.stageHeight + 200)) + Flashbang.stageHeight;
        }

        this._lastTime = -1;
    }

    public set_force(force_x: number, force_y: number): void {
        this._accX = force_x;
        this._accY = force_y;
    }

    public set_auto_hide(active: boolean): void {
        this._hideTime = active ? this._lastTime + Math.random() * 6 * 1000.0 : -1;
    }

    /*override*/
    public update(dt: number): void {
        if (this._bitmap == null) {
            return;
        }

        const current_time = this._lastTime + dt;
        const tex = this._bitmap.texture;

        if (this.is_paused || (this.sprite.y < -tex.height)) {
            this._lastTime = current_time;
            return;
        }

        let mouseLoc = this.sprite.toLocal(Flashbang.mouse, undefined, Bubble.P);
        let m_x = mouseLoc.x - tex.width / 2.0;
        let m_y = mouseLoc.y - tex.height / 2.0;
        let dist = Math.max(m_x * m_x + m_y * m_y, 0.01);
        if (dist < 10000) {
            if (this._foreground) {
                this._accX += -500 * m_x * 2 / (dist);
                this._accY += -500 * m_y * 2 / (dist);
            } else {
                this._accX += -500 * m_x * (3 - this._bubbleSize) / (dist);
                this._accY += -500 * m_y * (3 - this._bubbleSize) / (dist);
            }
        }

        if (this._lastTime < 0) this._lastTime = current_time;

        if (!this.is_paused) {
            if (this._bubbleSize == 0) {
                this._accY += -30;
            } else if (this._bubbleSize == 1) {
                this._accY += -20;
            } else if (this._bubbleSize == 2) {
                this._accY += -10;
            } else {
                this._accY += -110;
            }

            this._accX += NormalDistPRNG.random() * 5;
        }

        let dvx: number = dt * this._accX;
        let dvy: number = dt * this._accY;

        this.sprite.y += dvy;
        this.sprite.x += dvx;

        this._lastTime = current_time;

        if (this.sprite.y < -tex.height && (this._hideTime < 0 || this._hideTime >= current_time)) {
            this.init();
        }

        this._accX *= 0.5;
        this._accY *= 0.5;
    }

    private readonly _bitmap: Sprite = null;
    private readonly _bubbleSize: number;
    private readonly _foreground: boolean;

    private _lastTime: number = 0;
    private _hideTime: number = 0;

    private _accX: number = 0;
    private _accY: number = 0;

    private static BUBBLE_NAMES: string[] = [
        BitmapManager.Bubble00,
        BitmapManager.Bubble01,
        BitmapManager.Bubble02,
        BitmapManager.Bubble03,
        BitmapManager.Bubble10,
        BitmapManager.Bubble11,
        BitmapManager.Bubble12,
        BitmapManager.Bubble13
    ];

    private static readonly P: Point = new Point();
}


class NormalDistPRNG {
    private static s: number = 0;
    private static cached: boolean = false;
    private static cache: number;

    public static seed(_seed: number): void {
        NormalDistPRNG.s = _seed > 1 ? _seed % 2147483647 : 1;
    }

    public static random(): number {
        if (NormalDistPRNG.s == 0) {
            NormalDistPRNG.seed(Date.now());
        }

        if (NormalDistPRNG.cached) {
            NormalDistPRNG.cached = false;
            return NormalDistPRNG.cache;
        }

        let x: number,
            y: number,
            w: number;
        do {
            NormalDistPRNG.s = (NormalDistPRNG.s * 16807) % 2147483647;
            x = NormalDistPRNG.s / 1073741823.5 - 1;
            NormalDistPRNG.s = (NormalDistPRNG.s * 16807) % 2147483647;
            y = NormalDistPRNG.s / 1073741823.5 - 1;
            w = x * x + y * y;
        }
        while (w >= 1 || !w);

        w = Math.sqrt(-2 * Math.log(w) / w);

        NormalDistPRNG.cached = true;
        NormalDistPRNG.cache = x * w;			//  Cache one of the outputs
        return y * w;			//  and return the other.
    }
}

import {Point, Texture} from 'pixi.js';
import {
    SpriteObject, Flashbang, ParallelTask, Easing, AlphaTask, ScaleTask, Updatable, Assert
} from 'flashbang';
import Bitmaps from 'eterna/resources/Bitmaps';

export default class Bubble extends SpriteObject implements Updatable {
    public isPaused: boolean = false;

    constructor(foreground: boolean) {
        super();

        this._foreground = foreground;

        let useBlueBubble: boolean;
        let bubbleType = 0;
        if (this._foreground) {
            this._bubbleSize = 3;
            useBlueBubble = (Math.random() < 0.75);
        } else {
            useBlueBubble = (Math.random() < 0.5);

            let sizeNumber: number = Math.random();
            if (sizeNumber < 0.33) this._bubbleSize = 0;
            else if (sizeNumber < 0.66) this._bubbleSize = 1;
            else this._bubbleSize = 2;
        }

        if (useBlueBubble) {
            if (this._bubbleSize === 0) bubbleType = 0;
            else if (this._bubbleSize === 1) bubbleType = 1;
            else if (this._bubbleSize === 2) bubbleType = 2;
            else bubbleType = 3;
        } else if (this._bubbleSize === 0) bubbleType = 4;
        else if (this._bubbleSize === 1) bubbleType = 5;
        else if (this._bubbleSize === 2) bubbleType = 6;
        else bubbleType = 7;

        this.display.texture = Texture.from(Bubble.BUBBLE_NAMES[bubbleType]);

        this.autoHide = false;
    }

    public init(): void {
        this._accX = 0;
        this._accY = 0;

        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);
        if (!this._foreground) {
            this.display.scale.x = 0;
            this.display.scale.y = 0;
            this.display.alpha = 0;
            this.display.x = Math.random() * Flashbang.stageWidth;
            this.display.y = Math.random() * Flashbang.stageHeight;

            this.replaceNamedObject('InitAnim', new ParallelTask(
                new ScaleTask(1, 1, 1),
                new AlphaTask(1, 1, Easing.easeOut)
            ));
        } else {
            this.display.x = Math.random() * Flashbang.stageWidth;
            this.display.y = (Math.random() * (Flashbang.stageHeight + 200)) + Flashbang.stageHeight;
        }

        this._lastTime = -1;
    }

    public setForce(forceX: number, forceY: number): void {
        this._accX = forceX;
        this._accY = forceY;
    }

    public set autoHide(value: boolean) {
        this._hideTime = value ? this._lastTime + Math.random() * 6 * 1000.0 : -1;
    }

    /* override */
    public update(dt: number): void {
        if (this.display.texture == null) {
            return;
        }

        const currentTime = this._lastTime + dt;
        const tex = this.display.texture;

        if (this.isPaused || (this.display.y < -tex.height)) {
            this._lastTime = currentTime;
            return;
        }

        Assert.assertIsDefined(Flashbang.globalMouse);
        let mouseLoc = this.display.toLocal(Flashbang.globalMouse, undefined, Bubble.P);
        let mX = mouseLoc.x - tex.width / 2.0;
        let mY = mouseLoc.y - tex.height / 2.0;
        let dist = Math.max(mX * mX + mY * mY, 0.01);
        if (dist < 10000) {
            if (this._foreground) {
                this._accX += (-500 * mX * 2) / dist;
                this._accY += (-500 * mY * 2) / dist;
            } else {
                this._accX += (-500 * mX * (3 - this._bubbleSize)) / dist;
                this._accY += (-500 * mY * (3 - this._bubbleSize)) / dist;
            }
        }

        if (this._lastTime < 0) this._lastTime = currentTime;

        if (!this.isPaused) {
            if (this._bubbleSize === 0) {
                this._accY += -30;
            } else if (this._bubbleSize === 1) {
                this._accY += -20;
            } else if (this._bubbleSize === 2) {
                this._accY += -10;
            } else {
                this._accY += -110;
            }

            this._accX += NormalDistPRNG.random() * 5;
        }

        let dvx: number = dt * this._accX;
        let dvy: number = dt * this._accY;

        this.display.y += dvy;
        this.display.x += dvx;

        this._lastTime = currentTime;

        if (this.display.y < -tex.height && (this._hideTime < 0 || this._hideTime >= currentTime)) {
            this.init();
        }

        this._accX *= 0.5;
        this._accY *= 0.5;
    }

    private readonly _bubbleSize: number;
    private readonly _foreground: boolean;

    private _lastTime: number = 0;
    private _hideTime: number = 0;

    private _accX: number = 0;
    private _accY: number = 0;

    private static readonly BUBBLE_NAMES = [
        Bitmaps.Bubble00,
        Bitmaps.Bubble01,
        Bitmaps.Bubble02,
        Bitmaps.Bubble03,
        Bitmaps.Bubble10,
        Bitmaps.Bubble11,
        Bitmaps.Bubble12,
        Bitmaps.Bubble13
    ];

    private static readonly P = new Point();
}

class NormalDistPRNG {
    private static s: number = 0;
    private static cached: boolean = false;
    private static cache: number;

    public static seed(_seed: number): void {
        NormalDistPRNG.s = _seed > 1 ? _seed % 2147483647 : 1;
    }

    public static random(): number {
        if (NormalDistPRNG.s === 0) {
            NormalDistPRNG.seed(Date.now());
        }

        if (NormalDistPRNG.cached) {
            NormalDistPRNG.cached = false;
            return NormalDistPRNG.cache;
        }

        let x: number;
        let y: number;
        let w: number;
        do {
            NormalDistPRNG.s = (NormalDistPRNG.s * 16807) % 2147483647;
            x = NormalDistPRNG.s / 1073741823.5 - 1;
            NormalDistPRNG.s = (NormalDistPRNG.s * 16807) % 2147483647;
            y = NormalDistPRNG.s / 1073741823.5 - 1;
            w = x * x + y * y;
        }
        while (w >= 1 || !w);

        w = Math.sqrt((-2 * Math.log(w)) / w);

        NormalDistPRNG.cached = true;
        NormalDistPRNG.cache = x * w; //  Cache one of the outputs
        return y * w; //  and return the other.
    }
}

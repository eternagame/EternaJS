import {SpriteObject} from "./flashbang/objects/SpriteObject";

export class Bubble extends SpriteObject {
    public is_paused: boolean;

    constructor(foreground:boolean) {
        super();

        this._foreground = foreground;

        let bubble_type:boolean;
        if (this._foreground) {
            this._bubbleSize = 3;
            bubble_type = (Math.random() < 0.75);
        } else {
            bubble_type = (Math.random() < 0.5);

            let size_number:number = Math.random();
            if (size_number < 0.33) this._bubbleSize = 0;
            else if (size_number < 0.66) this._bubbleSize = 1;
            else this._bubbleSize = 2;
        }

        if(bubble_type) {
            if( this._bubbleSize == 0) this._bubbleType = 0;
            else if (this._bubbleSize == 1) this._bubbleType = 1;
            else if (this._bubbleSize == 2) this._bubbleType = 2;
            else this._bubbleType = 3;
        } else {
            if (this._bubbleSize == 0) this._bubbleType = 4;
            else if (this._bubbleSize == 1) this._bubbleType = 5;
            else if (this._bubbleSize == 2) this._bubbleType = 6;
            else this._bubbleType = 7;
        }

        if (!this._foreground) {
            this._bitmap = new Bitmap();
            this._bitmap.bitmapData = Bubble.bitmap_data_[this._bubbleType];
            this.addChild(this._bitmap);
        }

        this.set_auto_hide(false);
    }

    public init():void {
        this._accX = 0;
        this._accY = 0;

        if (!this._foreground) {
            this.set_pos(new UDim(0,0,Math.random() * this.offscreen_width_,Math.random() * this.offscreen_height_));
            this.set_animator(new GameAnimatorScaler(0, 1.0, 1.0));
            this.set_animator(new GameAnimatorFader(0, 1.0, 1.0, false));
        } else {
            this.set_pos(new UDim(0,0, Math.random() * this.offscreen_width_, Math.random() * (this.offscreen_height_ + 200) + this.offscreen_height_));
        }

        this._lastTime = -1;
    }

    public get_bitmap():BitmapData {
        return Bubble.bitmap_data_[this._bubbleType];
    }

    public set_force(force_x:number, force_y:number):void {
        this._accX = force_x;
        this._accY = force_y;
    }

    public set_auto_hide(active:boolean):void {
        this._hideTime = active ? this._lastTime + Math.random() * 6 * 1000.0 : -1;
    }

    /*override*/ public update(current_time:number, paused:boolean):void {
        if (paused || (this.y < 0 - Bubble.bitmap_data_[this._bubbleType].height)) {
            this._lastTime = current_time;
            return;
        }

        let m_x = this.mouseX - Bubble.bitmap_data_[this._bubbleType].width / 2.0;
        let m_y = this.mouseY - Bubble.bitmap_data_[this._bubbleType].height / 2.0;
        let dist = m_x*m_x + m_y*m_y;
        if (dist < 10000) {
            if (this._foreground) {
                this._accX += -500 * m_x * 2 / (dist);
                this._accY += -500 * m_y * 2 / (dist);
            } else {
                this._accX += -500 * m_x * (3-this._bubbleSize) / (dist);
                this._accY += -500 * m_y * (3-this._bubbleSize) / (dist);
            }
        }

        if (this._lastTime < 0) this._lastTime = current_time;

        if (!this.is_paused) {
            if (this._bubbleSize == 0) {
                this._accY += -30;
            } else if (this._bubbleSize == 1) {
                this._accY += -20;
            } else if( this._bubbleSize == 2) {
                this._accY += -10;
            } else {
                this._accY += -110;
            }

            this._accX += this.NormalDistPRNG.random() * 5;
        }

        let dt:number = (current_time - this._lastTime) / 1000.0;
        let dvx:number = dt * this._accX;
        let dvy:number = dt * this._accY;

        this.y += dvy;
        this.x += dvx;

        this._lastTime = current_time;

        if (this.y < 0 - Bubble.bitmap_data_[this._bubbleType].height) {
            if (this._hideTime < 0 || this._hideTime >= current_time) {
                this.init();
            }
        }

        this._accX *= 0.5;
        this._accY *= 0.5;
    }

    private _bitmap:Bitmap;
    private _bubbleSize:number;
    private _bubbleType:number;

    private _lastTime:number;
    private _hideTime:number;
    private _foreground:boolean;

    private _accX:number;
    private _accY:number;
    private static BUBBLE_NAMES: string[] = [
        "Bubble00",
        "Bubble01",
        "Bubble02",
        "Bubble03",
        "Bubble10",
        "Bubble11",
        "Bubble12",
        "Bubble13"
    ];
}


class NormalDistPRNG {
    private static s:number = 0;
    private static cached:boolean = false;
    private static cache:number;

    public static seed(_seed:number):void {
        NormalDistPRNG.s = _seed > 1 ? _seed % 2147483647 : 1;
    }

    public static random():number {
        if (NormalDistPRNG.s == 0) {
            NormalDistPRNG.seed(Date.now());
        }

        if (NormalDistPRNG.cached) {
            NormalDistPRNG.cached = false;
            return NormalDistPRNG.cache;
        }

        let	x:number,
            y:number,
            w:number;
        do {
            NormalDistPRNG.s = ( NormalDistPRNG.s * 16807 ) % 2147483647;
            x = NormalDistPRNG.s / 1073741823.5 - 1;
            NormalDistPRNG.s = ( NormalDistPRNG.s * 16807 ) % 2147483647;
            y = NormalDistPRNG.s / 1073741823.5 - 1;
            w = x*x + y*y;
        }
        while ( w >= 1 || !w );

        w = Math.sqrt(-2 * Math.log(w) / w);

        NormalDistPRNG.cached = true;
        NormalDistPRNG.cache = x * w;			//  Cache one of the outputs
        return y * w;			//  and return the other.
    }
}

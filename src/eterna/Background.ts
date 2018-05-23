import {Graphics} from "pixi.js";
import {Bubble} from "./Bubble";
import {Flashbang} from "../flashbang/core/Flashbang";
import {SpriteObject} from "../flashbang/objects/SpriteObject";

export class Background extends SpriteObject {
    constructor(bubbleCount: number, foreground: boolean = false) {
        super();

        // this._bgGradientBitmap = new Bitmap;
        // this.addChild(this._bgGradientBitmap);

        this.render_background();

        this._bubbles = [];
        for (let ii:number = 0; ii < bubbleCount; ii++) {
            let bub: Bubble = new Bubble(foreground);
            // bub.sprite.visible = false;
            bub.init();
            this.addObject(bub, this.sprite);
            this._bubbles.push(bub);
        }

        this._foreground = foreground;
        this._isFrozen = false;
    }

    public disable_bubbles(disable:boolean):void {
        for (let ii:number = 0; ii < this._bubbles.length; ii++) {
            if (!disable && !this._bubbles[ii].sprite.visible) {
                this._bubbles[ii].init();
            }
            this._bubbles[ii].sprite.visible = !disable;
        }
    }

    private freeze_bubbles(freeze:boolean):void {
        for (let ii:number = 0; ii < this._bubbles.length; ii++) {
            this._bubbles[ii].is_paused = freeze;
        }
    }

    private render_background(): void {
        let light_blue:number = this._isFrozen ? 0x435d92: 0x32456d;
        let dark_blue:number  = this._isFrozen ? 0x0a2b57: 0x061A34;

        if (this._bgImage != null) {
            this._bgImage.destroy();
        }

        this._bgImage = new Graphics()
            .beginFill(dark_blue)
            .drawRect(0, 0, Flashbang.stageWidth, Flashbang.stageHeight)
            .endFill();

        this.sprite.addChildAt(this._bgImage, 0);

        // let bg_sprite:Sprite = new Sprite;
        // bg_sprite.graphics.clear();
        //
        // if (!this._foreground && this._bubbles.length > 0) {
        //
        //     //Type of Gradient we will be using
        //     let fType:string = GradientType.RADIAL;
        //     //Colors of our gradient in the form of an array
        //     let colors:any[] = [ light_blue, dark_blue ];
        //     //Store the Alpha Values in the form of an array
        //     let alphas:any[] = [ 1, 1 ];
        //     //Array of color distribution ratios.
        //     //The value defines percentage of the width where the color is sampled at 100%
        //     let ratios:any[] = [ 0, 255 ];
        //     //Create a Matrix instance and assign the Gradient Box
        //     let matr:Matrix = new Matrix();
        //     matr.createGradientBox( this.offscreen_width_, this.offscreen_height_, 0, 0, 0 );
        //     //SpreadMethod will define how the gradient is spread. Note!!! Flash uses CONSTANTS to represent String literals
        //     let sprMethod:string = SpreadMethod.PAD;
        //     //Start the Gradietn and pass our letiables to it
        //
        //     bg_sprite.graphics.beginFill(dark_blue);
        //     bg_sprite.graphics.drawRect(0,0,this.offscreen_width_,this.offscreen_height_);
        //     bg_sprite.graphics.endFill();
        //
        //     bg_sprite.graphics.beginGradientFill( fType, colors, alphas, ratios, matr, sprMethod );
        //     bg_sprite.graphics.drawRect( 0, 0, this.offscreen_width_, this.offscreen_height_ );
        //     bg_sprite.graphics.endFill();
        //
        // } else {
        //
        //     bg_sprite.graphics.beginFill(dark_blue);
        //     bg_sprite.graphics.drawRect(0,0,this.offscreen_width_,this.offscreen_height_);
        //     bg_sprite.graphics.endFill();
        // }
        //
        // this._bgGradientBitmap.bitmapData = this.BitmapManager.draw_as_bitmap(bg_sprite,this.offscreen_width_,this.offscreen_height_);
    }

    public freeze_background(freeze:boolean):void {
        this._isFrozen = freeze;
        this.freeze_bubbles(freeze);
        this.render_background();
    }

    /*override*/ protected on_resize():void {
        this.render_background();

        for (let ii:number = 0; ii < this._bubbles.length; ii++) {
            this._bubbles[ii].init();
        }
    }

    private _bgImage: Graphics = null;

    private _foreground: boolean;
    private _isFrozen: boolean;
    private _bubbles: Bubble[];
}

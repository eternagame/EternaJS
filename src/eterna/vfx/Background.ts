import {Graphics} from "pixi.js";
import {Flashbang} from "../../flashbang/core/Flashbang";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {Bubble} from "./Bubble";

export class Background extends ContainerObject {
    constructor(bubbleCount: number = 20, foreground: boolean = false) {
        super();
        this._bubbleCount = bubbleCount;
        this._foreground = foreground;
    }

    protected added(): void {
        super.added();

        this.renderBackground();

        this._bubbles = [];
        for (let ii: number = 0; ii < this._bubbleCount; ii++) {
            let bub: Bubble = new Bubble(this._foreground);
            // bub.sprite.visible = false;
            bub.init();
            this.addObject(bub, this.container);
            this._bubbles.push(bub);
        }

        this.regs.add(this.mode.resized.connect(() => this.onResized()));
    }

    public disableBubbles(disable: boolean): void {
        for (let bubble of this._bubbles) {
            if (!disable && !bubble.sprite.visible) {
                bubble.init();
            }
            bubble.sprite.visible = !disable;
        }
    }

    private freezeBubbles(freeze: boolean): void {
        for (let bubble of this._bubbles) {
            bubble.is_paused = freeze;
        }
    }

    private renderBackground(): void {
        let light_blue: number = this._isFrozen ? 0x435d92 : 0x32456d;
        let dark_blue: number = this._isFrozen ? 0x0a2b57 : 0x061A34;

        if (this._bgImage != null) {
            this._bgImage.destroy();
        }

        this._bgImage = new Graphics()
            .beginFill(dark_blue)
            .drawRect(0, 0, Flashbang.stageWidth, Flashbang.stageHeight)
            .endFill();

        this.container.addChildAt(this._bgImage, 0);

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

    public freezeBackground(freeze: boolean): void {
        this._isFrozen = freeze;
        this.freezeBubbles(freeze);
        this.renderBackground();
    }

    private onResized(): void {
        this.renderBackground();
        for (let bubble of this._bubbles) {
            bubble.init();
        }
    }

    private readonly _bubbleCount: number;
    private readonly _foreground: boolean;

    private _bubbles: Bubble[];
    private _bgImage: Graphics = null;
    private _isFrozen: boolean = false;
}

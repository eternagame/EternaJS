import {Point, Rectangle, Texture, Sprite} from "pixi.js";
import {BitmapManager} from "../resources/BitmapManager";
import {BitmapUtil} from "../util/BitmapUtil";

export class BaseGlow extends Sprite {
    public constructor() {
        super();
        BaseGlow.initBitmapData();
    }

    public set_wrong(wrong: boolean): void {
        this._is_wrong = wrong;
    }

    public set_backward(backward: boolean): void {
        this._backward = backward;
    }

    public bit_blit(zoom_level: number, x: number, y: number, current_time: number): void {
        if (this._animation_start_time < 0) {
            this._animation_start_time = current_time;
        }

        let diff: number = current_time - this._animation_start_time;
        diff = diff - Math.floor(diff / (BaseGlow.ANIMATION_SPAN * 1000)) * (BaseGlow.ANIMATION_SPAN * 1000);

        let prog: number = diff / (BaseGlow.ANIMATION_SPAN * 1000);
        let prog_ind: number = Math.floor(prog * BaseGlow.NUM_ANIMATION_STEPS) % BaseGlow.NUM_ANIMATION_STEPS;
        if (this._backward) prog_ind = BaseGlow.NUM_ANIMATION_STEPS - 1 - prog_ind;

        let body_data: Texture = null;
        if (this._is_wrong) {
            body_data = BaseGlow._bitmap_wrong_data[zoom_level][prog_ind];
        } else {
            body_data = BaseGlow._bitmap_data[zoom_level][prog_ind];
        }
        let base_rect: Rectangle = new Rectangle(0, 0, body_data.width, body_data.height);
        let base_point: Point = new Point(x - body_data.width / 2, y - body_data.height / 2);

        this.texture = body_data;
        this.position = base_point;
    }

    private static initBitmapData(): void {
        if (BaseGlow._bitmap_data != null) {
            return;
        }

        BaseGlow._bitmap_data = [];
        BaseGlow._bitmap_wrong_data = [];
        let original_data: Texture = BitmapManager.get_bitmap(BitmapManager.ImgBindingBaseGlow);

        for (let zz: number = 0; zz < 5; zz++) {
            let bitmaps_in_zoom: Texture[] = [];
            let wrong_bitmaps_in_zoom: Texture[] = [];
            let zoom_factor: number = 1.0 - zz * 0.1;
            let base_data: Texture = BitmapUtil.scale_by(original_data, zoom_factor);

            for (let ii: number = 0; ii < BaseGlow.NUM_ANIMATION_STEPS; ii++) {
                let new_base_data: Texture = BitmapUtil.color_transform_alpha(
                    base_data, 255, 255, 255, 1.0 - ii / BaseGlow.NUM_ANIMATION_STEPS, 0, 0, 0, 0);
                new_base_data = BitmapUtil.scale_by(new_base_data, 0.5 + (ii + 1) / BaseGlow.NUM_ANIMATION_STEPS);
                bitmaps_in_zoom.push(new_base_data);

                let wrong_new_base_data: Texture = BitmapUtil.color_transform(new_base_data, 255, 0, 0, 0, 0, 0);
                wrong_bitmaps_in_zoom.push(wrong_new_base_data);
            }
            BaseGlow._bitmap_data.push(bitmaps_in_zoom);
            BaseGlow._bitmap_wrong_data.push(wrong_bitmaps_in_zoom);
        }
    }

    private _animation_start_time: number = -1;
    private _is_wrong: boolean = false;
    private _backward: boolean = false;

    private static _bitmap_data: Texture[][];
    private static _bitmap_wrong_data: Texture[][];

    private static readonly NUM_ANIMATION_STEPS: number = 60;
    private static readonly ANIMATION_SPAN: number = 1.1;

}

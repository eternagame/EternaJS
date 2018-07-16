import {Point, Sprite, Texture} from "pixi.js";
import {BitmapManager} from "../resources/BitmapManager";
import {Bitmaps} from "../resources/Bitmaps";
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

    public updateView(zoom_level: number, x: number, y: number, current_time: number): void {
        if (this._animation_start_time < 0) {
            this._animation_start_time = current_time;
        }

        let diff: number = current_time - this._animation_start_time;
        diff -= Math.floor(diff / BaseGlow.ANIMATION_SPAN) * BaseGlow.ANIMATION_SPAN;

        let prog: number = diff / BaseGlow.ANIMATION_SPAN;
        let prog_ind: number = Math.floor(prog * BaseGlow.NUM_ANIMATION_STEPS) % BaseGlow.NUM_ANIMATION_STEPS;
        if (this._backward) prog_ind = BaseGlow.NUM_ANIMATION_STEPS - 1 - prog_ind;

        let body_data: Texture = this._is_wrong ?
            BaseGlow._bitmap_wrong_data[zoom_level][prog_ind] :
            BaseGlow._bitmap_data[zoom_level][prog_ind];

        this.texture = body_data;
        this.position = new Point(x - body_data.width / 2, y - body_data.height / 2);
    }

    private static initBitmapData(): void {
        if (BaseGlow._bitmap_data != null) {
            return;
        }

        BaseGlow._bitmap_data = [];
        BaseGlow._bitmap_wrong_data = [];
        let original_data: Texture = BitmapManager.get_bitmap(Bitmaps.ImgBindingBaseGlow);

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

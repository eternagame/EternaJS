import {Point, Sprite, Texture} from "pixi.js";
import {BitmapManager} from "../resources/BitmapManager";
import {Bitmaps} from "../resources/Bitmaps";
import {EternaTextureUtil} from "../util/EternaTextureUtil";

export class BaseGlow extends Sprite {
    public constructor() {
        super();
        BaseGlow.initTextures();
    }

    public set isWrong(wrong: boolean) {
        this._isWrong = wrong;
    }

    public set backward(backward: boolean) {
        this._backward = backward;
    }

    public updateView(zoom_level: number, x: number, y: number, current_time: number): void {
        if (this._animStartTime < 0) {
            this._animStartTime = current_time;
        }

        let diff: number = current_time - this._animStartTime;
        diff -= Math.floor(diff / BaseGlow.ANIMATION_SPAN) * BaseGlow.ANIMATION_SPAN;

        let prog: number = diff / BaseGlow.ANIMATION_SPAN;
        let prog_ind: number = Math.floor(prog * BaseGlow.NUM_ANIMATION_STEPS) % BaseGlow.NUM_ANIMATION_STEPS;
        if (this._backward) prog_ind = BaseGlow.NUM_ANIMATION_STEPS - 1 - prog_ind;

        let bodyTex: Texture = this._isWrong
            ? BaseGlow._texturesWrong[zoom_level][prog_ind]
            : BaseGlow._textures[zoom_level][prog_ind];

        this.texture = bodyTex;
        this.position = new Point(x - bodyTex.width / 2, y - bodyTex.height / 2);
    }

    public static initTextures(): void {
        if (BaseGlow._textures != null) {
            return;
        }

        BaseGlow._textures = [];
        BaseGlow._texturesWrong = [];
        let original_data: Texture = BitmapManager.getBitmap(Bitmaps.ImgBindingBaseGlow);

        for (let zz: number = 0; zz < 5; zz++) {
            let bitmaps_in_zoom: Texture[] = [];
            let wrong_bitmaps_in_zoom: Texture[] = [];
            let zoom_factor: number = 1.0 - zz * 0.1;
            let base_data: Texture = EternaTextureUtil.scaleBy(original_data, zoom_factor);

            for (let ii: number = 0; ii < BaseGlow.NUM_ANIMATION_STEPS; ii++) {
                let new_base_data: Texture = EternaTextureUtil.colorTransformAlpha(
                    base_data, 255, 255, 255, 1.0 - ii / BaseGlow.NUM_ANIMATION_STEPS, 0, 0, 0, 0
                );
                new_base_data = EternaTextureUtil.scaleBy(new_base_data, 0.5 + (ii + 1) / BaseGlow.NUM_ANIMATION_STEPS);
                bitmaps_in_zoom.push(new_base_data);

                let wrong_new_base_data: Texture = EternaTextureUtil.colorTransform(new_base_data, 255, 0, 0, 0, 0, 0);
                wrong_bitmaps_in_zoom.push(wrong_new_base_data);
            }
            BaseGlow._textures.push(bitmaps_in_zoom);
            BaseGlow._texturesWrong.push(wrong_bitmaps_in_zoom);
        }
    }

    private _animStartTime: number = -1;
    private _isWrong: boolean = false;
    private _backward: boolean = false;

    private static _textures: Texture[][];
    private static _texturesWrong: Texture[][];

    private static readonly NUM_ANIMATION_STEPS = 60;
    private static readonly ANIMATION_SPAN = 1.1;
}

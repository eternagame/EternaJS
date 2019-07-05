import {Point, Sprite, Texture} from 'pixi.js';
import {BitmapManager, Bitmaps} from 'eterna/resources';
import {EternaTextureUtil} from 'eterna/util';

export default class BaseGlow extends Sprite {
    constructor() {
        super();
        BaseGlow.initTextures();
    }

    public set isWrong(wrong: boolean) {
        this._isWrong = wrong;
    }

    public set backward(backward: boolean) {
        this._backward = backward;
    }

    public updateView(zoomLevel: number, x: number, y: number, currentTime: number): void {
        if (this._animStartTime < 0) {
            this._animStartTime = currentTime;
        }

        let diff: number = currentTime - this._animStartTime;
        diff -= Math.floor(diff / BaseGlow.ANIMATION_SPAN) * BaseGlow.ANIMATION_SPAN;

        let prog: number = diff / BaseGlow.ANIMATION_SPAN;
        let progInd: number = Math.floor(prog * BaseGlow.NUM_ANIMATION_STEPS) % BaseGlow.NUM_ANIMATION_STEPS;
        if (this._backward) progInd = BaseGlow.NUM_ANIMATION_STEPS - 1 - progInd;

        let bodyTex: Texture = this._isWrong
            ? BaseGlow._texturesWrong[zoomLevel][progInd]
            : BaseGlow._textures[zoomLevel][progInd];

        this.texture = bodyTex;
        this.position = new Point(x - bodyTex.width / 2, y - bodyTex.height / 2);
    }

    public static initTextures(): void {
        if (BaseGlow._textures != null) {
            return;
        }

        BaseGlow._textures = [];
        BaseGlow._texturesWrong = [];
        let originalData: Texture = BitmapManager.getBitmap(Bitmaps.ImgBindingBaseGlow);

        for (let zz = 0; zz < 5; zz++) {
            let bitmapsInZoom: Texture[] = [];
            let wrongBitmapsInZoom: Texture[] = [];
            let zoomFactor: number = 1.0 - zz * 0.1;
            let baseData: Texture = EternaTextureUtil.scaleBy(originalData, zoomFactor);

            for (let ii = 0; ii < BaseGlow.NUM_ANIMATION_STEPS; ii++) {
                let newBaseData: Texture = EternaTextureUtil.colorTransformAlpha(
                    baseData, 255, 255, 255, 1.0 - ii / BaseGlow.NUM_ANIMATION_STEPS, 0, 0, 0, 0
                );
                newBaseData = EternaTextureUtil.scaleBy(newBaseData, 0.5 + (ii + 1) / BaseGlow.NUM_ANIMATION_STEPS);
                bitmapsInZoom.push(newBaseData);

                let wrongNewBaseData: Texture = EternaTextureUtil.colorTransform(newBaseData, 255, 0, 0, 0, 0, 0);
                wrongBitmapsInZoom.push(wrongNewBaseData);
            }
            BaseGlow._textures.push(bitmapsInZoom);
            BaseGlow._texturesWrong.push(wrongBitmapsInZoom);
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

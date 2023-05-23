import {
    Graphics, Sprite, Text, Texture
} from 'pixi.js';
import {ColorMatrixFilter} from '@pixi/filter-color-matrix';
import {
    ContainerObject, MathUtil, TextureUtil, ColorUtil, Updatable
} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';

export default class Band extends ContainerObject implements Updatable {
    constructor(farDist: number, closeDist: number, strength: number) {
        super();

        Band.initTextures();

        this._midDist = (farDist + closeDist) * 0.5;
        this._movDist = (farDist - closeDist) * 0.5;

        this._startTime = -1;

        this._st0 = new Sprite();
        this.container.addChild(this._st0);

        this._st1 = new Sprite();
        this.container.addChild(this._st1);

        const scoreText: Text = Fonts.std('', 10).bold().build();
        scoreText.position.set(2, 19);
        this.container.addChild(scoreText);

        this.strength = strength;
    }

    public set strength(strength: number) {
        if (strength === 1) {
            this._st0.texture = Band._satelliteBitmap;
            this._st1.texture = Band._satelliteInvert;
        } else if (strength === 2) {
            this._st0.texture = Band._satelliteStrongerBitmap;
            this._st1.texture = Band._satelliteStrongerInvert;
        } else {
            this._st0.texture = Band._satelliteWeakerBitmap;
            this._st1.texture = Band._satelliteWeakerInvert;
        }
    }

    /* override */
    public update(dt: number): void {
        if (this._startTime < 0) {
            this._startTime = dt;
        }

        const pairR: number = Math.cos((dt - this._startTime) * 4) * this._movDist + this._midDist;

        this._st0.x = -pairR;
        this._st0.y = 0;

        this._st1.x = pairR;
        this._st1.y = 0;
    }

    private static initTextures() {
        if (Band._satelliteBitmap != null) {
            return;
        }

        const satTex: Texture = BitmapManager.getBitmap(Bitmaps.Satellite);
        const render = (rotation: number, colorTransform: ColorMatrixFilter | null = null): Texture => {
            const disp = new Graphics();
            disp.beginFill(0).drawRect(0, 0, 20, 20).endFill();

            const sat = new Sprite(satTex);
            sat.pivot.set(10, 10);
            sat.rotation = MathUtil.deg2Rad * -rotation;
            if (colorTransform != null) {
                sat.filters = [colorTransform];
            }

            disp.addChild(sat);

            return TextureUtil.renderToTexture(disp);
        };

        Band._satelliteBitmap = render(-90);
        Band._satelliteInvert = render(90);
        Band._satelliteStrongerBitmap = render(-90, ColorUtil.colorTransform(3, 3, 3, 3, 0, 0, 0, 0));
        Band._satelliteStrongerInvert = render(90, ColorUtil.colorTransform(3, 3, 3, 3, 0, 0, 0, 0));
        Band._satelliteWeakerBitmap = render(-90, ColorUtil.colorTransform(1, 1, 1, 0.4, 0, 0, 0, 0));
        Band._satelliteWeakerInvert = render(90, ColorUtil.colorTransform(1, 1, 1, 0.4, 0, 0, 0, 0));
    }

    public static dispose() {
        // @ts-expect-error Ok to remove on shutdown
        delete Band._satelliteBitmap;
        // @ts-expect-error Ok to remove on shutdown
        delete Band._satelliteInvert;
        // @ts-expect-error Ok to remove on shutdown
        delete Band._satelliteStrongerBitmap;
        // @ts-expect-error Ok to remove on shutdown
        delete Band._satelliteStrongerInvert;
        // @ts-expect-error Ok to remove on shutdown
        delete Band._satelliteWeakerBitmap;
        // @ts-expect-error Ok to remove on shutdown
        delete Band._satelliteWeakerInvert;
    }

    private readonly _st0: Sprite;
    private readonly _st1: Sprite;
    private readonly _movDist: number;
    private readonly _midDist: number;

    private _startTime: number;

    private static _satelliteBitmap: Texture;
    private static _satelliteInvert: Texture;
    private static _satelliteStrongerBitmap: Texture;
    private static _satelliteStrongerInvert: Texture;
    private static _satelliteWeakerBitmap: Texture;
    private static _satelliteWeakerInvert: Texture;
}

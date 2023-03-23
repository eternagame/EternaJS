import {
    Container, Graphics, MSAA_QUALITY, Renderer, RenderTexture, Sprite, Texture
} from 'pixi.js';
import ColorConvert from 'color-convert';
import {
    Assert, ColorUtil, DisplayUtil, HAlign, MathUtil, TextureUtil, VAlign
} from 'flashbang';
import {RNABase} from 'eterna/EPars';
import EternaTextureUtil from 'eterna/util/EternaTextureUtil';
import Fonts from 'eterna/util/Fonts';
import {GradientFactory} from '@pixi-essentials/gradients';
import Eterna from 'eterna/Eterna';
import {BlurFilter} from '@pixi/filter-blur';
import {AdjustmentFilter, ColorReplaceFilter} from 'pixi-filters';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import BaseDrawFlags from './BaseDrawFlags';
import Base from './Base';

/** Encapsulates textures for a Base type */
export default class BaseTextures {
    public baseType: number;

    public letterData: Texture[];
    public lockIconData: Texture[];
    public bodyData: Texture[];
    public colorblindBodyData: Texture[];
    public lockData: Texture[];
    public colorblindLockData: Texture[];

    constructor(baseType: number) {
        this.baseType = baseType;
        this.letterData = BaseTextures.createLetterTextures(baseType, Base.ZOOM_SCALE_FACTOR);
        this.bodyData = BaseTextures.createBodyTextures(baseType, Base.ZOOM_SCALE_FACTOR, false);
        this.colorblindBodyData = BaseTextures.createBodyTextures(baseType, Base.ZOOM_SCALE_FACTOR, true);
        this.lockData = BaseTextures.createLockTextures(baseType, Base.ZOOM_SCALE_FACTOR, false);
        this.colorblindLockData = BaseTextures.createLockTextures(baseType, Base.ZOOM_SCALE_FACTOR, true);
    }

    public getBodyTexture(zoomLevel: number, colorblind: boolean): Texture {
        return colorblind ? this.colorblindBodyData[zoomLevel] : this.bodyData[zoomLevel];
    }

    public getLetterTexture(zoomLevel: number, drawFlags: number): Texture | null {
        const lettermode: boolean = (drawFlags & BaseDrawFlags.LETTER_MODE) !== 0;

        if (zoomLevel < Base.NUM_ZOOM_LEVELS && lettermode) {
            return BaseTextures.textureForSize(this.letterData, 0, zoomLevel);
        }

        return null;
    }

    private static createBodyTextures(baseType: number, zoomScalar: number, colorblind: boolean) {
        Assert.assertIsDefined(Eterna.app.pixi);
        /** Size of largest body texture */
        const MAX_SIZE = 40;
        /** Size of the upscaled base texture */
        // Power of two so that we get mipmaps
        const TEX_SIZE = 2 ** 6;
        /** Render the graphic this much larger then scale down */
        const UPSCALE = TEX_SIZE / MAX_SIZE;
        /** Size of the base graphic itself, not including whitespace (upscaled) */
        const BASE_SIZE = BaseTextures.BODY_SIZE * UPSCALE;
        const texture = RenderTexture.create({width: TEX_SIZE, height: TEX_SIZE});
        const [hBase, sBase, vBase] = BaseTextures.type2Color(baseType, colorblind);

        const getGradientColor = (hChange: number, sChange: number, vChange: number) => ColorUtil.compose256(
            ...ColorConvert.hsv.rgb([
                (hBase + hChange + 360) % 360,
                MathUtil.clamp(sBase + sChange, 0, 100),
                MathUtil.clamp(vBase + vChange, 0, 100)
            ])
        );

        GradientFactory.createLinearGradient(Eterna.app.pixi.renderer as Renderer, texture, {
            x0: 0,
            y0: 0,
            x1: BASE_SIZE,
            y1: BASE_SIZE,
            colorStops: [
                {offset: 0.00, color: getGradientColor(0, -20, 20)},
                {offset: 0.50, color: getGradientColor(0, 0, 0)},
                {offset: 1.00, color: getGradientColor(0, 20, -20)}
            ]
        });

        const bodyWrapper = new Container();
        // The old body graphics had whitespace
        // TODO: Should we handle this in the positioning logic instead of the texture itself?
        const bodyBg = new Graphics()
            .beginFill(0)
            .drawRect(0, 0, TEX_SIZE, TEX_SIZE)
            .endFill();
        bodyBg.alpha = 0;
        bodyWrapper.addChild(bodyBg);

        const body = new Graphics()
            .beginTextureFill({texture})
            // Note that the texture is positioned relative to the origin, so we need to draw our circle
            // at what will be the center of the texture
            .drawCircle(BASE_SIZE / 2, BASE_SIZE / 2, BASE_SIZE / 2)
            .endFill();
        // The MSAA we're applying in renderToTexture is decent, but this slightly cuts down on a little remaining
        // artifacting. Maybe once smooth-graphics supports texture fills that will make this unnecessary?
        body.filters = [new BlurFilter(1, 40)];
        // Center the body in the whitespace
        body.x = (TEX_SIZE / 2) - (BASE_SIZE / 2);
        body.y = (TEX_SIZE / 2) - (BASE_SIZE / 2);
        bodyWrapper.addChild(body);

        const bodyData = [EternaTextureUtil.scaleBy(TextureUtil.renderToTexture(bodyWrapper), 1 / UPSCALE)];
        EternaTextureUtil.createScaled(bodyData, zoomScalar, 5);
        return bodyData;
    }

    private static getLetterText(baseType: number, sizeScalar = 1, color = 0) {
        return Fonts.std(BaseTextures.type2Letter(baseType))
            .fontSize(18 * sizeScalar)
            .bold()
            .color(color)
            .build();
    }

    private static createLetterTextures(baseType: number, zoomScalar: number): Texture[] {
        const textures = [TextureUtil.renderToTexture(BaseTextures.getLetterText(baseType))];

        EternaTextureUtil.createScaled(textures, zoomScalar, Base.NUM_ZOOM_LEVELS);
        return textures;
    }

    private static createLockTextures(baseType: number, zoomScalar: number, colorblind: boolean): Texture[] {
        /** Size of largest lock */
        const MAX_SIZE = BaseTextures.BODY_SIZE / 1.1;
        /** Size of the upscaled lock */
        // Power of two so we get mipmaps
        const RENDER_SIZE = 2 ** 6;
        /** Render the graphic this much larger then scale down */
        const UPSCALE = RENDER_SIZE / MAX_SIZE;
        /** Thickness of the upscaled lock */
        const LOCK_WIDTH = RENDER_SIZE / 5;

        const lockWrapper = new Container();

        const TOP_FROM_CENTER = LOCK_WIDTH / 3.25;
        const R = TOP_FROM_CENTER * 2;

        const lockBg = new Graphics()
            .beginFill(ColorUtil.blend(
                ColorUtil.compose256(...ColorConvert.hsv.rgb(BaseTextures.type2Color(baseType, colorblind))),
                0xFFFFFF,
                0.4
            ))
            .lineStyle(LOCK_WIDTH / 1.5, ColorUtil.blend(
                ColorUtil.compose256(...ColorConvert.hsv.rgb(BaseTextures.type2Color(baseType, colorblind))),
                0x111111,
                0.35
            ))
            .drawCircle(
                0,
                (
                    2 * R + (RENDER_SIZE * 0.5 - R) - (Math.sqrt(R ** 2 - (-TOP_FROM_CENTER) ** 2) - TOP_FROM_CENTER)
                ) / 2 - R,
                RENDER_SIZE / 2
            )
            .endFill()
            .beginFill(ColorUtil.blend(
                ColorUtil.compose256(...ColorConvert.hsv.rgb(BaseTextures.type2Color(baseType, colorblind))),
                0x111111,
                0.35
            ))
            .endFill();
        lockBg.filters = [new BlurFilter(1, 40)];
        lockWrapper.addChild(lockBg);

        const color = ColorUtil.blend(
            ColorUtil.compose256(...ColorConvert.hsv.rgb(BaseTextures.type2Color(baseType, colorblind))),
            0x111111,
            0.30
        );
        const lock = new Sprite(BitmapManager.getBitmap(Bitmaps.BaseLock));
        lock.height = RENDER_SIZE * 0.65;
        lock.scale.x = lock.scale.y;
        lock.filters = [new ColorReplaceFilter(
            [0, 0, 0],
            [ColorUtil.getRed(color) / 255, ColorUtil.getGreen(color) / 255, ColorUtil.getBlue(color) / 255]
        )];
        lockWrapper.addChild(lock);
        DisplayUtil.positionRelative(lock, HAlign.CENTER, VAlign.CENTER, lockBg, HAlign.CENTER, VAlign.CENTER);

        lockWrapper.filters = [new AdjustmentFilter({alpha: 0.85})];

        const lockTex = TextureUtil.renderToTexture(lockWrapper, MSAA_QUALITY.LOW);

        const lockData = [EternaTextureUtil.scaleBy(lockTex, 1 / UPSCALE, MSAA_QUALITY.LOW)];
        EternaTextureUtil.createScaled(lockData, zoomScalar, 5);
        return lockData;
    }

    // AMW TODO: isn't this just the EPars function?
    private static type2Letter(baseType: number): 'U' | 'A' | 'G' | 'C' {
        switch (baseType) {
            case RNABase.URACIL:
                return 'U';
            case RNABase.ADENINE:
                return 'A';
            case RNABase.GUANINE:
                return 'G';
            case RNABase.CYTOSINE:
                return 'C';
            default:
                throw new Error(`Bad baseType: ${baseType}`);
        }
    }

    /** Return the HSV color for the current base type */
    private static type2Color(baseType: number, colorblind: boolean): [number, number, number] {
        const letter = BaseTextures.type2Letter(baseType);
        switch (letter) {
            case 'A': return colorblind ? [44, 80, 98] : [44, 80, 98];
            case 'C': return colorblind ? [177, 92, 80] : [130, 85, 65];
            case 'G': return colorblind ? [345, 73, 80] : [358, 81, 75];
            case 'U': return colorblind ? [237, 50, 98] : [204, 100, 85];
            default: Assert.unreachable(letter);
        }
    }

    private static textureForSize(textures: Texture[], ii: number, sizeNum: number, levels?: number): Texture {
        if (textures.length % Base.NUM_ZOOM_LEVELS !== 0) {
            throw new Error(`Invalid textures array length ${textures.length}`);
        }

        const origLength: number = textures.length / (levels ?? Base.NUM_ZOOM_LEVELS);
        return textures[(origLength * sizeNum + ii)];
    }

    public static BODY_SIZE = 20;
}

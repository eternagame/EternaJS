import {
    Container, Graphics, Renderer, RenderTexture, Text, Texture
} from 'pixi.js';
import ColorConvert from 'color-convert';
import {
    Assert, ColorUtil, MathUtil, TextureUtil
} from 'flashbang';
import {RNABase} from 'eterna/EPars';
import EternaTextureUtil from 'eterna/util/EternaTextureUtil';
import Fonts from 'eterna/util/Fonts';
import {GradientFactory} from '@pixi-essentials/gradients';
import {FXAAFilter} from '@pixi/filter-fxaa';
import Eterna from 'eterna/Eterna';
import {BlurFilter} from '@pixi/filter-blur';
import BaseDrawFlags from './BaseDrawFlags';
import Base from './Base';

/** Encapsulates textures for a Base type */
export default class BaseTextures {
    public baseType: number;

    public letterData: Texture[];
    public lockIconData: Texture[];
    public bodyData: Texture[];

    constructor(baseType: number) {
        this.baseType = baseType;
        this.letterData = BaseTextures.createLetterTextures(baseType, Base.ZOOM_SCALE_FACTOR);
        this.bodyData = BaseTextures.createBodyTextures(baseType, Base.ZOOM_SCALE_FACTOR);
    }

    public getBodyTexture(zoomLevel: number): Texture {
        return this.bodyData[zoomLevel];
    }

    public getLetterTexture(zoomLevel: number, drawFlags: number): Texture | null {
        const lettermode: boolean = (drawFlags & BaseDrawFlags.LETTER_MODE) !== 0;

        if (zoomLevel < Base.NUM_ZOOM_LEVELS && lettermode) {
            return BaseTextures.textureForSize(this.letterData, 0, zoomLevel);
        }

        return null;
    }

    private static createBodyTextures(baseType: number, zoomScalar: number) {
        Assert.assertIsDefined(Eterna.app.pixi);
        /** Size of largest body texture */
        const MAX_SIZE = 40;
        /** Render the graphic this much larger then scale down */
        const UPSCALE = 2;
        /** Size of the upscaled base texture */
        const TEX_SIZE = MAX_SIZE * UPSCALE;
        /** Size of the base graphic itself, not including whitespace (upscaled) */
        const BASE_SIZE = BaseTextures.BODY_SIZE * UPSCALE;
        const texture = RenderTexture.create({width: TEX_SIZE, height: TEX_SIZE});
        const [hBase, sBase, vBase] = BaseTextures.type2Color(baseType);

        const getGradientColor = (hChange: number, sChange: number, vChange: number) => ColorUtil.compose256(
            ...ColorConvert.hsv.rgb([
                (hBase + hChange + 360) % 360,
                MathUtil.clamp(sBase + sChange, 0, 100),
                MathUtil.clamp(vBase + vChange, 0, 100)
            ])
        );

        GradientFactory.createRadialGradient(Eterna.app.pixi.renderer as Renderer, texture, {
            x0: (14 / 53) * BASE_SIZE,
            y0: (18 / 53) * BASE_SIZE,
            r0: 0 * BASE_SIZE,
            x1: (14 / 53) * BASE_SIZE,
            y1: (18 / 53) * BASE_SIZE,
            r1: ((65 - 18) / 53) * BASE_SIZE,
            colorStops: [
                {offset: 0.00, color: getGradientColor(0, 15, 15)},
                {offset: 0.50, color: getGradientColor(0, 0, 0)},
                {offset: 0.64, color: getGradientColor(0, 3, -3)},
                {offset: 0.67, color: getGradientColor(-3, 15, -18)}
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
        // Antialiasing, because the renderer-wide antialiasing is insufficient and smooth-graphics doesn't
        // support texture fill yet (we need this in addition to the 2x upscaling)
        body.filters = [new BlurFilter(1, 40), new FXAAFilter()];
        // Center the body in the whitespace
        body.x = (TEX_SIZE / 2) - (BASE_SIZE / 2);
        body.y = (TEX_SIZE / 2) - (BASE_SIZE / 2);
        bodyWrapper.addChild(body);

        const bodyData = [EternaTextureUtil.scaleBy(TextureUtil.renderToTexture(bodyWrapper), 1 / UPSCALE)];
        EternaTextureUtil.createScaled(bodyData, zoomScalar, 5);
        return bodyData;
    }

    private static createLetterTextures(baseType: number, zoomScalar: number): Texture[] {
        const bigLetter: Text = Fonts.std(BaseTextures.type2Letter(baseType)).fontSize(18)
            .bold()
            .color(0)
            .dropShadow()
            .shadowFill(ColorUtil.compose256(...ColorConvert.hsv.rgb(this.type2Color(baseType))), 1)
            .shadowPosition(0, 0)
            .shadowBlur(3)
            .build();
        bigLetter.alpha = 1;
        const textures: Texture[] = [TextureUtil.renderToTexture(bigLetter)];

        EternaTextureUtil.createScaled(textures, zoomScalar, Base.NUM_ZOOM_LEVELS);
        return textures;
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
    private static type2Color(baseType: number): [number, number, number] {
        const letter = BaseTextures.type2Letter(baseType);
        switch (letter) {
            case 'A': return [44, 80, 98];
            case 'C': return [130, 85, 65];
            case 'G': return [358, 81, 75];
            case 'U': return [204, 100, 85];
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

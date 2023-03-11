import {
    Container, Graphics, Sprite, Texture
} from 'pixi.js';
import {ColorUtil, TextureUtil} from 'flashbang';
import {RNABase, RNAPaint} from 'eterna/EPars';
import ExpPainter from 'eterna/ExpPainter';
import Sounds from 'eterna/resources/Sounds';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import EternaTextureUtil from 'eterna/util/EternaTextureUtil';
import {ColorMatrixFilter} from '@pixi/filter-color-matrix';
import {BlurFilter} from '@pixi/filter-blur';
import {AdjustmentFilter} from 'pixi-filters';
import BaseTextures from './BaseTextures';
import BaseDrawFlags from './BaseDrawFlags';
import Base from './Base';

/** Handles initialization and management of Base-related assets */
export default class BaseAssets {
    public static getHitTestDistanceThreshold(zoomLevel: number): number {
        return BaseAssets._baseUBitmaps.bodyData[zoomLevel].width / 2.0;
    }

    public static getBodyTexture(baseType: number, colorLevel: number, zoomLevel: number): Texture {
        if (BaseAssets.isBaseType(baseType) && colorLevel < 0) {
            return BaseAssets.getBaseBitmaps(baseType).getBodyTexture(zoomLevel);
        } else if (baseType === RNAPaint.LOCK) {
            return BaseAssets.textureForSize(BaseAssets._backboneBodyData, 0, zoomLevel);
        } else if (colorLevel < 0) {
            if (zoomLevel < Base.NUM_ZOOM_LEVELS) {
                return BaseAssets.textureForSize(BaseAssets._sphereData, ExpPainter.NUM_COLORS, zoomLevel);
            } else if (zoomLevel < Base.NUM_ZOOM_LEVELS * 2) {
                return BaseAssets.textureForSize(
                    BaseAssets._sphereMidData, ExpPainter.NUM_COLORS, zoomLevel - Base.NUM_ZOOM_LEVELS
                );
            } else {
                return BaseAssets.textureForSize(
                    BaseAssets._sphereMinData, ExpPainter.NUM_COLORS, zoomLevel - Base.NUM_ZOOM_LEVELS
                );
            }
        } else if (zoomLevel < Base.NUM_ZOOM_LEVELS) {
            return BaseAssets.textureForSize(BaseAssets._sphereData, colorLevel, zoomLevel);
        } else if (zoomLevel < Base.NUM_ZOOM_LEVELS * 2) {
            return BaseAssets.textureForSize(BaseAssets._sphereMidData, colorLevel, zoomLevel - Base.NUM_ZOOM_LEVELS);
        } else {
            return BaseAssets._sphereMinData[colorLevel];
        }
    }

    public static getBarcodeTexture(zoomLevel: number, drawFlags: number): Texture | null {
        if ((drawFlags & BaseDrawFlags.USE_BARCODE) !== 0) {
            if (zoomLevel < Base.NUM_ZOOM_LEVELS) {
                return BaseAssets.textureForSize(BaseAssets._barcodeData, 0, zoomLevel);
            } else if (zoomLevel < Base.NUM_ZOOM_LEVELS * 2) {
                return BaseAssets.textureForSize(BaseAssets._barcodeMidData, 0, zoomLevel - Base.NUM_ZOOM_LEVELS);
            } else {
                return BaseAssets._barcodeMinData[0];
            }
        }

        return null;
    }

    public static getLetterTexture(baseType: number, zoomLevel: number, drawFlags: number): Texture | null {
        return BaseAssets.isBaseType(baseType)
            ? BaseAssets.getBaseBitmaps(baseType).getLetterTexture(zoomLevel, drawFlags)
            : null;
    }

    public static getLockTexture(zoomLevel: number, drawFlags: number): Texture | null {
        const isLock: boolean = (drawFlags & BaseDrawFlags.LOCKED) !== 0;

        if (zoomLevel >= 4) return null;
        if (!isLock) return null;

        return this._lockData[zoomLevel];
    }

    public static getGlowTexture(zoomLevel: number, drawFlags: number) {
        const isDontcare: boolean = (drawFlags & BaseDrawFlags.IS_DONTCARE) !== 0;

        if (zoomLevel >= 4) return null;

        if (isDontcare) {
            return BaseAssets._unconstrainedGlowData[zoomLevel];
        }
        return BaseAssets._constrainedGlowData[zoomLevel];
    }

    public static getBackboneTexture(zoomLevel: number): Texture {
        if (zoomLevel < Base.NUM_ZOOM_LEVELS) {
            return BaseAssets.textureForSize(BaseAssets._backboneBodyData, 0, zoomLevel);
        } else {
            return BaseAssets.textureForSize(BaseAssets._backboneMidData, 0, zoomLevel - Base.NUM_ZOOM_LEVELS);
        }
    }

    public static getSatellite0Texture(zoomLevel: number, st0DiffDegree: number): Texture {
        return BaseAssets.textureForSize(BaseAssets._satelliteData, Math.trunc(st0DiffDegree / 5), zoomLevel);
    }

    public static getSatellite1Texture(zoomLevel: number, st1DiffDegree: number, pairType: number): Texture {
        if (pairType === -1 || pairType === 2) {
            return BaseAssets.textureForSize(BaseAssets._satelliteData, Math.trunc(st1DiffDegree / 5), zoomLevel);
        } else if (pairType === 1) {
            return BaseAssets.textureForSize(BaseAssets._satelliteWeakerData, Math.trunc(st1DiffDegree / 5), zoomLevel);
        } else {
            return BaseAssets.textureForSize(
                BaseAssets._satelliteStrongerData, Math.trunc(st1DiffDegree / 5), zoomLevel
            );
        }
    }

    public static getSparkTexture(progress: number): Texture {
        progress = (1 - progress) * (1 - progress);
        progress = 1 - progress;

        let progIndex: number = Math.trunc(progress * 10);

        if (progIndex >= 10) progIndex = 9;
        else if (progIndex < 0) progIndex = 0;

        return BaseAssets._sparkBitmaps[progIndex];
    }

    public static getSatelliteReferenceBaseSize(zoomLevel: number): number {
        return BaseAssets._baseUBitmaps.bodyData[zoomLevel].width;
    }

    public static getBaseTypeSound(type: number): string | null {
        switch (type) {
            case RNABase.ADENINE: return Sounds.SoundY;
            case RNABase.URACIL: return Sounds.SoundB;
            case RNABase.GUANINE: return Sounds.SoundR;
            case RNABase.CYTOSINE: return Sounds.SoundG;
            default: return null;
        }
    }

    private static getBaseBitmaps(baseType: number): BaseTextures {
        switch (baseType) {
            case RNABase.URACIL:
                return BaseAssets._baseUBitmaps;
            case RNABase.ADENINE:
                return BaseAssets._baseABitmaps;
            case RNABase.GUANINE:
                return BaseAssets._baseGBitmaps;
            case RNABase.CYTOSINE:
                return BaseAssets._baseCBitmaps;
            default:
                throw new Error(`Bad base type: ${baseType}`);
        }
    }

    private static isBaseType(baseType: number): boolean {
        switch (baseType) {
            case RNABase.URACIL:
            case RNABase.ADENINE:
            case RNABase.GUANINE:
            case RNABase.CYTOSINE:
                return true;
            default:
                return false;
        }
    }

    /* internal */
    public static _init(): void {
        if (BaseAssets._inited) {
            return;
        }
        BaseAssets._inited = true;

        // SPHERE TEXTURES

        BaseAssets._sphereData = [];
        BaseAssets._sphereMidData = [];
        BaseAssets._sphereMinData = [];

        // TODO: Move to drawing these like we do with the regular base graphics now
        const baseWPattern = EternaTextureUtil.scaleBy(BitmapManager.getBitmap(Bitmaps.BaseWPattern), 0.5);
        const baseWMidPattern = EternaTextureUtil.scaleBy(BitmapManager.getBitmap(Bitmaps.BaseWMidPattern), 0.5);
        const baseWMin = EternaTextureUtil.scaleBy(BitmapManager.getBitmap(Bitmaps.BaseWMin), 0.5);

        for (let ii: number = -ExpPainter.NUM_COLORS; ii <= 2 * ExpPainter.NUM_COLORS + 1; ii++) {
            const color: number = ExpPainter.getColorByLevel(ii);
            const r: number = ColorUtil.getRed(color) / 255;
            const g: number = ColorUtil.getGreen(color) / 255;
            const b: number = ColorUtil.getBlue(color) / 255;

            const colorTransform = ColorUtil.colorTransform(0, 0, 0, 1, r, g, b, 0);

            const sphereBitmap: Container = new Container();
            const pattern = new Sprite(baseWPattern);
            pattern.filters = [colorTransform];
            sphereBitmap.addChild(pattern);
            BaseAssets._sphereData.push(TextureUtil.renderToTexture(sphereBitmap));

            const sphereBitmapMid: Container = new Container();
            const patternMid = new Sprite(baseWMidPattern);
            patternMid.filters = [colorTransform];
            sphereBitmapMid.addChild(patternMid);
            BaseAssets._sphereMidData.push(TextureUtil.renderToTexture(sphereBitmapMid));

            const sphereBitmapMin: Container = new Container();
            const patternMin = new Sprite(baseWMin);
            patternMin.filters = [colorTransform];
            sphereBitmapMin.addChild(patternMin);
            BaseAssets._sphereMinData.push(TextureUtil.renderToTexture(sphereBitmapMin));
        }

        EternaTextureUtil.createScaled(BaseAssets._sphereData, 0.75, Base.NUM_ZOOM_LEVELS);
        EternaTextureUtil.createScaled(BaseAssets._sphereMidData, 0.75, Base.NUM_ZOOM_LEVELS);

        // BASE BODY TEXTURES
        BaseAssets._baseUBitmaps = new BaseTextures(RNABase.URACIL);
        BaseAssets._baseABitmaps = new BaseTextures(RNABase.ADENINE);
        BaseAssets._baseGBitmaps = new BaseTextures(RNABase.GUANINE);
        BaseAssets._baseCBitmaps = new BaseTextures(RNABase.CYTOSINE);

        BaseAssets._backboneBodyData = [BitmapManager.getBitmap(Bitmaps.Backbone)];
        BaseAssets._backboneMidData = [BitmapManager.getBitmap(Bitmaps.BackboneMid)];

        EternaTextureUtil.createScaled(BaseAssets._backboneBodyData, 0.75, Base.NUM_ZOOM_LEVELS);
        EternaTextureUtil.createScaled(BaseAssets._backboneMidData, 0.75, Base.NUM_ZOOM_LEVELS);

        // BARCODE TEXTURES
        BaseAssets._barcodeData = [BaseAssets.drawCircularBarcode(16, 6, /* 0.5 */ 1)];
        BaseAssets._barcodeMidData = [BaseAssets.drawCircularBarcode(12, 3, /* 0.5 */ 1)];
        BaseAssets._barcodeMinData = [BaseAssets.drawCircularBarcode(6, 2, /* 0.5 */ 1)];

        EternaTextureUtil.createScaled(BaseAssets._barcodeData, 0.75, Base.NUM_ZOOM_LEVELS);
        EternaTextureUtil.createScaled(BaseAssets._barcodeMidData, 0.75, Base.NUM_ZOOM_LEVELS);

        // SATELLITE TEXTURES
        BaseAssets._satelliteData = BaseAssets.createSatelliteBitmaps(
            ColorUtil.colorTransform(1, 1, 1, 1, 0, 0, 0, 0)
        );
        BaseAssets._satelliteWeakerData = BaseAssets.createSatelliteBitmaps(
            ColorUtil.colorTransform(1, 1, 1, 0.5, 0, 0, 0, 0)
        );
        BaseAssets._satelliteStrongerData = BaseAssets.createSatelliteBitmaps(
            ColorUtil.colorTransform(3, 3, 3, 3, 0, 0, 0, 0)
        );

        // SPARK TEXTURES
        BaseAssets._sparkBitmaps = EternaTextureUtil.createTransparent(
            BitmapManager.getBitmap(Bitmaps.BonusSymbol), 10
        );

        // GLOW TEXTURES
        BaseAssets._constrainedGlowData = BaseAssets.createGlowBitmaps(0xFFFFFF);
        BaseAssets._unconstrainedGlowData = BaseAssets.createGlowBitmaps(0xA573E5);

        // LOCK TEXTURES
        BaseAssets._lockData = BaseAssets.createLockBitmaps();
    }

    public static drawCircularBarcode(radius: number, lineThickness: number, lineAlpha: number): Texture {
        const scratch = new Graphics();

        scratch.clear();
        const centerX: number = radius;
        const centerY: number = radius;
        const twoPI: number = 2 * Math.PI;
        let xx: number = centerX + Math.cos(0) * radius;
        let yy: number = centerY + Math.sin(0) * radius;

        scratch.moveTo(xx, yy);

        const steps = 360;

        for (let i = 1; i <= steps; i++) {
            const color = (i % 32 < 16) ? 0xFFFFFF : 0x0;

            scratch.lineStyle(lineThickness, color, lineAlpha);
            xx = centerX + Math.cos((i / steps) * twoPI) * radius;
            yy = centerY + Math.sin((i / steps) * twoPI) * radius;
            scratch.lineTo(xx, yy);
        }

        return TextureUtil.renderToTexture(scratch);
    }

    public static createSatelliteBitmaps(colorTransform: ColorMatrixFilter): Texture[] {
        const baseImage: Texture = BitmapManager.getBitmap(Bitmaps.Satellite);
        const sprite = new Sprite(baseImage);
        sprite.filters = [colorTransform];
        const texture: Texture = TextureUtil.renderToTexture(sprite);

        const textures: Texture[] = EternaTextureUtil.createRotated(texture, 5);
        EternaTextureUtil.createScaled(textures, 0.75, Base.NUM_ZOOM_LEVELS);

        return textures;
    }

    private static createGlowBitmaps(color: number) {
        /** Size of largest glow */
        const MAX_SIZE = BaseTextures.BODY_SIZE + 6;
        /** Render the graphic this much larger then scale down */
        const UPSCALE = 2;
        /** Size of the upscaled glow */
        const RENDER_SIZE = MAX_SIZE * UPSCALE;
        /** Size of the full upscaled texture */
        const TEX_SIZE = RENDER_SIZE * 2;

        // Add whitespace to the edges so that the filter effects don't get cut off. x2 is chosen arbitrarily.
        const ringWrapper = new Container();
        const ringBg = new Graphics()
            .beginFill(0)
            .drawRect(0, 0, TEX_SIZE, TEX_SIZE)
            .endFill();
        ringBg.alpha = 0;
        ringWrapper.addChild(ringBg);

        const ring = new Graphics()
            .lineStyle({color, width: 1})
            .drawCircle(0, 0, RENDER_SIZE / 2)
            .endFill();
        ring.filters = [new BlurFilter(8, 16), new AdjustmentFilter({brightness: 1.5, alpha: 3})];
        // Center the ring in the larger texture
        ring.x = (TEX_SIZE) / 2;
        ring.y = (TEX_SIZE) / 2;
        ringWrapper.addChild(ring);

        const ringData = [EternaTextureUtil.scaleBy(TextureUtil.renderToTexture(ringWrapper), 1 / UPSCALE)];
        EternaTextureUtil.createScaled(ringData, 0.75, 5);
        return ringData;
    }

    private static createLockBitmaps() {
        /** Size of largest lock */
        const MAX_SIZE = BaseTextures.BODY_SIZE + 1;
        /** Render the graphic this much larger then scale down */
        const UPSCALE = 2;
        /** Size of the upscaled lock */
        const RENDER_SIZE = MAX_SIZE * UPSCALE;
        /** Thickness of the upscaled lock */
        const LOCK_WIDTH = RENDER_SIZE / 3;

        const lockWrapper = new Container();

        const lock = new Graphics()
            .beginFill(0xEEEEEE, 0.75)
            .drawRect(0, 0, LOCK_WIDTH, RENDER_SIZE)
            .endFill();
        lockWrapper.addChild(lock);

        const lockMask = new Graphics()
            .beginFill(0xFF0000)
            .drawCircle(0, 0, RENDER_SIZE / 2)
            .endFill();
        lockMask.x = LOCK_WIDTH / 2;
        lockMask.y = RENDER_SIZE / 2;
        lockWrapper.addChild(lockMask);
        lockWrapper.mask = lockMask;

        lockWrapper.angle = 45;

        const lockData = [EternaTextureUtil.scaleBy(TextureUtil.renderToTexture(lockWrapper), 1 / UPSCALE)];
        EternaTextureUtil.createScaled(lockData, 0.75, 5);
        return lockData;
    }

    private static textureForSize(textures: Texture[], ii: number, sizeNum: number, levels?: number): Texture {
        if (textures.length % Base.NUM_ZOOM_LEVELS !== 0) {
            throw new Error(`Invalid textures array length ${textures.length}`);
        }

        const origLength: number = textures.length / (levels ?? Base.NUM_ZOOM_LEVELS);
        return textures[(origLength * sizeNum + ii)];
    }

    private static _inited: boolean;

    // Base type specific graphics
    private static _baseUBitmaps: BaseTextures;
    private static _baseABitmaps: BaseTextures;
    private static _baseGBitmaps: BaseTextures;
    private static _baseCBitmaps: BaseTextures;

    // Base glow (constrained vs unconstrained)
    private static _constrainedGlowData: Texture[];
    private static _unconstrainedGlowData: Texture[];

    // Locks
    private static _lockData: Texture[];

    // Backbone textures
    private static _backboneBodyData: Texture[];
    private static _backboneMidData: Texture[];

    // Satellites for the max zoom
    private static _satelliteData: Texture[];
    private static _satelliteWeakerData: Texture[];
    private static _satelliteStrongerData: Texture[];

    // Barcode outline data
    private static _barcodeData: Texture[];
    private static _barcodeMidData: Texture[];
    private static _barcodeMinData: Texture[];

    // Bitmaps for blank bases
    private static _sphereData: Texture[];
    private static _sphereMidData: Texture[];
    private static _sphereMinData: Texture[];

    private static _sparkBitmaps: Texture[];
}

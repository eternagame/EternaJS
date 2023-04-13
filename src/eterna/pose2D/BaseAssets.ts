import {
    Container, Graphics, Sprite, Texture
} from 'pixi.js';
import {
    ColorUtil, TextureUtil
} from 'flashbang';
import {RNABase, RNAPaint} from 'eterna/EPars';
import ExpPainter from 'eterna/ExpPainter';
import Sounds from 'eterna/resources/Sounds';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import EternaTextureUtil from 'eterna/util/EternaTextureUtil';
import {ColorMatrixFilter} from '@pixi/filter-color-matrix';
import {BlurFilter} from '@pixi/filter-blur';
import {AdjustmentFilter} from 'pixi-filters';
import {FXAAFilter} from '@pixi/filter-fxaa';
import BaseTextures from './BaseTextures';
import BaseDrawFlags from './BaseDrawFlags';
import Base from './Base';

export interface ZoomLevelTexture {
    texture: Texture;
    scale: number;
}

/** Handles initialization and management of Base-related assets */
export default class BaseAssets {
    public static getHitTestDistanceThreshold(zoomLevel: number): number {
        const body = BaseAssets._baseUBitmaps.bodyData[zoomLevel];
        return (body.texture.width * body.scale) / 2.0;
    }

    public static getBodyTexture(
        baseType: number, colorLevel: number, zoomLevel: number, drawFlags: number
    ): ZoomLevelTexture {
        const colorblindTheme: boolean = (drawFlags & BaseDrawFlags.COLORBLIND_THEME) !== 0;

        if (BaseAssets.isBaseType(baseType) && colorLevel < 0) {
            return BaseAssets.getBaseBitmaps(baseType).getBodyTexture(zoomLevel, colorblindTheme);
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

    public static getBarcodeTexture(zoomLevel: number, drawFlags: number): ZoomLevelTexture | null {
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

    public static getLetterTexture(baseType: number, zoomLevel: number, drawFlags: number): ZoomLevelTexture | null {
        return BaseAssets.isBaseType(baseType)
            ? BaseAssets.getBaseBitmaps(baseType).getLetterTexture(zoomLevel, drawFlags)
            : null;
    }

    public static getLockTexture(zoomLevel: number, drawFlags: number): ZoomLevelTexture | null {
        const isLock: boolean = (drawFlags & BaseDrawFlags.LOCKED) !== 0;

        if (zoomLevel >= 4) return null;
        if (!isLock) return null;

        return this._lockBitmaps[zoomLevel];
    }

    public static getLetterLockTexture(
        baseType: number, zoomLevel: number, drawFlags: number
    ): ZoomLevelTexture | null {
        const isLock: boolean = (drawFlags & BaseDrawFlags.LOCKED) !== 0;
        const colorblindTheme: boolean = (drawFlags & BaseDrawFlags.COLORBLIND_THEME) !== 0;

        if (zoomLevel >= 4) return null;
        if (!isLock) return null;

        return colorblindTheme
            ? this.getBaseBitmaps(baseType).colorblindLockData[zoomLevel]
            : this.getBaseBitmaps(baseType).lockData[zoomLevel];
    }

    public static getGlowTexture(zoomLevel: number, drawFlags: number): ZoomLevelTexture | null {
        const isDontcare: boolean = (drawFlags & BaseDrawFlags.IS_DONTCARE) !== 0;

        if (zoomLevel >= 4) return null;

        if (isDontcare) {
            return BaseAssets._unconstrainedGlowData[zoomLevel];
        }
        return BaseAssets._constrainedGlowData[zoomLevel];
    }

    public static getBackboneTexture(zoomLevel: number): ZoomLevelTexture {
        if (zoomLevel < Base.NUM_ZOOM_LEVELS) {
            return BaseAssets.textureForSize(BaseAssets._backboneBodyData, 0, zoomLevel);
        } else {
            return BaseAssets.textureForSize(BaseAssets._backboneMidData, 0, zoomLevel - Base.NUM_ZOOM_LEVELS);
        }
    }

    public static getSatellite0Texture(zoomLevel: number, st0DiffDegree: number): ZoomLevelTexture {
        return BaseAssets.textureForSize(BaseAssets._satelliteData, Math.trunc(st0DiffDegree / 5), zoomLevel);
    }

    public static getSatellite1Texture(zoomLevel: number, st1DiffDegree: number, pairType: number): ZoomLevelTexture {
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

    public static getSparkTexture(progress: number): ZoomLevelTexture {
        progress = (1 - progress) * (1 - progress);
        progress = 1 - progress;

        let progIndex: number = Math.trunc(progress * 10);

        if (progIndex >= 10) progIndex = 9;
        else if (progIndex < 0) progIndex = 0;

        return BaseAssets._sparkBitmaps[progIndex];
    }

    public static getSatelliteReferenceBaseSize(zoomLevel: number): number {
        const body = BaseAssets._baseUBitmaps.bodyData[zoomLevel];
        return body.texture.width * body.scale;
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

        const sphereData = [];
        const sphereMidData = [];
        const sphereMinData = [];
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
            sphereData.push(TextureUtil.renderToTexture(sphereBitmap));

            const sphereBitmapMid: Container = new Container();
            const patternMid = new Sprite(baseWMidPattern);
            patternMid.filters = [colorTransform];
            sphereBitmapMid.addChild(patternMid);
            sphereMidData.push(TextureUtil.renderToTexture(sphereBitmapMid));

            const sphereBitmapMin: Container = new Container();
            const patternMin = new Sprite(baseWMin);
            patternMin.filters = [colorTransform];
            sphereBitmapMin.addChild(patternMin);
            sphereMinData.push(TextureUtil.renderToTexture(sphereBitmapMin));
        }

        // TODO: Rip out all the pre-scaled graphics and return alternate scales
        EternaTextureUtil.createScaled(sphereData, 0.75, Base.NUM_ZOOM_LEVELS);
        EternaTextureUtil.createScaled(sphereMidData, 0.75, Base.NUM_ZOOM_LEVELS);
        BaseAssets._sphereData = sphereData.map((tex) => ({texture: tex, scale: 1}));
        BaseAssets._sphereMidData = sphereMidData.map((tex) => ({texture: tex, scale: 1}));
        BaseAssets._sphereMinData = sphereMinData.map((tex) => ({texture: tex, scale: 1}));

        // BASE BODY TEXTURES
        BaseAssets._baseUBitmaps = new BaseTextures(RNABase.URACIL);
        BaseAssets._baseABitmaps = new BaseTextures(RNABase.ADENINE);
        BaseAssets._baseGBitmaps = new BaseTextures(RNABase.GUANINE);
        BaseAssets._baseCBitmaps = new BaseTextures(RNABase.CYTOSINE);

        const backboneBodyData = [BitmapManager.getBitmap(Bitmaps.Backbone)];
        const backboneMidData = [BitmapManager.getBitmap(Bitmaps.BackboneMid)];

        EternaTextureUtil.createScaled(backboneBodyData, 0.75, Base.NUM_ZOOM_LEVELS);
        EternaTextureUtil.createScaled(backboneMidData, 0.75, Base.NUM_ZOOM_LEVELS);

        BaseAssets._backboneBodyData = backboneBodyData.map((tex) => ({texture: tex, scale: 1}));
        BaseAssets._backboneMidData = backboneMidData.map((tex) => ({texture: tex, scale: 1}));

        // BARCODE TEXTURES
        const barcodeData = [BaseAssets.drawCircularBarcode(16, 6, /* 0.5 */ 1)];
        const barcodeMidData = [BaseAssets.drawCircularBarcode(12, 3, /* 0.5 */ 1)];
        const barcodeMinData = [BaseAssets.drawCircularBarcode(6, 2, /* 0.5 */ 1)];

        EternaTextureUtil.createScaled(barcodeData, 0.75, Base.NUM_ZOOM_LEVELS);
        EternaTextureUtil.createScaled(barcodeMidData, 0.75, Base.NUM_ZOOM_LEVELS);

        BaseAssets._barcodeData = barcodeData.map((tex) => ({texture: tex, scale: 1}));
        BaseAssets._barcodeMidData = barcodeMidData.map((tex) => ({texture: tex, scale: 1}));
        BaseAssets._barcodeMinData = barcodeMinData.map((tex) => ({texture: tex, scale: 1}));

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
        ).map((tex) => ({texture: tex, scale: 1}));

        // GLOW TEXTURES
        BaseAssets._constrainedGlowData = BaseAssets.createGlowBitmaps(0xFFFFFF);
        BaseAssets._unconstrainedGlowData = BaseAssets.createGlowBitmaps(0xA573E5);

        BaseAssets._lockBitmaps = BaseAssets.createLockBitmaps();
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

    public static createSatelliteBitmaps(colorTransform: ColorMatrixFilter): ZoomLevelTexture[] {
        const baseImage: Texture = BitmapManager.getBitmap(Bitmaps.Satellite);
        const sprite = new Sprite(baseImage);
        sprite.filters = [colorTransform];
        const texture: Texture = TextureUtil.renderToTexture(sprite);

        // TODO: Rip out pre-rotation/scaling
        const textures: Texture[] = EternaTextureUtil.createRotated(texture, 5);
        EternaTextureUtil.createScaled(textures, 0.75, Base.NUM_ZOOM_LEVELS);

        return textures.map((tex) => ({texture: tex, scale: 1}));
    }

    private static createGlowBitmaps(color: number): ZoomLevelTexture[] {
        /** Size of largest glow */
        const MAX_SIZE = BaseTextures.BODY_SIZE + 6;

        const getGlowTex = (renderSize: number) => {
            const ringWrapper = new Container();
            const ringBg = new Graphics()
                .beginFill(0)
                .drawRect(0, 0, renderSize, renderSize)
                .endFill();
            ringBg.alpha = 0;
            ringWrapper.addChild(ringBg);

            // The ring is drawn smaller than the overall texture to ensure the glow is not cut off.
            // We'll make it half the size, semi-arbitrarily
            const ring = new Graphics()
                .lineStyle({color, width: 4})
                .drawCircle(0, 0, renderSize / 4)
                .endFill();
            ring.filters = [new BlurFilter(8, 16), new AdjustmentFilter({alpha: 1.15}), new FXAAFilter()];
            // Center the ring in the larger texture
            ring.x = renderSize / 2;
            ring.y = renderSize / 2;
            ringWrapper.addChild(ring);

            return TextureUtil.renderToTexture(ringWrapper);
        };

        const texLgSize = 2 ** 7;
        const texLg = getGlowTex(texLgSize);

        return [
            {texture: texLg, scale: (MAX_SIZE / texLgSize) * 2},
            {texture: texLg, scale: (MAX_SIZE / texLgSize) * 2 * 0.75},
            {texture: texLg, scale: (MAX_SIZE / texLgSize) * 2 * (0.75 ** 2)},
            // The -1 here addresses some artifacting
            {texture: texLg, scale: ((MAX_SIZE - 1) / texLgSize) * 2 * (0.75 ** 3)}
        ];
    }

    private static createLockBitmaps(): ZoomLevelTexture[] {
        const lock = new Sprite(BitmapManager.getBitmap(Bitmaps.BaseLock));
        lock.filters = [new AdjustmentFilter({alpha: 0.85})];

        const getLockTexture = (renderSize: number) => {
            lock.height = renderSize;
            lock.scale.x = lock.scale.y;
            return TextureUtil.renderToTexture(lock);
        };

        // We use power-of-two size textures to ensure we have mipmaps
        const texSizeLg = 2 ** 4;
        const lockTexLg = getLockTexture(texSizeLg);

        // We pre-generate a smaller version of this texture because if we just scale down the
        // higher-res texture, the subpixel interpolation will cause undesirable artifacts
        // (eg, appearing to cut off the left of the circle or protruding the right of the circle)
        // Maybe if we draw this manually with smooth-graphics, we wouldn't need to do this?
        const texSizeSm = 2 ** 3;
        const lockTexSm = getLockTexture(texSizeSm);

        const tinyLock = new Graphics().beginFill(0x050505, 0.8).drawCircle(0, 0, 6);
        tinyLock.filters = [new BlurFilter(2, 4), new FXAAFilter()];
        const tinyLockTex = TextureUtil.renderToTexture(tinyLock);

        const maxSize = BaseTextures.BODY_SIZE - 6;

        return [
            {texture: lockTexLg, scale: maxSize / texSizeLg},
            {texture: lockTexLg, scale: (maxSize / texSizeLg) * 0.75},
            {texture: lockTexSm, scale: (maxSize / texSizeSm) * 0.75 * 0.75},
            {texture: tinyLockTex, scale: 0.25}
        ];
    }

    private static textureForSize(
        textures: ZoomLevelTexture[],
        ii: number,
        sizeNum: number,
        levels?: number
    ): ZoomLevelTexture {
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
    private static _constrainedGlowData: ZoomLevelTexture[];
    private static _unconstrainedGlowData: ZoomLevelTexture[];

    private static _lockBitmaps: ZoomLevelTexture[];

    // Backbone textures
    private static _backboneBodyData: ZoomLevelTexture[];
    private static _backboneMidData: ZoomLevelTexture[];

    // Satellites for the max zoom
    private static _satelliteData: ZoomLevelTexture[];
    private static _satelliteWeakerData: ZoomLevelTexture[];
    private static _satelliteStrongerData: ZoomLevelTexture[];

    // Barcode outline data
    private static _barcodeData: ZoomLevelTexture[];
    private static _barcodeMidData: ZoomLevelTexture[];
    private static _barcodeMinData: ZoomLevelTexture[];

    // Bitmaps for blank bases
    private static _sphereData: ZoomLevelTexture[];
    private static _sphereMidData: ZoomLevelTexture[];
    private static _sphereMinData: ZoomLevelTexture[];

    private static _sparkBitmaps: ZoomLevelTexture[];
}

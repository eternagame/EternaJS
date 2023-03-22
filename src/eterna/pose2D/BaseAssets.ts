import {
    Container, Graphics, MSAA_QUALITY, Sprite, Texture
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
import BaseTextures from './BaseTextures';
import BaseDrawFlags from './BaseDrawFlags';
import Base from './Base';

/** Handles initialization and management of Base-related assets */
export default class BaseAssets {
    public static getHitTestDistanceThreshold(zoomLevel: number): number {
        return BaseAssets._baseUBitmaps.bodyData[zoomLevel].width / 2.0;
    }

    public static getBodyTexture(baseType: number, colorLevel: number, zoomLevel: number, drawFlags: number): Texture {
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

        return this._lockBitmaps[zoomLevel];
    }

    public static getLetterLockTexture(baseType: number, zoomLevel: number, drawFlags: number): Texture | null {
        const isLock: boolean = (drawFlags & BaseDrawFlags.LOCKED) !== 0;
        const colorblindTheme: boolean = (drawFlags & BaseDrawFlags.COLORBLIND_THEME) !== 0;

        if (zoomLevel >= 4) return null;
        if (!isLock) return null;

        return colorblindTheme
            ? this.getBaseBitmaps(baseType).colorblindLockData[zoomLevel]
            : this.getBaseBitmaps(baseType).lockData[zoomLevel];
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
        /** Size of the upscaled glow */
        // Power of 2 so that we get mipmaps
        const RENDER_SIZE = 2 ** 6;
        /** Render the graphic this much larger then scale down */
        const UPSCALE = RENDER_SIZE / MAX_SIZE;
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
            .lineStyle({color, width: 4})
            .drawCircle(0, 0, RENDER_SIZE / 2)
            .endFill();
        ring.filters = [new BlurFilter(8, 16), new AdjustmentFilter({brightness: 1, alpha: 1.2})];
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
        // const MAX_SIZE = BaseTextures.BODY_SIZE - 6;
        // const MAX_SIZE = BaseTextures.BODY_SIZE + 2;
        const MAX_SIZE = BaseTextures.BODY_SIZE - 6;
        // Power of two so we get mipmaps
        const RENDER_SIZE = 2 ** 6;
        /** Render the graphic this much larger then scale down */
        const UPSCALE = RENDER_SIZE / MAX_SIZE;
        /** Thickness of the upscaled lock */
        // const LOCK_BAR_WIDTH = RENDER_SIZE / 6;
        // const LOCK_BAR_WIDTH = RENDER_SIZE / 4;
        // const LOCK_CIRCLE_WIDTH = LOCK_BAR_WIDTH;
        // const LOCK_CIRCLE_WIDTH = LOCK_BAR_WIDTH + 2;

        const lockWrapper = new Container();

        /*
        const lock = new Graphics()
            .beginFill(0x111111)
            .drawCircle(0, 0, LOCK_BAR_WIDTH)
            .drawRoundedRect(-(LOCK_BAR_WIDTH / 2), LOCK_BAR_WIDTH - 4, LOCK_BAR_WIDTH, LOCK_BAR_WIDTH * 1.5, 4)
            .endFill();
            // .lineStyle(LOCK_CIRCLE_WIDTH, 0x111111)
            // .drawCircle(LOCK_BAR_WIDTH / 2, RENDER_SIZE / 2, RENDER_SIZE / 2)
            // .lineStyle()
            // .beginFill(0x111111)
            // .beginFill(0x111111)
            // .drawRect(0, 0, LOCK_BAR_WIDTH, RENDER_SIZE)
            // .endFill();
        lockWrapper.addChild(lock);
        lock.filters = [new BlurFilter(1, 40), new AdjustmentFilter({alpha: 0.65})];
        // lock.filters = [new BlurFilter(1, 40), new AdjustmentFilter({alpha: 0.8})];
        */

        /*
        const lockMask = new Graphics()
            .lineStyle(LOCK_CIRCLE_WIDTH, 0xBBBBBB)
            .beginFill(0xFFFFFF)
            .drawCircle(0, 0, RENDER_SIZE / 2)
            .endFill();
        const lockMaskSprite = new Sprite(TextureUtil.renderToTexture(lockMask));
        lockWrapper.addChild(lockMaskSprite);
        lockWrapper.filters = [new BlurFilter(2, 10)];
        DisplayUtil.positionRelative(lockMaskSprite, HAlign.CENTER, VAlign.CENTER, lock, HAlign.CENTER, VAlign.CENTER);
        lockWrapper.mask = lockMaskSprite;
        */

        // lockWrapper.angle = 45;

        /*
        // The lock body is a taking up 66% of the space, centered on the bottom
        const BODY_R = RENDER_SIZE * 0.33;
        const BODY_CENTER_X = RENDER_SIZE * 0.5;
        const BODY_CENTER_Y = RENDER_SIZE - BODY_R;

        const SHACKLE_THICKNESS = RENDER_SIZE * 0.15;
        const SHACKLE_WIDTH = RENDER_SIZE * 0.5;
        const SHACKLE_TOP_HEIGHT = RENDER_SIZE * 0.2;
        const SHACKLE_TOP = RENDER_SIZE * 0;
        //         B
        //  ┌─────────────┐
        //  │      E      │
        //  │   ┌─────┐   │
        //  │   │     │   │
        //  │   │     │   │
        //  A   F     D   C
        const AX = RENDER_SIZE * 0.5 - SHACKLE_WIDTH * 0.5;
        const AY = SHACKLE_TOP + SHACKLE_TOP_HEIGHT;
        const BX = AX + SHACKLE_WIDTH * 0.5;
        const BY = SHACKLE_TOP;
        const CX = AX + SHACKLE_WIDTH;
        const CY = AY;
        const DX = CX - SHACKLE_THICKNESS;
        const DY = CY;
        const EX = BX;
        const EY = BY + SHACKLE_THICKNESS;
        const FX = AX + SHACKLE_THICKNESS;
        const FY = AY;

        // We draw the sidebars from where the end of the top part ends all the way down
        // to the center of the body to ensure sufficient overlap
        const SHACKLE_BAR_HEIGHT = BODY_CENTER_Y - SHACKLE_TOP_HEIGHT;
        */

        /*
        // Note when we draw the bezier curves, the control points are placed on-axis 50% of the
        // way to the "corner" to give an arc-like feel
        const lock = new Graphics()
            .beginFill(0x111111)
            .drawCircle(BODY_CENTER_X, BODY_CENTER_Y, BODY_R)
            // .beginHole()
            // .drawRoundedRect(
            //     RENDER_SIZE / 2 - SHACKLE_THICKNESS / 2,
            //     BODY_CENTER_Y - BODY_R / 2,
            //     SHACKLE_THICKNESS * 0.75,
            //     BODY_R,
            //     SHACKLE_THICKNESS * 0.75 * 0.5
            // )
            // .endHole()
            .moveTo(AX, AY)
            .drawRect(AX, AY, SHACKLE_THICKNESS, SHACKLE_BAR_HEIGHT)
            .drawRect(DX, DY, SHACKLE_THICKNESS, SHACKLE_BAR_HEIGHT)
            .bezierCurveTo(AX, (AY + BY) / 2, (AX + BX) / 2, BY, BX, BY)
            .bezierCurveTo((BX + CX) / 2, BY, CX, (BY + CY) / 2, CX, CY)
            .lineTo(DX, DY)
            .bezierCurveTo(DX, (DY + EY) / 2, (DX + EX) / 2, EY, EX, EY)
            .bezierCurveTo((EX + FX) / 2, EY, FX, (EY + FY) / 2, FX, FY)
            .lineTo(AX, AY)
            .endFill();
        */

        /*
        const lock = new Graphics()
            .beginFill(0x111111)
            .drawRect(BODY_CENTER_X - BODY_R, BODY_CENTER_Y - BODY_R, BODY_R * 2, BODY_R * 2)
            .moveTo(AX, AY)
            .drawRect(AX, AY, SHACKLE_THICKNESS, SHACKLE_BAR_HEIGHT)
            .drawRect(DX, DY, SHACKLE_THICKNESS, SHACKLE_BAR_HEIGHT)
            .bezierCurveTo(AX, (AY + BY) / 2, (AX + BX) / 2, BY, BX, BY)
            .bezierCurveTo((BX + CX) / 2, BY, CX, (BY + CY) / 2, CX, CY)
            .lineTo(DX, DY)
            .bezierCurveTo(DX, (DY + EY) / 2, (DX + EX) / 2, EY, EX, EY)
            .bezierCurveTo((EX + FX) / 2, EY, FX, (EY + FY) / 2, FX, FY)
            .lineTo(AX, AY)
            .endFill();
        */

        const lock = new Sprite(BitmapManager.getBitmap(Bitmaps.BaseLock));
        lock.height = RENDER_SIZE;
        lock.scale.x = lock.scale.y;
        // lock.width = RENDER_SIZE;
        // lock.height = RENDER_SIZE;

        /*
        const lock = new Graphics()
            .beginFill(0x111111)
            .drawRect(0, 0, LOCK_BAR_WIDTH, RENDER_SIZE)
            .drawRect(-LOCK_BAR_WIDTH / 1.5, RENDER_SIZE * 0.15, LOCK_BAR_WIDTH / 1.5, LOCK_BAR_WIDTH)
            .drawRect(LOCK_BAR_WIDTH, RENDER_SIZE * 0.85 - LOCK_BAR_WIDTH, LOCK_BAR_WIDTH / 2, LOCK_BAR_WIDTH);
        */

        /*
        const R = RENDER_SIZE * 0.3;
        const TOP_FROM_CENTER = R * 0.5;
        const BOTTOM_FROM_CENTER = R;
        const lock = new Graphics()
            .beginFill(0x111111)
            .drawCircle(0, 0, R)
            .drawRoundedRect(
                -TOP_FROM_CENTER,
                Math.sqrt(R ** 2 - (-TOP_FROM_CENTER) ** 2) - TOP_FROM_CENTER,
                TOP_FROM_CENTER * 2,
                (RENDER_SIZE - R) - (Math.sqrt(R ** 2 - (-TOP_FROM_CENTER) ** 2) - TOP_FROM_CENTER),
                TOP_FROM_CENTER
            );
            // The crazy math with the `sqrt`s is to get the y coordinate of the point on the circle given the
            // center, radius, and x coordinate (using the equation for a circle)
            // .moveTo(-TOP_FROM_CENTER, Math.sqrt(R ** 2 - (-TOP_FROM_CENTER) ** 2))
            // .lineTo(-BOTTOM_FROM_CENTER, RENDER_SIZE - R)
            // .lineTo(BOTTOM_FROM_CENTER, RENDER_SIZE - R)
            // .lineTo(TOP_FROM_CENTER, Math.sqrt(R ** 2 - TOP_FROM_CENTER ** 2));
        */

        // lock.filters = [new BlurFilter(1, 40), new AdjustmentFilter({alpha: 0.85})];
        lockWrapper.addChild(lock);

        const lockData = [EternaTextureUtil.scaleBy(
            TextureUtil.renderToTexture(lockWrapper, MSAA_QUALITY.LOW),
            1 / UPSCALE,
            MSAA_QUALITY.LOW
        )];
        EternaTextureUtil.createScaled(lockData, 0.75, 5 - 2);
        lockData.push(
            TextureUtil.renderToTexture(new Graphics().beginFill(0x111111, 0.7).drawRoundedRect(0, 0, 3, 4, 2))
        );
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

    private static _lockBitmaps: Texture[];

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

import * as log from "loglevel";
import {Container, Graphics, Sprite, Texture} from "pixi.js";
import {TextureUtil} from "../../flashbang/util/TextureUtil";
import {EPars} from "../EPars";
import {ExpPainter} from "../ExpPainter";
import {BitmapManager} from "../resources/BitmapManager";
import {Bitmaps} from "../resources/Bitmaps";
import {Sounds} from "../resources/Sounds";
import {EternaTextureUtil} from "../util/EternaTextureUtil";
import {ColorUtil} from "../../flashbang/util/ColorUtil";
import {Base} from "./Base";
import {BaseTextures} from "./BaseTextures";
import {BaseDrawFlags} from "./BaseDrawFlags";

/** Handles initialization and management of Base-related assets */
export class BaseAssets {
    public static getHitTestDistanceThreshold(zoomLevel: number): number {
        let bitmapWidth: number;

        if (zoomLevel < Base.NUM_ZOOM_LEVELS) {
            bitmapWidth = BaseAssets.textureForSize(BaseAssets._baseUBitmaps.bodyData, 0, zoomLevel).width;
        } else if (zoomLevel < 2 * Base.NUM_ZOOM_LEVELS) {
            bitmapWidth = BaseAssets.textureForSize(BaseAssets._baseUBitmaps.midData, 0, zoomLevel - Base.NUM_ZOOM_LEVELS).width;
        } else {
            bitmapWidth = BaseAssets._baseUBitmaps.minData.width;
        }

        return bitmapWidth / 2.0;
    }

    public static getBodyTexture(base_type: number, color_level: number, zoom_level: number, flags: number): Texture {
        if (BaseAssets.isBaseType(base_type) && color_level < 0) {
            return BaseAssets.getBaseBitmaps(base_type).getBodyTexture(zoom_level, flags);

        } else if (base_type === EPars.RNABASE_LOCK) {
            return BaseAssets.textureForSize(BaseAssets._backboneBodyData, 0, zoom_level);

        } else if (color_level < 0) {
            if (zoom_level < Base.NUM_ZOOM_LEVELS) {
                return BaseAssets.textureForSize(BaseAssets._sphereData, ExpPainter.NUM_COLORS, zoom_level);
            } else if (zoom_level < Base.NUM_ZOOM_LEVELS * 2) {
                return BaseAssets.textureForSize(BaseAssets._sphereMidData, ExpPainter.NUM_COLORS, zoom_level - Base.NUM_ZOOM_LEVELS);
            } else {
                return BaseAssets.textureForSize(BaseAssets._sphereMinData, ExpPainter.NUM_COLORS, zoom_level - Base.NUM_ZOOM_LEVELS);
            }

        } else {
            if (zoom_level < Base.NUM_ZOOM_LEVELS) {
                return BaseAssets.textureForSize(BaseAssets._sphereData, color_level, zoom_level);
            } else if (zoom_level < Base.NUM_ZOOM_LEVELS * 2) {
                return BaseAssets.textureForSize(BaseAssets._sphereMidData, color_level, zoom_level - Base.NUM_ZOOM_LEVELS);
            } else {
                return BaseAssets._sphereMinData[color_level];
            }
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

    public static getLetterTexture(base_type: number, zoom_level: number, drawFlags: number): Texture | null {
        return BaseAssets.isBaseType(base_type) ?
            BaseAssets.getBaseBitmaps(base_type).getLetterTexture(zoom_level, drawFlags) :
            null;
    }

    public static getBackboneTexture(zoom_level: number): Texture {
        if (zoom_level < Base.NUM_ZOOM_LEVELS) {
            return BaseAssets.textureForSize(BaseAssets._backboneBodyData, 0, zoom_level);
        } else {
            return BaseAssets.textureForSize(BaseAssets._backboneMidData, 0, zoom_level - Base.NUM_ZOOM_LEVELS);
        }
    }

    public static getSatellite0Texture(zoom_level: number, st0_diff_degree: number): Texture {
        return BaseAssets.textureForSize(BaseAssets._satelliteData, Math.trunc(st0_diff_degree / 5), zoom_level);
    }

    public static getSatellite1Texture(zoom_level: number, st1_diff_degree: number, pair_type: number): Texture {
        if (pair_type === -1 || pair_type === 2) {
            return BaseAssets.textureForSize(BaseAssets._satelliteData, Math.trunc(st1_diff_degree / 5), zoom_level);
        } else if (pair_type === 1) {
            return BaseAssets.textureForSize(BaseAssets._satelliteWeakerData, Math.trunc(st1_diff_degree / 5), zoom_level);
        } else {
            return BaseAssets.textureForSize(BaseAssets._satelliteStrongerData, Math.trunc(st1_diff_degree / 5), zoom_level);
        }
    }

    public static getSparkTexture(progress: number): Texture {
        progress = (1 - progress) * (1 - progress);
        progress = 1 - progress;

        let prog_index: number = Math.trunc(progress * 10);

        if (prog_index >= 10)
            prog_index = 9;
        else if (prog_index < 0)
            prog_index = 0;

        return BaseAssets._sparkBitmaps[prog_index];
    }

    public static getSatelliteReferenceBaseSize(zoom_level: number): number {
        return BaseAssets.textureForSize(BaseAssets._baseABitmaps.bodyData, 0, zoom_level).width;
    }

    public static getBaseTypeSound(type: number): string | null {
        switch (type) {
        case EPars.RNABASE_ADENINE:		return Sounds.SoundY;
        case EPars.RNABASE_URACIL: 		return Sounds.SoundB;
        case EPars.RNABASE_GUANINE: 	return Sounds.SoundR;
        case EPars.RNABASE_CYTOSINE:	return Sounds.SoundG;
        }

        return null;
    }

    private static getBaseBitmaps(base_type: number): BaseTextures {
        switch (base_type) {
        case EPars.RNABASE_URACIL:
            return BaseAssets._baseUBitmaps;
        case EPars.RNABASE_ADENINE:
            return BaseAssets._baseABitmaps;
        case EPars.RNABASE_GUANINE:
            return BaseAssets._baseGBitmaps;
        case EPars.RNABASE_CYTOSINE:
            return BaseAssets._baseCBitmaps;
        default:
            throw new Error("Bad base type: " + base_type);
        }
    }

    private static isBaseType(base_type: number): boolean {
        switch (base_type) {
        case EPars.RNABASE_URACIL:
        case EPars.RNABASE_ADENINE:
        case EPars.RNABASE_GUANINE:
        case EPars.RNABASE_CYTOSINE:
            return true;
        default:
            return false;
        }
    }

    /*internal*/
    static init(): void {
        if (BaseAssets._inited) {
            return;
        }
        BaseAssets._inited = true;

        log.debug("INIT GRAPHICS");

        // SPHERE TEXTURES

        BaseAssets._sphereData = [];
        BaseAssets._sphereMidData = [];
        BaseAssets._sphereMinData = [];

        const baseWOutline: Texture = BitmapManager.getBitmap(Bitmaps.BaseWOutline);
        const baseWPattern: Texture = BitmapManager.getBitmap(Bitmaps.BaseWPattern);
        const baseWMidPattern: Texture = BitmapManager.getBitmap(Bitmaps.BaseWMidPattern);
        const baseWMidOutline: Texture = BitmapManager.getBitmap(Bitmaps.BaseWMidOutline);
        const baseWMin: Texture = BitmapManager.getBitmap(Bitmaps.BaseWMin);

        for (let ii: number = -ExpPainter.NUM_COLORS; ii <= 2 * ExpPainter.NUM_COLORS + 1; ii++) {
            const color: number = ExpPainter.getColorByLevel(ii);
            const r: number = ColorUtil.getRed(color);
            const g: number = ColorUtil.getGreen(color);
            const b: number = ColorUtil.getBlue(color);

            const colorTransform = ColorUtil.colorTransform(0, 0, 0, 1, r, g, b, 0);

            do {
                const sphereBitmap: Container = new Container();
                sphereBitmap.addChild(new Sprite(baseWOutline));
                const pattern = new Sprite(baseWPattern);
                pattern.filters = [colorTransform];
                sphereBitmap.addChild(pattern);
                BaseAssets._sphereData.push(TextureUtil.renderToTexture(sphereBitmap));
            } while(0);

            do {
                const sphereBitmapMid: Container = new Container();
                sphereBitmapMid.addChild(new Sprite(baseWMidOutline));
                const pattern = new Sprite(baseWMidPattern);
                pattern.filters = [colorTransform];
                sphereBitmapMid.addChild(pattern);
                BaseAssets._sphereMidData.push(TextureUtil.renderToTexture(sphereBitmapMid));
            } while(0);

            do {
                const sphereBitmapMin: Container = new Container();
                const pattern = new Sprite(baseWMin);
                pattern.filters = [colorTransform];
                sphereBitmapMin.addChild(pattern);
                BaseAssets._sphereMinData.push(TextureUtil.renderToTexture(sphereBitmapMin));

            } while(0);
        }

        EternaTextureUtil.createScaled(BaseAssets._sphereData, 0.75, Base.NUM_ZOOM_LEVELS);
        EternaTextureUtil.createScaled(BaseAssets._sphereMidData, 0.75, Base.NUM_ZOOM_LEVELS);

        // BASE BODY TEXTURES
        BaseAssets._baseUBitmaps = new BaseTextures(EPars.RNABASE_URACIL);
        BaseAssets._baseABitmaps = new BaseTextures(EPars.RNABASE_ADENINE);
        BaseAssets._baseGBitmaps = new BaseTextures(EPars.RNABASE_GUANINE);
        BaseAssets._baseCBitmaps = new BaseTextures(EPars.RNABASE_CYTOSINE);

        BaseAssets._backboneBodyData = [BitmapManager.getBitmap(Bitmaps.Backbone)];
        BaseAssets._backboneMidData = [BitmapManager.getBitmap(Bitmaps.BackboneMid)];

        EternaTextureUtil.createScaled(BaseAssets._backboneBodyData, 0.75, Base.NUM_ZOOM_LEVELS);
        EternaTextureUtil.createScaled(BaseAssets._backboneMidData, 0.75, Base.NUM_ZOOM_LEVELS);

        // BARCODE TEXTURES
        BaseAssets._barcodeData = [BaseAssets.drawCircularBarcode(16, 6, /*0.5*/ 1)];
        BaseAssets._barcodeMidData = [BaseAssets.drawCircularBarcode(12, 3, /*0.5*/ 1)];
        BaseAssets._barcodeMinData = [BaseAssets.drawCircularBarcode(6, 2, /*0.5*/ 1)];

        EternaTextureUtil.createScaled(BaseAssets._barcodeData, 0.75, Base.NUM_ZOOM_LEVELS);
        EternaTextureUtil.createScaled(BaseAssets._barcodeMidData, 0.75, Base.NUM_ZOOM_LEVELS);

        // SATELLITE TEXTURES
        BaseAssets._satelliteData = BaseAssets.createSatelliteBitmaps(ColorUtil.colorTransform(1, 1, 1, 1, 0, 0, 0, 0));
        BaseAssets._satelliteWeakerData = BaseAssets.createSatelliteBitmaps(ColorUtil.colorTransform(1, 1, 1, 0.5, 0, 0, 0, 0));
        BaseAssets._satelliteStrongerData = BaseAssets.createSatelliteBitmaps(ColorUtil.colorTransform(3, 3, 3, 3, 0, 0, 0, 0));

        // SPARK TEXTURES
        BaseAssets._sparkBitmaps = EternaTextureUtil.createTransparent(BitmapManager.getBitmap(Bitmaps.BonusSymbol), 10);

        // SOUNDS
        // log.debug("INIT SOUND");
        // Eterna.sound.add_sound_by_name(BaseAssets.GAMESOUND_R, "SoundR");
        // Eterna.sound.add_sound_by_name(BaseAssets.GAMESOUND_G, "SoundG");
        // Eterna.sound.add_sound_by_name(BaseAssets.GAMESOUND_Y, "SoundY");
        // Eterna.sound.add_sound_by_name(BaseAssets.GAMESOUND_B, "SoundB");
    }

    public static drawCircularBarcode(radius: number, lineThickness: number, lineAlpha: number): Texture {
        let scratch = new Graphics();

        scratch.clear();
        let centerX: number = radius;
        let centerY: number = radius;
        let twoPI: number = 2 * Math.PI;
        let xx: number = centerX + Math.cos(0) * radius;
        let yy: number = centerY + Math.sin(0) * radius;

        scratch.moveTo(xx, yy);

        let steps: number = 360;

        for (let i: number = 1; i <= steps; i++) {
            let color: number = 0x0;
            if (i % 32 < 16) {
                color = 0xFFFFFF;
            }

            scratch.lineStyle(lineThickness, color, lineAlpha);
            xx = centerX + Math.cos(i / steps * twoPI) * radius;
            yy = centerY + Math.sin(i / steps * twoPI) * radius;
            scratch.lineTo(xx, yy);
        }

        return TextureUtil.renderToTexture(scratch);
    }

    public static createSatelliteBitmaps(colorTransform: PIXI.filters.ColorMatrixFilter): Texture[] {
        let baseImage: Texture = BitmapManager.getBitmap(Bitmaps.Satellite);
        let sprite = new Sprite(baseImage);
        sprite.filters = [colorTransform];
        let texture: Texture = TextureUtil.renderToTexture(sprite);

        let textures: Texture[] = EternaTextureUtil.createRotated(texture, 5);
        EternaTextureUtil.createScaled(textures, 0.75, Base.NUM_ZOOM_LEVELS);

        return textures;
    }

    private static textureForSize(textures: Texture[], ii: number, size_num: number): Texture {
        if (textures.length % Base.NUM_ZOOM_LEVELS !== 0) {
            throw new Error("Invalid textures array length " + textures.length);
        }

        let orig_length: number = textures.length / Base.NUM_ZOOM_LEVELS;
        return textures[(orig_length * size_num + ii)];
    }

    private static _inited: boolean;

    private static _baseUBitmaps: BaseTextures;
    private static _baseABitmaps: BaseTextures;
    private static _baseGBitmaps: BaseTextures;
    private static _baseCBitmaps: BaseTextures;

    /// Backbone textures
    private static _backboneBodyData: Texture[];
    private static _backboneMidData: Texture[];

    /// Satellites for the max zoom
    private static _satelliteData: Texture[];
    private static _satelliteWeakerData: Texture[];
    private static _satelliteStrongerData: Texture[];

    /// Barcode outline data
    private static _barcodeData: Texture[];
    private static _barcodeMidData: Texture[];
    private static _barcodeMinData: Texture[];

    /// Bitmaps for blank bases
    private static _sphereData: Texture[];
    private static _sphereMidData: Texture[];
    private static _sphereMinData: Texture[];

    private static _sparkBitmaps: Texture[];
}

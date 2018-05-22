import {Sprite, Texture} from "pixi.js";
import {EPars} from "../EPars";
import {ExpPainter} from "../ExpPainter";
import {BitmapManager} from "../util/BitmapManager";
import {TextureUtil} from "../../flashbang/util/TextureUtil";
import {Base} from "./Base";
import {BaseBitmaps} from "./BaseBitmaps";
import {BaseDrawFlags} from "./BaseDrawFlags";


/** Handles initialization and management of Base-related assets */
export class BaseAssets {
    public static getHitTestDistanceThreshold (zoomLevel: number): number {
        let bitmapWidth: number;

        if (zoomLevel < Base.NUM_ZOOM_LEVELS) {
            bitmapWidth = BaseAssets.bitmap_for_size(BaseAssets._baseU_bitmaps.body_data, 0, zoomLevel).width;
        } else if (zoomLevel < 2 * Base.NUM_ZOOM_LEVELS) {
            bitmapWidth = BaseAssets.bitmap_for_size(BaseAssets._baseU_bitmaps.mid_data, 0, zoomLevel - Base.NUM_ZOOM_LEVELS).width;
        } else {
            bitmapWidth = BaseAssets._baseU_bitmaps.min_data.width;
        }

        return bitmapWidth / 2.0;
    }

    public static getBodyBitmap (base_type: number, color_level: number, zoom_level: number, flags: number): Texture {
        if (BaseAssets.isBaseType(base_type) && color_level < 0) {
            return BaseAssets.getBaseBitmaps(base_type).getBodyBitmap(zoom_level, flags);

        } else if (base_type == EPars.RNABASE_LOCK) {
            return BaseAssets.bitmap_for_size(BaseAssets._backbone_body_data, 0, zoom_level);

        } else if (color_level < 0) {
            if (zoom_level < Base.NUM_ZOOM_LEVELS) {
                return BaseAssets.bitmap_for_size(BaseAssets._sphere_data, ExpPainter.NUM_COLORS, zoom_level);
            } else if (zoom_level < Base.NUM_ZOOM_LEVELS * 2) {
                return BaseAssets.bitmap_for_size(BaseAssets._sphere_mid_data, ExpPainter.NUM_COLORS, zoom_level - Base.NUM_ZOOM_LEVELS);
            } else {
                return BaseAssets.bitmap_for_size(BaseAssets._sphere_min_data, ExpPainter.NUM_COLORS, zoom_level - Base.NUM_ZOOM_LEVELS);
            }

        } else {
            if (zoom_level < Base.NUM_ZOOM_LEVELS) {
                return BaseAssets.bitmap_for_size(BaseAssets._sphere_data, color_level, zoom_level);
            } else if (zoom_level < Base.NUM_ZOOM_LEVELS * 2) {
                return BaseAssets.bitmap_for_size(BaseAssets._sphere_mid_data, color_level, zoom_level - Base.NUM_ZOOM_LEVELS);
            } else {
                return BaseAssets._sphere_min_data[color_level];
            }
        }
    }

    public static getBarcodeBitmap (zoomLevel: number, drawFlags: number): Texture {
        if ((drawFlags & BaseDrawFlags.USE_BARCODE) != 0) {
            if (zoomLevel < Base.NUM_ZOOM_LEVELS) {
                return BaseAssets.bitmap_for_size(BaseAssets._barcode_data, 0, zoomLevel);
            } else if (zoomLevel < Base.NUM_ZOOM_LEVELS * 2) {
                return BaseAssets.bitmap_for_size(BaseAssets._barcode_mid_data, 0, zoomLevel - Base.NUM_ZOOM_LEVELS);
            } else {
                return BaseAssets._barcode_min_data[0];
            }
        }

        return null;
    }

    public static getLetterBitmap (base_type: number, zoom_level: number, drawFlags: number): Texture {
        return BaseAssets.getBaseBitmaps(base_type).getLetterBitmap(zoom_level, drawFlags);
    }

    public static getBackboneBitmap (zoom_level: number, drawFlags: number): Texture {
        if (zoom_level < Base.NUM_ZOOM_LEVELS) {
            return BaseAssets.bitmap_for_size(BaseAssets._backbone_body_data, 0, zoom_level);
        } else {
            return BaseAssets.bitmap_for_size(BaseAssets._backbone_mid_data, 0, zoom_level - Base.NUM_ZOOM_LEVELS);
        }
    }

    public static getSatellite0Bitmap (zoom_level: number, st0_diff_degree: number): Texture {
        return BaseAssets.bitmap_for_size(BaseAssets._satellite_data, Number(st0_diff_degree / 5), zoom_level);
    }

    public static getSatellite1Bitmap (zoom_level: number, st1_diff_degree: number, pair_type: number): Texture {
        if (pair_type == -1 || pair_type == 2) {
            return BaseAssets.bitmap_for_size(BaseAssets._satellite_data, Number(st1_diff_degree / 5), zoom_level);
        } else if (pair_type == 1) {
            return BaseAssets.bitmap_for_size(BaseAssets._satellite_weaker_data, Number(st1_diff_degree / 5), zoom_level);
        } else {
            return BaseAssets.bitmap_for_size(BaseAssets._satellite_stronger_data, Number(st1_diff_degree / 5), zoom_level);
        }
    }

    public static getSparkBitmap (progress: number): Texture {
        progress = (1 - progress) * (1 - progress);
        progress = 1 - progress;

        let prog_index: number = Number(progress * 10);

        if (prog_index >= 10)
            prog_index = 9;
        else if (prog_index < 0)
            prog_index = 0;

        return BaseAssets._spark_bitmaps[prog_index];
    }

    public static getSatelliteReferenceBaseSize (zoom_level: number): number {
        return BaseAssets.bitmap_for_size(BaseAssets._baseA_bitmaps.body_data, 0, zoom_level).width;
    }

    public static getBaseTypeSound (type: number): string {
        switch (type) {
        case EPars.RNABASE_ADENINE:
            return BaseAssets.GAMESOUND_Y;
        case EPars.RNABASE_URACIL:
            return BaseAssets.GAMESOUND_B;
        case EPars.RNABASE_GUANINE:
            return BaseAssets.GAMESOUND_R;
        case EPars.RNABASE_CYTOSINE:
            return BaseAssets.GAMESOUND_G;
        }

        return null;
    }

    private static getBaseBitmaps (base_type: number): BaseBitmaps {
        switch (base_type) {
        case EPars.RNABASE_URACIL:
            return BaseAssets._baseU_bitmaps;
        case EPars.RNABASE_ADENINE:
            return BaseAssets._baseA_bitmaps;
        case EPars.RNABASE_GUANINE:
            return BaseAssets._baseG_bitmaps;
        case EPars.RNABASE_CYTOSINE:
            return BaseAssets._baseC_bitmaps;
        default:
            throw new Error("Bad base type: " + base_type);
        }
    }

    private static isBaseType (base_type: number): boolean {
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
    static init (): void {
        throw new Error("TODO");
        // if (BaseAssets._inited) {
        //     return;
        // }
        // BaseAssets._inited = true;
        //
        // log.debug("INIT GRAPHICS");
        //
        // // SPHERE BITMAPS
        //
        // BaseAssets._sphere_data = [];
        // BaseAssets._sphere_mid_data = [];
        // BaseAssets._sphere_min_data = [];
        //
        // const baseW_outline: Texture = BitmapManager.get_bitmap(BitmapManager.BaseWOutline);
        // const baseW_pattern: Texture = BitmapManager.get_bitmap(BitmapManager.BaseWPattern);
        // const baseW_mid_pattern: Texture = BitmapManager.get_bitmap(BitmapManager.BaseWMidPattern);
        // const baseW_mid_outline: Texture = BitmapManager.get_bitmap(BitmapManager.BaseWMidOutline);
        // const baseW_min: Texture = BitmapManager.get_bitmap(BitmapManager.BaseWMin);
        //
        // for (let ii: number = -ExpPainter.NUM_COLORS; ii <= 2 * ExpPainter.NUM_COLORS + 1; ii++) {
        //     const color: number = ExpPainter.get_color_by_level(ii);
        //     const r: number = ColorUtil.getRed(color);
        //     const g: number = ColorUtil.getGreen(color);
        //     const b: number = ColorUtil.getBlue(color);
        //
        //     const colorTransform: ColorMatrixFilter = ColorUtil.colorTransform(0, 0, 0, 1, r, g, b, 0);
        //
        //     const sphereSprite: Sprite = new Sprite(baseW_outline);
        //
        //     const sphereBitmap: BitmapData = new BitmapData(baseW_outline.width, baseW_outline.height);
        //     sphereBitmap.fillRect(new Rectangle(0, 0, sphereBitmap.width, sphereBitmap.height), 0x0);
        //     sphereBitmap.draw(baseW_outline);
        //     sphereBitmap.draw(baseW_pattern, null, colorTransform);
        //     BaseAssets._sphere_data.push(sphereBitmap);
        //
        //     const sphereBitmapMid: BitmapData = new BitmapData(baseW_mid_outline.width, baseW_mid_outline.height);
        //     sphereBitmapMid.fillRect(new Rectangle(0, 0, sphereBitmapMid.width, sphereBitmapMid.height), 0x0);
        //     sphereBitmapMid.draw(baseW_mid_outline);
        //     sphereBitmapMid.draw(baseW_mid_pattern, null, colorTransform);
        //     BaseAssets._sphere_mid_data.push(sphereBitmapMid);
        //
        //     const sphereBitmapMin: BitmapData = new BitmapData(baseW_min.width, baseW_min.height);
        //     sphereBitmapMin.fillRect(new Rectangle(0, 0, sphereBitmapMin.width, sphereBitmapMin.height), 0x0);
        //     sphereBitmapMin.draw(baseW_min, null, colorTransform);
        //     BaseAssets._sphere_min_data.push(sphereBitmapMin);
        // }
        //
        // BitmapUtil.create_scaled(BaseAssets._sphere_data, 0.75, Base.NUM_ZOOM_LEVELS);
        // BitmapUtil.create_scaled(BaseAssets._sphere_mid_data, 0.75, Base.NUM_ZOOM_LEVELS);
        //
        // // BASE BODY BITMAPS
        // BaseAssets._baseU_bitmaps = new BaseBitmaps(EPars.RNABASE_URACIL);
        // BaseAssets._baseA_bitmaps = new BaseBitmaps(EPars.RNABASE_ADENINE);
        // BaseAssets._baseG_bitmaps = new BaseBitmaps(EPars.RNABASE_GUANINE);
        // BaseAssets._baseC_bitmaps = new BaseBitmaps(EPars.RNABASE_CYTOSINE);
        //
        // BaseAssets._backbone_body_data = [BitmapManager.get_bitmap(BitmapManager.Backbone)];
        // BaseAssets._backbone_mid_data = [BitmapManager.get_bitmap(BitmapManager.BackboneMid)];
        //
        // BitmapUtil.create_scaled(BaseAssets._backbone_body_data, 0.75, Base.NUM_ZOOM_LEVELS);
        // BitmapUtil.create_scaled(BaseAssets._backbone_mid_data, 0.75, Base.NUM_ZOOM_LEVELS);
        //
        // // BARCODE BITMAPS
        // BaseAssets._barcode_data = [BaseAssets.draw_circular_barcode(16, 6, 0.5)];
        // BaseAssets._barcode_mid_data = [BaseAssets.draw_circular_barcode(12, 3, 0.5)];
        // BaseAssets._barcode_min_data = [BaseAssets.draw_circular_barcode(6, 2, 0.5)];
        //
        // BitmapUtil.create_scaled(BaseAssets._barcode_data, 0.75, Base.NUM_ZOOM_LEVELS);
        // BitmapUtil.create_scaled(BaseAssets._barcode_mid_data, 0.75, Base.NUM_ZOOM_LEVELS);
        //
        // // SATELLITE BITMAPS
        // BaseAssets._satellite_data = BaseAssets.createSatelliteBitmaps(new ColorTransform(1, 1, 1, 1, 0, 0, 0, 0));
        // BaseAssets._satellite_weaker_data = BaseAssets.createSatelliteBitmaps(new ColorTransform(1, 1, 1, 0.5, 0, 0, 0, 0));
        // BaseAssets._satellite_stronger_data = BaseAssets.createSatelliteBitmaps(new ColorTransform(3, 3, 3, 3, 0, 0, 0, 0));
        //
        // // SPARK BITMAPS
        // BaseAssets._spark_bitmaps = BitmapUtil.create_transparent(BitmapManager.get_bitmap(BitmapManager.BonusSymbol), 10);

        // SOUNDS
        // log.debug("INIT SOUND");
        // SoundManager.instance.add_sound_by_name(BaseAssets.GAMESOUND_R, "SoundR");
        // SoundManager.instance.add_sound_by_name(BaseAssets.GAMESOUND_G, "SoundG");
        // SoundManager.instance.add_sound_by_name(BaseAssets.GAMESOUND_Y, "SoundY");
        // SoundManager.instance.add_sound_by_name(BaseAssets.GAMESOUND_B, "SoundB");
    }

    private static draw_circular_barcode (radius: number, lineThickness: number, lineAlpha: number): Texture {
        // let scratch: Shape = new Shape();
        //
        // scratch.graphics.clear();
        // let centerX: number = radius;
        // let centerY: number = radius;
        // let twoPI: number = 2 * Math.PI;
        // let xx: number = centerX + Math.cos(0) * radius;
        // let yy: number = centerY + Math.sin(0) * radius;
        //
        // scratch.graphics.moveTo(xx, yy);
        //
        // let steps: number = 360;
        //
        // for (let i: number = 1; i <= steps; i++) {
        //     let color: number = 0x0;
        //     if (i % 32 < 16) {
        //         color = 0xFFFFFF;
        //     }
        //
        //     scratch.graphics.lineStyle(lineThickness, color, lineAlpha);
        //     xx = centerX + Math.cos(Number(i) / steps * twoPI) * radius;
        //     yy = centerY + Math.sin(Number(i) / steps * twoPI) * radius;
        //     scratch.graphics.lineTo(xx, yy);
        // }
        //
        // let bitmapSize: number = radius * 2;
        // let bitmap: Texture = new Texture(bitmapSize, bitmapSize);
        // bitmap.fillRect(new Rectangle(0, 0, bitmapSize, bitmapSize), 0x0);
        // bitmap.draw(scratch);
        //
        // return bitmap;
        throw new Error("TODO");
    }

    public static createSatelliteBitmaps (colorTransform: PIXI.filters.ColorMatrixFilter): Texture[] {
        // let baseImage: Texture = BitmapManager.get_bitmap(BitmapManager.Satellite);
        //
        // let bitmap: Texture = new Texture(baseImage.width, baseImage.height);
        // bitmap.fillRect(new Rectangle(0, 0, baseImage.width, baseImage.height), 0x0);
        // bitmap.draw(baseImage, null, colorTransform);
        //
        // let bitmaps: any[] = BitmapUtil.create_rotated(bitmap, 5);
        // BitmapUtil.create_scaled(bitmaps, 0.75, Base.NUM_ZOOM_LEVELS);
        //
        // return bitmaps;

        let baseImage: Texture = BitmapManager.get_bitmap(BitmapManager.Satellite);
        let sprite = new Sprite(baseImage);
        sprite.filters = [colorTransform];
        let bitmap: Texture = TextureUtil.renderToTexture(sprite);

        // let bitmaps: Texture[] = BitmapUtil.create_rotated(bitmap, 5);
        // BitmapUtil.create_scaled(bitmaps, 0.75, Base.NUM_ZOOM_LEVELS);

        return [bitmap];
    }

    private static bitmap_for_size (bitmaps: Texture[], ii: number, size_num: number): Texture {
        if (bitmaps.length % Base.NUM_ZOOM_LEVELS != 0) {
            throw new Error("Invalid bitmaps array length " + bitmaps.length);
        }

        let orig_length: number = bitmaps.length / Base.NUM_ZOOM_LEVELS;
        return bitmaps[(orig_length * size_num + ii)];
    }

    private static _inited: boolean;

    private static _baseU_bitmaps: BaseBitmaps;
    private static _baseA_bitmaps: BaseBitmaps;
    private static _baseG_bitmaps: BaseBitmaps;
    private static _baseC_bitmaps: BaseBitmaps;

    /// Backbone bitmaps
    private static _backbone_body_data: Texture[];
    private static _backbone_mid_data: Texture[];

    /// Satellites for the max zoom
    private static _satellite_data: Texture[];
    private static _satellite_weaker_data: Texture[];
    private static _satellite_stronger_data: Texture[];

    /// Barcode outline data
    private static _barcode_data: Texture[];
    private static _barcode_mid_data: Texture[];
    private static _barcode_min_data: Texture[];

    /// Bitmaps for blank bases
    private static _sphere_data: Texture[];
    private static _sphere_mid_data: Texture[];
    private static _sphere_min_data: Texture[];

    private static _spark_bitmaps: Texture[];

    private static readonly GAMESOUND_R: string = "R";
    private static readonly GAMESOUND_G: string = "G";
    private static readonly GAMESOUND_Y: string = "Y";
    private static readonly GAMESOUND_B: string = "B";
}

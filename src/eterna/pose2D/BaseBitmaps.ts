import {Text, Texture} from "pixi.js";
import {TextureUtil} from "../../flashbang/util/TextureUtil";
import {EPars} from "../EPars";
import {BitmapManager} from "../resources/BitmapManager";
import {BitmapUtil} from "../util/BitmapUtil";
import {Fonts} from "../util/Fonts";
import {Base} from "./Base";
import {BaseDrawFlags} from "./BaseDrawFlags";

/** Encapsulates bitmaps for a Base type */
export class BaseBitmaps {
    public baseType: number;

    public letterData: Texture[];  // letters

    public bodyData: Texture[];     // max-size
    public fBodyData: Texture[];   // "dontcare"

    public lBodyData: Texture[];   // max-size, letter mode
    public lfBodyData: Texture[];  // "dontcare"

    public lockData: Texture[];     // max-size, locked
    public fLockData: Texture[];   // "dontcare"

    public midData: Texture[];      // mid-size
    public fMidData: Texture[];    // "dontcare"

    public midLockData: Texture[]; // mid-size, locked
    public fMidLockData: Texture[]; // "dontcare"

    public minData: Texture; // min-size

    constructor (baseType: number) {
        this.baseType = baseType;
        this.letterData = BaseBitmaps.createLetterBitmaps(baseType, Base.ZOOM_SCALE_FACTOR);

        this.bodyData = BaseBitmaps.createBodyBitmaps("LBase*", baseType);
        this.fBodyData = BaseBitmaps.createBodyBitmaps("LBase*f", baseType);
        this.lBodyData = BaseBitmaps.createBodyBitmaps("LBase*", baseType);
        this.lfBodyData = BaseBitmaps.createBodyBitmaps("LBase*f", baseType);
        this.lockData = BaseBitmaps.createBodyBitmaps("Base*Lock", baseType);
        this.fLockData = BaseBitmaps.createBodyBitmaps("Base*fLock", baseType);
        this.midData = BaseBitmaps.createBodyBitmaps("Base*Mid", baseType);
        this.fMidData = BaseBitmaps.createBodyBitmaps("Base*fMid", baseType);
        this.midLockData = BaseBitmaps.createBodyBitmaps("Base*MidLock", baseType);
        this.fMidLockData = BaseBitmaps.createBodyBitmaps("Base*fMidLock", baseType);
        this.minData = BitmapManager.getBitmapNamed(BaseBitmaps.getBitmapName("Base*Min", baseType));
    }

    public getBodyBitmap (zoomLevel: number, flags: number): Texture {
        const locked: boolean = (flags & BaseDrawFlags.LOCKED) !== 0;
        const lettermode: boolean = (flags & BaseDrawFlags.LETTER_MODE) !== 0;
        const is_dontcare: boolean = (flags & BaseDrawFlags.IS_DONTCARE) !== 0;

        if (zoomLevel < Base.NUM_ZOOM_LEVELS) {
            if (!locked && !lettermode) {
                return BaseBitmaps.bitmapForSize(is_dontcare ? this.fBodyData : this.bodyData, 0, zoomLevel);
            } else if (!locked) {
                return BaseBitmaps.bitmapForSize(is_dontcare ? this.lfBodyData : this.lBodyData, 0, zoomLevel);
            } else {
                return BaseBitmaps.bitmapForSize(is_dontcare ? this.fLockData : this.lockData, 0, zoomLevel);
            }
        } else if (zoomLevel < Base.NUM_ZOOM_LEVELS * 2) {
            if (!locked) {
                return BaseBitmaps.bitmapForSize(is_dontcare ? this.fMidData : this.midData, 0, zoomLevel - Base.NUM_ZOOM_LEVELS);
            } else {
                return BaseBitmaps.bitmapForSize(is_dontcare ? this.fMidLockData : this.midLockData, 0, zoomLevel - Base.NUM_ZOOM_LEVELS);
            }
        } else {
            return this.minData;
        }
    }

    public getLetterBitmap (zoomLevel: number, drawFlags: number): Texture {
        const lettermode: boolean = (drawFlags & BaseDrawFlags.LETTER_MODE) !== 0;
        const locked: boolean = (drawFlags & BaseDrawFlags.LOCKED) !== 0;

        if (zoomLevel < Base.NUM_ZOOM_LEVELS && ((lettermode && !locked))) {
            return BaseBitmaps.bitmapForSize(this.letterData, 0, zoomLevel);
        }

        return null;
    }

    private static createLetterBitmaps (baseType: number, zoomScalar: number): Texture[] {
        let big_letter: Text = Fonts.arial(BaseBitmaps.type2Letter(baseType)).fontSize(18).bold().color(0x0).build();
        let bitmaps: Texture[] = [TextureUtil.renderToTexture(big_letter)];
        BitmapUtil.createScaled(bitmaps, zoomScalar, Base.NUM_ZOOM_LEVELS);
        return bitmaps;
    }

    private static createBodyBitmaps (nameTemplate: string, baseType: number): Texture[] {
        let bmName: string = BaseBitmaps.getBitmapName(nameTemplate, baseType);
        let bitmaps: Texture[] = [BitmapManager.getBitmapNamed(bmName)];
        BitmapUtil.createScaled(bitmaps, Base.ZOOM_SCALE_FACTOR, Base.NUM_ZOOM_LEVELS);
        return bitmaps;
    }

    private static getBitmapName (nameTemplate: string, baseType: number): string {
        return nameTemplate.replace(/\*/, BaseBitmaps.type2Letter(baseType));
    }

    private static type2Letter (baseType: number): string {
        switch (baseType) {
        case EPars.RNABASE_URACIL:
            return "U";
        case EPars.RNABASE_ADENINE:
            return "A";
        case EPars.RNABASE_GUANINE:
            return "G";
        case EPars.RNABASE_CYTOSINE:
            return "C";
        default:
            throw new Error("Bad baseType: " + baseType);
        }
    }

    private static bitmapForSize (bitmaps: Texture[], ii: number, size_num: number): Texture {
        if (bitmaps.length % Base.NUM_ZOOM_LEVELS !== 0) {
            throw new Error("Invalid bitmaps array length " + bitmaps.length);
        }

        let origLength: number = bitmaps.length / Base.NUM_ZOOM_LEVELS;
        return bitmaps[(origLength * size_num + ii)];
    }
}

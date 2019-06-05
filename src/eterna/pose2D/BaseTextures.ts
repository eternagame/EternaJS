import {Text, Texture} from "pixi.js";
import {TextureUtil} from "flashbang/util";
import EPars from "eterna/EPars";
import {BitmapManager} from "eterna/resources";
import {EternaTextureUtil, Fonts} from "eterna/util";
import {Base, BaseDrawFlags} from ".";

/** Encapsulates textures for a Base type */
export default class BaseTextures {
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

    constructor(baseType: number) {
        this.baseType = baseType;
        this.letterData = BaseTextures.createLetterTextures(baseType, Base.ZOOM_SCALE_FACTOR);

        this.bodyData = BaseTextures.createBodyTextures("LBase*", baseType);
        this.fBodyData = BaseTextures.createBodyTextures("LBase*f", baseType);
        this.lBodyData = BaseTextures.createBodyTextures("LBase*", baseType);
        this.lfBodyData = BaseTextures.createBodyTextures("LBase*f", baseType);
        this.lockData = BaseTextures.createBodyTextures("Base*Lock", baseType);
        this.fLockData = BaseTextures.createBodyTextures("Base*fLock", baseType);
        this.midData = BaseTextures.createBodyTextures("Base*Mid", baseType);
        this.fMidData = BaseTextures.createBodyTextures("Base*fMid", baseType);
        this.midLockData = BaseTextures.createBodyTextures("Base*MidLock", baseType);
        this.fMidLockData = BaseTextures.createBodyTextures("Base*fMidLock", baseType);
        this.minData = BitmapManager.getBitmapNamed(BaseTextures.getTexName("Base*Min", baseType));
    }

    public getBodyTexture(zoomLevel: number, flags: number): Texture {
        const locked: boolean = (flags & BaseDrawFlags.LOCKED) !== 0;
        const lettermode: boolean = (flags & BaseDrawFlags.LETTER_MODE) !== 0;
        const is_dontcare: boolean = (flags & BaseDrawFlags.IS_DONTCARE) !== 0;

        if (zoomLevel < Base.NUM_ZOOM_LEVELS) {
            if (!locked && !lettermode) {
                return BaseTextures.textureForSize(is_dontcare ? this.fBodyData : this.bodyData, 0, zoomLevel);
            } else if (!locked) {
                return BaseTextures.textureForSize(is_dontcare ? this.lfBodyData : this.lBodyData, 0, zoomLevel);
            } else {
                return BaseTextures.textureForSize(is_dontcare ? this.fLockData : this.lockData, 0, zoomLevel);
            }
        } else if (zoomLevel < Base.NUM_ZOOM_LEVELS * 2) {
            if (!locked) {
                return BaseTextures.textureForSize(is_dontcare ? this.fMidData : this.midData, 0, zoomLevel - Base.NUM_ZOOM_LEVELS);
            } else {
                return BaseTextures.textureForSize(is_dontcare ? this.fMidLockData : this.midLockData, 0, zoomLevel - Base.NUM_ZOOM_LEVELS);
            }
        } else {
            return this.minData;
        }
    }

    public getLetterTexture(zoomLevel: number, drawFlags: number): Texture {
        const lettermode: boolean = (drawFlags & BaseDrawFlags.LETTER_MODE) !== 0;
        const locked: boolean = (drawFlags & BaseDrawFlags.LOCKED) !== 0;

        if (zoomLevel < Base.NUM_ZOOM_LEVELS && ((lettermode && !locked))) {
            return BaseTextures.textureForSize(this.letterData, 0, zoomLevel);
        }

        return null;
    }

    private static createLetterTextures(baseType: number, zoomScalar: number): Texture[] {
        let big_letter: Text = Fonts.arial(BaseTextures.type2Letter(baseType)).fontSize(18).bold().color(0x0).build();
        let textures: Texture[] = [TextureUtil.renderToTexture(big_letter)];
        EternaTextureUtil.createScaled(textures, zoomScalar, Base.NUM_ZOOM_LEVELS);
        return textures;
    }

    private static createBodyTextures(nameTemplate: string, baseType: number): Texture[] {
        let bmName: string = BaseTextures.getTexName(nameTemplate, baseType);
        let textures: Texture[] = [BitmapManager.getBitmapNamed(bmName)];
        EternaTextureUtil.createScaled(textures, Base.ZOOM_SCALE_FACTOR, Base.NUM_ZOOM_LEVELS);
        return textures;
    }

    private static getTexName(nameTemplate: string, baseType: number): string {
        return nameTemplate.replace(/\*/, BaseTextures.type2Letter(baseType));
    }

    private static type2Letter(baseType: number): string {
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

    private static textureForSize(textures: Texture[], ii: number, size_num: number): Texture {
        if (textures.length % Base.NUM_ZOOM_LEVELS !== 0) {
            throw new Error("Invalid textures array length " + textures.length);
        }

        let origLength: number = textures.length / Base.NUM_ZOOM_LEVELS;
        return textures[(origLength * size_num + ii)];
    }
}

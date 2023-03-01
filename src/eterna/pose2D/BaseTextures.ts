import {Text, Texture} from 'pixi.js';
import {TextureUtil} from 'flashbang';
import {RNABase} from 'eterna/EPars';
import BitmapManager from 'eterna/resources/BitmapManager';
import EternaTextureUtil from 'eterna/util/EternaTextureUtil';
import Fonts from 'eterna/util/Fonts';
import Bitmaps from 'eterna/resources/Bitmaps';
import BaseDrawFlags from './BaseDrawFlags';
import Base from './Base';

/** Encapsulates textures for a Base type */
export default class BaseTextures {
    public baseType: number;

    public letterData: Texture[]; // letters
    public lockIconData: Texture[]; // locks

    public bodyData: Texture[]; // max-size
    public fBodyData: Texture[]; // "dontcare"

    public lBodyData: Texture[]; // max-size, letter mode
    public lfBodyData: Texture[]; // "dontcare"

    public lockData: Texture[]; // max-size, locked
    public fLockData: Texture[]; // "dontcare"

    public midData: Texture[]; // mid-size
    public fMidData: Texture[]; // "dontcare"

    public midLockData: Texture[]; // mid-size, locked
    public fMidLockData: Texture[]; // "dontcare"

    public minData: Texture; // min-size

    constructor(baseType: number) {
        this.baseType = baseType;
        this.letterData = BaseTextures.createLetterTextures(baseType, Base.ZOOM_SCALE_FACTOR);
        this.lockIconData = BaseTextures.createLockIconTextures(Base.ZOOM_SCALE_FACTOR);

        this.bodyData = BitmapManager.getLBase(BaseTextures.type2Letter(baseType));
        this.fBodyData = BitmapManager.getLBasef(BaseTextures.type2Letter(baseType));
        this.lBodyData = BitmapManager.getLBase(BaseTextures.type2Letter(baseType));
        this.lfBodyData = BitmapManager.getLBasef(BaseTextures.type2Letter(baseType));
        this.lockData = BitmapManager.getBaseLock(BaseTextures.type2Letter(baseType));
        this.fLockData = BitmapManager.getBasefLock(BaseTextures.type2Letter(baseType));
        this.midData = BitmapManager.getBaseMid(BaseTextures.type2Letter(baseType));
        this.fMidData = BitmapManager.getBasefMid(BaseTextures.type2Letter(baseType));
        this.midLockData = BitmapManager.getBaseMidLock(BaseTextures.type2Letter(baseType));
        this.fMidLockData = BitmapManager.getBasefMidLock(BaseTextures.type2Letter(baseType));
        this.minData = BitmapManager.getBaseMin(BaseTextures.type2Letter(baseType));
    }

    public getBodyTexture(zoomLevel: number, flags: number): Texture {
        const lettermode: boolean = (flags & BaseDrawFlags.LETTER_MODE) !== 0;
        const isDontcare: boolean = (flags & BaseDrawFlags.IS_DONTCARE) !== 0;

        if (zoomLevel < Base.NUM_ZOOM_LEVELS) {
            if (!lettermode) {
                return BaseTextures.textureForSize(isDontcare ? this.fBodyData : this.bodyData, 0, zoomLevel);
            } else {
                return BaseTextures.textureForSize(isDontcare ? this.lfBodyData : this.lBodyData, 0, zoomLevel);
            }
        } else if (zoomLevel < Base.NUM_ZOOM_LEVELS * 2) {
            return BaseTextures.textureForSize(
                isDontcare ? this.fMidData : this.midData, 0, zoomLevel - Base.NUM_ZOOM_LEVELS
            );
        } else {
            return this.minData;
        }
    }

    public getLetterTexture(zoomLevel: number, drawFlags: number): Texture | null {
        const lettermode: boolean = (drawFlags & BaseDrawFlags.LETTER_MODE) !== 0;

        if (zoomLevel < Base.NUM_ZOOM_LEVELS && lettermode) {
            return BaseTextures.textureForSize(this.letterData, 0, zoomLevel);
        }

        return null;
    }

    public getLockTexture(zoomLevel: number, drawFlags: number): Texture | null {
        const locked: boolean = (drawFlags & BaseDrawFlags.LOCKED) !== 0;

        if (locked) {
            return BaseTextures.textureForSize(this.lockIconData, 0, zoomLevel, Base.NUM_ZOOM_LEVELS_LOCK);
        }

        return null;
    }

    private static createLetterTextures(baseType: number, zoomScalar: number): Texture[] {
        const bigLetter: Text = Fonts.std(BaseTextures.type2Letter(baseType)).fontSize(18).bold().color(0x0)
            .build();
        const textures: Texture[] = [TextureUtil.renderToTexture(bigLetter)];
        EternaTextureUtil.createScaled(textures, zoomScalar, Base.NUM_ZOOM_LEVELS);
        return textures;
    }

    private static createLockIconTextures(zoomScalar: number): Texture[] {
        const textures: Texture[] = [EternaTextureUtil.scaleBy(BitmapManager.getBitmap(Bitmaps.BaseLock), 0.75)];
        EternaTextureUtil.createScaled(textures, zoomScalar, Base.NUM_ZOOM_LEVELS_LOCK);
        return textures;
    }

    // AMW TODO: isn't this just the EPars function?
    private static type2Letter(baseType: number): string {
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

    private static textureForSize(textures: Texture[], ii: number, sizeNum: number, levels?: number): Texture {
        if (textures.length % Base.NUM_ZOOM_LEVELS !== 0) {
            throw new Error(`Invalid textures array length ${textures.length}`);
        }

        const origLength: number = textures.length / (levels ?? Base.NUM_ZOOM_LEVELS);
        return textures[(origLength * sizeNum + ii)];
    }
}

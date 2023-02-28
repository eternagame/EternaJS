import {Texture} from 'pixi.js';
import {TextureUtil, TextBuilder} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import EternaTextureUtil from 'eterna/util/EternaTextureUtil';
import Base from 'eterna/pose2D/Base';
import Bitmaps from './Bitmaps';

export default class BitmapManager {
    public static getBitmap(url: string): Texture {
        return Texture.from(url);
    }

    public static getNumberBitmap(ii: number, color: number = 0xffffff): Texture {
        return BitmapManager.getTextBitmapImpl(ii.toString(), Fonts.STDFONT, 14, false, color);
    }

    public static rowMissionBitmapNucl(c: string): Texture {
        if (c === 'A') {
            return this.getBitmap(Bitmaps.NovaARowMissionReq);
        } else if (c === 'C') {
            return this.getBitmap(Bitmaps.NovaCRowMissionReq);
        } else if (c === 'G') {
            return this.getBitmap(Bitmaps.NovaGRowMissionReq);
        } else { // c === 'U'
            return this.getBitmap(Bitmaps.NovaURowMissionReq);
        }
    }

    public static rowBitmapNucl(c: string): Texture {
        if (c === 'A') {
            return this.getBitmap(Bitmaps.NovaARowReq);
        } else if (c === 'C') {
            return this.getBitmap(Bitmaps.NovaCRowReq);
        } else if (c === 'G') {
            return this.getBitmap(Bitmaps.NovaGRowReq);
        } else { // c === 'U'
            return this.getBitmap(Bitmaps.NovaURowReq);
        }
    }

    public static missionBitmapNucl(c: string): Texture {
        if (c === 'A') {
            return this.getBitmap(Bitmaps.NovaAMissionReq);
        } else if (c === 'C') {
            return this.getBitmap(Bitmaps.NovaCMissionReq);
        } else if (c === 'G') {
            return this.getBitmap(Bitmaps.NovaGMissionReq);
        } else { // c === 'U'
            return this.getBitmap(Bitmaps.NovaUMissionReq);
        }
    }

    public static bitmapNucl(c: string): Texture {
        if (c === 'A') {
            return this.getBitmap(Bitmaps.NovaAReq);
        } else if (c === 'C') {
            return this.getBitmap(Bitmaps.NovaCReq);
        } else if (c === 'G') {
            return this.getBitmap(Bitmaps.NovaGReq);
        } else { // c === 'U'
            return this.getBitmap(Bitmaps.NovaUReq);
        }
    }

    public static getBaseMin(c: string): Texture {
        if (c === 'A') {
            return EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.BaseAMin), 0.5);
        } else if (c === 'C') {
            return EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.BaseCMin), 0.5);
        } else if (c === 'G') {
            return EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.BaseGMin), 0.5);
        } else { // c === 'U'
            return EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.BaseUMin), 0.5);
        }
    }

    public static getLBase(c: string): Texture[] {
        let textures = [];
        if (c === 'A') {
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.LBaseA), 0.5)];
        } else if (c === 'C') {
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.LBaseC), 0.5)];
        } else if (c === 'G') {
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.LBaseG), 0.5)];
        } else { // c === 'U'
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.LBaseU), 0.5)];
        }
        EternaTextureUtil.createScaled(textures, Base.ZOOM_SCALE_FACTOR, Base.NUM_ZOOM_LEVELS);
        return textures;
    }

    public static getLBasef(c: string): Texture[] {
        let textures = [];
        if (c === 'A') {
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.LBaseAf), 0.5)];
        } else if (c === 'C') {
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.LBaseCf), 0.5)];
        } else if (c === 'G') {
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.LBaseGf), 0.5)];
        } else { // c === 'U'
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.LBaseUf), 0.5)];
        }
        EternaTextureUtil.createScaled(textures, Base.ZOOM_SCALE_FACTOR, Base.NUM_ZOOM_LEVELS);
        return textures;
    }

    public static getBaseLock(c: string): Texture[] {
        let textures = [];
        if (c === 'A') {
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.BaseALock), 0.5)];
        } else if (c === 'C') {
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.BaseCLock), 0.5)];
        } else if (c === 'G') {
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.BaseGLock), 0.5)];
        } else { // c === 'U'
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.BaseULock), 0.5)];
        }
        EternaTextureUtil.createScaled(textures, Base.ZOOM_SCALE_FACTOR, Base.NUM_ZOOM_LEVELS);
        return textures;
    }

    public static getBasefLock(c: string): Texture[] {
        let textures = [];
        if (c === 'A') {
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.BaseAfLock), 0.5)];
        } else if (c === 'C') {
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.BaseCfLock), 0.5)];
        } else if (c === 'G') {
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.BaseGfLock), 0.5)];
        } else { // c === 'U'
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.BaseUfLock), 0.5)];
        }
        EternaTextureUtil.createScaled(textures, Base.ZOOM_SCALE_FACTOR, Base.NUM_ZOOM_LEVELS);
        return textures;
    }

    public static getBaseMid(c: string): Texture[] {
        let textures = [];
        if (c === 'A') {
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.BaseAMid), 0.5)];
        } else if (c === 'C') {
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.BaseCMid), 0.5)];
        } else if (c === 'G') {
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.BaseGMid), 0.5)];
        } else { // c === 'U'
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.BaseUMid), 0.5)];
        }
        EternaTextureUtil.createScaled(textures, Base.ZOOM_SCALE_FACTOR, Base.NUM_ZOOM_LEVELS);
        return textures;
    }

    public static getBasefMid(c: string): Texture[] {
        let textures = [];
        if (c === 'A') {
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.BaseAfMid), 0.5)];
        } else if (c === 'C') {
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.BaseCfMid), 0.5)];
        } else if (c === 'G') {
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.BaseGfMid), 0.5)];
        } else { // c === 'U'
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.BaseUfMid), 0.5)];
        }
        EternaTextureUtil.createScaled(textures, Base.ZOOM_SCALE_FACTOR, Base.NUM_ZOOM_LEVELS);
        return textures;
    }

    public static getBaseMidLock(c: string): Texture[] {
        let textures = [];
        if (c === 'A') {
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.BaseAMidLock), 0.5)];
        } else if (c === 'C') {
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.BaseCMidLock), 0.5)];
        } else if (c === 'G') {
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.BaseGMidLock), 0.5)];
        } else { // c === 'U'
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.BaseUMidLock), 0.5)];
        }
        EternaTextureUtil.createScaled(textures, Base.ZOOM_SCALE_FACTOR, Base.NUM_ZOOM_LEVELS);
        return textures;
    }

    public static getBasefMidLock(c: string): Texture[] {
        let textures = [];
        if (c === 'A') {
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.BaseAfMidLock), 0.5)];
        } else if (c === 'C') {
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.BaseCfMidLock), 0.5)];
        } else if (c === 'G') {
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.BaseGfMidLock), 0.5)];
        } else { // c === 'U'
            textures = [EternaTextureUtil.scaleBy(this.getBitmap(Bitmaps.BaseUfMidLock), 0.5)];
        }
        EternaTextureUtil.createScaled(textures, Base.ZOOM_SCALE_FACTOR, Base.NUM_ZOOM_LEVELS);
        return textures;
    }

    public static getTextBitmap(txt: string, color: number = 0xffffff): Texture {
        return BitmapManager.getTextBitmapImpl(txt, Fonts.STDFONT, 12, true, color);
    }

    private static getTextBitmapImpl(
        text: string, fontName: string, fontSize: number, bold: boolean, color: number
    ): Texture {
        const styleString = [fontName, fontSize, bold, color].join(',');
        let textMap = BitmapManager._textBitmaps.get(styleString);
        if (textMap == null) {
            textMap = new Map();
            BitmapManager._textBitmaps.set(styleString, textMap);
        }

        let bitmap: Texture | undefined = textMap.get(text);
        if (bitmap === undefined) {
            const builder = new TextBuilder(text).font(fontName).fontSize(fontSize).color(color);
            if (bold) {
                builder.bold();
            }
            bitmap = TextureUtil.renderToTexture(builder.build());
            textMap.set(text, bitmap);
        }

        return bitmap;
    }

    private static readonly _textBitmaps: Map<string, Map<string, Texture>> = new Map();
}

import {Texture} from 'pixi.js';
import {TextureUtil, Assert, TextBuilder} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import Bitmaps from './Bitmaps';

export default class BitmapManager {
    public static getBitmap(url: string): Texture {
        return Texture.fromImage(url);
    }

    public static getNumberBitmap(ii: number, color: number = 0xffffff): Texture {
        return BitmapManager.getTextBitmapImpl(ii.toString(), Fonts.ARIAL, 14, false, color);
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
            return this.getBitmap(Bitmaps.BaseAMin);
        } else if (c === 'C') {
            return this.getBitmap(Bitmaps.BaseCMin);
        } else if (c === 'G') {
            return this.getBitmap(Bitmaps.BaseGMin);
        } else { // c === 'U'
            return this.getBitmap(Bitmaps.BaseUMin);
        }
    }

    public static getLBase(c: string): Texture {
        if (c === 'A') {
            return this.getBitmap(Bitmaps.LBaseA);
        } else if (c === 'C') {
            return this.getBitmap(Bitmaps.LBaseC);
        } else if (c === 'G') {
            return this.getBitmap(Bitmaps.LBaseG);
        } else { // c === 'U'
            return this.getBitmap(Bitmaps.LBaseU);
        }
    }

    public static getLBasef(c: string): Texture {
        if (c === 'A') {
            return this.getBitmap(Bitmaps.LBaseAf);
        } else if (c === 'C') {
            return this.getBitmap(Bitmaps.LBaseCf);
        } else if (c === 'G') {
            return this.getBitmap(Bitmaps.LBaseGf);
        } else { // c === 'U'
            return this.getBitmap(Bitmaps.LBaseUf);
        }
    }

    public static getBaseLock(c: string): Texture {
        if (c === 'A') {
            return this.getBitmap(Bitmaps.BaseALock);
        } else if (c === 'C') {
            return this.getBitmap(Bitmaps.BaseCLock);
        } else if (c === 'G') {
            return this.getBitmap(Bitmaps.BaseGLock);
        } else { // c === 'U'
            return this.getBitmap(Bitmaps.BaseULock);
        }
    }

    public static getBasefLock(c: string): Texture {
        if (c === 'A') {
            return this.getBitmap(Bitmaps.BaseAfLock);
        } else if (c === 'C') {
            return this.getBitmap(Bitmaps.BaseCfLock);
        } else if (c === 'G') {
            return this.getBitmap(Bitmaps.BaseGfLock);
        } else { // c === 'U'
            return this.getBitmap(Bitmaps.BaseUfLock);
        }
    }

    public static getBaseMid(c: string): Texture {
        if (c === 'A') {
            return this.getBitmap(Bitmaps.BaseAMid);
        } else if (c === 'C') {
            return this.getBitmap(Bitmaps.BaseCMid);
        } else if (c === 'G') {
            return this.getBitmap(Bitmaps.BaseGMid);
        } else { // c === 'U'
            return this.getBitmap(Bitmaps.BaseUMid);
        }
    }

    public static getBasefMid(c: string): Texture {
        if (c === 'A') {
            return this.getBitmap(Bitmaps.BaseAfMid);
        } else if (c === 'C') {
            return this.getBitmap(Bitmaps.BaseCfMid);
        } else if (c === 'G') {
            return this.getBitmap(Bitmaps.BaseGfMid);
        } else { // c === 'U'
            return this.getBitmap(Bitmaps.BaseUfMid);
        }
    }

    public static getBaseMidLock(c: string): Texture {
        if (c === 'A') {
            return this.getBitmap(Bitmaps.BaseAMidLock);
        } else if (c === 'C') {
            return this.getBitmap(Bitmaps.BaseCMidLock);
        } else if (c === 'G') {
            return this.getBitmap(Bitmaps.BaseGMidLock);
        } else { // c === 'U'
            return this.getBitmap(Bitmaps.BaseUMidLock);
        }
    }

    public static getBasefMidLock(c: string): Texture {
        if (c === 'A') {
            return this.getBitmap(Bitmaps.BaseAfMidLock);
        } else if (c === 'C') {
            return this.getBitmap(Bitmaps.BaseCfMidLock);
        } else if (c === 'G') {
            return this.getBitmap(Bitmaps.BaseGfMidLock);
        } else { // c === 'U'
            return this.getBitmap(Bitmaps.BaseUfMidLock);
        }
    }

    public static getTextBitmap(txt: string, color: number = 0xffffff): Texture {
        return BitmapManager.getTextBitmapImpl(txt, Fonts.ARIAL, 12, true, color);
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
            let builder = new TextBuilder(text).font(fontName).fontSize(fontSize).color(color);
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

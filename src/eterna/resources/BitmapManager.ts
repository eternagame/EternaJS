import {Texture} from 'pixi.js';
import {TextureUtil, TextBuilder} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
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

    public static dispose() {
        // @ts-expect-error Ok to remove on shutdown
        delete BitmapManager._textBitmaps;
    }

    private static readonly _textBitmaps: Map<string, Map<string, Texture>> = new Map();
}

import {Texture} from 'pixi.js';
import {TextureUtil, Assert, TextBuilder} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import Bitmaps from './Bitmaps';

export default class BitmapManager {
    public static getBitmap(url: string): Texture {
        return Texture.fromImage(url);
    }

    public static getBitmapNamed(name: string): Texture {
        let source: string = (Bitmaps as any)[name];
        Assert.notNull(source, `No such bitmap: ${name}`);
        return this.getBitmap(source);
    }

    public static getNumberBitmap(ii: number, color: number = 0xffffff): Texture {
        return BitmapManager.getTextBitmapImpl(ii.toString(), Fonts.ARIAL, 14, false, color);
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

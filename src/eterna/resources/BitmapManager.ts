import {Texture} from "pixi.js";
import {Assert} from "../../flashbang/util/Assert";
import {TextBuilder} from "../../flashbang/util/TextBuilder";
import {TextureUtil} from "../../flashbang/util/TextureUtil";
import {Fonts} from "../util/Fonts";
import {Bitmaps} from "./Bitmaps";

export class BitmapManager {
    /// TODO: remove me!
    public static get_bitmap(source: string): Texture {
        return Texture.fromImage(source);
    }

    /// TODO: remove me!
    public static get_bitmap_named(name: string): Texture {
        let source: string = (Bitmaps as any)[name];
        Assert.notNull(source, `No such bitmap: ${name}`);
        return this.get_bitmap(source);
    }

    public static get_number_bitmap(ii: number, color: number = 0xffffff): Texture {
        return BitmapManager.get_text_bitmap_impl(ii.toString(), Fonts.ARIAL, 14, false, color);
    }

    public static get_text_bitmap(txt: string, color: number = 0xffffff): Texture {
        return BitmapManager.get_text_bitmap_impl(txt, Fonts.ARIAL, 12, true, color);
    }

    private static get_text_bitmap_impl(text: string, fontName: string, fontSize: number, bold: boolean, color: number): Texture {
        let bitmap: Texture = BitmapManager._textBitmaps.get(text);
        if (bitmap == null) {
            let builder = new TextBuilder(text).font(fontName).fontSize(fontSize).color(color);
            if (bold){
                builder.bold();
            }
            bitmap = TextureUtil.renderToTexture(builder.build());
            BitmapManager._textBitmaps.set(text, bitmap);
        }

        return bitmap;
    }

    private static readonly _textBitmaps: Map<string, Texture> = new Map();
}

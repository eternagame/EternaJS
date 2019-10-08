import * as base64js from 'base64-js';
import {DisplayObject, Sprite, Texture} from 'pixi.js';
import DisplayUtil from './DisplayUtil';

export default class Base64 {
    /** Renders a DisplayObject or Texture to a PNG and base64-encodes it */
    public static encodeDisplayObjectPNG(disp: DisplayObject | Texture) {
        let target: DisplayObject = disp instanceof DisplayObject ? disp : new Sprite(disp);
        return Base64.encodeBytes(DisplayUtil.renderToPNG(target));
    }

    public static encodeBytes(bytes: ArrayBuffer): string {
        return base64js.fromByteArray(new Uint8Array(bytes));
    }
}

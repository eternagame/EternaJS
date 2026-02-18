import * as base64js from 'base64-js';
import {Container, Sprite, Texture} from 'pixi.js';
import DisplayUtil from './DisplayUtil';

export default class Base64 {
    /** Renders a Container or Texture to a PNG and base64-encodes it */
    public static encodeDisplayObjectPNG(disp: Container | Texture) {
        const target: Container = disp instanceof Container ? disp : new Sprite(disp);
        return Base64.encodeBytes(DisplayUtil.renderToPNG(target));
    }

    public static encodeBytes(bytes: ArrayBuffer): string {
        return base64js.fromByteArray(new Uint8Array(bytes));
    }
}

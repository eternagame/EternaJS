import * as _ from "lodash";
import {BaseRenderTexture, BaseTexture, DisplayObject, Rectangle, RenderTexture, Texture} from "pixi.js";
import {Flashbang} from "../core/Flashbang";

export class TextureUtil {
    /** Returns a promise that will resolve when the texture is loaded */
    public static load(tex: Texture): Promise<Texture> {
        let base: BaseTexture = tex.baseTexture;
        if (!base.isLoading) {
            return base.hasLoaded ?
                Promise.resolve(tex) :
                Promise.reject(`texture failed to load [source=${base.source}]`);
        } else {
            return new Promise<Texture>((resolve, reject) => {
                base.once("loaded", () => resolve(tex));
                base.once("error", () => reject(`texture failed to load [source=${base.source}]`));
            });
        }
    }

    /**
     * Returns a promise that will resolve when the given texture source is ready to be used.
     * Textures are cached after being loaded, so calling this multiple times is fine.
     */
    public static loadURL(texURL: string): Promise<Texture> {
        return this.load(Texture.fromImage(texURL));
    }

    /** Returns a promise that will resolve when the textures at the given URLs are loaded. */
    public static loadURLs(...urls: string[]): Promise<Texture[]> {
        return Promise.all(_.map(urls, (url) => this.loadURL(url)));
    }

    /**
     * Renders the given DisplayObject to a new texture.
     * All textures in the DisplayObject's hierarchy should be loaded before calling this.
     */
    public static renderToTexture(disp: DisplayObject): Texture {
        disp.setTransform();
        disp.getLocalBounds(TextureUtil.R);
        let tex: RenderTexture = new RenderTexture(new BaseRenderTexture(TextureUtil.R.width, TextureUtil.R.height));
        Flashbang.pixi.renderer.render(disp, tex, true);
        return tex;
    }

    private static readonly R: Rectangle = new Rectangle();
}

import {BaseRenderTexture, BaseTexture, DisplayObject, Rectangle, RenderTexture, Texture} from "pixi.js";
import {Flashbang} from "../core/Flashbang";

export class TextureUtil {
    /** Creates a promise that will resolve when the texture is loaded */
    public static loadTexture(tex: Texture): Promise<Texture> {
        return this.whenBaseTexLoaded(tex.baseTexture).then(() => Promise.resolve(tex));
    }

    /**
     * Creates a promise that will resolve when the given texture source is ready to be used.
     * Textures are cached after being loaded, so calling this multiple times is fine.
     */
    public static loadTextureSource(textureSource: string): Promise<void> {
        return this.whenBaseTexLoaded(BaseTexture.fromImage(textureSource));
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

    private static whenBaseTexLoaded(base: BaseTexture): Promise<void> {
        if (!base.isLoading) {
            return base.hasLoaded ?
                Promise.resolve() :
                Promise.reject(`texture failed to load [source=${base.source}]`);
        } else {
            return new Promise<void>((resolve, reject) => {
                base.once("loaded", () => resolve());
                base.once("error", () => reject(`texture failed to load [source=${base.source}]`));
            });
        }
    }

    private static readonly R: Rectangle = new Rectangle();
}

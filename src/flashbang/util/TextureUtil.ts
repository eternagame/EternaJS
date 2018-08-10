import * as _ from "lodash";
import {BaseRenderTexture, BaseTexture, Container, DisplayObject, Rectangle, RenderTexture, Texture} from "pixi.js";
import {Flashbang} from "../core/Flashbang";
import {Assert} from "./Assert";

export class TextureUtil {
    public static fromBase64PNG(base64PNG: string): Promise<Texture> {
        // <img> elements can be created from base64 strings.
        // We create an img, set its src data to the base64 string,
        // and then use that as the source for a new PIXI texture.
        let img = document.createElement("img");
        img.src = `data:image/png;base64, ${base64PNG}`;
        let baseTex = new BaseTexture(img);
        let tex = new Texture(baseTex);

        return new Promise<Texture>(resolve => {
            tex.once("update", tex => resolve(tex));
        });
    }

    public static load(source: Texture | string | string[]): Promise<void> {
        if (source instanceof Texture) {
            return this.loadTexture(source as Texture).then(() => {});
        } else if (typeof source === "string") {
            return this.loadURL(source as string).then(() => {});
        } else {
            return this.loadURLs(source as string[]).then(() => {});
        }
    }

    /** Returns a promise that will resolve when the texture is loaded */
    public static loadTexture(tex: Texture): Promise<Texture> {
        let base: BaseTexture = tex.baseTexture;
        if (!base.isLoading) {
            return base.hasLoaded
                ? Promise.resolve(tex)
                : Promise.reject(`texture failed to load [url=${base.imageUrl}]`);
        } else {
            // log.debug(`Loading image... [url=${base.imageUrl}]`);
            return new Promise<Texture>((resolve, reject) => {
                base.once("loaded", () => resolve(tex));
                base.once("error", () => reject(`texture failed to load [url=${base.imageUrl}]`));
            });
        }
    }

    /**
     * Returns a promise that will resolve when the given texture source is ready to be used.
     * Textures are cached after being loaded, so calling this multiple times is fine.
     */
    public static loadURL(texURL: string): Promise<Texture> {
        return this.loadTexture(Texture.fromImage(texURL));
    }

    /** Returns a promise that will resolve when the textures at the given URLs are loaded. */
    public static loadURLs(urls: string[]): Promise<Texture[]> {
        return Promise.all(_.map(urls, url => this.loadURL(url)));
    }

    /**
     * Renders the given DisplayObject to a new texture.
     * All textures in the DisplayObject's hierarchy should be loaded before calling this.
     */
    public static renderToTexture(disp: DisplayObject): Texture {
        Assert.isTrue(disp.parent == null, "TODO");

        let wrap: Container = new Container();
        wrap.addChild(disp);

        wrap.getLocalBounds(TextureUtil.R);
        wrap.x = -TextureUtil.R.x;
        wrap.y = -TextureUtil.R.y;
        let tex: RenderTexture = new RenderTexture(new BaseRenderTexture(TextureUtil.R.width, TextureUtil.R.height));
        Flashbang.pixi.renderer.render(wrap, tex, true);
        return tex;
    }

    private static readonly R: Rectangle = new Rectangle();
}

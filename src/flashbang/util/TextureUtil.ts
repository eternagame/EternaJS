import {
    BaseTexture, Container, DisplayObject, Rectangle, Texture
} from 'pixi.js';
import Flashbang from 'flashbang/core/Flashbang';
import Assert from './Assert';

export default class TextureUtil {
    public static async fromBase64PNG(base64PNG: string): Promise<Texture> {
        // <img> elements can be created from base64 strings.
        // We create an img, set its src data to the base64 string,
        // and then use that as the source for a new PIXI texture.
        const img = document.createElement('img');
        img.src = `data:image/png;base64, ${base64PNG}`;
        const baseTex = new BaseTexture(img);
        const tex = new Texture(baseTex);

        if (baseTex.valid) {
            // The image may already be loaded
            return tex;
        } else {
            return new Promise<Texture>((resolve) => {
                tex.once('update', () => resolve(tex));
            });
        }
    }

    public static load(source: Texture | string | string[]): Promise<void> {
        if (source instanceof Texture) {
            return this.loadTexture(source as Texture).then(() => {});
        } else if (typeof source === 'string') {
            return this.loadURL(source as string).then(() => {});
        } else {
            return this.loadURLs(source as string[]).then(() => {});
        }
    }

    /** Returns a promise that will resolve when the texture is loaded */
    public static async loadTexture(tex: Texture): Promise<Texture> {
        const base: BaseTexture = tex.baseTexture;
        if (base.valid) return tex;
        return new Promise<Texture>((resolve, reject) => {
            base.once('loaded', () => resolve(tex));
            base.once('error', (e: string | Error) => reject(new Error(`Texture failed to load: ${e}`)));
        });
    }

    /**
     * Returns a promise that will resolve when the given texture source is ready to be used.
     * Textures are cached after being loaded, so calling this multiple times is fine.
     */
    public static loadURL(texURL: string): Promise<Texture> {
        return this.loadTexture(Texture.from(texURL));
    }

    /** Returns a promise that will resolve when the textures at the given URLs are loaded. */
    public static loadURLs(urls: string[]): Promise<Texture[]> {
        return Promise.all(urls.map((url) => this.loadURL(url)));
    }

    /**
     * Renders the given DisplayObject to a new texture.
     * All textures in the DisplayObject's hierarchy should be loaded before calling this.
     */
    public static renderToTexture(disp: DisplayObject): Texture {
        Assert.isTrue(disp.parent == null, 'TODO');

        const wrap: Container = new Container();
        wrap.addChild(disp);

        // TODO: Shouldn't generateTexture already be handling this?
        wrap.getLocalBounds(TextureUtil.R);

        Assert.assertIsDefined(Flashbang.pixi);
        // NOTE: We briefly enabled multisampling, but had to revert it because it appears to be bugged on
        // ARM processors. On the HP 11MK G9 EE Chromebook, textures were completely invisible. On Safari
        // with the M1 (but not Chrome or FF - both worked fine!) it showed the texture backgrounds as pink
        // instead of transparent
        const tex = Flashbang.pixi.renderer.generateTexture(disp, {region: TextureUtil.R});
        wrap.removeChild(disp);
        return tex;
    }

    private static readonly R: Rectangle = new Rectangle();
}

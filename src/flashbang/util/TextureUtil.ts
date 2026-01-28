import Flashbang from 'flashbang/core/Flashbang';
import {
    Assets,
    Container,
    Texture,
    UnresolvedAsset
} from 'pixi.js';
import Assert from './Assert';

export default class TextureUtil {
    public static async fromBase64PNG(base64PNG: string): Promise<Texture> {
        const url = `data:image/png;base64, ${base64PNG}`;
        return Assets.load<Texture>(url);
    }

    public static async load(source: string | string[]): Promise<void> {
        if (typeof source === 'string') {
            await this.loadURL(source as string);
        } else {
            await this.loadURLs(source as string[]);
        }
    }

    /**
     * Get configurations for loading textures.
     * Scales the texture if it's an SVG URL
     */
    private static getLoadConfig(textureURL: string) : string | UnresolvedAsset {
        if (textureURL.startsWith('data:image/svg;base64') || textureURL.endsWith('.svg')) {
            return {src: textureURL, data: {resolution: 2}};
        } else {
            return textureURL;
        }
    }

    /**
     * Returns a promise that will resolve when the given texture source is ready to be used.
     * Textures are cached after being loaded, so calling this multiple times is fine.
     */
    private static async loadURL(textureURL: string): Promise<void> {
        await Assets.load<Texture>(this.getLoadConfig(textureURL));
    }

    /** Returns a promise that will resolve when the textures at the given URLs are loaded. */
    private static async loadURLs(textureURLs: string[]): Promise<void> {
        await Assets.load<Texture>(textureURLs.map((url) => this.getLoadConfig(url)));
    }

    /**
     * Renders the given DisplayObject to a new texture.
     * All textures in the DisplayObject's hierarchy should be loaded before calling this.
     */
    public static renderToTexture(disp: Container): Texture {
        Assert.isTrue(disp.parent == null, 'TODO');

        const wrap: Container = new Container();
        wrap.addChild(disp);

        // TODO: Shouldn't generateTexture already be handling this?
        const bounds = wrap.getLocalBounds();

        Assert.assertIsDefined(Flashbang.pixi);
        // NOTE: We briefly enabled multisampling, but had to revert it because it appears to be bugged on
        // ARM processors. On the HP 11MK G9 EE Chromebook, textures were completely invisible. On Safari
        // with the M1 (but not Chrome or FF - both worked fine!) it showed the texture backgrounds as pink
        // instead of transparent

        // Render the wrapper Container so that rotated Sprites aren't clipped
        const tex = Flashbang.pixi.renderer.generateTexture({target: wrap, frame: bounds.rectangle});
        wrap.removeChild(disp);
        return tex;
    }
}

import {Matrix, Sprite, Texture} from 'pixi.js';
import {TextureUtil, ColorUtil, MathUtil} from 'flashbang';

export default class EternaTextureUtil {
    /**
     * Creates scaled versions of each texture in the given array.
     * @param textures an Array of textures to append to
     * @param scaleFactor scale factor to apply to each successive zoom level
     * @param numScaleLevels number of scale levels to create versions of
     */
    public static createScaled(textures: Texture[], scaleFactor: number, numScaleLevels: number): void {
        let origLength: number = textures.length;
        let sizeScaler: number = scaleFactor;
        let scalerMat: Matrix = new Matrix();

        for (let ss = 1; ss < numScaleLevels; ss++) {
            scalerMat.identity();
            scalerMat.scale(sizeScaler, sizeScaler);

            for (let ii = 0; ii < origLength; ii++) {
                textures.push(EternaTextureUtil.scaleBy(textures[ii], sizeScaler));
            }

            sizeScaler *= scaleFactor;
        }
    }

    /**
     * Creates 360-degree rotated versions of the given texture.
     * @return an Array containing the original texture and its rotated versions.
     */
    public static createRotated(texture: Texture, stepSize: number): Texture[] {
        let rotated: Texture[] = [texture];
        let endIndex: number = 360 / stepSize;

        for (let ii = 1; ii < endIndex; ii++) {
            let sprite: Sprite = new Sprite(texture);
            sprite.rotation = stepSize * ii * MathUtil.deg2Rad;
            rotated.push(TextureUtil.renderToTexture(sprite));
        }

        return rotated;
    }

    /**
     * Create versions of the given texture with successively lower alpha values, to 0.
     * @return an Array containing the original texture and its faded-out versions
     */
    public static createTransparent(texture: Texture, numLevels: number): Texture[] {
        let transparent: Texture[] = [texture];

        for (let ss = 1; ss < numLevels; ss++) {
            let colTrans = ColorUtil.colorTransform(1, 1, 1, 1 - (ss / numLevels), 0, 0, 0, 0);
            let sprite: Sprite = new Sprite(texture);
            sprite.filters = [colTrans];
            transparent.push(TextureUtil.renderToTexture(sprite));
        }

        return transparent;
    }

    public static colorTransform(
        texture: Texture, rs: number, gs: number, bs: number, rt: number, gt: number, bt: number
    ): Texture {
        let colorTransform = ColorUtil.colorTransform(rs / 255.0, gs / 255.0, bs / 255.0, 1, rt, gt, bt, 0);
        let sprite: Sprite = new Sprite(texture);
        sprite.filters = [colorTransform];
        return TextureUtil.renderToTexture(sprite);
    }

    public static colorTransformAlpha(
        texture: Texture,
        rs: number, gs: number, bs: number, als: number,
        rt: number, gt: number, bt: number, alt: number
    ): Texture {
        let colorTransform = ColorUtil.colorTransform(rs / 255.0, gs / 255.0, bs / 255.0, als, rt, gt, bt, alt);
        let sprite: Sprite = new Sprite(texture);
        sprite.filters = [colorTransform];
        return TextureUtil.renderToTexture(sprite);
    }

    public static scaleBy(texture: Texture, scale: number): Texture {
        return EternaTextureUtil.scaleByXY(texture, scale, scale);
    }

    public static scaleByXY(texture: Texture, scaleX: number, scaleY: number): Texture {
        let sprite: Sprite = new Sprite(texture);
        sprite.scale.x = scaleX;
        sprite.scale.y = scaleY;
        return TextureUtil.renderToTexture(sprite);
    }

    public static rotate(source: Texture, degree: number): Texture {
        let sprite: Sprite = new Sprite(source);
        sprite.rotation = degree * (Math.PI / 180);
        return TextureUtil.renderToTexture(sprite);
    }
}

import {Matrix, Sprite, Texture} from "pixi.js";
import {ColorUtil, MathUtil, TextureUtil} from "flashbang/util";

export default class EternaTextureUtil {
    /**
     * Creates scaled versions of each texture in the given array.
     * @param textures an Array of textures to append to
     * @param scaleFactor scale factor to apply to each successive zoom level
     * @param numScaleLevels number of scale levels to create versions of
     */
    public static createScaled(textures: Texture[], scaleFactor: number, numScaleLevels: number): void {
        let orig_length: number = textures.length;
        let size_scaler: number = scaleFactor;
        let scaler_mat: Matrix = new Matrix();

        for (let ss = 1; ss < numScaleLevels; ss++) {
            scaler_mat.identity();
            scaler_mat.scale(size_scaler, size_scaler);

            for (let ii = 0; ii < orig_length; ii++) {
                textures.push(EternaTextureUtil.scaleBy(textures[ii], size_scaler));
            }

            size_scaler *= scaleFactor;
        }
    }

    /**
     * Creates 360-degree rotated versions of the given texture.
     * @return an Array containing the original texture and its rotated versions.
     */
    public static createRotated(texture: Texture, step_size: number): Texture[] {
        let rotated: Texture[] = [texture];
        let end_index: number = 360 / step_size;

        for (let ii = 1; ii < end_index; ii++) {
            let sprite: Sprite = new Sprite(texture);
            sprite.rotation = step_size * ii * MathUtil.deg2Rad;
            rotated.push(TextureUtil.renderToTexture(sprite));
        }

        return rotated;
    }

    /**
     * Create versions of the given texture with successively lower alpha values, to 0.
     * @return an Array containing the original texture and its faded-out versions
     */
    public static createTransparent(texture: Texture, num_levels: number): Texture[] {
        let transparent: Texture[] = [texture];

        for (let ss = 1; ss < num_levels; ss++) {
            let col_trans = ColorUtil.colorTransform(1, 1, 1, 1 - (ss / num_levels), 0, 0, 0, 0);
            let sprite: Sprite = new Sprite(texture);
            sprite.filters = [col_trans];
            transparent.push(TextureUtil.renderToTexture(sprite));
        }

        return transparent;
    }

    public static colorTransform(texture: Texture, rs: number, gs: number, bs: number, rt: number, gt: number, bt: number): Texture {
        let color_transform = ColorUtil.colorTransform(rs / 255.0, gs / 255.0, bs / 255.0, 1, rt, gt, bt, 0);
        let sprite: Sprite = new Sprite(texture);
        sprite.filters = [color_transform];
        return TextureUtil.renderToTexture(sprite);
    }

    public static colorTransformAlpha(texture: Texture, rs: number, gs: number, bs: number, als: number, rt: number, gt: number, bt: number, alt: number): Texture {
        let color_transform = ColorUtil.colorTransform(rs / 255.0, gs / 255.0, bs / 255.0, als, rt, gt, bt, alt);
        let sprite: Sprite = new Sprite(texture);
        sprite.filters = [color_transform];
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

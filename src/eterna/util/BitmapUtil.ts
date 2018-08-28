import {Matrix, Sprite, Texture} from "pixi.js";
import {TextureUtil} from "../../flashbang/util/TextureUtil";
import {ColorUtil} from "../../flashbang/util/ColorUtil";
import {MathUtil} from "../../flashbang/util/MathUtil";

export class BitmapUtil {
    /**
     * Creates scaled versions of each bitmap in the given array.
     * @param bitmaps an Array of bitmaps to append to
     * @param scaleFactor scale factor to apply to each successive zoom level
     * @param numScaleLevels number of scale levels to create versions of
     */
    public static createScaled(bitmaps: Texture[], scaleFactor: number, numScaleLevels: number): void {
        let orig_length: number = bitmaps.length;
        let size_scaler: number = scaleFactor;
        let scaler_mat: Matrix = new Matrix();

        for (let ss: number = 1; ss < numScaleLevels; ss++) {
            scaler_mat.identity();
            scaler_mat.scale(size_scaler, size_scaler);

            for (let ii: number = 0; ii < orig_length; ii++) {
                bitmaps.push(BitmapUtil.scaleBy(bitmaps[ii], size_scaler));
            }

            size_scaler *= scaleFactor;
        }
    }

    /**
     * Creates 360-degree rotated versions of the given bitmap.
     * @return an Array containing the original bitmap and its rotated versions.
     */
    public static createRotated(bitmap: Texture, step_size: number): Texture[] {
        let rotated: Texture[] = [bitmap];
        let end_index: number = 360 / step_size;

        for (let ii: number = 1; ii < end_index; ii++) {
            let sprite: Sprite = new Sprite(bitmap);
            sprite.rotation = step_size * ii * MathUtil.deg2Rad;
            rotated.push(TextureUtil.renderToTexture(sprite));
        }

        return rotated;
    }

    /**
     * Create versions of the given bitmap with successively lower alpha values, to 0.
     * @return an Array containing the original bitmap and its faded-out versions
     */
    public static createTransparent(bitmap: Texture, num_levels: number): Texture[] {
        let transparent: Texture[] = [bitmap];

        for (let ss: number = 1; ss < num_levels; ss++) {
            let col_trans = ColorUtil.colorTransform(1, 1, 1, 1 - (ss / num_levels), 0, 0, 0, 0);
            let sprite: Sprite = new Sprite(bitmap);
            sprite.filters = [col_trans];
            transparent.push(TextureUtil.renderToTexture(sprite));
        }

        return transparent;
    }

    public static colorTransform(bitmap: Texture, rs: number, gs: number, bs: number, rt: number, gt: number, bt: number): Texture {
        let color_transform = ColorUtil.colorTransform(rs / 255.0, gs / 255.0, bs / 255.0, 1, rt, gt, bt, 0);
        let sprite: Sprite = new Sprite(bitmap);
        sprite.filters = [color_transform];
        return TextureUtil.renderToTexture(sprite);
    }

    public static colorTransformAlpha(bitmap: Texture, rs: number, gs: number, bs: number, als: number, rt: number, gt: number, bt: number, alt: number): Texture {
        let color_transform = ColorUtil.colorTransform(rs / 255.0, gs / 255.0, bs / 255.0, als, rt, gt, bt, alt);
        let sprite: Sprite = new Sprite(bitmap);
        sprite.filters = [color_transform];
        return TextureUtil.renderToTexture(sprite);
    }


    public static scaleBy(bitmap: Texture, scale: number): Texture {
        return BitmapUtil.scaleByXY(bitmap, scale, scale);
    }

    public static scaleByXY(bitmap: Texture, scaleX: number, scaleY: number): Texture {
        let sprite: Sprite = new Sprite(bitmap);
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

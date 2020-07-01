import {filters} from 'pixi.js';
import MathUtil from './MathUtil';
import StringUtil from './StringUtil';

export default class ColorUtil {
    public static fromString(str: string): number {
        if (str.length === 0 || str.charAt(0) !== '#') {
            throw new Error(`Invalid color string: ${str}`);
        }

        try {
            return StringUtil.parseUnsignedInteger(str.substr(1), 16);
        } catch (e) {
            throw new Error(`Invalid color string: ${str}`);
        }
    }

    /**
     * Blends two colors to create a new one.
     * @param c1 the first color
     * @param c2 the second color
     * @param blendFactor the percent contribution that c1 makes to the blended color (a value between [0, 1]).
     * (c2's contribution will be (1-blendFactor)).
     */
    public static blend(c1: number, c2: number, blendFactor: number): number {
        const r1: number = (c1 >> 16) & 0xff;
        const g1: number = (c1 >> 8) & 0xff;
        const b1: number = (c1 & 0xff);

        const r2: number = (c2 >> 16) & 0xff;
        const g2: number = (c2 >> 8) & 0xff;
        const b2: number = (c2 & 0xff);

        const blendInv: number = 1 - blendFactor;

        const rOut: number = (r1 * blendFactor) + (r2 * blendInv);
        const gOut: number = (g1 * blendFactor) + (g2 * blendInv);
        const bOut: number = (b1 * blendFactor) + (b2 * blendInv);

        return ((rOut & 0xff) << 16) | ((gOut & 0xff) << 8) | (bOut & 0xff);
    }

    /** Composes a 32-bit color from separate rgba components. Each component should be between [0, 1] */
    public static compose(r: number, g: number, b: number, a: number = 0): number {
        r = MathUtil.clamp(r, 0, 1) * 255;
        g = MathUtil.clamp(g, 0, 1) * 255;
        b = MathUtil.clamp(b, 0, 1) * 255;
        a = MathUtil.clamp(a, 0, 1) * 255;

        return ((a & 0xff) << 24) | ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
    }

    /** Returns the 8-bit red component of a 24-bit color. The value will be in [0,255] */
    public static getRed(color: number): number {
        return (color >> 16) & 0xff;
    }

    /** Returns the 8-bit green component of a 24-bit color. */
    public static getGreen(color: number): number {
        return (color >> 8) & 0xff;
    }

    /** Returns the 8-bit blue component of a 24-bit color. */
    public static getBlue(color: number): number {
        return color & 0xff;
    }

    /** Creates a ColorMatrixFilter using the params for the flash ColorTransform class */
    public static colorTransform(
        redMultiplier: number = 1.0,
        greenMultiplier: number = 1.0,
        blueMultiplier: number = 1.0,
        alphaMultiplier: number = 1.0,
        redOffset: number = 0,
        greenOffset: number = 0,
        blueOffset: number = 0,
        alphaOffset: number = 0
    ): filters.ColorMatrixFilter {
        const filter = new filters.ColorMatrixFilter();
        filter.matrix = [
            redMultiplier, 0, 0, 0, redOffset,
            0, greenMultiplier, 0, 0, greenOffset,
            0, 0, blueMultiplier, 0, blueOffset,
            0, 0, 0, alphaMultiplier, alphaOffset
        ];

        return filter;
    }
}

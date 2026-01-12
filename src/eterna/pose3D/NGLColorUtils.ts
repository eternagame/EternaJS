import {Color} from 'ngl';

export default class NGLColorUtils {
    public static getHex(color: number|string|Color): number {
        const c = new Color(color);
        return c.getHex();
    }
}

import {Graphics} from "pixi.js";
import {Vector2} from "../../flashbang/geom/Vector2";

export class GraphicsUtil {
    /** Draw a left-facing arrow, with its tip anchored at (0, 0) */
    public static drawArrow(triSize: number, baseLength: number, outlineColor: number, fillColor: number, graphics: Graphics = null): Graphics {
        if (graphics == null) {
            graphics = new Graphics();
        }

        // draw an equilateral triangle
        let triWidth = triSize;
        let triHeight = triWidth / 2 * Math.sqrt(2);

        let dir = new Vector2(1, 0);
        let perp_dir = new Vector2(-1 * dir.y, dir.x);
        let endPoint = new Vector2(0, 0);

        let basePoint = endPoint.offset(dir.x * triHeight, dir.y * triHeight);
        let n1 = basePoint.offset(perp_dir.x * triWidth * 0.5, perp_dir.y * triWidth * 0.5);
        let n2 = basePoint.offset(perp_dir.x * triWidth * -0.5, perp_dir.y * triWidth * -0.5);

        graphics.clear();
        graphics.lineStyle(1, outlineColor);
        graphics.beginFill(fillColor, 1);
        graphics.drawPolygon([endPoint.x, endPoint.y, n1.x, n1.y, n2.x, n2.y]);

        // draw rectangle
        const rectHeight = triSize - 20;
        let r_start = basePoint.offset(-perp_dir.x * rectHeight * 0.5,  -perp_dir.y * rectHeight * 0.5);
        graphics.drawRect(r_start.x, r_start.y, baseLength, rectHeight);
        graphics.endFill();

        graphics.lineStyle(undefined, undefined);
        graphics.beginFill(fillColor, 1);
        graphics.drawRect(r_start.x - 5, r_start.y + 1, 20, rectHeight - 1);
        graphics.endFill();

        return graphics;
    }
}

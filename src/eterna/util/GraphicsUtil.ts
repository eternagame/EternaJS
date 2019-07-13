import {Graphics, Point} from 'pixi.js';
import {Vector2} from 'flashbang';

export default class GraphicsUtil {
    /** Draw a left-facing arrow, with its tip anchored at (0, 0) */
    public static drawArrow(
        triSize: number, baseLength: number, outlineColor: number, fillColor: number, graphics: Graphics = null
    ): Graphics {
        if (graphics == null) {
            graphics = new Graphics();
        }

        // draw an equilateral triangle
        let triWidth = triSize;
        let triHeight = triWidth / 2 * Math.sqrt(2);

        let dir = new Vector2(1, 0);
        let perpDir = new Vector2(-1 * dir.y, dir.x);
        let endPoint = new Vector2(0, 0);

        let basePoint = endPoint.offset(dir.x * triHeight, dir.y * triHeight);
        let n1 = basePoint.offset(perpDir.x * triWidth * 0.5, perpDir.y * triWidth * 0.5);
        let n2 = basePoint.offset(perpDir.x * triWidth * -0.5, perpDir.y * triWidth * -0.5);

        graphics.clear();
        graphics.lineStyle(1, outlineColor);
        graphics.beginFill(fillColor, 1);
        graphics.drawPolygon([endPoint.x, endPoint.y, n1.x, n1.y, n2.x, n2.y]);

        // draw rectangle
        const rectHeight = triSize - 20;
        let rStart = basePoint.offset(-perpDir.x * rectHeight * 0.5, -perpDir.y * rectHeight * 0.5);
        graphics.drawRect(rStart.x, rStart.y, baseLength, rectHeight);
        graphics.endFill();

        graphics.lineStyle(undefined, undefined);
        graphics.beginFill(fillColor, 1);
        graphics.drawRect(rStart.x - 5, rStart.y + 1, 20, rectHeight - 1);
        graphics.endFill();

        return graphics;
    }

    public static drawLeftTriangle(scale: number = 1): Graphics {
        let g = new Graphics()
            .beginFill(0xFFFFFF, 0.8)
            .moveTo(0, 5)
            .lineTo(-7, 0)
            .lineTo(0, -5)
            .lineTo(0, 5);
        g.scale = new Point(scale, scale);
        return g;
    }

    public static drawRightTriangle(scale: number = 1): Graphics {
        let g = new Graphics()
            .beginFill(0xFFFFFF, 0.8)
            .moveTo(0, 5)
            .lineTo(7, 0)
            .lineTo(0, -5)
            .lineTo(0, 5);
        g.scale = new Point(scale, scale);
        return g;
    }
}

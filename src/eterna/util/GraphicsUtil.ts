import {Graphics} from 'pixi.js';
import {Vector2} from 'flashbang';

export default class GraphicsUtil {
    /**
     * Draw a left-facing arrow, with its tip anchored at the origin.
     *
     * @param triSize the width of the equilateral triangle that defines the tip of the arrow.
     * @param baseLength rectangle length
     * @param outlineColor arrow outline color
     * @param fillColor arrow fill collor
     * @param graphics a graphics object where the drawing takes place (null creates a new graphics instance)
     *
     * @returns the same graphics object that was passed, or a new one if null was passed,
     * with the arrow drawn.
     */
    public static drawArrow(
        triSize: number, baseLength: number, outlineColor: number, fillColor: number, graphics: Graphics | null = null
    ): Graphics {
        if (graphics == null) {
            graphics = new Graphics();
        }

        // draw an equilateral triangle
        const triWidth = triSize;
        const triHeight = (triWidth / 2) * Math.sqrt(2);

        const dir = new Vector2(1, 0);
        const perpDir = new Vector2(-1 * dir.y, dir.x);
        const endPoint = new Vector2(0, 0);

        const basePoint = endPoint.offset(dir.x * triHeight, dir.y * triHeight);
        const n1 = basePoint.offset(perpDir.x * triWidth * 0.5, perpDir.y * triWidth * 0.5);
        const n2 = basePoint.offset(perpDir.x * triWidth * -0.5, perpDir.y * triWidth * -0.5);

        graphics.clear();
        graphics.lineStyle(1, outlineColor);
        graphics.beginFill(fillColor, 1);
        graphics.drawPolygon([endPoint.x, endPoint.y, n1.x, n1.y, n2.x, n2.y]);

        // draw rectangle
        const rectHeight = triSize - 20;
        const rStart = basePoint.offset(-perpDir.x * rectHeight * 0.5, -perpDir.y * rectHeight * 0.5);
        graphics.drawRect(rStart.x, rStart.y, baseLength, rectHeight);
        graphics.endFill();

        graphics.lineStyle(0);
        graphics.beginFill(fillColor, 1);
        graphics.drawRect(rStart.x - 5, rStart.y + 1, 20, rectHeight - 1);
        graphics.endFill();

        return graphics;
    }

    /**
     * Draw a leftward-facing triangle.
     * @param scale scale factor for a triangle; default unity
     */
    public static drawLeftTriangle(scale: number = 1, color = 0xFFFFFF): Graphics {
        const g = new Graphics()
            .beginFill(color, 0.8)
            .moveTo(0, 5)
            .lineTo(-7, 0)
            .lineTo(0, -5)
            .lineTo(0, 5);
        g.scale.set(scale, scale);
        return g;
    }

    /**
     * Draw a rightward facing triangle.
     * @param scale scale factor for a triangle; default unity
     */
    public static drawRightTriangle(scale: number = 1, color = 0xFFFFFF): Graphics {
        const g = new Graphics()
            .beginFill(color, 0.8)
            .moveTo(0, 5)
            .lineTo(7, 0)
            .lineTo(0, -5)
            .lineTo(0, 5);
        g.scale.set(scale, scale);
        return g;
    }
}

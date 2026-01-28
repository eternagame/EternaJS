// =================================================================================================
//
//  Starling Framework
//  Copyright Gamua GmbH. All Rights Reserved.
//
//  This program is free software. You can redistribute and/or modify it
//  in accordance with the terms of the accompanying license agreement.
//
// =================================================================================================

import {
    Point, Rectangle, Matrix, Bounds
} from 'pixi.js';
import MatrixUtil from './MatrixUtil';

/** A utility class containing methods related to the Rectangle class. */
export default class RectangleUtil {
    public static setTo(r: Bounds | Rectangle, left: number, top: number, width: number, height: number): void {
        r.x = left;
        r.y = top;
        r.width = width;
        r.height = height;
    }

    public static setEmpty(r: Bounds): void {
        this.setTo(r, 0, 0, 0, 0);
    }

    /** Calculates the intersection between two Rectangles. If the rectangles do not intersect,
     *  this method returns an empty Rectangle object with its properties set to 0. */
    public static intersect(rect1: Rectangle, rect2: Rectangle): Bounds {
        const out = new Bounds();

        const left: number = rect1.x > rect2.x ? rect1.x : rect2.x;
        const right: number = rect1.right < rect2.right ? rect1.right : rect2.right;
        const top: number = rect1.y > rect2.y ? rect1.y : rect2.y;
        const bottom: number = rect1.bottom < rect2.bottom ? rect1.bottom : rect2.bottom;

        if (left > right || top > bottom) {
            this.setEmpty(out);
        } else {
            this.setTo(out, left, top, right - left, bottom - top);
        }

        return out;
    }

    /** If the rectangle contains negative values for width or height, all coordinates
     *  are adjusted so that the rectangle describes the same region with positive values. */
    public static normalize(rect: Rectangle): void {
        if (rect.width < 0) {
            rect.width = -rect.width;
            rect.x -= rect.width;
        }

        if (rect.height < 0) {
            rect.height = -rect.height;
            rect.y -= rect.height;
        }
    }

    /** Extends the rectangle in all four directions. */
    public static extend(rect: Rectangle, left = 0, right = 0,
        top = 0, bottom = 0): void {
        rect.x -= left;
        rect.y -= top;
        rect.width += left + right;
        rect.height += top + bottom;
    }

    /** Extends the rectangle in all four directions so that it is exactly on pixel bounds. */
    public static extendToWholePixels(rect: Rectangle, scaleFactor = 1): void {
        const left: number = Math.floor(rect.x * scaleFactor) / scaleFactor;
        const top: number = Math.floor(rect.y * scaleFactor) / scaleFactor;
        const right: number = Math.ceil(rect.right * scaleFactor) / scaleFactor;
        const bottom: number = Math.ceil(rect.bottom * scaleFactor) / scaleFactor;

        this.setTo(rect, left, top, right - left, bottom - top);
    }

    /** Calculates the bounds of a rectangle after transforming it by a matrix.
     *  If you pass an <code>out</code>-rectangle, the result will be stored in this rectangle
     *  instead of creating a new object. */
    public static getBounds(rectangle: Rectangle | Bounds, matrix: Matrix): Bounds {
        const out = new Bounds();

        let minX: number = Number.MAX_VALUE;
        let maxX: number = -Number.MAX_VALUE;
        let minY: number = Number.MAX_VALUE;
        let maxY: number = -Number.MAX_VALUE;
        const positions: Point[] = this.getPositions(rectangle);

        for (let i = 0; i < 4; ++i) {
            const sPoint = MatrixUtil.transformCoords(matrix, positions[i].x, positions[i].y);

            if (minX > sPoint.x) minX = sPoint.x;
            if (maxX < sPoint.x) maxX = sPoint.x;
            if (minY > sPoint.y) minY = sPoint.y;
            if (maxY < sPoint.y) maxY = sPoint.y;
        }

        this.setTo(out, minX, minY, maxX - minX, maxY - minY);
        return out;
    }

    /** Returns a vector containing the positions of the four edges of the given rectangle. */
    public static getPositions(rectangle: Rectangle | Bounds): Point[] {
        return [
            new Point(rectangle.left, rectangle.top),
            new Point(rectangle.right, rectangle.top),
            new Point(rectangle.left, rectangle.bottom),
            new Point(rectangle.right, rectangle.bottom)
        ];
    }

    /** Compares all properties of the given rectangle, returning true only if
     *  they are equal (with the given accuracy 'e'). */
    public static compare(r1: Rectangle, r2: Rectangle, e = 0.0001): boolean {
        if (r1 == null) {
            return r2 == null;
        } else if (r2 == null) {
            return false;
        } else {
            return r1.x > r2.x - e && r1.x < r2.x + e
                && r1.y > r2.y - e && r1.y < r2.y + e
                && r1.width > r2.width - e && r1.width < r2.width + e
                && r1.height > r2.height - e && r1.height < r2.height + e;
        }
    }
}

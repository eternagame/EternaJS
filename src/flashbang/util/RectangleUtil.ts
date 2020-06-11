// =================================================================================================
//
//  Starling Framework
//  Copyright Gamua GmbH. All Rights Reserved.
//
//  This program is free software. You can redistribute and/or modify it
//  in accordance with the terms of the accompanying license agreement.
//
// =================================================================================================

import {Point, Rectangle, Matrix} from 'pixi.js';
import MatrixUtil from './MatrixUtil';

/** A utility class containing methods related to the Rectangle class. */
export default class RectangleUtil {
    public static setTo(r: Rectangle, left: number, top: number, width: number, height: number): void {
        r.x = left;
        r.y = top;
        r.width = width;
        r.height = height;
    }

    public static setEmpty(r: Rectangle): void {
        RectangleUtil.setTo(r, 0, 0, 0, 0);
    }

    /** Calculates the intersection between two Rectangles. If the rectangles do not intersect,
     *  this method returns an empty Rectangle object with its properties set to 0. */
    public static intersect(rect1: Rectangle, rect2: Rectangle, out: Rectangle | null = null): Rectangle {
        if (out == null) out = new Rectangle();

        let left: number = rect1.x > rect2.x ? rect1.x : rect2.x;
        let right: number = rect1.right < rect2.right ? rect1.right : rect2.right;
        let top: number = rect1.y > rect2.y ? rect1.y : rect2.y;
        let bottom: number = rect1.bottom < rect2.bottom ? rect1.bottom : rect2.bottom;

        if (left > right || top > bottom) {
            RectangleUtil.setEmpty(out);
        } else {
            RectangleUtil.setTo(out, left, top, right - left, bottom - top);
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
        let left: number = Math.floor(rect.x * scaleFactor) / scaleFactor;
        let top: number = Math.floor(rect.y * scaleFactor) / scaleFactor;
        let right: number = Math.ceil(rect.right * scaleFactor) / scaleFactor;
        let bottom: number = Math.ceil(rect.bottom * scaleFactor) / scaleFactor;

        RectangleUtil.setTo(rect, left, top, right - left, bottom - top);
    }

    /** Calculates the bounds of a rectangle after transforming it by a matrix.
     *  If you pass an <code>out</code>-rectangle, the result will be stored in this rectangle
     *  instead of creating a new object. */
    public static getBounds(rectangle: Rectangle, matrix: Matrix, out: Rectangle | null = null): Rectangle {
        if (out == null) out = new Rectangle();

        let minX: number = Number.MAX_VALUE;
        let maxX: number = -Number.MAX_VALUE;
        let minY: number = Number.MAX_VALUE;
        let maxY: number = -Number.MAX_VALUE;
        let positions: Point[] = RectangleUtil.getPositions(rectangle, RectangleUtil.sPositions);

        for (let i = 0; i < 4; ++i) {
            MatrixUtil.transformCoords(matrix, positions[i].x, positions[i].y, RectangleUtil.sPoint);

            if (minX > RectangleUtil.sPoint.x) minX = RectangleUtil.sPoint.x;
            if (maxX < RectangleUtil.sPoint.x) maxX = RectangleUtil.sPoint.x;
            if (minY > RectangleUtil.sPoint.y) minY = RectangleUtil.sPoint.y;
            if (maxY < RectangleUtil.sPoint.y) maxY = RectangleUtil.sPoint.y;
        }

        RectangleUtil.setTo(out, minX, minY, maxX - minX, maxY - minY);
        return out;
    }

    /** Returns a vector containing the positions of the four edges of the given rectangle. */
    public static getPositions(rectangle: Rectangle, out: Point[] | null = null): Point[] {
        if (out == null) out = [];

        for (let i = 0; i < 4; ++i) {
            if (out[i] == null) out[i] = new Point();
        }

        out[0].x = rectangle.left;
        out[0].y = rectangle.top;
        out[1].x = rectangle.right;
        out[1].y = rectangle.top;
        out[2].x = rectangle.left;
        out[2].y = rectangle.bottom;
        out[3].x = rectangle.right;
        out[3].y = rectangle.bottom;
        return out;
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

    private static readonly sPoint: Point = new Point();
    private static readonly sPositions: Point[] = [new Point(), new Point(), new Point(), new Point()];
}

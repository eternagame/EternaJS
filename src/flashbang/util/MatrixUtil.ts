// =================================================================================================
//
//  Starling Framework
//  Copyright Gamua GmbH. All Rights Reserved.
//
//  This program is free software. You can redistribute and/or modify it
//  in accordance with the terms of the accompanying license agreement.
//
// =================================================================================================

import {Matrix, Point} from 'pixi.js';

/** A utility class containing methods related to the Matrix class. */
export default class MatrixUtil {
    public static equals(a: Matrix, b: Matrix): boolean {
        return a.a === b.a && a.b === b.b && a.c === b.c && a.d === b.d && a.tx === b.tx && a.ty === b.ty;
    }

    /** Determines if the matrix is an identity matrix. */
    public static isIdentity(matrix: Matrix): boolean {
        return matrix.a === 1.0 && matrix.b === 0.0 && matrix.c === 0.0 && matrix.d === 1.0
            && matrix.tx === 0.0 && matrix.ty === 0.0;
    }

    /** Transform a point with the given matrix. */
    public static transformPoint(matrix: Matrix, point: Point, out: Point | null = null): Point {
        return MatrixUtil.transformCoords(matrix, point.x, point.y, out);
    }

    /** Uses a matrix to transform 2D coordinates into a different space. If you pass an
     *  <code>out</code>-point, the result will be stored in this point instead of creating
     *  a new object. */
    public static transformCoords(matrix: Matrix, x: number, y: number, out: Point | null = null): Point {
        if (out == null) out = new Point();

        out.x = matrix.a * x + matrix.c * y + matrix.tx;
        out.y = matrix.d * y + matrix.b * x + matrix.ty;

        return out;
    }

    /** Appends a skew transformation to a matrix (angles in radians). The skew matrix
     *  has the following form:
     *  <pre>
     *  | cos(skewY)  -sin(skewX)  0 |
     *  | sin(skewY)   cos(skewX)  0 |
     *  |     0            0       1 |
     *  </pre>
     */
    public static skew(matrix: Matrix, skewX: number, skewY: number): void {
        let sinX: number = Math.sin(skewX);
        let cosX: number = Math.cos(skewX);
        let sinY: number = Math.sin(skewY);
        let cosY: number = Math.cos(skewY);

        matrix.set(matrix.a * cosY - matrix.b * sinX,
            matrix.a * sinY + matrix.b * cosX,
            matrix.c * cosY - matrix.d * sinX,
            matrix.c * sinY + matrix.d * cosX,
            matrix.tx * cosY - matrix.ty * sinX,
            matrix.tx * sinY + matrix.ty * cosX);
    }

    /** Prepends a matrix to 'base' by multiplying it with another matrix. */
    public static prependMatrix(base: Matrix, prep: Matrix): void {
        base.set(base.a * prep.a + base.c * prep.b,
            base.b * prep.a + base.d * prep.b,
            base.a * prep.c + base.c * prep.d,
            base.b * prep.c + base.d * prep.d,
            base.tx + base.a * prep.tx + base.c * prep.ty,
            base.ty + base.b * prep.tx + base.d * prep.ty);
    }

    /** Prepends an incremental translation to a Matrix object. */
    public static prependTranslation(matrix: Matrix, tx: number, ty: number): void {
        matrix.tx += matrix.a * tx + matrix.c * ty;
        matrix.ty += matrix.b * tx + matrix.d * ty;
    }

    /** Prepends an incremental scale change to a Matrix object. */
    public static prependScale(matrix: Matrix, sx: number, sy: number): void {
        matrix.set(matrix.a * sx, matrix.b * sx,
            matrix.c * sy, matrix.d * sy,
            matrix.tx, matrix.ty);
    }

    /** Prepends an incremental rotation to a Matrix object (angle in radians). */
    public static prependRotation(matrix: Matrix, angle: number): void {
        let sin: number = Math.sin(angle);
        let cos: number = Math.cos(angle);

        matrix.set(matrix.a * cos + matrix.c * sin, matrix.b * cos + matrix.d * sin,
            matrix.c * cos - matrix.a * sin, matrix.d * cos - matrix.b * sin,
            matrix.tx, matrix.ty);
    }

    /** Prepends a skew transformation to a Matrix object (angles in radians). The skew matrix
     *  has the following form:
     *  <pre>
     *  | cos(skewY)  -sin(skewX)  0 |
     *  | sin(skewY)   cos(skewX)  0 |
     *  |     0            0       1 |
     *  </pre>
     */
    public static prependSkew(matrix: Matrix, skewX: number, skewY: number): void {
        let sinX: number = Math.sin(skewX);
        let cosX: number = Math.cos(skewX);
        let sinY: number = Math.sin(skewY);
        let cosY: number = Math.cos(skewY);

        matrix.set(matrix.a * cosY + matrix.c * sinY,
            matrix.b * cosY + matrix.d * sinY,
            matrix.c * cosX - matrix.a * sinX,
            matrix.d * cosX - matrix.b * sinX,
            matrix.tx, matrix.ty);
    }

    /** Converts a Matrix instance to a String, which is useful when debugging. */
    public static toString(matrix: Matrix, precision = 3): string {
        MatrixUtil.sRawData2[0] = matrix.a;
        MatrixUtil.sRawData2[1] = matrix.c;
        MatrixUtil.sRawData2[2] = matrix.tx;
        MatrixUtil.sRawData2[3] = matrix.b;
        MatrixUtil.sRawData2[4] = matrix.d;
        MatrixUtil.sRawData2[5] = matrix.ty;

        return `[Matrix rawData=\n${MatrixUtil.formatRawData(MatrixUtil.sRawData2, 3, 2, precision)}\n]`;
    }

    private static formatRawData(data: number[], numCols: number, numRows: number,
        precision: number, indent = '  '): string {
        let result: string = indent;
        let numValues: number = numCols * numRows;
        let highestValue = 0.0;
        let valueString: string;
        let value: number;

        for (let i = 0; i < numValues; ++i) {
            value = Math.abs(data[i]);
            if (value > highestValue) highestValue = value;
        }

        let numChars: number = highestValue.toFixed(precision).length + 1;

        for (let y = 0; y < numRows; ++y) {
            for (let x = 0; x < numCols; ++x) {
                value = data[numCols * y + x];
                valueString = value.toFixed(precision);

                while (valueString.length < numChars) valueString = ` ${valueString}`;

                result += valueString;
                if (x !== numCols - 1) result += ', ';
            }

            if (y !== numRows - 1) result += `\n${indent}`;
        }

        return result;
    }

    /** Updates the given matrix so that it points exactly to pixel boundaries. This works
     *  only if the object is unscaled and rotated by a multiple of 90 degrees.
     *
     *  @param matrix    The matrix to manipulate in place (normally the modelview matrix).
     *  @param pixelSize The size (in points) that represents one pixel in the back buffer.
     */
    public static snapToPixels(matrix: Matrix, pixelSize: number): void {
        // Snapping only makes sense if the object is unscaled and rotated only by
        // multiples of 90 degrees. If that's the case can be found out by looking
        // at the modelview matrix.

        const E = 0.0001;

        let doSnap = false;
        let aSq: number;
        let bSq: number;
        let cSq: number;
        let dSq: number;

        if (matrix.b + E > 0 && matrix.b - E < 0 && matrix.c + E > 0 && matrix.c - E < 0) {
            // what we actually want is 'Math.abs(matrix.a)', but squaring
            // the value works just as well for our needs & is faster.

            aSq = matrix.a * matrix.a;
            dSq = matrix.d * matrix.d;
            doSnap = aSq + E > 1 && aSq - E < 1 && dSq + E > 1 && dSq - E < 1;
        } else if (matrix.a + E > 0 && matrix.a - E < 0 && matrix.d + E > 0 && matrix.d - E < 0) {
            bSq = matrix.b * matrix.b;
            cSq = matrix.c * matrix.c;
            doSnap = bSq + E > 1 && bSq - E < 1 && cSq + E > 1 && cSq - E < 1;
        }

        if (doSnap) {
            matrix.tx = Math.round(matrix.tx / pixelSize) * pixelSize;
            matrix.ty = Math.round(matrix.ty / pixelSize) * pixelSize;
        }
    }

    private static readonly sRawData2: number[] = [];
}

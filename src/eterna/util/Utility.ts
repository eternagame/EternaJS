import {Point} from 'pixi.js';

export default class Utility {
    public static roundTo(num: number, floating: number): number {
        let div: number = 10 ** floating;
        let temp: number = num * div;
        return Number(temp) / div;
    }

    public static stripHtmlTags(str: string): string {
        let newlinereg = /</g;
        str = str.replace(newlinereg, '&lt;');
        newlinereg = />/g;
        str = str.replace(newlinereg, '&gt;');
        return str;
    }

    public static stripQuotationsAndNewlines(str: string): string {
        let newlinereg = /\n/g;
        str = str.replace(newlinereg, ' ');
        newlinereg = /"/g;
        str = str.replace(newlinereg, "'");
        return str;
    }

    public static generateParameterString(obj: any): string {
        if (obj == null) {
            return '';
        }

        return Object.entries(obj).map(([key, val]) => `${key}=${val}`).join('&');
    }

    public static isPointWithin(p: Point, polygon: Point[], stretchLength: number = 10000): boolean {
        let hitCount = 0;

        let pTo: Point = new Point(p.x + stretchLength, p.y + stretchLength);

        for (let ii = 0; ii < polygon.length; ii++) {
            let a: Point = polygon[ii];
            let b: Point = polygon[(ii + 1) % polygon.length];

            if (Utility.findIntersection(a, b, p, pTo) != null) {
                hitCount++;
            }
        }

        return (hitCount % 2) === 1;
    }

    public static findIntersection(A: Point, B: Point, E: Point, F: Point, asSeg: boolean = true): Point {
        let ip: Point;
        let a1: number;
        let a2: number;
        let b1: number;
        let b2: number;
        let c1: number;
        let c2: number;

        a1 = B.y - A.y;
        b1 = A.x - B.x;
        c1 = B.x * A.y - A.x * B.y;
        a2 = F.y - E.y;
        b2 = E.x - F.x;
        c2 = F.x * E.y - E.x * F.y;

        let denom: number = a1 * b2 - a2 * b1;
        if (denom === 0) {
            return null;
        }

        ip = new Point();
        ip.x = (b1 * c2 - b2 * c1) / denom;
        ip.y = (a2 * c1 - a1 * c2) / denom;

        //---------------------------------------------------
        // Do checks to see if intersection to endpoints
        // distance is longer than actual Segments.
        // Return null if it is with any.
        //---------------------------------------------------

        if (asSeg) {
            if (((ip.x - B.x) ** 2) + ((ip.y - B.y) ** 2) > ((A.x - B.x) ** 2) + ((A.y - B.y) ** 2)) {
                return null;
            }

            if (((ip.x - A.x) ** 2) + ((ip.y - A.y) ** 2) > ((A.x - B.x) ** 2) + ((A.y - B.y) ** 2)) {
                return null;
            }

            if (((ip.x - F.x) ** 2) + ((ip.y - F.y) ** 2) > ((E.x - F.x) ** 2) + ((E.y - F.y) ** 2)) {
                return null;
            }

            if (((ip.x - E.x) ** 2) + ((ip.y - E.y) ** 2) > ((E.x - F.x) ** 2) + ((E.y - F.y) ** 2)) {
                return null;
            }
        }
        return ip;
    }

    public static range(start: number, stop: number): number[];
    public static range(length: number): number[];

    public static range(a: number, b?: number): number[] {
        let start = b ? a : 0;
        let stop = b || a;

        return new Array(stop - start).fill(0).map((_, i) => i + start);
    }

    /**
     * Similar to `string.split(' ')`, but acts differently with multiple consecutive spaces
     * E.g., two spaces results in the second space being placed in the following entry,
     * three results in one entry of a single space, four both, five two single space entried, etc
     *
     * @param csl string to split
     */
    public static splitOnWhitespace(csl: string): string[] {
        let vals: string[] = [];
        let lastComma = -1;
        let ii: number;

        for (ii = 0; ii < csl.length; ii++) {
            if (csl.charAt(ii) === ' ') {
                if (lastComma < ii - 1) {
                    vals.push(csl.substr(lastComma + 1, ii - (lastComma + 1)));
                    lastComma = ii;
                }
            }
        }

        if (lastComma < ii - 1) {
            vals.push(csl.substr(lastComma + 1, ii - (lastComma + 1)));
        }

        return vals;
    }
}

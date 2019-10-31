import {Point} from 'pixi.js';

export default class Utility {

    /**
     * Rounds a number to a certain number of digits.
     *
     * @remarks
     * Currently tested only for pretty trivial cases.
     *
     * @param num - The number to be rounded
     * @param floating - The decimal place to which to round (i.e., 1 == 'tens'; 2 == 'hundreds')
     * @returns The number, rounded-off as directed
     *
     */
    public static roundTo(num: number, floating: number): number {
        let div: number = 10 ** floating;
        let temp: number = num * div;
        return Number(temp) / div;
    }

    /**
     * Safely remove HTML tags from an input by replacing <> with escapes.
     *
     * @param str - The string to be escaped
     * @returns The string, with each <> replaced by regex.
     *
     */
    public static stripHtmlTags(str: string): string {
        let newlinereg = /</g;
        str = str.replace(newlinereg, '&lt;');
        newlinereg = />/g;
        str = str.replace(newlinereg, '&gt;');
        return str;
    }

   /**
     * Map double quotes to single quotes and newlines to spaces.
     *
     * @param str - The string to be modified
     * @returns The string, with each " replaced by ' and "\n" by " ".
     *
     */
    public static stripQuotationsAndNewlines(str: string): string {
        let newlinereg = /\n/g;
        str = str.replace(newlinereg, ' ');
        newlinereg = /"/g;
        str = str.replace(newlinereg, "'");
        return str;
    }

    /**
     * Turn any non-null object into a stringified key-value repr.
     *
     * @param obj - The object to be representated
     * @returns A string of key=val, joined by "&"
     *
     */
    public static generateParameterString(obj: any): string {
        if (obj == null) {
            return '';
        }

        return Object.entries(obj).map(([key, val]) => `${key}=${val}`).join('&');
    }

    /**
     * Determines if a point is within a polygon given as a point vector, using
     * a consequence of the Jordan curve theorem.
     *
     * @param p - The single point
     * @param polygon - A polygon defined as a point array.
     * @param stretchLength - The length of the line segment for testing; thus,
     * this method fails for very big polygons.
     * @returns true if the point is in the polygon; false otherwise.
     *
     */
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

    /**
     * Determines the intersection of two lines or line segments AB and EF.
     * 
     * @param A - The first point of the first line or segment
     * @param B - The second point of the first line or segment
     * @param E - The first point of the second line or segment
     * @param F - The second point of the second line or segment
     * @param asSeg - Treat the two specified objects as line segments, not as
     * lines, so that intersections further away from the endpoints than the 
     * length of the segments themselves are returned as null.
     * @returns true if the point is in the polygon; false otherwise.
     *
     */
    public static findIntersection(A: Point, B: Point, E: Point, F: Point, asSeg: boolean = true): Point | null {
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
     * @param csl string to split by whitespace
     * 
     * @returns string array
     * 
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

    /**
     * Convert '-1-4,7-8,12 16' to [-1,0,1,2,3,4,7,8,12,16]
     * 
     * @param sInput string representing the numerical range
     * 
     * @returns array of numbers represented
     * 
     */
    public static rangeStringToArray(sInput: string): number[] {
        let vals: number[] = [];
        for (const s of sInput.split(',')) {
            let foundDash = s.indexOf('-', 1); // look for a dash (ignoring an initial minus sign)
            if (foundDash < 0) {
                const val = Number(s);
                if (Number.isNaN(val)) {
                    return null; // signal error
                } else {
                    vals.push(val);
                }
            } else {
                let startVal = Number(s.slice(0, foundDash));
                let endVal = Number(s.slice(foundDash + 1, s.length));
                if (Number.isNaN(startVal)) return null;
                if (Number.isNaN(endVal)) return null;
                for (let n = startVal; n <= endVal; n++) vals.push(n);
            }
        }
        return vals;
    }

    /** allows for specification of sequences and their indices
     *   during a paste. Example:
     *
     *    ACUGU 11-14 16
     *
     * will return [11,12,13,14,16]
     *
     * If no numbers are specified, e.g.,
     *
     *    ACUGU
     *
     * will return the default range from 1 to len(seq), here 1,2,3,4,5.
     *
     * Note that indices will be 1-indexed, not 0-indexed.
     * 
     * @param seq sequence-specification string, with a first item that is
     * n legal sequence characters and a second item that "codes for" the
     * same number of 1-indexed residue indices.
     * 
     * @returns the index array.
     */
    public static getIndices(seq: string): number[] {
        let indices: number[] = [];
        let splitted: string[] = seq.split(' ');
        for (const s of splitted) {
            let ints: number[] = this.rangeStringToArray(s);
            if (ints === null) {
                return null; // signal failure
            }
            indices = indices.concat(ints);
        }
        return indices;
    }
}

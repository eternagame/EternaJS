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

    /**
     * Convert '-1-4,7-8,12 16' to [-1,0,1,2,3,4,7,8,12,16]
     *
     * Can handle blanks,'null', and 'NaN' as null. E.g.,
     *
     *  '-1,null,,,1-2' to [-1,null,null,null1,2]
     *
     * If error is encountered, returns null (not an array of numbers!)
     *
     * @param rangeString string like '-1-4,7-8,12 16'
     * @returns array of integers like [-1,0,1,2,3,4,7,8,12,16]
     */
    public static rangeStringToArray(rangeString: string): number[] {
        let vals: number[] = [];
        const nullStrings = ['', 'null', 'NaN', 'NULL', 'NAN'];
        for (const str of rangeString.split(',')) {
            let foundDash = str.indexOf('-', 1); // look for a dash (ignoring an initial minus sign)
            if (foundDash < 0) {
                if (nullStrings.indexOf(str) > -1) {
                    vals.push(null);
                } else {
                    const val = parseInt(str, 10);
                    if (Number.isNaN(val)) {
                        return null; // signal error
                    } else {
                        vals.push(val);
                    }
                }
            } else {
                let startVal = parseInt(str.slice(0, foundDash), 10);
                let endVal = parseInt(str.slice(foundDash + 1, str.length), 10);
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
     *    '11-14,12 16'
     *
     * will return [11,12,13,14,12,16]
     *
     * @param strInput input string like '11-14,12 16'
     * @returns array of integers (indices) like [11,12,13,14,12,16]
     */
    public static getIndices(strInput: string): number[] {
        let indices: number[] = [];
        let splitted: string[] = strInput.split(' ');
        for (const str of splitted) {
            let ints: number[] = this.rangeStringToArray(str);
            if (ints === null) {
                return null; // signal failure
            }
            indices = indices.concat(ints);
        }
        return indices;
    }

    /**
     * Creates string from start and end of a range, e.g.
     *
     *    4,6 becomes '4-6'
     *    null,null becomes ''
     *
     * @param rangeStart integer starting range (e.g., 4, or null)
     * @param rangeEnd integer ending range (e.g., 6, or null)
     * @returns string like '4-6' or ''
     */
    public static rangeStringFromStartEnd(rangeStart: number, rangeEnd: number): string {
        if (rangeStart == null) return '';
        if (rangeStart === rangeEnd) return rangeStart.toString();
        return `${rangeStart.toString()}-${rangeEnd.toString()}`;
    }

    /**
     * Converts arrays to range strings. Examples:
     *
     *      [1,2,3,4]  becomes '1-4'
     *      [-1,null,1,2,3,4,-1,52,53,54,,] becomes '-1,,1-4,-1,52-54,'
     *
     * @param numberArray array of numbers (integers or null) to convert into compact string
     * @returns rangeString, like '1-4'
     */
    public static arrayToRangeString(numberArray: number[]): string {
        let rangeString = '';
        if (numberArray == null || numberArray.length === 0) return rangeString;
        let rangeStart = numberArray[0];
        let rangeEnd = numberArray[0];
        for (let ii = 1; ii < numberArray.length; ii++) {
            if (numberArray[ii] === (numberArray[ii - 1] + 1) && (rangeStart !== null)) {
                rangeEnd = numberArray[ii]; continue;
            } else {
                rangeString += `${this.rangeStringFromStartEnd(rangeStart, rangeEnd)},`;
                rangeStart = numberArray[ii];
                rangeEnd = numberArray[ii];
            }
        }
        rangeString += this.rangeStringFromStartEnd(rangeStart, rangeEnd);
        return rangeString;
    }

    /** during JSON readin of, e.g. custom-numbering, convert even concise format
     *    strings ('1-12,52-53') to Array of numbers.
     * @param numberingJSON JSON string like '1-12' or array like [1,2,...,12]
     * @returns array of numbers
    */
    public static numberingJSONToArray(numberingJSON: any): number[] {
        if (numberingJSON == null) return null;
        if (typeof numberingJSON === 'string') {
            return this.getIndices(numberingJSON);
        } else if (typeof numberingJSON === 'object') {
            return numberingJSON;
        }
        return numberingJSON;
    }
}

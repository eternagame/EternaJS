import Utility from "../Utility";
//import "./jest-matcher-deep-close-to";


test(`test_roundTo`, () => {
    // Basic tests for rounding. There are obviously more exponents to test
    // and more conditions (e.g., rounding up; correct behavior of 5s) but
    // this is a start.
    expect(Utility.roundTo(52, 1)).toBe(50);
    expect(Utility.roundTo(520, 2)).toBe(500);
    expect(Utility.roundTo(520, 1)).toBe(520);

    expect(Utility.roundTo(52.1, 1)).toBe(50);
    expect(Utility.roundTo(521, 2)).toBe(500);
    expect(Utility.roundTo(521, 1)).toBe(520);
    expect(Utility.roundTo(521, 0)).toBe(521);
    expect(Utility.roundTo(52.1, 1)).toBe(52);
});


test(`test_stripHtmlTags`, () => {
    // Basic tests for stripping <>. Ensure it can do both or one at a time
    // or doubles.
    expect(Utility.stripHtmlTags("<foo>").toBe("&lt;foo&gt;");
    expect(Utility.stripHtmlTags("<foo").toBe("&lt;foo");
    expect(Utility.stripHtmlTags("foo>").toBe("foo&gt;");
    expect(Utility.stripHtmlTags("<<foo>>").toBe("&lt;&lt;foo&gt;&gt;");
});

test(`test_stripQuotationsAndNewlines`, () => {
    // Basic tests for stripping <>. Ensure it can do both or one at a time
    // or doubles.
    expect(Utility.stripQuotationsAndNewlines("\"\n\"").toBe("\' \'");
});
/*
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
*/

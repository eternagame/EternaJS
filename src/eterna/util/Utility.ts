import {Point} from "pixi.js";

export class Utility {
    public static roundTo(num: number, floating: number): number {
        let div: number = Math.pow(10, floating);
        let temp: number = num * div;
        return Number(temp) / div;
    }

    public static stripHtmlTags(str: string): string {
        let newlinereg = /</g;
        str = str.replace(newlinereg, "&lt;");
        newlinereg = />/g;
        str = str.replace(newlinereg, "&gt;");
        return str;
    }

    public static stripQuotationsAndNewlines(str: string): string {
        let newlinereg = /\n/g;
        str = str.replace(newlinereg, " ");
        newlinereg = /"/g;
        str = str.replace(newlinereg, "'");
        return str;
    }

    public static generateParameterString(obj: any): string {
        if (obj == null) {
            return "";
        }

        let res = "";
        let first = true;
        let key: string;
        for (key in obj) {
            if (first) {
                first = false;
            } else {
                res += "&";
            }

            res += `${key}=${(obj as any)[key]}`;
        }

        return res;
    }

    public static isPointWithin(p: Point, polygon: Point[], stretch_length: number = 10000): boolean {
        let hit_count = 0;

        let p_to: Point = new Point(p.x + stretch_length, p.y + stretch_length);

        for (let ii = 0; ii < polygon.length; ii++) {
            let a: Point = polygon[ii];
            let b: Point = polygon[(ii + 1) % polygon.length];

            if (Utility.findIntersection(a, b, p, p_to) != null) {
                hit_count++;
            }
        }

        return (hit_count % 2) === 1;
    }

    public static findIntersection(A: Point, B: Point, E: Point, F: Point, as_seg: boolean = true): Point {
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

        if (as_seg) {
            if (Math.pow(ip.x - B.x, 2) + Math.pow(ip.y - B.y, 2) > Math.pow(A.x - B.x, 2) + Math.pow(A.y - B.y, 2)) {
                return null;
            }

            if (Math.pow(ip.x - A.x, 2) + Math.pow(ip.y - A.y, 2) > Math.pow(A.x - B.x, 2) + Math.pow(A.y - B.y, 2)) {
                return null;
            }

            if (Math.pow(ip.x - F.x, 2) + Math.pow(ip.y - F.y, 2) > Math.pow(E.x - F.x, 2) + Math.pow(E.y - F.y, 2)) {
                return null;
            }

            if (Math.pow(ip.x - E.x, 2) + Math.pow(ip.y - E.y, 2) > Math.pow(E.x - F.x, 2) + Math.pow(E.y - F.y, 2)) {
                return null;
            }
        }
        return ip;
    }
}

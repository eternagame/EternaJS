import Utility from "../Utility";
import { Point } from "pixi.js";
//import "./jest-matcher-deep-close-to";


test(`test_roundTo`, () => {
    // Basic tests for rounding. There are obviously more exponents to test
    // and more conditions (e.g., rounding up; correct behavior of 5s) but
    // this is a start.
    expect(Utility.roundTo(52.1, 1)).toBe("52.1");
    expect(Utility.roundTo(52.11, 1)).toBe("52.1");
    expect(Utility.roundTo(52.11, 2)).toBe("52.11");
    expect(Utility.roundTo(52.19, 1)).toBe("52.2");
    expect(Utility.roundTo(52.19, 3)).toBe("52.190");
});


test(`test_stripHtmlTags`, () => {
    // Basic tests for stripping <>. Ensure it can do both or one at a time
    // or doubles.
    expect(Utility.stripHtmlTags("<foo>")).toBe("&lt;foo&gt;");
    expect(Utility.stripHtmlTags("<foo")).toBe("&lt;foo");
    expect(Utility.stripHtmlTags("foo>")).toBe("foo&gt;");
    expect(Utility.stripHtmlTags("<<foo>>")).toBe("&lt;&lt;foo&gt;&gt;");
});

test(`test_stripQuotationsAndNewlines`, () => {
    expect(Utility.stripQuotationsAndNewlines("\"\n\"")).toBe("\' \'");
});

test(`test_generateParameterString`, () => {
    let person_record = {first: 'Taylor', last:'Doe'};
    expect(Utility.generateParameterString(null)).toBe("");
    expect(Utility.generateParameterString(person_record)).toBe("first=Taylor&last=Doe");
});

test(`test_isPointWithin`, () => {
    let poly: Point[] = [new Point(0,0), new Point(1,0), new Point(1,1), new Point(0,1)];
    let p1: Point = new Point(0.6, 0.5);
    let pBAD: Point = new Point(0.5, 0.5);
    let p2: Point = new Point(1.2, 0.5);
    let p3: Point = new Point(0.5, 1.2);
    let p4: Point = new Point(1.2, 1.2);

    expect(Utility.isPointWithin(p1, poly)).toBe(true);
    expect(Utility.isPointWithin(p2, poly)).toBe(false);
    expect(Utility.isPointWithin(p3, poly)).toBe(false);
    expect(Utility.isPointWithin(p4, poly)).toBe(false);

    // AMW: this is a problem! It seems that if you are RIGHT in the middle, you might
    // manage to miss any intersections with the sides because the line goes RIGHT
    // through the corners. This is... this is bad?
    expect(Utility.isPointWithin(pBAD, poly)).toBe(false);
});


test(`test_findIntersection`, () => {
    let A: Point = new Point(0,0);
    let B: Point = new Point(1,0);
    let E: Point = new Point(1,1);
    let F: Point = new Point(0,1);

    // AMW: no careful testing yet of whether asSeg false is distinct from true.
    // Consider comparing intersection behavior of (0,0) => (0.5, 0.5) and (1,0) => (1,1)
    expect(Utility.findIntersection(A, B, E, F)).toBe(null);
    expect(Utility.findIntersection(A, E, B, F)).toStrictEqual(new Point(0.5, 0.5));
});

test(`test_range`, () => {
    expect(Utility.range(3)).toStrictEqual([0,1,2]);
    expect(Utility.range(3, 4)).toStrictEqual([3]);
    expect(Utility.range(3, 5)).toStrictEqual([3, 4]);
    expect(Utility.range(0)).toStrictEqual([]);
});

test(`test_splitOnWhitespace`, () => {
    expect(Utility.splitOnWhitespace("a b")).toStrictEqual(["a", "b"]);
    expect(Utility.splitOnWhitespace("a\tb")).toStrictEqual(["a\tb"]);
    expect(Utility.splitOnWhitespace("a  b")).toStrictEqual(["a", " b"]);
});

test(`test_rangeStringToArray`, () => {
    expect(Utility.rangeStringToArray("1-3,4,5,8-9")).toStrictEqual([1, 2, 3, 4, 5, 8, 9]);
});

test(`test_getIndices`, () => {
    // this function should require that the string length equals the number-vector length
    expect(Utility.getIndices("1-3,4,5,8-9")).toStrictEqual([1, 2, 3, 4, 5, 8, 9]);
    expect(Utility.getIndices("1-3,4,5 8-9")).toStrictEqual([1, 2, 3, 4, 5, 8, 9]);
});

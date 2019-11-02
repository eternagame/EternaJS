import int from "../int";

test(`test_int`, () => {

    expect(int("5.5")).toBe(5);
    expect(int(5.5)).toBe(5);
    expect(int("-5.5")).toBe(-6);
    expect(int(-5.5)).toBe(-6);
});
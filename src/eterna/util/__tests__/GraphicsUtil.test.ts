import GraphicsUtil from "../GraphicsUtil";
import { Graphics } from "pixi.js";

test(`test_drawArrow`, () => {

    // _fillStyle now private, can't access alpha anymore.
    const g: Graphics = GraphicsUtil.drawArrow(1, 1, 1, 1, null);
    expect(g).toBeDefined();
    expect(g.position).toBeDefined();
    expect(g.width).toBeDefined();
    expect(g.x).toBeDefined();
    expect(g.y).toBeDefined();
});

test(`test_drawLeftTriangle`, () => {

    const g: Graphics = GraphicsUtil.drawLeftTriangle(1);
    expect(g).toBeDefined();
    expect(g.position).toBeDefined();
    expect(g.width).toBeDefined();
    expect(g.x).toBeDefined();
    expect(g.y).toBeDefined();
});

test(`test_drawRightTriangle`, () => {

    const g: Graphics = GraphicsUtil.drawRightTriangle(1);
    expect(g).toBeDefined();
    expect(g.position).toBeDefined();
    expect(g.width).toBeDefined();
    expect(g.x).toBeDefined();
    expect(g.y).toBeDefined();
});
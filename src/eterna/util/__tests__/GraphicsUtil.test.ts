import GraphicsUtil from "../GraphicsUtil";
import { Graphics } from "pixi.js";

test(`test_drawArrow`, () => {

    let g: Graphics = GraphicsUtil.drawArrow(1, 1, 1, 1, null);
    expect(g).toBeDefined();
    expect(g.fillAlpha).toBeDefined();
    expect(g.position).toBeDefined();
    expect(g.width).toBeDefined();
    expect(g.x).toBeDefined();
    expect(g.y).toBeDefined();
});

test(`test_drawLeftTriangle`, () => {

    let g: Graphics = GraphicsUtil.drawLeftTriangle(1);
    expect(g).toBeDefined();
    expect(g.fillAlpha).toBeDefined();
    expect(g.position).toBeDefined();
    expect(g.width).toBeDefined();
    expect(g.x).toBeDefined();
    expect(g.y).toBeDefined();
});

test(`test_drawRightTriangle`, () => {

    let g: Graphics = GraphicsUtil.drawRightTriangle(1);
    expect(g).toBeDefined();
    expect(g.fillAlpha).toBeDefined();
    expect(g.position).toBeDefined();
    expect(g.width).toBeDefined();
    expect(g.x).toBeDefined();
    expect(g.y).toBeDefined();
});
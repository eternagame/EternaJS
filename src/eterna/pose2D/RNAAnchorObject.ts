import {Point} from "pixi.js"
import {SceneObject} from "../../flashbang/objects/SceneObject";

export class RNAAnchorObject {
    public object: SceneObject;
    public base: number;
    public offset: Point;

    public constructor(object: SceneObject, base: number, offset: Point) {
        this.object = object;
        this.base = base;
        this.offset = offset;
    }
}

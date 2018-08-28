import {Point} from "pixi.js"
import {GameObjectRef} from "../../flashbang/core/GameObjectRef";
import {SceneObject} from "../../flashbang/objects/SceneObject";

export class RNAAnchorObject {
    public ref: GameObjectRef;
    public base: number;
    public offset: Point;

    public get object(): SceneObject {
        return this.ref.object;
    }

    public get isLive(): boolean {
        return this.ref.isLive;
    }

    public constructor(object: SceneObject, base: number, offset: Point) {
        this.ref = object.ref;
        this.base = base;
        this.offset = offset;
    }
}

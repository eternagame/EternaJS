import {Point} from 'pixi.js';
import {GameObjectRef, SceneObject} from 'flashbang';

export default class RNAAnchorObject {
    public ref: GameObjectRef;
    public base: number;
    public offset: Point;

    public get object(): SceneObject {
        return this.ref.object as SceneObject;
    }

    public get isLive(): boolean {
        return this.ref.isLive;
    }

    constructor(object: SceneObject, base: number, offset: Point) {
        this.ref = object.ref;
        this.base = base;
        this.offset = offset;
    }
}

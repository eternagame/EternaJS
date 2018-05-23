import {GameObject} from "../core/GameObject";
import {DisplayObject, Sprite} from "pixi.js";

/** A GameObject that manages a Sprite */
export class SpriteObject extends GameObject {
    public readonly sprite: Sprite;

    public constructor(sprite?: Sprite) {
        super();
        this.sprite = sprite || new Sprite();
    }

    public get display(): DisplayObject {
        return this.sprite;
    }
}

import {GameObject} from "../core/GameObject";
import {DisplayObject, Sprite} from "pixi.js";

/** A GameObject that manages a Sprite */
export class SpriteObject extends GameObject {
    public constructor (sprite: Sprite) {
        super();
        this._sprite = sprite;
    }

    public get display (): DisplayObject {
        return this._sprite;
    }

    protected _sprite: Sprite;
}

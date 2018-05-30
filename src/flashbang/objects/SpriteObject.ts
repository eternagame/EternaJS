import {Sprite} from "pixi.js";
import {SceneObject} from "./SceneObject";

/** A GameObject that manages a Sprite */
export class SpriteObject extends SceneObject {
    public readonly sprite: Sprite;

    public constructor(sprite?: Sprite) {
        let ourSprite = sprite || new Sprite();
        super(ourSprite);
        this.sprite = ourSprite;
    }
}

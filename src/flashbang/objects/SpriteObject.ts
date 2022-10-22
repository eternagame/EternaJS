import {Sprite} from 'pixi.js';
import SceneObject from './SceneObject';

/** A GameObject that manages a PIXI Sprite */
export default class SpriteObject extends SceneObject<Sprite> {
    constructor(sprite?: Sprite) {
        class SpriteObjectSprite extends Sprite {}
        super(sprite || new SpriteObjectSprite());
        // Convenience so that the flashbang class name shows in the Pixi devtools
        Object.defineProperty(SpriteObjectSprite, 'name', {value: this.constructor.name});
    }
}

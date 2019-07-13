import {Sprite} from 'pixi.js';
import SceneObject from './SceneObject';

/** A GameObject that manages a PIXI Sprite */
export default class SpriteObject extends SceneObject<Sprite> {
    constructor(sprite?: Sprite) {
        super(sprite || new Sprite());
    }
}

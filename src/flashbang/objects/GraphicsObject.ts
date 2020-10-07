import {Graphics} from 'pixi.js';
import SceneObject from './SceneObject';

/** A GameObject that manages a PIXI Graphics */
export default class GraphicsObject extends SceneObject<Graphics> {
    constructor(sprite?: Graphics) {
        super(sprite || new Graphics());
    }
}

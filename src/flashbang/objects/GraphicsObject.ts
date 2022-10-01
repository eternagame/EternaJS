import {Graphics} from 'pixi.js';
import SceneObject from './SceneObject';

/** A GameObject that manages a PIXI Graphics */
export default class GraphicsObject extends SceneObject<Graphics> {
    constructor(sprite?: Graphics) {
        class GraphicsObjectGraphics extends Graphics {}
        super(sprite || new GraphicsObjectGraphics());
        // Convenience so that the flashbang class name shows in the Pixi devtools
        Object.defineProperty(GraphicsObjectGraphics, 'name', {value: this.constructor.name});
    }
}

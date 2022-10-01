import {Container} from 'pixi.js';
import SceneObject from './SceneObject';

/** A GameObject that manages a PIXI Container */
export default class ContainerObject extends SceneObject<Container> {
    constructor(container?: Container) {
        class ContainerObjectContainer extends Container {}
        super(container || new ContainerObjectContainer());
        // Convenience so that the flashbang class name shows in the Pixi devtools
        Object.defineProperty(ContainerObjectContainer, 'name', {value: this.constructor.name});
    }

    /** An alias for this.display */
    public get container() { return this.display; }
}

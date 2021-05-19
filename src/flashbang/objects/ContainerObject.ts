import {ParticleContainer} from 'pixi.js';
import SceneObject from './SceneObject';

/** A GameObject that manages a PIXI Container */
export default class ContainerObject extends SceneObject<ParticleContainer> {
    constructor(container?: ParticleContainer) {
        super(container || new ParticleContainer());
    }

    /** An alias for this.display */
    public get container() { return this.display; }
}

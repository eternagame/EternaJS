import {Container} from "pixi.js";
import {SceneObject} from ".";

/** A GameObject that manages a PIXI Container */
export default class ContainerObject extends SceneObject<Container> {
    public constructor(container?: Container) {
        super(container || new Container());
    }

    /** An alias for this.display */
    public get container() { return this.display; }
}

import {Container} from "pixi.js";
import {SceneObject} from "./SceneObject";

/** A GameObject that manages a Sprite */
export class ContainerObject extends SceneObject {
    public readonly container: Container;

    public constructor(container?: Container) {
        let ourContainer = container || new Container();
        super(ourContainer);
        this.container = ourContainer;
    }
}

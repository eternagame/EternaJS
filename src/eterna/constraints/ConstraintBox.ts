import { ContainerObject, Enableable } from "flashbang/objects";

export default class ConstraintBox extends ContainerObject implements Enableable {
    public get enabled(): boolean {
        return this.display.visible;
    }
}
import {ContainerObject} from "../../flashbang/objects/ContainerObject";

export abstract class BaseGamePanel extends ContainerObject {
    public abstract setSize(width: number, height: number): void;
    public abstract setPanelTitle(title: string): void;
    public abstract getTitleSpace(): number
}

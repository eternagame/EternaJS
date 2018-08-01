import {ContainerObject} from "../../flashbang/objects/ContainerObject";

export abstract class BaseGamePanel extends ContainerObject {
    public abstract set_size(width: number, height: number): void;
    public abstract set_panel_title(title: string): void;
    public abstract get_title_space(): number
}

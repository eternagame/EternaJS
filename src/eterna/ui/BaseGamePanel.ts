import {ContainerObject} from 'flashbang';

export default abstract class BaseGamePanel extends ContainerObject {
    public abstract setSize(width: number, height: number): void;
    public abstract set title(title: string);
    public abstract get titleHeight(): number;
}

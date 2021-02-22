import {ContainerObject} from "flashbang";
import GameStateBlock from "@/state/GameStateBlock";

export default abstract class BaseVisualization extends ContainerObject {
    public abstract updateState(gameState: GameStateBlock): void;
}

import { ContainerObject } from "@eternagame/flashbang";
import PuzzleStateBlock from "../../state/PuzzleStateBlock";

/** Panel which visualizes a puzzle/solution */
export default abstract class VisPanel extends ContainerObject {
    public abstract updateState(gameState: PuzzleStateBlock): void;
}
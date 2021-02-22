import PuzzleDefinition from "./PuzzleDefinition";
import Solution from "./Solution";

export default interface GameStateBlock {
    puzzle: PuzzleDefinition;
    solution: Solution;
}

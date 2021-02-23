import PuzzleDefinition from "./PuzzleDefinition";
import Solution from "./Solution";

/**
 * Immutable representation of the current state of a puzzle being solved
 * (puzzle definition + solution)
 * */
export default interface PuzzleStateBlock {
    puzzle: PuzzleDefinition;
    solution: Solution;
}

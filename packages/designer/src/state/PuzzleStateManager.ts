import {TreeNode} from "@eternagame/flashbang";

import PuzzleStateBlock from "./PuzzleStateBlock";

/**
 * Singleton class for managing the current state of the designer
 * (puzzle definition, puzzle state, undo state, etc)
 */
export default class PuzzleStateManager {
    /** Methods for mutating while ensuring consistency of the game state */
    /** Methods for moving through the history tree and getting a relevant block */

    private puzzleStateHistory: TreeNode<PuzzleStateBlock>;
}

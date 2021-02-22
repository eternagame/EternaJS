import TreeNode from "flashbang";

import GameStateBlock from "./GameStateBlock";

export default class GameStateManager {
    /** Methods for mutating while ensuring consistency of the game state */
    /** Methods for moving through the history tree and getting a relevant block */

    private gameStateHistory: TreeNode<GameStateBlock>;
}

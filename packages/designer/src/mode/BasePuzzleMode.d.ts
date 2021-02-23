import {AppMode} from "@eternagame/flashbang";

/** Mode for visualization/interaction with a puzzle */
export default abstract class BasePuzzleMode extends AppMode {
    constructor();
    
    /** Initialize state and UI */
    protected setup(): void;

    /** keyboard handlers */

    /** Write out a solution/puzzle state to JSON via the save manager */
    saveData(): void;
    
    /** export to PNG or SVG or other formats */
    createScreenshot(): ArrayBuffer;

    /** export the player's current game state (can be base64 encoded for HELP links) */
    exportState(): string;

    // toolbar
    // help bar (top right)
    // home button, arrow, puzzle title
    // constraint bar
    // PanelManager
    // [posefield by another name]
    // folderswitcher

    // => lists of things
    // => boxes of things
    // boxes can contain lists
    // lists can contain boxes
    // dockable user controlled ui panels

}

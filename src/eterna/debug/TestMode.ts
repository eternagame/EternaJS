import {ActionBox} from "../mode/DesignBrowser/ActionBox";
import {GameMode} from "../mode/GameMode";
import {Puzzle} from "../puzzle/Puzzle";
import {PuzzleManager} from "../puzzle/PuzzleManager";
import {Solution} from "../puzzle/Solution";
import {SolutionManager} from "../puzzle/SolutionManager";

export class TestMode extends GameMode {
    protected setup(): void {
        super.setup();

        let puzzleID = 7656242;
        let loadPuzzle = PuzzleManager.instance.getPuzzleByID(puzzleID);
        let loadSolutions = SolutionManager.instance.getSolutionsForPuzzle(puzzleID);
        Promise.all([loadPuzzle, loadSolutions])
            .then(([puzzle, solutions]) => {
                this.showActionBox(puzzle, solutions[0]);
            });
    }

    private showActionBox(puzzle: Puzzle, solution: Solution): void {
        let actionBox = new ActionBox(solution, puzzle, false);
        this.showDialog(actionBox);
    }

    public onContextMenuEvent(e: Event): void {
        e.preventDefault();
    }
}

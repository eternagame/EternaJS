import {GameMode} from '../mode';
import {ViewSolutionDialog} from '../mode/DesignBrowser';
import {
    Puzzle, PuzzleManager, Solution, SolutionManager
} from '../puzzle';

export default class TestMode extends GameMode {
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
        let actionBox = new ViewSolutionDialog(solution, puzzle, false);
        this.showDialog(actionBox);
    }

    public onContextMenuEvent(e: Event): void {
        e.preventDefault();
    }
}

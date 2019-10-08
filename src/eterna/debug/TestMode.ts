import GameMode from 'eterna/mode/GameMode';
import PuzzleManager from 'eterna/puzzle/PuzzleManager';
import Puzzle from 'eterna/puzzle/Puzzle';
import SolutionManager from 'eterna/puzzle/SolutionManager';
import Solution from 'eterna/puzzle/Solution';
import ViewSolutionDialog from 'eterna/mode/DesignBrowser/ViewSolutionDialog';

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

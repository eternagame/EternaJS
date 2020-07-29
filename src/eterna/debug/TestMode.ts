import GameMode from 'eterna/mode/GameMode';
import PuzzleManager from 'eterna/puzzle/PuzzleManager';
import Puzzle from 'eterna/puzzle/Puzzle';
import SolutionManager from 'eterna/puzzle/SolutionManager';
import Solution from 'eterna/puzzle/Solution';
import ViewSolutionOverlay from 'eterna/mode/DesignBrowser/ViewSolutionOverlay';

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
        const actionBox = new ViewSolutionOverlay({
            solution,
            puzzle,
            voteDisabled: false,
            onPrevious: () => {},
            onNext: () => {},
            parentMode: (() => this)()
        });
        this.addObject(actionBox, this.dialogLayer);
    }

    public onContextMenuEvent(e: Event): void {
        e.preventDefault();
    }
}

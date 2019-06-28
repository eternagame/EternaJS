import { Point } from "pixi.js";
import { Puzzle, Solution, PuzzleType } from "eterna/puzzle";
import { Bitmaps } from "eterna/resources";
import { GameButton, EternaViewOptionsMode } from "eterna/ui";
import PoseEditMode from "../PoseEditMode/PoseEditMode";
import { ToolbarType } from "eterna/ui/Toolbar";

export interface PuzzleSolverParams {
    isReset?: boolean;
    initialFolder?: string;
    rscript?: string;

    // A sequence to initialize our pose with. If initialSolution is set, this will be ignored.
    initSequence?: string;

    // A solution to initialize our pose with. If set, initSequence is ignored.
    initSolution?: Solution;
    // a list of solutions we can iterate through
    solutions?: Solution[];
}

/**
 * Mode for solving pre-defined puzzles, including both challenges and labs
 */
export default class PuzzleSolverMode extends PoseEditMode {
    public constructor(puzzle: Puzzle, params: PuzzleSolverParams, autosaveData: any[] = null) {
        super();
        
        this._puzzle = puzzle;
        /*this._params = params;*/
        this._autosaveData = autosaveData;

        if (this._params.rscript != null) {
            //puzzle.rscript = this._params.rscript;
        }
    }

    protected setup(): void {
        super.setup();

        this._toolbar.submitButton.clicked.connect(() => this.submitCurrentPose());
        this._toolbar.viewSolutionsButton.clicked.connect(() => this.loadDesignBrowser(this._puzzle));
        this._toolbar.hintButton.clicked.connect(() => this.toggleHint());
        
        this._exitButton = new GameButton().allStates(Bitmaps.ImgNextInside);
        this._exitButton.display.scale = new Point(0.3, 0.3);
        this._exitButton.display.visible = false;
        this.regs.add(this._exitButton.clicked.connect(() => this.exitPuzzle()));
        this.addObject(this._exitButton, this.uiLayer);

        /*for (let pose of this._poses) {
            pose.trackMovesCallback = (count: number, moves: any) => {
                this._moveCount += count;
                if (moves) this._moves.push(moves.slice());
            }
        }*/
    }

    // TODO
    private submitCurrentPose() {}
    private toggleHint() {}
    private exitPuzzle() {}

    protected get _toolbarType(): ToolbarType {
        return this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL ? ToolbarType.LAB : ToolbarType.PUZZLE;
    }

    protected get _viewOptionsMode(): EternaViewOptionsMode {
        return this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL ?
            EternaViewOptionsMode.LAB :
            EternaViewOptionsMode.PUZZLE;
    }
    
    private readonly _params: PuzzleSolverParams;
    private readonly _autosaveData: any[];

    private _moveCount: number = 0;
    private _moves: any[] = [];

    private _exitButton: GameButton;
}
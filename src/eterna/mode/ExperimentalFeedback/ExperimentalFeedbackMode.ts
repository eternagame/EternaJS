import PoseMode from "eterna/mode/PoseMode";
import { ToolbarType } from "eterna/ui/Toolbar";
import { EternaViewOptionsMode } from "eterna/ui";
import { Solution, Puzzle } from "eterna/puzzle";

export default class ExperimentalFeedbackMode extends PoseMode {
    public constructor(solution: Solution, puzzle: Puzzle) {
        super();
        this._solution = solution;
        this._puzzle = puzzle;
    }
    
    setup() {
        super.setup();

        this._toolbar.viewSolutionsButton.clicked.connect(() => this.loadDesignBrowser(this._puzzle));
        this._toolbar.estimateButton.clicked.connect(() => this.toggleMode());
        this._toolbar.letterColorButton.clicked.connect(() => this.toggleColorMode());
        this._toolbar.expColorButton.clicked.connect(() => this.toggleColorMode());
    }
    
    // TODO
    protected toggleMode() {}
    protected toggleColorMode() {}

    protected readonly _toolbarType = ToolbarType.FEEDBACK;
    protected readonly _viewOptionsMode = EternaViewOptionsMode.LAB;
    protected readonly _posesEditable = false;

    private _solution: Solution;
}
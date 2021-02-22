import PuzzleDefinition from "./state/PuzzleDefinition";
import Solution from "./state/Solution";

export enum InitialAppMode {
    // load a puzzle
    PUZZLE = 'puzzle',
    // load the puzzlemaker
    PUZZLEMAKER = 'puzzlemaker',
    // load a solution into FeedbackViewMode
    SOLUTION_SEE_RESULT = 'solution_see_result',
    // load a solution into PoseEditMode
    SOLUTION_COPY_AND_VIEW = 'solution_copy_and_view',
    // load a puzzle into DesignBrowserMode
    DESIGN_BROWSER = 'design_browser',
    // load the debugging test mode
    TEST = 'test',
}

interface InitialState {}

interface EternaAppParams {
    container: HTMLElement;
    onSolutionChanged?: (solution: Solution): void;
    /** If not present, no submit button will be shown */
    onSolutionSubmit?: (solution: Solution) => void;
    onConstraintsSatisfied?: (solution: Solution) => void;
    getRemoteSolutions?: () => Solution[];
}

export default class EternaApp {
    /** Create & mount Eterna app */
    constructor(private params: EternaAppParams);

    /** Bootstrap app and Flashbang */
    public run(): void;

    /** Initiaize assets, load initial mode */
    protected setup(): void;

    /** Load puzzle solver mode */
    public loadPuzzleSolver(puzzleDefinition: PuzzleDefinition, initialSolution: Solution): void;

    /** Load puzzle maker mode */
    public loadPuzzleMaker(puzzleDefinition?: PuzzleDefinition, initialSolution: Solution): void;

    /** Load design browser */
    public loadDesignBrowser(designBrowserFilters?: DesignBrowserFilter[]): void;

    /** Load design comparison mode */
    public loadDesignComparer(puzzleDefinition: PuzzleDefinition, sols: Solution[]): void;
}

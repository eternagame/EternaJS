import { FlashbangApp } from "@eternagame/flashbang";
import PuzzleDefinition from "./state/PuzzleDefinition";
import Solution from "./state/Solution";

interface EternaDesignerParams {
    container: HTMLElement;
    onSolutionChanged?: (solution: Solution) => void;
    /** If not present, no submit button will be shown */
    onSolutionSubmit?: (solution: Solution) => void;
    onConstraintsSatisfied?: (solution: Solution) => void;
    getRemoteSolutions?: () => Solution[];
}

/** Core application class/entry point for the Eterna design application */
export default class EternaDesigner extends FlashbangApp {
    private params: EternaDesignerParams;

    /** Create & mount Eterna app */
    constructor(params: EternaDesignerParams);

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

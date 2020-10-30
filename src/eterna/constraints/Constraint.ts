import UndoBlock, {TargetConditions} from 'eterna/UndoBlock';
import {HighlightType} from 'eterna/pose2D/HighlightBox';
import Puzzle from 'eterna/puzzle/Puzzle';
import {ConstraintBoxConfig} from './ConstraintBox';

export interface BaseConstraintStatus {
    satisfied: boolean;
}

export interface HighlightInfo {
    // E.g., [1,4,10,12] highlights base indexes 1, 2, 3, 4, 10, 11, and 12
    ranges: number[];
    color: HighlightType;
    // Set if only a specific state should have the highlight
    stateIndex?: number;
}

export interface ConstraintContext {
    undoBlocks: UndoBlock[];
    targetConditions?: (TargetConditions | undefined)[];
    puzzle?: Puzzle;
}

export default abstract class Constraint<ConstraintStatus extends BaseConstraintStatus> {
    public static readonly NAME: string;
    /**
     * @param undoBlocks A list of puzzle states (with sequence and derivatives)
     * that informs constraints (mostly with the first, current element)
     * @param targetConditions This is not available in the puzzle maker, so any
     * constraints that require it will not be usable within PuzzleMaker for now
     * @param puzzle This is not available in the puzzle maker, so any
     * constraints that require it will not be usable within PuzzleMaker for now
     *
     * @returns Judge whether the constraint is satisfied
     */
    public abstract evaluate(context: ConstraintContext): ConstraintStatus;

    /**
     * Consume details about a constraint and emit a description of how to show
     * it as a ConstraintBoxConfig
     *
     * @param status details on whether this BoostConstraint was satisfied
     * and some additional details besides.
     * @param forMissionScreen Is this for the mission screen or not?
     * @param undoBlocks A list of puzzle states (with sequence and derivatives)
     * that informs constraints (mostly with the first, current element)
     * @param targetConditions For puzzles with multiple states (say, with or
     * without an oligo) this defines where a Constraint applies)
     *
     * @returns an object specifying the configuration for the box, including
     * whether it's satisfied, an icon, display details, and a tooltip
     */
    public abstract getConstraintBoxConfig(
        status: ConstraintStatus,
        forMissionScreen: boolean,
        undoBlocks: UndoBlock[],
        targetConditions?: (TargetConditions | undefined)[],
    ): ConstraintBoxConfig;

    public getHighlight(
        status: ConstraintStatus,
        context: ConstraintContext
    ): HighlightInfo | null {
        return null;
    }

    public abstract serialize(): [string, string];
}

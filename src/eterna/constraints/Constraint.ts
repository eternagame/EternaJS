import UndoBlock from 'eterna/UndoBlock';
import Puzzle from 'eterna/puzzle/Puzzle';
import {HighlightType} from 'eterna/pose2D/HighlightBox';
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

export default abstract class Constraint<ConstraintStatus extends BaseConstraintStatus> {
    public static readonly NAME: string;
    /**
     * @param undoBlocks
     * @param targetConditions This is not available in the puzzle maker, so any constraints which require it will not
     * be usable within PuzzleMaker for now
     * @param puzzle This is not available in the puzzle maker, so any constraints which require it will not
     * be usable within PuzzleMaker for now
     */
    public abstract evaluate(undoBlocks: UndoBlock[], targetConditions?: any[], puzzle?: Puzzle): ConstraintStatus;

    public abstract getConstraintBoxConfig(
        status: ConstraintStatus,
        forMissionScreen: boolean,
        undoBlocks: UndoBlock[],
        targetConditions?: any[],
    ): ConstraintBoxConfig;

    public getHighlight(
        status: ConstraintStatus,
        undoBlocks: UndoBlock[],
        targetConditions?: any[]
    ): HighlightInfo {
        return null;
    }
}

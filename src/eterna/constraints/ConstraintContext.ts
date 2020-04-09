import Puzzle from 'eterna/puzzle/Puzzle';
import UndoBlock from 'eterna/UndoBlock';
import Pose2D from 'eterna/pose2D/Pose2D';

export default interface ConstraintContext {
    undoBlocks: UndoBlock[];
    targetConditions?: any[];
    puzzle?: Puzzle;
    targetPairs?: number[][];
    currentTargetIndex?: number;
    poses?: Pose2D[];
}

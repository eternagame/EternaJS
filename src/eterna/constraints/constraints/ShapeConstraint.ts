import UndoBlock from 'eterna/UndoBlock';
import EPars from 'eterna/EPars';
import PoseThumbnail, {PoseThumbnailType} from 'eterna/ui/PoseThumbnail';
import {HighlightType} from 'eterna/pose2D/HighlightBox';
import Eterna from 'eterna/Eterna';
import {Sprite} from 'pixi.js';
import {TextureUtil} from 'flashbang';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import Constraint, {BaseConstraintStatus, HighlightInfo} from '../Constraint';

interface ShapeConstraintStatus extends BaseConstraintStatus {
    wrongPairs: number[];
}

abstract class BaseShapeConstraint extends Constraint<ShapeConstraintStatus> {
    public readonly stateIndex: number;

    constructor(stateIndex: number) {
        super();
        this.stateIndex = stateIndex;
    }

    /**
     * Given the constraints for the "raw" indices of bases (oligo order defined by targetOligos)
     * get the constraints for each base with the "target structure" indices of bases
     * (oligo order defined by the target structure, user-modifiable with magic glue)
     *
     * @param constraints
     * @param ublk
     */
    protected _targetAlignedConstraints(constraints: boolean[], ublk: UndoBlock): boolean[] {
        let targetMap = ublk.reorderedOligosIndexMap(ublk.targetOligoOrder);

        if (targetMap != null) {
            let targetAlignedConstraints: boolean[] = [];
            for (let [rawIndex, targetIndex] of Object.entries(targetMap)) {
                targetAlignedConstraints[targetIndex] = constraints[Number(rawIndex)];
            }
            return targetAlignedConstraints;
        } else {
            return constraints;
        }
    }

    /**
     * Given the pair map for the "natural mode" indices of bases (oligo order defined by the natural mode folding)
     * get the pair map for using the "target structure" indices of bases
     * (oligo order defined by the target structure, user-modifiable with magic glue)
     * so that the pair map for natural mode can be compared to the pair map for target mode
     *
     * @param constraints
     * @param ublk
     */
    protected _targetAlignedNaturalPairs(ublk: UndoBlock): number[] {
        let naturalPairs = ublk.getPairs();

        // rawIndex => targetAlignedIndex
        let targetMap = ublk.reorderedOligosIndexMap(ublk.targetOligoOrder);
        if (targetMap != null) {
            // rawIndex => naturalAlignedIndex
            let naturalMap = ublk.reorderedOligosIndexMap(ublk.oligoOrder);

            let targetAlignedNaturalPairs: number[] = [];
            for (let [rawIndex, targetIndex] of Object.entries(targetMap)) {
                let naturalIndex = naturalMap[Number(rawIndex)];
                let naturalPairedIndex = naturalPairs[naturalIndex];
                let rawPairedIndex = naturalMap.indexOf(naturalPairedIndex);

                // If unpaired, it's unpaired, otherwise we need to get the index of the paired base
                // according to target mode
                targetAlignedNaturalPairs[targetIndex] = naturalPairedIndex < 0
                    ? naturalPairedIndex : targetMap[rawPairedIndex];
            }

            return targetAlignedNaturalPairs;
        } else {
            return naturalPairs;
        }
    }

    public getConstraintBoxConfig(
        status: ShapeConstraintStatus,
        undoBlocks: UndoBlock[],
        targetConditions: any[]
    ): ConstraintBoxConfig {
        return {
            satisfied: status.satisfied,
            tooltip: '',
            thumbnailBG: true,
            stateNumber: targetConditions.length > 1 ? this.stateIndex + 1 : null
        };
    }

    public getHighlight(status: ShapeConstraintStatus): HighlightInfo {
        let unstable: number[] = [];
        if (status.wrongPairs) {
            let curr = 0;
            let jj: number;
            for (jj = 0; jj < status.wrongPairs.length; jj++) {
                let stat: number = (status.wrongPairs[jj] === 1 ? 1 : 0);
                if ((curr ^ stat) !== 0) {
                    unstable.push(jj - curr);
                    curr = stat;
                }
            }
            if ((unstable.length % 2) === 1) {
                unstable.push(jj - 1);
            }
        }

        return {
            ranges: unstable,
            color: HighlightType.UNSTABLE
        };
    }
}

export default class ShapeConstraint extends BaseShapeConstraint {
    public static readonly NAME = 'SHAPE';

    public evaluate(undoBlocks: UndoBlock[], targetConditions: any[]): ShapeConstraintStatus {
        let undoBlock = undoBlocks[this.stateIndex];

        let targetAlignedConstraints: boolean[] = null;
        if (targetConditions !== null && targetConditions[this.stateIndex] != null) {
            let structureConstraints: any = targetConditions[this.stateIndex]['structure_constraints'];
            targetAlignedConstraints = this._targetAlignedConstraints(structureConstraints, undoBlock);
        }

        let naturalPairs = this._targetAlignedNaturalPairs(undoBlock);

        return {
            satisfied: EPars.arePairsSame(naturalPairs, undoBlock.targetPairs, targetAlignedConstraints),
            wrongPairs: this._getWrongPairs(naturalPairs, undoBlock.targetPairs, targetAlignedConstraints)
        };
    }

    public getConstraintBoxConfig(
        status: ShapeConstraintStatus,
        undoBlocks: UndoBlock[],
        targetConditions: any[]
    ): ConstraintBoxConfig {
        let details = super.getConstraintBoxConfig(status, undoBlocks, targetConditions);
        let undoBlock = undoBlocks[this.stateIndex];
        let naturalPairs = this._targetAlignedNaturalPairs(undoBlock);
        return {
            ...details,
            tooltip: ConstraintBox.createTextStyle().append(
                details.stateNumber
                    ? `In state ${details.stateNumber}, your RNA must fold into the outlined structure.`
                    : 'Your RNA must fold into the outlined structure.'
            ),
            thumbnail: PoseThumbnail.drawToGraphics(
                new Array(naturalPairs.length).fill(EPars.RNABASE_ADENINE),
                undoBlock.targetPairs, 3, PoseThumbnailType.WRONG_COLORED, 0, status.wrongPairs, false, 0
            )
        };
    }

    private _getWrongPairs(
        naturalPairs: number[], targetPairs: number[], structureConstraints: any[]
    ): number[] {
        let wrongPairs: number[] = new Array(naturalPairs.length);

        for (let ii = 0; ii < wrongPairs.length; ii++) {
            wrongPairs[ii] = -1;
        }
        for (let ii = 0; ii < wrongPairs.length; ii++) {
            if (naturalPairs[ii] !== targetPairs[ii]) {
                if (structureConstraints == null || structureConstraints[ii]) {
                    wrongPairs[ii] = 1;
                } else {
                    wrongPairs[ii] = 0;
                }
            } else if (structureConstraints == null || structureConstraints[ii]) {
                wrongPairs[ii] = -1;
            } else {
                wrongPairs[ii] = 0;
            }
        }
        return wrongPairs;
    }
}

export class AntiShapeConstraint extends BaseShapeConstraint {
    public static readonly NAME = 'ANTISHAPE';

    public evaluate(undoBlocks: UndoBlock[], targetConditions: any[]): ShapeConstraintStatus {
        let undoBlock = undoBlocks[this.stateIndex];

        // TODO: These checks should probably be in Puzzle
        if (targetConditions == null) {
            throw new Error('Target object not available for SHAPE constraint');
        }

        if (targetConditions[this.stateIndex] == null) {
            throw new Error('Target condition not available for SHAPE constraint');
        }

        let antiStructureConstraints: any[] = targetConditions[this.stateIndex]['anti_structure_constraints'];

        let naturalPairs = this._targetAlignedNaturalPairs(undoBlock);
        let targetAlignedConstraints = this._targetAlignedConstraints(antiStructureConstraints, undoBlock);

        let antiStructureString: string = targetConditions[this.stateIndex]['anti_secstruct'];
        if (antiStructureString == null) {
            throw new Error('Target structure not available for ANTISHAPE constraint');
        }
        let antiPairs: number[] = EPars.parenthesisToPairs(antiStructureString);

        return {
            satisfied: !EPars.arePairsSame(naturalPairs, antiPairs, targetAlignedConstraints),
            wrongPairs: this._getWrongPairs(
                naturalPairs,
                targetAlignedConstraints,
                !EPars.arePairsSame(naturalPairs, antiPairs, targetAlignedConstraints)
            )
        };
    }

    public getConstraintBoxConfig(
        status: ShapeConstraintStatus,
        undoBlocks: UndoBlock[],
        targetConditions: any[]
    ): ConstraintBoxConfig {
        let details = super.getConstraintBoxConfig(status, undoBlocks, targetConditions);
        let undoBlock = undoBlocks[this.stateIndex];
        let naturalPairs = this._targetAlignedNaturalPairs(undoBlock);
        return {
            ...details,
            tooltip: ConstraintBox.createTextStyle().append(
                details.stateNumber
                    ? `In state ${details.stateNumber}, your RNA must fold into the outlined structure.`
                    : 'Your RNA must fold into the outlined structure.'
            ),
            noText: true,
            thumbnail: PoseThumbnail.drawToGraphics(
                new Array(naturalPairs.length).fill(EPars.RNABASE_ADENINE),
                EPars.parenthesisToPairs(targetConditions[this.stateIndex]['anti_secstruct']),
                3, PoseThumbnailType.WRONG_COLORED, 0, status.wrongPairs, false, 0
            )
        };
    }

    private _getWrongPairs(
        naturalPairs: number[], structureConstraints: any[], satisfied: boolean
    ): number[] {
        let wrongPairs: number[] = new Array(naturalPairs.length);

        for (let ii = 0; ii < wrongPairs.length; ii++) {
            wrongPairs[ii] = 0;
        }
        for (let ii = 0; ii < wrongPairs.length; ii++) {
            if (structureConstraints == null || structureConstraints[ii]) {
                if (satisfied) {
                    wrongPairs[ii] = -1;
                } else {
                    wrongPairs[ii] = 1;
                }
            }
        }
        return wrongPairs;
    }
}

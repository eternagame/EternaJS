import UndoBlock, {TargetConditions} from 'eterna/UndoBlock';
import EPars from 'eterna/EPars';
import PoseThumbnail, {PoseThumbnailType} from 'eterna/ui/PoseThumbnail';
import {HighlightType} from 'eterna/pose2D/HighlightBox';
import * as log from 'loglevel';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import Constraint, {BaseConstraintStatus, HighlightInfo, ConstraintContext} from '../Constraint';

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
        // if (ublk.targetOligoOrder === null) {
        //     throw new Error('Target condition not available for shape constraint!');
        // }
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
    protected _targetAlignedNaturalPairs(ublk: UndoBlock, pseudoknots: boolean): number[] {
        // if (ublk.targetOligoOrder === null || ublk.oligoOrder === null) {
        //     throw new Error('Target condition not available for shape constraint!');
        // }
        let naturalPairs = ublk.getPairs(37, pseudoknots);

        // rawIndex => targetAlignedIndex
        let targetMap = ublk.reorderedOligosIndexMap(ublk.targetOligoOrder);
        if (targetMap != null) {
            // rawIndex => naturalAlignedIndex
            let naturalMap = ublk.reorderedOligosIndexMap(ublk.oligoOrder);
            if (naturalMap !== undefined) {
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
        } else {
            return naturalPairs;
        }
    }

    public getConstraintBoxConfig(
        status: ShapeConstraintStatus,
        forMissionScreen: boolean,
        undoBlocks: UndoBlock[],
        targetConditions?: TargetConditions[]
    ): ConstraintBoxConfig {
        return {
            satisfied: status.satisfied,
            tooltip: '',
            thumbnailBG: true,
            stateNumber: undoBlocks.length > 1 ? this.stateIndex + 1 : undefined
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

    public evaluate(context: ConstraintContext): ShapeConstraintStatus {
        let undoBlock = context.undoBlocks[this.stateIndex];

        let targetAlignedConstraints: boolean[] | undefined;
        if (context.targetConditions !== undefined && context.targetConditions[this.stateIndex] !== undefined) {
            const tc = context.targetConditions[this.stateIndex] as TargetConditions;
            let structureConstraints = tc['structure_constraints'];
            if (structureConstraints) {
                targetAlignedConstraints = this._targetAlignedConstraints(structureConstraints, undoBlock);
            }
        }

        let pseudoknots = false;
        if (undoBlock.targetConditions !== undefined
                && undoBlock.targetConditions['type'] === 'pseudoknot') {
            pseudoknots = true;
        }
        let naturalPairs = this._targetAlignedNaturalPairs(undoBlock, pseudoknots);

        return {
            satisfied: EPars.arePairsSame(naturalPairs, undoBlock.targetPairs, targetAlignedConstraints),
            wrongPairs: this._getWrongPairs(naturalPairs, undoBlock.targetPairs, targetAlignedConstraints)
        };
    }

    public getConstraintBoxConfig(
        status: ShapeConstraintStatus,
        forMissionScreen: boolean,
        undoBlocks: UndoBlock[]
    ): ConstraintBoxConfig {
        let details = super.getConstraintBoxConfig(status, forMissionScreen, undoBlocks);
        let undoBlock = undoBlocks[this.stateIndex];
        let pseudoknots = false;
        if (undoBlock.targetConditions != null
                && undoBlock.targetConditions['type'] === 'pseudoknot') {
            pseudoknots = true;
        }

        let naturalPairs = this._targetAlignedNaturalPairs(undoBlock, pseudoknots);
        let customLayout: Array<[number, number] | [null, null]> | undefined;
        if (undoBlock.targetConditions) customLayout = undoBlock.targetConditions['custom-layout'];
        return {
            ...details,
            tooltip: ConstraintBox.createTextStyle().append(
                details.stateNumber
                    ? `In state ${details.stateNumber}, your RNA must fold into the outlined structure.`
                    : 'Your RNA must fold into the outlined structure.'
            ),
            thumbnail: PoseThumbnail.drawToGraphics(
                new Array(naturalPairs.length).fill(EPars.RNABASE_ADENINE),
                undoBlock.targetPairs, 3, PoseThumbnailType.WRONG_COLORED, 0, status.wrongPairs, false, 0,
                customLayout
            )
        };
    }

    public serialize(): [string, string] {
        return [
            ShapeConstraint.NAME,
            this.stateIndex.toString()
        ];
    }

    private _getWrongPairs(
        naturalPairs: number[], targetPairs: number[], structureConstraints: boolean[] | undefined
    ): number[] {
        let wrongPairs: number[] = new Array(naturalPairs.length);

        for (let ii = 0; ii < wrongPairs.length; ii++) {
            wrongPairs[ii] = -1;
        }
        for (let ii = 0; ii < wrongPairs.length; ii++) {
            if (naturalPairs[ii] !== targetPairs[ii]) {
                if (structureConstraints === undefined || structureConstraints[ii]) {
                    wrongPairs[ii] = 1;
                } else {
                    wrongPairs[ii] = 0;
                }
            } else if (structureConstraints === undefined || structureConstraints[ii]) {
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

    public evaluate(context: ConstraintContext): ShapeConstraintStatus {
        let undoBlock = context.undoBlocks[this.stateIndex];

        // TODO: These checks should probably be in Puzzle
        if (context.targetConditions === undefined) {
            throw new Error('Target object not available for SHAPE constraint');
        }

        if (context.targetConditions[this.stateIndex] === undefined) {
            throw new Error('Target condition not available for SHAPE constraint');
        }

        const tc = context.targetConditions[this.stateIndex] as TargetConditions;
        let antiStructureConstraints = tc['anti_structure_constraints'];

        let pseudoknots: boolean = tc['type'] === 'pseudoknot';
        let naturalPairs = this._targetAlignedNaturalPairs(undoBlock, pseudoknots);
        let targetAlignedConstraints = antiStructureConstraints
            ? this._targetAlignedConstraints(antiStructureConstraints, undoBlock)
            : undefined;

        let antiStructureString = tc['anti_secstruct'];
        if (antiStructureString === undefined) {
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
        forMissionScreen: boolean,
        undoBlocks: UndoBlock[],
        targetConditions: TargetConditions[]
    ): ConstraintBoxConfig {
        let details = super.getConstraintBoxConfig(status, forMissionScreen, undoBlocks);
        let undoBlock = undoBlocks[this.stateIndex];
        let pseudoknots = false;
        if (undoBlock.targetConditions && undoBlock.targetConditions
                && undoBlock.targetConditions['type'] === 'pseudoknot') {
            pseudoknots = true;
        }
        let naturalPairs = this._targetAlignedNaturalPairs(undoBlock, pseudoknots);
        let customLayout: Array<[number, number] | [null, null]> | undefined;
        if (undoBlock.targetConditions) customLayout = undoBlock.targetConditions['custom-layout'];
        const antiSS = targetConditions[this.stateIndex]['anti_secstruct'];
        const wrongPairs = antiSS !== undefined
            ? EPars.parenthesisToPairs(antiSS)
            : undefined;
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
                wrongPairs as number[],
                3, PoseThumbnailType.WRONG_COLORED, 0, status.wrongPairs, false, 0,
                customLayout
            )
        };
    }

    public serialize(): [string, string] {
        return [
            AntiShapeConstraint.NAME,
            this.stateIndex.toString()
        ];
    }

    private _getWrongPairs(
        naturalPairs: number[], structureConstraints: boolean[] | undefined, satisfied: boolean
    ): number[] {
        let wrongPairs: number[] = new Array(naturalPairs.length);

        for (let ii = 0; ii < wrongPairs.length; ii++) {
            wrongPairs[ii] = 0;
        }
        for (let ii = 0; ii < wrongPairs.length; ii++) {
            if (structureConstraints === undefined || structureConstraints[ii]) {
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

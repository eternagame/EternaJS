import {Assert} from 'flashbang';
import {UndoBlockParam} from 'eterna/UndoBlock';
import EPars from 'eterna/EPars';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import {HighlightType} from 'eterna/pose2D/HighlightBox';
import Constraint, {BaseConstraintStatus, ConstraintContext, HighlightInfo} from '../Constraint';
import {ConstraintBoxConfig} from '../ConstraintBox';

interface ClampProbabilityConstraintStatus extends BaseConstraintStatus {
    probability: number;
}

abstract class ClampProbabilityConstraint extends Constraint<ClampProbabilityConstraintStatus> {
    public readonly requiresDotPlot = true;
    public readonly probability: number;
    public readonly clampIndex: number;
    public readonly mode: 'min' | 'max';

    constructor(probability: number, clampIndex: number, mode: 'min' | 'max') {
        super();
        this.probability = probability;
        this.clampIndex = clampIndex;
        this.mode = mode;
    }

    public evaluate(context: ConstraintContext): ClampProbabilityConstraintStatus {
        // TODO: multistate?
        const undoBlock = context.undoBlocks[0];
        const pseudoknots = (undoBlock.targetConditions !== undefined
            && undoBlock.targetConditions['type'] === 'pseudoknot');

        const clampConstraints = undoBlock.targetConditions?.clamp_constraints?.[this.clampIndex];
        Assert.assertIsDefined(
            clampConstraints,
            `No clamp defined at index ${this.clampIndex} for CLAMP_PROB constraint`
        );

        const [clampRangeA, clampRangeB] = clampConstraints;

        const dotPlotData = undoBlock.getParam(
            UndoBlockParam.DOTPLOT, EPars.DEFAULT_TEMPERATURE, pseudoknots
        ) as number[] | null;

        let probability = 0;
        if (dotPlotData) {
            for (let ii = 0; ii < dotPlotData.length; ii += 3) {
                const pairAIdx = dotPlotData[ii] - 1;
                const pairBIdx = dotPlotData[ii + 1] - 1;
                const prob = dotPlotData[ii + 2];

                if (
                    (clampRangeA[pairAIdx] && clampRangeB[pairBIdx])
                    || (clampRangeA[pairBIdx] && clampRangeB[pairAIdx])
                ) {
                    probability += prob;
                }
            }
        }

        return {
            satisfied: this.mode === 'max' ? probability <= this.probability : probability >= this.probability,
            probability
        };
    }

    public getHighlight(_status: ClampProbabilityConstraintStatus, context: ConstraintContext): HighlightInfo {
        // TODO: Multistate?
        const undoBlock = context.undoBlocks[0];
        const clamps = undoBlock.targetConditions?.clamps?.[this.clampIndex];

        return {
            ranges: clamps?.flat() ?? [],
            color: HighlightType.RESTRICTED
        };
    }

    public getConstraintBoxConfig(status: ClampProbabilityConstraintStatus): ConstraintBoxConfig {
        const tooltip = this.mode === 'max'
            ? `The pairing probability between the clamped base ranges must be at most ${this.probability}.`
            : `The pairing probability between the clamped base ranges must be at least ${this.probability}.`;

        return {
            satisfied: status.satisfied,
            tooltip,
            clarificationText: `${this.probability} OR ${this.mode === 'max' ? 'LESS' : 'MORE'}`,
            statText: status.probability.toFixed(3),
            showOutline: true,
            drawBG: true,
            icon: BitmapManager.getBitmap(Bitmaps.ClampIcon)
        };
    }
}

export class ClampProbabilityMinimumConstraint extends ClampProbabilityConstraint {
    public static readonly NAME = 'CLAMP_PROB_MIN';
    constructor(probability: number, clampIndex: number) {
        super(probability, clampIndex, 'min');
    }

    public serialize(): [string, string] {
        return [
            ClampProbabilityMinimumConstraint.NAME,
            `${this.probability.toString()}|${this.clampIndex.toString()}`
        ];
    }
}

export class ClampProbabilityMaximumConstraint extends ClampProbabilityConstraint {
    public static readonly NAME = 'CLAMP_PROB_MAX';
    constructor(probability: number, clampIndex: number) {
        super(probability, clampIndex, 'max');
    }

    public serialize(): [string, string] {
        return [
            ClampProbabilityMaximumConstraint.NAME,
            `${this.probability.toString()}|${this.clampIndex.toString()}`
        ];
    }
}

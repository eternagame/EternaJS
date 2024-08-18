import FoldUtil, {BasePairProbabilityTransform} from 'eterna/folding/FoldUtil';
import Vienna2 from 'eterna/folding/Vienna2';
import Vienna from 'eterna/folding/Vienna';
import {UndoBlockParam} from 'eterna/UndoBlock';
import EPars from 'eterna/EPars';
import DotPlot from 'eterna/rnatypes/DotPlot';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import Constraint, {BaseConstraintStatus, ConstraintContext} from '../Constraint';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';

interface ConfidenceConstraintStatus extends BaseConstraintStatus {
    confidence: number;
}

abstract class BaseConfidenceConstraint extends Constraint<ConfidenceConstraintStatus> {
    public requiresDotPlot = true;
    public readonly minConfidence: number;

    constructor(minConfidence: number) {
        super();
        this.minConfidence = minConfidence;
    }

    protected _evaluate(context: ConstraintContext, crossPair: boolean): ConfidenceConstraintStatus {
        // TODO: Multistate?
        const undoBlock = context.undoBlocks[0];
        const pseudoknots = (undoBlock.targetConditions !== undefined
            && undoBlock.targetConditions['type'] === 'pseudoknot');
        let dotplot = undoBlock.getParam(UndoBlockParam.DOTPLOT, EPars.DEFAULT_TEMPERATURE, pseudoknots) as number[];

        let pairs = undoBlock.targetAlignedNaturalPairs;

        if (crossPair) {
            pairs = pairs.getCrossedPairs();
            dotplot = dotplot.slice();
            for (let i = 0; i < dotplot.length; i += 3) {
                const a = dotplot[i] - 1;
                const b = dotplot[i + 1] - 1;
                if (!pairs.isPaired(a) && !pairs.isPaired(b)) {
                    dotplot[i + 2] = 0;
                }
            }
        }

        const square: boolean = (undoBlock.folderName === Vienna.NAME || undoBlock.folderName === Vienna2.NAME);
        const conf = FoldUtil.expectedAccuracy(
            pairs,
            new DotPlot(dotplot),
            square ? BasePairProbabilityTransform.SQUARE : BasePairProbabilityTransform.LEAVE_ALONE
        ).f1;

        return {
            confidence: conf,
            satisfied: conf >= this.minConfidence
        };
    }

    public _getConstraintBoxConfig(
        status: ConfidenceConstraintStatus,
        forMissionScreen: boolean,
        forKnot: boolean
    ): ConstraintBoxConfig {
        const tooltip = ConstraintBox.createTextStyle();

        if (forMissionScreen) {
            tooltip.pushStyle('altTextMain');
        }

        tooltip.append(`Your design must have a ${forKnot ? 'pseudoknot confidence' : 'confidence'} for the natural mode prediction greater than`, 'altText').append(` ${this.minConfidence}.`);

        if (forMissionScreen) {
            tooltip.popStyle();
        }
        return {
            satisfied: status.satisfied,
            showOutline: true,
            drawBG: true,
            icon: BitmapManager.getBitmap(forKnot ? Bitmaps.QualityNaturalPK : Bitmaps.QualityNatural),
            statText: !forMissionScreen ? `${status.confidence.toFixed(3)}` : undefined,
            tooltip
        };
    }

    public serialize(): [string, string] {
        return [
            NativeConfidenceConstraint.NAME,
            this.minConfidence.toString()
        ];
    }
}

export class NativeConfidenceConstraint extends BaseConfidenceConstraint {
    public static readonly NAME = 'BPPF1NATIVEMIN';

    public evaluate(context: ConstraintContext): ConfidenceConstraintStatus {
        return this._evaluate(context, false);
    }

    public getConstraintBoxConfig(status: ConfidenceConstraintStatus, forMissionScreen: boolean): ConstraintBoxConfig {
        return this._getConstraintBoxConfig(status, forMissionScreen, false);
    }
}

export class NativePKConfidenceConstraint extends BaseConfidenceConstraint {
    public static readonly NAME = 'BPPF1NATIVEPKMASKMIN';

    public evaluate(context: ConstraintContext): ConfidenceConstraintStatus {
        return this._evaluate(context, true);
    }

    public getConstraintBoxConfig(status: ConfidenceConstraintStatus, forMissionScreen: boolean): ConstraintBoxConfig {
        return this._getConstraintBoxConfig(status, forMissionScreen, true);
    }
}

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
    public readonly mode: 'target' | 'native';
    public readonly pseudoknot: boolean;

    constructor(minConfidence: number, mode: 'target' | 'native', pseudoknot: boolean) {
        super();
        this.minConfidence = minConfidence;
        this.mode = mode;
        this.pseudoknot = pseudoknot;
    }

    public evaluate(context: ConstraintContext): ConfidenceConstraintStatus {
        // TODO: Multistate?
        const undoBlock = context.undoBlocks[0];
        const pseudoknots = (undoBlock.targetConditions !== undefined
            && undoBlock.targetConditions['type'] === 'pseudoknot');
        let dotplot = undoBlock.getParam(UndoBlockParam.DOTPLOT, EPars.DEFAULT_TEMPERATURE, pseudoknots) as number[];

        let pairs = this.mode === 'native'
            ? undoBlock.targetAlignedNaturalPairs
            : undoBlock.targetPairs;

        if (this.pseudoknot) {
            pairs = pairs.getCrossedPairs();
            if (!pairs.nonempty()) {
                // Otherwise since all bpp contributions would be zeroed out, f1 would be calculated
                // as (2 * 1e6) / (2 * 1e6 + 1e6 - 1e6 + 1e6) = 0.666666666. Really it's undefined
                // (the 1e6 default values are there to prevent that) and "0" is better reflecting
                // our intent
                return {
                    confidence: 0,
                    satisfied: false
                };
            }

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

    public getConstraintBoxConfig(
        status: ConfidenceConstraintStatus,
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        const tooltip = ConstraintBox.createTextStyle();

        if (forMissionScreen) {
            tooltip.pushStyle('altTextMain');
        }

        tooltip.append(`Your design must have a ${this.pseudoknot ? 'pseudoknot confidence' : 'confidence'} for the ${this.mode === 'native' ? 'natural mode prediction' : 'target mode'} greater than`, 'altText').append(` ${this.minConfidence}.`);

        if (forMissionScreen) {
            tooltip.popStyle();
        }
        return {
            satisfied: status.satisfied,
            showOutline: true,
            drawBG: true,
            icon: BitmapManager.getBitmap(this.getBitmap()),
            statText: !forMissionScreen ? `${status.confidence.toFixed(3)}` : undefined,
            tooltip
        };
    }

    private getBitmap() {
        if (this.pseudoknot) {
            if (this.mode === 'native') {
                return Bitmaps.QualityNaturalPK;
            } else {
                return Bitmaps.QualityTargetPK;
            }
        } else if (this.mode === 'native') {
            return Bitmaps.QualityNatural;
        } else {
            return Bitmaps.QualityTarget;
        }
    }
}

export class NativeConfidenceConstraint extends BaseConfidenceConstraint {
    public static readonly NAME = 'BPPF1NATIVEMIN';

    constructor(minConfidence: number) {
        super(minConfidence, 'native', false);
    }

    public serialize(): [string, string] {
        return [
            NativeConfidenceConstraint.NAME,
            this.minConfidence.toString()
        ];
    }
}

export class TargetConfidenceConstraint extends BaseConfidenceConstraint {
    public static readonly NAME = 'BPPF1TARGETMIN';

    constructor(minConfidence: number) {
        super(minConfidence, 'target', false);
    }

    public serialize(): [string, string] {
        return [
            TargetConfidenceConstraint.NAME,
            this.minConfidence.toString()
        ];
    }
}

export class NativePKConfidenceConstraint extends BaseConfidenceConstraint {
    public static readonly NAME = 'BPPF1NATIVEPKMASKMIN';

    constructor(minConfidence: number) {
        super(minConfidence, 'native', true);
    }

    public serialize(): [string, string] {
        return [
            NativePKConfidenceConstraint.NAME,
            this.minConfidence.toString()
        ];
    }
}

export class TargetPKConfidenceConstraint extends BaseConfidenceConstraint {
    public static readonly NAME = 'BPPF1TARGETPKMASKMIN';

    constructor(minConfidence: number) {
        super(minConfidence, 'target', true);
    }

    public serialize(): [string, string] {
        return [
            TargetPKConfidenceConstraint.NAME,
            this.minConfidence.toString()
        ];
    }
}

import {UndoBlockParam} from 'eterna/UndoBlock';
import EPars from 'eterna/EPars';
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
        const pseudoknots = (
            undoBlock.targetConditions !== undefined
            && undoBlock.targetConditions['type'] === 'pseudoknot'
        );

        let conf: number;
        if (this.pseudoknot) {
            if (this.mode === 'target') {
                conf = undoBlock.getParam(
                    UndoBlockParam.BPP_F1_TARGET_PKMASK, EPars.DEFAULT_TEMPERATURE, pseudoknots
                ) as number;
            } else {
                conf = undoBlock.getParam(
                    UndoBlockParam.BPP_F1_NATIVE_PKMASK, EPars.DEFAULT_TEMPERATURE, pseudoknots
                ) as number;
            }
        } else if (this.mode === 'target') {
            conf = undoBlock.getParam(UndoBlockParam.BPP_F1_TARGET, EPars.DEFAULT_TEMPERATURE, pseudoknots) as number;
        } else {
            conf = undoBlock.getParam(UndoBlockParam.BPP_F1_NATIVE, EPars.DEFAULT_TEMPERATURE, pseudoknots) as number;
        }

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
        tooltip.append('\n\n');
        tooltip.append(`Confidence metric: F1 BPP-${this.mode}${this.pseudoknot ? ' PK-masked' : ''}`);

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
                return Bitmaps.ConfidenceNaturalPK;
            } else {
                return Bitmaps.ConfidenceTargetPK;
            }
        } else if (this.mode === 'native') {
            return Bitmaps.ConfidenceNatural;
        } else {
            return Bitmaps.ConfidenceTarget;
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

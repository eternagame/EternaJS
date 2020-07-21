import UndoBlock, {UndoBlockParam} from 'eterna/UndoBlock';
import EPars from 'eterna/EPars';
import BitmapManager from 'eterna/resources/BitmapManager';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import Constraint, {BaseConstraintStatus, ConstraintContext} from '../Constraint';

interface TargetExpectedAccuracyConstraintStatus extends BaseConstraintStatus {
    targetExpectedAccuracy: number;
}

export default class TargetExpectedAccuracyConstraint extends Constraint<TargetExpectedAccuracyConstraintStatus> {
    public readonly targetExpectedAccuracy: number;

    constructor(targetExpectedAccuracy: number) {
        super();
        this.targetExpectedAccuracy = targetExpectedAccuracy;
    }

    public evaluate(constraintContext: ConstraintContext): TargetExpectedAccuracyConstraintStatus {
        // TODO: Multistate? pseudoknots?
        const expectedAccuracy = constraintContext.undoBlocks[0].getParam(
            UndoBlockParam.TARGET_EXPECTED_ACCURACY,
            37,
            false
        );

        return {
            satisfied: expectedAccuracy <= this.targetExpectedAccuracy,
            targetExpectedAccuracy: expectedAccuracy
        };
    }

    public getConstraintBoxConfig(
        status: TargetExpectedAccuracyConstraintStatus,
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        let tooltip = ConstraintBox.createTextStyle();

        if (forMissionScreen) {
            tooltip.pushStyle('altTextMain');
        }

        // Typical natural RNAs have a lot of branches in them. Often,
        // artificial RNAs that are very stable have very few branches, like
        // they are just one long hairpin. We want to encourage natural-looking,
        // "branchy" RNAs by contraining the mean base pair distance.
        tooltip.append('The average distance between paired bases must be at most', 'altText')
            .append(` ${this.targetExpectedAccuracy}.`);

        if (forMissionScreen) {
            tooltip.popStyle();
        }

        return {
            satisfied: status.satisfied,
            tooltip,
            clarificationText: `${this.targetExpectedAccuracy} OR MORE`,
            statText: status.targetExpectedAccuracy.toString(),
            showOutline: true,
            fullTexture: BitmapManager.getBitmapNamed('Turkey')
        };
    }

    public static readonly NAME = 'TARGETEXPECTEDACCURACYMIN';

    public serialize(): [string, string] {
        return [
            TargetExpectedAccuracyConstraint.NAME,
            this.targetExpectedAccuracy.toString()
        ];
    }
}

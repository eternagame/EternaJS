import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import BoostLoops from 'eterna/mode/PoseEdit/BoostLoops';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import Constraint, {BaseConstraintStatus} from '../Constraint';
import ConstraintContext from '../ConstraintContext';

interface BoostConstraintStatus extends BaseConstraintStatus {
    boostCount: number;
}

export default class BoostConstraint extends Constraint<BaseConstraintStatus> {
    private static loops = new BoostLoops();

    public static readonly NAME = 'BOOST';
    public readonly minBoosts: number;

    constructor(minBoosts: number) {
        super();
        this.minBoosts = minBoosts;
    }

    public evaluate(context: ConstraintContext): BoostConstraintStatus {
        const boostCount = BoostConstraint.loops.count(context.targetPairs, context.currentTargetIndex, context.poses);
        return {
            satisfied: (boostCount >= this.minBoosts),
            boostCount
        };
    }

    public getConstraintBoxConfig(
        status: BoostConstraintStatus,
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        let tooltip = ConstraintBox.createTextStyle();
        if (forMissionScreen) {
            tooltip.pushStyle('altTextMain');
        }
        tooltip.append(`You must have ${this.minBoosts.toString()} or `);

        if (forMissionScreen) {
            tooltip.append('more', 'altText');
        } else {
            tooltip.append('more');
        }

        tooltip.append('boosted loops.');

        if (forMissionScreen) {
            tooltip.popStyle();
        }

        return {
            tooltip,
            satisfied: status.satisfied,
            clarificationText: `${this.minBoosts} OR MORE`,
            statText: status.boostCount.toString(),
            fullTexture: forMissionScreen
                ? BitmapManager.getBitmap(Bitmaps.NovaBoostMissionReq)
                : BitmapManager.getBitmap(Bitmaps.NovaBoostReq),
            showOutline: true
        };
    }

    public serialize(): [string, string] {
        return [
            BoostConstraint.NAME,
            this.minBoosts.toString()
        ];
    }
}

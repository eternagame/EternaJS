import UndoBlock from 'eterna/UndoBlock';
import EPars from 'eterna/EPars';
import BitmapManager from 'eterna/resources/BitmapManager';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import Constraint, {BaseConstraintStatus} from '../Constraint';

interface BranchinessConstraintStatus extends BaseConstraintStatus {
    currentBranchiness: number;
}

export default class BranchinessConstraint extends Constraint<BranchinessConstraintStatus> {
    public readonly maxBranchiness: number;

    constructor(maxBranchiness: number) {
        super();
        this.maxBranchiness = maxBranchiness;
    }

    public evaluate(undoBlocks: UndoBlock[]): BranchinessConstraintStatus {
        // TODO: Multistate?
        const branchiness = undoBlocks[0].branchiness(undoBlocks[0].getPairs(37));

        return {
            satisfied: branchiness <= this.maxBranchiness,
            currentBranchiness: branchiness
        };
    }

    public getConstraintBoxConfig(
        status: BranchinessConstraintStatus,
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
            .append(` ${this.maxBranchiness}.`);

        if (forMissionScreen) {
            tooltip.popStyle();
        }

        return {
            satisfied: status.satisfied,
            tooltip,
            clarificationText: `${this.maxBranchiness} OR LESS`,
            statText: status.currentBranchiness.toString(),
            showOutline: true,
            fullTexture: BitmapManager.getBitmapNamed('Turkey')
        };
    }

    public static readonly NAME = 'BPDISTMAX';

    public serialize(): [string, string] {
        return [
            BranchinessConstraint.NAME,
            this.maxBranchiness.toString()
        ];
    }
}

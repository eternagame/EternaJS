import EPars from 'eterna/EPars';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import Constraint, {BaseConstraintStatus, ConstraintContext} from '../Constraint';

interface MinCrossedConstraintStatus extends BaseConstraintStatus{
    currentPercent: number;
}

export default class MinimumCrossedPercentConstraint extends Constraint<MinCrossedConstraintStatus> {
    public static readonly NAME = 'MIN_CROSSED_PERCENT';
    public readonly minPercent: number;

    constructor(minPercent: number) {
        super();
        this.minPercent = minPercent;
    }

    public evaluate(context: ConstraintContext): MinCrossedConstraintStatus {
        // TODO: Multistate?
        const undoBlock = context.undoBlocks[0];
        const pseudoknots = (undoBlock.targetConditions !== undefined
            && undoBlock.targetConditions['type'] === 'pseudoknot');

        const totalPairs = undoBlock.getPairs(EPars.DEFAULT_TEMPERATURE, pseudoknots).numPairs();
        const crossedPairs = undoBlock.getPairs(EPars.DEFAULT_TEMPERATURE, pseudoknots).getCrossedPairs().numPairs();
        return {
            satisfied: (crossedPairs / totalPairs) * 100 >= this.minPercent,
            currentPercent: (crossedPairs / totalPairs) * 100
        };
    }

    public getConstraintBoxConfig(status: MinCrossedConstraintStatus): ConstraintBoxConfig {
        const statText = ConstraintBox.createTextStyle()
            .append(`${Math.floor(status.currentPercent).toString()}%`, {fill: status.satisfied ? 0x00aa00 : 0xaa0000})
            .append(`>= ${this.minPercent}%`);

        return {
            satisfied: status.satisfied,
            tooltip: `At least ${this.minPercent}% of pairs must be crossed (involved in a pseudoknot).`,
            statText,
            icon: BitmapManager.getBitmap(Bitmaps.PseudoknotReqIcon),
            drawBG: true,
            showOutline: true
        };
    }

    public serialize(): [string, string] {
        return [
            MinimumCrossedPercentConstraint.NAME,
            this.minPercent.toString()
        ];
    }
}

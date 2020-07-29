import EPars from 'eterna/EPars';
import BitmapManager from 'eterna/resources/BitmapManager';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import Constraint, {BaseConstraintStatus, ConstraintContext} from '../Constraint';

interface MaxBaseConstraintStatus extends BaseConstraintStatus {
    currentCount: number;
}

abstract class MaximumBaseConstraint extends Constraint<MaxBaseConstraintStatus> {
    public readonly baseType: number;
    public readonly maxCount: number;

    constructor(baseType: number, maxCount: number) {
        super();
        this.baseType = baseType;
        this.maxCount = maxCount;
    }

    public evaluate(context: ConstraintContext): MaxBaseConstraintStatus {
        // TODO: Multistate?
        const count = context.undoBlocks[0].sequence.reduce(
            (acc, curr) => acc + (curr === this.baseType ? 1 : 0), 0
        );

        return {
            satisfied: count <= this.maxCount,
            currentCount: count
        };
    }

    public getConstraintBoxConfig(
        status: MaxBaseConstraintStatus,
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        let tooltip = ConstraintBox.createTextStyle();

        if (forMissionScreen) {
            tooltip.pushStyle('altTextMain');
        }

        tooltip.append('You must have ')
            .append('at most', 'altText')
            .append(` ${this.maxCount}`)
            .append(` ${EPars.getColoredLetter(EPars.nucleotideToString(this.baseType, false, false))}s.`);

        if (forMissionScreen) {
            tooltip.popStyle();
        }

        return {
            satisfied: status.satisfied,
            tooltip,
            clarificationText: `${this.maxCount} OR FEWER`,
            statText: status.currentCount.toString(),
            showOutline: true,
            fullTexture: forMissionScreen
                ? BitmapManager.missionBitmapNucl(EPars.nucleotideToString(this.baseType, false, false))
                : BitmapManager.bitmapNucl(EPars.nucleotideToString(this.baseType, false, false))
        };
    }
}

export class MaximumAConstraint extends MaximumBaseConstraint {
    public static readonly NAME = 'AMAX';

    constructor(count: number) {
        super(EPars.RNABASE_ADENINE, count);
    }

    public serialize(): [string, string] {
        return [
            MaximumAConstraint.NAME,
            this.maxCount.toString()
        ];
    }
}

export class MaximumUConstraint extends MaximumBaseConstraint {
    public static readonly NAME = 'UMAX';

    constructor(count: number) {
        super(EPars.RNABASE_URACIL, count);
    }

    public serialize(): [string, string] {
        return [
            MaximumUConstraint.NAME,
            this.maxCount.toString()
        ];
    }
}

export class MaximumGConstraint extends MaximumBaseConstraint {
    public static readonly NAME = 'GMAX';

    constructor(count: number) {
        super(EPars.RNABASE_GUANINE, count);
    }

    public serialize(): [string, string] {
        return [
            MaximumGConstraint.NAME,
            this.maxCount.toString()
        ];
    }
}

export class MaximumCConstraint extends MaximumBaseConstraint {
    public static readonly NAME = 'CMAX';

    constructor(count: number) {
        super(EPars.RNABASE_CYTOSINE, count);
    }

    public serialize(): [string, string] {
        return [
            MaximumCConstraint.NAME,
            this.maxCount.toString()
        ];
    }
}

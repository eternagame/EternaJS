import EPars from 'eterna/EPars';
import BitmapManager from 'eterna/resources/BitmapManager';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import Constraint, {BaseConstraintStatus, ConstraintContext} from '../Constraint';

interface MinBaseConstraintStatus extends BaseConstraintStatus{
    currentCount: number;
}

abstract class MinimumBaseConstraint extends Constraint<MinBaseConstraintStatus> {
    public readonly baseType: number;
    public readonly minCount: number;

    constructor(baseType: number, minCount: number) {
        super();
        this.baseType = baseType;
        this.minCount = minCount;
    }

    public evaluate(context: ConstraintContext): MinBaseConstraintStatus {
        // TODO: Multistate?
        const count = context.undoBlocks[0].sequence.reduce(
            (acc, curr) => acc + (curr === this.baseType ? 1 : 0), 0
        );

        return {
            satisfied: count >= this.minCount,
            currentCount: count
        };
    }

    public getConstraintBoxConfig(
        status: MinBaseConstraintStatus,
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        let tooltip = ConstraintBox.createTextStyle();

        if (forMissionScreen) {
            tooltip.pushStyle('altTextMain');
        }

        tooltip.append(`You must have ${this.minCount} or more`)
            .append(` ${EPars.getColoredLetter(EPars.nucleotideToString(this.baseType, false, false))}s.`);

        if (forMissionScreen) {
            tooltip.popStyle();
        }

        return {
            satisfied: status.satisfied,
            tooltip,
            clarificationText: `${this.minCount} OR MORE`,
            statText: status.currentCount.toString(),
            showOutline: true,
            fullTexture: forMissionScreen
                ? BitmapManager.missionBitmapNucl(EPars.nucleotideToString(this.baseType, false, false))
                : BitmapManager.bitmapNucl(EPars.nucleotideToString(this.baseType, false, false))
        };
    }
}

export class MinimumAConstraint extends MinimumBaseConstraint {
    public static readonly NAME = 'A';

    constructor(count: number) {
        super(EPars.RNABASE_ADENINE, count);
    }

    public serialize(): [string, string] {
        return [
            MinimumAConstraint.NAME,
            this.minCount.toString()
        ];
    }
}

export class MinimumUConstraint extends MinimumBaseConstraint {
    public static readonly NAME = 'U';

    constructor(count: number) {
        super(EPars.RNABASE_URACIL, count);
    }

    public serialize(): [string, string] {
        return [
            MinimumUConstraint.NAME,
            this.minCount.toString()
        ];
    }
}

export class MinimumGConstraint extends MinimumBaseConstraint {
    public static readonly NAME = 'G';

    constructor(count: number) {
        super(EPars.RNABASE_GUANINE, count);
    }

    public serialize(): [string, string] {
        return [
            MinimumGConstraint.NAME,
            this.minCount.toString()
        ];
    }
}

export class MinimumCConstraint extends MinimumBaseConstraint {
    public static readonly NAME = 'C';

    constructor(count: number) {
        super(EPars.RNABASE_CYTOSINE, count);
    }

    public serialize(): [string, string] {
        return [
            MinimumCConstraint.NAME,
            this.minCount.toString()
        ];
    }
}

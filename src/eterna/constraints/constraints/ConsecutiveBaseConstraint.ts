import EPars, {RNABase} from 'eterna/EPars';
import BitmapManager from 'eterna/resources/BitmapManager';
import {HighlightType} from 'eterna/pose2D/HighlightBox';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import Constraint, {BaseConstraintStatus, HighlightInfo, ConstraintContext} from '../Constraint';

interface ConsecutiveConstraintStatus extends BaseConstraintStatus {
    currentConsecutive: number;
}

abstract class ConsecutiveBaseConstraint extends Constraint<ConsecutiveConstraintStatus> {
    public readonly baseType: number;
    public readonly consecutiveLimit: number; // max + 1!

    /**
     * Creates a ConsecutiveBaseConstraint which limits the number of consecutive bases
     * @param baseType Base to limit, e.g. RNABase.ADENINE
     * @param limit Number of consectuive bases to constrain against.
     * This is the maxiumum allowed consecutive count  + 1.
     */
    constructor(baseType: number, limit: number) {
        super();
        this.baseType = baseType;
        this.consecutiveLimit = limit;
    }

    public evaluate(context: ConstraintContext): ConsecutiveConstraintStatus {
        const count = context.undoBlocks[0].sequence.countConsecutive(this.baseType);

        return {
            satisfied: count < this.consecutiveLimit,
            currentConsecutive: count
        };
    }

    public getConstraintBoxConfig(
        status: ConsecutiveConstraintStatus,
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        const tooltip = ConstraintBox.createTextStyle();
        if (forMissionScreen) {
            tooltip.pushStyle('altTextMain');
        }
        tooltip.append('You must have ')
            .append('at most', 'altText')
            .append(` ${this.consecutiveLimit - 1} ${EPars.getColoredLetter(EPars.nucleotideToString(this.baseType, false, false))}s in a row.`);

        if (forMissionScreen) {
            tooltip.popStyle();
        }

        return {
            satisfied: status.satisfied,
            tooltip,
            clarificationText: `AT MOST ${this.consecutiveLimit - 1} IN A ROW`,
            statText: status.currentConsecutive.toString(),
            fullTexture: forMissionScreen
                ? BitmapManager.rowMissionBitmapNucl(EPars.nucleotideToString(this.baseType, false, false))
                : BitmapManager.rowBitmapNucl(EPars.nucleotideToString(this.baseType, false, false)),
            showOutline: true
        };
    }

    public getHighlight(status: ConsecutiveConstraintStatus, context: ConstraintContext): HighlightInfo {
        return {
            ranges: context.undoBlocks[0].sequence.getRestrictedConsecutive(
                this.baseType,
                this.consecutiveLimit - 1,
                context.undoBlocks[0].puzzleLocks
            ),
            color: HighlightType.RESTRICTED
        };
    }
}

export class ConsecutiveAConstraint extends ConsecutiveBaseConstraint {
    public static readonly NAME = 'CONSECUTIVE_A';

    constructor(limit: number) {
        super(RNABase.ADENINE, limit);
    }

    public serialize(): [string, string] {
        return [
            ConsecutiveAConstraint.NAME,
            this.consecutiveLimit.toString()
        ];
    }
}

export class ConsecutiveUConstraint extends ConsecutiveBaseConstraint {
    public static readonly NAME = 'CONSECUTIVE_U';

    constructor(limit: number) {
        super(RNABase.URACIL, limit);
    }

    public serialize(): [string, string] {
        return [
            ConsecutiveUConstraint.NAME,
            this.consecutiveLimit.toString()
        ];
    }
}

export class ConsecutiveGConstraint extends ConsecutiveBaseConstraint {
    public static readonly NAME = 'CONSECUTIVE_G';

    constructor(limit: number) {
        super(RNABase.GUANINE, limit);
    }

    public serialize(): [string, string] {
        return [
            ConsecutiveGConstraint.NAME,
            this.consecutiveLimit.toString()
        ];
    }
}

export class ConsecutiveCConstraint extends ConsecutiveBaseConstraint {
    public static readonly NAME = 'CONSECUTIVE_C';

    constructor(limit: number) {
        super(RNABase.CYTOSINE, limit);
    }

    public serialize(): [string, string] {
        return [
            ConsecutiveCConstraint.NAME,
            this.consecutiveLimit.toString()
        ];
    }
}

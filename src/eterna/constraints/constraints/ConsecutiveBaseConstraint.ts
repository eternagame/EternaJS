import UndoBlock from 'eterna/UndoBlock';
import EPars from 'eterna/EPars';
import BitmapManager from 'eterna/resources/BitmapManager';
import {HighlightType} from 'eterna/pose2D/HighlightBox';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import Constraint, {BaseConstraintStatus, HighlightInfo} from '../Constraint';

interface ConsecutiveConstraintStatus extends BaseConstraintStatus {
    currentConsecutive: number;
}

abstract class ConsecutiveBaseConstraint extends Constraint<ConsecutiveConstraintStatus> {
    public readonly baseType: number;
    public readonly maxConsecutive: number;

    constructor(baseType: number, count: number) {
        super();
        this.baseType = baseType;
        this.maxConsecutive = count;
    }

    public evaluate(undoBlocks: UndoBlock[]): ConsecutiveConstraintStatus {
        let count = EPars.countConsecutive(
            undoBlocks[0].sequence,
            this.baseType
        );

        return {
            satisfied: count < this.maxConsecutive,
            currentConsecutive: count
        };
    }

    public getConstraintBoxConfig(
        status: ConsecutiveConstraintStatus,
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        let tooltip = ConstraintBox.createTextStyle();
        if (forMissionScreen) {
            tooltip.pushStyle('altTextMain');
        }
        tooltip.append('You must have ')
            .append('at most', 'altText')
            .append(` ${this.maxConsecutive - 1} ${EPars.getColoredLetter(EPars.nucleotideToString(this.baseType, false, false))}s in a row.`);

        if (forMissionScreen) {
            tooltip.popStyle();
        }

        return {
            satisfied: status.satisfied,
            tooltip,
            clarificationText: `AT MOST ${this.maxConsecutive - 1} IN A ROW`,
            statText: status.currentConsecutive.toString(),
            fullTexture: forMissionScreen
                ? BitmapManager.getBitmapNamed(`Nova${EPars.nucleotideToString(this.baseType, false, false)}RowMissionReq`)
                : BitmapManager.getBitmapNamed(`Nova${EPars.nucleotideToString(this.baseType, false, false)}RowReq`),
            showOutline: true
        };
    }

    public getHighlight(status: ConsecutiveConstraintStatus, undoBlocks: UndoBlock[]): HighlightInfo {
        return {
            ranges: EPars.getRestrictedConsecutive(
                undoBlocks[0].sequence,
                this.baseType,
                this.maxConsecutive,
                undoBlocks[0].puzzleLocks
            ),
            color: HighlightType.RESTRICTED
        };
    }
}

export class ConsecutiveAConstraint extends ConsecutiveBaseConstraint {
    public static readonly NAME = 'CONSECUTIVE_A';

    constructor(count: number) {
        super(EPars.RNABASE_ADENINE, count);
    }

    public serialize(): [string, string] {
        return [
            ConsecutiveAConstraint.NAME,
            this.maxConsecutive.toString()
        ];
    }
}

export class ConsecutiveUConstraint extends ConsecutiveBaseConstraint {
    public static readonly NAME = 'CONSECUTIVE_U';

    constructor(count: number) {
        super(EPars.RNABASE_URACIL, count);
    }

    public serialize(): [string, string] {
        return [
            ConsecutiveUConstraint.NAME,
            this.maxConsecutive.toString()
        ];
    }
}

export class ConsecutiveGConstraint extends ConsecutiveBaseConstraint {
    public static readonly NAME = 'CONSECUTIVE_G';

    constructor(count: number) {
        super(EPars.RNABASE_GUANINE, count);
    }

    public serialize(): [string, string] {
        return [
            ConsecutiveGConstraint.NAME,
            this.maxConsecutive.toString()
        ];
    }
}

export class ConsecutiveCConstraint extends ConsecutiveBaseConstraint {
    public static readonly NAME = 'CONSECUTIVE_C';

    constructor(count: number) {
        super(EPars.RNABASE_CYTOSINE, count);
    }

    public serialize(): [string, string] {
        return [
            ConsecutiveCConstraint.NAME,
            this.maxConsecutive.toString()
        ];
    }
}

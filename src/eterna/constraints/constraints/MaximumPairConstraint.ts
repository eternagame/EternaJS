import UndoBlock, {UndoBlockParam} from 'eterna/UndoBlock';
import EPars from 'eterna/EPars';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import Constraint, {BaseConstraintStatus} from '../Constraint';

interface MaxPairConstraintStatus extends BaseConstraintStatus {
    currentPairs: number;
}

abstract class MaximumPairConstraint extends Constraint<MaxPairConstraintStatus> {
    public readonly pairType: number;
    public readonly maxPairs: number;

    constructor(pairType: number, maxPairs: number) {
        super();
        this.pairType = pairType;
        this.maxPairs = maxPairs;
    }

    public evaluate(undoBlocks: UndoBlock[]): MaxPairConstraintStatus {
        // TODO: Multistate?
        const currentPairs: number = undoBlocks[0].getParam(
            UndoBlockParam[EPars.nucleotidePairToString(this.pairType)]
        );
        return {
            satisfied: (
                currentPairs <= this.maxPairs
            ),
            currentPairs
        };
    }

    public getConstraintBoxConfig(
        status: MaxPairConstraintStatus,
        undoBlocks: UndoBlock[],
        targetConditions: any[],
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        let tooltip = ConstraintBox.createTextStyle();

        if (forMissionScreen) {
            tooltip.pushStyle('altTextMain');
        }

        tooltip.append('You must have ')
            .append('at most', 'altText')
            .append(` ${this.maxPairs} `)
            .append(`${EPars.getColoredLetter(EPars.nucleotidePairToString(this.pairType).charAt(0))}-`)
            .append(`${EPars.getColoredLetter(EPars.nucleotidePairToString(this.pairType).charAt(1))} pairs.`);

        if (forMissionScreen) {
            tooltip.popStyle();
        }

        return {
            satisfied: status.satisfied,
            clarificationText: `${this.maxPairs} OR FEWER`,
            statText: status.currentPairs.toString(),
            tooltip,
            showOutline: true
        };
    }
}

export class MaximumGCConstraint extends MaximumPairConstraint {
    public static readonly NAME = 'GC';

    constructor(count: number) {
        super(EPars.RNABASE_GC_PAIR, count);
    }

    /** @override */
    public getConstraintBoxConfig(
        status: MaxPairConstraintStatus,
        undoBlocks: UndoBlock[],
        targetConditions: any[],
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        return {
            ...super.getConstraintBoxConfig(status, undoBlocks, targetConditions, forMissionScreen),
            fullTexture: forMissionScreen
                ? BitmapManager.getBitmap(Bitmaps.NovaGCMissionReq)
                : BitmapManager.getBitmap(Bitmaps.NovaGCReq)
        };
    }
}

export class MaximumAUConstraint extends MaximumPairConstraint {
    public static readonly NAME = 'AUMAX';

    constructor(count: number) {
        super(EPars.RNABASE_AU_PAIR, count);
    }

    /** @override */
    public getConstraintBoxConfig(
        status: MaxPairConstraintStatus,
        undoBlocks: UndoBlock[],
        targetConditions: any[],
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        return {
            ...super.getConstraintBoxConfig(status, undoBlocks, targetConditions, forMissionScreen),
            fullTexture: forMissionScreen
                ? BitmapManager.getBitmap(Bitmaps.NovaAUMissionReq)
                : BitmapManager.getBitmap(Bitmaps.NovaAUReq)
        };
    }
}

export class MaximumGUConstraint extends MaximumPairConstraint {
    public static readonly NAME = 'GUMAX';

    constructor(count: number) {
        super(EPars.RNABASE_GU_PAIR, count);
    }

    /** @override */
    public getConstraintBoxConfig(
        status: MaxPairConstraintStatus,
        undoBlocks: UndoBlock[],
        targetConditions: any[],
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        return {
            ...super.getConstraintBoxConfig(status, undoBlocks, targetConditions, forMissionScreen),
            fullTexture: forMissionScreen
                ? BitmapManager.getBitmap(Bitmaps.NovaGUMissionReq)
                : BitmapManager.getBitmap(Bitmaps.NovaGUReq)
        };
    }
}

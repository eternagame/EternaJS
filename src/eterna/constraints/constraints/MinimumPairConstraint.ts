import UndoBlock, {UndoBlockParam} from 'eterna/UndoBlock';
import EPars from 'eterna/EPars';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import Constraint, {BaseConstraintStatus} from '../Constraint';

interface MinPairConstraintStatus extends BaseConstraintStatus {
    currentPairs: number;
}

abstract class MinimumPairConstraint extends Constraint<MinPairConstraintStatus> {
    public pairType: number;
    public minPairs: number;

    constructor(pairType: number, minPairs: number) {
        super();
        this.pairType = pairType;
        this.minPairs = minPairs;
    }

    public evaluate(undoBlocks: UndoBlock[]): MinPairConstraintStatus {
        // TODO: Multistate?
        const currentPairs: number = undoBlocks[0].getParam(
            UndoBlockParam[EPars.nucleotidePairToString(this.pairType)]
        );
        return {
            satisfied: (
                currentPairs >= this.minPairs
            ),
            currentPairs
        };
    }

    public getConstraintBoxConfig(
        status: MinPairConstraintStatus,
        undoBlocks: UndoBlock[],
        targetConditions: any[],
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        let tooltip = ConstraintBox.createTextStyle();

        if (forMissionScreen) {
            tooltip.pushStyle('altTextMain');
        }

        tooltip.append('You must have ')
            .append(`${this.minPairs} or more`)
            .append(`${EPars.getColoredLetter(EPars.nucleotidePairToString(this.pairType).charAt(0))}-`)
            .append(`${EPars.getColoredLetter(EPars.nucleotidePairToString(this.pairType).charAt(1))} pairs.`);

        if (forMissionScreen) {
            tooltip.popStyle();
        }

        return {
            satisfied: status.satisfied,
            clarificationText: `${this.minPairs} OR MORE`,
            statText: status.currentPairs.toString(),
            tooltip
        };
    }
}

export class MinimumGCConstraint extends MinimumPairConstraint {
    public static readonly NAME = 'GCMIN';

    constructor(count: number) {
        super(EPars.RNABASE_GC_PAIR, count);
    }

    /** @override */
    public getConstraintBoxConfig(
        status: MinPairConstraintStatus,
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

export class MinimumAUConstraint extends MinimumPairConstraint {
    public static readonly NAME = 'AU';

    constructor(count: number) {
        super(EPars.RNABASE_AU_PAIR, count);
    }

    /** @override */
    public getConstraintBoxConfig(
        status: MinPairConstraintStatus,
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

export class MinimumGUConstraint extends MinimumPairConstraint {
    public static readonly NAME = 'GU';

    constructor(count: number) {
        super(EPars.RNABASE_GU_PAIR, count);
    }

    /** @override */
    public getConstraintBoxConfig(
        status: MinPairConstraintStatus,
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

export class MinimumAnyPairConstraint extends MinimumPairConstraint {
    public static readonly NAME = 'PAIRS';

    constructor(count: number) {
        super(null, count);
    }

    /** @override */
    public evaluate(undoBlocks: UndoBlock[]): MinPairConstraintStatus {
        // TODO: Multistate?
        const currentPairs: number = (
            undoBlocks[0].getParam(UndoBlockParam['GC'])
            + undoBlocks[0].getParam(UndoBlockParam['AU'])
            + undoBlocks[0].getParam(UndoBlockParam['GU'])
        );
        return {
            satisfied: (
                currentPairs >= this.minPairs
            ),
            currentPairs
        };
    }

    /** @override */
    public getConstraintBoxConfig(
        status: MinPairConstraintStatus,
        undoBlocks: UndoBlock[],
        targetConditions: any[],
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        let tooltip = ConstraintBox.createTextStyle();

        if (forMissionScreen) {
            tooltip.pushStyle('altTextMain');
        }

        tooltip.append(`You must have ${this.minPairs} or more pairs`);

        if (forMissionScreen) {
            tooltip.popStyle();
        }

        return {
            ...super.getConstraintBoxConfig(status, undoBlocks, targetConditions, forMissionScreen),
            tooltip,
            fullTexture: forMissionScreen
                ? BitmapManager.getBitmap(Bitmaps.NovaPairsMissionReq)
                : BitmapManager.getBitmap(Bitmaps.NovaPairsReq)
        };
    }
}

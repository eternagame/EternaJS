import {UndoBlockParam} from 'eterna/UndoBlock';
import EPars from 'eterna/EPars';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import Assert from 'flashbang/util/Assert';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import Constraint, {BaseConstraintStatus, ConstraintContext} from '../Constraint';

enum Pair {
    GC = EPars.RNABASE_GC_PAIR,
    AU = EPars.RNABASE_AU_PAIR,
    GU = EPars.RNABASE_GU_PAIR,
    ANY = EPars.RNABASE_PAIR
}

const PAIR_PARAM_MAP = new Map<Pair, UndoBlockParam>(
    [
        [Pair.GC, UndoBlockParam.GC],
        [Pair.AU, UndoBlockParam.AU],
        [Pair.GU, UndoBlockParam.GU],
        [Pair.ANY, UndoBlockParam.ANY_PAIR]
    ]
);

interface MinPairConstraintStatus extends BaseConstraintStatus {
    currentPairs: number;
}

abstract class MinimumPairConstraint extends Constraint<MinPairConstraintStatus> {
    public readonly pairType: Pair;
    public readonly minPairs: number;

    constructor(pairType: Pair, minPairs: number) {
        super();
        this.pairType = pairType;
        this.minPairs = minPairs;
    }

    public evaluate(context: ConstraintContext): MinPairConstraintStatus {
        // TODO: Multistate?
        const param = PAIR_PARAM_MAP.get(this.pairType);
        Assert.assertIsDefined(param);
        const currentPairs: number = context.undoBlocks[0].getParam(param) as number;
        return {
            satisfied: (
                currentPairs >= this.minPairs
            ),
            currentPairs
        };
    }

    protected _getBaseConstraintBoxConfig(
        status: MinPairConstraintStatus,
        forMissionScreen: boolean
    ): Omit<ConstraintBoxConfig, 'tooltip'> {
        return {
            satisfied: status.satisfied,
            clarificationText: `${this.minPairs} OR MORE`,
            statText: status.currentPairs.toString(),
            showOutline: true
        };
    }

    public getConstraintBoxConfig(
        status: MinPairConstraintStatus,
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        let tooltip = ConstraintBox.createTextStyle();

        if (forMissionScreen) {
            tooltip.pushStyle('altTextMain');
        }

        tooltip.append('You must have ')
            .append(`${this.minPairs} or more `)
            .append(`${EPars.getColoredLetter(EPars.nucleotidePairToString(this.pairType).charAt(0))}-`)
            .append(`${EPars.getColoredLetter(EPars.nucleotidePairToString(this.pairType).charAt(1))} pairs.`);

        if (forMissionScreen) {
            tooltip.popStyle();
        }

        return {
            ...this._getBaseConstraintBoxConfig(status, forMissionScreen),
            tooltip
        };
    }
}

export class MinimumGCConstraint extends MinimumPairConstraint {
    public static readonly NAME = 'GCMIN';

    constructor(count: number) {
        super(Pair.GC, count);
    }

    /** @override */
    public getConstraintBoxConfig(
        status: MinPairConstraintStatus,
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        return {
            ...super.getConstraintBoxConfig(status, forMissionScreen),
            fullTexture: forMissionScreen
                ? BitmapManager.getBitmap(Bitmaps.NovaGCMissionReq)
                : BitmapManager.getBitmap(Bitmaps.NovaGCReq)
        };
    }

    public serialize(): [string, string] {
        return [
            MinimumGCConstraint.NAME,
            this.minPairs.toString()
        ];
    }
}

export class MinimumAUConstraint extends MinimumPairConstraint {
    public static readonly NAME = 'AU';

    constructor(count: number) {
        super(Pair.AU, count);
    }

    /** @override */
    public getConstraintBoxConfig(
        status: MinPairConstraintStatus,
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        return {
            ...super.getConstraintBoxConfig(status, forMissionScreen),
            fullTexture: forMissionScreen
                ? BitmapManager.getBitmap(Bitmaps.NovaAUMissionReq)
                : BitmapManager.getBitmap(Bitmaps.NovaAUReq)
        };
    }

    public serialize(): [string, string] {
        return [
            MinimumAUConstraint.NAME,
            this.minPairs.toString()
        ];
    }
}

export class MinimumGUConstraint extends MinimumPairConstraint {
    public static readonly NAME = 'GU';

    constructor(count: number) {
        super(Pair.GU, count);
    }

    /** @override */
    public getConstraintBoxConfig(
        status: MinPairConstraintStatus,
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        return {
            ...super.getConstraintBoxConfig(status, forMissionScreen),
            fullTexture: forMissionScreen
                ? BitmapManager.getBitmap(Bitmaps.NovaGUMissionReq)
                : BitmapManager.getBitmap(Bitmaps.NovaGUReq)
        };
    }

    public serialize(): [string, string] {
        return [
            MinimumGUConstraint.NAME,
            this.minPairs.toString()
        ];
    }
}

export class MinimumAnyPairConstraint extends MinimumPairConstraint {
    public static readonly NAME = 'PAIRS';

    constructor(count: number) {
        super(Pair.ANY, count);
    }

    /** @override */
    public getConstraintBoxConfig(
        status: MinPairConstraintStatus,
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
            ...this._getBaseConstraintBoxConfig(status, forMissionScreen),
            tooltip,
            fullTexture: forMissionScreen
                ? BitmapManager.getBitmap(Bitmaps.NovaPairsMissionReq)
                : BitmapManager.getBitmap(Bitmaps.NovaPairsReq)
        };
    }

    public serialize(): [string, string] {
        return [
            MinimumAnyPairConstraint.NAME,
            this.minPairs.toString()
        ];
    }
}

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

interface MaxPairConstraintStatus extends BaseConstraintStatus {
    currentPairs: number;
}

abstract class MaximumPairConstraint extends Constraint<MaxPairConstraintStatus> {
    public readonly pairType: Pair;
    public readonly maxPairs: number;

    constructor(pairType: Pair, maxPairs: number) {
        super();
        this.pairType = pairType;
        this.maxPairs = maxPairs;
    }

    public evaluate(context: ConstraintContext): MaxPairConstraintStatus {
        // TODO: Multistate?
        // AMW: This is non-null by definition.
        const param = PAIR_PARAM_MAP.get(this.pairType);
        Assert.assertIsDefined(param);
        const currentPairs: number = context.undoBlocks[0].getParam(param) as number;
        return {
            satisfied: (
                currentPairs <= this.maxPairs
            ),
            currentPairs
        };
    }

    public getConstraintBoxConfig(
        status: MaxPairConstraintStatus,
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        let tooltip = ConstraintBox.createTextStyle();

        if (forMissionScreen) {
            tooltip.pushStyle('altTextMain');
        }

        tooltip.append('You must have ');

        if (this.maxPairs === 0) {
            tooltip.append('no ', 'altText');
        } else {
            tooltip.append('at most', 'altText')
                .append(` ${this.maxPairs} `);
        }

        tooltip
            .append(`${EPars.getColoredLetter(EPars.nucleotidePairToString(this.pairType).charAt(0))}-`)
            .append(`${EPars.getColoredLetter(EPars.nucleotidePairToString(this.pairType).charAt(1))} pairs.`);

        if (forMissionScreen) {
            tooltip.popStyle();
        }

        const clarificationText = this.maxPairs === 0
            ? `NO ${EPars.nucleotidePairToString(this.pairType)} PAIRS`
            : `${this.maxPairs} OR FEWER`;

        return {
            satisfied: status.satisfied,
            clarificationText,
            statText: status.currentPairs.toString(),
            tooltip,
            showOutline: true
        };
    }
}

export class MaximumGCConstraint extends MaximumPairConstraint {
    public static readonly NAME = 'GC';

    constructor(count: number) {
        super(Pair.GC, count);
    }

    /** @override */
    public getConstraintBoxConfig(
        status: MaxPairConstraintStatus,
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        const [missionBitmap, constraintBitmap] = this.maxPairs === 0
            ? [Bitmaps.NovaNoGCMissionReq, Bitmaps.NovaNoGCReq]
            : [Bitmaps.NovaGCMissionReq, Bitmaps.NovaGCReq];

        return {
            ...super.getConstraintBoxConfig(status, forMissionScreen),
            fullTexture: forMissionScreen
                ? BitmapManager.getBitmap(missionBitmap)
                : BitmapManager.getBitmap(constraintBitmap)
        };
    }

    public serialize(): [string, string] {
        return [
            MaximumGCConstraint.NAME,
            this.maxPairs.toString()
        ];
    }
}

export class MaximumAUConstraint extends MaximumPairConstraint {
    public static readonly NAME = 'AUMAX';

    constructor(count: number) {
        super(Pair.AU, count);
    }

    /** @override */
    public getConstraintBoxConfig(
        status: MaxPairConstraintStatus,
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        const [missionBitmap, constraintBitmap] = this.maxPairs === 0
            ? [Bitmaps.NovaNoAUMissionReq, Bitmaps.NovaNoAUReq]
            : [Bitmaps.NovaAUMissionReq, Bitmaps.NovaAUReq];

        return {
            ...super.getConstraintBoxConfig(status, forMissionScreen),
            fullTexture: forMissionScreen
                ? BitmapManager.getBitmap(missionBitmap)
                : BitmapManager.getBitmap(constraintBitmap)
        };
    }

    public serialize(): [string, string] {
        return [
            MaximumAUConstraint.NAME,
            this.maxPairs.toString()
        ];
    }
}

export class MaximumGUConstraint extends MaximumPairConstraint {
    public static readonly NAME = 'GUMAX';

    constructor(count: number) {
        super(Pair.GU, count);
    }

    /** @override */
    public getConstraintBoxConfig(
        status: MaxPairConstraintStatus,
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        const [missionBitmap, constraintBitmap] = this.maxPairs === 0
            ? [Bitmaps.NovaNoGUMissionReq, Bitmaps.NovaNoGUReq]
            : [Bitmaps.NovaGUMissionReq, Bitmaps.NovaGUReq];

        return {
            ...super.getConstraintBoxConfig(status, forMissionScreen),
            fullTexture: forMissionScreen
                ? BitmapManager.getBitmap(missionBitmap)
                : BitmapManager.getBitmap(constraintBitmap)
        };
    }

    public serialize(): [string, string] {
        return [
            MaximumGUConstraint.NAME,
            this.maxPairs.toString()
        ];
    }
}

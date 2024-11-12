import {Texture, Container, Sprite} from 'pixi.js';
import EPars from 'eterna/EPars';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import {TextureUtil} from 'flashbang';
import Sequence from 'eterna/rnatypes/Sequence';
import Utility from 'eterna/util/Utility';
import Constraint, {BaseConstraintStatus, ConstraintContext} from '../Constraint';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';

interface TLoopConstraintStatus extends BaseConstraintStatus {
    found5Prime: boolean;
    found3Prime: boolean;
}

// NNAGUUGGGANN NNUUCGAUCNN
// ((.....[..)) ((..]....))
// Derived from the tRNA(phe)(E. coli) secondary structure (based on DSSR) from PDB ID 1EHZ
export const TLoop5Seq = Sequence.fromSequenceString('??AGUUGGGA??');
export const TLoop3Seq = Sequence.fromSequenceString('??UUCGAUC??');
export const TLoopPairs = (tloop5Start: number, tloop3Start: number) => [
    // Pair mappings for 5' region
    [tloop5Start, tloop5Start + 11],
    [tloop5Start + 1, tloop5Start + 10],
    ...Utility.range(2, 7).map((n) => [tloop5Start + n, -1]),
    [tloop5Start + 7, tloop3Start + 4],
    ...Utility.range(8, 10).map((n) => [tloop5Start + n, -1]),
    // Pair mappings for 3' region
    [tloop3Start, tloop3Start + 10],
    [tloop3Start + 1, tloop3Start + 9],
    ...Utility.range(2, 4).map((n) => [tloop3Start + n, -1]),
    [tloop3Start + 4, tloop5Start + 7],
    ...Utility.range(5, 9).map((n) => [tloop3Start + n, -1])
];

export default class TLoopConstraint extends Constraint<TLoopConstraintStatus> {
    public static readonly NAME = 'TLOOP';

    public evaluate(context: ConstraintContext): TLoopConstraintStatus {
        const undoBlock = context.undoBlocks[0];
        const pseudoknots = (
            undoBlock.targetConditions !== undefined
            && undoBlock.targetConditions['type'] === 'pseudoknot'
        );
        const naturalPairs = undoBlock.getPairs(EPars.DEFAULT_TEMPERATURE, pseudoknots);
        const seq = undoBlock.sequence.toString();
        const seqMatch5 = Array.from(seq.matchAll(new RegExp(TLoop5Seq.toString().replaceAll('?', '.'), 'g')));
        const seqMatch3 = Array.from(seq.matchAll(new RegExp(TLoop3Seq.toString().replaceAll('?', '.'), 'g')));

        for (const candidate5 of seqMatch5) {
            for (const candidate3 of seqMatch3) {
                const c5Start = candidate5.index;
                const c3Start = candidate3.index;
                if (
                    (c5Start + TLoop5Seq.length - 1) < c3Start
                    && TLoopPairs(c5Start, c3Start).every(
                        ([a, b]) => naturalPairs.pairingPartner(a) === b
                    )
                ) {
                    return {
                        satisfied: true,
                        found5Prime: true,
                        found3Prime: true
                    };
                }
            }
        }

        return {
            satisfied: false,
            found5Prime: seqMatch5.length > 0,
            found3Prime: seqMatch3.length > 0
        };
    }

    public serialize(): [string, string] {
        return [
            TLoopConstraint.NAME,
            '0'
        ];
    }

    public getConstraintBoxConfig(
        status: TLoopConstraintStatus,
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        let statText: string;

        if (forMissionScreen) {
            statText = '';
        } else if (status.satisfied) {
            statText = 'Success!';
        } else if (!status.found5Prime || !status.found3Prime) {
            statText = 'Missing';
        } else {
            statText = 'Not Forming';
        }

        const tooltip = ConstraintBox.createTextStyle();
        if (forMissionScreen) {
            tooltip.pushStyle('altTextMain');
        }

        tooltip.append(`Your design must contain the T-loop sequence (${TLoop5Seq.toString().replaceAll('?', 'N')}--${TLoop3Seq.toString().replaceAll('?', 'N')}) and form the T-loop structure`);
        if (!forMissionScreen) {
            tooltip.append(`\n\nThe T-loop 5' sequence ${TLoop5Seq.toString().replaceAll('?', 'N')} is currently `)
                .append(status.found5Prime ? 'present' : 'missing', 'altText')
                .append(`\n\nThe T-loop 3' sequence ${TLoop3Seq.toString().replaceAll('?', 'N')} is currently `)
                .append(status.found3Prime ? 'present' : 'missing', 'altText')
                .append('\n\nThe T-loop structure is currently ')
                .append(status.satisfied ? 'forming' : 'not forming', 'altText');
        }

        if (forMissionScreen) {
            tooltip.popStyle();
        }

        return {
            satisfied: status.satisfied,
            icon: TLoopConstraint._icon,
            drawBG: true,
            showOutline: true,
            statText,
            tooltip
        };
    }

    private static get _icon(): Texture {
        const icon = new Container();

        const img = new Sprite(BitmapManager.getBitmap(Bitmaps.TLoopIcon));
        img.scale.x = 0.55;
        img.scale.y = 0.55;
        icon.addChild(img);

        return TextureUtil.renderToTexture(icon);
    }
}

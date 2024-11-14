import {Texture, Container, Sprite} from 'pixi.js';
import EPars from 'eterna/EPars';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import {TextureUtil} from 'flashbang';
import Sequence from 'eterna/rnatypes/Sequence';
import Constraint, {BaseConstraintStatus, ConstraintContext} from '../Constraint';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';

interface TLoopConstraintStatus extends BaseConstraintStatus {
    found5Prime: boolean;
    found3Prime: boolean;
}

// NNAGUUGGGANN NNUUCGAUCNN
// ((xxxxx[xx)) ((xx]xxxx))
// Derived from the tRNA(phe)(E. coli) secondary structure (based on DSSR) from PDB ID 1EHZ
// The bases marked "x" here may be paired or unpaired
export const TLoopSeqA = Sequence.fromSequenceString('??AGUUGGGA??');
export const TLoopSeqB = Sequence.fromSequenceString('??UUCGAUC??');
export const TLoopPairs = (tloopAStart: number, tloopBStart: number) => [
    // Pair mappings within 5' region
    [tloopAStart, tloopAStart + 11],
    [tloopAStart + 1, tloopAStart + 10],
    // Pair mappings within 3' region
    [tloopBStart, tloopBStart + 10],
    [tloopBStart + 1, tloopBStart + 9],
    // Cross-region pairs
    [tloopAStart + 7, tloopBStart + 4]
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
        const tloopASeqMatch = Array.from(seq.matchAll(new RegExp(TLoopSeqA.toString().replaceAll('?', '.'), 'g')));
        const tloopBSeqMatch = Array.from(seq.matchAll(new RegExp(TLoopSeqB.toString().replaceAll('?', '.'), 'g')));

        for (const candidateForA of tloopASeqMatch) {
            for (const candidateForB of tloopBSeqMatch) {
                const aStart = candidateForA.index;
                const bStart = candidateForB.index;
                if (
                    // Ensure the two candidate regions do not overlap
                    (
                        (aStart + TLoopSeqA.length - 1) < bStart
                        || (bStart + TLoopSeqB.length - 1) < aStart
                    )
                    && TLoopPairs(aStart, bStart).every(
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
            found5Prime: tloopASeqMatch.length > 0,
            found3Prime: tloopBSeqMatch.length > 0
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

        tooltip.append(`Your design must contain the T-loop sequence (${TLoopSeqA.toString().replaceAll('?', 'N')}--${TLoopSeqB.toString().replaceAll('?', 'N')}) and form the T-loop structure`);
        if (!forMissionScreen) {
            tooltip.append(`\n\nThe T-loop sequence ${TLoopSeqA.toString().replaceAll('?', 'N')} is currently `)
                .append(status.found5Prime ? 'present' : 'missing', 'altText')
                .append(`\n\nThe T-loop sequence ${TLoopSeqB.toString().replaceAll('?', 'N')} is currently `)
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

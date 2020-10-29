import {UndoBlockParam} from 'eterna/UndoBlock';
import BitmapManager from 'eterna/resources/BitmapManager';
import {TextureUtil} from 'flashbang';
import {
    Container, Texture, Sprite, Point
} from 'pixi.js';
import Bitmaps from 'eterna/resources/Bitmaps';
import Utility from 'eterna/util/Utility';
import {HighlightType} from 'eterna/pose2D/HighlightBox';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import Constraint, {BaseConstraintStatus, ConstraintContext, HighlightInfo} from '../Constraint';

interface RangePairedMaxConstraintStatus extends BaseConstraintStatus {
    currentMeanPairedProb: number;
}

/**
 * RangePairedMaxConstraint ensures that the average paired probability over a
 * certain loop must be no more than a threshold value.
 *
 * Definition for this constraint type looks like:
 *     MAXMEANPAIREDPROB,0.30|2250 2251-2254
 */
export default class RangePairedMaxConstraint extends Constraint<RangePairedMaxConstraintStatus> {
    public readonly maxMeanPairedProb: number;
    public readonly indices: number[];

    constructor(def: string) {
        super();
        this.maxMeanPairedProb = 1.0;
        this.indices = [];

        // Parse this side of the constraint definition
        const definitionComponents = def.split('|');
        this.maxMeanPairedProb = Number(definitionComponents[0]);
        this.indices = Utility.getIndices(definitionComponents[1]) as number[];
    }

    public evaluate(constraintContext: ConstraintContext): RangePairedMaxConstraintStatus {
        // TODO: Multistate? pseudoknots?

        // If this gets called before any folding has happened it'll be
        // undefined. Instead of forcing more folding, try saying it's
        // zero.
        // AMW: no
        if (constraintContext.undoBlocks[0].getParam(
            UndoBlockParam.DOTPLOT,
            37,
            false
        ) === undefined) {
            constraintContext.undoBlocks[0].updateMeltingPointAndDotPlot(false);
        }

        // For some reason the null-coalescing operator ?? is not supported here.
        const dotplot = constraintContext.undoBlocks[0].getParam(
            UndoBlockParam.DOTPLOT,
            37,
            false
        ) as number[] | undefined || [];

        // Look through the dotplot and find any pairs involving the implicated
        // residues.
        const probForResidues = new Map<number, number>();
        for (const idx of this.indices) {
            probForResidues.set(idx, 0.0);
        }
        for (let ii = 0; ii < dotplot.length; ii += 3) {
            // if either index is a number-of-interest, add probability in.
            // Dotplot indices are zero-indexed
            if (this.indices.includes(dotplot[ii] + 1) && this.indices.includes(dotplot[ii + 1] + 1)) {
                continue;
            }

            if (this.indices.includes(dotplot[ii] + 1)) {
                probForResidues.set(dotplot[ii], probForResidues.get(dotplot[ii]) as number + dotplot[ii + 2]);
            }
            if (this.indices.includes(dotplot[ii + 1] + 1)) {
                probForResidues.set(dotplot[ii + 1], probForResidues.get(dotplot[ii + 1]) as number + dotplot[ii + 2]);
            }
        }

        let totProb = 0.0;
        for (const key of probForResidues.keys()) {
            totProb += probForResidues.get(key) as number;
        }

        return {
            satisfied: totProb / this.indices.length >= this.maxMeanPairedProb,
            currentMeanPairedProb: totProb / this.indices.length
        };
    }

    public getConstraintBoxConfig(
        status: RangePairedMaxConstraintStatus,
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        const tooltip = ConstraintBox.createTextStyle();

        if (forMissionScreen) {
            tooltip.pushStyle('altTextMain');
        }

        tooltip.append(`The average base pair probability of nt ${Utility.arrayToRangeString(this.indices)} must be at most`, 'altText')
            .append(` ${this.maxMeanPairedProb}.`);

        if (forMissionScreen) {
            tooltip.popStyle();
        }

        return {
            satisfied: status.satisfied,
            tooltip,
            clarificationText: `${this.maxMeanPairedProb} OR LESS`,
            statText: status.currentMeanPairedProb.toFixed(3),
            showOutline: true,
            drawBG: true,
            icon: RangePairedMaxConstraint._icon
        };
    }

    public getHighlight(
        _status: BaseConstraintStatus,
        _context: ConstraintContext
    ): HighlightInfo {
        return {
            ranges: this.indices,
            color: HighlightType.RESTRICTED
        };
    }

    private static get _icon(): Texture {
        const icon = new Container();

        const base1 = new Sprite(BitmapManager.getBitmap(Bitmaps.CleanDotPlotIcon));
        base1.width = 24;
        base1.height = 24;
        base1.position = new Point(50, 50);
        icon.addChild(base1);

        return TextureUtil.renderToTexture(icon);
    }

    public static readonly NAME = 'MAXMEANPAIREDPROB';

    public serialize(): [string, string] {
        return [
            RangePairedMaxConstraint.NAME,
            this.maxMeanPairedProb.toString()
        ];
    }
}

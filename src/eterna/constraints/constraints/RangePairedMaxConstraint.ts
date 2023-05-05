import {UndoBlockParam} from 'eterna/UndoBlock';
import BitmapManager from 'eterna/resources/BitmapManager';
import {TextureUtil} from 'flashbang';
import {
    Container, Texture, Sprite
} from 'pixi.js';
import Bitmaps from 'eterna/resources/Bitmaps';
import Utility from 'eterna/util/Utility';
import {HighlightType} from 'eterna/pose2D/HighlightBox';
import Vienna from 'eterna/folding/Vienna';
import Vienna2 from 'eterna/folding/Vienna2';
import EPars from 'eterna/EPars';
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
    private _evalIndices: number[] | null = null;

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
        // TODO: Multistate?
        const undoBlock = constraintContext.undoBlocks[0];

        const pseudoknots = (undoBlock.targetConditions !== undefined
            && undoBlock.targetConditions['type'] === 'pseudoknot');

        // If this gets called before any folding has happened it'll be
        // undefined. Instead of forcing more folding, try saying it's
        // zero.
        // AMW: no
        if (undoBlock.getParam(UndoBlockParam.DOTPLOT, EPars.DEFAULT_TEMPERATURE, pseudoknots) === undefined) {
            undoBlock.updateMeltingPointAndDotPlot(pseudoknots);
        }

        if (!this._evalIndices) {
            this._evalIndices = this.indices.map((ii) => {
                if (undoBlock.targetConditions
                    && 'custom-numbering' in undoBlock.targetConditions) {
                    const cn = Utility.numberingJSONToArray(
                        undoBlock.targetConditions['custom-numbering'] as string
                    ) as (number | null)[];
                    for (let jj = 0; jj < cn.length; ++jj) {
                        if (ii === cn[jj]) {
                            return jj;
                        }
                    }
                    return 0;
                } else {
                    return ii;
                }
            });
        }

        // For some reason the null-coalescing operator ?? is not supported here.
        const dotplot = undoBlock.getParam(UndoBlockParam.DOTPLOT, EPars.DEFAULT_TEMPERATURE, pseudoknots) as number[];

        // Look through the dotplot and find any pairs involving the implicated
        // residues.
        const probForResidues = new Map<number, number>();
        for (const idx of this._evalIndices) {
            probForResidues.set(idx, 0.0);
        }

        const square: boolean = (undoBlock.folderName === Vienna.NAME
            || undoBlock.folderName === Vienna2.NAME);

        const finalOffset = (undoBlock.getPairs(EPars.DEFAULT_TEMPERATURE, pseudoknots)?.numPairs() ?? 0) * 3;

        for (let ii = 0; ii < dotplot.length - finalOffset; ii += 3) {
            // if either index is a number-of-interest, add probability in.
            // Dotplot indices are zero-indexed
            if (this._evalIndices.includes(dotplot[ii] + 1)
                && this._evalIndices.includes(dotplot[ii + 1] + 1)) {
                continue;
            }

            if (this._evalIndices.includes(dotplot[ii] + 1)) {
                probForResidues.set(dotplot[ii] + 1,
                    probForResidues.get(dotplot[ii] + 1) as number
                        + (square ? dotplot[ii + 2] * dotplot[ii + 2] : dotplot[ii + 2]));
            }
            if (this._evalIndices.includes(dotplot[ii + 1] + 1)) {
                probForResidues.set(dotplot[ii + 1] + 1,
                    probForResidues.get(dotplot[ii + 1] + 1) as number
                        + (square ? dotplot[ii + 2] * dotplot[ii + 2] : dotplot[ii + 2]));
            }
        }

        let totProb = 0.0;
        for (const key of probForResidues.keys()) {
            totProb += probForResidues.get(key) as number;
        }

        return {
            satisfied: totProb / this._evalIndices.length <= this.maxMeanPairedProb,
            currentMeanPairedProb: totProb / this._evalIndices.length
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
            ranges: this.toRanges(this._evalIndices ?? []),
            color: HighlightType.RESTRICTED
        };
    }

    private toRanges(idxs: number[]): number[] {
        // Return contiguous ranges of indices.
        const ret: number[] = [];
        ret.push(idxs[0]);
        for (let ii = 1; ii < idxs.length; ++ii) {
            if (idxs[ii] !== idxs[ii - 1] + 1) {
                ret.push(idxs[ii - 1]);
                ret.push(idxs[ii]);
            }
        }
        if (ret.length % 2 === 1) {
            ret.push(idxs[idxs.length - 1]);
        }
        return ret;
    }

    private static get _icon(): Texture {
        const icon = new Container();

        const base1 = new Sprite(BitmapManager.getBitmap(Bitmaps.CleanDotPlotIcon));
        base1.width = 24;
        base1.height = 24;
        base1.position.set(50, 50);
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

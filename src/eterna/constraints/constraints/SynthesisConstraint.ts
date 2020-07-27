import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import {StyledTextBuilder} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import EPars from 'eterna/EPars';
import {HighlightType} from 'eterna/pose2D/HighlightBox';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import {ConsecutiveAConstraint, ConsecutiveGConstraint, ConsecutiveCConstraint} from './ConsecutiveBaseConstraint';
import Constraint, {BaseConstraintStatus, HighlightInfo, ConstraintContext} from '../Constraint';

interface SynthConstraintStatus extends BaseConstraintStatus {
    currentA: number;
    currentG: number;
    currentC: number;
}

export default class SynthesisConstraint extends Constraint<SynthConstraintStatus> {
    public static readonly NAME = 'LAB_REQUIREMENTS';

    public static readonly AMAX = 5;
    public static readonly GMAX = 4;
    public static readonly CMAX = 5;

    public evaluate(context: ConstraintContext): SynthConstraintStatus {
        let aRet = this._consecutiveAConstraint.evaluate(context);
        let gRet = this._consecutiveGConstraint.evaluate(context);
        let cRet = this._consecutiveCConstraint.evaluate(context);

        return {
            satisfied: [aRet, gRet, cRet].every((ret) => ret.satisfied),
            currentA: aRet.currentConsecutive,
            currentG: aRet.currentConsecutive,
            currentC: cRet.currentConsecutive
        };
    }

    public getConstraintBoxConfig(
        status: SynthConstraintStatus,
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        let statText: StyledTextBuilder | string;

        if (forMissionScreen) {
            statText = '';
        } else if (status.satisfied) {
            statText = 'ok';
        } else {
            statText = new StyledTextBuilder({
                fontFamily: Fonts.STDFONT,
                fontSize: 11,
                fill: 0xC0DCE7,
                letterSpacing: -0.5
            });
            statText.addStyle('redText', {fill: 0xff0000});

            if (!(status.currentG < SynthesisConstraint.GMAX)) {
                statText.append((status.currentG).toString(), 'redText').append('G');
            }

            if (!(status.currentC < SynthesisConstraint.CMAX)) {
                statText.append((status.currentC).toString(), 'redText').append('C');
            }

            if (!(status.currentA < SynthesisConstraint.AMAX)) {
                statText.append((status.currentA).toString(), 'redText').append('A');
            }
        }

        let tooltip = ConstraintBox.createTextStyle();
        if (forMissionScreen) {
            tooltip.pushStyle('altTextMain');
        }

        tooltip.append('You must have:\n')
            .append('- ').append('at most', 'altText').append(` ${SynthesisConstraint.GMAX - 1} `)
            .append(`${EPars.getColoredLetter('G')}s in a row\n`)
            .append('- ')
            .append('at most', 'altText')
            .append(` ${SynthesisConstraint.CMAX - 1} `)
            .append(`${EPars.getColoredLetter('C')}s in a row\n`)
            .append('- ')
            .append('at most', 'altText')
            .append(` ${SynthesisConstraint.AMAX - 1} `)
            .append(`${EPars.getColoredLetter('A')}s in a row\n`);

        if (forMissionScreen) {
            tooltip.popStyle();
        }

        return {
            satisfied: status.satisfied,
            icon: BitmapManager.getBitmap(Bitmaps.ImgLabReq),
            drawBG: true,
            showOutline: true,
            statText,
            tooltip
        };
    }

    public getHighlight(status: SynthConstraintStatus, context: ConstraintContext): HighlightInfo {
        return {
            ranges: [
                ...this._consecutiveAConstraint.getHighlight(
                    this._consecutiveAConstraint.evaluate(context),
                    context
                ).ranges,
                ...this._consecutiveGConstraint.getHighlight(
                    this._consecutiveGConstraint.evaluate(context),
                    context
                ).ranges,
                ...this._consecutiveCConstraint.getHighlight(
                    this._consecutiveCConstraint.evaluate(context),
                    context
                ).ranges
            ],
            color: HighlightType.RESTRICTED
        };
    }

    public serialize(): [string, string] {
        return [
            SynthesisConstraint.NAME,
            '0'
        ];
    }

    private readonly _consecutiveAConstraint = new ConsecutiveAConstraint(SynthesisConstraint.AMAX);
    private readonly _consecutiveGConstraint = new ConsecutiveGConstraint(SynthesisConstraint.GMAX);
    private readonly _consecutiveCConstraint = new ConsecutiveCConstraint(SynthesisConstraint.CMAX);
}

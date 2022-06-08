import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import Constraint, {BaseConstraintStatus, ConstraintContext} from '../Constraint';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';

export default class PseudoknotConstraint extends Constraint<BaseConstraintStatus> {
    public static readonly NAME = 'PSEUDOKNOT';

    public evaluate(context: ConstraintContext): BaseConstraintStatus {
        const undoBlock = context.undoBlocks[0];
        const pseudoknots = (
            undoBlock.targetConditions !== undefined
            && undoBlock.targetConditions['type'] === 'pseudoknot'
        );

        if (!pseudoknots) {
            throw new Error('PSEUDOKNOT constraint defined for a puzzle not defined to fold in pseudoknot mode');
        }

        return {
            satisfied: undoBlock.getPairs(37, true).onlyPseudoknots().numPairs() > 0
        };
    }

    public getConstraintBoxConfig(
        status: BaseConstraintStatus,
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        let statText: string;

        if (forMissionScreen) {
            statText = '';
        } else if (status.satisfied) {
            statText = 'Success!';
        } else {
            statText = 'Not present';
        }

        const tooltip = ConstraintBox.createTextStyle();
        if (forMissionScreen) {
            tooltip.pushStyle('altTextMain');
        }

        tooltip.append('Your sequence must form a pseudoknot');

        if (forMissionScreen) {
            tooltip.popStyle();
        }

        return {
            satisfied: status.satisfied,
            icon: BitmapManager.getBitmap(Bitmaps.PseudoknotReqIcon),
            drawBG: true,
            showOutline: true,
            statText,
            tooltip
        };
    }

    public serialize(): [string, string] {
        return [
            PseudoknotConstraint.NAME,
            '0'
        ];
    }
}

import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import EPars from 'eterna/EPars';
import {UndoBlockParam} from 'eterna/UndoBlock';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import ConstraintContext from '../ConstraintContext';
import Constraint, {BaseConstraintStatus} from '../Constraint';

export default class NOGUConstraint extends Constraint<BaseConstraintStatus> {
    public static readonly NAME = 'NOGU';

    public evaluate(context: ConstraintContext) {
        const numGU = context.undoBlocks[0].getParam(UndoBlockParam.GU);
        return {
            satisfied: numGU === 0
        };
    }

    public getConstraintBoxConfig(status: BaseConstraintStatus, forMissionScreen: boolean): ConstraintBoxConfig {
        let tooltip = ConstraintBox.createTextStyle();

        if (forMissionScreen) {
            tooltip.pushStyle('altTextMain');
        }

        tooltip.append('You must have no ')
            .append(`${EPars.getColoredLetter('U')}-${EPars.getColoredLetter('G')}`)
            .append(' pairs.');

        if (forMissionScreen) {
            tooltip.popStyle();
        }

        return {
            satisfied: status.satisfied,
            clarificationText: 'NO UG PAIRS',
            statText: '0',
            showOutline: true,
            tooltip,
            fullTexture: forMissionScreen
                ? BitmapManager.getBitmap(Bitmaps.NovaNoGUMissionReq)
                : BitmapManager.getBitmap(Bitmaps.NovaNoGUReq)

        };
    }

    public serialize(): [string, string] {
        return [NOGUConstraint.NAME, '0'];
    }
}

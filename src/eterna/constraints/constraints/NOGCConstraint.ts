import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import EPars from 'eterna/EPars';
import {UndoBlockParam} from 'eterna/UndoBlock';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import ConstraintContext from '../ConstraintContext';
import Constraint, {BaseConstraintStatus} from '../Constraint';

export default class NOGCConstraint extends Constraint<BaseConstraintStatus> {
    public static readonly NAME = 'NOGC';

    public evaluate(context: ConstraintContext) {
        const numGC = context.undoBlocks[0].getParam(UndoBlockParam.GC);
        return {
            satisfied: numGC === 0
        };
    }

    public getConstraintBoxConfig(status: BaseConstraintStatus, forMissionScreen: boolean): ConstraintBoxConfig {
        let tooltip = ConstraintBox.createTextStyle();

        if (forMissionScreen) {
            tooltip.pushStyle('altTextMain');
        }

        tooltip.append('You must have no ')
            .append(`${EPars.getColoredLetter('G')}-${EPars.getColoredLetter('C')}`)
            .append(' pairs.');

        if (forMissionScreen) {
            tooltip.popStyle();
        }

        return {
            satisfied: status.satisfied,
            clarificationText: 'NO GC PAIRS',
            statText: '0',
            showOutline: true,
            tooltip,
            fullTexture: forMissionScreen
                ? BitmapManager.getBitmap(Bitmaps.NovaNoGCMissionReq)
                : BitmapManager.getBitmap(Bitmaps.NovaNoGCReq)

        };
    }

    public serialize(): [string, string] {
        return [NOGCConstraint.NAME, '0'];
    }
}

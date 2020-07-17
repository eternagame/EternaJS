import SolutionManager from 'eterna/puzzle/SolutionManager';
import EPars from 'eterna/EPars';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import Constraint, {BaseConstraintStatus, ConstraintContext} from '../Constraint';

export default class BarcodeConstraint extends Constraint<BaseConstraintStatus> {
    public static readonly NAME = 'BARCODE';

    public evaluate(context: ConstraintContext): BaseConstraintStatus {
        return {
            satisfied: !SolutionManager.instance.checkRedundancyByHairpin(
                EPars.sequenceToString(context.undoBlocks[0].sequence)
            )
        };
    }

    public getConstraintBoxConfig(
        status: BaseConstraintStatus,
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        let tooltip = ConstraintBox.createTextStyle();

        if (forMissionScreen) {
            tooltip.pushStyle('altTextMain');
        }

        tooltip.append('You must have a ');

        if (forMissionScreen) {
            tooltip.append('unique ', 'altText');
        } else {
            tooltip.append('unique ');
        }

        tooltip.append('barcode.');

        if (forMissionScreen) {
            tooltip.popStyle();
        }

        return {
            satisfied: status.satisfied,
            fullTexture: forMissionScreen
                ? BitmapManager.getBitmap(Bitmaps.NovaBarcodeMissionReq)
                : BitmapManager.getBitmap(Bitmaps.NovaBarcodeReq),
            clarificationText: 'MUST BE UNIQUE',
            tooltip,
            showOutline: true
        };
    }

    public serialize(): [string, string] {
        return [
            BarcodeConstraint.NAME,
            '0'
        ];
    }
}

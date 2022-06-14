import SolutionManager from 'eterna/puzzle/SolutionManager';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import Constraint, {BaseConstraintStatus, ConstraintContext} from '../Constraint';

export default class BarcodeConstraint extends Constraint<BaseConstraintStatus> {
    public static readonly NAME = 'BARCODE';

    public evaluate(context: ConstraintContext): BaseConstraintStatus {
        if (!context.puzzle) throw new Error('Barcode constraint is only available in puzzle solver');
        return {
            satisfied: !SolutionManager.instance.isHairpinUsed(
                context.puzzle.getBarcodeHairpin(context.undoBlocks[0].sequence).sequenceString()
            )
        };
    }

    public getConstraintBoxConfig(
        status: BaseConstraintStatus,
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        const tooltip = ConstraintBox.createTextStyle();

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

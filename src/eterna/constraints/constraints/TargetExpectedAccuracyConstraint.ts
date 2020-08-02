import UndoBlock, {UndoBlockParam} from 'eterna/UndoBlock';
import EPars from 'eterna/EPars';
import BitmapManager from 'eterna/resources/BitmapManager';
import {TextureUtil} from 'flashbang';
import {
    Container, Texture, Sprite, Point
} from 'pixi.js';
import Bitmaps from 'eterna/resources/Bitmaps';
import FolderManager from 'eterna/folding/FolderManager';
import Folder from 'eterna/folding/Folder';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import Constraint, {BaseConstraintStatus, ConstraintContext} from '../Constraint';

interface TargetExpectedAccuracyConstraintStatus extends BaseConstraintStatus {
    currentExpectedAccuracy: number;
}

export default class TargetExpectedAccuracyConstraint extends Constraint<TargetExpectedAccuracyConstraintStatus> {
    public readonly targetExpectedAccuracy: number;

    constructor(targetExpectedAccuracy: number) {
        super();
        this.targetExpectedAccuracy = targetExpectedAccuracy;
    }

    public evaluate(constraintContext: ConstraintContext): TargetExpectedAccuracyConstraintStatus {
        // TODO: Multistate? pseudoknots?

        // If this gets called before any folding has happened it'll be
        // undefined. Instead of forcing more folding, try saying it's
        // zero.
        // AMW: no
        if (constraintContext.undoBlocks[0].getParam(
            UndoBlockParam.TARGET_EXPECTED_ACCURACY,
            37,
            false
        ) === undefined) {
            constraintContext.undoBlocks[0].updateMeltingPointAndDotPlot(false);
        }
        let expectedAccuracy = constraintContext.undoBlocks[0].getParam(
            UndoBlockParam.TARGET_EXPECTED_ACCURACY,
            37,
            false
        ) as number | undefined;
        if (expectedAccuracy === undefined) {
            expectedAccuracy = 0;
        }

        return {
            satisfied: expectedAccuracy >= this.targetExpectedAccuracy,
            currentExpectedAccuracy: expectedAccuracy
        };
    }

    public getConstraintBoxConfig(
        status: TargetExpectedAccuracyConstraintStatus,
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        let tooltip = ConstraintBox.createTextStyle();

        if (forMissionScreen) {
            tooltip.pushStyle('altTextMain');
        }

        tooltip.append('The expected accuracy of the target structure must be at least', 'altText')
            .append(` ${this.targetExpectedAccuracy}.`);

        if (forMissionScreen) {
            tooltip.popStyle();
        }

        return {
            satisfied: status.satisfied,
            tooltip,
            clarificationText: `${this.targetExpectedAccuracy} OR MORE`,
            statText: status.currentExpectedAccuracy.toFixed(3),
            showOutline: true,
            drawBG: true,
            icon: TargetExpectedAccuracyConstraint._icon
        };
    }

    private static get _icon(): Texture {
        let icon = new Container();

        let base1 = new Sprite(BitmapManager.getBitmap(Bitmaps.CleanDotPlotIcon));
        base1.width = 24;
        base1.height = 24;
        base1.position = new Point(50, 50);
        icon.addChild(base1);

        return TextureUtil.renderToTexture(icon);
    }

    public static readonly NAME = 'TARGETEXPECTEDACCURACYMIN';

    public serialize(): [string, string] {
        return [
            TargetExpectedAccuracyConstraint.NAME,
            this.targetExpectedAccuracy.toString()
        ];
    }
}

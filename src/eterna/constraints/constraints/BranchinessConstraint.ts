import UndoBlock from 'eterna/UndoBlock';
import EPars from 'eterna/EPars';
import BitmapManager from 'eterna/resources/BitmapManager';
import {
    Texture, Container, Sprite, Point
} from 'pixi.js';
import Bitmaps from 'eterna/resources/Bitmaps';
import {TextureUtil} from 'flashbang';
import Constraint, {BaseConstraintStatus, ConstraintContext} from '../Constraint';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';

interface BranchinessConstraintStatus extends BaseConstraintStatus {
    currentBranchiness: number;
}

export default class BranchinessConstraint extends Constraint<BranchinessConstraintStatus> {
    public readonly minBranchiness: number;

    constructor(maxBranchiness: number) {
        super();
        this.minBranchiness = maxBranchiness;
    }

    public evaluate(constraintContext: ConstraintContext): BranchinessConstraintStatus {
        // TODO: Multistate?
        const branchiness = constraintContext.undoBlocks[0].branchiness(constraintContext.undoBlocks[0].getPairs(37));

        return {
            satisfied: branchiness >= this.minBranchiness,
            currentBranchiness: branchiness
        };
    }

    public getConstraintBoxConfig(
        status: BranchinessConstraintStatus,
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        let tooltip = ConstraintBox.createTextStyle();

        if (forMissionScreen) {
            tooltip.pushStyle('altTextMain');
        }

        // Typical natural RNAs have a lot of branches in them. Often,
        // artificial RNAs that are very stable have very few branches, like
        // they are just one long hairpin. We want to encourage natural-looking,
        // "branchy" RNAs by contraining one minus the mean base pair distance over n-1.
        tooltip.append('The branchiness must be at least', 'altText')
            .append(` ${this.minBranchiness}.`);

        if (forMissionScreen) {
            tooltip.popStyle();
        }

        return {
            satisfied: status.satisfied,
            tooltip,
            clarificationText: `${this.minBranchiness} OR MORE`,
            statText: status.currentBranchiness.toFixed(3),
            showOutline: true,
            drawBG: true,
            icon: BranchinessConstraint._icon
        };
    }

    private static get _icon(): Texture {
        let icon = new Container();

        let base1 = new Sprite(BitmapManager.getBitmap(Bitmaps.BranchinessIcon));
        base1.width = 24;
        base1.height = 24;
        base1.position = new Point(50, 50);
        icon.addChild(base1);

        return TextureUtil.renderToTexture(icon);
    }

    public static readonly NAME = 'BRANCHINESSMIN';

    public serialize(): [string, string] {
        return [
            BranchinessConstraint.NAME,
            this.minBranchiness.toString()
        ];
    }
}

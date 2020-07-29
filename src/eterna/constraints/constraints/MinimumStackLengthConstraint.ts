import {UndoBlockParam} from 'eterna/UndoBlock';
import {
    Container, Sprite, Point, Texture
} from 'pixi.js';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import {TextureUtil} from 'flashbang';
import Band from 'eterna/ui/Band';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import Constraint, {BaseConstraintStatus, ConstraintContext} from '../Constraint';

interface MinStackConstraintStatus extends BaseConstraintStatus{
    currentLength: number;
}

export default class MinimumStackLengthConstraint extends Constraint<MinStackConstraintStatus> {
    public static readonly NAME = 'STACK';
    public readonly minLength: number;

    constructor(minLength: number) {
        super();
        this.minLength = minLength;
    }

    public evaluate(context: ConstraintContext): MinStackConstraintStatus {
        // TODO: Multistate?
        const stackLen = context.undoBlocks[0].getParam(UndoBlockParam.STACK) as number;
        return {
            satisfied: stackLen >= this.minLength,
            currentLength: stackLen
        };
    }

    public getConstraintBoxConfig(status: MinStackConstraintStatus): ConstraintBoxConfig {
        let statText = ConstraintBox.createTextStyle()
            .append(status.currentLength.toString(), {fill: status.satisfied ? 0x00aa00 : 0xaa0000})
            .append(`/${this.minLength}`);

        return {
            satisfied: status.satisfied,
            tooltip: `You must have a stack with ${this.minLength} or more pairs.`,
            statText,
            icon: MinimumStackLengthConstraint._icon
        };
    }

    public serialize(): [string, string] {
        return [
            MinimumStackLengthConstraint.NAME,
            this.minLength.toString()
        ];
    }

    private static get _icon(): Texture {
        let icon = new Container();
        let tex = BitmapManager.getBitmap(Bitmaps.BaseWMidPattern);

        let base1 = new Sprite(tex);
        base1.position = new Point(8, 1);
        icon.addChild(base1);

        let base2 = new Sprite(tex);
        base2.position = new Point(33, 1);
        icon.addChild(base2);

        let base3 = new Sprite(tex);
        base3.position = new Point(8, 15);
        icon.addChild(base3);

        let base4 = new Sprite(tex);
        base4.position = new Point(33, 15);
        icon.addChild(base4);

        let bond1 = new Band(3, 3, 1);
        bond1.display.position = new Point(22, 3);
        icon.addChild(bond1.container);

        let bond2 = new Band(3, 3, 1);
        bond2.display.position = new Point(22, 17);
        icon.addChild(bond2.container);

        return TextureUtil.renderToTexture(icon);
    }
}

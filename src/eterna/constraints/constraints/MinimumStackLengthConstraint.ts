import {UndoBlockParam} from 'eterna/UndoBlock';
import {
    Container, Sprite, Texture
} from 'pixi.js';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import {TextureUtil} from 'flashbang';
import Band from 'eterna/ui/Band';
import EPars from 'eterna/EPars';
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
        const undoBlock = context.undoBlocks[0];
        const pseudoknots = (undoBlock.targetConditions !== undefined
            && undoBlock.targetConditions['type'] === 'pseudoknot');

        const stackLen = undoBlock.getParam(UndoBlockParam.STACK, EPars.DEFAULT_TEMPERATURE, pseudoknots) as number;
        return {
            satisfied: stackLen >= this.minLength,
            currentLength: stackLen
        };
    }

    public getConstraintBoxConfig(status: MinStackConstraintStatus): ConstraintBoxConfig {
        const statText = ConstraintBox.createTextStyle()
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
        const icon = new Container();
        const tex = BitmapManager.getBitmap(Bitmaps.BaseWMidPattern);

        const base1 = new Sprite(tex);
        base1.position.set(8, 1);
        icon.addChild(base1);

        const base2 = new Sprite(tex);
        base2.position.set(33, 1);
        icon.addChild(base2);

        const base3 = new Sprite(tex);
        base3.position.set(8, 15);
        icon.addChild(base3);

        const base4 = new Sprite(tex);
        base4.position.set(33, 15);
        icon.addChild(base4);

        const bond1 = new Band(3, 3, 1);
        bond1.display.position.set(22, 3);
        icon.addChild(bond1.container);

        const bond2 = new Band(3, 3, 1);
        bond2.display.position.set(22, 17);
        icon.addChild(bond2.container);

        return TextureUtil.renderToTexture(icon);
    }
}

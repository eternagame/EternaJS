import {
    Container, Sprite, Texture
} from 'pixi.js';
import {TextureUtil} from 'flashbang';
import EPars, {RNABase} from 'eterna/EPars';
import BaseTextures from 'eterna/pose2D/BaseTextures';
import Eterna from 'eterna/Eterna';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import Constraint, {BaseConstraintStatus, ConstraintContext} from '../Constraint';

interface MinStackConstraintStatus extends BaseConstraintStatus{
    currentLength: number;
}

export default class MaximumLoopLengthConstraint extends Constraint<MinStackConstraintStatus> {
    public static readonly NAME = 'MAX_LOOP';
    public readonly maxLength: number;

    constructor(maxLength: number) {
        super();
        this.maxLength = maxLength;
    }

    public evaluate(context: ConstraintContext): MinStackConstraintStatus {
        // TODO: Multistate?
        const undoBlock = context.undoBlocks[0];
        const pseudoknots = (undoBlock.targetConditions !== undefined
            && undoBlock.targetConditions['type'] === 'pseudoknot');

        const loopLen = undoBlock.getPairs(EPars.DEFAULT_TEMPERATURE, pseudoknots).getLongestLoopLength();
        return {
            satisfied: loopLen <= this.maxLength,
            currentLength: loopLen
        };
    }

    public getConstraintBoxConfig(status: MinStackConstraintStatus): ConstraintBoxConfig {
        const statText = ConstraintBox.createTextStyle()
            .append(status.currentLength.toString(), {fill: status.satisfied ? 0x00aa00 : 0xaa0000})
            .append(`/${this.maxLength}`);

        return {
            satisfied: status.satisfied,
            tooltip: `All loops must have ${this.maxLength} or fewer bases.`,
            statText,
            icon: MaximumLoopLengthConstraint._icon,
            drawBG: true
        };
    }

    public serialize(): [string, string] {
        return [
            MaximumLoopLengthConstraint.NAME,
            this.maxLength.toString()
        ];
    }

    private static get _icon(): Texture {
        const icon = new Container();

        const baseTex = new BaseTextures(RNABase.ADENINE).getBodyTexture(0, Eterna.settings.colorblindTheme.value);

        const base1 = new Sprite(baseTex.texture);
        base1.height = 30;
        base1.scale.x = base1.scale.y;
        base1.position.set(28, 0);
        icon.addChild(base1);

        const base2 = new Sprite(baseTex.texture);
        base2.height = 30;
        base2.scale.x = base2.scale.y;
        base2.position.set(56, 0);
        icon.addChild(base2);

        const base3 = new Sprite(baseTex.texture);
        base3.height = 30;
        base3.scale.x = base3.scale.y;
        base3.position.set(42, 8);
        icon.addChild(base3);

        return TextureUtil.renderToTexture(icon);
    }
}

import {UndoBlockParam} from 'eterna/UndoBlock';
import {
    BlurFilter,
    Container, Graphics, Sprite, Texture
} from 'pixi.js';
import {AdjustmentFilter} from 'pixi-filters';
import {TextureUtil} from 'flashbang';
import EPars, {RNABase} from 'eterna/EPars';
import BaseTextures from 'eterna/pose2D/BaseTextures';
import Eterna from 'eterna/Eterna';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import Constraint, {BaseConstraintStatus, ConstraintContext} from '../Constraint';

interface MinStackConstraintStatus extends BaseConstraintStatus{
    currentLength: number;
}

export default class MinimumExistingStackLengthConstraint extends Constraint<MinStackConstraintStatus> {
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
            icon: MinimumExistingStackLengthConstraint._icon,
            drawBG: true
        };
    }

    public serialize(): [string, string] {
        return [
            MinimumExistingStackLengthConstraint.NAME,
            this.minLength.toString()
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
        base3.position.set(28, 16);
        icon.addChild(base3);

        const base4 = new Sprite(baseTex.texture);
        base4.height = 30;
        base4.scale.x = base4.scale.y;
        base4.position.set(56, 16);
        icon.addChild(base4);

        const addSat = (
            alpha: number,
            x: number,
            y: number,
            flip: boolean
        ) => {
            const tri = new Graphics({
                filters: [new BlurFilter({strength: 1.25, quality: 16}), new AdjustmentFilter({alpha, brightness: 2})]
            })
                .poly(
                    flip
                        ? [{x: 0, y: 4}, {x: 7, y: 0}, {x: 7, y: 8}]
                        : [{x: 0, y: 0}, {x: 0, y: 8}, {x: 7, y: 4}]
                )
                .fill(0xffffff);
            tri.x = x + 4 + (flip ? 5 : 0);
            tri.y = y;
            icon.addChild(tri);
            tri.cacheAsTexture(true);
            return tri;
        };

        addSat(0.65, 47, 11, false);
        addSat(0.65, 47, 11, true);
        addSat(0.65, 47, 27, false);
        addSat(0.65, 47, 27, true);

        return TextureUtil.renderToTexture(icon);
    }
}

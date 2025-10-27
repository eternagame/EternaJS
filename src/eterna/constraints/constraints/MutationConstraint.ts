import {
    Sprite, Texture, Container
} from 'pixi.js';
import {StyledTextBuilder, TextureUtil} from 'flashbang';
import EPars, {RNABase} from 'eterna/EPars';
import BaseTextures from 'eterna/pose2D/BaseTextures';
import Eterna from 'eterna/Eterna';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import Constraint, {BaseConstraintStatus, ConstraintContext} from '../Constraint';

interface MaxMutationConstraintStatus extends BaseConstraintStatus {
    mutations: number;
}

abstract class MutationConstraint extends Constraint<MaxMutationConstraintStatus> {
    public readonly mutations: number;
    public readonly mode: 'min' | 'max';

    constructor(mutations: number, mode: 'min' | 'max') {
        super();
        this.mutations = mutations;
        this.mode = mode;
    }

    public evaluate(context: ConstraintContext): MaxMutationConstraintStatus {
        if (!context.puzzle) throw new Error('Mutation constraint requires beginning sequence, which is unavailable');

        const mutations: number = EPars.sequenceDiff(
            context.puzzle.getSubsequenceWithoutBarcode(context.undoBlocks[0].sequence),
            context.puzzle.getSubsequenceWithoutBarcode(context.puzzle.getBeginningSequence())
        );

        return {
            satisfied: this.mode === 'max' ? mutations <= this.mutations : mutations >= this.mutations,
            mutations
        };
    }

    public getConstraintBoxConfig(status: MaxMutationConstraintStatus): ConstraintBoxConfig {
        const statText = new StyledTextBuilder()
            .append(
                status.mutations.toString(),
                {fill: (status.satisfied ? 0x00aa00 : 0xFF0000), fontWeight: 'bold'}
            )
            .append(`/${this.mutations}`);

        const tooltip = this.mode === 'max'
            ? ConstraintBox.createTextStyle().append(`You can only mutate up to ${this.mutations} bases`)
            : ConstraintBox.createTextStyle().append(`You must mutate at least ${this.mutations} bases`);

        return {
            satisfied: status.satisfied,
            tooltip,
            drawBG: true,
            icon: MaximumMutationConstraint._icon,
            showOutline: true,
            statText,
            clarificationText: `AT ${this.mode === 'max' ? 'MOST' : 'LEAST'}${this.mutations.toString().length > 2 ? ' \n' : ' '}${this.mutations} CHANGES`
        };
    }

    public serialize(): [string, string] {
        return [
            MaximumMutationConstraint.NAME,
            this.mutations.toString()
        ];
    }

    private static get _icon(): Texture {
        const icon = new Container();

        const base1Tex = new BaseTextures(RNABase.ADENINE).getBodyTexture(0, Eterna.settings.colorblindTheme.value);
        const base1 = new Sprite(base1Tex.texture);
        base1.height = 30;
        base1.scale.x = base1.scale.y;
        base1.position.set(28, 0);
        icon.addChild(base1);

        const base2Tex = new BaseTextures(RNABase.GUANINE).getBodyTexture(0, Eterna.settings.colorblindTheme.value);
        const base2 = new Sprite(base2Tex.texture);
        base2.height = 30;
        base2.scale.x = base1.scale.y;
        base2.position.set(36, 0);
        icon.addChild(base2);

        const base3Tex = new BaseTextures(RNABase.URACIL).getBodyTexture(0, Eterna.settings.colorblindTheme.value);
        const base3 = new Sprite(base3Tex.texture);
        base3.height = 30;
        base3.scale.x = base1.scale.y;
        base3.position.set(44, 0);
        icon.addChild(base3);

        const base4Tex = new BaseTextures(RNABase.CYTOSINE).getBodyTexture(0, Eterna.settings.colorblindTheme.value);
        const base4 = new Sprite(base4Tex.texture);
        base4.height = 30;
        base4.scale.x = base1.scale.y;
        base4.position.set(52, 0);
        icon.addChild(base4);

        return TextureUtil.renderToTexture(icon);
    }
}

export class MaximumMutationConstraint extends MutationConstraint {
    public static readonly NAME = 'MUTATION';
    constructor(mutations: number) {
        super(mutations, 'max');
    }
}

export class MinimumMutationConstraint extends MutationConstraint {
    public static readonly NAME = 'MINMUTATION';
    constructor(mutations: number) {
        super(mutations, 'min');
    }
}

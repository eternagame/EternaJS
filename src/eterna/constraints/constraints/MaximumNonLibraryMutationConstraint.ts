import {
    Sprite, Texture, Container
} from 'pixi.js';
import {StyledTextBuilder, TextureUtil} from 'flashbang';
import EPars, {RNABase} from 'eterna/EPars';
import Utility from 'eterna/util/Utility';
import BaseTextures from 'eterna/pose2D/BaseTextures';
import Eterna from 'eterna/Eterna';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import Constraint, {BaseConstraintStatus, ConstraintContext} from '../Constraint';

interface MaxNonLibraryMutationConstraintStatus extends BaseConstraintStatus {
    mutations: number;
}

export default class MaximumNonLibraryMutationConstraint extends Constraint<MaxNonLibraryMutationConstraintStatus> {
    public static readonly NAME = 'NONLIBRARYMUTATION';
    public readonly hard = true;
    public readonly maxMutations: number;

    constructor(maxMutations: number) {
        super();
        this.maxMutations = maxMutations;
    }

    public evaluate(context: ConstraintContext): MaxNonLibraryMutationConstraintStatus {
        if (!context.puzzle) {
            throw new Error('Non-library mutation constraint requires beginning sequence, which is unavailable');
        }

        let unmappedLibrarySelections: number[] = [];
        const librarySelections = context.undoBlocks[0].librarySelections ?? [];
        const customNumberingStr = context.undoBlocks[0].targetConditions?.['custom-numbering'];
        if (customNumberingStr) {
            const customNumbering = Utility.numberingJSONToArray(customNumberingStr);
            unmappedLibrarySelections = librarySelections.map((ii) => customNumbering.indexOf(ii));
        } else {
            unmappedLibrarySelections = librarySelections.map((ii) => ii - 1);
        }

        const mutations: number = EPars.sequenceDiff(
            context.puzzle.getSubsequenceWithoutBarcode(context.undoBlocks[0].sequence),
            context.puzzle.getSubsequenceWithoutBarcode(context.puzzle.getBeginningSequence()),
            unmappedLibrarySelections
        );

        return {
            satisfied: mutations <= this.maxMutations,
            mutations
        };
    }

    public getConstraintBoxConfig(status: MaxNonLibraryMutationConstraintStatus): ConstraintBoxConfig {
        const statText = new StyledTextBuilder()
            .append(status.mutations.toString(), {fill: (status.satisfied ? 0x00aa00 : 0xaa0000)})
            .append(`/${this.maxMutations}`);

        const tooltip = ConstraintBox.createTextStyle().append(
            `Outside of the randomization region, you can only mutate up to ${this.maxMutations} bases`
        );

        return {
            satisfied: status.satisfied,
            tooltip,
            drawBG: true,
            icon: MaximumNonLibraryMutationConstraint._icon,
            showOutline: true,
            statText,
            clarificationText: 'NON-RANDOMIZED\nCHANGES'
        };
    }

    public serialize(): [string, string] {
        return [
            MaximumNonLibraryMutationConstraint.NAME,
            this.maxMutations.toString()
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

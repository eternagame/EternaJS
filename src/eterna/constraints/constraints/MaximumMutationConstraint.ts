import {
    Sprite, Texture, Container, Point
} from 'pixi.js';
import {TextureUtil} from 'flashbang';
import UndoBlock from 'eterna/UndoBlock';
import Puzzle from 'eterna/puzzle/Puzzle';
import EPars from 'eterna/EPars';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import Constraint, {BaseConstraintStatus} from '../Constraint';

interface MaxMutationConstraintStatus extends BaseConstraintStatus {
    mutations: number;
}

export default class MaximumMutationConstraint extends Constraint<MaxMutationConstraintStatus> {
    public static readonly NAME = 'MUTATION';
    public maxMutations: number;

    constructor(maxMutations: number) {
        super();
        this.maxMutations = maxMutations;
    }

    public evaluate(undoBlocks: UndoBlock[], targetConditions: any, puzzle: Puzzle): MaxMutationConstraintStatus {
        if (!puzzle) throw new Error('Mutaiton constraint requires beginning sequence, which is unavailable');

        const mutations: number = EPars.sequenceDiff(
            puzzle.getSubsequenceWithoutBarcode(undoBlocks[0].sequence),
            puzzle.getSubsequenceWithoutBarcode(puzzle.getBeginningSequence())
        );

        return {
            satisfied: mutations <= this.maxMutations,
            mutations
        };
    }

    public getConstraintBoxConfig(status: MaxMutationConstraintStatus): ConstraintBoxConfig {
        let statText = ConstraintBox.createTextStyle()
            .append(status.mutations.toString(), {fill: (status.satisfied ? 0x00aa00 : 0xaa0000)})
            .append(`/${this.maxMutations}`);

        let tooltip = ConstraintBox.createTextStyle().append(`You can only mutate up to ${this.maxMutations} bases`);

        return {
            satisfied: status.satisfied,
            tooltip,
            drawBG: true,
            iconTexture: MaximumMutationConstraint._icon,
            showOutline: true,
            statText,
            clarificationText: `AT MOST ${this.maxMutations} CHANGES`
        };
    }

    private static get _icon(): Texture {
        let icon = new Container();

        let base1 = new Sprite(BitmapManager.getBitmap(Bitmaps.BaseAMid));
        base1.position = new Point(28, 8);
        icon.addChild(base1);

        let base2 = new Sprite(BitmapManager.getBitmap(Bitmaps.BaseGMid));
        base2.position = new Point(36, 8);
        icon.addChild(base2);

        let base3 = new Sprite(BitmapManager.getBitmap(Bitmaps.BaseUMid));
        base3.position = new Point(44, 8);
        icon.addChild(base3);

        let base4 = new Sprite(BitmapManager.getBitmap(Bitmaps.BaseCMid));
        base4.position = new Point(52, 8);
        icon.addChild(base4);

        return TextureUtil.renderToTexture(icon);
    }
}

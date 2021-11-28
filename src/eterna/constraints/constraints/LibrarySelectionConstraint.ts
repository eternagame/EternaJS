import BitmapManager from 'eterna/resources/BitmapManager';
import {
    Texture, Sprite, Container
} from 'pixi.js';
import Bitmaps from 'eterna/resources/Bitmaps';
import {StyledTextBuilder, TextureUtil} from 'flashbang';
import Constraint, {BaseConstraintStatus, ConstraintContext} from '../Constraint';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';

interface LibrarySelectionConstraintStatus extends BaseConstraintStatus {
    currentLibrarySelection: number;
}

export default class LibrarySelectionConstraint extends Constraint<LibrarySelectionConstraintStatus> {
    // when numNtSelected is set to -1, it means any nonzero number will satisfy
    public readonly numNtSelected: number;
    public readonly hard = true;

    constructor(numNtSelected: number) {
        super();
        this.numNtSelected = numNtSelected;
    }

    public evaluate(constraintContext: ConstraintContext): LibrarySelectionConstraintStatus {
        // TODO: Multistate?
        const numNtSelected = (constraintContext.undoBlocks[0].librarySelections ?? []).length;

        return {
            satisfied: numNtSelected <= this.numNtSelected || (this.numNtSelected === -1 && numNtSelected > 0),
            currentLibrarySelection: numNtSelected
        };
    }

    public getConstraintBoxConfig(
        status: LibrarySelectionConstraintStatus,
        forMissionScreen: boolean
    ): ConstraintBoxConfig {
        const tooltip = ConstraintBox.createTextStyle();

        if (forMissionScreen) {
            tooltip.pushStyle('altTextMain');
        }

        const requiredNum = this.numNtSelected === -1 ? 'any' : `${this.numNtSelected}`;

        if (requiredNum === 'any') {
            tooltip.append('You must select SOME number of bases for library randomization.', 'altText');
        } else {
            tooltip.append('You must select for library randomization at most', 'altText')
                .append(` ${requiredNum} bases.`);
        }

        if (forMissionScreen) {
            tooltip.popStyle();
        }

        const statText = new StyledTextBuilder()
            .append(status.currentLibrarySelection.toString(), {fill: (status.satisfied ? 0x00aa00 : 0xaa0000)})
            .append(`/${requiredNum}`);

        return {
            satisfied: status.satisfied,
            tooltip,
            clarificationText: 'RANDOMIZE BASES',
            statText,
            showOutline: true,
            drawBG: true,
            icon: LibrarySelectionConstraint._icon
        };
    }

    private static get _icon(): Texture {
        const icon = new Container();

        const sprite = new Sprite(BitmapManager.getBitmap(Bitmaps.RandomIcon));
        sprite.width = 24;
        sprite.height = 24;
        sprite.position.set(50, 50);
        icon.addChild(sprite);

        return TextureUtil.renderToTexture(icon);
    }

    public static readonly NAME = 'NTSELECTED';

    public serialize(): [string, string] {
        return [
            LibrarySelectionConstraint.NAME,
            this.numNtSelected.toString()
        ];
    }
}

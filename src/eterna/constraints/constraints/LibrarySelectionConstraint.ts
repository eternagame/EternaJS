import BitmapManager from 'eterna/resources/BitmapManager';
import {
    Texture, Sprite, Point, ParticleContainer
} from 'pixi.js';
import Bitmaps from 'eterna/resources/Bitmaps';
import {StyledTextBuilder, TextureUtil} from 'flashbang';
import Constraint, {BaseConstraintStatus, ConstraintContext} from '../Constraint';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';

interface LibrarySelectionConstraintStatus extends BaseConstraintStatus {
    currentLibrarySelection: number;
}

export default class LibrarySelectionConstraint extends Constraint<LibrarySelectionConstraintStatus> {
    public readonly numNtSelected: number;

    constructor(numNtSelected: number) {
        super();
        this.numNtSelected = numNtSelected;
    }

    public evaluate(constraintContext: ConstraintContext): LibrarySelectionConstraintStatus {
        // TODO: Multistate?
        const numNtSelected = (constraintContext.undoBlocks[0].librarySelections ?? []).length;

        return {
            satisfied: numNtSelected === this.numNtSelected,
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

        tooltip.append('You must select for library randomization exactly', 'altText')
            .append(` ${this.numNtSelected} nt.`);

        if (forMissionScreen) {
            tooltip.popStyle();
        }

        const statText = new StyledTextBuilder()
            .append(status.currentLibrarySelection.toString(), {fill: (status.satisfied ? 0x00aa00 : 0xaa0000)})
            .append(`/${this.numNtSelected}`);

        return {
            satisfied: status.satisfied,
            tooltip,
            clarificationText: `RANDOMIZE ${this.numNtSelected} BASES`,
            statText,
            showOutline: true,
            drawBG: true,
            icon: LibrarySelectionConstraint._icon
        };
    }

    private static get _icon(): Texture {
        const icon = new ParticleContainer();

        const sprite = new Sprite(BitmapManager.getBitmap(Bitmaps.RandomIcon));
        sprite.width = 24;
        sprite.height = 24;
        sprite.position = new Point(50, 50);
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

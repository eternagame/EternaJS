import BitmapManager from 'eterna/resources/BitmapManager';
import {
    Texture, Container, Sprite, Point
} from 'pixi.js';
import Bitmaps from 'eterna/resources/Bitmaps';
import {TextureUtil} from 'flashbang';
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
        const numNtSelected = constraintContext.pose?.designStructNumbers().length ?? 0;

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

        return {
            satisfied: status.satisfied,
            tooltip,
            clarificationText: `EXACTLY ${this.numNtSelected} SELECTED`,
            statText: `${status.currentLibrarySelection}`,
            showOutline: true,
            drawBG: true,
            icon: LibrarySelectionConstraint._icon
        };
    }

    private static get _icon(): Texture {
        const icon = new Container();

        const base1 = new Sprite(BitmapManager.getBitmap(Bitmaps.ImgHelp));
        base1.width = 24;
        base1.height = 24;
        base1.position = new Point(50, 50);
        icon.addChild(base1);

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

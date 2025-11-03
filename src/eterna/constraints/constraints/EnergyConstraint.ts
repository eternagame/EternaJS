import {
    Sprite, Texture, Container
} from 'pixi.js';
import {StyledTextBuilder, TextureUtil} from 'flashbang';
import EPars from 'eterna/EPars';
import {UndoBlockParam} from 'eterna/UndoBlock';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import ConstraintBox, {ConstraintBoxConfig} from '../ConstraintBox';
import Constraint, {BaseConstraintStatus, ConstraintContext} from '../Constraint';

interface EnergyConstraintStatus extends BaseConstraintStatus {
    energy: number;
    states: number;
}

abstract class EnergyConstraint extends Constraint<EnergyConstraintStatus> {
    public readonly energy: number;
    public readonly mode: 'min' | 'max';
    public readonly state: number;

    constructor(energy: number, state: number, mode: 'min' | 'max') {
        super();
        this.energy = energy;
        this.mode = mode;
        this.state = state;
    }

    public evaluate(context: ConstraintContext): EnergyConstraintStatus {
        const undoBlock = context.undoBlocks[this.state];

        const pseudoknots = (undoBlock.targetConditions !== undefined
            && undoBlock.targetConditions['type'] === 'pseudoknot');
        const energy = (undoBlock.getParam(UndoBlockParam.FE, EPars.DEFAULT_TEMPERATURE, pseudoknots) as number) / 100;

        return {
            satisfied: this.mode === 'max' ? energy <= this.energy : energy >= this.energy,
            energy,
            states: context.undoBlocks.length
        };
    }

    public getConstraintBoxConfig(status: EnergyConstraintStatus): ConstraintBoxConfig {
        const statText = new StyledTextBuilder()
            .append(
                status.energy.toFixed(2),
                {fill: (status.satisfied ? 0x00aa00 : 0xFF0000), fontWeight: 'bold'}
            )
            .append(`/${this.energy}`);

        const tooltip = this.mode === 'max'
            ? ConstraintBox.createTextStyle().append(`The free energy must be below ${this.energy} kcal`)
            : ConstraintBox.createTextStyle().append(`The free energy must be above ${this.energy} kcal`);

        if (status.states > 1) {
            tooltip.append(` in state ${this.state + 1}`);
        }

        return {
            satisfied: status.satisfied,
            tooltip,
            drawBG: true,
            icon: EnergyConstraint._icon,
            showOutline: true,
            statText,
            clarificationText: `AT ${this.mode === 'max' ? 'MOST' : 'LEAST'}${this.energy.toString().length > 2 ? ' \n' : ' '}${this.energy} KCAL`,
            stateNumber: this.state + 1
        };
    }

    private static get _icon(): Texture {
        const icon = new Container();

        const img = new Sprite(BitmapManager.getBitmap(Bitmaps.ImgFoldingEngine));
        img.width = 16;
        img.height = 16;
        icon.addChild(img);

        return TextureUtil.renderToTexture(icon);
    }
}

export class MaximumEnergyConstraint extends EnergyConstraint {
    public static readonly NAME = 'MAXMFE';
    constructor(energy: number, state: number) {
        super(energy, state, 'max');
    }

    public serialize(): [string, string] {
        return [
            MaximumEnergyConstraint.NAME,
            `${this.energy.toString()}|${this.state.toString()}`
        ];
    }
}

export class MinimumEnergyConstraint extends EnergyConstraint {
    public static readonly NAME = 'MINMFE';
    constructor(energy: number, state: number) {
        super(energy, state, 'min');
    }

    public serialize(): [string, string] {
        return [
            MinimumEnergyConstraint.NAME,
            `${this.energy.toString()}|${this.state.toString()}`
        ];
    }
}

import {ContainerObject, VLayoutContainer, HAlign} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import GameDropdown from 'eterna/ui/GameDropdown';
import TextInputGrid from 'eterna/ui/TextInputGrid';
import TextInputObject from 'eterna/ui/TextInputObject';
import type {SolverOptions} from 'eterna/assistant/Solver';
import type {RibotreeOptions} from 'eterna/assistant/RibotreeSolver';

/** Solver-specific options exposed by this params component */
export type RibotreeParamsOptions = Pick<RibotreeOptions, 'mode' | 'iterations'> & SolverOptions;

type RibotreeMode = RibotreeOptions['mode'];

/**
 * UI component for Ribotree-specific solver parameters.
 * Add to a layout container via addObject(); call getParameters() to read
 * the current values before invoking the solver.
 */
export default class RibotreeParams extends ContainerObject {
    constructor(domParent?: string | HTMLElement) {
        super();
        this._grid = new TextInputGrid(undefined, domParent);
        this._iterationsField = this._grid.addField('Iterations', 200);
        this._iterationsField.text = '25';
    }

    protected added(): void {
        super.added();

        const layout = new VLayoutContainer(0, HAlign.LEFT);
        this.container.addChild(layout);

        // Mode dropdown
        layout.addChild(Fonts.std('Mode', 12).color(0xC0DCE7).build());
        this._modeDropdown = new GameDropdown<RibotreeMode>({
            fontSize: 14,
            options: ['rna', 'mrna'],
            defaultOption: 'rna',
            color: 0x043468,
            textColor: 0xFFFFFF,
            height: 32,
            borderWidth: 0,
            dropShadow: true
        });
        this.addObject(this._modeDropdown, layout);

        // Iterations field
        this.addObject(this._grid, layout);

        layout.layout();
    }

    public getParameters(): RibotreeParamsOptions {
        return {
            mode: this._modeDropdown?.selectedOption.value ?? 'rna',
            iterations: parseInt(this._iterationsField.text, 10) || 25
        };
    }

    private readonly _grid: TextInputGrid;
    private readonly _iterationsField: TextInputObject;
    private _modeDropdown: GameDropdown<RibotreeMode>;
}

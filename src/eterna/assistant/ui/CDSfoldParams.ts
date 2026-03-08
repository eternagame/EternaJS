import {ContainerObject} from 'flashbang';
import TextInputGrid from 'eterna/ui/TextInputGrid';
import TextInputObject from 'eterna/ui/TextInputObject';
import type {SolverOptions} from 'eterna/assistant/Solver';
import type {CDSfoldOptions} from 'eterna/assistant/CDSfoldSolver';

/** Solver-specific options exposed by this params component */
export type CDSfoldParamsOptions =
    Pick<CDSfoldOptions, 'aminoAcids' | 'maxBpDistance' | 'excludedCodons'> & SolverOptions;

/**
 * UI component for CDSfold-specific solver parameters.
 * Add to a layout container via addObject(); call getParameters() to read
 * the current values before invoking the solver.
 */
export default class CDSfoldParams extends ContainerObject {
    constructor(domParent?: string | HTMLElement) {
        super();
        this._grid = new TextInputGrid(undefined, domParent);
        this._aminoAcidsField = this._grid.addField('Amino Acids', 200);
        this._maxBpDistanceField = this._grid.addField('Max BP Distance', 200);
        this._maxBpDistanceField.text = '0';
        this._excludedCodonsField = this._grid.addField('Excluded Codons', 200);
    }

    protected added(): void {
        super.added();
        this.addObject(this._grid, this.container);
    }

    public getParameters(): CDSfoldParamsOptions {
        const maxBp = parseInt(this._maxBpDistanceField.text, 10);
        const excludedRaw = this._excludedCodonsField.text.trim();
        return {
            aminoAcids: this._aminoAcidsField.text,
            maxBpDistance: Number.isNaN(maxBp) ? 0 : maxBp,
            excludedCodons: excludedRaw ? excludedRaw.split(',').map((s) => s.trim()) : undefined
        };
    }

    private readonly _grid: TextInputGrid;
    private readonly _aminoAcidsField: TextInputObject;
    private readonly _maxBpDistanceField: TextInputObject;
    private readonly _excludedCodonsField: TextInputObject;
}

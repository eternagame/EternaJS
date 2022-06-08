/* eslint-disable import/no-duplicates, import/no-unresolved */
import EmscriptenUtil from 'eterna/emscripten/EmscriptenUtil';
import LayoutEngine from 'eterna/layout/LayoutEngine';
import * as RNApuzzlerLib from 'eterna/folding/engines/RNApuzzlerLib';
// import {DotPlotResult, FullEvalResult, FullFoldResult} from './engines/ViennaLib';
/* eslint-enable import/no-duplicates, import/no-unresolved */

export default class RNApuzzler extends LayoutEngine {
    public static readonly NAME: string = 'RNApuzzler';

    /**
     * Asynchronously creates a new instance of the RNApuzzler layout engine.
     * @returns {Promise<RNApuzzler>}
     * @description AMW TODO cannot annotate type of module/program; both are any.
     */
    public static create(): Promise<RNApuzzler> {
        // eslint-disable-next-line import/no-unresolved, import/no-extraneous-dependencies
        return import('engines-bin/rnapuzzler')
            .then((module) => EmscriptenUtil.loadProgram(module))
            .then((program) => new RNApuzzler(program));
    }

    private constructor(lib: RNApuzzlerLib) {
        super();
        this._lib = lib;
    }

    public getLayout(pairTable: number[]): [number, number][] {
        // AMW: assumes pairTable is formatted appropriately for the RNApuzzler,
        // which ultimately should be this function's responsibility.
        // If we ever have multiple LayoutEngines, this function should take a
        // "normal" pairTable like origPairs and modify it HERE.

        // New implementation
        // return EmscriptenUtil.stdVectorVectorToArray<number>(this._lib.GetLayout(pairTable).layout);

        // We get two vectors. mush them up.

        const pts = pairTable.join(',');
        const res = this._lib.GetLayout(pts);
        const Xs = EmscriptenUtil.stdVectorToArray<number>(res.xs);
        const Ys = EmscriptenUtil.stdVectorToArray<number>(res.ys);

        const zip: [number, number][] = [];
        for (let ii = 0; ii < Xs.length; ++ii) {
            zip.push([Xs[ii], Ys[ii]]);
        }
        return zip;
    }

    public get name(): string {
        return RNApuzzler.NAME;
    }

    private readonly _lib: RNApuzzlerLib;
}

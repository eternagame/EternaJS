import EmscriptenUtil from 'eterna/emscripten/EmscriptenUtil';
import LinearFoldBase from './LinearFoldBase';

export default class LinearFoldV extends LinearFoldBase {
    public static readonly NAME = 'LinearFoldV';

    /**
     * Asynchronously creates a new instance of the Vienna folder.
     * @returns {Promise<LinearFoldV>}
     */
    public static create(): Promise<LinearFoldV | null> {
        // eslint-disable-next-line import/no-unresolved
        return import('engines-bin/LinearFoldV')
            .then((module: any) => EmscriptenUtil.loadProgram(module))
            .then((program: any) => new LinearFoldV(program))
            .catch((err) => null);
    }

    public get name(): string {
        return LinearFoldV.NAME;
    }
}

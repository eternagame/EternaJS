import EmscriptenUtil from 'eterna/emscripten/EmscriptenUtil';
import LinearFoldBase from './LinearFoldBase';

export default class LinearFoldV extends LinearFoldBase {
    public static readonly NAME = 'LinearFoldV';

    /**
     * Asynchronously creates a new instance of the Vienna folder.
     * @returns {Promise<LinearFoldV>}
     */
    public static create(): Promise<LinearFoldV> {
        return import('./engines/LinearFoldV')
            .then((module: any) => EmscriptenUtil.loadProgram(module))
            .then((program: any) => new LinearFoldV(program));
    }

    public get name(): string {
        return LinearFoldV.NAME;
    }
}

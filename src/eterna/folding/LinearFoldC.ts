import EmscriptenUtil from 'eterna/emscripten/EmscriptenUtil';
import LinearFoldBase from './LinearFoldBase';

export default class LinearFoldC extends LinearFoldBase {
    public static readonly NAME = 'LinearFoldC';

    /**
     * Asynchronously creates a new instance of the Vienna folder.
     * @returns {Promise<LinearFoldC>}
     */
    public static create(): Promise<LinearFoldC> {
        return import('engines-bin/LinearFoldC')
            .then((module: any) => EmscriptenUtil.loadProgram(module))
            .then((program: any) => new LinearFoldC(program));
    }

    public get name(): string {
        return LinearFoldC.NAME;
    }
}

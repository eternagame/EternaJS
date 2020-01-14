import EmscriptenUtil from 'eterna/emscripten/EmscriptenUtil';
import LinearFoldBase from './LinearFoldBase';
import Folder from './Folder';

export default class LinearFoldV extends LinearFoldBase {
    public static readonly NAME = 'LinearFoldV';

    /**
     * Asynchronously creates a new instance of the Vienna folder.
     * @returns {Promise<LinearFoldV>}
     */
    public static create(): Promise<LinearFoldV> {
        return import('engines-bin/LinearFoldV')
            .then((module: any) => EmscriptenUtil.loadProgram(module))
            .then((program: any) => new LinearFoldV(program));
    }

    public get name(): string {
        return LinearFoldV.NAME;
    }
}

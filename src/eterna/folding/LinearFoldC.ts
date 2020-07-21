import EmscriptenUtil from 'eterna/emscripten/EmscriptenUtil';
import LinearFoldBase from './LinearFoldBase';

export default class LinearFoldC extends LinearFoldBase {
    public static readonly NAME = 'LinearFoldC';

    /**
     * Asynchronously creates a new instance of the LinearFoldC folder.
     * @returns {Promise<LinearFoldC>}
     * @description AMW TODO cannot annotate type of module/program; both are any.
     */
    public static create(): Promise<LinearFoldC | null> {
        // eslint-disable-next-line import/no-unresolved, import/no-extraneous-dependencies
        return import('engines-bin/LinearFoldC')
            .then((module) => EmscriptenUtil.loadProgram(module))
            .then((program) => new LinearFoldC(program))
            .catch((err) => null);
    }

    public get name(): string {
        return LinearFoldC.NAME;
    }
}

import EmscriptenUtil from 'eterna/emscripten/EmscriptenUtil';
import LinearFoldBase from './LinearFoldBase';

export default class LinearFoldV extends LinearFoldBase {
    public static readonly NAME = 'LinearFoldV';

    /**
     * Asynchronously creates a new instance of the LinearFoldV folder.
     * @returns {Promise<LinearFoldV>}
     * @description AMW TODO cannot annotate type of module/program; both are any.
     */
    public static create(): Promise<LinearFoldV | null> {
        // eslint-disable-next-line import/no-unresolved, import/no-extraneous-dependencies
        return import('engines-bin/LinearFoldV')
            .then((module) => EmscriptenUtil.loadProgram(module))
            .then((program) => new LinearFoldV(program))
            .catch((err) => null);
    }

    public get name(): string {
        return LinearFoldV.NAME;
    }
}

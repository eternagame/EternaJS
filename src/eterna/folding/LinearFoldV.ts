import EmscriptenUtil from 'eterna/emscripten/EmscriptenUtil';
import LinearFoldBase from './LinearFoldBase';

export default class LinearFoldV extends LinearFoldBase {
    public static readonly NAME = 'LinearFoldV';

    /**
     * Asynchronously creates a new instance of the Vienna folder.
     * @returns {Promise<LinearFoldV>}
     */
    public static create(): Promise<LinearFoldV> {
        // We have to ts-ignore this for it to allow us to fall back to an installed package
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        return import('./engines/LinearFoldV')
            // eslint-disable-next-line import/no-unresolved
            .catch(() => import('eternajs-folding-engines/engines/LinearFoldV'))
            .then((module: any) => EmscriptenUtil.loadProgram(module))
            .then((program: any) => new LinearFoldV(program));
    }

    public get name(): string {
        return LinearFoldV.NAME;
    }
}

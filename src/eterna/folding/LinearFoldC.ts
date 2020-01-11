import EmscriptenUtil from 'eterna/emscripten/EmscriptenUtil';
import LinearFoldBase from './LinearFoldBase';

export default class LinearFoldC extends LinearFoldBase {
    public static readonly NAME = 'LinearFoldC';

    /**
     * Asynchronously creates a new instance of the Vienna folder.
     * @returns {Promise<LinearFoldC>}
     */
    public static create(): Promise<LinearFoldC> {
        // We have to ts-ignore this for it to allow us to fall back to an installed package
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        // eslint-disable-next-line import/no-unresolved
        return import('./engines/LinearFoldC')
            // eslint-disable-next-line import/no-unresolved
            .catch(() => import('eternajs-folding-engines/engines/LinearFoldC'))
            .then((module: any) => EmscriptenUtil.loadProgram(module))
            .then((program: any) => new LinearFoldC(program));
    }

    public get name(): string {
        return LinearFoldC.NAME;
    }
}

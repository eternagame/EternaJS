// eslint-disable-next-line import/no-unresolved
import * as stdcpp from './stdcpp';

export default class EmscriptenUtil {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    /**
     * Instantiates a program from an Emscripten module and calls its main() function if it has one.
     * @returns {Promise<any>} a promise that will resolve with the instantiated module.
     */
    public static async loadProgram(module: any): Promise<any> {
        const program = await module.default({noInitialRun: true});
        if (Object.prototype.hasOwnProperty.call(program, 'callMain')) {
            program.callMain();
        }
        return program;
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

    /** Converts a C++ std::vector<T> to a T[] */
    public static stdVectorToArray<T>(vector: stdcpp.vector<T>): T[] {
        const n = vector.size();
        const array: T[] = new Array(n);
        for (let ii = 0; ii < n; ++ii) {
            array[ii] = vector.get(ii);
        }
        return array;
    }
}

// eslint-disable-next-line import/no-unresolved
import * as stdcpp from './stdcpp';

export default class EmscriptenUtil {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    /**
     * Instantiates a program from an Emscripten module and calls its main() function if it has one.
     * @returns {Promise<any>} a promise that will resolve with the instantiated module.
     */
    public static loadProgram(module: any): Promise<any> {
        return new Promise<any>((resolve, _) => {
            module.default({noInitialRun: true}).then((program: any) => {
                if (Object.prototype.hasOwnProperty.call(program, 'callMain')) {
                    program.callMain();
                }

                // Fix an infinite loop.
                // "program" is not a promise, but since it has a 'then' property,
                // resolving our promise with the program will recurse infinitely.
                // https://github.com/kripken/emscripten/issues/5820
                // TODO: remove this if and when emscripten is fixed
                if (Object.prototype.hasOwnProperty.call(program, 'then')) {
                    delete program['then'];
                }

                resolve(program);
            });
        });
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

    /** Converts a C++ std::vector<T> to a T[] */
    public static stdVectorToArray<T>(vector: stdcpp.vector<T>): T[] {
        let n = vector.size();
        let array: T[] = new Array(n);
        for (let ii = 0; ii < n; ++ii) {
            array[ii] = vector.get(ii);
        }
        return array;
    }
}

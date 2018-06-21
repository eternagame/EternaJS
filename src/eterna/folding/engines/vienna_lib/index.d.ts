// Template copied from:
// https://www.typescriptlang.org/docs/handbook/declaration-files/templates/module-class-d-ts.html

/*~ This is the module template file for class modules.
 *~ You should rename it to index.d.ts and place it in a folder with the same name as the module.
 *~ For example, if you were writing a file for "super-greeter", this
 *~ file should be 'super-greeter/index.d.ts'
 */

/*~ Note that ES6 modules cannot directly export class objects.
 *~ This file should be imported using the CommonJS-style:
 *~   import x = require('someLibrary');
 *~
 *~ Refer to the documentation to understand common
 *~ workarounds for this limitation of ES6 modules.
 */

/*~ This declaration specifies that the class constructor function
 *~ is the exported object from the file
 */
import * as stdcpp from "../../../emscripten/stdcpp";

export = vienna_lib;

/*~ Write your module's methods and properties in this class */
declare class vienna_lib {
    FullEval (temperature_in: number, seqString: string, structString: string): vienna_lib.FullEvalResult;

    FullFoldDefault(seqString: string, structString: string): vienna_lib.FullFoldResult;
    FullFoldTemperature (temperature_in: number, seqString: string, structString: string): vienna_lib.FullFoldResult;
    GetDotPlot (temperature_in: number, seqString: string, dotplotStructString: string): vienna_lib.DotPlotResult;
    FullFoldWithBindingSite (seqString: string, structString: string, switch_bp_i: number, switch_bp_p: number, switch_bp_j: number, switch_bp_q: number, switch_bp_bonus: number): vienna_lib.FullFoldResult;
    CoFoldSequence (seqString: string, structString: string): vienna_lib.FullFoldResult;
    CoFoldSequenceWithBindingSite (seqString: string, structString: string, switch_bp_i: number, switch_bp_p: number, switch_bp_j: number, switch_bp_q: number, switch_bp_bonus: number): vienna_lib.FullFoldResult;
}

/*~ If you want to expose types from your module as well, you can
 *~ place them in this block.
 */
declare namespace vienna_lib {
    export interface FullEvalResult {
        nodes: stdcpp.vector<number>;
        energy: number;

        delete (): void;
    }

    export interface FullFoldResult {
        mfe: number;
        structure: string;

        delete (): void;
    }

    export interface DotPlotResult {
        energy: number;
        probabilitiesString: string;

        delete (): void;
    }
}

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
export = stdcpp;

/*~ Write your module's methods and properties in this class */
// declare class stdcpp {
// }


/*~ If you want to expose types from your module as well, you can
 *~ place them in this block.
 */

declare namespace stdcpp {
    // std::vector bindings
    export interface vector<T> {
        size(): number;
        get(index: number): T;
        push_back(val: T): void;
        clear(): void;
    }
}

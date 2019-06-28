import {EmscriptenUtil} from "eterna/folding/emscripten";
import {LinearFoldBase} from ".";

export default class LinearFoldC extends LinearFoldBase {
    public static readonly NAME = "LinearFoldC";

    /**
     * Asynchronously creates a new instance of the Vienna folder.
     * @returns {Promise<LinearFoldC>}
     */
    public static create(): Promise<LinearFoldC> {
        return import("./engines/LinearFoldC")
            .then((module: any) => EmscriptenUtil.loadProgram(module))
            .then((program: any) => new LinearFoldC(program));
    }

    public get name(): string {
        return LinearFoldC.NAME;
    }
}

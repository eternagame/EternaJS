import * as log from "loglevel";
import {EmscriptenUtil} from "../emscripten/EmscriptenUtil";
import {EPars} from "../EPars";
import {FullFoldResult} from "./engines/LinearFold_lib";
import * as LinearFold_lib from "./engines/LinearFold_lib/index";
import {Folder} from "./Folder";

export class LinearFold extends Folder {
    public static readonly NAME = "LinearFold";

    /**
     * Asynchronously creates a new instance of the Vienna folder.
     * @returns {Promise<LinearFold>}
     */
    public static create(): Promise<LinearFold> {
        return import("./engines/LinearFold")
            .then((module: any) => EmscriptenUtil.loadProgram(module))
            .then((program: any) => new LinearFold(program));
    }

    private constructor(lib: LinearFold_lib) {
        super();
        this._lib = lib;
    }

    /* override */
    public can_dot_plot(): boolean {
        return false;
    }

    /* override */
    public get_dot_plot(seq: number[], pairs: number[], temp: number = 37): number[] {
        log.warn("LinearFold.get_dot_plot: unimplemented");
        return [];
    }

    /* override */
    public get_folder_name(): string {
        return LinearFold.NAME;
    }

    /* override */
    public is_functional(): boolean {
        return true;
    }

    /* override */
    public can_score_structures(): boolean {
        return false;
    }

    /* override */
    public score_structures(seq: number[], pairs: number[], temp: number = 37, outNodes: number[] = null): number {
        log.warn("LinearFold.score_structures: unimplemented");
        return 0;
    }

    /* override */
    public fold_sequence(seq: number[], second_best_pairs: number[], desired_pairs: string = null, temp: number = 37): number[] {
        let key: any = {
            primitive: "fold",
            seq,
            second_best_pairs,
            desired_pairs,
            temp
        };

        let pairs: number[] = this.get_cache(key);
        if (pairs == null) {
            pairs = this.fullFoldDefault(seq);
            this.put_cache(key, pairs);
        }

        return pairs.slice();
    }

    private fullFoldDefault(seq: number[]): number[] {
        const seqStr = EPars.sequence_array_to_string(seq, false, false);
        let result: FullFoldResult;

        try {
            result = this._lib.FullFoldDefault(seqStr);
            return EPars.parenthesis_to_pair_array(result.structure);
        } catch (e) {
            log.error("FullFoldDefault error", e);
            return [];
        } finally {
            if (result != null) {
                result.delete();
                result = null;
            }
        }
    }

    /* override */
    public fold_sequence_with_binding_site(seq: number[], target_pairs: number[], binding_site: number[], bonus: number, version: number = 1.0, temp: number = 37): number[] {
        log.warn("LinearFold.fold_sequence_with_binding_site: unimplemented");
        return this.fold_sequence(seq, null);
    }

    /* override */
    public can_cofold(): boolean {
        return false;
    }

    /* override */
    public cofold_sequence(seq: number[], second_best_pairs: number[], malus: number = 0, desired_pairs: string = null, temp: number = 37): number[] {
        log.warn("LinearFold.cofold_sequence: unimplemented");
        return this.fold_sequence(seq, null);
    }

    /* override */
    public can_cofold_with_binding_site(): boolean {
        return false;
    }

    /* override */
    public cofold_sequence_with_binding_site(seq: number[], binding_site: number[], bonus: number, desired_pairs: string = null, malus: number = 0, temp: number = 37): number[] {
        log.warn("LinearFold.cofold_sequence_with_binding_site: unimplemented");
        return this.fold_sequence(seq, null);
    }

    /* override */
    public ml_energy(pairs: number[], S: number[], i: number, is_extloop: boolean): number {
        log.warn("LinearFold.ml_energy: unimplemented");
        return 0;
    }

    /* override */
    public cut_in_loop(i: number): number {
        log.warn("LinearFold.cut_in_loop: unimplemented");
        return 0;
    }

    /* override */
    public loop_energy(n1: number, n2: number, type: number, type_2: number, si1: number, sj1: number, sp1: number, sq1: number, b1: boolean, b2: boolean): number {
        log.warn("LinearFold.loop_energy: unimplemented");
        return 0;
    }

    /* override */
    public hairpin_energy(size: number, type: number, si1: number, sj1: number, sequence: number[], i: number, j: number): number {
        log.warn("LinearFold.hairpin_energy: unimplemented");
        return 0;
    }

    private readonly _lib: LinearFold_lib;
}

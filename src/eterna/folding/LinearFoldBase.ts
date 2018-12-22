import * as log from "loglevel";
import {EmscriptenUtil} from "../emscripten/EmscriptenUtil";
import {EPars} from "../EPars";
import {FullFoldResult} from "./engines/LinearFold_lib";
import * as LinearFold_lib from "./engines/LinearFold_lib/index";
import {Folder} from "./Folder";

export abstract class LinearFoldBase extends Folder {
    protected constructor(lib: LinearFold_lib) {
        super();
        this._lib = lib;
    }

    public get canDotPlot(): boolean {
        return false;
    }

    public getDotPlot(seq: number[], pairs: number[], temp: number = 37): number[] {
        log.warn("LinearFold.get_dot_plot: unimplemented");
        return [];
    }

    public get isFunctional(): boolean {
        return true;
    }

    public get canScoreStructures(): boolean {
        return false;
    }

    public scoreStructures(seq: number[], pairs: number[], temp: number = 37, outNodes: number[] = null): number {
        log.warn("LinearFold.score_structures: unimplemented");
        return 0;
    }

    public foldSequence(seq: number[], second_best_pairs: number[], desired_pairs: string = null, temp: number = 37): number[] {
        let key: any = {
            primitive: "fold",
            seq,
            second_best_pairs,
            desired_pairs,
            temp
        };

        let pairs: number[] = this.getCache(key);
        if (pairs == null) {
            pairs = this.fullFoldDefault(seq);
            this.putCache(key, pairs);
        }

        return pairs.slice();
    }

    private fullFoldDefault(seq: number[]): number[] {
        const seqStr = EPars.sequenceToString(seq, false, false);
        let result: FullFoldResult;

        try {
            result = this._lib.FullFoldDefault(seqStr);
            return EPars.parenthesisToPairs(result.structure);
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

    public foldSequenceWithBindingSite(seq: number[], target_pairs: number[], binding_site: number[], bonus: number, version: number = 1.0, temp: number = 37): number[] {
        log.warn("LinearFold.fold_sequence_with_binding_site: unimplemented");
        return this.foldSequence(seq, null);
    }

    public get canCofold(): boolean {
        return false;
    }

    public cofoldSequence(seq: number[], second_best_pairs: number[], malus: number = 0, desired_pairs: string = null, temp: number = 37): number[] {
        log.warn("LinearFold.cofold_sequence: unimplemented");
        return this.foldSequence(seq, null);
    }

    public get canCofoldWithBindingSite(): boolean {
        return false;
    }

    public cofoldSequenceWithBindingSite(seq: number[], binding_site: number[], bonus: number, desired_pairs: string = null, malus: number = 0, temp: number = 37): number[] {
        log.warn("LinearFold.cofold_sequence_with_binding_site: unimplemented");
        return this.foldSequence(seq, null);
    }

    public mlEnergy(pairs: number[], S: number[], i: number, is_extloop: boolean): number {
        log.warn("LinearFold.ml_energy: unimplemented");
        return 0;
    }

    public cutInLoop(i: number): number {
        log.warn("LinearFold.cut_in_loop: unimplemented");
        return 0;
    }

    public loopEnergy(n1: number, n2: number, type: number, type_2: number, si1: number, sj1: number, sp1: number, sq1: number, b1: boolean, b2: boolean): number {
        log.warn("LinearFold.loop_energy: unimplemented");
        return 0;
    }

    public hairpinEnergy(size: number, type: number, si1: number, sj1: number, sequence: number[], i: number, j: number): number {
        log.warn("LinearFold.hairpin_energy: unimplemented");
        return 0;
    }

    private readonly _lib: LinearFold_lib;
}

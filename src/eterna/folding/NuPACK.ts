import * as log from "loglevel";
import {EPars} from "../EPars";
import {Emscripten} from "../util/Emscripten";
import * as nupack_lib from "./engines/nupack_lib/index";
import {DotPlotResult, FullEvalResult, FullFoldResult} from "./engines/nupack_lib/index";
import {Folder} from "./Folder";
import {FoldUtil} from "./FoldUtil";

export class NuPACK extends Folder {
    public static NAME: string = "eterna.folding.NuPACK";

    /**
     * Asynchronously creates a new instance of the NuPACK folder.
     * @returns {Promise<NuPACK>}
     */
    public static create(): Promise<NuPACK> {
        return import('./engines/nupack')
            .then((module: any) => Emscripten.loadProgram(module))
            .then((program: any) => new NuPACK(program));
    }

    private constructor(lib: nupack_lib) {
        super();
        this._lib = lib;
    }

    /*override*/
    public can_dot_plot(): boolean {
        return true;
    }

    /*override*/
    public get_dot_plot(seq: number[], pairs: number[], temp: number = 37): number[] {
        let key: any = {primitive: "dotplot", seq: seq, pairs: pairs, temp: temp};
        let ret_array: number[] = this.get_cache(key);
        if (ret_array != null) {
            // trace("dotplot cache hit");
            return ret_array.slice();
        }

        let seq_str: string = EPars.sequence_array_to_string(seq);

        let result: DotPlotResult = null;
        try {
            result = this._lib.GetDotPlot(temp, seq_str);
            ret_array = result.plot.slice();
        } catch (e) {
            log.error("GetDotPlot error", e);
            return [];
        } finally {
            if (result != null) {
                result.delete();
                result = null;
            }
        }

        this.put_cache(key, ret_array.slice());
        return ret_array;
    }

    /*override*/
    public get_folder_name(): string {
        return NuPACK.NAME;
    }

    /*override*/
    public is_functional(): boolean {
        return true;
    }

    /*override*/
    public can_score_structures(): boolean {
        return true;
    }

    /*override*/
    public score_structures(seq: number[], pairs: number[], temp: number = 37, outNodes: number[] = null): number {
        let key: any = {primitive: "score", seq: seq, pairs: pairs, temp: temp};
        let result: any = this.get_cache(key);
        if (result != null) {
            // trace("score cache hit");
            if (outNodes != null) {
                for (let ii = 0; ii < result.nodes.length; ii++) {
                    outNodes.push(result.nodes[ii]);
                }
            }
            return result.ret[0] * 100;
        }

        let ret: FullEvalResult = null;
        try {
            ret = this._lib.FullEval(temp,
                EPars.sequence_array_to_string(seq),
                EPars.pairs_array_to_parenthesis(pairs));

            let cut: number = seq.lastIndexOf(EPars.RNABASE_CUT);
            if (cut >= 0 && outNodes != null) {
                if (outNodes[0] != -2 || outNodes.length == 2 || (outNodes[0] == -2 && outNodes[2] != -1)) {
                    // we just scored a duplex that wasn't one, so we have to redo it properly
                    let seqA: number[] = seq.slice(0, cut);
                    let pairsA: number[] = pairs.slice(0, cut);
                    let nodesA: number[] = [];
                    let retA: number = this.score_structures(seqA, pairsA, temp, nodesA);

                    let seqB: number[] = seq.slice(cut + 1);
                    let pairsB: number[] = pairs.slice(cut + 1);
                    for (let ii = 0; ii < pairsB.length; ii++) {
                        if (pairsB[ii] >= 0) pairsB[ii] -= (cut + 1);
                    }
                    let nodesB: number[] = [];
                    let retB: number = this.score_structures(seqB, pairsB, temp, nodesB);

                    if (nodesA[0] >= 0 || nodesB[0] != -1) {
                        throw new Error("Something went terribly wrong in score_structures()");
                    }

                    outNodes.splice(0); // make empty
                    for (let ii = 0; ii < nodesA.length; ii++) {
                        outNodes[ii] = nodesA[ii];
                    }
                    if (outNodes[0] == -2) {
                        outNodes[3] += nodesB[1]; // combine the free energies of the external loops
                    } else {
                        outNodes[1] += nodesB[1]; // combine the free energies of the external loops
                    }
                    for (let ii = 2; ii < nodesB.length; ii += 2) {
                        outNodes.push(nodesB[ii] + cut + 1);
                        outNodes.push(nodesB[ii + 1]);
                    }

                    ret.energy = (retA + retB) / 100;
                } else {
                    cut = 0;
                    for (let ii = 0; ii < outNodes.length; ii += 2) {
                        if (seq[ii / 2] == EPars.RNABASE_CUT) {
                            cut++;
                        } else {
                            outNodes[ii] += cut;
                        }
                    }
                }
            }

            let energy: number = ret.energy * 100;
            if (outNodes != null) {
                // TODO: do not store this deletable object in the cache!
                this.put_cache(key, ret);
                ret = null;
            }

            return energy;

        } catch (e) {
            log.error("FullEval error", e);
            return 0;
        } finally {
            if (ret != null) {
                ret.delete();
                ret = null;
            }
        }
    }

    /*override*/
    public fold_sequence(seq: number[], second_best_pairs: number[], desired_pairs: string = null, temp: number = 37): number[] {
        let key: any = {
            primitive: "eterna.folding",
            seq: seq,
            second_best_pairs: second_best_pairs,
            desired_pairs: desired_pairs,
            temp: temp
        };
        let pairs: number[] = this.get_cache(key);
        if (pairs != null) {
            // trace("fold cache hit");
            return pairs.slice();
        }

        pairs = this.fold_sequence_alch(seq, desired_pairs, temp);
        this.put_cache(key, pairs.slice());
        return pairs;
    }

    /*override*/
    public fold_sequence_with_binding_site(seq: number[], target_pairs: number[], binding_site: number[], bonus: number, version: number = 1.0, temp: number = 37): number[] {
        let key: any = {
            primitive: "fold_aptamer",
            seq: seq,
            target_pairs: target_pairs,
            binding_site: binding_site,
            bonus: bonus,
            version: version,
            temp: temp
        };
        let pairs: number[] = this.get_cache(key);
        if (pairs != null) {
            // trace("fold_aptamer cache hit");
            return pairs.slice();
        }

        let site_groups: number[][] = [];
        let last_index: number = -1;
        let current_group: number[] = [];

        for (let jj: number = 0; jj < binding_site.length; jj++) {
            if (last_index < 0 || binding_site[jj] - last_index == 1) {
                current_group.push(binding_site[jj]);
                last_index = binding_site[jj];
            } else {
                site_groups.push(current_group);
                current_group = [];
                current_group.push(binding_site[jj]);
                last_index = binding_site[jj];
            }
        }
        if (current_group.length > 0) {
            site_groups.push(current_group);
        }

        pairs = this.fold_sequence_alch_with_binding_site(seq, site_groups[0][0], site_groups[0][site_groups[0].length - 1], site_groups[1][site_groups[1].length - 1], site_groups[1][0], bonus, temp);

        this.put_cache(key, pairs.slice());
        return pairs;
    }

    /*override*/
    public cofold_sequence(seq: number[], second_best_pairs: number[], malus: number = 0, desired_pairs: string = null, temp: number = 37): number[] {
        let cut: number = seq.indexOf(EPars.RNABASE_CUT);
        if (cut < 0) {
            throw new Error("Missing cutting point");
        }

        let key: any = {
            primitive: "cofold",
            seq: seq,
            second_best_pairs: second_best_pairs,
            malus: malus,
            desired_pairs: desired_pairs,
            temp: temp
        };
        let co_pairs: number[] = this.get_cache(key);
        if (co_pairs != null) {
            // trace("cofold cache hit");
            return co_pairs.slice();
        }

        // FIXME: what about desired_pairs? (forced structure)
        let seqA: number[] = seq.slice(0, cut);
        let pairsA: number[] = this.fold_sequence(seqA, null, null, temp);
        let nodesA: number[] = [];
        let feA: number = this.score_structures(seqA, pairsA, temp, nodesA);

        let seqB: number[] = seq.slice(cut + 1);
        let pairsB: number[] = this.fold_sequence(seqB, null, null, temp);
        let nodesB: number[] = [];
        let feB: number = this.score_structures(seqB, pairsB, temp, nodesB);

        co_pairs = this.cofold_sequence_alch(seq, desired_pairs, temp);
        let co_nodes: number[] = [];
        let co_fe: number = this.score_structures(seq, co_pairs, temp, co_nodes);

        if (co_fe + malus >= feA + feB) {
            let struc: string = EPars.pairs_array_to_parenthesis(pairsA) + "&" + EPars.pairs_array_to_parenthesis(pairsB);
            co_pairs = EPars.parenthesis_to_pair_array(struc);
        }

        this.put_cache(key, co_pairs.slice());
        return co_pairs;
    }

    /*override*/
    public can_cofold_with_binding_site(): boolean {
        return true;
    }

    /*override*/
    public cofold_sequence_with_binding_site(seq: number[], binding_site: number[], bonus: number, desired_pairs: string = null, malus: number = 0, temp: number = 37): number[] {
        let cut: number = seq.indexOf(EPars.RNABASE_CUT);
        if (cut < 0) {
            throw new Error("Missing cutting point");
        }

        let key: any = {
            primitive: "cofold_aptamer",
            seq: seq,
            malus: malus,
            desired_pairs: desired_pairs,
            binding_site: binding_site,
            bonus: bonus,
            temp: temp
        };
        let co_pairs: number[] = this.get_cache(key);
        if (co_pairs != null) {
            // trace("cofold_aptamer cache hit");
            return co_pairs.slice();
        }

        // IMPORTANT: assumption is that the binding site is in segment A
        // FIXME: what about desired_pairs? (forced structure)

        let site_groups: number[][] = [];
        let last_index: number = -1;
        let current_group: number[] = [];

        for (let jj: number = 0; jj < binding_site.length; jj++) {
            if (last_index < 0 || binding_site[jj] - last_index == 1) {
                current_group.push(binding_site[jj]);
                last_index = binding_site[jj];
            } else {
                site_groups.push(current_group);
                current_group = [];
                current_group.push(binding_site[jj]);
                last_index = binding_site[jj];
            }
        }
        if (current_group.length > 0) {
            site_groups.push(current_group);
        }

        let seqA: number[] = seq.slice(0, cut);
        let pairsA: number[] = this.fold_sequence_with_binding_site(seqA, null, binding_site, bonus, 2.5, temp);
        let nodesA: number[] = [];
        let feA: number = this.score_structures(seqA, pairsA, temp, nodesA);
        if (FoldUtil.binding_site_formed(pairsA, site_groups)) {
            feA += bonus;
        }

        let seqB: number[] = seq.slice(cut + 1);
        let pairsB: number[] = this.fold_sequence(seqB, null, null, temp);
        let nodesB: number[] = [];
        let feB: number = this.score_structures(seqB, pairsB, temp, nodesB);

        co_pairs = this.cofold_sequence_alch_with_binding_site(seq, desired_pairs, site_groups[0][0], site_groups[0][site_groups[0].length - 1], site_groups[1][site_groups[1].length - 1], site_groups[1][0], bonus, temp);
        let co_nodes: number[] = [];
        let co_fe: number = this.score_structures(seq, co_pairs, temp, co_nodes);
        if (FoldUtil.binding_site_formed(co_pairs, site_groups)) {
            co_fe += bonus;
        }

        if (co_fe + malus >= feA + feB) {
            let struc: string = EPars.pairs_array_to_parenthesis(pairsA) + "&" + EPars.pairs_array_to_parenthesis(pairsB);
            co_pairs = EPars.parenthesis_to_pair_array(struc);
        }

        this.put_cache(key, co_pairs.slice());
        return co_pairs;
    }

    /*override*/
    public can_multifold(): boolean {
        return true;
    }

    /*override*/
    public multifold(seq: number[], second_best_pairs: number[], oligos: any[], desired_pairs: string = null, temp: number = 37): any {
        let key: any = {
            primitive: "multifold",
            seq: seq,
            second_best_pairs: second_best_pairs,
            oligos: oligos,
            desired_pairs: desired_pairs,
            temp: temp
        };
        let mfold: any = this.get_cache(key);
        if (mfold != null) {
            // trace("multifold cache hit");
            return mfold;
        }

        mfold = {};
        mfold['pairs'] = null;
        mfold['order'] = null;
        mfold['count'] = -1;

        let best_fe: number = 1000000;
        let order: number[] = [];
        let num_oligo: number = oligos.length;

        for (let ii = 0; ii < num_oligo; ii++) {
            order.push(ii);
        }

        let more: boolean;
        do {
            for (let ii = num_oligo; ii >= 0; ii--) {
                let ms_seq: number[] = seq.slice();
                for (let jj = 0; jj < ii; jj++) {
                    ms_seq.push(EPars.RNABASE_CUT);
                    ms_seq = ms_seq.concat(oligos[order[jj]].seq);
                }
                let ms_pairs: number[];
                if (ii == 0) {
                    ms_pairs = this.fold_sequence(ms_seq, null, null, temp);
                } else {
                    ms_pairs = this.cofold_seq2(ms_seq, null, null, temp);
                }
                let ms_nodes: number[] = [];
                let ms_fe: number = this.score_structures(ms_seq, ms_pairs, temp, ms_nodes);
                for (let jj = 0; jj < ii; jj++) {
                    ms_fe += oligos[order[jj]].malus;
                }
                for (let jj = ii; jj < num_oligo; jj++) {
                    let s_pairs: number[] = this.fold_sequence(oligos[order[jj]].seq, null, null, temp);
                    let s_nodes: number[] = [];
                    let s_fe: number = this.score_structures(oligos[order[jj]].seq, s_pairs, temp, s_nodes);

                    let struc: string = EPars.pairs_array_to_parenthesis(ms_pairs) + "&" + EPars.pairs_array_to_parenthesis(s_pairs);
                    ms_pairs = EPars.parenthesis_to_pair_array(struc);
                    ms_fe += s_fe;
                }

                if (ms_fe < best_fe) {
                    best_fe = ms_fe;
                    mfold.pairs = ms_pairs.slice();
                    mfold.order = order.slice();
                    mfold.count = ii;
                }
            }

            more = FoldUtil.next_perm(order);
        } while (more);

        this.put_cache(key, mfold);
        return mfold;
    }

    /*override*/
    public multifold_unroll(seq: number[], second_best_pairs: number[], oligos: any[], desired_pairs: string = null, temp: number = 37): number[] {
        let ops: any[] = [];

        let order: number[] = [];
        let num_oligo: number = oligos.length;

        for (let ii = 0; ii < num_oligo; ii++) {
            order.push(ii);
        }

        for (let ii = 0; ii < num_oligo; ii++) {
            ops.push({objref: this, fn: this.fold_sequence, arg: [oligos[ii].seq, null, null, temp]});
        }

        let more: boolean;
        do {
            for (let ii = num_oligo; ii >= 0; ii--) {
                let ms_seq: number[] = seq.slice();
                for (let jj = 0; jj < ii; jj++) {
                    ms_seq.push(EPars.RNABASE_CUT);
                    ms_seq = ms_seq.concat(oligos[order[jj]].seq);
                }

                if (ii == 0) {
                    ops.push({objref: this, fn: this.fold_sequence, arg: [ms_seq, null, null, temp]});
                } else {
                    ops.push({objref: this, fn: this.cofold_seq2, arg: [ms_seq, null, null, temp]});
                }
            }

            more = FoldUtil.next_perm(order);
        } while (more);

        ops.push({objref: this, fn: this.multifold, arg: [seq, second_best_pairs, oligos, desired_pairs, temp]});
        return ops;
    }

    private fold_sequence_alch(seq: number[], structStr: string = null, temp: number = 37): number[] {
        const seqStr = EPars.sequence_array_to_string(seq, false, false);

        let result: FullFoldResult = null;
        try {
            result = this._lib.FullFoldTemperature(temp, seqStr);
            return EPars.parenthesis_to_pair_array(result.structure);
        } catch (e) {
            log.error("FullFoldTemperature error", e);
            return [];
        } finally {
            if (result != null) {
                result.delete();
                result = null;
            }
        }
    }

    private fold_sequence_alch_with_binding_site(seq: number[], i: number, p: number, j: number, q: number, bonus: number, temp: number = 37): number[] {
        const seqStr = EPars.sequence_array_to_string(seq, false, false);

        let result: FullFoldResult = null;
        try {
            result = this._lib.FullFoldWithBindingSite(seqStr, i, p, j, q, -bonus);
            return EPars.parenthesis_to_pair_array(result.structure);
        } catch (e) {
            log.error("FullFoldWithBindingSite error", e);
            return [];
        } finally {
            if (result != null) {
                result.delete();
                result = null;
            }
        }
    }

    private cofold_sequence_alch(seq: number[], str: string = null, temp: number = 37): number[] {
        const seqStr = EPars.sequence_array_to_string(seq, true, false);

        let result: FullFoldResult = null;
        try {
            result = this._lib.CoFoldSequence(seqStr);
            log.debug("done cofolding");
            return EPars.parenthesis_to_pair_array(result.structure);
        } catch (e) {
            log.error("CoFoldSequence error", e);
            return [];
        } finally {
            if (result != null) {
                result.delete();
                result = null;
            }
        }
    }

    private cofold_sequence_alch_with_binding_site(seq: number[], str: string, i: number, p: number, j: number, q: number, bonus: number, temp: number = 37): number[] {
        const seqStr = EPars.sequence_array_to_string(seq, true, false);

        let result: FullFoldResult;
        try {
            result = this._lib.CoFoldSequenceWithBindingSite(seqStr, i, p, j, q, -bonus);
            log.debug("done cofolding_wbs");
            return EPars.parenthesis_to_pair_array(result.structure);
        } catch (e) {
            log.error('CoFoldSequenceWithBindingSite error', e);
            return [];
        } finally {
            if (result != null) {
                result.delete();
                result = null;
            }
        }
    }

    private cofold_seq2(seq: number[], second_best_pairs: number[], desired_pairs: string = null, temp: number = 37): number[] {
        let key: any = {
            primitive: "cofold2",
            seq: seq,
            second_best_pairs: second_best_pairs,
            desired_pairs: desired_pairs,
            temp: temp
        };
        let co_pairs: number[] = this.get_cache(key);
        if (co_pairs != null) {
            // trace("cofold2 cache hit");
            return co_pairs.slice();
        }

        co_pairs = this.cofold_sequence_alch(seq, desired_pairs, temp);

        this.put_cache(key, co_pairs.slice());
        return co_pairs;
    }

    private readonly _lib: nupack_lib;

}

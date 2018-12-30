import * as log from "loglevel";
import {EmscriptenUtil} from "../emscripten/EmscriptenUtil";
import {EPars} from "../EPars";
import {PoseOp} from "../pose2D/PoseOp";
import {int} from "../util/int";
import * as nupack_lib from "./engines/nupack_lib/index";
import {DotPlotResult, FullEvalResult, FullFoldResult} from "./engines/nupack_lib/index";
import {Folder} from "./Folder";
import {FoldUtil} from "./FoldUtil";

export class NuPACK extends Folder {
    public static NAME = "NuPACK";

    /**
     * Asynchronously creates a new instance of the NuPACK folder.
     * @returns {Promise<NuPACK>}
     */
    public static create(): Promise<NuPACK> {
        return import("./engines/nupack")
            .then((module: any) => EmscriptenUtil.loadProgram(module))
            .then((program: any) => new NuPACK(program));
    }

    private constructor(lib: nupack_lib) {
        super();
        this._lib = lib;
    }

    /* override */
    public get canDotPlot(): boolean {
        return true;
    }

    /* override */
    public getDotPlot(seq: number[], pairs: number[], temp: number = 37): number[] {
        let key: any = {
            primitive: "dotplot", seq, pairs, temp
        };
        let ret_array: number[] = this.getCache(key);
        if (ret_array != null) {
            // trace("dotplot cache hit");
            return ret_array.slice();
        }

        let seq_str: string = EPars.sequenceToString(seq);

        let result: DotPlotResult = null;
        try {
            result = this._lib.GetDotPlot(temp, seq_str);
            ret_array = EmscriptenUtil.stdVectorToArray(result.plot);
        } catch (e) {
            log.error("GetDotPlot error", e);
            return [];
        } finally {
            if (result != null) {
                result.delete();
                result = null;
            }
        }

        this.putCache(key, ret_array.slice());
        return ret_array;
    }

    /* override */
    public get name(): string {
        return NuPACK.NAME;
    }

    /* override */
    public get isFunctional(): boolean {
        return true;
    }

    /* override */
    public get canScoreStructures(): boolean {
        return true;
    }

    /* override */
    public scoreStructures(seq: number[], pairs: number[], temp: number = 37, outNodes: number[] = null): number {
        let key: any = {
            primitive: "score", seq, pairs, temp
        };
        let cache: FullEvalCache = this.getCache(key);
        if (cache != null) {
            // trace("score cache hit");
            if (outNodes != null) {
                FoldUtil.arrayCopy(outNodes, cache.nodes);
            }
            return cache.energy * 100;
        }

        do {
            let result: FullEvalResult = null;
            try {
                result = this._lib.FullEval(temp,
                    EPars.sequenceToString(seq),
                    EPars.pairsToParenthesis(pairs));
                cache = {energy: result.energy, nodes: EmscriptenUtil.stdVectorToArray<number>(result.nodes)};
            } catch (e) {
                log.error("FullEval error", e);
                return 0;
            } finally {
                if (result != null) {
                    result.delete();
                }
            }
        } while (0);

        let cut: number = seq.lastIndexOf(EPars.RNABASE_CUT);
        if (cut >= 0) {
            if (cache.nodes[0] !== -2 || cache.nodes.length === 2 || (cache.nodes[0] === -2 && cache.nodes[2] !== -1)) {
                // we just scored a duplex that wasn't one, so we have to redo it properly
                let seqA: number[] = seq.slice(0, cut);
                let pairsA: number[] = pairs.slice(0, cut);
                let nodesA: number[] = [];
                let retA: number = this.scoreStructures(seqA, pairsA, temp, nodesA);

                let seqB: number[] = seq.slice(cut + 1);
                let pairsB: number[] = pairs.slice(cut + 1);
                for (let ii = 0; ii < pairsB.length; ii++) {
                    if (pairsB[ii] >= 0) {
                        pairsB[ii] -= (cut + 1);
                    }
                }
                let nodesB: number[] = [];
                let retB: number = this.scoreStructures(seqB, pairsB, temp, nodesB);

                if (nodesA[0] >= 0 || nodesB[0] !== -1) {
                    throw new Error("Something went terribly wrong in score_structures()");
                }

                cache.nodes.splice(0); // make empty
                for (let ii = 0; ii < nodesA.length; ii++) {
                    cache.nodes[ii] = nodesA[ii];
                }
                if (cache.nodes[0] === -2) {
                    cache.nodes[3] += nodesB[1]; // combine the free energies of the external loops
                } else {
                    cache.nodes[1] += nodesB[1]; // combine the free energies of the external loops
                }
                for (let ii = 2; ii < nodesB.length; ii += 2) {
                    cache.nodes.push(nodesB[ii] + cut + 1);
                    cache.nodes.push(nodesB[ii + 1]);
                }

                cache.energy = (retA + retB) / 100;
            } else {
                cut = 0;
                for (let ii = 0; ii < cache.nodes.length; ii += 2) {
                    if (seq[ii / 2] === EPars.RNABASE_CUT) {
                        cut++;
                    } else {
                        cache.nodes[ii] += cut;
                    }
                }
            }
        }

        this.putCache(key, cache);

        if (outNodes != null) {
            FoldUtil.arrayCopy(outNodes, cache.nodes);
        }
        return int(cache.energy * 100);
    }

    /* override */
    public foldSequence(seq: number[], second_best_pairs: number[], desired_pairs: string = null, temp: number = 37): number[] {
        let key: any = {
            primitive: "fold",
            seq,
            second_best_pairs,
            desired_pairs,
            temp
        };
        let pairs: number[] = this.getCache(key);
        if (pairs != null) {
            // trace("fold cache hit");
            return pairs.slice();
        }

        pairs = this.foldSequenceImpl(seq, temp);
        this.putCache(key, pairs.slice());
        return pairs;
    }

    public get canFoldWithBindingSite(): boolean {
        return true;
    }

    /* override */
    public foldSequenceWithBindingSite(seq: number[], target_pairs: number[], binding_site: number[], bonus: number, version: number = 1.0, temp: number = 37): number[] {
        let key: any = {
            primitive: "fold_aptamer",
            seq,
            target_pairs,
            binding_site,
            bonus,
            version,
            temp
        };
        let pairs: number[] = this.getCache(key);
        if (pairs != null) {
            // trace("fold_aptamer cache hit");
            return pairs.slice();
        }

        let site_groups: number[][] = [];
        let last_index: number = -1;
        let current_group: number[] = [];

        for (let jj: number = 0; jj < binding_site.length; jj++) {
            if (last_index < 0 || binding_site[jj] - last_index === 1) {
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

        pairs = this.foldSequenceWithBindingSiteImpl(seq, site_groups[0][0], site_groups[0][site_groups[0].length - 1], site_groups[1][site_groups[1].length - 1], site_groups[1][0], bonus, temp);

        this.putCache(key, pairs.slice());
        return pairs;
    }

    /* override */
    public cofoldSequence(seq: number[], second_best_pairs: number[], malus: number = 0, desired_pairs: string = null, temp: number = 37): number[] {
        let cut: number = seq.indexOf(EPars.RNABASE_CUT);
        if (cut < 0) {
            throw new Error("Missing cutting point");
        }

        let key: any = {
            primitive: "cofold",
            seq,
            second_best_pairs,
            malus,
            desired_pairs,
            temp
        };
        let co_pairs: number[] = this.getCache(key);
        if (co_pairs != null) {
            // trace("cofold cache hit");
            return co_pairs.slice();
        }

        // FIXME: what about desired_pairs? (forced structure)
        let seqA: number[] = seq.slice(0, cut);
        let pairsA: number[] = this.foldSequence(seqA, null, null, temp);
        let nodesA: number[] = [];
        let feA: number = this.scoreStructures(seqA, pairsA, temp, nodesA);

        let seqB: number[] = seq.slice(cut + 1);
        let pairsB: number[] = this.foldSequence(seqB, null, null, temp);
        let nodesB: number[] = [];
        let feB: number = this.scoreStructures(seqB, pairsB, temp, nodesB);

        co_pairs = this.cofoldSequenceImpl(seq);
        let co_nodes: number[] = [];
        let co_fe: number = this.scoreStructures(seq, co_pairs, temp, co_nodes);

        if (co_fe + malus >= feA + feB) {
            let struc: string = `${EPars.pairsToParenthesis(pairsA)}&${EPars.pairsToParenthesis(pairsB)}`;
            co_pairs = EPars.parenthesisToPairs(struc);
        }

        this.putCache(key, co_pairs.slice());
        return co_pairs;
    }

    /* override */
    public can_cofold_with_binding_site(): boolean {
        return true;
    }

    /* override */
    public cofoldSequenceWithBindingSite(seq: number[], binding_site: number[], bonus: number, desired_pairs: string = null, malus: number = 0, temp: number = 37): number[] {
        let cut: number = seq.indexOf(EPars.RNABASE_CUT);
        if (cut < 0) {
            throw new Error("Missing cutting point");
        }

        let key: any = {
            primitive: "cofold_aptamer",
            seq,
            malus,
            desired_pairs,
            binding_site,
            bonus,
            temp
        };
        let co_pairs: number[] = this.getCache(key);
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
            if (last_index < 0 || binding_site[jj] - last_index === 1) {
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
        let pairsA: number[] = this.foldSequenceWithBindingSite(seqA, null, binding_site, bonus, 2.5, temp);
        let nodesA: number[] = [];
        let feA: number = this.scoreStructures(seqA, pairsA, temp, nodesA);
        if (FoldUtil.bindingSiteFormed(pairsA, site_groups)) {
            feA += bonus;
        }

        let seqB: number[] = seq.slice(cut + 1);
        let pairsB: number[] = this.foldSequence(seqB, null, null, temp);
        let nodesB: number[] = [];
        let feB: number = this.scoreStructures(seqB, pairsB, temp, nodesB);

        co_pairs = this.cofoldSequenceWithBindingSiteImpl(seq, desired_pairs, site_groups[0][0], site_groups[0][site_groups[0].length - 1], site_groups[1][site_groups[1].length - 1], site_groups[1][0], bonus, temp);
        let co_nodes: number[] = [];
        let co_fe: number = this.scoreStructures(seq, co_pairs, temp, co_nodes);
        if (FoldUtil.bindingSiteFormed(co_pairs, site_groups)) {
            co_fe += bonus;
        }

        if (co_fe + malus >= feA + feB) {
            let struc: string = `${EPars.pairsToParenthesis(pairsA)}&${EPars.pairsToParenthesis(pairsB)}`;
            co_pairs = EPars.parenthesisToPairs(struc);
        }

        this.putCache(key, co_pairs.slice());
        return co_pairs;
    }

    /* override */
    public get canMultifold(): boolean {
        return true;
    }

    /* override */
    public multifold(seq: number[], second_best_pairs: number[], oligos: any[], desired_pairs: string = null, temp: number = 37): any {
        let key: any = {
            primitive: "multifold",
            seq,
            second_best_pairs,
            oligos,
            desired_pairs,
            temp
        };
        let mfold: any = this.getCache(key);
        if (mfold != null) {
            // trace("multifold cache hit");
            return mfold;
        }

        mfold = {};
        mfold["pairs"] = null;
        mfold["order"] = null;
        mfold["count"] = -1;

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
                if (ii === 0) {
                    ms_pairs = this.foldSequence(ms_seq, null, null, temp);
                } else {
                    ms_pairs = this.cofoldSeq2(ms_seq, null, null, temp);
                }
                let ms_nodes: number[] = [];
                let ms_fe: number = this.scoreStructures(ms_seq, ms_pairs, temp, ms_nodes);
                for (let jj = 0; jj < ii; jj++) {
                    ms_fe += oligos[order[jj]].malus;
                }
                for (let jj = ii; jj < num_oligo; jj++) {
                    let s_pairs: number[] = this.foldSequence(oligos[order[jj]].seq, null, null, temp);
                    let s_nodes: number[] = [];
                    let s_fe: number = this.scoreStructures(oligos[order[jj]].seq, s_pairs, temp, s_nodes);

                    let struc: string = `${EPars.pairsToParenthesis(ms_pairs)}&${EPars.pairsToParenthesis(s_pairs)}`;
                    ms_pairs = EPars.parenthesisToPairs(struc);
                    ms_fe += s_fe;
                }

                if (ms_fe < best_fe) {
                    best_fe = ms_fe;
                    mfold.pairs = ms_pairs.slice();
                    mfold.order = order.slice();
                    mfold.count = ii;
                }
            }

            more = FoldUtil.nextPerm(order);
        } while (more);

        this.putCache(key, mfold);
        return mfold;
    }

    public multifoldUnroll(seq: number[], second_best_pairs: number[], oligos: any[], desired_pairs: string = null, temp: number = 37): PoseOp[] {
        let ops: PoseOp[] = [];

        let order: number[] = [];
        let num_oligo: number = oligos.length;

        for (let ii = 0; ii < num_oligo; ii++) {
            order.push(ii);
        }

        for (let ii = 0; ii < num_oligo; ii++) {
            ops.push(new PoseOp(null, () => this.foldSequence(oligos[ii].seq, null, null, temp)));
        }

        let more: boolean;
        do {
            for (let ii = num_oligo; ii >= 0; ii--) {
                let ms_seq: number[] = seq.slice();
                for (let jj = 0; jj < ii; jj++) {
                    ms_seq.push(EPars.RNABASE_CUT);
                    ms_seq = ms_seq.concat(oligos[order[jj]].seq);
                }

                if (ii === 0) {
                    ops.push(new PoseOp(null, () => this.foldSequence(ms_seq, null, null, temp)));
                } else {
                    ops.push(new PoseOp(null, () => this.cofoldSeq2(ms_seq, null, null, temp)));
                }
            }

            more = FoldUtil.nextPerm(order);
        } while (more);

        ops.push(new PoseOp(null, () => this.multifold(seq, second_best_pairs, oligos, desired_pairs, temp)));
        return ops;
    }

    private foldSequenceImpl(seq: number[], temp: number = 37): number[] {
        const seqStr = EPars.sequenceToString(seq, false, false);

        let result: FullFoldResult = null;
        try {
            result = this._lib.FullFoldTemperature(temp, seqStr);
            return EPars.parenthesisToPairs(result.structure);
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

    private foldSequenceWithBindingSiteImpl(seq: number[], i: number, p: number, j: number, q: number, bonus: number, temp: number = 37): number[] {
        const seqStr = EPars.sequenceToString(seq, false, false);

        let result: FullFoldResult = null;
        try {
            result = this._lib.FullFoldWithBindingSite(seqStr, i, p, j, q, -bonus);
            return EPars.parenthesisToPairs(result.structure);
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

    private cofoldSequenceImpl(seq: number[]): number[] {
        const seqStr = EPars.sequenceToString(seq, true, false);

        let result: FullFoldResult = null;
        try {
            result = this._lib.CoFoldSequence(seqStr);
            log.debug("done cofolding");
            return EPars.parenthesisToPairs(result.structure);
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

    private cofoldSequenceWithBindingSiteImpl(seq: number[], str: string, i: number, p: number, j: number, q: number, bonus: number, temp: number = 37): number[] {
        const seqStr = EPars.sequenceToString(seq, true, false);

        let result: FullFoldResult;
        try {
            result = this._lib.CoFoldSequenceWithBindingSite(seqStr, i, p, j, q, -bonus);
            log.debug("done cofolding_wbs");
            return EPars.parenthesisToPairs(result.structure);
        } catch (e) {
            log.error("CoFoldSequenceWithBindingSite error", e);
            return [];
        } finally {
            if (result != null) {
                result.delete();
                result = null;
            }
        }
    }

    private cofoldSeq2(seq: number[], second_best_pairs: number[], desired_pairs: string = null, temp: number = 37): number[] {
        let key: any = {
            primitive: "cofold2",
            seq,
            second_best_pairs,
            desired_pairs,
            temp
        };
        let co_pairs: number[] = this.getCache(key);
        if (co_pairs != null) {
            // trace("cofold2 cache hit");
            return co_pairs.slice();
        }

        co_pairs = this.cofoldSequenceImpl(seq);

        this.putCache(key, co_pairs.slice());
        return co_pairs;
    }

    private readonly _lib: nupack_lib;
}

interface FullEvalCache {
    nodes: number[];
    energy: number;
}

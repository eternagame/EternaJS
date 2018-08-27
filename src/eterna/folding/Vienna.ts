import * as log from "loglevel";
import {EmscriptenUtil} from "../emscripten/EmscriptenUtil";
import {EPars} from "../EPars";
import {RNALayout} from "../pose2D/RNALayout";
import {CSVParser} from "../util/CSVParser";
import * as vienna_lib from "./engines/vienna_lib/index";
import {DotPlotResult, FullEvalResult, FullFoldResult} from "./engines/vienna_lib/index";
import {Folder} from "./Folder";
import {FoldUtil} from "./FoldUtil";

export class Vienna extends Folder {
    public static readonly NAME: string = "Vienna";

    /**
     * Asynchronously creates a new instance of the Vienna folder.
     * @returns {Promise<Vienna>}
     */
    public static create(): Promise<Vienna> {
        return import("./engines/vienna")
            .then((module: any) => EmscriptenUtil.loadProgram(module))
            .then((program: any) => new Vienna(program));
    }

    private constructor(lib: vienna_lib) {
        super();
        this._lib = lib;
    }

    public get canDotPlot(): boolean {
        return true;
    }

    public getDotPlot(seq: number[], pairs: number[], temp: number = 37): number[] {
        let key: any = {
            primitive: "dotplot", seq, pairs, temp
        };
        let ret_array: number[] = this.getCache(key);
        if (ret_array != null) {
            // log.debug("dotplot cache hit");
            return ret_array.slice();
        }

        let secstruct_str: string = EPars.pairs_array_to_parenthesis(pairs);
        let seq_str: string = EPars.sequence_array_to_string(seq);

        let probabilitiesString: string;
        let result: DotPlotResult;
        try {
            result = this._lib.GetDotPlot(temp, seq_str, secstruct_str);
            probabilitiesString = result.probabilitiesString;
        } catch (e) {
            log.error("GetDotPlot error", e);
            return [];
        } finally {
            if (result != null) {
                result.delete();
                result = null;
            }
        }

        let temp_array: string[] = CSVParser.parse_into_array_with_white_spaces(probabilitiesString);
        ret_array = [];

        if (temp_array.length % 4 !== 0) {
            throw new Error(`Something's wrong with dot plot return ${temp_array.length}`);
        }

        for (let ii: number = 0; ii < temp_array.length; ii += 4) {
            if (temp_array[ii + 3] === "ubox") {
                ret_array.push(Number(temp_array[ii]));
                ret_array.push(Number(temp_array[ii + 1]));
                ret_array.push(Number(temp_array[ii + 2]));
            } else {
                ret_array.push(Number(temp_array[ii + 1]));
                ret_array.push(Number(temp_array[ii]));
                ret_array.push(Number(temp_array[ii + 2]));
            }
        }

        this.putCache(key, ret_array.slice());
        return ret_array;
    }

    public get name(): string {
        return Vienna.NAME;
    }

    public get isFunctional(): boolean {
        return true;
    }

    public get canScoreStructures(): boolean {
        return true;
    }

    public scoreStructures(seq: number[], pairs: number[], temp: number = 37, outNodes: number[] = null): number {
        let key: any = {
            primitive: "score", seq, pairs, temp
        };
        let cache: FullEvalCache = this.getCache(key);

        if (cache != null) {
            // log.debug("score cache hit");
            if (outNodes != null) {
                FoldUtil.arrayCopy(outNodes, cache.nodes);
            }
            return cache.energy * 100;
        }

        do {
            let result: FullEvalResult = null;
            try {
                result = this._lib.FullEval(temp,
                    EPars.sequence_array_to_string(seq),
                    EPars.pairs_array_to_parenthesis(pairs));
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

        let cut: number = seq.indexOf(EPars.RNABASE_CUT);
        if (cut >= 0 && cache.nodes[0] !== -2) {
            // we just scored a duplex that wasn't one, so we have to redo it properly
            let seqA: number[] = seq.slice(0, cut);
            let pairsA: number[] = pairs.slice(0, cut);
            let nodesA: number[] = [];
            let retA: number = this.scoreStructures(seqA, pairsA, temp, nodesA);

            let seqB: number[] = seq.slice(cut + 1);
            let pairsB: number[] = pairs.slice(cut + 1);
            for (let ii = 0; ii < pairsB.length; ii++) {
                if (pairsB[ii] >= 0) pairsB[ii] -= (cut + 1);
            }
            let nodesB: number[] = [];
            let retB: number = this.scoreStructures(seqB, pairsB, temp, nodesB);

            if (nodesA[0] !== -1 || nodesB[0] !== -1) {
                throw new Error("Something went terribly wrong in score_structures()");
            }

            cache.nodes.splice(0); // make empty
            for (let ii = 0; ii < nodesA.length; ii++) {
                cache.nodes[ii] = nodesA[ii];
            }
            cache.nodes[1] += nodesB[1]; // combine the free energies of the external loops
            for (let ii = 2; ii < nodesB.length; ii += 2) {
                cache.nodes.push(nodesB[ii] + cut + 1);
                cache.nodes.push(nodesB[ii + 1]);
            }

            cache.energy = (retA + retB) / 100;
        }

        this.putCache(key, cache);

        let energy: number = cache.energy * 100;
        if (outNodes != null) {
            FoldUtil.arrayCopy(outNodes, cache.nodes);
        }

        return energy;
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
        if (pairs != null) {
            // log.debug("fold cache hit");
            return pairs.slice();
        }

        pairs = this.foldSequenceImpl(seq, desired_pairs, temp);
        this.putCache(key, pairs.slice());
        return pairs;
    }

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
            // log.debug("fold_aptamer cache hit");
            return pairs.slice();
        }

        if (!(version >= 2.0)) {
            pairs = this.foldSequenceWithBindingSiteOld(seq, target_pairs, binding_site, bonus);
            this.putCache(key, pairs.slice());
            return pairs;
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

        if (site_groups.length === 2) {
            pairs = this.foldSequenceWithBindingSiteImpl(seq, site_groups[0][0], site_groups[0][site_groups[0].length - 1], site_groups[1][site_groups[1].length - 1], site_groups[1][0], bonus, temp);
        } else {
            pairs = this.foldSequenceWithBindingSiteOld(seq, target_pairs, binding_site, bonus);
        }

        this.putCache(key, pairs.slice());
        return pairs;
    }

    public get canCofold(): boolean {
        return true;
    }

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
            // log.debug("cofold cache hit");
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

        co_pairs = this.cofoldSequenceImpl(seq, desired_pairs, temp);
        let co_nodes: number[] = [];
        let co_fe: number = this.scoreStructures(seq, co_pairs, temp, co_nodes);

        if (co_fe + malus >= feA + feB) {
            let struc: string = `${EPars.pairs_array_to_parenthesis(pairsA)}&${EPars.pairs_array_to_parenthesis(pairsB)}`;
            co_pairs = EPars.parenthesis_to_pair_array(struc);
        }

        this.putCache(key, co_pairs.slice());
        return co_pairs;
    }

    public get canCofoldWithBindingSite(): boolean {
        return true;
    }

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
            // log.debug("cofold_aptamer cache hit");
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
        if (FoldUtil.bindingSiteFormed(pairsA, site_groups)) feA += bonus;

        let seqB: number[] = seq.slice(cut + 1);
        let pairsB: number[] = this.foldSequence(seqB, null, null, temp);
        let nodesB: number[] = [];
        let feB: number = this.scoreStructures(seqB, pairsB, temp, nodesB);

        co_pairs = this.cofoldSequenceWithBindingSiteImpl(seq, desired_pairs, site_groups[0][0], site_groups[0][site_groups[0].length - 1], site_groups[1][site_groups[1].length - 1], site_groups[1][0], bonus, temp);
        let co_nodes: number[] = [];
        let co_fe: number = this.scoreStructures(seq, co_pairs, temp, co_nodes);
        if (FoldUtil.bindingSiteFormed(co_pairs, site_groups)) co_fe += bonus;

        if (co_fe + malus >= feA + feB) {
            let struc: string = `${EPars.pairs_array_to_parenthesis(pairsA)}&${EPars.pairs_array_to_parenthesis(pairsB)}`;
            co_pairs = EPars.parenthesis_to_pair_array(struc);
        }

        this.putCache(key, co_pairs.slice());
        return co_pairs;
    }

    public mlEnergy(pairs: number[], S: number[], i: number, is_extloop: boolean): number {
        let energy: number,
            cx_energy: number,
            best_energy: number;
        best_energy = EPars.INF;
        let i1: number,
            j: number,
            p: number,
            q: number,
            u: number,
            x: number,
            type: number,
            count: number;
        let mlintern: number[] = new Array(EPars.NBPAIRS + 1);
        let mlclosing: number,
            mlbase: number;

        let dangles: number = EPars.DANGLES;

        if (is_extloop) {
            for (x = 0; x <= EPars.NBPAIRS; x++) {
                mlintern[x] = EPars.ml_intern(x) - EPars.ml_intern(1);
                /* 0 or TerminalAU */
            }

            mlclosing = mlbase = 0;
        } else {
            for (x = 0; x <= EPars.NBPAIRS; x++) {
                mlintern[x] = EPars.ml_intern(x);
            }

            mlclosing = EPars.ML_CLOSING37;
            mlbase = EPars.ML_BASE37;
        }

        for (count = 0; count < 2; count++) { /* do it twice */
            let ld5: number = 0;
            /* 5' dangle energy on prev pair (type) */
            if (i === 0) {
                j = pairs[0] + 1;
                type = 0;
                /* no pair */
            } else {
                j = pairs[i];
                type = EPars.pair_type(S[j], S[i]);

                if (type === 0) {
                    type = 7;
                }
            }
            i1 = i;
            p = i + 1;
            u = 0;
            energy = 0;
            cx_energy = EPars.INF;

            do { /* walk around the multi-loop */
                let tt: number,
                    new_cx: number;
                new_cx = EPars.INF;

                /* hope over unpaired positions */
                while (p <= pairs[0] && pairs[p] === 0) p++;

                /* memorize number of unpaired positions */
                u += p - i1 - 1;
                /* get position of pairing partner */
                if (p === pairs[0] + 1) {
                    q = tt = 0;
                    /* virtual root pair */
                } else {
                    q = pairs[p];
                    /* get type of base pair P->q */
                    tt = EPars.pair_type(S[p], S[q]);
                    if (tt === 0) tt = 7;
                }

                energy += mlintern[tt];
                cx_energy += mlintern[tt];

                if (dangles) {
                    let dang5: number = 0;
                    let dang3: number = 0;
                    let dang: number = 0;
                    if ((p > 1)) {
                        dang5 = EPars.get_dangle5_score(tt, S[p - 1]);
                        /* 5'dangle of pq pair */
                    }
                    if ((i1 < S[0])) {
                        dang3 = EPars.get_dangle3_score(type, S[i1 + 1]);
                        /* 3'dangle of previous pair */
                    }

                    switch (p - i1 - 1) {
                    case 0: /* adjacent helices */
                    case 1: /* 1 unpaired base between helices */
                        dang = (dangles === 2) ? (dang3 + dang5) : Math.min(dang3, dang5);
                        energy += dang;
                        break;

                    default: /* many unpaired base between helices */
                        energy += dang5 + dang3;
                    }
                    type = tt;
                }

                i1 = q;
                p = q + 1;
            } while (q !== i);

            best_energy = Math.min(energy, best_energy);
            /* don't use cx_energy here */

            if (dangles !== 3 || is_extloop) {
                break;
                /* may break cofold with co-ax */
            }
            /* skip a helix and start again */
            while (pairs[p] === 0) {
                p++;
            }
            if (i === pairs[p]) break;
            i = pairs[p];
        }

        energy = best_energy;
        energy += mlclosing;

        energy += mlbase * u;

        return energy;
    }

    public cutInLoop(i: number): number {
        return 0;
    }

    public loopEnergy(n1: number, n2: number, type: number, type_2: number, si1: number, sj1: number, sp1: number, sq1: number, b1: boolean, b2: boolean): number {
        let loop_score: number = 0;

        /* compute energy of degree 2 loop (stack bulge or interior) */
        let nl: number,
            ns: number;

        if (n1 > n2) {
            nl = n1;
            ns = n2;
        } else {
            nl = n2;
            ns = n1;
        }

        if (nl === 0) {
            return EPars.get_stack_score(type, type_2, b1, b2);
            /* stack */
        }

        if (ns === 0) { /* bulge */
            if (nl <= EPars.MAXLOOP) {
                loop_score = EPars.bulge37[nl];
            } else {
                loop_score = EPars.get_bulge(nl);
            }
            if (nl === 1) {
                loop_score += EPars.get_stack_score(type, type_2, b1, b2);
            } else {
                if (type > 2) {
                    loop_score += EPars.TERM_AU;
                }
                if (type_2 > 2) {
                    loop_score += EPars.TERM_AU;
                }
            }
            return loop_score;
        } else { /* interior loop */
            if (ns === 1) {
                if (nl === 1) // 1x1 loop
                {
                    return EPars.get_int11(type, type_2, si1, sj1);
                }

                if (nl === 2) { // 2x1 loop
                    if (n1 === 1) {
                        loop_score = EPars.get_int21(type, type_2, si1, sq1, sj1);
                    } else {
                        loop_score = EPars.get_int21(type_2, type, sq1, si1, sp1);
                    }

                    return loop_score;
                }
            } else if (n1 === 2 && n2 === 2) // 2x2 loop
            {
                return EPars.get_int22(type, type_2, si1, sp1, sq1, sj1);
            }

            {
                /* generic interior loop (no else here!) */
                if ((n1 + n2 <= EPars.MAXLOOP)) {
                    loop_score = EPars.internal37[n1 + n2];
                } else {
                    loop_score = EPars.get_internal(n1 + n2);
                }

                loop_score += Math.min(EPars.MAX_NINIO, (nl - ns) * EPars.F_ninio37[2]);
                loop_score += EPars.internal_mismatch(type, si1, sj1) + EPars.internal_mismatch(type_2, sq1, sp1);
            }
        }

        return loop_score;
    }

    public hairpinEnergy(size: number, type: number, si1: number, sj1: number, sequence: number[], i: number, j: number): number {
        let hairpin_score: number = 0;

        if (size <= 30) {
            hairpin_score = EPars.hairpin37[size];
        } else {
            hairpin_score = EPars.hairpin37[30] + Number(EPars.LXC * Math.log((size) / 30.0));
        }

        if (size === 4) {
            let loop_str: string = "";
            for (let walker: number = i; walker <= j; walker++) {
                if (sequence[walker] === EPars.RNABASE_ADENINE) {
                    loop_str += "A";
                } else if (sequence[walker] === EPars.RNABASE_GUANINE) {
                    loop_str += "G";
                } else if (sequence[walker] === EPars.RNABASE_URACIL) {
                    loop_str += "U";
                } else if (sequence[walker] === EPars.RNABASE_CYTOSINE) {
                    loop_str += "C";
                }
            }

            hairpin_score += EPars.get_tetra_loop_bonus(loop_str);
        }

        if (size === 3) {
            if (type > 2) {
                hairpin_score += EPars.TERM_AU;
            }
        } else {
            hairpin_score += EPars.hairpin_mismatch(type, si1, sj1);
        }

        return hairpin_score;
    }

    private foldSequenceImpl(seq: number[], structStr: string = null, temp: number = 37): number[] {
        const seqStr = EPars.sequence_array_to_string(seq, false, false);
        let result: FullFoldResult;

        try {
            result = this._lib.FullFoldTemperature(temp, seqStr, structStr || "");
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

    private foldSequenceWithBindingSiteImpl(seq: number[], i: number, p: number, j: number, q: number, bonus: number, temp: number = 37): number[] {
        const seqStr = EPars.sequence_array_to_string(seq, false, false);
        const structStr: string = "";
        let result: FullFoldResult;

        try {
            result = this._lib.FullFoldWithBindingSite(seqStr, structStr, i + 1, p + 1, j + 1, q + 1, -bonus);
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

    private cofoldSequenceImpl(seq: number[], str: string = null, temp: number = 37): number[] {
        const seqStr = EPars.sequence_array_to_string(seq, true, false);
        const structStr: string = str || "";
        let result: FullFoldResult;

        try {
            result = this._lib.CoFoldSequence(seqStr, structStr);
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

    private cofoldSequenceWithBindingSiteImpl(seq: number[], str: string, i: number, p: number, j: number, q: number, bonus: number, temp: number = 37): number[] {
        const seqStr = EPars.sequence_array_to_string(seq, true, false);
        const structStr: string = str || "";
        let result: FullFoldResult;

        try {
            result = this._lib.CoFoldSequenceWithBindingSite(seqStr, structStr, i + 1, p + 1, j + 1, q + 1, -bonus);
            log.debug("done cofolding");
            return EPars.parenthesis_to_pair_array(result.structure);
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

    private foldSequenceWithBindingSiteOld(seq: number[], target_pairs: number[], binding_site: number[], bonus: number, temp: number = 37): number[] {
        let best_pairs: number[];
        let native_pairs: number[] = this.foldSequence(seq, null, null);

        let native_tree: RNALayout = new RNALayout();
        native_tree.setup_tree(native_pairs);
        native_tree.score_tree(seq, this);
        let native_score: number = native_tree.get_total_score();

        let target_satisfied: number[] = EPars.get_satisfied_pairs(target_pairs, seq);
        let target_tree: RNALayout = new RNALayout();
        target_tree.setup_tree(target_satisfied);
        target_tree.score_tree(seq, this);
        let target_score: number = target_tree.get_total_score();

        let native_bound: boolean = true;
        let target_bound: boolean = true;

        for (let bb: number = 0; bb < binding_site.length; bb++) {
            let bi: number = binding_site[bb];
            if (target_pairs[bi] !== native_pairs[bi]) {
                native_bound = false;
            }

            if (target_pairs[bi] !== target_satisfied[bi]) {
                target_bound = false;
            }
        }

        if (target_bound) {
            target_score += bonus;
        }

        if (native_bound) {
            native_score += bonus;
        }

        if (target_score < native_score) {
            best_pairs = target_satisfied;
        } else {
            best_pairs = native_pairs;
        }

        return best_pairs;
    }

    private readonly _lib: vienna_lib;
}

interface FullEvalCache {
    nodes: number[];
    energy: number;
}

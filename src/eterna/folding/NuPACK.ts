import * as log from 'loglevel';
import EPars from 'eterna/EPars';
/* eslint-disable import/no-duplicates, import/no-unresolved */
import EmscriptenUtil from 'eterna/emscripten/EmscriptenUtil';
import PoseOp from 'eterna/pose2D/PoseOp';
import int from 'eterna/util/int';
import {Oligo} from 'eterna/pose2D/Pose2D';
import * as NupackLib from './engines/NupackLib';
import {DotPlotResult, FullEvalResult, FullFoldResult} from './engines/NupackLib';
/* eslint-enable import/no-duplicates, import/no-unresolved */
import Folder, {MultiFoldResult, CacheKey, FullEvalCache} from './Folder';
import FoldUtil from './FoldUtil';

export default class NuPACK extends Folder {
    public static NAME = 'NuPACK';

    /**
     * Asynchronously creates a new instance of the NuPACK folder.
     * @returns {Promise<NuPACK>}
     * @description AMW TODO cannot annotate type of module/program; both are any.
     */
    public static create(): Promise<NuPACK | null> {
        // eslint-disable-next-line import/no-unresolved, import/no-extraneous-dependencies
        return import('engines-bin/nupack')
            .then((module) => EmscriptenUtil.loadProgram(module))
            .then((program) => new NuPACK(program))
            .catch((err) => null);
    }

    private constructor(lib: NupackLib) {
        super();
        this._lib = lib;
    }

    /* override */
    public get canDotPlot(): boolean {
        return true;
    }

    /* override */
    public get canPseudoknot(): boolean {
        return true;
    }

    /* override */
    public getDotPlot(seq: number[], pairs: number[], temp: number = 37, pseudoknots: boolean = false): number[] {
        // AMW TODO: actually NOT pk aware yet
        let key: CacheKey = {
            primitive: 'dotplot', seq, pairs, temp
        };
        let retArray: number[] = this.getCache(key) as number[];
        if (retArray != null) {
            // trace("dotplot cache hit");
            return retArray.slice();
        }

        let seqStr: string = EPars.sequenceToString(seq);

        let result: DotPlotResult | null = null;
        try {
            result = this._lib.GetDotPlot(temp, seqStr);
            if (!result) {
                throw new Error('NuPACK returned a null result');
            }
            retArray = EmscriptenUtil.stdVectorToArray(result.plot);
        } catch (e) {
            log.error('GetDotPlot error', e);
            return [];
        } finally {
            if (result != null) {
                result.delete();
                result = null;
            }
        }

        this.putCache(key, retArray.slice());
        return retArray;
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
    public scoreStructures(
        seq: number[], pairs: number[],
        pseudoknots: boolean = false, temp: number = 37, outNodes: number[] | null = null
    ): number {
        let key: CacheKey = {
            primitive: 'score', seq, pairs, pseudoknots, temp
        };
        let cache: FullEvalCache = this.getCache(key) as FullEvalCache;
        if (cache != null) {
            // trace("score cache hit");
            if (outNodes != null) {
                FoldUtil.arrayCopy(outNodes, cache.nodes);
            }
            return cache.energy * 100;
        }

        do {
            let result: FullEvalResult | null = null;
            try {
                result = this._lib.FullEval(temp,
                    EPars.sequenceToString(seq),
                    EPars.pairsToParenthesis(pairs, null, pseudoknots));
                if (!result) {
                    throw new Error('NuPACK returned a null result');
                }
                cache = {energy: result.energy, nodes: EmscriptenUtil.stdVectorToArray<number>(result.nodes)};
            } catch (e) {
                log.error('FullEval error', e);
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
                let retA: number = this.scoreStructures(seqA, pairsA, pseudoknots, temp, nodesA);

                let seqB: number[] = seq.slice(cut + 1);
                let pairsB: number[] = pairs.slice(cut + 1);
                for (let ii = 0; ii < pairsB.length; ii++) {
                    if (pairsB[ii] >= 0) {
                        pairsB[ii] -= (cut + 1);
                    }
                }
                let nodesB: number[] = [];
                let retB: number = this.scoreStructures(seqB, pairsB, pseudoknots, temp, nodesB);

                if (nodesA[0] >= 0 || nodesB[0] !== -1) {
                    throw new Error('Something went terribly wrong in scoreStructures()');
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
    public foldSequence(
        seq: number[], secondBestPairs: number[] | null, desiredPairs: string | null = null,
        pseudoknots: boolean = false, temp: number = 37
    ): number[] {
        let key = {
            primitive: 'fold',
            seq,
            secondBestPairs,
            desiredPairs,
            pseudoknots,
            temp
        };
        let pairs: number[] = this.getCache(key) as number[];
        if (pairs != null) {
            // trace("fold cache hit");
            return pairs.slice();
        }

        pairs = this.foldSequenceImpl(seq, temp, pseudoknots);
        this.putCache(key, pairs.slice());
        return pairs;
    }

    public get canFoldWithBindingSite(): boolean {
        return true;
    }

    /* override */
    public foldSequenceWithBindingSite(
        seq: number[], targetPairs: number[] | null, bindingSite: number[], bonus: number,
        version: number = 1.0, temp: number = 37
    ): number[] {
        let key = {
            primitive: 'foldAptamer',
            seq,
            targetPairs,
            bindingSite,
            bonus,
            version,
            temp
        };
        let pairs: number[] = this.getCache(key) as number[];
        if (pairs != null) {
            // trace("foldAptamer cache hit");
            return pairs.slice();
        }

        let siteGroups: number[][] = [];
        let lastIndex = -1;
        let currentGroup: number[] = [];

        for (let jj = 0; jj < bindingSite.length; jj++) {
            if (lastIndex < 0 || bindingSite[jj] - lastIndex === 1) {
                currentGroup.push(bindingSite[jj]);
                lastIndex = bindingSite[jj];
            } else {
                siteGroups.push(currentGroup);
                currentGroup = [];
                currentGroup.push(bindingSite[jj]);
                lastIndex = bindingSite[jj];
            }
        }
        if (currentGroup.length > 0) {
            siteGroups.push(currentGroup);
        }

        pairs = this.foldSequenceWithBindingSiteImpl(
            seq, siteGroups[0][0], siteGroups[0][siteGroups[0].length - 1], siteGroups[1][siteGroups[1].length - 1],
            siteGroups[1][0], bonus, temp
        );

        this.putCache(key, pairs.slice());
        return pairs;
    }

    /* override */
    public get canCofold(): boolean {
        return true;
    }

    /* override */
    public cofoldSequence(
        seq: number[], secondBestPairs: number[], malus: number = 0,
        desiredPairs: string | null = null, temp: number = 37
    ): number[] {
        let cut: number = seq.indexOf(EPars.RNABASE_CUT);
        if (cut < 0) {
            throw new Error('Missing cutting point');
        }

        let key: CacheKey = {
            primitive: 'cofold',
            seq,
            secondBestPairs,
            malus,
            desiredPairs,
            temp
        };
        let coPairs: number[] = this.getCache(key) as number[];
        if (coPairs != null) {
            // trace("cofold cache hit");
            return coPairs.slice();
        }

        // FIXME: what about desiredPairs? (forced structure)
        let seqA: number[] = seq.slice(0, cut);
        let pairsA: number[] = this.foldSequence(seqA, null, null, false, temp);
        let nodesA: number[] = [];
        let feA: number = this.scoreStructures(seqA, pairsA, false, temp, nodesA);

        let seqB: number[] = seq.slice(cut + 1);
        let pairsB: number[] = this.foldSequence(seqB, null, null, false, temp);
        let nodesB: number[] = [];
        let feB: number = this.scoreStructures(seqB, pairsB, false, temp, nodesB);

        coPairs = this.cofoldSequenceImpl(seq);
        let coNodes: number[] = [];
        let coFE: number = this.scoreStructures(seq, coPairs, false, temp, coNodes);

        if (coFE + malus >= feA + feB) {
            let struc = `${EPars.pairsToParenthesis(pairsA)}&${EPars.pairsToParenthesis(pairsB)}`;
            coPairs = EPars.parenthesisToPairs(struc);
        }

        this.putCache(key, coPairs.slice());
        return coPairs;
    }

    /* override */
    public get canCofoldWithBindingSite(): boolean {
        return true;
    }

    /* override */
    public cofoldSequenceWithBindingSite(
        seq: number[], bindingSite: number[], bonus: number, desiredPairs: string | null = null,
        malus: number = 0, temp: number = 37
    ): number[] {
        let cut: number = seq.indexOf(EPars.RNABASE_CUT);
        if (cut < 0) {
            throw new Error('Missing cutting point');
        }

        let key: CacheKey = {
            primitive: 'cofoldAptamer',
            seq,
            malus,
            desiredPairs,
            bindingSite,
            bonus,
            temp
        };
        let coPairs: number[] = this.getCache(key) as number[];
        if (coPairs != null) {
            // trace("cofoldAptamer cache hit");
            return coPairs.slice();
        }

        // IMPORTANT: assumption is that the binding site is in segment A
        // FIXME: what about desiredPairs? (forced structure)

        let siteGroups: number[][] = [];
        let lastIndex = -1;
        let currentGroup: number[] = [];

        for (let jj = 0; jj < bindingSite.length; jj++) {
            if (lastIndex < 0 || bindingSite[jj] - lastIndex === 1) {
                currentGroup.push(bindingSite[jj]);
                lastIndex = bindingSite[jj];
            } else {
                siteGroups.push(currentGroup);
                currentGroup = [];
                currentGroup.push(bindingSite[jj]);
                lastIndex = bindingSite[jj];
            }
        }
        if (currentGroup.length > 0) {
            siteGroups.push(currentGroup);
        }

        let seqA: number[] = seq.slice(0, cut);
        let pairsA: number[] = this.foldSequenceWithBindingSite(seqA, null, bindingSite, bonus, 2.5, temp);
        let nodesA: number[] = [];
        let feA: number = this.scoreStructures(seqA, pairsA, false, temp, nodesA);
        if (FoldUtil.bindingSiteFormed(pairsA, siteGroups)) {
            feA += bonus;
        }

        let seqB: number[] = seq.slice(cut + 1);
        let pairsB: number[] = this.foldSequence(seqB, null, null, false, temp);
        let nodesB: number[] = [];
        let feB: number = this.scoreStructures(seqB, pairsB, false, temp, nodesB);

        coPairs = this.cofoldSequenceWithBindingSiteImpl(
            seq, desiredPairs, siteGroups[0][0], siteGroups[0][siteGroups[0].length - 1],
            siteGroups[1][siteGroups[1].length - 1], siteGroups[1][0], bonus, temp
        );
        let coNodes: number[] = [];
        let coFE: number = this.scoreStructures(seq, coPairs, false, temp, coNodes);
        if (FoldUtil.bindingSiteFormed(coPairs, siteGroups)) {
            coFE += bonus;
        }

        if (coFE + malus >= feA + feB) {
            let struc = `${EPars.pairsToParenthesis(pairsA)}&${EPars.pairsToParenthesis(pairsB)}`;
            coPairs = EPars.parenthesisToPairs(struc);
        }

        this.putCache(key, coPairs.slice());
        return coPairs;
    }

    /* override */
    public get canMultifold(): boolean {
        return true;
    }

    /* override */
    public multifold(
        seq: number[], secondBestPairs: number[], oligos: Oligo[], desiredPairs: string | null = null, temp: number = 37
    ): MultiFoldResult {
        let key: CacheKey = {
            primitive: 'multifold',
            seq,
            secondBestPairs,
            oligos,
            desiredPairs,
            temp
        };
        let mfold: MultiFoldResult = this.getCache(key) as MultiFoldResult;
        if (mfold != null) {
            // trace("multifold cache hit");
            return mfold;
        }

        mfold = {
            pairs: [], // original had null
            order: [], // original had null
            count: -1
        };
        let bestFE = 1000000;
        let order: number[] = [];
        let numOligo: number = oligos.length;

        for (let ii = 0; ii < numOligo; ii++) {
            order.push(ii);
        }

        let more: boolean;
        do {
            for (let ii = numOligo; ii >= 0; ii--) {
                let msSeq: number[] = seq.slice();
                for (let jj = 0; jj < ii; jj++) {
                    msSeq.push(EPars.RNABASE_CUT);
                    msSeq = msSeq.concat(oligos[order[jj]].sequence);
                }
                let msPairs: number[];
                if (ii === 0) {
                    msPairs = this.foldSequence(msSeq, null, null, false, temp);
                } else {
                    msPairs = this.cofoldSeq2(msSeq, null, null, temp);
                }
                let msNodes: number[] = [];
                let msFE: number = this.scoreStructures(msSeq, msPairs, false, temp, msNodes);
                for (let jj = 0; jj < ii; jj++) {
                    msFE += oligos[order[jj]].malus;
                }
                for (let jj = ii; jj < numOligo; jj++) {
                    let sPairs: number[] = this.foldSequence(oligos[order[jj]].sequence, null, null, false, temp);
                    let sNodes: number[] = [];
                    let sFE: number = this.scoreStructures(oligos[order[jj]].sequence, sPairs, false, temp, sNodes);

                    let struc = `${EPars.pairsToParenthesis(msPairs)}&${EPars.pairsToParenthesis(sPairs)}`;
                    msPairs = EPars.parenthesisToPairs(struc);
                    msFE += sFE;
                }

                if (msFE < bestFE) {
                    bestFE = msFE;
                    mfold.pairs = msPairs.slice();
                    mfold.order = order.slice();
                    mfold.count = ii;
                }
            }

            more = FoldUtil.nextPerm(order);
        } while (more);

        this.putCache(key, mfold);
        return mfold;
    }

    public multifoldUnroll(
        seq: number[], secondBestPairs: number[], oligos: Oligo[], desiredPairs: string | null = null, temp: number = 37
    ): PoseOp[] {
        let ops: PoseOp[] = [];

        let order: number[] = [];
        let numOligo: number = oligos.length;

        for (let ii = 0; ii < numOligo; ii++) {
            order.push(ii);
        }

        for (let ii = 0; ii < numOligo; ii++) {
            ops.push(new PoseOp(null, () => this.foldSequence(oligos[ii].sequence, null, null, false, temp)));
        }

        let more: boolean;
        do {
            for (let ii = numOligo; ii >= 0; ii--) {
                let msSeq: number[] = seq.slice();
                for (let jj = 0; jj < ii; jj++) {
                    msSeq.push(EPars.RNABASE_CUT);
                    msSeq = msSeq.concat(oligos[order[jj]].sequence);
                }

                if (ii === 0) {
                    ops.push(new PoseOp(null, () => this.foldSequence(msSeq, null, null, false, temp)));
                } else {
                    ops.push(new PoseOp(null, () => this.cofoldSeq2(msSeq, null, null, temp)));
                }
            }

            more = FoldUtil.nextPerm(order);
        } while (more);

        ops.push(new PoseOp(null, () => this.multifold(seq, secondBestPairs, oligos, desiredPairs, temp)));
        return ops;
    }

    private foldSequenceImpl(seq: number[], temp: number = 37, pseudoknots: boolean = false): number[] {
        const seqStr = EPars.sequenceToString(seq, false, false);

        let result: FullFoldResult | null = null;
        try {
            result = this._lib.FullFoldTemperature(temp, seqStr, pseudoknots);
            if (!result) {
                throw new Error('NuPACK returned a null result');
            }
            return EPars.parenthesisToPairs(result.structure, pseudoknots);
        } catch (e) {
            log.error('FullFoldTemperature error', e);
            return [];
        } finally {
            if (result != null) {
                result.delete();
                result = null;
            }
        }
    }

    private foldSequenceWithBindingSiteImpl(
        seq: number[], i: number, p: number, j: number, q: number, bonus: number, temp: number = 37
    ): number[] {
        const seqStr = EPars.sequenceToString(seq, false, false);

        let result: FullFoldResult | null = null;
        try {
            result = this._lib.FullFoldWithBindingSite(seqStr, i, p, j, q, -bonus);
            if (!result) {
                throw new Error('NuPACK returned a null result');
            }
            return EPars.parenthesisToPairs(result.structure);
        } catch (e) {
            log.error('FullFoldWithBindingSite error', e);
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

        let result: FullFoldResult | null = null;
        try {
            result = this._lib.CoFoldSequence(seqStr);
            log.debug('done cofolding');
            if (!result) {
                throw new Error('NuPACK returned a null result');
            }
            return EPars.parenthesisToPairs(result.structure);
        } catch (e) {
            log.error('CoFoldSequence error', e);
            return [];
        } finally {
            if (result != null) {
                result.delete();
                result = null;
            }
        }
    }

    private cofoldSequenceWithBindingSiteImpl(
        seq: number[], str: string | null, i: number, p: number, j: number, q: number, bonus: number, temp: number = 37
    ): number[] {
        const seqStr = EPars.sequenceToString(seq, true, false);

        let result: FullFoldResult | null = null;
        try {
            result = this._lib.CoFoldSequenceWithBindingSite(seqStr, i, p, j, q, -bonus);
            log.debug('done cofoldingWBS');
            if (!result) {
                throw new Error('NuPACK returned a null result');
            }
            return EPars.parenthesisToPairs(result.structure);
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

    private cofoldSeq2(
        seq: number[], secondBestPairs: number[] | null, desiredPairs: string | null = null, temp: number = 37
    ): number[] {
        let key: CacheKey = {
            primitive: 'cofold2',
            seq,
            secondBestPairs,
            desiredPairs,
            temp
        };
        let coPairs: number[] = this.getCache(key) as number[];
        if (coPairs != null) {
            // trace("cofold2 cache hit");
            return coPairs.slice();
        }

        coPairs = this.cofoldSequenceImpl(seq);

        this.putCache(key, coPairs.slice());
        return coPairs;
    }

    private readonly _lib: NupackLib;
}

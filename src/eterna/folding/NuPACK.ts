import * as log from 'loglevel';
import {RNABase} from 'eterna/EPars';
import EmscriptenUtil from 'eterna/emscripten/EmscriptenUtil';
import PoseOp from 'eterna/pose2D/PoseOp';
import int from 'eterna/util/int';
import {Oligo} from 'eterna/rnatypes/Oligo';
import DotPlot from 'eterna/rnatypes/DotPlot';
import SecStruct from 'eterna/rnatypes/SecStruct';
import Sequence from 'eterna/rnatypes/Sequence';
/* eslint-disable import/no-duplicates, import/no-unresolved */
import * as NupackLib from './engines/NupackLib';
import {
    DotPlotResult, FullEvalResult, FullFoldResult, FullAdvancedResult
} from './engines/NupackLib';
/* eslint-enable import/no-duplicates, import/no-unresolved */
import Folder, {
    MultiFoldResult, CacheKey, FullEvalCache, SuboptEnsembleResult
} from './Folder';
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
            .catch((_err) => null);
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
    public getDotPlot(seq: Sequence, pairs: SecStruct, temp: number = 37, _pseudoknots: boolean = false): DotPlot {
        // AMW TODO: actually NOT pk aware yet
        const key: CacheKey = {
            primitive: 'dotplot', seq: seq.baseArray, pairs: pairs.pairs, temp
        };
        let retArray: number[] = this.getCache(key) as number[];
        if (retArray != null) {
            // trace("dotplot cache hit");
            return new DotPlot(retArray);
        }

        const seqStr: string = seq.sequenceString();

        let result: DotPlotResult | null = null;
        try {
            result = this._lib.GetDotPlot(temp, seqStr);
            if (!result) {
                throw new Error('NuPACK returned a null result');
            }
            retArray = EmscriptenUtil.stdVectorToArray(result.plot);
        } catch (e) {
            log.error('GetDotPlot error', e);
            return new DotPlot([]);
        } finally {
            if (result != null) {
                result.delete();
                result = null;
            }
        }

        this.putCache(key, retArray.slice());
        return new DotPlot(retArray);
    }

    /* override */
    public get name(): string {
        return NuPACK.NAME;
    }

    /* override */
    public getSuboptEnsembleWithOligos(seq: Sequence, oligoStrings: string[], kcalDeltaRange: number,
        pseudoknotted: boolean = false, temp: number = 37): SuboptEnsembleResult {
        const key = {
            primitive: 'subopt',
            seq: seq.baseArray,
            kcalDeltaRange,
            pseudoknotted,
            temp
        };

        let suboptdataCache: SuboptEnsembleResult = this.getCache(key) as SuboptEnsembleResult;
        if (suboptdataCache != null) {
            // trace("getSuboptEnsemble cache hit");
            return suboptdataCache;
        }

        // initialize empty result cache
        suboptdataCache = {
            ensembleDefect: 0,
            suboptStructures: [],
            suboptEnergyError: [],
            suboptFreeEnergy: []
        };

        let newSequence: string = seq.sequenceString();
        for (let oligoIndex = 0; oligoIndex < oligoStrings.length; oligoIndex++) {
            const oligoSequence: string = oligoStrings[oligoIndex];
            newSequence = `${newSequence}&${oligoSequence}`;
        }

        // now get subopt stuff
        const seqArr: Sequence = Sequence.fromSequenceString(newSequence);

        // run nupack code
        // pass a new sequence strucure as teh strucuture based on the concatinated oligo string
        let result: FullAdvancedResult | null = null;
        result = this._lib.FullEnsembleWithOligos(
            seqArr.sequenceString(), temp,
            kcalDeltaRange, pseudoknotted
        );

        if (!result) {
            throw new Error('NuPACK returned a null result');
        }

        // prepare teh results for return and storage in cache
        const suboptStructures: string[] = EmscriptenUtil.stdVectorToArray(result.suboptStructures);
        suboptdataCache.suboptStructures = suboptStructures;

        const suboptStructuresEnergyErrors: number[] = EmscriptenUtil.stdVectorToArray(result.suboptEnergyError);
        suboptdataCache.suboptEnergyError = suboptStructuresEnergyErrors;

        const suboptStructuresFreeEnergy: number[] = EmscriptenUtil.stdVectorToArray(result.suboptFreeEnergy);
        suboptdataCache.suboptFreeEnergy = suboptStructuresFreeEnergy;

        this.putCache(key, suboptdataCache);
        return suboptdataCache;
    }

    /* override */
    public getSuboptEnsembleNoBindingSite(seq: Sequence, kcalDeltaRange: number,
        pseudoknotted: boolean = false, temp: number = 37): SuboptEnsembleResult {
        const key = {
            primitive: 'subopt',
            seq: seq.baseArray,
            kcalDeltaRange,
            pseudoknotted,
            // bindingSite,
            // bonus,
            temp
        };

        let suboptdataCache: SuboptEnsembleResult = this.getCache(key) as SuboptEnsembleResult;
        if (suboptdataCache != null) {
            // trace("getSuboptEnsemble cache hit");
            return suboptdataCache;
        }

        // initialize empty result cache
        suboptdataCache = {
            ensembleDefect: 0,
            suboptStructures: [],
            suboptEnergyError: [],
            suboptFreeEnergy: []
        };

        let result: FullAdvancedResult | null = null;
        result = this._lib.FullEnsembleNoBindingSite(
            seq.sequenceString(), temp,
            kcalDeltaRange, pseudoknotted
        );

        if (!result) {
            throw new Error('NuPACK returned a null result');
        }

        // prepare teh results for return and storage in cache
        const suboptStructures: string[] = EmscriptenUtil.stdVectorToArray(result.suboptStructures);
        suboptdataCache.suboptStructures = suboptStructures;

        const suboptStructuresEnergyErrors: number[] = EmscriptenUtil.stdVectorToArray(result.suboptEnergyError);
        suboptdataCache.suboptEnergyError = suboptStructuresEnergyErrors;

        const suboptStructuresFreeEnergy: number[] = EmscriptenUtil.stdVectorToArray(result.suboptFreeEnergy);
        suboptdataCache.suboptFreeEnergy = suboptStructuresFreeEnergy;

        this.putCache(key, suboptdataCache);
        return suboptdataCache;
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
        seq: Sequence, pairs: SecStruct,
        pseudoknots: boolean = false, temp: number = 37, outNodes: number[] | null = null
    ): number {
        const key: CacheKey = {
            primitive: 'score', seq: seq.baseArray, pairs: pairs.pairs, pseudoknots, temp
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
                    seq.sequenceString(),
                    pairs.getParenthesis(null, pseudoknots));
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

        let cut: number = seq.lastCut();
        if (cut >= 0) {
            if (cache.nodes[0] !== -2 || cache.nodes.length === 2 || (cache.nodes[0] === -2 && cache.nodes[2] !== -1)) {
                // we just scored a duplex that wasn't one, so we have to redo it properly
                const seqA: Sequence = seq.slice(0, cut);
                const pairsA: SecStruct = pairs.slice(0, cut);
                const nodesA: number[] = [];
                const retA: number = this.scoreStructures(seqA, pairsA, pseudoknots, temp, nodesA);

                const seqB: Sequence = seq.slice(cut + 1);
                const pairsB: SecStruct = pairs.slice(cut + 1);
                for (let ii = 0; ii < pairsB.length; ii++) {
                    if (pairsB.isPaired(ii)) {
                        pairsB.pairs[ii] -= (cut + 1);
                    }
                }
                const nodesB: number[] = [];
                const retB: number = this.scoreStructures(seqB, pairsB, pseudoknots, temp, nodesB);

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
                    if (seq.baseArray[ii / 2] === RNABase.CUT) {
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
        seq: Sequence, secondBestPairs: SecStruct | null, desiredPairs: string | null = null,
        pseudoknots: boolean = false, temp: number = 37
    ): SecStruct {
        const key = {
            primitive: 'fold',
            seq: seq.baseArray,
            secondBestPairs: secondBestPairs?.pairs ?? null,
            desiredPairs,
            pseudoknots,
            temp
        };
        let pairs: SecStruct = this.getCache(key) as SecStruct;
        if (pairs != null) {
            // trace("fold cache hit");
            return pairs.slice(0);
        }

        pairs = this.foldSequenceImpl(seq, temp, pseudoknots);
        this.putCache(key, pairs.slice(0));
        return pairs;
    }

    public get canFoldWithBindingSite(): boolean {
        return true;
    }

    /* override */
    public foldSequenceWithBindingSite(
        seq: Sequence, targetPairs: SecStruct | null, bindingSite: number[], bonus: number,
        version: number = 1.0, temp: number = 37
    ): SecStruct {
        const key = {
            primitive: 'foldAptamer',
            seq: seq.baseArray,
            targetPairs: targetPairs?.pairs ?? null,
            bindingSite,
            bonus,
            version,
            temp
        };
        let pairs: SecStruct = this.getCache(key) as SecStruct;
        if (pairs != null) {
            // trace("foldAptamer cache hit");
            return pairs.slice(0);
        }

        const siteGroups: number[][] = [];
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

        this.putCache(key, pairs.slice(0));
        return pairs;
    }

    /* override */
    public get canCofold(): boolean {
        return true;
    }

    /* override */
    public cofoldSequence(
        seq: Sequence, secondBestPairs: SecStruct, malus: number = 0,
        desiredPairs: string | null = null, temp: number = 37
    ): SecStruct {
        const cut: number = seq.findCut();
        if (cut < 0) {
            throw new Error('Missing cutting point');
        }

        const key: CacheKey = {
            primitive: 'cofold',
            seq: seq.baseArray,
            secondBestPairs: secondBestPairs?.pairs ?? null,
            malus,
            desiredPairs,
            temp
        };
        let coPairs: SecStruct = this.getCache(key) as SecStruct;
        if (coPairs != null) {
            // trace("cofold cache hit");
            return coPairs.slice(0);
        }

        // FIXME: what about desiredPairs? (forced structure)
        const seqA: Sequence = seq.slice(0, cut);
        const pairsA: SecStruct = this.foldSequence(seqA, null, null, false, temp);
        const nodesA: number[] = [];
        const feA: number = this.scoreStructures(seqA, pairsA, false, temp, nodesA);

        const seqB: Sequence = seq.slice(cut + 1);
        const pairsB: SecStruct = this.foldSequence(seqB, null, null, false, temp);
        const nodesB: number[] = [];
        const feB: number = this.scoreStructures(seqB, pairsB, false, temp, nodesB);

        coPairs = this.cofoldSequenceImpl(seq);
        const coNodes: number[] = [];
        const coFE: number = this.scoreStructures(seq, coPairs, false, temp, coNodes);

        if (coFE + malus >= feA + feB) {
            const struc = `${pairsA.getParenthesis()}&${pairsB.getParenthesis()}`;
            coPairs = SecStruct.fromParens(struc);
        }

        this.putCache(key, coPairs.slice(0));
        return coPairs;
    }

    /* override */
    public get canCofoldWithBindingSite(): boolean {
        return true;
    }

    /* override */
    public cofoldSequenceWithBindingSite(
        seq: Sequence, bindingSite: number[], bonus: number, desiredPairs: string | null = null,
        malus: number = 0, temp: number = 37
    ): SecStruct {
        const cut: number = seq.findCut();
        if (cut < 0) {
            throw new Error('Missing cutting point');
        }

        const key: CacheKey = {
            primitive: 'cofoldAptamer',
            seq: seq.baseArray,
            malus,
            desiredPairs,
            bindingSite,
            bonus,
            temp
        };
        let coPairs: SecStruct = this.getCache(key) as SecStruct;
        if (coPairs != null) {
            // trace("cofoldAptamer cache hit");
            return coPairs.slice(0);
        }

        // IMPORTANT: assumption is that the binding site is in segment A
        // FIXME: what about desiredPairs? (forced structure)

        const siteGroups: number[][] = [];
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

        const seqA: Sequence = seq.slice(0, cut);
        const pairsA: SecStruct = this.foldSequenceWithBindingSite(seqA, null, bindingSite, bonus, 2.5, temp);
        const nodesA: number[] = [];
        let feA: number = this.scoreStructures(seqA, pairsA, false, temp, nodesA);
        if (FoldUtil.bindingSiteFormed(pairsA, siteGroups)) {
            feA += bonus;
        }

        const seqB: Sequence = seq.slice(cut + 1);
        const pairsB: SecStruct = this.foldSequence(seqB, null, null, false, temp);
        const nodesB: number[] = [];
        const feB: number = this.scoreStructures(seqB, pairsB, false, temp, nodesB);

        coPairs = this.cofoldSequenceWithBindingSiteImpl(
            seq, desiredPairs, siteGroups[0][0], siteGroups[0][siteGroups[0].length - 1],
            siteGroups[1][siteGroups[1].length - 1], siteGroups[1][0], bonus, temp
        );
        const coNodes: number[] = [];
        let coFE: number = this.scoreStructures(seq, coPairs, false, temp, coNodes);
        if (FoldUtil.bindingSiteFormed(coPairs, siteGroups)) {
            coFE += bonus;
        }

        if (coFE + malus >= feA + feB) {
            const struc = `${pairsA.getParenthesis()}&${pairsB.getParenthesis()}`;
            coPairs = SecStruct.fromParens(struc);
        }

        this.putCache(key, coPairs.slice(0));
        return coPairs;
    }

    /* override */
    public get canMultifold(): boolean {
        return true;
    }

    /* override */
    public multifold(
        seq: Sequence,
        secondBestPairs: SecStruct,
        oligos: Oligo[],
        desiredPairs: string | null = null,
        temp: number = 37
    ): MultiFoldResult {
        const key: CacheKey = {
            primitive: 'multifold',
            seq: seq.baseArray,
            secondBestPairs: secondBestPairs?.pairs ?? null,
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
            pairs: new SecStruct(), // original had null
            order: [], // original had null
            count: -1
        };
        let bestFE = 1000000;
        const order: number[] = [];
        const numOligo: number = oligos.length;

        for (let ii = 0; ii < numOligo; ii++) {
            order.push(ii);
        }

        // this code appears to do do peform multiple runs where it
        // incrementally adds a oligo to the cofold if needed and scores it.
        // it finds best fit and then uses that. I needed to figure out what was happeing
        // here for subopt stuff and wanted to commment -Jennifer Pearl
        let more: boolean;
        do {
            for (let ii = numOligo; ii >= 0; ii--) {
                let msSeq: number[] = seq.baseArray.slice();
                for (let jj = 0; jj < ii; jj++) {
                    msSeq.push(RNABase.CUT);
                    msSeq = msSeq.concat(oligos[order[jj]].sequence);
                }
                let msPairs: SecStruct;
                if (ii === 0) {
                    msPairs = this.foldSequence(new Sequence(msSeq), null, null, false, temp);
                } else {
                    msPairs = this.cofoldSeq2(new Sequence(msSeq), null, null, temp);
                }
                const msNodes: number[] = [];
                let msFE: number = this.scoreStructures(new Sequence(msSeq), msPairs, false, temp, msNodes);
                for (let jj = 0; jj < ii; jj++) {
                    msFE += oligos[order[jj]].malus;
                }
                for (let jj = ii; jj < numOligo; jj++) {
                    const sPairs: SecStruct = this.foldSequence(
                        new Sequence(oligos[order[jj]].sequence), null, null, false, temp
                    );
                    const sNodes: number[] = [];
                    const sFE: number = this.scoreStructures(
                        new Sequence(oligos[order[jj]].sequence), sPairs, false, temp, sNodes
                    );

                    const struc = `${msPairs.getParenthesis()}&${sPairs.getParenthesis()}`;
                    msPairs = SecStruct.fromParens(struc);
                    msFE += sFE;
                }

                if (msFE < bestFE) {
                    bestFE = msFE;
                    mfold.pairs = msPairs.slice(0);
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
        seq: Sequence,
        secondBestPairs: SecStruct,
        oligos: Oligo[],
        desiredPairs: string | null = null,
        temp: number = 37
    ): PoseOp[] {
        const ops: PoseOp[] = [];

        const order: number[] = [];
        const numOligo: number = oligos.length;

        for (let ii = 0; ii < numOligo; ii++) {
            order.push(ii);
        }

        for (let ii = 0; ii < numOligo; ii++) {
            ops.push(new PoseOp(
                null, () => this.foldSequence(new Sequence(oligos[ii].sequence), null, null, false, temp)
            ));
        }

        let more: boolean;
        do {
            for (let ii = numOligo; ii >= 0; ii--) {
                let msSeq: number[] = seq.baseArray;
                for (let jj = 0; jj < ii; jj++) {
                    msSeq.push(RNABase.CUT);
                    msSeq = msSeq.concat(oligos[order[jj]].sequence);
                }

                if (ii === 0) {
                    ops.push(new PoseOp(
                        null, () => this.foldSequence(new Sequence(msSeq), null, null, false, temp)
                    ));
                } else {
                    ops.push(new PoseOp(
                        null, () => this.cofoldSeq2(new Sequence(msSeq), null, null, temp)
                    ));
                }
            }

            more = FoldUtil.nextPerm(order);
        } while (more);

        ops.push(new PoseOp(null, () => this.multifold(seq, secondBestPairs, oligos, desiredPairs, temp)));
        return ops;
    }

    private foldSequenceImpl(seq: Sequence, temp: number = 37, pseudoknots: boolean = false): SecStruct {
        const seqStr = seq.sequenceString(false, false);

        let result: FullFoldResult | null = null;
        try {
            result = this._lib.FullFoldTemperature(temp, seqStr, pseudoknots);
            if (!result) {
                throw new Error('NuPACK returned a null result');
            }
            return SecStruct.fromParens(result.structure, pseudoknots);
        } catch (e) {
            log.error('FullFoldTemperature error', e);
            return new SecStruct();
        } finally {
            if (result != null) {
                result.delete();
                result = null;
            }
        }
    }

    private foldSequenceWithBindingSiteImpl(
        seq: Sequence, i: number, p: number, j: number, q: number, bonus: number, _temp: number = 37
    ): SecStruct {
        const seqStr = seq.sequenceString(false, false);

        let result: FullFoldResult | null = null;
        try {
            result = this._lib.FullFoldWithBindingSite(seqStr, i, p, j, q, -bonus);
            if (!result) {
                throw new Error('NuPACK returned a null result');
            }
            return SecStruct.fromParens(result.structure);
        } catch (e) {
            log.error('FullFoldWithBindingSite error', e);
            return new SecStruct();
        } finally {
            if (result != null) {
                result.delete();
                result = null;
            }
        }
    }

    private cofoldSequenceImpl(seq: Sequence): SecStruct {
        const seqStr = seq.sequenceString(true, false);

        let result: FullFoldResult | null = null;
        try {
            result = this._lib.CoFoldSequence(seqStr);
            log.debug('done cofolding');
            if (!result) {
                throw new Error('NuPACK returned a null result');
            }
            return SecStruct.fromParens(result.structure);
        } catch (e) {
            log.error('CoFoldSequence error', e);
            return new SecStruct();
        } finally {
            if (result != null) {
                result.delete();
                result = null;
            }
        }
    }

    // AMW TODO: isn't it curious that `str` is never used here? If you try to
    // pass a structure constraint to this function it is simply ignored silently.
    private cofoldSequenceWithBindingSiteImpl(
        seq: Sequence,
        _str: string | null,
        i: number,
        p: number,
        j: number,
        q: number,
        bonus: number,
        _temp: number = 37
    ): SecStruct {
        const seqStr = seq.sequenceString(true, false);

        let result: FullFoldResult | null = null;
        try {
            result = this._lib.CoFoldSequenceWithBindingSite(seqStr, i, p, j, q, -bonus);
            log.debug('done cofoldingWBS');
            if (!result) {
                throw new Error('NuPACK returned a null result');
            }
            return SecStruct.fromParens(result.structure);
        } catch (e) {
            log.error('CoFoldSequenceWithBindingSite error', e);
            return new SecStruct();
        } finally {
            if (result != null) {
                result.delete();
                result = null;
            }
        }
    }

    private cofoldSeq2(
        seq: Sequence, secondBestPairs: SecStruct | null, desiredPairs: string | null = null, temp: number = 37
    ): SecStruct {
        const key: CacheKey = {
            primitive: 'cofold2',
            seq: seq.sequenceString(),
            secondBestPairs: secondBestPairs?.pairs ?? null,
            desiredPairs,
            temp
        };
        let coPairs: SecStruct = this.getCache(key) as SecStruct;
        if (coPairs != null) {
            // trace("cofold2 cache hit");
            return coPairs.slice(0);
        }

        coPairs = this.cofoldSequenceImpl(seq);

        this.putCache(key, coPairs.slice(0));
        return coPairs;
    }

    private readonly _lib: NupackLib;
}

import * as log from 'loglevel';
import EmscriptenUtil from 'eterna/emscripten/EmscriptenUtil';
import Utility from 'eterna/util/Utility';
import RNALayout from 'eterna/pose2D/RNALayout';
import DotPlot from 'eterna/rnatypes/DotPlot';
import SecStruct from 'eterna/rnatypes/SecStruct';
import Sequence from 'eterna/rnatypes/Sequence';
/* eslint-disable import/no-duplicates, import/no-unresolved */
import EPars from 'eterna/EPars';
import * as Vienna2Lib from './engines/Vienna2Lib';
import {DotPlotResult, FullEvalResult, FullFoldResult} from './engines/Vienna2Lib';
/* eslint-enable import/no-duplicates, import/no-unresolved */
import Folder, {CacheKey, FullEvalCache} from './Folder';
import FoldUtil from './FoldUtil';

export default class Vienna2 extends Folder {
    public static NAME = 'Vienna2';

    /**
     * Asynchronously creates a new instance of the Vienna folder.
     * @returns {Promise<Vienna2>}
     * @description AMW TODO cannot annotate type of module/program; both are any.
     */
    public static create(): Promise<Vienna2 | null> {
        // eslint-disable-next-line import/no-unresolved, import/no-extraneous-dependencies
        return import('engines-bin/vienna2')
            .then((module) => EmscriptenUtil.loadProgram(module))
            .then((program) => new Vienna2(program))
            .catch((_err) => null);
    }

    private constructor(lib: Vienna2Lib) {
        super();
        this._lib = lib;
    }

    /* override */
    public get canDotPlot(): boolean {
        return true;
    }

    /* override */
    public getDotPlot(seq: Sequence, pairs: SecStruct, temp: number = EPars.DEFAULT_TEMPERATURE): DotPlot {
        const key: CacheKey = {
            primitive: 'dotplot', seq: seq.baseArray, pairs: pairs.pairs, temp
        };
        let retArray: number[] = this.getCache(key) as number[];
        if (retArray != null) {
            // The DotPlot ctor slices.
            return new DotPlot(retArray);
        }

        const secstructStr: string = pairs.getParenthesis();
        const seqStr: string = seq.sequenceString();

        let probabilitiesString: string;
        let result: DotPlotResult | null = null;
        try {
            result = this._lib.GetDotPlot(temp, seqStr, secstructStr);
            if (!result) {
                throw new Error('Vienna2 returned a null result');
            }
            probabilitiesString = result.probabilitiesString;
        } catch (e) {
            log.error('GetDotPlot error', e);
            return new DotPlot([]);
        } finally {
            if (result != null) {
                result.delete();
                result = null;
            }
        }

        const tempArray: string[] = Utility.splitOnWhitespace(probabilitiesString);
        retArray = [];

        if (tempArray.length % 4 !== 0) {
            throw new Error(`Something's wrong with dot plot return ${tempArray.length}`);
        }

        for (let ii = 0; ii < tempArray.length; ii += 4) {
            if (tempArray[ii + 3] === 'ubox') {
                retArray.push(Number(tempArray[ii]));
                retArray.push(Number(tempArray[ii + 1]));
                retArray.push(Number(tempArray[ii + 2]));
            } else {
                retArray.push(Number(tempArray[ii + 1]));
                retArray.push(Number(tempArray[ii]));
                retArray.push(Number(tempArray[ii + 2]));
            }
        }

        this.putCache(key, retArray.slice());
        return new DotPlot(retArray);
    }

    /* override */
    public get name(): string {
        return Vienna2.NAME;
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
        seq: Sequence, pairs: SecStruct, pseudoknotted: boolean = false,
        temp: number = EPars.DEFAULT_TEMPERATURE, outNodes: number[] | null = null
    ): number {
        const key: CacheKey = {
            primitive: 'score', seq: seq.baseArray, pairs: pairs.pairs, temp
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
                    pairs.getParenthesis());
                if (!result) {
                    throw new Error('Vienna2 returned a null result');
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

        const cut: number = seq.findCut();
        if (cut >= 0 && cache.nodes[0] !== -2) {
            // we just scored a duplex that wasn't one, so we have to redo it properly
            // EG: If we have a target mode where we have two disconnected strands, we need to
            // fold the two strands independently
            // cache.nodes[0] is the index of the first score node, and the magic value -2 refers to
            // the special term for the multistrand penalty
            // FIXME: What if we have three strands where the first two are connected but the
            // third is not? Wouldn't this score all three separately when it should score
            // the first two together then the third separately?
            const seqA: Sequence = seq.slice(0, cut);
            const pairsA: SecStruct = pairs.slice(0, cut);
            const nodesA: number[] = [];
            const retA: number = this.scoreStructures(seqA, pairsA, pseudoknotted, temp, nodesA);

            const seqB: Sequence = seq.slice(cut + 1);
            const pairsB: SecStruct = pairs.slice(cut + 1);
            const nodesB: number[] = [];
            const retB: number = this.scoreStructures(seqB, pairsB, pseudoknotted, temp, nodesB);

            if (nodesA[0] !== -1 || nodesB[0] !== -1) {
                throw new Error('Something went terribly wrong in scoreStructures()');
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

        const energy = cache.energy * 100;
        if (outNodes != null) {
            FoldUtil.arrayCopy(outNodes, cache.nodes);
        }

        return energy;
    }

    /* override */
    public foldSequence(
        seq: Sequence, secondBestPairs: SecStruct | null, desiredPairs: string | null = null,
        _pseudoknotted: boolean = false, temp: number = EPars.DEFAULT_TEMPERATURE
    ): SecStruct {
        const key: CacheKey = {
            primitive: 'fold',
            seq: seq.baseArray,
            secondBestPairs: secondBestPairs ? secondBestPairs.pairs : null,
            desiredPairs,
            temp
        };
        let pairs: SecStruct = this.getCache(key) as SecStruct;
        if (pairs != null) {
            // trace("fold cache hit");
            return pairs.slice(0);
        }

        pairs = this.foldSequenceImpl(seq, desiredPairs, temp);
        this.putCache(key, pairs.slice(0));
        return pairs;
    }

    public get canFoldWithBindingSite(): boolean {
        return true;
    }

    /* override */
    public foldSequenceWithBindingSite(
        seq: Sequence, targetPairs: SecStruct | null, bindingSite: number[], bonus: number,
        version: number = 1.0, temp: number = EPars.DEFAULT_TEMPERATURE
    ): SecStruct {
        const key: CacheKey = {
            primitive: 'foldAptamer',
            seq: seq.baseArray,
            targetPairs: targetPairs ? targetPairs.pairs : null,
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

        if (!(version >= 2.0)) {
            if (!targetPairs) {
                throw new Error("Can't foldSequenceWithBindingSite with null targetPairs and Vienna version < 2.0!");
            }
            pairs = this.foldSequenceWithBindingSiteOld(seq, targetPairs, bindingSite, bonus);
            this.putCache(key, pairs.slice(0));
            return pairs;
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

        if (siteGroups.length === 2) {
            pairs = this.foldSequenceWithBindingSiteImpl(
                seq,
                siteGroups[0][0],
                siteGroups[0][siteGroups[0].length - 1],
                siteGroups[1][siteGroups[1].length - 1],
                siteGroups[1][0],
                bonus
            );
        } else {
            if (!targetPairs) {
                throw new Error("Can't foldSequenceWithBindingSite with null targetPairs and siteGroups.length !== 2");
            }
            pairs = this.foldSequenceWithBindingSiteOld(seq, targetPairs, bindingSite, bonus);
        }

        this.putCache(key, pairs.slice(0));
        return pairs;
    }

    /* override */
    public get canCofold(): boolean {
        return true;
    }

    /* override */
    public cofoldSequence(
        seq: Sequence, secondBestPairs: SecStruct | null, malus: number = 0,
        desiredPairs: string | null = null, temp: number = EPars.DEFAULT_TEMPERATURE
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

        coPairs = this.cofoldSequenceImpl(seq, desiredPairs);
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
        malus: number = 0, temp: number = EPars.DEFAULT_TEMPERATURE
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
        // FIXME: what about desired_pairs? (forced structure)

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
        if (FoldUtil.bindingSiteFormed(pairsA, siteGroups)) feA += bonus;

        const seqB: Sequence = seq.slice(cut + 1);
        const pairsB: SecStruct = this.foldSequence(seqB, null, null, false, temp);
        const nodesB: number[] = [];
        const feB: number = this.scoreStructures(seqB, pairsB, false, temp, nodesB);

        coPairs = this.cofoldSequenceWithBindingSiteImpl(
            seq,
            desiredPairs,
            siteGroups[0][0],
            siteGroups[0][siteGroups[0].length - 1],
            siteGroups[1][siteGroups[1].length - 1],
            siteGroups[1][0],
            bonus
        );

        const coNodes: number[] = [];
        let coFE: number = this.scoreStructures(seq, coPairs, false, temp, coNodes);
        if (FoldUtil.bindingSiteFormed(coPairs, siteGroups)) coFE += bonus;

        if (coFE + malus >= feA + feB) {
            const struc = `${pairsA.getParenthesis()}&${pairsB.getParenthesis()}`;
            coPairs = SecStruct.fromParens(struc);
        }

        this.putCache(key, coPairs.slice(0));
        return coPairs;
    }

    /* override */
    protected loadCustomParams(): boolean {
        log.info('TODO: Vienna2.load_custom_params');
        return false;
        // if (this._lib != null && this._lib.hasOwnProperty("loadParams")) {
        //     let success: boolean = (this._lib.loadParams("custom.par") === 0);
        //     if (success) this.reset_cache();
        //     return success;
        // }
        // return false;
    }

    /* override */
    public cutInLoop(_i: number): number {
        return 0;
    }

    private foldSequenceImpl(
        seq: Sequence, structStr: string | null = null, temp: number = EPars.DEFAULT_TEMPERATURE
    ): SecStruct {
        const seqStr = seq.sequenceString(false, false);
        let result: FullFoldResult | null = null;

        try {
            result = this._lib.FullFoldTemperature(temp, seqStr, structStr || '');
            if (!result) {
                throw new Error('Vienna2 returned a null result');
            }
            return SecStruct.fromParens(result.structure);
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
        seq: Sequence, i: number, p: number, j: number, q: number, bonus: number
    ): SecStruct {
        const seqStr = seq.sequenceString(false, false);
        const structStr = '';
        let result: FullFoldResult | null = null;

        try {
            result = this._lib.FullFoldWithBindingSite(seqStr, structStr, i + 1, p + 1, j + 1, q + 1, -bonus);
            if (!result) {
                throw new Error('Vienna2 returned a null result');
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

    private cofoldSequenceImpl(seq: Sequence, str: string | null = null): SecStruct {
        const seqStr = seq.sequenceString(true, false);
        const structStr: string = str || '';
        let result: FullFoldResult | null = null;

        try {
            result = this._lib.CoFoldSequence(seqStr, structStr);
            log.debug('done cofolding');
            if (!result) {
                throw new Error('Vienna2 returned a null result');
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

    private cofoldSequenceWithBindingSiteImpl(
        seq: Sequence, str: string | null, i: number, p: number, j: number, q: number, bonus: number
    ): SecStruct {
        const seqStr = seq.sequenceString(true, false);
        const structStr: string = str || '';
        let result: FullFoldResult | null = null;

        try {
            result = this._lib.CoFoldSequenceWithBindingSite(seqStr, structStr, i + 1, p + 1, j + 1, q + 1, -bonus);
            log.debug('done cofolding');
            if (!result) {
                throw new Error('Vienna2 returned a null result');
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

    private foldSequenceWithBindingSiteOld(
        seq: Sequence, targetpairs: SecStruct, bindingSite: number[], bonus: number
    ): SecStruct {
        let bestPairs: SecStruct;
        const nativePairs: SecStruct = this.foldSequence(seq, null, null);

        const nativeTree: RNALayout = new RNALayout();
        nativeTree.setupTree(nativePairs);
        nativeTree.scoreTree(seq, this);
        let nativeScore: number = nativeTree.totalScore;

        const targetSatisfied: SecStruct = targetpairs.getSatisfiedPairs(seq);
        const targetTree: RNALayout = new RNALayout();
        targetTree.setupTree(targetSatisfied);
        targetTree.scoreTree(seq, this);
        let targetScore: number = targetTree.totalScore;

        let nativeBound = true;
        let targetBound = true;

        for (let bb = 0; bb < bindingSite.length; bb++) {
            const bi: number = bindingSite[bb];
            if (targetpairs.pairingPartner(bi) !== nativePairs.pairingPartner(bi)) {
                nativeBound = false;
            }

            if (targetpairs.pairingPartner(bi) !== targetSatisfied.pairingPartner(bi)) {
                targetBound = false;
            }
        }

        if (targetBound) {
            targetScore += bonus;
        }

        if (nativeBound) {
            nativeScore += bonus;
        }

        if (targetScore < nativeScore) {
            bestPairs = targetSatisfied;
        } else {
            bestPairs = nativePairs;
        }

        return bestPairs;
    }

    private readonly _lib: Vienna2Lib;
}

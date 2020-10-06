import * as log from 'loglevel';
import EPars, {
    DotPlot, RNABase, SecStruct, Sequence
} from 'eterna/EPars';
/* eslint-disable import/no-duplicates, import/no-unresolved */
import EmscriptenUtil from 'eterna/emscripten/EmscriptenUtil';
import Utility from 'eterna/util/Utility';
import RNALayout from 'eterna/pose2D/RNALayout';
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
            .catch((err) => null);
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
    public getDotPlot(seq: Sequence, pairs: SecStruct, temp: number = 37): DotPlot {
        const key: CacheKey = {
            primitive: 'dotplot', seq: seq.sequence, pairs: pairs.pairs, temp
        };
        let retArray: number[] = this.getCache(key) as number[];
        if (retArray != null) {
            // The DotPlot ctor slices.
            return new DotPlot(retArray);
        }

        const secstructStr: string = pairs.getParenthesis();
        const seqStr: string = seq.sequenceString;

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
        temp: number = 37, outNodes: number[] | null = null
    ): number {
        const key: CacheKey = {
            primitive: 'score', seq: seq.sequence, pairs: pairs.pairs, temp
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
                    seq.sequenceString,
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

        const cut: number = seq.sequence.indexOf(RNABase.CUT);
        if (cut >= 0 && cache.nodes[0] !== -2) {
            // we just scored a duplex that wasn't one, so we have to redo it properly
            const seqA: Sequence = seq.slice(0, cut);
            const pairsA: SecStruct = pairs.slice(0, cut);
            const nodesA: number[] = [];
            const retA: number = this.scoreStructures(seqA, pairsA, pseudoknotted, temp, nodesA);

            const seqB: Sequence = seq.slice(cut + 1);
            const pairsB: SecStruct = pairs.slice(cut + 1);
            for (let ii = 0; ii < pairsB.length; ii++) {
                if (pairsB.isPaired(ii)) pairsB.pairs[ii] -= (cut + 1);
            }
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
        pseudoknotted: boolean = false, temp: number = 37
    ): SecStruct {
        const key: CacheKey = {
            primitive: 'fold',
            seq: seq.sequence,
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
        version: number = 1.0, temp: number = 37
    ): SecStruct {
        const key: CacheKey = {
            primitive: 'foldAptamer',
            seq: seq.sequence,
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
        seq: Sequence, secondBestPairs: SecStruct, malus: number = 0,
        desiredPairs: string | null = null, temp: number = 37
    ): SecStruct {
        const cut: number = seq.sequence.indexOf(RNABase.CUT);
        if (cut < 0) {
            throw new Error('Missing cutting point');
        }

        const key: CacheKey = {
            primitive: 'cofold',
            seq: seq.sequence,
            secondBestPairs: secondBestPairs.pairs,
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
        malus: number = 0, temp: number = 37
    ): SecStruct {
        const cut: number = seq.sequence.indexOf(RNABase.CUT);
        if (cut < 0) {
            throw new Error('Missing cutting point');
        }

        const key: CacheKey = {
            primitive: 'cofoldAptamer',
            seq: seq.sequence,
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
    public mlEnergy(pairs: number[], S: number[], i: number, isExtloop: boolean): number {
        let energy: number;
        let cxEnergy: number;
        let bestEnergy: number;
        bestEnergy = EPars.INF;
        let i1: number;
        let j: number;
        let p: number;
        let q: number;
        let u = 0;
        let x: number;
        let type: number;
        let count: number;
        const mlintern: number[] = new Array(EPars.NBPAIRS + 1);
        let mlclosing: number;
        let mlbase: number;

        const dangles: number = EPars.DANGLES;

        if (isExtloop) {
            for (x = 0; x <= EPars.NBPAIRS; x++) {
                mlintern[x] = EPars.mlIntern(x) - EPars.mlIntern(1);
                /* 0 or TerminalAU */
            }

            mlbase = 0;
            mlclosing = 0;
        } else {
            for (x = 0; x <= EPars.NBPAIRS; x++) {
                mlintern[x] = EPars.mlIntern(x);
            }

            mlclosing = EPars.ML_CLOSING37;
            mlbase = EPars.ML_BASE37;
        }

        for (count = 0; count < 2; count++) { /* do it twice */
            const ld5 = 0;
            /* 5' dangle energy on prev pair (type) */
            if (i === 0) {
                j = pairs[0] + 1;
                type = 0;
                /* no pair */
            } else {
                j = pairs[i];
                type = EPars.pairType(S[j], S[i]);

                if (type === 0) {
                    type = 7;
                }
            }
            i1 = i;
            p = i + 1;
            u = 0;
            energy = 0;
            cxEnergy = EPars.INF;

            do { /* walk around the multi-loop */
                let tt: number;
                const newCx: number = EPars.INF;

                /* hope over unpaired positions */
                while (p <= pairs[0] && pairs[p] === 0) p++;

                /* memorize number of unpaired positions */
                u += p - i1 - 1;
                /* get position of pairing partner */
                if (p === pairs[0] + 1) {
                    tt = 0;
                    q = 0;
                    /* virtual root pair */
                } else {
                    q = pairs[p];
                    /* get type of base pair P->q */
                    tt = EPars.pairType(S[p], S[q]);
                    if (tt === 0) tt = 7;
                }

                energy += mlintern[tt];
                cxEnergy += mlintern[tt];

                if (dangles) {
                    let dang5 = 0;
                    let dang3 = 0;
                    let dang = 0;
                    if ((p > 1)) {
                        dang5 = EPars.getDangle5Score(tt, S[p - 1]);
                        /* 5'dangle of pq pair */
                    }
                    if ((i1 < S[0])) {
                        dang3 = EPars.getDangle3Score(type, S[i1 + 1]);
                        /* 3'dangle of previous pair */
                    }

                    switch (p - i1 - 1) {
                        case 0: /* adjacent helices *this./* adjacent helices */
                        case 1: /* 1 unpaired base between helices *this./* 1 unpaired base between helices */
                            dang = (dangles === 2) ? (dang3 + dang5) : Math.min(dang3, dang5);
                            energy += dang;
                            break;

                        default: /* many unpaired base between helices *this./* many unpaired base between helices */
                            energy += dang5 + dang3;
                    }
                    type = tt;
                }

                i1 = q;
                p = q + 1;
            } while (q !== i);

            bestEnergy = Math.min(energy, bestEnergy);
            /* don't use cxEnergy here */

            if (dangles !== 3 || isExtloop) {
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

        energy = bestEnergy;
        energy += mlclosing;

        energy += mlbase * u;

        return energy;
    }

    /* override */
    public cutInLoop(i: number): number {
        return 0;
    }

    /* override */
    public loopEnergy(
        n1: number, n2: number,
        type: number, type2: number,
        si1: number, sj1: number, sp1: number, sq1: number, b1: boolean, b2: boolean
    ): number {
        let loopScore = 0;

        /* compute energy of degree 2 loop (stack bulge or interior) */
        let nl: number;
        let ns: number;

        if (n1 > n2) {
            nl = n1;
            ns = n2;
        } else {
            nl = n2;
            ns = n1;
        }

        if (nl === 0) {
            return EPars.getStackScore(type, type2, b1, b2);
            /* stack */
        }

        if (ns === 0) { /* bulge */
            if (nl <= EPars.MAXLOOP) {
                loopScore = EPars.BULGE_37[nl];
            } else {
                loopScore = EPars.getBulge(nl);
            }
            if (nl === 1) {
                loopScore += EPars.getStackScore(type, type2, b1, b2);
            } else {
                if (type > 2) {
                    loopScore += EPars.TERM_AU;
                }
                if (type2 > 2) {
                    loopScore += EPars.TERM_AU;
                }
            }
            return loopScore;
        } else {
            /* interior loop */
            if (ns === 1) {
                if (nl === 1) {
                    // 1x1 loop
                    return EPars.getInt11(type, type2, si1, sj1);
                }

                if (nl === 2) {
                    // 2x1 loop
                    if (n1 === 1) {
                        loopScore = EPars.getInt21(type, type2, si1, sq1, sj1);
                    } else {
                        loopScore = EPars.getInt21(type2, type, sq1, si1, sp1);
                    }

                    return loopScore;
                }
            } else if (n1 === 2 && n2 === 2) {
                // 2x2 loop
                return EPars.getInt22(type, type2, si1, sp1, sq1, sj1);
            }

            /* generic interior loop (no else here!) */
            if ((n1 + n2 <= EPars.MAXLOOP)) {
                loopScore = EPars.INTERNAL_37[n1 + n2];
            } else {
                loopScore = EPars.getInternal(n1 + n2);
            }

            loopScore += Math.min(EPars.MAX_NINIO, (nl - ns) * EPars.F_ninio37[2]);
            loopScore += EPars.internalMismatch(type, si1, sj1) + EPars.internalMismatch(type2, sq1, sp1);
        }

        return loopScore;
    }

    /* override */
    public hairpinEnergy(
        size: number, type: number, si1: number, sj1: number, sequence: number[], i: number, j: number
    ): number {
        let hairpinScore = 0;

        if (size <= 30) {
            hairpinScore = EPars.HAIRPIN_37[size];
        } else {
            hairpinScore = EPars.HAIRPIN_37[30] + Number(EPars.LXC * Math.log((size) / 30.0));
        }

        if (size === 4) {
            let loopStr = '';
            for (let walker: number = i; walker <= j; walker++) {
                if (sequence[walker] === RNABase.ADENINE) {
                    loopStr += 'A';
                } else if (sequence[walker] === RNABase.GUANINE) {
                    loopStr += 'G';
                } else if (sequence[walker] === RNABase.URACIL) {
                    loopStr += 'U';
                } else if (sequence[walker] === RNABase.CYTOSINE) {
                    loopStr += 'C';
                }
            }

            hairpinScore += EPars.getTetraLoopBonus(loopStr);
        }

        if (size === 3) {
            if (type > 2) {
                hairpinScore += EPars.TERM_AU;
            }
        } else {
            hairpinScore += EPars.hairpinMismatch(type, si1, sj1);
        }

        return hairpinScore;
    }

    private foldSequenceImpl(seq: Sequence, structStr: string | null = null, temp: number = 37): SecStruct {
        const seqStr = seq.sequenceString; // EPars.sequenceToString(seq, false, false);
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
        const seqStr = EPars.sequenceToString(seq.sequence, false, false);
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
        const seqStr = EPars.sequenceToString(seq.sequence, true, false);
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
        const seqStr = EPars.sequenceToString(seq.sequence, true, false);
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

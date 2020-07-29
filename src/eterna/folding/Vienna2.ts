import * as log from 'loglevel';
import EPars from 'eterna/EPars';
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
    public getDotPlot(seq: number[], pairs: number[], temp: number = 37): number[] {
        let key: CacheKey = {
            primitive: 'dotplot', seq, pairs, temp
        };
        let retArray: number[] = this.getCache(key) as number[];
        if (retArray != null) {
            return retArray.slice();
        }

        let secstructStr: string = EPars.pairsToParenthesis(pairs);
        let seqStr: string = EPars.sequenceToString(seq);

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
            return [];
        } finally {
            if (result != null) {
                result.delete();
                result = null;
            }
        }

        let tempArray: string[] = Utility.splitOnWhitespace(probabilitiesString);
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
        return retArray;
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
        seq: number[], pairs: number[], pseudoknotted: boolean = false,
        temp: number = 37, outNodes: number[] | null = null
    ): number {
        let key: CacheKey = {
            primitive: 'score', seq, pairs, temp
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
                    EPars.pairsToParenthesis(pairs));
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

        let cut: number = seq.indexOf(EPars.RNABASE_CUT);
        if (cut >= 0 && cache.nodes[0] !== -2) {
            // we just scored a duplex that wasn't one, so we have to redo it properly
            let seqA: number[] = seq.slice(0, cut);
            let pairsA: number[] = pairs.slice(0, cut);
            let nodesA: number[] = [];
            let retA: number = this.scoreStructures(seqA, pairsA, pseudoknotted, temp, nodesA);

            let seqB: number[] = seq.slice(cut + 1);
            let pairsB: number[] = pairs.slice(cut + 1);
            for (let ii = 0; ii < pairsB.length; ii++) {
                if (pairsB[ii] >= 0) pairsB[ii] -= (cut + 1);
            }
            let nodesB: number[] = [];
            let retB: number = this.scoreStructures(seqB, pairsB, pseudoknotted, temp, nodesB);

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

        let energy = cache.energy * 100;
        if (outNodes != null) {
            FoldUtil.arrayCopy(outNodes, cache.nodes);
        }

        return energy;
    }

    /* override */
    public foldSequence(
        seq: number[], secondBestPairs: number[] | null, desiredPairs: string | null = null,
        pseudoknotted: boolean = false, temp: number = 37
    ): number[] {
        let key: CacheKey = {
            primitive: 'fold',
            seq,
            secondBestPairs,
            desiredPairs,
            temp
        };
        let pairs: number[] = this.getCache(key) as number[];
        if (pairs != null) {
            // trace("fold cache hit");
            return pairs.slice();
        }

        pairs = this.foldSequenceImpl(seq, desiredPairs, temp);
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
        let key: CacheKey = {
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

        if (!(version >= 2.0)) {
            if (!targetPairs) {
                throw new Error("Can't foldSequenceWithBindingSite with null targetPairs and Vienna version < 2.0!");
            }
            pairs = this.foldSequenceWithBindingSiteOld(seq, targetPairs, bindingSite, bonus);
            this.putCache(key, pairs.slice());
            return pairs;
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

        coPairs = this.cofoldSequenceImpl(seq, desiredPairs);
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
        // FIXME: what about desired_pairs? (forced structure)

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
        if (FoldUtil.bindingSiteFormed(pairsA, siteGroups)) feA += bonus;

        let seqB: number[] = seq.slice(cut + 1);
        let pairsB: number[] = this.foldSequence(seqB, null, null, false, temp);
        let nodesB: number[] = [];
        let feB: number = this.scoreStructures(seqB, pairsB, false, temp, nodesB);

        coPairs = this.cofoldSequenceWithBindingSiteImpl(
            seq,
            desiredPairs,
            siteGroups[0][0],
            siteGroups[0][siteGroups[0].length - 1],
            siteGroups[1][siteGroups[1].length - 1],
            siteGroups[1][0],
            bonus
        );

        let coNodes: number[] = [];
        let coFE: number = this.scoreStructures(seq, coPairs, false, temp, coNodes);
        if (FoldUtil.bindingSiteFormed(coPairs, siteGroups)) coFE += bonus;

        if (coFE + malus >= feA + feB) {
            let struc = `${EPars.pairsToParenthesis(pairsA)}&${EPars.pairsToParenthesis(pairsB)}`;
            coPairs = EPars.parenthesisToPairs(struc);
        }

        this.putCache(key, coPairs.slice());
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
        let mlintern: number[] = new Array(EPars.NBPAIRS + 1);
        let mlclosing: number;
        let mlbase: number;

        let dangles: number = EPars.DANGLES;

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
            let ld5 = 0;
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
                let newCx: number;
                newCx = EPars.INF;

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
                if (sequence[walker] === EPars.RNABASE_ADENINE) {
                    loopStr += 'A';
                } else if (sequence[walker] === EPars.RNABASE_GUANINE) {
                    loopStr += 'G';
                } else if (sequence[walker] === EPars.RNABASE_URACIL) {
                    loopStr += 'U';
                } else if (sequence[walker] === EPars.RNABASE_CYTOSINE) {
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

    private foldSequenceImpl(seq: number[], structStr: string | null = null, temp: number = 37): number[] {
        const seqStr = EPars.sequenceToString(seq, false, false);
        let result: FullFoldResult | null = null;

        try {
            result = this._lib.FullFoldTemperature(temp, seqStr, structStr || '');
            if (!result) {
                throw new Error('Vienna2 returned a null result');
            }
            return EPars.parenthesisToPairs(result.structure);
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
        seq: number[], i: number, p: number, j: number, q: number, bonus: number
    ): number[] {
        const seqStr = EPars.sequenceToString(seq, false, false);
        const structStr = '';
        let result: FullFoldResult | null = null;

        try {
            result = this._lib.FullFoldWithBindingSite(seqStr, structStr, i + 1, p + 1, j + 1, q + 1, -bonus);
            if (!result) {
                throw new Error('Vienna2 returned a null result');
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

    private cofoldSequenceImpl(seq: number[], str: string | null = null): number[] {
        const seqStr = EPars.sequenceToString(seq, true, false);
        const structStr: string = str || '';
        let result: FullFoldResult | null = null;

        try {
            result = this._lib.CoFoldSequence(seqStr, structStr);
            log.debug('done cofolding');
            if (!result) {
                throw new Error('Vienna2 returned a null result');
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
        seq: number[], str: string | null, i: number, p: number, j: number, q: number, bonus: number
    ): number[] {
        const seqStr = EPars.sequenceToString(seq, true, false);
        const structStr: string = str || '';
        let result: FullFoldResult | null = null;

        try {
            result = this._lib.CoFoldSequenceWithBindingSite(seqStr, structStr, i + 1, p + 1, j + 1, q + 1, -bonus);
            log.debug('done cofolding');
            if (!result) {
                throw new Error('Vienna2 returned a null result');
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

    private foldSequenceWithBindingSiteOld(
        seq: number[], targetpairs: number[], bindingSite: number[], bonus: number
    ): number[] {
        let bestPairs: number[];
        let nativePairs: number[] = this.foldSequence(seq, null, null);

        let nativeTree: RNALayout = new RNALayout();
        nativeTree.setupTree(nativePairs);
        nativeTree.scoreTree(seq, this);
        let nativeScore: number = nativeTree.totalScore;

        let targetSatisfied: number[] = EPars.getSatisfiedPairs(targetpairs, seq);
        let targetTree: RNALayout = new RNALayout();
        targetTree.setupTree(targetSatisfied);
        targetTree.scoreTree(seq, this);
        let targetScore: number = targetTree.totalScore;

        let nativeBound = true;
        let targetBound = true;

        for (let bb = 0; bb < bindingSite.length; bb++) {
            let bi: number = bindingSite[bb];
            if (targetpairs[bi] !== nativePairs[bi]) {
                nativeBound = false;
            }

            if (targetpairs[bi] !== targetSatisfied[bi]) {
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

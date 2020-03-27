import * as log from 'loglevel';
import EPars from 'eterna/EPars';
/* eslint-disable import/no-duplicates, import/no-unresolved */
import EmscriptenUtil from 'eterna/emscripten/EmscriptenUtil';
import Utility from 'eterna/util/Utility';
import RNALayout from 'eterna/pose2D/RNALayout';
import * as EternafoldLib from './engines/EternafoldLib';
import {DotPlotResult, FullEvalResult, FullFoldResult} from './engines/EternafoldLib';
/* eslint-enable import/no-duplicates, import/no-unresolved */
import Folder from './Folder';
import FoldUtil from './FoldUtil';

export default class EternaFold extends Folder {
    public static readonly NAME: string = 'EternaFold';

    /**
     * Asynchronously creates a new instance of the Eternafold folder.
     * @returns {Promise<EternaFold>}
     */
    public static create(): Promise<EternaFold> {
        return import('engines-bin/eternafold')
            .then((module: any) => EmscriptenUtil.loadProgram(module))
            .then((program: any) => new EternaFold(program));
    }

    private constructor(lib: EternafoldLib) {
        super();
        this._lib = lib;
    }

    // public get canDotPlot(): boolean {
    //     return true;
    // }

    // public getDotPlot(seq: number[], pairs: number[], temp: number = 37): number[] {
    //     let key: any = {
    //         primitive: 'dotplot', seq, pairs, temp
    //     };
    //     let retArray: number[] = this.getCache(key);
    //     if (retArray != null) {
    //         // log.debug("dotplot cache hit");
    //         return retArray.slice();
    //     }

    //     let secstructStr: string = EPars.pairsToParenthesis(pairs);
    //     let seqStr: string = EPars.sequenceToString(seq);

    //     let probabilitiesString: string;
    //     let result: DotPlotResult;
    //     try {
    //         result = this._lib.GetDotPlot(temp, seqStr, secstructStr);
    //         probabilitiesString = result.probabilitiesString;
    //     } catch (e) {
    //         log.error('GetDotPlot error', e);
    //         return [];
    //     } finally {
    //         if (result != null) {
    //             result.delete();
    //             result = null;
    //         }
    //     }

    //     let tempArray: string[] = Utility.splitOnWhitespace(probabilitiesString);
    //     retArray = [];

    //     if (tempArray.length % 4 !== 0) {
    //         throw new Error(`Something's wrong with dot plot return ${tempArray.length}`);
    //     }

    //     for (let ii = 0; ii < tempArray.length; ii += 4) {
    //         if (tempArray[ii + 3] === 'ubox') {
    //             retArray.push(Number(tempArray[ii]));
    //             retArray.push(Number(tempArray[ii + 1]));
    //             retArray.push(Number(tempArray[ii + 2]));
    //         } else {
    //             retArray.push(Number(tempArray[ii + 1]));
    //             retArray.push(Number(tempArray[ii]));
    //             retArray.push(Number(tempArray[ii + 2]));
    //         }
    //     }

    //     this.putCache(key, retArray.slice());
    //     return retArray;
    // }

    public get name(): string {
        return EternaFold.NAME;
    }

    public get isFunctional(): boolean {
        return true;
    }

    public get canScoreStructures(): boolean {
        return true;
    }

    public scoreStructures(
        seq: number[],
        pairs: number[],
        pseudoknotted: boolean = false,
        temp: number = 37, outNodes:
        number[] = null
    ): number {
        let key: any = {
            primitive: 'score', seq, pairs, temp
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
                    EPars.sequenceToString(seq),
                    EPars.pairsToParenthesis(pairs));
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

        let energy: number = cache.energy * 100;
        if (outNodes != null) {
            FoldUtil.arrayCopy(outNodes, cache.nodes);
        }

        return energy;
    }

    public foldSequence(
        seq: number[],
        secondBestPairs: number[],
        desiredPairs: string = null,
        pseudoknotted: boolean = false,
        temp: number = 37,
        gamma: number = 0.7
    ): number[] {
        let key: any = {
            primitive: 'fold',
            seq,
            secondBestPairs,
            desiredPairs,
            temp,
            gamma
        };
        let pairs: number[] = this.getCache(key);
        if (pairs != null) {
            // log.debug("fold cache hit");
            return pairs.slice();
        }

        pairs = this.foldSequenceImpl(seq, desiredPairs, temp, gamma);
        this.putCache(key, pairs.slice());
        return pairs;
    }

    // public get canFoldWithBindingSite(): boolean {
    //     return true;
    // }

    // public foldSequenceWithBindingSite(
    //     seq: number[], targetPairs: number[], bindingSite: number[], bonus: number,
    //     version: number = 1.0, temp: number = 37
    // ): number[] {
    //     let key: any = {
    //         primitive: 'foldAptamer',
    //         seq,
    //         targetPairs,
    //         bindingSite,
    //         bonus,
    //         version,
    //         temp
    //     };
    //     let pairs: number[] = this.getCache(key);
    //     if (pairs != null) {
    //         // log.debug("foldAptamer cache hit");
    //         return pairs.slice();
    //     }

    //     if (!(version >= 2.0)) {
    //         pairs = this.foldSequenceWithBindingSiteOld(seq, targetPairs, bindingSite, bonus);
    //         this.putCache(key, pairs.slice());
    //         return pairs;
    //     }

    //     let siteGroups: number[][] = [];
    //     let lastIndex = -1;
    //     let currentGroup: number[] = [];

    //     for (let jj = 0; jj < bindingSite.length; jj++) {
    //         if (lastIndex < 0 || bindingSite[jj] - lastIndex === 1) {
    //             currentGroup.push(bindingSite[jj]);
    //             lastIndex = bindingSite[jj];
    //         } else {
    //             siteGroups.push(currentGroup);
    //             currentGroup = [];
    //             currentGroup.push(bindingSite[jj]);
    //             lastIndex = bindingSite[jj];
    //         }
    //     }
    //     if (currentGroup.length > 0) {
    //         siteGroups.push(currentGroup);
    //     }

    //     if (siteGroups.length === 2) {
    //         pairs = this.foldSequenceWithBindingSiteImpl(
    //             seq, siteGroups[0][0], siteGroups[0][siteGroups[0].length - 1],
    //             siteGroups[1][siteGroups[1].length - 1],
    //             siteGroups[1][0], bonus, temp
    //         );
    //     } else {
    //         pairs = this.foldSequenceWithBindingSiteOld(seq, targetPairs, bindingSite, bonus);
    //     }

    //     this.putCache(key, pairs.slice());
    //     return pairs;
    // }

    // public get canCofold(): boolean {
    //     return true;
    // }

    // public cofoldSequence(
    //     seq: number[], secondBestPairs: number[], malus: number = 0, desiredPairs: string = null, temp: number = 37
    // ): number[] {
    //     let cut: number = seq.indexOf(EPars.RNABASE_CUT);
    //     if (cut < 0) {
    //         throw new Error('Missing cutting point');
    //     }

    //     let key = {
    //         primitive: 'cofold',
    //         seq,
    //         secondBestPairs,
    //         malus,
    //         desiredPairs,
    //         temp
    //     };
    //     let coPairs: number[] = this.getCache(key);
    //     if (coPairs != null) {
    //         // log.debug("cofold cache hit");
    //         return coPairs.slice();
    //     }

    //     // FIXME: what about desiredPairs? (forced structure)
    //     let seqA: number[] = seq.slice(0, cut);
    //     let pairsA: number[] = this.foldSequence(seqA, null, null, temp);
    //     let nodesA: number[] = [];
    //     let feA: number = this.scoreStructures(seqA, pairsA, temp, nodesA);

    //     let seqB: number[] = seq.slice(cut + 1);
    //     let pairsB: number[] = this.foldSequence(seqB, null, null, temp);
    //     let nodesB: number[] = [];
    //     let feB: number = this.scoreStructures(seqB, pairsB, temp, nodesB);

    //     coPairs = this.cofoldSequenceImpl(seq, desiredPairs, temp);
    //     let coNodes: number[] = [];
    //     let coFE: number = this.scoreStructures(seq, coPairs, temp, coNodes);

    //     if (coFE + malus >= feA + feB) {
    //         let struc = `${EPars.pairsToParenthesis(pairsA)}&${EPars.pairsToParenthesis(pairsB)}`;
    //         coPairs = EPars.parenthesisToPairs(struc);
    //     }

    //     this.putCache(key, coPairs.slice());
    //     return coPairs;
    // }

    // public get canCofoldWithBindingSite(): boolean {
    //     return true;
    // }

    // public cofoldSequenceWithBindingSite(
    //     seq: number[], bindingSite: number[], bonus: number, desiredPairs: string = null,
    //     malus: number = 0, temp: number = 37
    // ): number[] {
    //     let cut: number = seq.indexOf(EPars.RNABASE_CUT);
    //     if (cut < 0) {
    //         throw new Error('Missing cutting point');
    //     }

    //     let key: any = {
    //         primitive: 'cofoldAptamer',
    //         seq,
    //         malus,
    //         desiredPairs,
    //         bindingSite,
    //         bonus,
    //         temp
    //     };
    //     let coPairs: number[] = this.getCache(key);
    //     if (coPairs != null) {
    //         // log.debug("cofoldAptamer cache hit");
    //         return coPairs.slice();
    //     }

    //     // IMPORTANT: assumption is that the binding site is in segment A
    //     // FIXME: what about desiredPairs? (forced structure)

    //     let siteGroups: number[][] = [];
    //     let lastIndex = -1;
    //     let currentGroup: number[] = [];

    //     for (let jj = 0; jj < bindingSite.length; jj++) {
    //         if (lastIndex < 0 || bindingSite[jj] - lastIndex === 1) {
    //             currentGroup.push(bindingSite[jj]);
    //             lastIndex = bindingSite[jj];
    //         } else {
    //             siteGroups.push(currentGroup);
    //             currentGroup = [];
    //             currentGroup.push(bindingSite[jj]);
    //             lastIndex = bindingSite[jj];
    //         }
    //     }
    //     if (currentGroup.length > 0) {
    //         siteGroups.push(currentGroup);
    //     }

    //     let seqA: number[] = seq.slice(0, cut);
    //     let pairsA: number[] = this.foldSequenceWithBindingSite(seqA, null, bindingSite, bonus, 2.5, temp);
    //     let nodesA: number[] = [];
    //     let feA: number = this.scoreStructures(seqA, pairsA, temp, nodesA);
    //     if (FoldUtil.bindingSiteFormed(pairsA, siteGroups)) feA += bonus;

    //     let seqB: number[] = seq.slice(cut + 1);
    //     let pairsB: number[] = this.foldSequence(seqB, null, null, temp);
    //     let nodesB: number[] = [];
    //     let feB: number = this.scoreStructures(seqB, pairsB, temp, nodesB);

    //     coPairs = this.cofoldSequenceWithBindingSiteImpl(
    //         seq, desiredPairs, siteGroups[0][0], siteGroups[0][siteGroups[0].length - 1],
    //         siteGroups[1][siteGroups[1].length - 1], siteGroups[1][0], bonus, temp
    //     );
    //     let coNodes: number[] = [];
    //     let coFE: number = this.scoreStructures(seq, coPairs, temp, coNodes);
    //     if (FoldUtil.bindingSiteFormed(coPairs, siteGroups)) coFE += bonus;

    //     if (coFE + malus >= feA + feB) {
    //         let struc = `${EPars.pairsToParenthesis(pairsA)}&${EPars.pairsToParenthesis(pairsB)}`;
    //         coPairs = EPars.parenthesisToPairs(struc);
    //     }

    //     this.putCache(key, coPairs.slice());
    //     return coPairs;
    // }

    private foldSequenceImpl(
        seq: number[],
        structStr: string = null,
        temp: number = 37,
        gamma: number = 0.7
    ): number[] {
        const seqStr = EPars.sequenceToString(seq, false, false);
        let result: FullFoldResult;

        try {
            // can't do anything with structStr for now. constrained folding later.
            result = this._lib.FullFoldDefault(seqStr, gamma);// , structStr || '');
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

    // private foldSequenceWithBindingSiteImpl(
    //     seq: number[], i: number, p: number, j: number, q: number, bonus: number, temp: number = 37
    // ): number[] {
    //     const seqStr = EPars.sequenceToString(seq, false, false);
    //     const structStr = '';
    //     let result: FullFoldResult;

    //     try {
    //         result = this._lib.FullFoldWithBindingSite(seqStr, structStr, i + 1, p + 1, j + 1, q + 1, -bonus);
    //         return EPars.parenthesisToPairs(result.structure);
    //     } catch (e) {
    //         log.error('FullFoldWithBindingSite error', e);
    //         return [];
    //     } finally {
    //         if (result != null) {
    //             result.delete();
    //             result = null;
    //         }
    //     }
    // }

    // private cofoldSequenceImpl(seq: number[], str: string = null, temp: number = 37): number[] {
    //     const seqStr = EPars.sequenceToString(seq, true, false);
    //     const structStr: string = str || '';
    //     let result: FullFoldResult;

    //     try {
    //         result = this._lib.CoFoldSequence(seqStr, structStr);
    //         log.debug('done cofolding');
    //         return EPars.parenthesisToPairs(result.structure);
    //     } catch (e) {
    //         log.error('CoFoldSequence error', e);
    //         return [];
    //     } finally {
    //         if (result != null) {
    //             result.delete();
    //             result = null;
    //         }
    //     }
    // }

    // private cofoldSequenceWithBindingSiteImpl(
    //     seq: number[], str: string, i: number, p: number, j: number, q: number, bonus: number, temp: number = 37
    // ): number[] {
    //     const seqStr = EPars.sequenceToString(seq, true, false);
    //     const structStr: string = str || '';
    //     let result: FullFoldResult;

    //     try {
    //         result = this._lib.CoFoldSequenceWithBindingSite(seqStr, structStr, i + 1, p + 1, j + 1, q + 1, -bonus);
    //         log.debug('done cofolding');
    //         return EPars.parenthesisToPairs(result.structure);
    //     } catch (e) {
    //         log.error('CoFoldSequenceWithBindingSite error', e);
    //         return [];
    //     } finally {
    //         if (result != null) {
    //             result.delete();
    //             result = null;
    //         }
    //     }
    // }

    // private foldSequenceWithBindingSiteOld(
    //     seq: number[], targetPairs: number[], bindingSite: number[], bonus: number, temp: number = 37
    // ): number[] {
    //     let bestPairs: number[];
    //     let nativePairs: number[] = this.foldSequence(seq, null, null);

    //     let nativeTree: RNALayout = new RNALayout();
    //     nativeTree.setupTree(nativePairs);
    //     nativeTree.scoreTree(seq, this);
    //     let nativeScore: number = nativeTree.totalScore;

    //     let targetSatisfied: number[] = EPars.getSatisfiedPairs(targetPairs, seq);
    //     let targetTree: RNALayout = new RNALayout();
    //     targetTree.setupTree(targetSatisfied);
    //     targetTree.scoreTree(seq, this);
    //     let targetScore: number = targetTree.totalScore;

    //     let nativeBound = true;
    //     let targetBound = true;

    //     for (let bb = 0; bb < bindingSite.length; bb++) {
    //         let bi: number = bindingSite[bb];
    //         if (targetPairs[bi] !== nativePairs[bi]) {
    //             nativeBound = false;
    //         }

    //         if (targetPairs[bi] !== targetSatisfied[bi]) {
    //             targetBound = false;
    //         }
    //     }

    //     if (targetBound) {
    //         targetScore += bonus;
    //     }

    //     if (nativeBound) {
    //         nativeScore += bonus;
    //     }

    //     if (targetScore < nativeScore) {
    //         bestPairs = targetSatisfied;
    //     } else {
    //         bestPairs = nativePairs;
    //     }

    //     return bestPairs;
    // }

    private readonly _lib: EternafoldLib;
}

interface FullEvalCache {
    nodes: number[];
    energy: number;
}

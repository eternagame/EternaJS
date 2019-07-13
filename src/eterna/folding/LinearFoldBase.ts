import * as log from 'loglevel';
import EmscriptenUtil from 'eterna/emscripten/EmscriptenUtil';
import EPars from 'eterna/EPars';
/* eslint-disable import/no-duplicates, import/no-unresolved */
import * as LinearFoldLib from './engines/LinearFoldLib';
import {FullFoldResult} from './engines/LinearFoldLib';
import {FullEvalResult} from './engines/ViennaLib';
/* eslint-enable import/no-duplicates, import/no-unresolved */
import Folder from './Folder';
import FoldUtil from './FoldUtil';

export default abstract class LinearFoldBase extends Folder {
    protected constructor(lib: LinearFoldLib) {
        super();
        this._lib = lib;
    }

    public get canDotPlot(): boolean {
        return false;
    }

    public getDotPlot(seq: number[], pairs: number[], temp: number = 37): number[] {
        log.warn('LinearFold.getDotPlot: unimplemented');
        return [];
    }

    public get isFunctional(): boolean {
        return true;
    }

    public get canScoreStructures(): boolean {
        return true;
    }

    public scoreStructures(seq: number[], pairs: number[], temp: number = 37, outNodes: number[] = null): number {
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
                result = this._lib.FullEval(
                    EPars.sequenceToString(seq),
                    EPars.pairsToParenthesis(pairs)
                );
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
            let retA: number = this.scoreStructures(seqA, pairsA, temp, nodesA);

            let seqB: number[] = seq.slice(cut + 1);
            let pairsB: number[] = pairs.slice(cut + 1);
            for (let ii = 0; ii < pairsB.length; ii++) {
                if (pairsB[ii] >= 0) pairsB[ii] -= (cut + 1);
            }
            let nodesB: number[] = [];
            let retB: number = this.scoreStructures(seqB, pairsB, temp, nodesB);

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
        seq: number[], secondBestPairs: number[], desiredPairs: string = null, temp: number = 37
    ): number[] {
        let key: any = {
            primitive: 'fold',
            seq,
            secondBestPairs,
            desiredPairs,
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
            log.error('FullFoldDefault error', e);
            return [];
        } finally {
            if (result != null) {
                result.delete();
                result = null;
            }
        }
    }

    public get canFoldWithBindingSite(): boolean {
        return false;
    }

    public foldSequenceWithBindingSite(
        seq: number[], targetPairs: number[], bindingSite: number[], bonus: number,
        version: number = 1.0, temp: number = 37
    ): number[] {
        log.warn('LinearFold.foldSequenceWithBindingSite: unimplemented');
        return this.foldSequence(seq, null);
    }

    public get canCofold(): boolean {
        return false;
    }

    public cofoldSequence(
        seq: number[], secondBestPairs: number[], malus: number = 0, desiredPairs: string = null, temp: number = 37
    ): number[] {
        log.warn('LinearFold.cofoldSequence: unimplemented');
        return this.foldSequence(seq, null);
    }

    public get canCofoldWithBindingSite(): boolean {
        return false;
    }

    public cofoldSequenceWithBindingSite(
        seq: number[], bindingSite: number[], bonus: number, desiredPairs: string = null,
        malus: number = 0, temp: number = 37
    ): number[] {
        log.warn('LinearFold.cofoldSequenceWithBindingSite: unimplemented');
        return this.foldSequence(seq, null);
    }

    public mlEnergy(pairs: number[], S: number[], i: number, isExtloop: boolean): number {
        log.warn('LinearFold.mlEnergy: unimplemented');
        return 0;
    }

    public cutInLoop(i: number): number {
        log.warn('LinearFold.cutInLoop: unimplemented');
        return 0;
    }

    public loopEnergy(
        n1: number, n2: number, type: number, type2: number,
        si1: number, sj1: number, sp1: number, sq1: number, b1: boolean, b2: boolean
    ): number {
        log.warn('LinearFold.loopEnergy: unimplemented');
        return 0;
    }

    public hairpinEnergy(
        size: number, type: number, si1: number, sj1: number, sequence: number[], i: number, j: number
    ): number {
        log.warn('LinearFold.hairpinEnergy: unimplemented');
        return 0;
    }

    private readonly _lib: LinearFoldLib;
}

interface FullEvalCache {
    nodes: number[];
    energy: number;
}

import * as log from 'loglevel';
import EmscriptenUtil from 'eterna/emscripten/EmscriptenUtil';
import EPars, {
    RNABase, Sequence, SecStruct, DotPlot
} from 'eterna/EPars';
/* eslint-disable import/no-duplicates, import/no-unresolved */
import {Assert} from 'flashbang';
import * as LinearFoldLib from './engines/LinearFoldLib';
import {DotPlotResult, FullFoldResult} from './engines/LinearFoldLib';
import {FullEvalResult} from './engines/ViennaLib';
/* eslint-enable import/no-duplicates, import/no-unresolved */
import Folder, {CacheKey, FullEvalCache} from './Folder';
import FoldUtil from './FoldUtil';

export default abstract class LinearFoldBase extends Folder {
    protected constructor(lib: LinearFoldLib) {
        super();
        this._lib = lib;
    }

    public get canDotPlot(): boolean {
        return true;
    }

    public getDotPlot(seq: Sequence, pairs: SecStruct, temp: number = 37): DotPlot {
        const key: CacheKey = {
            primitive: 'dotplot', seq: seq.sequence, pairs: pairs.pairs, temp
        };
        let retArray: number[] = this.getCache(key) as number[];
        if (retArray != null) {
            // trace("dotplot cache hit");
            return new DotPlot(retArray);
        }

        const seqStr: string = seq.sequenceString;

        let result: DotPlotResult | null = null;
        try {
            // we don't actually do anything with structstring here yet
            result = this._lib.GetDotPlot(temp, seqStr, pairs.getParenthesis());
            Assert.assertIsDefined(result, 'Linearfold returned a null result');
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

    public get isFunctional(): boolean {
        return true;
    }

    public get canScoreStructures(): boolean {
        return true;
    }

    public scoreStructures(
        seq: Sequence, pairs: SecStruct, pseudoknotted: boolean = false,
        temp: number = 37, outNodes: number[] | null = null
    ): number {
        const key: CacheKey = {
            primitive: 'score', seq: seq.sequence, pairs: pairs.pairs, temp
        };
        let cache: FullEvalCache = this.getCache(key) as FullEvalCache;

        if (cache != null) {
            // log.debug("score cache hit");
            if (outNodes != null) {
                FoldUtil.arrayCopy(outNodes, cache.nodes);
            }
            return cache.energy * 100;
        }

        do {
            let result: FullEvalResult | null = null;
            try {
                result = this._lib.FullEval(
                    seq.sequenceString,
                    pairs.getParenthesis()
                );
                if (!result) {
                    throw new Error('LinearFold returned a null result');
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

        const energy: number = cache.energy * 100;
        if (outNodes != null) {
            FoldUtil.arrayCopy(outNodes, cache.nodes);
        }

        return energy;
    }

    public foldSequence(
        seq: Sequence, secondBestPairs: SecStruct | null, desiredPairs: string | null = null,
        pseudoknotted: boolean = false, temp: number = 37
    ): SecStruct {
        const key: CacheKey = {
            primitive: 'fold',
            seq: seq.sequence,
            secondBestPairs: secondBestPairs?.pairs ?? null,
            desiredPairs,
            temp
        };

        let pairs: SecStruct = this.getCache(key) as SecStruct;
        if (pairs == null) {
            pairs = this.fullFoldDefault(seq);
            this.putCache(key, pairs);
        }

        return pairs.slice(0);
    }

    private fullFoldDefault(seq: Sequence): SecStruct {
        const seqStr = EPars.sequenceToString(seq.sequence, false, false);
        let result: FullFoldResult | null = null;

        try {
            result = this._lib.FullFoldDefault(seqStr);
            if (!result) {
                throw new Error('LinearFold returned a null result');
            }
            return SecStruct.fromParens(result.structure);
        } catch (e) {
            log.error('FullFoldDefault error', e);
            return new SecStruct();
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
        seq: Sequence, targetPairs: SecStruct, bindingSite: number[], bonus: number,
        version: number = 1.0, temp: number = 37
    ): SecStruct {
        log.warn('LinearFold.foldSequenceWithBindingSite: unimplemented');
        return this.foldSequence(seq, null);
    }

    public get canCofold(): boolean {
        return false;
    }

    public cofoldSequence(
        seq: Sequence, secondBestPairs: SecStruct, malus: number = 0,
        desiredPairs: string | null = null, temp: number = 37
    ): SecStruct {
        log.warn('LinearFold.cofoldSequence: unimplemented');
        return this.foldSequence(seq, null);
    }

    public get canCofoldWithBindingSite(): boolean {
        return false;
    }

    public cofoldSequenceWithBindingSite(
        seq: Sequence, bindingSite: number[], bonus: number, desiredPairs: string | null = null,
        malus: number = 0, temp: number = 37
    ): SecStruct {
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

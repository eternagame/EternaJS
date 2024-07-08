import log from 'loglevel';
import EmscriptenUtil from 'eterna/emscripten/EmscriptenUtil';
import {Assert} from 'flashbang';
import DotPlot from 'eterna/rnatypes/DotPlot';
import SecStruct from 'eterna/rnatypes/SecStruct';
import Sequence from 'eterna/rnatypes/Sequence';
/* eslint-disable import/no-duplicates, import/no-unresolved */
import EPars from 'eterna/EPars';
import * as LinearFoldLib from './engines/LinearFoldLib';
import {DotPlotResult, FullFoldResult} from './engines/LinearFoldLib';
import {FullEvalResult} from './engines/ViennaLib';
/* eslint-enable import/no-duplicates, import/no-unresolved */
import Folder, {CacheKey, FullEvalCache} from './Folder';
import FoldUtil from './FoldUtil';

export default abstract class LinearFoldBase extends Folder<true> {
    protected constructor(lib: LinearFoldLib) {
        super();
        this._lib = lib;
    }

    public get canDotPlot(): boolean {
        return true;
    }

    public getDotPlot(seq: Sequence, pairs: SecStruct, temp: number = EPars.DEFAULT_TEMPERATURE): DotPlot {
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

    public canScoreStructures(): boolean {
        return true;
    }

    public scoreStructures(
        seq: Sequence, pairs: SecStruct, pseudoknotted: boolean = false,
        temp: number = EPars.DEFAULT_TEMPERATURE, outNodes: number[] | null = null
    ): number {
        const key: CacheKey = {
            primitive: 'score', seq: seq.baseArray, pairs: pairs.pairs, temp
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
                    seq.sequenceString(),
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

        const energy: number = cache.energy * 100;
        if (outNodes != null) {
            FoldUtil.arrayCopy(outNodes, cache.nodes);
        }

        return energy;
    }

    public foldSequence(
        seq: Sequence, secondBestPairs: SecStruct | null, desiredPairs: string | null = null,
        _pseudoknotted: boolean = false, temp: number = EPars.DEFAULT_TEMPERATURE
    ): SecStruct {
        const key: CacheKey = {
            primitive: 'fold',
            seq: seq.baseArray,
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
        const seqStr = seq.sequenceString(false, false);
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
        seq: Sequence, _targetPairs: SecStruct, _bindingSite: number[], _bonus: number,
        _version: number = 1.0, _temp: number = EPars.DEFAULT_TEMPERATURE
    ): SecStruct {
        log.warn('LinearFold.foldSequenceWithBindingSite: unimplemented');
        return this.foldSequence(seq, null);
    }

    public get canCofold(): boolean {
        return false;
    }

    public cofoldSequence(
        seq: Sequence, _secondBestPairs: SecStruct | null, _malus: number = 0,
        _desiredPairs: string | null = null, _temp: number = EPars.DEFAULT_TEMPERATURE
    ): SecStruct {
        log.warn('LinearFold.cofoldSequence: unimplemented');
        return this.foldSequence(seq, null);
    }

    public get canCofoldWithBindingSite(): boolean {
        return false;
    }

    public cofoldSequenceWithBindingSite(
        seq: Sequence, _bindingSite: number[], _bonus: number, _desiredPairs: string | null = null,
        _malus: number = 0, _temp: number = EPars.DEFAULT_TEMPERATURE
    ): SecStruct {
        log.warn('LinearFold.cofoldSequenceWithBindingSite: unimplemented');
        return this.foldSequence(seq, null);
    }

    public cutInLoop(_i: number): number {
        log.warn('LinearFold.cutInLoop: unimplemented');
        return 0;
    }

    protected readonly _isSync = true;
    private readonly _lib: LinearFoldLib;
}

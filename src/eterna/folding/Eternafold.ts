import * as log from 'loglevel';
import EPars, {RNABase, SecStruct, Sequence} from 'eterna/EPars';
/* eslint-disable import/no-duplicates, import/no-unresolved */
import EmscriptenUtil from 'eterna/emscripten/EmscriptenUtil';
import {Assert} from 'flashbang';
import * as EternafoldLib from './engines/EternafoldLib';
import {DotPlotResult, FullEvalResult, FullFoldResult} from './engines/EternafoldLib';
/* eslint-enable import/no-duplicates, import/no-unresolved */
import Folder, {CacheKey, FullEvalCache} from './Folder';
import FoldUtil from './FoldUtil';

export default class EternaFold extends Folder {
    public static readonly NAME: string = 'EternaFold';

    /**
     * Asynchronously creates a new instance of the Eternafold folder.
     * @returns {Promise<EternaFold>}
     * @description AMW TODO cannot annotate type of module/program; both are any.
     */
    public static create(): Promise<EternaFold | null> {
        // eslint-disable-next-line import/no-unresolved, import/no-extraneous-dependencies
        return import('engines-bin/eternafold')
            .then((module) => EmscriptenUtil.loadProgram(module))
            .then((program) => new EternaFold(program))
            .catch((err) => null);
    }

    private constructor(lib: EternafoldLib) {
        super();
        this._lib = lib;
    }

    /* override */
    public get canDotPlot(): boolean {
        return true;
    }

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
        seq: Sequence,
        pairs: SecStruct,
        pseudoknotted: boolean = false,
        temp: number = 37,
        outNodes: number[] | null = null
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
                result = this._lib.FullEval(temp,
                    seq.sequenceString,
                    pairs.getParenthesis());
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
        seq: Sequence,
        secondBestPairs: SecStruct,
        desiredPairs: string | null = null,
        pseudoknotted: boolean = false,
        temp: number = 37,
        gamma: number = 0.7
    ): SecStruct {
        const key: CacheKey = {
            primitive: 'fold',
            seq: seq.sequenceString,
            secondBestPairs: secondBestPairs.pairs,
            desiredPairs,
            temp,
            gamma
        };
        let pairs: SecStruct = this.getCache(key) as SecStruct;
        if (pairs != null) {
            // log.debug("fold cache hit");
            return pairs.slice(0);
        }

        pairs = this.foldSequenceImpl(seq, desiredPairs, temp, gamma);
        this.putCache(key, pairs.slice(0));
        return pairs;
    }

    private foldSequenceImpl(
        seq: Sequence,
        structStr: string | null = null,
        temp: number = 37,
        gamma: number = 6.0
    ): SecStruct {
        const seqStr = EPars.sequenceToString(seq.sequence, false, false);
        let result: FullFoldResult | null = null;

        try {
            // can't do anything with structStr for now. constrained folding later.
            result = this._lib.FullFoldDefault(seqStr, gamma);// , structStr || '');
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

    /* override */
    public getDotPlot(seq: Sequence, pairs: SecStruct, temp: number = 37): number[] {
        const key: CacheKey = {
            primitive: 'dotplot', seq: seq.sequence, pairs: pairs.pairs, temp
        };
        let retArray: number[] = this.getCache(key) as number[];
        if (retArray != null) {
            // trace("dotplot cache hit");
            return retArray.slice();
        }

        const seqStr: string = seq.sequenceString;

        let result: DotPlotResult | null = null;
        try {
            // we don't actually do anything with structstring here yet
            result = this._lib.GetDotPlot(temp, seqStr); // , EPars.pairsToParenthesis(pairs));
            Assert.assertIsDefined(result, 'EternaFold returned a null result');
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

    private readonly _lib: EternafoldLib;
}

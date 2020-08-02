import * as log from 'loglevel';
import EPars from 'eterna/EPars';
/* eslint-disable import/no-duplicates, import/no-unresolved */
import EmscriptenUtil from 'eterna/emscripten/EmscriptenUtil';
import Assert from 'flashbang/util/Assert';
import * as ContrafoldLib from './engines/ContrafoldLib';
import {DotPlotResult, FullEvalResult, FullFoldResult} from './engines/ContrafoldLib';
/* eslint-enable import/no-duplicates, import/no-unresolved */
import Folder, {CacheKey, FullEvalCache} from './Folder';
import FoldUtil from './FoldUtil';

export default class ContraFold extends Folder {
    public static readonly NAME: string = 'ContraFold';

    /**
     * Asynchronously creates a new instance of the ContraFold folder.
     * @returns {Promise<ContraFold>}
     * @description AMW TODO cannot annotate type of module/program; both are any.
     */
    public static create(): Promise<ContraFold | null> {
        // eslint-disable-next-line import/no-unresolved, import/no-extraneous-dependencies
        return import('engines-bin/contrafold')
            .then((module) => EmscriptenUtil.loadProgram(module))
            .then((program) => new ContraFold(program))
            .catch((err) => null);
    }

    private constructor(lib: ContrafoldLib) {
        super();
        this._lib = lib;
    }

    /* override */
    public get canDotPlot(): boolean {
        return true;
    }

    public get name(): string {
        return ContraFold.NAME;
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
        temp: number = 37,
        outNodes: number[] | null = null
    ): number {
        let key: CacheKey = {
            primitive: 'score', seq, pairs, temp
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
        desiredPairs: string | null = null,
        pseudoknotted: boolean = false,
        temp: number = 37,
        gamma: number = 6.0
    ): number[] {
        let key: CacheKey = {
            primitive: 'fold',
            seq,
            secondBestPairs,
            desiredPairs,
            temp,
            gamma
        };
        let pairs: number[] = this.getCache(key) as number[];
        if (pairs != null) {
            // log.debug("fold cache hit");
            return pairs.slice();
        }

        pairs = this.foldSequenceImpl(seq, desiredPairs, temp, gamma);
        this.putCache(key, pairs.slice());
        return pairs;
    }

    private foldSequenceImpl(
        seq: number[],
        structStr: string | null = null,
        temp: number = 37,
        gamma: number = 0.7
    ): number[] {
        const seqStr = EPars.sequenceToString(seq, false, false);
        let result: FullFoldResult | null = null;

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

    /* override */
    public getDotPlot(seq: number[], pairs: number[], temp: number = 37): number[] {
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

    private readonly _lib: ContrafoldLib;
}

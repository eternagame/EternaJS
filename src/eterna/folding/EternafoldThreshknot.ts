import EmscriptenUtil from 'eterna/emscripten/EmscriptenUtil';
import SecStruct from 'eterna/rnatypes/SecStruct';
import Sequence from 'eterna/rnatypes/Sequence';
/* eslint-disable import/no-duplicates, import/no-unresolved */
import EPars from 'eterna/EPars';
import * as EternafoldLib from './engines/EternafoldLib';
import EternaFold from './Eternafold';
/* eslint-enable import/no-duplicates, import/no-unresolved */
import {CacheKey} from './Folder';
import FoldUtil, {BasePairProbabilityTransform} from './FoldUtil';

export default class EternaFoldThreshknot extends EternaFold {
    public static readonly NAME: string = 'EternaFoldThreshknot';

    /**
     * Asynchronously creates a new instance of the Eternafold folder.
     * @returns {Promise<EternaFold>}
     * @description AMW TODO cannot annotate type of module/program; both are any.
     */
    public static create(): Promise<EternaFoldThreshknot | null> {
        // eslint-disable-next-line import/no-unresolved, import/no-extraneous-dependencies
        return import('engines-bin/eternafold')
            .then((module) => EmscriptenUtil.loadProgram(module))
            .then((program) => new EternaFoldThreshknot(program))
            .catch((_err) => null);
    }

    protected constructor(lib: EternafoldLib) {
        super(lib);
        this._lib = lib;
    }

    public get name(): string {
        return EternaFoldThreshknot.NAME;
    }

    public get canPseudoknot(): boolean {
        return true;
    }

    public canScoreStructures() {
        return false;
    }

    /* override */
    /**
     * This overrides Eternafold's default foldSequenceImpl implementation with
     * a post-fold modification. Here we run Eternafold on the sequence as usual,
     * then post-process the returned base pairs with the Threshknot heuristic
     * algorithm (see https://arxiv.org/abs/1912.12796).
     * @param seq RNA sequence to be folded
     * @param _structStr structStr
     * @param _temp Environmental temperature
     * @param _gamma gamma
     * @param theta Parameter to adjust filter sensitivity of Threshknot algorithm
     * @returns SecStruct object representing secondary structure output of engine
     */

    public foldSequence(
        seq: Sequence,
        secondBestPairs: SecStruct | null,
        desiredPairs: string | null = null,
        pseudoknotted: boolean = false,
        temp: number = EPars.DEFAULT_TEMPERATURE,
        gamma: number = 0.7
    ): SecStruct {
        const key: CacheKey = {
            primitive: 'fold',
            seq: seq.sequenceString(),
            secondBestPairs: secondBestPairs?.pairs ?? null,
            desiredPairs,
            pseudoknotted,
            temp,
            gamma
        };
        let pairs: SecStruct = this.getCache(key) as SecStruct;
        if (pairs != null) {
            // log.debug("fold cache hit");
            return pairs.slice(0);
        }

        pairs = this.foldSequenceImpl(seq, null, temp, gamma, pseudoknotted);
        this.putCache(key, pairs.slice(0));
        return pairs;
    }

    protected foldSequenceImpl(
        seq: Sequence,
        structStr: string | null = null,
        temp: number = EPars.DEFAULT_TEMPERATURE,
        gamma: number = 6.0,
        pseudoknotted: boolean = false
    ): SecStruct {
        if (pseudoknotted) {
            return FoldUtil.threshknot(this.getDotPlot(seq), seq, BasePairProbabilityTransform.LEAVE_ALONE, {
                theta: 0.15,
                maxIterations: 3
            });
        } else {
            return super.foldSequenceImpl(seq, structStr, temp, gamma);
        }
    }

    protected readonly _lib: EternafoldLib;
}

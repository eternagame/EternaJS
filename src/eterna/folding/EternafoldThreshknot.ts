import * as log from 'loglevel';
import EmscriptenUtil from 'eterna/emscripten/EmscriptenUtil';
import SecStruct from 'eterna/rnatypes/SecStruct';
import Sequence from 'eterna/rnatypes/Sequence';
/* eslint-disable import/no-duplicates, import/no-unresolved */
import EPars from 'eterna/EPars';
import * as EternafoldLib from './engines/EternafoldLib';
import {DotPlotResult} from './engines/EternafoldLib';
import EternaFold from './Eternafold';
/* eslint-enable import/no-duplicates, import/no-unresolved */
import {CacheKey} from './Folder';

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
            return this.foldSequenceThresh(seq, temp);
        } else {
            return super.foldSequenceImpl(seq, structStr, temp, gamma);
        }
    }

    private foldSequenceThresh(
        seq: Sequence,
        temp: number = EPars.DEFAULT_TEMPERATURE,
        theta: number = 0.15
    ): SecStruct {
        const seqStr = seq.sequenceString(false, false);
        let result: DotPlotResult | null = null;
        let bpp:number[] = [];

        try {
            // Get BPP in coordinate list format
            result = this._lib.GetDotPlot(temp, seqStr);
            bpp = EmscriptenUtil.stdVectorToArray(result.plot);

            // THRESHKNOT HEURISTIC
            // Initialize algorithm parameters, iteration flags, and base pair list variable
            const maxIterations = 3;
            // TODO: Implement in SecStruct.stems()
            // Currently stems() interprets bulges as stem breaks
            // const allowedBulgeLen = 0;
            const minLenHelix = 2;
            let iteration = 0;
            let newBP = 1;
            const bpList: number[][] = [];

            // Get pairs for each base via Threshknot heuristic
            while (newBP !== 0 && iteration <= maxIterations) {
                const currentBpList: number[][] = [];
                const bpListFlat = bpList.flat();
                const Pmax = new Array(seqStr.length).fill(0);

                // Find max probability for each base, filtering out already paired bases
                for (let index = 0; index < bpp.length; index += 3) {
                    const base1 = bpp[index];
                    const base2 = bpp[index + 1];
                    const prob = bpp[index + 2];
                    if (!(bpListFlat.includes(base1) || bpListFlat.includes(base2))) {
                        // -1 to account for 0 indexing
                        if (prob >= Pmax[base1 - 1]) Pmax[base1 - 1] = prob;
                        if (prob >= Pmax[base2 - 1]) Pmax[base2 - 1] = prob;
                    }
                }

                // Compare each COO tuple to Pmax and theta, and add to the list
                // of selected base pairs if the check passes
                for (let index = 0; index < bpp.length; index += 3) {
                    const base1 = bpp[index];
                    const base2 = bpp[index + 1];
                    const prob = bpp[index + 2];
                    if (prob === Pmax[base1 - 1] && prob === Pmax[base2 - 1] && prob > theta) {
                        currentBpList.push([base1, base2]);
                    }
                }
                // Update iteration flags
                newBP = currentBpList.length;
                iteration += 1;
                if (newBP !== 0 && iteration > maxIterations) {
                    log.debug('Reached max iteration, stopping before converged.');
                } else {
                // Add selected base pairs to output list
                    bpList.push(...currentBpList);
                }
            }

            // Ensure that the bpList is sorted, then check for duplicated nucleotides
            bpList.sort((bpA, bpB) => bpA[0] - bpB[0]);
            const nts = bpList.flat();
            if (nts.length > new Set(nts).size) {
                log.warn('Some nucletotides found in more than 1 base pair');
                bpList.forEach((bpA, i) => {
                    const bpB = bpList[i + 1] || [];
                    if (bpA[0] === bpB[0] && bpA[1] === bpB[1]) {
                        log.warn(`Removing duplicated base pair: ${bpA}`);
                        bpList.splice(i, 1);
                    } else if (bpB.includes(bpA[0])) {
                        log.warn(`bpA: ${bpA}, bpB: ${bpB}`);
                    } else if (bpB.includes(bpA[1])) {
                        log.warn(`bpA: ${bpA}, bpB: ${bpB}`);
                    }
                });
            }

            // Convert from array of pair tuples to partner pair list
            const partnerPairList = new Array(seqStr.length).fill(-1);
            bpList.forEach((pair) => {
                // Indices are 1-indexed here; Dot Plot returns bp 1-indexed
                partnerPairList[pair[0] - 1] = pair[1] - 1;
                partnerPairList[pair[1] - 1] = pair[0] - 1;
            });

            // Convert to SecStruct and remove single pair helices
            const structure = new SecStruct(partnerPairList);
            const helices = structure.stems();
            const prunedHelices = helices.filter((stem) => stem.length >= minLenHelix).flat();

            // Convert from array of pair tuples to partner pair list
            const prunedPairList = new Array(structure.length).fill(-1);
            prunedHelices.forEach((pair) => {
                // Indices are 0-indexed here
                prunedPairList[pair[0]] = pair[1];
                prunedPairList[pair[1]] = pair[0];
            });

            return new SecStruct(prunedPairList);
        } catch (e) {
            log.error('GetDotPlot error', e);
            return new SecStruct();
        } finally {
            if (result != null) {
                result.delete();
                result = null;
            }
        }
    }

    protected readonly _lib: EternafoldLib;
}

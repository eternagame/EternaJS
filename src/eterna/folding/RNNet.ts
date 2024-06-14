import * as ort from 'onnxruntime-web';
import {RNABase} from 'eterna/EPars';
import SecStruct from 'eterna/rnatypes/SecStruct';
import DotPlot from 'eterna/rnatypes/DotPlot';
import Sequence from 'eterna/rnatypes/Sequence';
import rnnetSs from './engines/rnnet-ss.onnx';
import Folder, {CacheKey} from './Folder';
import FoldUtil, {BasePairProbabilityTransform} from './FoldUtil';

ort.env.wasm.proxy = true;
ort.env.wasm.wasmPaths = {
    'ort-wasm.wasm': new URL(
        '../../../node_modules/onnxruntime-web/dist/ort-wasm.wasm',
        import.meta.url
    ).href,
    'ort-wasm-threaded.wasm': new URL(
        '../../../node_modules/onnxruntime-web/dist/ort-wasm-threaded.wasm',
        import.meta.url
    ).href,
    'ort-wasm-simd.wasm': new URL(
        '../../../node_modules/onnxruntime-web/dist/ort-wasm-simd.wasm',
        import.meta.url
    ).href,
    'ort-training-wasm-simd.wasm': new URL(
        '../../../node_modules/onnxruntime-web/dist/ort-training-wasm-simd.wasm',
        import.meta.url
    ).href,
    'ort-wasm-simd-threaded.wasm': new URL(
        '../../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm',
        import.meta.url
    ).href
};
ort.env.wasm.numThreads = 1;

export default class RNNet extends Folder<false> {
    public static readonly NAME: string = 'RibonanzaNet-SS';

    /**
     * Asynchronously creates a new instance of the RNNet folder.
     * @description AMW TODO cannot annotate type of module/program; both are any.
     */
    public static async create(): Promise<RNNet | null> {
        return new RNNet(await ort.InferenceSession.create(rnnetSs, {}));
    }

    private constructor(session: ort.InferenceSession) {
        super();
        this._session = session;
    }

    public get name(): string {
        return RNNet.NAME;
    }

    public get isFunctional(): boolean {
        return true;
    }

    public get canScoreStructures(): boolean {
        return false;
    }

    public get canDotPlot(): boolean {
        return true;
    }

    public get canPseudoknot(): boolean {
        return true;
    }

    public async foldSequence(seq: Sequence): Promise<SecStruct> {
        const key: CacheKey = {
            primitive: 'fold',
            seq: seq.sequenceString()
        };
        let pairs: SecStruct = this.getCache(key) as SecStruct;
        if (pairs != null) {
            // log.debug("fold cache hit");
            return pairs.slice(0);
        }

        const bpps = (await this.getDotPlot(seq)).data.slice();
        for (let ii = 0; ii < bpps.length; ii += 3) {
            if (Math.abs(bpps[ii] - bpps[ii + 1]) < 4) {
                bpps[ii + 2] = 0;
            }
        }
        const dotPlot = new DotPlot(bpps);
        pairs = FoldUtil.hungarian(dotPlot, seq, BasePairProbabilityTransform.LEAVE_ALONE, {
            theta: 0.5,
            minLenHelix: 1
        });
        this.putCache(key, pairs.slice(0));
        return pairs;
    }

    public async getDotPlot(seq: Sequence): Promise<DotPlot> {
        const key: CacheKey = {
            primitive: 'dotplot', seq: seq.baseArray
        };
        const retArray: number[] = this.getCache(key) as number[];
        if (retArray != null) {
            return new DotPlot(retArray);
        }

        const seqArr = new BigInt64Array(seq.length);
        for (let i = 0; i < seq.length; i++) {
            switch (seq.nt(i)) {
                case RNABase.ADENINE:
                    seqArr[i] = BigInt(0);
                    break;
                case RNABase.CYTOSINE:
                    seqArr[i] = BigInt(1);
                    break;
                case RNABase.GUANINE:
                    seqArr[i] = BigInt(2);
                    break;
                case RNABase.URACIL:
                    seqArr[i] = BigInt(3);
                    break;
                case RNABase.UNDEFINED:
                case RNABase.CUT:
                default:
                    throw new Error(`Invalid base ${seq.nt(i)}`);
            }
        }

        const sequenceInput = 'sequence';
        const results = await this._session.run({
            [sequenceInput]: new ort.Tensor('int64', seqArr, [1, seq.length])
        });
        const outputName = 'output';
        const bppArr = results[outputName].data;

        const cooArray = [];
        for (let y = 0; y < seq.length; y++) {
            for (let x = 0; x < seq.length; x++) {
                if (x >= y) {
                    const val = 1 / (1 + Math.E ** (-bppArr[y * seq.length + x] as number));
                    cooArray.push(y + 1, x + 1, val);
                }
            }
        }

        this.putCache(key, cooArray.slice());
        return new DotPlot(cooArray);
    }

    public async getEf1(seq: Sequence) {
        const bpps = (await this.getDotPlot(seq)).data;
        const struct = await this.foldSequence(seq);

        const acceptedBpps = bpps.filter((_, idx) => (
            idx % 3 === 2
            && struct.pairingPartner(bpps[idx - 2] - 1) === bpps[idx - 1] - 1
        ));

        // Avoid divide by zero
        if (acceptedBpps.length === 0) return 0;

        let confidence = 0;
        for (const prob of acceptedBpps) confidence += prob;

        confidence /= acceptedBpps.length;

        return 2.25 * confidence - 1.29;
    }

    public async getEf1CrossPair(seq: Sequence) {
        const bpps = (await this.getDotPlot(seq)).data;
        const struct = (await this.foldSequence(seq)).getCrossedPairs();

        const acceptedBpps = bpps.filter((_, idx) => (
            idx % 3 === 2
            && struct.pairingPartner(bpps[idx - 2] - 1) === bpps[idx - 1] - 1
        ));

        // Avoid divide by zero
        if (acceptedBpps.length === 0) return 0;

        let confidence = 0;
        for (const prob of acceptedBpps) confidence += prob;
        confidence /= acceptedBpps.length;

        return 2 * confidence - 1.19;
    }

    protected readonly _isSync = false;

    private readonly _session: ort.InferenceSession;
}

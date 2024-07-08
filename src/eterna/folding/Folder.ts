import PoseOp from 'eterna/pose2D/PoseOp';
import {Oligo} from 'eterna/rnatypes/Oligo';
import DotPlot from 'eterna/rnatypes/DotPlot';
import SecStruct from 'eterna/rnatypes/SecStruct';
import Sequence from 'eterna/rnatypes/Sequence';
import EPars from 'eterna/EPars';

export type CacheItem = SecStruct | number[] | FullEvalCache | MultiFoldResult |
SuboptEnsembleResult | number | undefined;
export type CacheKey = Record<string, string | string[] | number | number[] | boolean | Oligo[] | null>;

export interface MultiFoldResult {
    pairs: SecStruct;
    order: number[];
    count: number;
}

export interface FullEvalCache {
    nodes: number[];
    energy: number;
}

export interface SuboptEnsembleResult {
    suboptStructures: string[];
    suboptEnergyError: number[];
    suboptFreeEnergy: number[];
}

export default abstract class Folder<Sync extends boolean = boolean> {
    public abstract get name (): string;
    public abstract get isFunctional (): boolean;

    public isSync(): this is Folder<true> {
        return this._isSync;
    }

    public getCache(key: CacheKey): CacheItem {
        const keyStr = JSON.stringify(key);
        return this._cache.get(keyStr);
    }

    public get canScoreStructures(): boolean {
        return false;
    }

    public scoreStructures(
        _seq: Sequence, _secstruct: SecStruct, _pseudoknotted: boolean = false,
        _temp: number = EPars.DEFAULT_TEMPERATURE, _outNodes: number[] | null = null
    ): number {
        return 0;
    }

    public foldSequence(
        _seq: Sequence, _secstruct: SecStruct | null, _desiredPairs: string | null = null,
        _pseudoknotted: boolean = false, _temp: number = EPars.DEFAULT_TEMPERATURE
    ): Sync extends true ? SecStruct | null : Promise<SecStruct | null> | SecStruct | null {
        return null;
    }

    public get canFoldWithBindingSite(): boolean {
        return false;
    }

    public foldSequenceWithBindingSite(
        _seq: Sequence, _secstruct: SecStruct | null, _bindingSite: number[], _bonus: number,
        _version: number = 2.0, _temp: number = EPars.DEFAULT_TEMPERATURE
    ): SecStruct | null {
        return null;
    }

    public get canCofold(): boolean {
        return false;
    }

    public cofoldSequence(
        _seq: Sequence, _secstruct: SecStruct | null, _malus: number = 0,
        _desiredPairs: string | null = null, _temp: number = EPars.DEFAULT_TEMPERATURE
    ): SecStruct | null {
        return null;
    }

    public get canCofoldWithBindingSite(): boolean {
        return false;
    }

    public cofoldSequenceWithBindingSite(
        _seq: Sequence, _bindingSite: number[], _bonus: number, _desiredPairs: string | null = null,
        _malus: number = 0, _temp: number = EPars.DEFAULT_TEMPERATURE
    ): SecStruct | null {
        return null;
    }

    public get canDotPlot(): boolean {
        return false;
    }

    public get canPseudoknot(): boolean {
        return false;
    }

    public getSuboptEnsembleNoBindingSite(
        _seq: Sequence,
        _kcalDeltaRange: number,
        _pseudoknotted: boolean = false,
        _temp: number = EPars.DEFAULT_TEMPERATURE
    ): SuboptEnsembleResult {
        return {
            suboptStructures: [],
            suboptEnergyError: [],
            suboptFreeEnergy: []
        };
    }

    public getDefect(
        _seq: Sequence, _pairs: SecStruct, _temp: number = EPars.DEFAULT_TEMPERATURE, _pseudoknotted: boolean = false
    ): number {
        return -1;
    }

    public getSuboptEnsembleWithOligos(
        _seq: Sequence,
        _oligos: string[],
        _kcalDeltaRange: number,
        _pseudoknotted: boolean = false,
        _temp: number = EPars.DEFAULT_TEMPERATURE
    ): SuboptEnsembleResult {
        return {

            suboptStructures: [],
            suboptEnergyError: [],
            suboptFreeEnergy: []
        };
    }

    public getDotPlot(
        _seq: Sequence, _secstruct: SecStruct, _temp: number = EPars.DEFAULT_TEMPERATURE, _pseudoknots: boolean = false
    ): Sync extends true ? DotPlot | null : Promise<DotPlot | null> | DotPlot | null {
        return null;
    }

    public get canMultifold(): boolean {
        return false;
    }

    public multifold(
        _seq: Sequence, _secstruct: SecStruct | null, _oligos: Oligo[],
        _desiredPairs: string | null = null, _temp: number = EPars.DEFAULT_TEMPERATURE
    ): MultiFoldResult | undefined {
        return undefined;
    }

    public multifoldUnroll(
        _seq: Sequence, _secstruct: SecStruct | null, _oligos: Oligo[],
        _desiredPairs: string | null = null, _temp: number = EPars.DEFAULT_TEMPERATURE
    ): PoseOp[] | null {
        return null;
    }

    // public load_parameters_from_buffer(buf: ByteArray, done_cb: Function = null): boolean {
    //     let res: boolean = false;
    //     if (this._clib_inst != null) {
    //         trace("supplying custom.par");
    //         this._clib_inst.supplyFile("custom.par", buf);
    //         res = this.load_custom_params();
    //     }
    //     return res;
    // }

    protected loadCustomParams(): boolean {
        return false;
    }

    public cutInLoop(_i: number): number {
        return 0;
    }

    protected putCache(key: CacheKey, data: CacheItem): void {
        const keyStr = JSON.stringify(key);
        this._cache.set(keyStr, data);
    }

    protected resetCache(): void {
        this._cache.clear();
    }

    protected abstract get _isSync (): Sync;
    private readonly _cache: Map<string, CacheItem> = new Map<string, CacheItem>();
}

import {PoseOp} from "eterna/diagram";

export default abstract class Folder {
    protected constructor() {
    }

    public abstract get name (): string;
    public abstract get isFunctional (): boolean;

    public getCache(key: any): any {
        let key_str = JSON.stringify(key);
        return this._cache.get(key_str);
    }

    public get canScoreStructures(): boolean {
        return false;
    }

    public scoreStructures(seq: number[], pairs: number[], temp: number = 37, outNodes: number[] = null): number {
        return 0;
    }

    public foldSequence(seq: number[], second_best_pairs: number[], desired_pairs: string = null, temp: number = 37): number[] {
        return null;
    }

    public get canFoldWithBindingSite(): boolean {
        return false;
    }

    public foldSequenceWithBindingSite(seq: number[], target_pairs: number[], binding_site: number[], bonus: number, version: number = 2.0, temp: number = 37): number[] {
        return null;
    }

    public get canCofold(): boolean {
        return false;
    }

    public cofoldSequence(seq: number[], second_best_pairs: number[], malus: number = 0, desired_pairs: string = null, temp: number = 37): number[] {
        return null;
    }

    public get canCofoldWithBindingSite(): boolean {
        return false;
    }

    public cofoldSequenceWithBindingSite(seq: number[], binding_site: number[], bonus: number, desired_pairs: string = null, malus: number = 0, temp: number = 37): number[] {
        return null;
    }

    public get canDotPlot(): boolean {
        return false;
    }

    public getDotPlot(seq: number[], pairs: number[], temp: number = 37): number[] {
        return null;
    }

    public get canMultifold(): boolean {
        return false;
    }

    public multifold(seq: number[], second_best_pairs: number[], oligos: any[], desired_pairs: string = null, temp: number = 37): any {
        return null;
    }

    public multifoldUnroll(seq: number[], second_best_pairs: number[], oligos: any[], desired_pairs: string = null, temp: number = 37): PoseOp[] {
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

    public hairpinEnergy(size: number, type: number, si1: number, sj1: number, sequence: number[], i: number, j: number): number {
        return 0;
    }

    public loopEnergy(n1: number, n2: number, type: number, type_2: number, si1: number, sj1: number, sp1: number, sq1: number, b1: boolean, b2: boolean): number {
        return 0;
    }

    public cutInLoop(i: number): number {
        return 0;
    }

    public mlEnergy(pairs: number[], S: number[], i: number, is_extloop: boolean): number {
        return 0;
    }

    protected putCache(key: Record<string, any>, data: any): void {
        let key_str = JSON.stringify(key);
        this._cache.set(key_str, data);
    }

    protected resetCache(): void {
        this._cache.clear();
    }

    private readonly _cache: Map<string, any> = new Map<string, any>();
}

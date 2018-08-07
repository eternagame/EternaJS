import {PoseOp} from "../pose2D/PoseOp";

export abstract class Folder {
    protected constructor() {
    }

    public abstract get_folder_name(): string;
    public abstract is_functional(): boolean;

    public get_cache(key: Object): any {
        let key_str = JSON.stringify(key);
        return this._cache.get(key_str);
    }

    public can_score_structures(): boolean {
        return false;
    }

    public score_structures(seq: number[], pairs: number[], temp: number = 37, outNodes: number[] = null): number {
        return 0;
    }

    public fold_sequence(seq: number[], second_best_pairs: number[], desired_pairs: string = null, temp: number = 37): number[] {
        return null;
    }

    public fold_sequence_with_binding_site(seq: number[], target_pairs: number[], binding_site: number[], bonus: number, version: number = 2.0, temp: number = 37): number[] {
        return null;
    }

    public can_cofold(): boolean {
        return false;
    }

    public cofold_sequence(seq: number[], second_best_pairs: number[], malus: number = 0, desired_pairs: string = null, temp: number = 37): number[] {
        return null;
    }

    public can_cofold_with_binding_site(): boolean {
        return false;
    }

    // / Overridables

    public cofold_sequence_with_binding_site(seq: number[], binding_site: number[], bonus: number, desired_pairs: string = null, malus: number = 0, temp: number = 37): number[] {
        return null;
    }

    public can_dot_plot(): boolean {
        return false;
    }

    public get_dot_plot(seq: number[], pairs: number[], temp: number = 37): number[] {
        return null;
    }

    public load_custom_params(): boolean {
        return false;
    }

    public can_multifold(): boolean {
        return false;
    }

    public multifold(seq: number[], second_best_pairs: number[], oligos: any[], desired_pairs: string = null, temp: number = 37): any {
        return null;
    }

    public multifold_unroll(seq: number[], second_best_pairs: number[], oligos: any[], desired_pairs: string = null, temp: number = 37): PoseOp[] {
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
    //
    // public load_parameters_from_url(url: string, done_cb: Function = null): void {
    //
    //     if (this._clib_inst != null) {
    //         let cb: Function = function (e: Event): void {
    //             let res: boolean = false;
    //             if (e.type != IOErrorEvent.IO_ERROR) {
    //                 res = this.load_parameters_from_buffer(e.target.data);
    //             }
    //             if (done_cb != null) done_cb(res);
    //         };
    //
    //         let rsc: URLLoader = new URLLoader();
    //         rsc.dataFormat = URLLoaderDataFormat.BINARY;
    //         rsc.addEventListener(IOErrorEvent.IO_ERROR, function (e: Event): void {
    //             cb(e);
    //         });
    //         rsc.addEventListener(Event.COMPLETE, function (e: Event): void {
    //             cb(e);
    //         });
    //         rsc.load(new URLRequest(url));
    //         return;
    //     }
    //     if (done_cb != null) done_cb(false);
    // }

    public hairpin_energy(size: number, type: number, si1: number, sj1: number, sequence: number[], i: number, j: number): number {
        return 0;
    }

    public loop_energy(n1: number, n2: number, type: number, type_2: number, si1: number, sj1: number, sp1: number, sq1: number, b1: boolean, b2: boolean): number {
        return 0;
    }

    public cut_in_loop(i: number): number {
        return 0;
    }

    public ml_energy(pairs: number[], S: number[], i: number, is_extloop: boolean): number {
        return 0;
    }

    protected put_cache(key: Object, data: any): void {
        let key_str = JSON.stringify(key);
        this._cache.set(key_str, data);
    }

    // / Helpers

    protected reset_cache(): void {
        this._cache.clear();
    }

    private readonly _cache: Map<string, any> = new Map<string, any>();
}

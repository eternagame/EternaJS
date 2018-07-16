import {Container, Point, Sprite, Texture} from "pixi.js";
import {BitmapManager} from "../resources/BitmapManager";
import {Bitmaps} from "../resources/Bitmaps";
import {BitmapUtil} from "../util/BitmapUtil";

export class Molecule extends Container {
    public constructor() {
        super();
        Molecule.initBitmapData();

        this.addChild(this._glow);
        this.addChild(this._body);
    }

    public set_wrong(wrong: boolean): void {
        this._is_wrong = wrong;
    }

    public get_last_drawn_pos(): Point {
        return new Point(this._last_drawn_x, this._last_drawn_y);
    }

    public updateView(zoom_level: number, x: number, y: number, current_time: number): void {
        if (this._animation_start_time < 0) {
            this._animation_start_time = current_time;
        }

        let diff: number = current_time - this._animation_start_time;
        let prog: number = Math.sin(diff * Math.PI / (Molecule.ANIMATION_SPAN)) + 0.95;
        prog = Math.max(0, prog);
        let prog_ind: number = Math.floor(prog / 2.0 * Molecule.NUM_ANIMATION_STEPS) % Molecule.NUM_ANIMATION_STEPS;

        let glow_data: Texture = this._is_wrong ?
            Molecule._glow_wrong_data[zoom_level][prog_ind] :
            Molecule._glow_data[zoom_level][prog_ind];

        this._glow.texture = glow_data;
        this._glow.pivot.x = glow_data.width * 0.5;
        this._glow.pivot.y = glow_data.height * 0.5;

        prog_ind = Math.floor(diff / Molecule.BODY_ANIMATION_SPAN * Molecule.NUM_ANIMATION_STEPS) % Molecule.NUM_ANIMATION_STEPS;
        let body_data: Texture = Molecule._body_data[zoom_level][prog_ind];

        this._body.texture = body_data;
        this._body.pivot.x = body_data.width * 0.5;
        this._body.pivot.y = body_data.height * 0.5;

        this._last_drawn_x = x;
        this._last_drawn_y = y;

        this.x = x;
        this.y = y;
    }

    private static initBitmapData(): void {
        if (Molecule._glow_data != null) {
            return;
        }

        Molecule._glow_data = [];
        Molecule._glow_wrong_data = [];
        Molecule._body_data = [];

        let original_glow_data: Texture = BitmapManager.get_bitmap(Bitmaps.ImgMoleculeOuter);
        let original_body_data: Texture = BitmapManager.get_bitmap(Bitmaps.ImgMoleculeInner);

        for (let zz: number = 0; zz < 5; zz++) {
            let bitmaps_in_zoom: Texture[] = [];
            let wrong_bitmaps_in_zoom: Texture[] = [];
            let body_bitmaps_in_zoom: Texture[] = [];

            let zoom_factor: number = 1.0 - zz * 0.1;
            let base_glow_data: Texture = BitmapUtil.scale_by(original_glow_data, zoom_factor);
            let base_body_data: Texture = BitmapUtil.scale_by(original_body_data, zoom_factor);

            for (let ii: number = 0; ii < Molecule.NUM_ANIMATION_STEPS; ii++) {
                let new_glow_data: Texture = BitmapUtil.color_transform_alpha(
                    base_glow_data, 255, 255, 255, 1.0 - (ii / Molecule.NUM_ANIMATION_STEPS) * 0.5, 0, 0, 0, 0);
                bitmaps_in_zoom.push(new_glow_data);

                let wrong_glow_data: Texture = BitmapUtil.color_transform(new_glow_data, 255, 0, 0, 0, 0, 0);
                wrong_bitmaps_in_zoom.push(wrong_glow_data);

                let body_data: Texture = BitmapUtil.rotate(base_body_data, 360 * ii / Molecule.NUM_ANIMATION_STEPS);
                body_bitmaps_in_zoom.push(body_data);
            }

            Molecule._glow_data.push(bitmaps_in_zoom);
            Molecule._glow_wrong_data.push(wrong_bitmaps_in_zoom);
            Molecule._body_data.push(body_bitmaps_in_zoom);
        }
    }

    private readonly _glow: Sprite = new Sprite();
    private readonly _body: Sprite = new Sprite();

    private _animation_start_time: number = -1;
    private _is_wrong: boolean = false;
    private _last_drawn_y: number = 0;
    private _last_drawn_x: number = 0;

    private static _glow_data: Texture[][];
    private static _glow_wrong_data: Texture[][];
    private static _body_data: Texture[][];

    private static readonly NUM_ANIMATION_STEPS: number = 60;
    private static readonly ANIMATION_SPAN: number = 1.1;
    private static readonly BODY_ANIMATION_SPAN: number = 2.2;

}

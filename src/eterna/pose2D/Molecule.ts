import {Container, Point, Sprite, Texture} from "pixi.js";
import {BitmapManager} from "../resources/BitmapManager";
import {Bitmaps} from "../resources/Bitmaps";
import {EternaTextureUtil} from "../util/EternaTextureUtil";

export class Molecule extends Container {
    public constructor() {
        super();
        Molecule.initTextures();

        this.addChild(this._glow);
        this.addChild(this._body);
    }

    public set isWrong(wrong: boolean) {
        this._isWrong = wrong;
    }

    public getLastDrawnPos(): Point {
        return new Point(this._lastDrawnX, this._lastDrawnY);
    }

    public updateView(zoom_level: number, x: number, y: number, current_time: number): void {
        if (this._animStartTime < 0) {
            this._animStartTime = current_time;
        }

        let diff: number = current_time - this._animStartTime;
        let prog: number = Math.sin(diff * Math.PI / (Molecule.ANIMATION_SPAN)) + 0.95;
        prog = Math.max(0, prog);
        let prog_ind: number = Math.floor(prog / 2.0 * Molecule.NUM_ANIMATION_STEPS) % Molecule.NUM_ANIMATION_STEPS;

        let glow_data: Texture = this._isWrong ?
            Molecule._glowWrongTex[zoom_level][prog_ind] :
            Molecule._glowTex[zoom_level][prog_ind];

        this._glow.texture = glow_data;
        this._glow.pivot.x = glow_data.width * 0.5;
        this._glow.pivot.y = glow_data.height * 0.5;

        prog_ind = Math.floor(diff / Molecule.BODY_ANIMATION_SPAN * Molecule.NUM_ANIMATION_STEPS) % Molecule.NUM_ANIMATION_STEPS;
        let body_data: Texture = Molecule._bodyTex[zoom_level][prog_ind];

        this._body.texture = body_data;
        this._body.pivot.x = body_data.width * 0.5;
        this._body.pivot.y = body_data.height * 0.5;

        this._lastDrawnX = x;
        this._lastDrawnY = y;

        this.x = x;
        this.y = y;
    }

    private static initTextures(): void {
        if (Molecule._glowTex != null) {
            return;
        }

        Molecule._glowTex = [];
        Molecule._glowWrongTex = [];
        Molecule._bodyTex = [];

        let original_glow_data: Texture = BitmapManager.getBitmap(Bitmaps.ImgMoleculeOuter);
        let original_body_data: Texture = BitmapManager.getBitmap(Bitmaps.ImgMoleculeInner);

        for (let zz: number = 0; zz < 5; zz++) {
            let bitmaps_in_zoom: Texture[] = [];
            let wrong_bitmaps_in_zoom: Texture[] = [];
            let body_bitmaps_in_zoom: Texture[] = [];

            let zoom_factor: number = 1.0 - zz * 0.1;
            let base_glow_data: Texture = EternaTextureUtil.scaleBy(original_glow_data, zoom_factor);
            let base_body_data: Texture = EternaTextureUtil.scaleBy(original_body_data, zoom_factor);

            for (let ii: number = 0; ii < Molecule.NUM_ANIMATION_STEPS; ii++) {
                let new_glow_data: Texture = EternaTextureUtil.colorTransformAlpha(
                    base_glow_data, 255, 255, 255, 1.0 - (ii / Molecule.NUM_ANIMATION_STEPS) * 0.5, 0, 0, 0, 0);
                bitmaps_in_zoom.push(new_glow_data);

                let wrong_glow_data: Texture = EternaTextureUtil.colorTransform(new_glow_data, 255, 0, 0, 0, 0, 0);
                wrong_bitmaps_in_zoom.push(wrong_glow_data);

                let body_data: Texture = EternaTextureUtil.rotate(base_body_data, 360 * ii / Molecule.NUM_ANIMATION_STEPS);
                body_bitmaps_in_zoom.push(body_data);
            }

            Molecule._glowTex.push(bitmaps_in_zoom);
            Molecule._glowWrongTex.push(wrong_bitmaps_in_zoom);
            Molecule._bodyTex.push(body_bitmaps_in_zoom);
        }
    }

    private readonly _glow: Sprite = new Sprite();
    private readonly _body: Sprite = new Sprite();

    private _animStartTime: number = -1;
    private _isWrong: boolean = false;
    private _lastDrawnY: number = 0;
    private _lastDrawnX: number = 0;

    private static _glowTex: Texture[][];
    private static _glowWrongTex: Texture[][];
    private static _bodyTex: Texture[][];

    private static readonly NUM_ANIMATION_STEPS: number = 60;
    private static readonly ANIMATION_SPAN: number = 1.1;
    private static readonly BODY_ANIMATION_SPAN: number = 2.2;

}

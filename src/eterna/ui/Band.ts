import {Graphics, Matrix, Point, Sprite, Text, Texture} from "pixi.js";
import {Updatable} from "../../flashbang/core/Updatable";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {MathUtil} from "../../flashbang/util/MathUtil";
import {TextureUtil} from "../../flashbang/util/TextureUtil";
import {BitmapManager} from "../resources/BitmapManager";
import {Bitmaps} from "../resources/Bitmaps";
import {ColorUtil} from "../util/ColorUtil";
import {Fonts} from "../util/Fonts";

type ColorMatrixFilter = PIXI.filters.ColorMatrixFilter;

export class Band extends ContainerObject implements Updatable {
    constructor(far_dist: number, close_dist: number, strength: number) {
        super();

        Band.initTextures();

        this._mid_dist = (far_dist + close_dist) * 0.5;
        this._mov_dist = (far_dist - close_dist) * 0.5;

        this._start_time = -1;

        this._st0 = new Sprite();
        this.container.addChild(this._st0);

        this._st1 = new Sprite();
        this.container.addChild(this._st1);

        let score_text: Text = Fonts.arial("", 10).bold().build();
        score_text.position = new Point(2, 19);
        this.container.addChild(score_text);

        this.set_strength(strength);
    }

    public set_strength(strength: number): void {
        if (strength == 1) {
            this._st0.texture = Band._satellite_bitmap;
            this._st1.texture = Band._satellite_invert;
        } else if (strength == 2) {
            this._st0.texture = Band._satellite_stronger_bitmap;
            this._st1.texture = Band._satellite_stronger_invert;
        } else {
            this._st0.texture = Band._satellite_weaker_bitmap;
            this._st1.texture = Band._satellite_weaker_invert;
        }
    }

    /*override*/
    public update(dt: number): void {
        if (this._start_time < 0) {
            this._start_time = dt;
        }

        let pair_r: number = Math.cos((dt - this._start_time) * 4) * this._mov_dist + this._mid_dist;

        this._st0.x = -pair_r;
        this._st0.y = 0;

        this._st1.x = pair_r;
        this._st1.y = 0;
    }

    private static rotate(mat: Matrix, x: number, y: number, degrees: number): void {
        // Rotate around point https://stackoverflow.com/a/1787534/5557208
        mat.translate(-x, -y);
        mat.rotate(degrees * (Math.PI / 180));
        mat.translate(x, y);
    }

    private static initTextures() {
        if (Band._satellite_bitmap != null) {
            return;
        }

        const satTex: Texture = BitmapManager.get_bitmap(Bitmaps.Satellite);
        const render = (rotation: number, colorTransform: ColorMatrixFilter = null): Texture => {
            let disp = new Graphics();
            disp.beginFill(0).drawRect(0, 0, 20, 20).endFill();

            let sat = new Sprite(satTex);
            sat.pivot = new Point(10, 10);
            sat.rotation = MathUtil.deg2Rad * -rotation;
            if (colorTransform != null) {
                sat.filters = [colorTransform];
            }

            disp.addChild(sat);

            return TextureUtil.renderToTexture(disp);
        };

        Band._satellite_bitmap = render(-90);
        Band._satellite_invert = render(90);
        Band._satellite_stronger_bitmap = render(-90, ColorUtil.colorTransform(3, 3, 3, 3, 0, 0, 0, 0));
        Band._satellite_stronger_invert = render(90, ColorUtil.colorTransform(3, 3, 3, 3, 0, 0, 0, 0));
        Band._satellite_weaker_bitmap = render(-90, ColorUtil.colorTransform(1, 1, 1, 0.4, 0, 0, 0, 0));
        Band._satellite_weaker_invert = render(90, ColorUtil.colorTransform(1, 1, 1, 0.4, 0, 0, 0, 0));
    }

    private readonly _st0: Sprite;
    private readonly _st1: Sprite;
    private readonly _mov_dist: number;
    private readonly _mid_dist: number;

    private _start_time: number;

    private static _satellite_bitmap: Texture;
    private static _satellite_invert: Texture;
    private static _satellite_stronger_bitmap: Texture;
    private static _satellite_stronger_invert: Texture;
    private static _satellite_weaker_bitmap: Texture;
    private static _satellite_weaker_invert: Texture;

}

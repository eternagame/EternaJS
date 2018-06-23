import * as log from "loglevel";
import {Point, Sprite, Text, Graphics} from "pixi.js";
import {DisplayObjectPointerTarget} from "../../flashbang/input/DisplayObjectPointerTarget";
import {KeyCode} from "../../flashbang/input/KeyCode";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {EPars} from "../EPars";
import {EternaURL} from "../net/EternaURL";
import {Plot} from "../Plot";
import {UndoBlock, UndoBlockParam} from "../UndoBlock";
import {BitmapManager} from "../resources/BitmapManager";
import {Fonts} from "../util/Fonts";
import {GameButton} from "./GameButton";
import {GamePanel} from "./GamePanel";
import {TextBalloon} from "./TextBalloon";

type InteractionEvent = PIXI.interaction.InteractionEvent;

export class SpecBox extends ContainerObject {
    constructor(docked: boolean = false) {
        super();

        this._panel = new GamePanel();
        if (!docked) {
            this._panel.setup(0, 1.0, 0x152843, 0.27, 0xC0DCE7);
        }
        this.addObject(this._panel, this.container);

        this._docked = docked;
        this._dotplotOriginX = 0;
        this._dotplotOriginY = 0;
        this._dotplotScaleLevel = 1;

        /// Dotplot h0
        this._h0 = Fonts.arial("A", 12).color(0xffffff).build();

        /// Meltplot h0
        this._h0_melt = Fonts.arial("37°C", 12).color(0xffffff).build();
        this._hn_melt = Fonts.arial("97°C", 12).color(0xffffff).build();
        this._v0 = Fonts.arial("1", 12).color(0xffffff).build();
        this._v0_melt = Fonts.arial("0%", 12).color(0xffffff).build();
        this._vn_melt = Fonts.arial("100%", 12).color(0xffffff).build();

        this.container.addChild(this._h0);
        this.container.addChild(this._h0_melt);
        this.container.addChild(this._hn_melt);

        this.container.addChild(this._v0);
        this.container.addChild(this._v0_melt);
        this.container.addChild(this._vn_melt);

        this._dotplot_canvas = new Sprite();
        this._meltplot_canvas = new Sprite();

        this._stattext = Fonts.arial("", 14).color(0xffffff).build();

        let url: string = EternaURL.generate_url({page: "manual"});
        let helpText: string = "<A HREF=\"" + url + "\" TARGET=\"" + Math.random() + "\"><U><FONT COLOR=\"#FFFFFF\"><B>What are these parameters?</B></FONT></U></A>";
        this._helptext = Fonts.arial(helpText, 14).color(0xffffff).build();

        this._dotplottext = Fonts.arial("Pairing probabilities plot", 12).color(0xffffff).build();

        this._meltplottext = Fonts.arial("Melt plot (% of unpaired bases)", 12).color(0xffffff).build();

        this.container.addChild(this._dotplot_canvas);
        this.container.addChild(this._meltplot_canvas);
        this.container.addChild(this._stattext);
        this.container.addChild(this._dotplottext);
        this.container.addChild(this._meltplottext);
        this.container.addChild(this._helptext);

        this._zoom_in = new GameButton()
            .allStates(BitmapManager.PlusImg)
            .tooltip("Zoom In")
            .hotkey(KeyCode.KeyI);
        this._zoom_in.clicked.connect(() => this.dotPlotZoomIn());
        this.addObject(this._zoom_in, this.container);

        this._zoom_out = new GameButton()
            .allStates(BitmapManager.MinusImg)
            .tooltip("Zoom out")
            .hotkey(KeyCode.KeyO);
        this._zoom_out.clicked.connect(() => this.dotPlotZoomOut());
        this.addObject(this._zoom_out, this.container);

        if (docked) {
            let pointerTarget = new DisplayObjectPointerTarget(this._dotplot_canvas);
            pointerTarget.pointerMove.connect((e) => this.onDotPlotMouseMove(e));
            pointerTarget.pointerOut.connect((e) => this.onDotPlotMouseOut(e));
            pointerTarget.pointerDown.connect((e) => this.onDotPlotMouseDown(e));
            pointerTarget.pointerUp.connect((e) => this.onDotPlotMouseUp(e));
        }
    }

    protected added(): void {
        super.added();
        this.updateLayout();
    }

    public get width(): number {
        return this._width;
    }

    public get height(): number {
        return this._height;
    }

    public set_size(width: number, height: number): void {
        if (this._width != width || this._height != height) {
            this._width = width;
            this._height = height;
            if (this.isLiveObject) {
                this.updateLayout();
            }
        }
    }

    public set_spec(datablock: UndoBlock): void {
        const temperature: number = 37;

        this._datasize = datablock.get_sequence().length;

        this._dotplot = datablock.create_dotplot();
        this._meltplot = datablock.create_meltplot();

        let statstring: string = "";
        statstring += "<B>" + EPars.get_colored_letter("A") + "-" + EPars.get_colored_letter("U") + " pairs : </B>" + datablock.get_param(UndoBlockParam.AU, temperature) + "   ";
        statstring += "<B>" + EPars.get_colored_letter("G") + "-" + EPars.get_colored_letter("C") + " pairs : </B>" + datablock.get_param(UndoBlockParam.GC, temperature) + "   ";
        statstring += "<B>" + EPars.get_colored_letter("G") + "-" + EPars.get_colored_letter("U") + " pairs : </B>" + datablock.get_param(UndoBlockParam.GU, temperature) + "\n";
        statstring += "<B>Melting point : </B>" + datablock.get_param(UndoBlockParam.MELTING_POINT, temperature) + "°C\n";
        statstring += "<B>Free energy : </B>" + (datablock.get_param(UndoBlockParam.FE, temperature) / 100) + "kcal\n";
        this._stattext.text = statstring;

        if (this._hvec != null) {
            for (let disp of this._hvec) {
                disp.destroy({children: true});
            }
        }
        this._hvec = [];

        if (this._vvec != null) {
            for (let disp of this._vvec) {
                disp.destroy({children: true});
            }
        }
        this._vvec = [];

        // initialize h1 ~ hn-1, v1 ~ vn-1
        for (let ii = SpecBox.OFFSET; ii <= (this._datasize / SpecBox.OFFSET) * SpecBox.OFFSET; ii += SpecBox.OFFSET) {
            let hnew: Text = Fonts.arial(String.fromCharCode(65 + (ii / SpecBox.OFFSET)), 12).color(0xffffff).build();
            this._hvec.push(hnew);
            this.container.addChild(hnew);

            let vnew: Text = Fonts.arial("" + (ii / SpecBox.OFFSET * 10), 12).color(0xffffff).build();
            this._vvec.push(vnew);
            this.container.addChild(vnew);
        }

        this._dotplotOriginX = 0;
        this._dotplotOriginY = 0;
        this._dotplotScaleLevel = 1;

        this.updateLayout();
    }

    public dotPlotZoomIn(): void {
        this._dotplotScaleLevel += SpecBox.DOTPLOT_SCALE_STEP;
        if (this._dotplotScaleLevel >= 5) {
            this._dotplotScaleLevel = 5;
        }
        this.scaleDotPlot(this._dotplotScaleLevel);
    }

    public dotPlotZoomOut(): void {

        this._dotplotScaleLevel -= SpecBox.DOTPLOT_SCALE_STEP;
        if (this._dotplotScaleLevel <= 1) {
            this._dotplotScaleLevel = 1;
        }
        this.scaleDotPlot(this._dotplotScaleLevel);
    }

    public getPlotSize(): number {
        let plot_w: number;
        let plot_h: number;

        if (this._docked) {
            plot_w = this._width - 55;
            plot_h = (this._height - 51) / 2.0;
        } else {
            plot_w = (this._width - 100) / 2.0;
            plot_h = this._height - 200;
        }

        return Math.min(plot_w, plot_h);
    }

    public scaleDotPlot(level: number = 1): void {
        if (level < 1) {
            log.warn("scale dotplot level under 1");
            return;
        }
        if (isNaN(this._dotplotOriginX)) this._dotplotOriginX = 0;
        if (isNaN(this._dotplotOriginY)) this._dotplotOriginY = 0;

        let plot_size: number = this.getPlotSize();
        let plot_size_level: number = plot_size * level;
        if (this._dotplot != null && plot_size > 0 && plot_size_level > 0) {
            this._dotplotOriginX += (-this._dotplotOriginX) / level;
            this._dotplotOriginY += (-this._dotplotOriginY) / level;
            this._dotplot.setSize(plot_size_level, plot_size_level);
            this._dotplot.replotWithBase(this._dotplotOriginX, this._dotplotOriginY);

            if (this._dotplot_canvas.mask != null) {
                this._dotplot_canvas.mask.destroy();
                this._dotplot_canvas.mask = null;
            }

            if (plot_size_level > plot_size) {
                let mask = new Graphics().beginFill(0, 0).drawRect(0, 0, plot_size, plot_size).endFill();
                this._dotplot_canvas.addChild(mask);
                this._dotplot_canvas.mask = mask;
            }

            this._dotplot_canvas.addChild(this._dotplot);
            this.updateDotplotLabel(this._dotplotOriginX, this._dotplotOriginY);
        }
    }

    private updateLayout(): void {
        this._panel.set_size(this._width, this._height);

        if (this._docked) {
            this._dotplot_canvas.position = new Point(20, 15);
            this._meltplot_canvas.position = new Point(20, (this._height * 0.5) + 8);

            this._stattext.visible = false;
            this._helptext.visible = false;
            this._dotplottext.visible = false;
            this._meltplottext.visible = false;

            this._zoom_in.display.visible = false;
            this._zoom_out.display.visible = false;

        } else {
            this._panel.set_panel_title("RNA Spec");

            this._v0.position = new Point(40 - this._v0.width - 3, 70);

            this._vn_melt.position.x = (this._width * 0.5) + 25 - this._vn_melt.width - 3;
            this._vn_melt.position.y = 70;

            this._dotplot_canvas.position = new Point(40, 70);
            this._meltplot_canvas.position = new Point((this._width * 0.5) + 20, 70);

            this._stattext.visible = true;
            this._stattext.position = new Point(20, this._height - 100);
            this._stattext.position = new Point(200, 200);

            this._helptext.visible = true;
            this._helptext.position = new Point(20, this._height - 35);
            this._dotplottext.visible = true;
            this._dotplottext.position = new Point(30, 40);
            this._meltplottext.visible = true;
            this._meltplottext.position = new Point((this._width * 0.5) + 10, 50);

            this._zoom_in.display.visible = true;
            this._zoom_out.display.visible = true;
            this._zoom_in.display.position = new Point(40, this._height - 125);
            this._zoom_out.display.position = new Point(70, this._height - 130);
        }

        let plot_size: number = this.getPlotSize();

        this.scaleDotPlot(1);

        if (this._meltplot != null && plot_size > 0) {
            this._meltplot.setSize(plot_size, plot_size);
            this._meltplot.replot();
            // this._meltplot.cacheAsBitmap = true;
            this._meltplot_canvas.addChild(this._meltplot);

            if (this._docked) {
                this._h0_melt.position = new Point(15, (this._height * 0.5) + plot_size + 10);
                this._hn_melt.position = new Point(
                    25 + plot_size - this._hn_melt.width,
                    (this._height * 0.5) + plot_size + 10);
                this._v0_melt.position = new Point(
                    25 - this._v0_melt.width - 3,
                    (this._height * 0.5) + plot_size - 10);
                this._vn_melt.position = new Point(
                    25 - this._vn_melt.width - 3,
                    (this._height * 0.5) + 5);
            } else {
                this._h0_melt.position = new Point((this._width * 0.5) + 15, plot_size + 75);
                this._hn_melt.position = new Point(
                    (this._width * 0.5) + 25 + plot_size - this._hn_melt.width,
                    plot_size + 75);
                this._v0_melt.position = new Point(
                    (this._width * 0.5) + 25 - this._v0_melt.width - 3,
                    55 + plot_size);
            }
        }
    }

    private saveAndResetDragPoint(): void {
        this._dotplotOriginX = this._dotplotX;
        this._dotplotOriginY = this._dotplotY;
        this._dragBeginX = 0;
        this._dragBeginY = 0;
    }

    private onDotPlotMouseUp(e: InteractionEvent): void {
        this._drag = false;
        this.saveAndResetDragPoint();
    }

    private onDotPlotMouseDown(e: InteractionEvent): void {
        this._drag = true;
        this._dotplotX = this._dotplotOriginX;
        this._dotplotY = this._dotplotOriginY;
        this._dragBeginX = e.data.global.x;
        this._dragBeginY = e.data.global.y;
    }

    private isDragging(): boolean {
        return this._drag;
    }

    private onDotPlotMouseMove(e: InteractionEvent): void {
        if (this.isDragging()) {
            if (this._coordBalloon != null) {
                this._coordBalloon.display.visible = false;
            }

            let diff_x: number = e.data.global.x - this._dragBeginX;
            let diff_y: number = e.data.global.y - this._dragBeginY;

            let plot_size: number = this.getPlotSize();
            let plot_size_level: number = plot_size * this._dotplotScaleLevel;

            this._dotplotX = this._dotplotOriginX + diff_x;
            this._dotplotY = this._dotplotOriginY + diff_y;

            if (this._dotplotX >= 0) this._dotplotX = 0;
            if (this._dotplotY >= 0) this._dotplotY = 0;
            if (this._dotplotX + plot_size_level <= plot_size) this._dotplotX = plot_size - plot_size_level;
            if (this._dotplotY + plot_size_level <= plot_size) this._dotplotY = plot_size - plot_size_level;

            this._dotplot.replotWithBase(this._dotplotX, this._dotplotY);
            // this._dotplot.cacheAsBitmap = true;
            this._dotplot_canvas.addChild(this._dotplot);
            this.updateDotplotLabel(this._dotplotX, this._dotplotY);

        } else {
            let localPoint = e.data.getLocalPosition(this._dotplot_canvas);
            let block_length: number = this.getDotplotOffsetSize();
            let x: number = (localPoint.x - this._dotplotOriginX) / block_length;
            let y: number = (localPoint.y - this._dotplotOriginY) / block_length;
            if (y == 0 || isNaN(y)) {
                y = 1;
            }

            let msg: string = String.fromCharCode(65 + x) + "," + (y * 10) + " - (" + (x * 10) + ", " + (y * 10) + ")";
            if (this._coordBalloon != null) {
                this._coordBalloon.set_text(msg);
                this._coordBalloon.display.visible = true;
            }
            else {
                this._coordBalloon = new TextBalloon(msg, 0x0, 0.8);
                this.addObject(this._coordBalloon, this.container);
                // this.set_mouse_over_object(this._coordBalloon, 1.0);
            }
            this._coordBalloon.display.position = e.data.global;
        }
    }

    private onDotPlotMouseOut(e: InteractionEvent): void {
        // this.set_mouse_over_object(null, 1.0);
        if (this._coordBalloon != null) {
            this._coordBalloon.destroySelf();
            this._coordBalloon = null;
        }
        this._drag = false;
        this.saveAndResetDragPoint();
    }

    private getDotplotOffsetSize(): number {
        let plot_size: number = this.getPlotSize();
        return plot_size / (this._datasize / 10) * this._dotplotScaleLevel;
    }

    // calculate it's origin and axis by from and to
    private calculateCoordPosition(from: Text, index: number, d: number): Point {
        let pos_from: Point = new Point();
        pos_from.copy(from.position);
        let diff_x: number = this.getDotplotOffsetSize();
        let diff_y: number = this.getDotplotOffsetSize();
        if (d == SpecBox.HORIZONTAL) {
            return new Point(pos_from.x + diff_x * (index + 1), pos_from.y);
        } else {
            return new Point(pos_from.x + from.width, pos_from.y + diff_y * (index + 1));
        }
    }

    private updateDotplotLabel(ref_x: number, ref_y: number): void {
        let plot_size: number = this.getPlotSize();
        let h0_default_x: number = this._docked ? 20 : SpecBox.H0_DEFAULT_X;
        let h0_default_y: number = this._docked ? 0 : SpecBox.H0_DEFAULT_Y;

        let h0_x_start: number = h0_default_x + ref_x;
        let h0_y_start: number = h0_default_y;

        this._h0.position = new Point(h0_x_start, h0_y_start);
        this._h0.visible = !(h0_x_start < h0_default_x);

        for (let ii = 0; ii < this._hvec.length; ++ii) {
            let pos = this.calculateCoordPosition(this._h0, ii, SpecBox.HORIZONTAL);
            this._hvec[ii].position = pos;
            this._hvec[ii].visible =
                !(pos.x >= plot_size + h0_default_x - this._hvec[ii].width || pos.x < h0_default_x);
        }

        let v0_default_x: number = this._docked ? 10 : SpecBox.V0_DEFAULT_X;
        let v0_default_y: number = this._docked ? 15 : SpecBox.V0_DEFAULT_Y;

        let v0_x_start: number = v0_default_x;
        let v0_y_start: number = v0_default_y + ref_y;

        this._v0.position = new Point(v0_x_start, v0_y_start);

        this._v0.visible = !(v0_y_start < v0_default_y);

        for (let ii = 0; ii < this._vvec.length; ++ii) {
            let pos = this.calculateCoordPosition(this._v0, ii, SpecBox.VERTICAL);
            pos.set(pos.x - this._vvec[ii].width, pos.y);
            this._vvec[ii].position = pos;
            this._vvec[ii].visible =
                !((pos.y >= plot_size + v0_default_y - this._vvec[ii].height || pos.y < v0_default_y));
        }
    }


    private readonly _docked: boolean;

    private readonly _panel: GamePanel;
    private readonly _zoom_in: GameButton;
    private readonly _zoom_out: GameButton;
    private readonly _dotplot_canvas: Sprite;
    private readonly _meltplot_canvas: Sprite;
    private readonly _h0: Text;
    private readonly _h0_melt: Text;
    private readonly _hn_melt: Text;
    private readonly _v0: Text;
    private readonly _v0_melt: Text;
    private readonly _vn_melt: Text;
    private readonly _stattext: Text;
    private readonly _helptext: Text;
    private readonly _dotplottext: Text;
    private readonly _meltplottext: Text;

    private _coordBalloon: TextBalloon;
    private _dotplot: Plot;
    private _meltplot: Plot;
    private _datasize: number = 0;
    private _hvec: Text[];
    private _vvec: Text[];

    private _dotplotScaleLevel: number;

    private _drag: boolean;
    private _dragBeginX: number;
    private _dragBeginY: number;
    private _dotplotX: number;
    private _dotplotY: number;
    private _dotplotOriginX: number;
    private _dotplotOriginY: number;

    private _width: number = 0;
    private _height: number = 0;

    private static readonly HORIZONTAL: number = 0;
    // this recalculate position of gametext at index th gametext
    private static readonly VERTICAL: number = 1;
    private static readonly DOTPLOT_SCALE_STEP: number = 0.2;
    private static readonly H0_DEFAULT_X: number = 42;
    private static readonly H0_DEFAULT_Y: number = 55;
    private static readonly V0_DEFAULT_X: number = 30;
    private static readonly V0_DEFAULT_Y: number = 70;
    private static readonly OFFSET: number = 10;	// coord offset
}

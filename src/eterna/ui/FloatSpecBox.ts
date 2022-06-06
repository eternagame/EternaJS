import * as log from 'loglevel';
import MultiStyleText from 'pixi-multistyle-text';
import {
    Container, Graphics, InteractionEvent, Point, Sprite, Text
} from 'pixi.js';
import {UnitSignal} from 'signals';
import EPars from 'eterna/EPars';
import Plot from 'eterna/Plot';
import UndoBlock, {UndoBlockParam} from 'eterna/UndoBlock';
import {
    ContainerObject, KeyCode, DisplayObjectPointerTarget, InputUtil, StyledTextBuilder, DisplayUtil, HAlign, VAlign
} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import Bitmaps from 'eterna/resources/Bitmaps';
import EternaURL from 'eterna/net/EternaURL';
import GameButton from './GameButton';
import GamePanel from './GamePanel';
import HTMLTextObject from './HTMLTextObject';
import TextBalloon from './TextBalloon';

export default class FloatSpecBox extends ContainerObject {
    public readonly shouldMaximize = new UnitSignal();

    constructor(docked: boolean = false) {
        super();
        this._docked = docked;
    }

    protected added(): void {
        this._panel = new GamePanel({});
        if (!this._docked) {
            this._panel.setup(0, 1.0, 0x152843, 0.27, 0xC0DCE7);
        }
        this.addObject(this._panel, this.container);
        this._dotplotOriginX = 0;
        this._dotplotOriginY = 0;
        this._dotplotScaleLevel = 1;

        // / Dotplot h0
        this._h0 = Fonts.std('A', 12).color(0xffffff).build();

        // / Meltplot h0
        this._h0Melt = Fonts.std('37°C', 12).color(0xffffff).build();
        this._hnMelt = Fonts.std('97°C', 12).color(0xffffff).build();
        this._v0 = Fonts.std('1', 12).color(0xffffff).build();
        this._v0Melt = Fonts.std('0%', 12).color(0xffffff).build();
        this._vnMelt = Fonts.std('100%', 12).color(0xffffff).build();

        this.container.addChild(this._h0);
        this.container.addChild(this._h0Melt);
        this.container.addChild(this._hnMelt);

        this.container.addChild(this._v0);
        this.container.addChild(this._v0Melt);
        this.container.addChild(this._vnMelt);

        this._dotPlotSprite = new Sprite();
        this.container.addChild(this._dotPlotSprite);

        this._meltPlotSprite = new Sprite();
        this.container.addChild(this._meltPlotSprite);

        if (this._docked) {
            this._maximizeButton = new GameButton()
                .allStates(Bitmaps.ImgMaximize)
                .tooltip('Re-maximize')
                .hotkey(KeyCode.KeyM);
            this.addObject(this._maximizeButton, this.container);
            this._maximizeButton.clicked.connect(() => this.shouldMaximize.emit());
        } else {
            this._stattext = new MultiStyleText('', {
                default: {
                    fontFamily: Fonts.STDFONT,
                    fontSize: 14,
                    fill: 0xffffff
                }
            });
            this.container.addChild(this._stattext);

            const url = EternaURL.createURL({page: 'manual'});
            const helpText = `<A HREF="${url}" target="_blank"><U><FONT COLOR="#FFFFFF"><B>What are these parameters?</B></FONT></U></A>`;
            this._helpText = new HTMLTextObject(helpText, undefined, undefined, true)
                .font(Fonts.STDFONT)
                .fontSize(14)
                .color(0xffffff);
            this.addObject(this._helpText, this.container);

            this._dotplottext = Fonts.std('Pairing probabilities plot', 12).color(0xffffff).build();
            this.container.addChild(this._dotplottext);

            this._meltplottext = Fonts.std('Melt plot (% of unpaired bases)', 12).color(0xffffff).build();
            this.container.addChild(this._meltplottext);

            this._zoomInButton = new GameButton()
                .allStates(Bitmaps.PlusImg)
                .tooltip('Zoom In')
                .hotkey(KeyCode.KeyI);
            this._zoomInButton.clicked.connect(() => this.dotPlotZoomIn());
            this.addObject(this._zoomInButton, this.container);

            this._zoomOutButton = new GameButton()
                .allStates(Bitmaps.MinusImg)
                .tooltip('Zoom out')
                .hotkey(KeyCode.KeyO);
            this._zoomOutButton.clicked.connect(() => this.dotPlotZoomOut());
            this.addObject(this._zoomOutButton, this.container);

            const pointerTarget = new DisplayObjectPointerTarget(this._dotPlotSprite);
            pointerTarget.pointerMove.connect((e) => this.onDotPlotMouseMove(e));
            pointerTarget.pointerOver.connect(() => this.onDotPlotMouseEnter());
            pointerTarget.pointerOut.connect(() => this.onDotPlotMouseExit());
            pointerTarget.pointerDown.filter(InputUtil.IsLeftMouse).connect((e) => this.onDotPlotMouseDown(e));
            pointerTarget.pointerUp.filter(InputUtil.IsLeftMouse).connect(() => this.onDotPlotMouseUp());
        }

        this.updateLayout();
    }

    public get width(): number {
        return this._width;
    }

    public get height(): number {
        return this._height;
    }

    public setSize(width: number, height: number): void {
        if (this._width !== width || this._height !== height) {
            this._width = width;
            this._height = height;
            if (this.isLiveObject) {
                this.updateLayout();
            }
        }
    }

    public setSpec(datablock: UndoBlock): void {
        const TEMPERATURE = 37;

        this._datasize = datablock.sequence.length;

        this._dotplot = datablock.createDotPlot();
        this._meltplot = datablock.createMeltPlot();

        if (this._stattext !== undefined) {
            const statString = new StyledTextBuilder({
                fontFamily: Fonts.STDFONT,
                fontSize: 14,
                fill: 0xffffff
            }).addStyle('bold', {
                fontWeight: 'bold'
            });
            EPars.addLetterStyles(statString);

            statString
                .append(`${EPars.getColoredLetter('A')}-${EPars.getColoredLetter('U')} pairs : `, 'bold')
                .append(`${datablock.getParam(UndoBlockParam.AU, TEMPERATURE)}   `)
                .append(`${EPars.getColoredLetter('G')}-${EPars.getColoredLetter('C')} pairs : `, 'bold')
                .append(`${datablock.getParam(UndoBlockParam.GC, TEMPERATURE)}   `)
                .append(`${EPars.getColoredLetter('G')}-${EPars.getColoredLetter('U')} pairs : `, 'bold')
                .append(`${datablock.getParam(UndoBlockParam.GU, TEMPERATURE)}\n`)
                .append('Free energy : ', 'bold')
                .append(`${Number(datablock.getParam(UndoBlockParam.FE, TEMPERATURE) as number / 100).toFixed(1)} kcal\t\t`)
                .append('Melting point : ', 'bold')
                .append(`${datablock.getParam(UndoBlockParam.MELTING_POINT, TEMPERATURE)}°C\n`)
                .append('Mean P-unpaired : ', 'bold')
                .append(`${Number(datablock.getParam(UndoBlockParam.MEANPUNP, TEMPERATURE)).toFixed(3)}\t\t`)
                .append('Branchiness : ', 'bold')
                .append(`${Number(datablock.getParam(UndoBlockParam.BRANCHINESS, TEMPERATURE)).toFixed(1)}\n`)
                .append('Target exp acc : ', 'bold')
                .append(`${(datablock.getParam(UndoBlockParam.TARGET_EXPECTED_ACCURACY, 37) as number)?.toFixed(3) ?? 'Unavailable'}\n`);

            statString.apply(this._stattext);
        }

        if (this._hvec != null) {
            for (const disp of this._hvec) {
                disp.destroy({children: true});
            }
        }
        this._hvec = [];

        if (this._vvec != null) {
            for (const disp of this._vvec) {
                disp.destroy({children: true});
            }
        }
        this._vvec = [];

        // initialize h1 ~ hn-1, v1 ~ vn-1
        for (let ii = FloatSpecBox.OFFSET;
            ii <= (this._datasize / FloatSpecBox.OFFSET) * FloatSpecBox.OFFSET; ii += FloatSpecBox.OFFSET) {
            const hnew: Text = Fonts.std(
                String.fromCharCode(65 + (ii / FloatSpecBox.OFFSET)), 12
            ).color(0xffffff).build();
            this._hvec.push(hnew);
            this.container.addChild(hnew);

            const vnew: Text = Fonts.std(`${(ii / FloatSpecBox.OFFSET) * 10}`, 12).color(0xffffff).build();
            this._vvec.push(vnew);
            this.container.addChild(vnew);
        }

        this._dotplotOriginX = 0;
        this._dotplotOriginY = 0;
        this._dotplotScaleLevel = 1;

        this.updateLayout();
    }

    public dotPlotZoomIn(): void {
        this._dotplotScaleLevel += FloatSpecBox.DOTPLOT_SCALE_STEP;
        if (this._dotplotScaleLevel >= 5) {
            this._dotplotScaleLevel = 5;
        }
        this.scaleDotPlot(this._dotplotScaleLevel);
    }

    public dotPlotZoomOut(): void {
        this._dotplotScaleLevel -= FloatSpecBox.DOTPLOT_SCALE_STEP;
        if (this._dotplotScaleLevel <= 1) {
            this._dotplotScaleLevel = 1;
        }
        this.scaleDotPlot(this._dotplotScaleLevel);
    }

    public get plotSize(): number {
        const plotW: number = this._docked ? this._width - 55 : (this._width - 100) / 2.0;
        const plotH: number = this._docked ? (this._height - 51) / 2.0 : this._height - 200;

        return Math.min(plotW, plotH);
    }

    public scaleDotPlot(level: number = 1): void {
        if (level < 1) {
            log.warn('scale dotplot level under 1');
            return;
        }
        if (Number.isNaN(this._dotplotOriginX)) {
            this._dotplotOriginX = 0;
        }
        if (Number.isNaN(this._dotplotOriginY)) {
            this._dotplotOriginY = 0;
        }

        const {plotSize} = this;
        const plotSizeLevel: number = plotSize * level;
        if (this._dotplot != null && plotSize > 0 && plotSizeLevel > 0) {
            this._dotplotOriginX += (-this._dotplotOriginX) / level;
            this._dotplotOriginY += (-this._dotplotOriginY) / level;
            this._dotplot.setSize(plotSizeLevel, plotSizeLevel);
            this._dotplot.replotWithBase(this._dotplotOriginX, this._dotplotOriginY);

            if (this._dotPlotSprite.mask != null) {
                if (this._dotPlotSprite.mask instanceof Container) {
                    // Can't do this for a PIXI.MaskData
                    this._dotPlotSprite.mask.destroy();
                }
                this._dotPlotSprite.mask = null;
            }

            const mask = new Graphics().beginFill(0).drawRect(0, 0, plotSize, plotSize).endFill();
            this._dotPlotSprite.addChild(mask);
            this._dotPlotSprite.mask = mask;

            this._dotPlotSprite.addChild(this._dotplot);
            this.updateDotplotLabel(this._dotplotOriginX, this._dotplotOriginY);
        }
    }

    private updateLayout(): void {
        this._panel.setSize(this._width, this._height);

        if (this._docked) {
            this._dotPlotSprite.position.set(20, 15);
            this._meltPlotSprite.position.set(20, (this._height * 0.5) + 8);
            this._maximizeButton.display.position.set(this._width - 22, 5);
        } else {
            this._v0.position.set(40 - this._v0.width - 3, 70);

            this._vnMelt.position.x = (this._width * 0.5) + 25 - this._vnMelt.width - 3;
            this._vnMelt.position.y = 70;

            this._dotPlotSprite.position.set(40, 70);
            this._meltPlotSprite.position.set((this._width * 0.5) + 20, 70);

            this._stattext.visible = true;
            this._stattext.position.set(20, this._height - 100);
            // this._stattext.size= new Point(200, 200);

            this._helpText.display.visible = true;
            this._helpText.display.position.set(20, 10);// this._height - 35);

            this._dotplottext.position.set(30, 40);
            this._meltplottext.position.set((this._width * 0.5) + 10, 50);

            this._zoomInButton.display.position.set(40, this._height - 125);
            this._zoomOutButton.display.position.set(70, this._height - 130);
        }

        // Redraw our dotplot
        this.scaleDotPlot(this._dotplotScaleLevel);

        const {plotSize} = this;
        if (this._meltplot != null && plotSize > 0) {
            this._meltplot.setSize(plotSize, plotSize);
            this._meltplot.replot();
            // this._meltplot.cacheAsBitmap = true;
            this._meltPlotSprite.addChild(this._meltplot);

            DisplayUtil.positionRelative(
                this._v0Melt, HAlign.RIGHT, VAlign.BOTTOM,
                this._meltPlotSprite, HAlign.LEFT, VAlign.BOTTOM, -1, 0
            );

            DisplayUtil.positionRelative(
                this._vnMelt, HAlign.RIGHT, VAlign.TOP,
                this._meltPlotSprite, HAlign.LEFT, VAlign.TOP, -1, 0
            );

            DisplayUtil.positionRelative(
                this._h0Melt, HAlign.LEFT, VAlign.TOP,
                this._meltPlotSprite, HAlign.LEFT, VAlign.BOTTOM, 0, 1
            );

            DisplayUtil.positionRelative(
                this._hnMelt, HAlign.RIGHT, VAlign.TOP,
                this._meltPlotSprite, HAlign.RIGHT, VAlign.BOTTOM, 0, 1
            );
        }
    }

    private saveAndResetDragPoint(): void {
        this._dotplotOriginX = this._dotplotX;
        this._dotplotOriginY = this._dotplotY;
        this._dragBeginX = 0;
        this._dragBeginY = 0;
    }

    private onDotPlotMouseEnter(): void {
        this._mouseOverDotPlot = true;
    }

    private onDotPlotMouseExit(): void {
        this._mouseOverDotPlot = false;
        if (this._coordBalloon != null) {
            this._coordBalloon.display.visible = false;
        }
    }

    private onDotPlotMouseUp(): void {
        this._isDragging = false;
        this.saveAndResetDragPoint();
    }

    private onDotPlotMouseDown(e: InteractionEvent): void {
        this._isDragging = true;
        this._dotplotX = this._dotplotOriginX;
        this._dotplotY = this._dotplotOriginY;
        this._dragBeginX = e.data.global.x;
        this._dragBeginY = e.data.global.y;
    }

    private onDotPlotMouseMove(e: InteractionEvent): void {
        if (this._isDragging) {
            if (this._coordBalloon != null) {
                this._coordBalloon.display.visible = false;
            }

            const diffX: number = e.data.global.x - this._dragBeginX;
            const diffY: number = e.data.global.y - this._dragBeginY;

            const {plotSize} = this;
            const plotSizeLevel: number = plotSize * this._dotplotScaleLevel;

            this._dotplotX = this._dotplotOriginX + diffX;
            this._dotplotY = this._dotplotOriginY + diffY;

            if (this._dotplotX >= 0) this._dotplotX = 0;
            if (this._dotplotY >= 0) this._dotplotY = 0;
            if (this._dotplotX + plotSizeLevel <= plotSize) this._dotplotX = plotSize - plotSizeLevel;
            if (this._dotplotY + plotSizeLevel <= plotSize) this._dotplotY = plotSize - plotSizeLevel;

            this._dotplot.replotWithBase(this._dotplotX, this._dotplotY);
            this._dotPlotSprite.addChild(this._dotplot);
            this.updateDotplotLabel(this._dotplotX, this._dotplotY);
        } else if (this._mouseOverDotPlot) {
            const localPoint = e.data.getLocalPosition(this._dotPlotSprite);
            const blockLength: number = this.dotplotOffsetSize;
            const x: number = (localPoint.x - this._dotplotOriginX) / blockLength;
            let y: number = (localPoint.y - this._dotplotOriginY) / blockLength;
            if (y === 0 || Number.isNaN(y)) {
                y = 1;
            }

            const msg: string = `${String.fromCharCode(65 + x)},${Math.floor(y * 10)}`
                + ` - (${Math.floor(x * 10)}, ${Math.floor(y * 10)})`;
            if (this._coordBalloon != null) {
                this._coordBalloon.setText(msg);
                this._coordBalloon.display.visible = true;
            } else {
                this._coordBalloon = new TextBalloon(msg, 0x0, 0.8);
                this.addObject(this._coordBalloon, this.container);
            }
            this._coordBalloon.display.position = this._coordBalloon.display.parent.toLocal(e.data.global);
        }
    }

    private get dotplotOffsetSize(): number {
        return (this.plotSize / (this._datasize / 10)) * this._dotplotScaleLevel;
    }

    // calculate it's origin and axis by from and to
    private calculateCoordPosition(from: Text, index: number, d: number): Point {
        const posFrom: Point = new Point();
        posFrom.copyFrom(from.position);
        const diffX: number = this.dotplotOffsetSize;
        const diffY: number = this.dotplotOffsetSize;
        if (d === FloatSpecBox.HORIZONTAL) {
            return new Point(posFrom.x + diffX * (index + 1), posFrom.y);
        } else {
            return new Point(posFrom.x + from.width, posFrom.y + diffY * (index + 1));
        }
    }

    private updateDotplotLabel(refX: number, refY: number): void {
        const {plotSize} = this;
        const h0DefaultX: number = this._docked ? 20 : FloatSpecBox.H0_DEFAULT_X;
        const h0DefaultY: number = this._docked ? 0 : FloatSpecBox.H0_DEFAULT_Y;

        const h0XStart: number = h0DefaultX + refX;
        const h0YStart: number = h0DefaultY;

        this._h0.position.set(h0XStart, h0YStart);
        this._h0.visible = !(h0XStart < h0DefaultX);

        for (let ii = 0; ii < this._hvec.length; ++ii) {
            const pos = this.calculateCoordPosition(this._h0, ii, FloatSpecBox.HORIZONTAL);
            this._hvec[ii].position.copyFrom(pos);
            this._hvec[ii].visible = !(pos.x >= plotSize + h0DefaultX - this._hvec[ii].width || pos.x < h0DefaultX);
        }

        const v0DefaultX: number = this._docked ? 10 : FloatSpecBox.V0_DEFAULT_X;
        const v0DefaultY: number = this._docked ? 15 : FloatSpecBox.V0_DEFAULT_Y;

        const v0XStart: number = v0DefaultX;
        const v0YStart: number = v0DefaultY + refY;

        this._v0.position.set(v0XStart, v0YStart);

        this._v0.visible = !(v0YStart < v0DefaultY);

        for (let ii = 0; ii < this._vvec.length; ++ii) {
            const pos = this.calculateCoordPosition(this._v0, ii, FloatSpecBox.VERTICAL);
            pos.set(pos.x - this._vvec[ii].width, pos.y);
            this._vvec[ii].position.copyFrom(pos);
            this._vvec[ii].visible = !((pos.y >= plotSize + v0DefaultY - this._vvec[ii].height || pos.y < v0DefaultY));
        }
    }

    private readonly _docked: boolean;

    private _panel: GamePanel;
    private _zoomInButton: GameButton;
    private _zoomOutButton: GameButton;
    private _maximizeButton: GameButton;
    private _dotPlotSprite: Sprite;
    private _meltPlotSprite: Sprite;
    private _h0: Text;
    private _h0Melt: Text;
    private _hnMelt: Text;
    private _v0: Text;
    private _v0Melt: Text;
    private _vnMelt: Text;
    private _stattext: MultiStyleText;
    private _helpText: HTMLTextObject;
    private _dotplottext: Text;
    private _meltplottext: Text;

    private _coordBalloon: TextBalloon;
    private _dotplot: Plot;
    private _meltplot: Plot;
    private _datasize: number = 0;
    private _hvec: Text[];
    private _vvec: Text[];

    private _dotplotScaleLevel: number = 1;

    private _isDragging: boolean;
    private _mouseOverDotPlot: boolean;
    private _dragBeginX: number = 0;
    private _dragBeginY: number = 0;
    private _dotplotX: number = 0;
    private _dotplotY: number = 0;
    private _dotplotOriginX: number = 0;
    private _dotplotOriginY: number = 0;

    private _width: number = 0;
    private _height: number = 0;

    private static readonly HORIZONTAL = 0;
    private static readonly VERTICAL = 1;
    private static readonly DOTPLOT_SCALE_STEP = 0.2;
    private static readonly H0_DEFAULT_X = 42;
    private static readonly H0_DEFAULT_Y = 55;
    private static readonly V0_DEFAULT_X = 30;
    private static readonly V0_DEFAULT_Y = 70;
    private static readonly OFFSET = 10; // coord offset
}

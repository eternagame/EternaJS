import {FederatedPointerEvent} from '@pixi/events';
import EPars from 'eterna/EPars';
import EternaURL from 'eterna/net/EternaURL';
import Plot from 'eterna/Plot';
import Bitmaps from 'eterna/resources/Bitmaps';
import UndoBlock, {UndoBlockParam} from 'eterna/UndoBlock';
import Fonts from 'eterna/util/Fonts';
import {
    DisplayObjectPointerTarget, DisplayUtil, Dragger, HAlign, HLayoutContainer, InputUtil,
    KeyCode, MathUtil, StyledTextBuilder, VAlign, VLayoutContainer
} from 'flashbang';
import MultiStyleText from 'pixi-multistyle-text';
import {
    Container, Graphics, Point, Rectangle, Text
} from 'pixi.js';
import GameButton from './GameButton';
import SpecHTMLButton from './SpecHTMLButton';
import TextBalloon from './TextBalloon';
import WindowDialog from './WindowDialog';

export default class SpecBoxDialog extends WindowDialog<void> {
    constructor() {
        super({title: 'RNA Spec'});
    }

    protected added(): void {
        super.added();
        this._content = new VLayoutContainer(5, HAlign.LEFT);
        this._window.content.addChild(this._content);

        const url = EternaURL.createURL({page: 'manual'});
        const helpText = new SpecHTMLButton('What are these parameters?', 14, Fonts.STDFONT);
        this.addObject(helpText, this._content);
        helpText.clicked.connect(() => {
            window.open(url, '_blank');
        });

        this._plotContainer = new Container();
        this._content.addChild(this._plotContainer);

        this._dotPlotTitle = Fonts.std('Pairing probabilities plot', 12).color(0xffffff).build();
        this._plotContainer.addChild(this._dotPlotTitle);
        this._meltPlotTitle = Fonts.std('Melt plot (% of unpaired bases)', 12).color(0xffffff).build();
        this._plotContainer.addChild(this._meltPlotTitle);

        this._dotPlotContainer = new Container();
        this._dotPlotMask = new Graphics();
        this._dotPlotContainer.addChild(this._dotPlotMask);
        this._dotPlotMask.hitArea = new Rectangle();
        this._plotContainer.addChild(this._dotPlotContainer);
        this._meltPlotContainer = new Container();
        this._plotContainer.addChild(this._meltPlotContainer);

        this._dotHLabel0 = Fonts.std('A', 12).color(0xffffff).build();
        this._plotContainer.addChild(this._dotHLabel0);
        this._dotVLabel0 = Fonts.std('1', 12).color(0xffffff).build();
        this._plotContainer.addChild(this._dotVLabel0);
        this._meltHLabel0 = Fonts.std('37°C', 12).color(0xffffff).build();
        this._plotContainer.addChild(this._meltHLabel0);
        this._meltHLabelN = Fonts.std('97°C', 12).color(0xffffff).build();
        this._plotContainer.addChild(this._meltHLabelN);
        this._meltVLabel0 = Fonts.std('0%', 12).color(0xffffff).build();
        this._plotContainer.addChild(this._meltVLabel0);
        this._meltVLabelN = Fonts.std('100%', 12).color(0xffffff).build();
        this._plotContainer.addChild(this._meltVLabelN);

        this._zoomContainer = new HLayoutContainer(10);
        this._plotContainer.addChild(this._zoomContainer);

        this._zoomInButton = new GameButton()
            .allStates(Bitmaps.PlusImg)
            .tooltip('Zoom In')
            .hotkey(KeyCode.KeyI);
        this._zoomInButton.clicked.connect(() => this.changeDotPlotScale(SpecBoxDialog.DOT_PLOT_SCALE_STEP));
        this.addObject(this._zoomInButton, this._zoomContainer);

        this._zoomOutButton = new GameButton()
            .allStates(Bitmaps.MinusImg)
            .tooltip('Zoom out')
            .hotkey(KeyCode.KeyO);
        this._zoomOutButton.clicked.connect(() => this.changeDotPlotScale(-SpecBoxDialog.DOT_PLOT_SCALE_STEP));
        this.addObject(this._zoomOutButton, this._zoomContainer);

        this._zoomContainer.layout();

        this._statText = new MultiStyleText('', {
            default: {
                fontFamily: Fonts.STDFONT,
                fontSize: 14,
                fill: 0xffffff
            }
        });
        this._content.addChild(this._statText);

        const pointerTarget = new DisplayObjectPointerTarget(this._dotPlotContainer);
        pointerTarget.pointerMove.connect((e) => this.onDotPlotMouseMove(e));
        pointerTarget.pointerOut.connect(() => {
            if (this._coordBalloon != null) {
                this._coordBalloon.display.visible = false;
            }
        });
        pointerTarget.pointerDown.filter(InputUtil.IsLeftMouse).connect((e) => this.onDotPlotPointerDown(e));

        if (this._dataBlock) this.build();
        this._window.contentSizeWillUpdate.connect(({width, height}) => {
            this.layout(width, height);
        });
        this._window.setTargetBounds({width: 950, height: 680});
    }

    public setSpec(dataBlock: UndoBlock): void {
        this._dataBlock = dataBlock;
        if (this.isLiveObject) {
            this.build();
            const bounds = this._window.getMaxContentSize();
            this.layout(bounds.width, bounds.height);
            this._window.layout();
        }
    }

    private build() {
        const TEMPERATURE = 37;

        const statString = new StyledTextBuilder({
            fontFamily: Fonts.STDFONT,
            fontSize: 14,
            fill: 0xffffff,
            // Even when disabled, apparently this counts towards the width/height, even though the
            // position starts at the visible location. That throws our sizing calculations off
            dropShadowDistance: 0
        }).addStyle('bold', {
            fontWeight: 'bold'
        });
        EPars.addLetterStyles(statString);

        statString
            .append(`${EPars.getColoredLetter('A')}-${EPars.getColoredLetter('U')} pairs : `, 'bold')
            .append(`${this._dataBlock.getParam(UndoBlockParam.AU, TEMPERATURE)}   `)
            .append(`${EPars.getColoredLetter('G')}-${EPars.getColoredLetter('C')} pairs : `, 'bold')
            .append(`${this._dataBlock.getParam(UndoBlockParam.GC, TEMPERATURE)}   `)
            .append(`${EPars.getColoredLetter('G')}-${EPars.getColoredLetter('U')} pairs : `, 'bold')
            .append(`${this._dataBlock.getParam(UndoBlockParam.GU, TEMPERATURE)}\n`)
            .append('Free energy : ', 'bold')
            .append(`${Number(this._dataBlock.getParam(UndoBlockParam.FE, TEMPERATURE) as number / 100).toFixed(1)} kcal\t\t`)
            .append('Melting point : ', 'bold')
            .append(`${this._dataBlock.getParam(UndoBlockParam.MELTING_POINT, TEMPERATURE)}°C\n`)
            .append('Mean P-unpaired : ', 'bold')
            .append(`${Number(this._dataBlock.getParam(UndoBlockParam.MEANPUNP, TEMPERATURE)).toFixed(3)}\t\t`)
            .append('Branchiness : ', 'bold')
            .append(`${Number(this._dataBlock.getParam(UndoBlockParam.BRANCHINESS, TEMPERATURE)).toFixed(1)}\n`)
            .append('Target exp acc : ', 'bold')
            .append(`${(this._dataBlock.getParam(UndoBlockParam.TARGET_EXPECTED_ACCURACY, 37) as number)?.toFixed(3) ?? 'Unavailable'}`);

        statString.apply(this._statText);

        if (this._dotPlot) this._dotPlot.destroy();
        this._dotPlot = this._dataBlock.createDotPlot();
        // Be aware: The mask is a child of the container (so that it's (0,0) position is relative to that),
        // but masks the plot itself because Pixi only updates the bounds of the object according to the mask
        // for the container the mask is applied to, not its children. The effect of masking the container would be
        // the entire container would report to be the size of the zoomed in dot plot, and so our vlayoutcontainer
        // would shove everything below the plot lower than we intend
        this._dotPlot.mask = this._dotPlotMask;
        this._dotPlotContainer.addChild(this._dotPlot);
        if (this._meltPlot) this._meltPlot.destroy();
        this._meltPlot = this._dataBlock.createMeltPlot();
        this._meltPlotContainer.addChild(this._meltPlot);

        if (this._dotHLabels != null) {
            for (const disp of this._dotHLabels) {
                disp.destroy({children: true});
            }
        }
        this._dotHLabels = [];

        if (this._dotVLabels != null) {
            for (const disp of this._dotVLabels) {
                disp.destroy({children: true});
            }
        }
        this._dotVLabels = [];

        // initialize h1 ~ hn-1, v1 ~ vn-1
        for (
            let ii = SpecBoxDialog.OFFSET;
            ii <= (this._dataBlock.sequence.length / SpecBoxDialog.OFFSET) * SpecBoxDialog.OFFSET;
            ii += SpecBoxDialog.OFFSET
        ) {
            const newHLabel = Fonts.std(String.fromCharCode(65 + (ii / SpecBoxDialog.OFFSET)), 12)
                .color(0xffffff)
                .build();
            this._dotHLabels.push(newHLabel);
            this._plotContainer.addChild(newHLabel);

            const newVLabel = Fonts.std(`${(ii / SpecBoxDialog.OFFSET) * 10 + 1}`, 12).color(0xffffff).build();
            this._dotVLabels.push(newVLabel);
            this._plotContainer.addChild(newVLabel);
        }

        // HACK: This is the easiest way I can think of to do this and I'm on a time crunch...
        this._plotContainer.visible = false;
        this._content.layout(true);
        this._notPlotHeight = this._content.height + this._content.vOffset;
        this._plotContainer.visible = true;
        this._content.layout(true);
    }

    private layout(requestedWidth: number, requestedHeight: number) {
        if (!this.isLiveObject || !this._dataBlock) return;

        // These values are somewhat arbitrary, but seem to be about as small as you can go while ensuring
        // the plots are at least minimally readable
        const width = Math.max(requestedWidth, requestedWidth < requestedHeight ? this._statText.width : 425);
        const height = Math.max(requestedHeight, requestedWidth < requestedHeight ? 580 : 365);

        const plotSize = this.calcPlotSize(width, height);
        const dotPlotVLabelWidth = Math.max(...this._dotVLabels.map((label) => label.width));
        if (plotSize.vAligned) {
            let yPos = 0;
            this._dotPlotTitle.position.set(0, yPos);
            yPos += this._dotPlotTitle.height + 10 + this._dotHLabel0.height;
            this._dotPlotContainer.position.set(0, yPos);
            yPos += plotSize.size + 5 + this._zoomContainer.height + 5;
            this._meltPlotTitle.position.set(0, yPos);
            yPos += this._meltPlotTitle.height + 10;
            this._meltPlotContainer.position.set(0, yPos);
        } else {
            const dotPlotOffset = dotPlotVLabelWidth + plotSize.size + SpecBoxDialog.PLOT_MARGIN;
            this._dotPlotTitle.position.set(dotPlotVLabelWidth, 0);
            this._meltPlotTitle.position.set(dotPlotOffset + this._meltVLabelN.width, 0);
            this._dotPlotContainer.position.set(dotPlotVLabelWidth, 40);
            this._meltPlotContainer.position.set(dotPlotOffset + this._meltVLabelN.width, 40);
        }

        this.redrawDotPlot(plotSize.size, this._dotPlotScale);
        this.repositionDotPlot(this._dotPlot.x, this._dotPlot.y);

        DisplayUtil.positionRelative(
            this._zoomContainer, HAlign.CENTER, VAlign.TOP,
            this._dotPlotContainer, HAlign.CENTER, VAlign.BOTTOM, 0, 5
        );

        this._meltPlot.setSize(plotSize.size, plotSize.size);
        this._meltPlot.replot();

        DisplayUtil.positionRelative(
            this._meltVLabel0, HAlign.RIGHT, VAlign.BOTTOM,
            this._meltPlotContainer, HAlign.LEFT, VAlign.BOTTOM, -1, 0
        );

        DisplayUtil.positionRelative(
            this._meltVLabelN, HAlign.RIGHT, VAlign.TOP,
            this._meltPlotContainer, HAlign.LEFT, VAlign.TOP, -1, 0
        );

        DisplayUtil.positionRelative(
            this._meltHLabel0, HAlign.LEFT, VAlign.TOP,
            this._meltPlotContainer, HAlign.LEFT, VAlign.BOTTOM, 0, 1
        );

        DisplayUtil.positionRelative(
            this._meltHLabelN, HAlign.RIGHT, VAlign.TOP,
            this._meltPlotContainer, HAlign.RIGHT, VAlign.BOTTOM, 0, 1
        );

        this._content.layout(true);
    }

    private changeDotPlotScale(amount: number) {
        // TODO: Is there a reason to set a max?
        this._dotPlotScale = MathUtil.clamp(this._dotPlotScale + amount, 1, 5);
        const size = this.calcPlotSize(this._content.width, this._content.height).size;
        this.redrawDotPlot(size, this._dotPlotScale);
        this.repositionDotPlot(
            this._dotPlot.x + (-this._dotPlot.x) / this._dotPlotScale,
            this._dotPlot.y + (-this._dotPlot.y) / this._dotPlotScale
        );
    }

    private onDotPlotPointerDown(e: FederatedPointerEvent) {
        const dragger = new Dragger();
        this.addObject(dragger);

        if (this._coordBalloon != null) {
            this._coordBalloon.display.visible = false;
        }

        const dragStartingPoint = e.global.clone();
        const plotStartingPoint = this._dotPlot.position.clone();
        this.regs.add(dragger.dragged.connect((mousePos: Point) => {
            const diffX: number = mousePos.x - dragStartingPoint.x;
            const diffY: number = mousePos.y - dragStartingPoint.y;
            this.repositionDotPlot(plotStartingPoint.x + diffX, plotStartingPoint.y + diffY);
        }));
    }

    private onDotPlotMouseMove(e: FederatedPointerEvent) {
        // Note: Due to the use of the Dragger in the pointer down handler, this will only
        // execute if the pointer isn't currently down.
        const localPoint = this._dotPlotContainer.toLocal(e.global);
        const plotSize = this.calcPlotSize(this._content.width, this._content.height).size;
        const blockLength = this.calcDotPlotOffsetSize(plotSize);
        const x: number = (localPoint.x - this._dotPlot.x) / blockLength;
        let y: number = (localPoint.y - this._dotPlot.y) / blockLength;
        if (y === 0 || Number.isNaN(y)) {
            y = 1;
        }

        const msg = `${String.fromCharCode(65 + x)},${(Math.floor(y) * 10) + 1}`
                + ` - (${Math.floor(x * 10) + 1}, ${Math.floor(y * 10) + 1})`;
        if (this._coordBalloon != null) {
            this._coordBalloon.setText(msg);
            this._coordBalloon.display.visible = true;
        } else {
            this._coordBalloon = new TextBalloon(msg, 0x0, 0.8);
            this.addObject(this._coordBalloon, this._window.content);
        }
        this._coordBalloon.display.position = this._coordBalloon.display.parent.toLocal(e.global);
    }

    private redrawDotPlot(size: number, scale: number) {
        const scaledSize = size * scale;
        this._dotPlot.setSize(scaledSize, scaledSize);
        this._dotPlotMask.clear().beginFill(0).drawRect(0, 0, size + 1, size + 1).endFill();
        this._dotPlot.replot();
    }

    private repositionDotPlot(x: number, y: number) {
        const vStacked = this._meltPlotContainer.y > this._dotPlotContainer.y;
        const dotPlotVLabelWidth = Math.max(...this._dotVLabels.map((label) => label.width));
        const plotWidth = this._dotPlotMask.width;
        const plotHeight = this._dotPlotMask.height;

        const clampedX = MathUtil.clamp(x, plotWidth - this._dotPlot.width, 0);
        const clampedY = MathUtil.clamp(y, plotHeight - this._dotPlot.height, 0);
        this._dotPlot.x = clampedX;
        this._dotPlot.y = clampedY;

        const h0DefaultX = vStacked ? 0 : dotPlotVLabelWidth;
        // TODO: Make this not a magic number
        const h0DefaultY = 25;

        const h0XStart = h0DefaultX + clampedX;
        const h0YStart = h0DefaultY;

        this._dotHLabel0.position.set(h0XStart, h0YStart);
        this._dotHLabel0.visible = !(h0XStart < h0DefaultX);

        for (let ii = 0; ii < this._dotHLabels.length; ++ii) {
            const pos = this.calculateCoordPosition(this._dotHLabel0, ii, 'horizontal', plotWidth);
            this._dotHLabels[ii].position.copyFrom(pos);
            this._dotHLabels[ii].visible = !(
                pos.x >= plotWidth + h0DefaultX - this._dotHLabels[ii].width
                || pos.x < h0DefaultX
            );
        }

        const v0DefaultX = vStacked ? -this._dotVLabel0.width : dotPlotVLabelWidth - this._dotVLabel0.width;
        // TODO: Make this not a magic number
        const v0DefaultY = 40;

        const v0XStart = v0DefaultX;
        const v0YStart = v0DefaultY + clampedY;

        this._dotVLabel0.position.set(v0XStart, v0YStart);

        this._dotVLabel0.visible = !(v0YStart < v0DefaultY);

        for (let ii = 0; ii < this._dotVLabels.length; ++ii) {
            const pos = this.calculateCoordPosition(this._dotVLabel0, ii, 'vertical', plotHeight);
            pos.set(pos.x - this._dotVLabels[ii].width, pos.y);
            this._dotVLabels[ii].position.copyFrom(pos);
            this._dotVLabels[ii].visible = !(
                pos.y >= plotHeight + v0DefaultY - this._dotVLabels[ii].height
                || pos.y < v0DefaultY
            );
        }
    }

    private calcPlotSize(width: number, height: number) {
        const dotPlotVLabelWidth = Math.max(...this._dotVLabels.map((label) => label.width));
        const meltLabelWidth = this._meltVLabelN.width;
        // TODO: Sync the margin values here with the ones actually used in layout()
        const dotExtraHeight = this._dotPlotTitle.height
            + 10 + this._dotHLabel0.height
            + 5 + this._zoomContainer.height;
        if (width < height) {
            const meltExtraHeight = 5 + this._meltPlotTitle.height + 10 + this._meltHLabel0.height;
            return {
                vAligned: true,
                size: Math.min(
                    width - Math.max(dotPlotVLabelWidth, meltLabelWidth),
                    (height - this._notPlotHeight - dotExtraHeight - meltExtraHeight) / 2
                )
            };
        } else {
            return {
                vAligned: false,
                size: Math.min(
                    (width - dotPlotVLabelWidth - meltLabelWidth - SpecBoxDialog.PLOT_MARGIN) / 2,
                    height - this._notPlotHeight - dotExtraHeight
                )
            };
        }
    }

    private calcDotPlotOffsetSize(size: number): number {
        return (size / (this._dataBlock.sequence.length / 10)) * this._dotPlotScale;
    }

    // calculate it's origin and axis by from and to
    private calculateCoordPosition(from: Text, index: number, d: 'horizontal' | 'vertical', size: number): Point {
        const posFrom: Point = new Point();
        posFrom.copyFrom(from.position);
        const diff = this.calcDotPlotOffsetSize(size);
        if (d === 'horizontal') {
            return new Point(posFrom.x + diff * (index + 1), posFrom.y);
        } else {
            return new Point(posFrom.x + from.width, posFrom.y + diff * (index + 1));
        }
    }

    private _content: VLayoutContainer;
    private _plotContainer: Container;
    private _dotPlotContainer: Container;
    private _dotPlot: Plot;
    private _dotPlotMask: Graphics;
    private _meltPlot: Plot;
    private _meltPlotContainer: Container;
    private _statText: MultiStyleText;
    private _zoomContainer: HLayoutContainer;
    private _zoomInButton: GameButton;
    private _zoomOutButton: GameButton;

    private _notPlotHeight: number = 0;
    private _coordBalloon: TextBalloon;

    private _dotPlotTitle: Text;
    private _dotHLabel0: Text;
    private _dotVLabel0: Text;
    private _dotHLabels: Text[];
    private _dotVLabels: Text[];
    private _meltPlotTitle: Text;
    private _meltHLabel0: Text;
    private _meltHLabelN: Text;
    private _meltVLabel0: Text;
    private _meltVLabelN: Text;

    private _dotPlotScale: number = 1;
    private _dataBlock: UndoBlock;

    private static readonly DOT_PLOT_SCALE_STEP = 0.2;
    private static readonly OFFSET = 10;
    private static readonly PLOT_MARGIN = 10;
}

import {
    ContainerObject, Flashbang, MathUtil, MatrixUtil
} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import Bitmaps from 'eterna/resources/Bitmaps';
import {
    Graphics, Point, interaction, Matrix
} from 'pixi.js';
import Eterna from 'eterna/Eterna';
import Assert from 'flashbang/util/Assert';
import {FontWeight} from 'flashbang/util/TextBuilder';
import GameButton from './GameButton';
import UITheme from './UITheme';
import HTMLTextObject from './HTMLTextObject';

type InteractionEvent = PIXI.interaction.InteractionEvent;

interface MultiPagePanelProps {
    title: string;
    pages: Array<HTMLTextObject|ContainerObject>;
    width: number;
    height?: number;
    maxHeight?: number;
}

export default class MultiPagePanel extends ContainerObject {
    private static readonly theme = {
        title: {
            fontSize: 16,
            height: 35,
            padding: 7
        },
        borderRadius: 5,
        buttonSize: new Point(59, 24) // TODO find a better way to position the prev/next buttons!
    };

    private _props: MultiPagePanelProps;

    private _currentPage = 0;
    private _title: string;

    private _background: Graphics;
    private _contentWrapper: HTMLDivElement;
    private _pagesContainer: ContainerObject;
    private _titleText: PIXI.Text;
    private _prevButton: GameButton;
    private _nextButton: GameButton;
    private _panelHeight = 0;
    private _lastTransform = new Matrix();
    private _sizeChanged = true;

    private _pageMask: Graphics;
    private _dragging = false;
    private _dragPointData: interaction.InteractionData | null = null;
    private _dragStartPointY = 0;
    private _dragStartBoxY = 0;

    private get pageCount() { return this._pagesContainer.container.children.length; }
    private get title() {
        return this.pageCount > 1
            ? `${this._title} ${this._currentPage + 1} of ${this.pageCount}`
            : this._title;
    }

    constructor(props: MultiPagePanelProps) {
        super();
        this._props = props;
    }

    protected added() {
        super.added();

        const {theme} = MultiPagePanel;

        // Background - we need it on a lower layer so we're adding it here,
        // but we want to derive the height from the pages, so we need to wait
        // until those are added to actually draw
        this._background = new Graphics();
        this.container.addChild(this._background);
        this._pageMask = new Graphics();
        this.container.addChild(this._pageMask);

        const overlayEl = document.getElementById(Eterna.OVERLAY_DIV_ID);
        this._contentWrapper = document.createElement('div');
        this._contentWrapper.style.position = 'absolute';
        this._contentWrapper.style.pointerEvents = 'none';
        if (overlayEl) {
            overlayEl.appendChild(this._contentWrapper);
        }

        // Content
        this._pagesContainer = new ContainerObject();
        this._props.pages.forEach((page) => {
            if (page instanceof HTMLTextObject) {
                page.domParent = this._contentWrapper;
            }
            this._pagesContainer.addObject(page, this._pagesContainer.container);
        });
        this._pagesContainer.container.position = new Point(
            UITheme.panel.padding,
            UITheme.panel.padding + theme.title.height
        );
        this.addObject(this._pagesContainer, this.container);

        const getHeight = (page: HTMLTextObject | ContainerObject): number => {
            if (page instanceof HTMLTextObject) {
                return page.height;
            } else {
                return page.container.height;
            }
        };

        this._panelHeight = Math.min(this._props.maxHeight || Infinity,
            this._props.height || Math.max(...this._props.pages.map(getHeight))
            + theme.title.height + 2 * UITheme.panel.padding
            + (this.pageCount > 1 ? theme.buttonSize.y + UITheme.panel.padding : 0));

        // Now we draw the background
        this._background.lineStyle(UITheme.panel.borderSize, UITheme.colors.border, 1);
        this._background.beginFill(UITheme.colors.background, 1);
        this._background.drawRoundedRect(0, 0, this._props.width, this._panelHeight, theme.borderRadius);
        this._background.endFill();
        this._background.interactive = true;
        this._background.on('click', (e: InteractionEvent) => e.stopPropagation());

        this._pageMask.beginFill(0x00FF00);
        const maskBeginY = theme.title.height;
        this._pageMask.drawRect(0, maskBeginY, this._props.width, this._panelHeight - maskBeginY);
        this._pageMask.endFill();
        this._pagesContainer.display.mask = this._pageMask;
        this._pageMask.interactive = true;
        this._pageMask
            .on('pointerdown', this.maskPointerDown.bind(this))
            .on('pointerup', this.maskPointerUp.bind(this))
            .on('pointerupoutside', this.maskPointerUp.bind(this))
            .on('pointermove', this.maskPointerMove.bind(this));

        // Title
        this._title = this._props.title;
        this._background.beginFill(UITheme.colors.border);
        this._background.drawRoundedRect(
            0,
            0,
            this._props.width,
            theme.title.height,
            theme.borderRadius
        );
        this._background.endFill();
        this._titleText = Fonts.std()
            .fontWeight(FontWeight.SEMIBOLD)
            .fontSize(theme.title.fontSize)
            .color(UITheme.colors.background)
            .build();
        this._titleText.text = this.title;
        this._titleText.position = new Point(theme.title.padding, theme.title.padding);
        this.container.addChild(this._titleText);

        // Buttons
        this._prevButton = new GameButton()
            .up(Bitmaps.NovaPrev)
            .over(Bitmaps.NovaPrevOver)
            .down(Bitmaps.NovaPrevHit);

        this.addObject(this._prevButton, this.container);
        this._prevButton.display.position = new Point(
            UITheme.panel.padding,
            this._panelHeight - theme.buttonSize.y - UITheme.panel.padding
        );
        this.regs.add(this._prevButton.clicked.connect(() => {
            if (this._currentPage > 0) {
                this.setCurrentPage(this._currentPage - 1);
            }
        }));

        this._nextButton = new GameButton()
            .up(Bitmaps.NovaNext)
            .over(Bitmaps.NovaNextOver)
            .down(Bitmaps.NovaNextHit);
        this.addObject(this._nextButton, this.container);
        this._nextButton.display.position = new Point(
            this._prevButton.display.x + UITheme.panel.padding + theme.buttonSize.x,
            this._prevButton.display.y
        );
        this.regs.add(this._nextButton.clicked.connect(() => {
            if (this._currentPage < this.pageCount - 1) {
                this.setCurrentPage(this._currentPage + 1);
            }
        }));

        this.setCurrentPage(this._currentPage);

        Assert.assertIsDefined(this.mode);
        Assert.assertIsDefined(Flashbang.pixi);
        this.regs.add(this.mode.resized.connect(() => { this._sizeChanged = true; }));
        Flashbang.pixi.renderer.addListener('postrender', this.updateDOMMask, this);
    }

    protected dispose(): void {
        Assert.assertIsDefined(Flashbang.pixi);
        const overlayEl = document.getElementById(Eterna.OVERLAY_DIV_ID);
        if (overlayEl) {
            overlayEl.removeChild(this._contentWrapper);
        }
        Flashbang.pixi.renderer.removeListener('postrender', this.updateDOMMask, this);

        super.dispose();
    }

    protected updateDOMMask(): void {
        const m = this.display.worldTransform;
        if (this._sizeChanged || !MatrixUtil.equals(this._lastTransform, m)) {
            this._contentWrapper.style.width = `${Flashbang.stageWidth}px`;
            this._contentWrapper.style.height = `${Flashbang.stageHeight}px`;
            Assert.assertIsDefined(Flashbang.stageWidth);
            Assert.assertIsDefined(Flashbang.stageHeight);
            this._contentWrapper.style.clipPath = `inset(${m.ty + MultiPagePanel.theme.title.height}px ${Flashbang.stageWidth - (m.tx + this._props.width)}px ${Flashbang.stageHeight - (m.ty + this._panelHeight)}px ${m.tx}px)`;
            this._sizeChanged = false;
            // AMW: Used to be copy in prior PIXI. clone doesn't make sense (has
            // an arg); copyFrom doesn't make sense because m const.
            m.copyTo(this._lastTransform);
        }
    }

    private setCurrentPage(pageIndex: number) {
        if (pageIndex < 0 || pageIndex >= this.pageCount) {
            return;
        }

        this._pagesContainer.container.children[this._currentPage].visible = false;
        this._pagesContainer.container.children[pageIndex].visible = true;
        this._currentPage = pageIndex;

        this._titleText.text = this.title;

        this._prevButton.display.visible = this._currentPage > 0;
        this._nextButton.display.visible = this._currentPage < this.pageCount - 1;
    }

    private maskPointerDown(event: interaction.InteractionEvent) {
        this._dragging = true;
        this._dragPointData = event.data;
        this._dragStartBoxY = this._pagesContainer.display.y;
        this._dragStartPointY = event.data.getLocalPosition(this.container).y;
    }

    private maskPointerUp(event: interaction.InteractionEvent) {
        this._dragging = false;
        this._dragPointData = null;
        this._dragStartBoxY = 0;
        this._dragStartPointY = 0;
    }

    private maskPointerMove(event: interaction.InteractionEvent) {
        const {theme} = MultiPagePanel;
        const scrollHeight = this._panelHeight - (theme.title.height + theme.title.padding);
        const containerHeight = this._pagesContainer.display.height + theme.title.padding;
        if (this._dragging && containerHeight > scrollHeight) {
            Assert.assertIsDefined(this._dragPointData);
            const dragRange = this._dragPointData.getLocalPosition(this.container).y - this._dragStartPointY;
            this._pagesContainer.display.y = MathUtil.clamp(
                this._dragStartBoxY + dragRange,
                (theme.title.height + theme.title.padding) - (containerHeight - scrollHeight),
                theme.title.height + theme.title.padding
            );
        }
    }
}

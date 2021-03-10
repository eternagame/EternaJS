import {
    ContainerObject, Flashbang
} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import Bitmaps from 'eterna/resources/Bitmaps';
import {
    Graphics, Point
} from 'pixi.js';
import Assert from 'flashbang/util/Assert';
import {FontWeight} from 'flashbang/util/TextBuilder';
import GameButton from './GameButton';
import UITheme from './UITheme';
import HTMLTextObject from './HTMLTextObject';
import VScrollBox from './VScrollBox';

interface MultiPagePanelProps {
    title: string;
    pages: Array<HTMLTextObject|ContainerObject>;
    width: number;
    height?: number;
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
    private _pagesContainer: VScrollBox;
    private _titleText: PIXI.Text;
    private _prevButton: GameButton;
    private _nextButton: GameButton;
    private _panelHeight = 0;
    private _sizeChanged = true;

    private get pageCount() { return this._pagesContainer.content.children.length; }
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

        // Content
        this._pagesContainer = new VScrollBox(0, 0);
        this.addObject(this._pagesContainer, this.container);

        this._props.pages.forEach((page) => {
            if (page instanceof HTMLTextObject) {
                page.domParent = this._pagesContainer.htmlWrapper;
            }
            this._pagesContainer.addObject(page, this._pagesContainer.content);
        });

        this._titleText = Fonts.std()
            .fontWeight(FontWeight.SEMIBOLD)
            .fontSize(theme.title.fontSize)
            .color(UITheme.colors.background)
            .build();
        this._titleText.text = this.title;
        this.container.addChild(this._titleText);

        // Buttons
        this._prevButton = new GameButton()
            .up(Bitmaps.NovaPrev)
            .over(Bitmaps.NovaPrevOver)
            .down(Bitmaps.NovaPrevHit);

        this.addObject(this._prevButton, this.container);
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
        this.regs.add(this._nextButton.clicked.connect(() => {
            if (this._currentPage < this.pageCount - 1) {
                this.setCurrentPage(this._currentPage + 1);
            }
        }));

        this.setCurrentPage(this._currentPage);

        Assert.assertIsDefined(this.mode);
        Assert.assertIsDefined(Flashbang.pixi);
        this.regs.add(this.mode.resized.connect(() => this.doLayout()));
        Flashbang.pixi.renderer.addListener('postrender', this.updateDOMMask, this);
        this.doLayout();
    }

    private doLayout() {
        // We have to wait for postrender to fire in order for the HTML mask in _pagesContainer
        // to update correctly
        this._sizeChanged = true;

        const {theme} = MultiPagePanel;

        this._pagesContainer.container.position = new Point(
            UITheme.panel.padding,
            UITheme.panel.padding + theme.title.height
        );

        const getHeight = (page: HTMLTextObject | ContainerObject): number => {
            if (page instanceof HTMLTextObject) {
                return page.height;
            } else {
                return page.container.height;
            }
        };

        Assert.assertIsDefined(Flashbang.stageHeight);
        this._panelHeight = Math.min(Flashbang.stageHeight * 0.8 || Infinity,
            this._props.height || Math.max(...this._props.pages.map(getHeight))
            + theme.title.height + 2 * UITheme.panel.padding
            + (this.pageCount > 1 ? theme.buttonSize.y + UITheme.panel.padding : 0));

        // Now we draw the background
        this._background.clear();
        this._background.lineStyle(UITheme.panel.borderSize, UITheme.colors.border, 1);
        this._background.beginFill(UITheme.colors.background, 1);
        this._background.drawRoundedRect(0, 0, this._props.width, this._panelHeight, theme.borderRadius);
        this._background.endFill();

        this._pagesContainer.setSize(
            this._props.width - UITheme.panel.padding * 2,
            this._panelHeight - theme.title.height - UITheme.panel.padding * 2
        );

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

        this._titleText.text = this.title;
        this._titleText.position = new Point(theme.title.padding, theme.title.padding);

        this._prevButton.display.position = new Point(
            UITheme.panel.padding,
            this._panelHeight - theme.buttonSize.y - UITheme.panel.padding
        );

        this._nextButton.display.position = new Point(
            this._prevButton.display.x + UITheme.panel.padding + theme.buttonSize.x,
            this._prevButton.display.y
        );
    }

    private updateDOMMask() {
        if (this._sizeChanged) {
            this._pagesContainer.doLayout();
            this._sizeChanged = false;
        }
    }

    private setCurrentPage(pageIndex: number) {
        if (pageIndex < 0 || pageIndex >= this.pageCount) {
            return;
        }

        this._pagesContainer.content.children[this._currentPage].visible = false;
        this._pagesContainer.content.children[pageIndex].visible = true;
        this._currentPage = pageIndex;

        this._titleText.text = this.title;

        this._prevButton.display.visible = this._currentPage > 0;
        this._nextButton.display.visible = this._currentPage < this.pageCount - 1;
        this.doLayout();
    }
}

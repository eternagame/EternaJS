import {
    ContainerObject, Flashbang
} from 'flashbang';
import Bitmaps from 'eterna/resources/Bitmaps';
import {
    Point
} from 'pixi.js';
import Assert from 'flashbang/util/Assert';
import GameButton from './GameButton';
import UITheme from './UITheme';
import HTMLTextObject from './HTMLTextObject';
import ScrollBox from './ScrollBox';
import GamePanel from './GamePanel';

interface MultiPagePanelProps {
    title: string;
    pages: Array<HTMLTextObject|ContainerObject>;
    width: number;
    height?: number;
}

export default class MultiPagePanel extends ContainerObject {
    private static readonly theme = {
        borderRadius: 5,
        buttonSize: new Point(59, 24) // TODO find a better way to position the prev/next buttons!
    };

    private _props: MultiPagePanelProps;

    private _currentPage = 0;

    private _panel: GamePanel;
    private _pagesContainer: ScrollBox;
    private _prevButton: GameButton;
    private _nextButton: GameButton;
    private _panelHeight = 0;
    private _sizeChanged = true;

    private get pageCount() { return this._pagesContainer.content.children.length; }
    private get title() {
        return this.pageCount > 1
            ? `${this._props.title} ${this._currentPage + 1} of ${this.pageCount}`
            : this._props.title;
    }

    constructor(props: MultiPagePanelProps) {
        super();
        this._props = props;
    }

    protected added() {
        super.added();

        // Background - we need it on a lower layer so we're adding it here,
        // but we want to derive the height from the pages, so we need to wait
        // until those are added to actually draw
        this._panel = new GamePanel({});
        this.addObject(this._panel, this.container);

        // Content
        this._pagesContainer = new ScrollBox(0, 0, undefined, -10, 0);
        this.addObject(this._pagesContainer, this.container);

        this._props.pages.forEach((page) => {
            if (page instanceof HTMLTextObject) {
                page.domParent = this._pagesContainer.htmlWrapper;
            }
            this._pagesContainer.addObject(page, this._pagesContainer.content);
        });

        // Buttons
        this._prevButton = new GameButton()
            .up(Bitmaps.NovaPrev)
            .over(Bitmaps.NovaPrevOver)
            .down(Bitmaps.NovaPrevHit);
        this.addObject(this._prevButton, this.container);
        this._prevButton.display.width = 60;
        this._prevButton.display.height = 25;
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
        this._nextButton.display.width = 60;
        this._nextButton.display.height = 25;
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

        this._pagesContainer.container.position.set(
            UITheme.panel.padding,
            UITheme.panel.padding + this._panel.titleHeight
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
            + this._panel.titleHeight + 2 * UITheme.panel.padding
            + (this.pageCount > 1 ? theme.buttonSize.y + UITheme.panel.padding : 0));

        this._panel.setSize(this._props.width, this._panelHeight);

        this._pagesContainer.setSize(
            this._props.width - UITheme.panel.padding * 2,
            this._panelHeight - this._panel.titleHeight - UITheme.panel.padding * 2
        );

        this._prevButton.display.position.set(
            UITheme.panel.padding,
            this._panelHeight - theme.buttonSize.y - UITheme.panel.padding
        );

        this._nextButton.display.position.set(
            this._prevButton.display.x + UITheme.panel.padding + theme.buttonSize.x,
            this._prevButton.display.y
        );
    }

    private updateDOMMask() {
        if (this._sizeChanged) {
            this._pagesContainer.doLayout();
            this._sizeChanged = false;
            // DOM elements are weird. We need to wait a frame for the mask to actually
            // kick in and the DOM to properly rerender in order for the height to not read as zero,
            // which causes the scroll bar not to appear initially. There's probably a less hacky
            // way to do this (and maybe even some other underlying cause)...
            setTimeout(() => this._pagesContainer.updateScrollThumbs(), 20);
        }
    }

    private setCurrentPage(pageIndex: number) {
        if (pageIndex < 0 || pageIndex >= this.pageCount) {
            return;
        }

        this._pagesContainer.content.children[this._currentPage].visible = false;
        this._pagesContainer.content.children[pageIndex].visible = true;
        this._currentPage = pageIndex;

        this._panel.title = this.title;

        this._prevButton.display.visible = this._currentPage > 0;
        this._nextButton.display.visible = this._currentPage < this.pageCount - 1;
        this.doLayout();
    }
}

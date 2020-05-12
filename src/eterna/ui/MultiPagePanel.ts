
import {
    ContainerObject
} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import Bitmaps from 'eterna/resources/Bitmaps';
import {Graphics, Point} from 'pixi.js';
import GameButton from './GameButton';
import UITheme from './UITheme';
import HTMLTextObject from './HTMLTextObject';

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
    private _pagesContainer: ContainerObject;
    private _titleText: PIXI.Text;
    private _prevButton: GameButton;
    private _nextButton: GameButton;

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

        // Content
        this._pagesContainer = new ContainerObject();
        this._props.pages.forEach((page) => {
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

        const panelHeight = this._props.height || Math.max(...this._props.pages.map(getHeight))
            + theme.title.height + 2 * UITheme.panel.padding
            + (this.pageCount > 1 ? theme.buttonSize.y + UITheme.panel.padding : 0);

        // Now we draw the background
        this._background.lineStyle(UITheme.panel.borderSize, UITheme.colors.border, 1);
        this._background.beginFill(UITheme.colors.background, 1);
        this._background.drawRoundedRect(0, 0, this._props.width, panelHeight, theme.borderRadius);
        this._background.endFill();
        this._background.interactive = true;
        this._background.on('click', (e) => e.stopPropagation());

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
        this._titleText = Fonts.stdMedium()
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
            panelHeight - theme.buttonSize.y - UITheme.panel.padding
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
}

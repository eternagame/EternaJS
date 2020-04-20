
import {
    ContainerObject
} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import Bitmaps from 'eterna/resources/Bitmaps';
import {Graphics, Point} from 'pixi.js';
import GameButton from './GameButton';
import UITheme from './UITheme';

interface MultiPagePanelProps {
    title: string;
    pages: ContainerObject[];
    width: number;
    height: number;
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

        const {theme} = MultiPagePanel;

        // Background
        this._background = new Graphics();
        this._background.lineStyle(UITheme.panel.borderSize, UITheme.colors.border, 1);
        this._background.beginFill(UITheme.colors.background, 1);
        this._background.drawRoundedRect(0, 0, props.width, props.height, theme.borderRadius);
        this._background.endFill();
        this.container.addChild(this._background);

        // Content
        this._pagesContainer = new ContainerObject();
        props.pages.forEach((page) => {
            this._pagesContainer.addObject(page, this._pagesContainer.container);
        });
        this._pagesContainer.container.position = new Point(
            UITheme.panel.padding,
            UITheme.panel.padding + theme.title.height
        );
        this.addObject(this._pagesContainer, this.container);

        // Title
        this._title = props.title;
        this._background.beginFill(UITheme.colors.border);
        this._background.drawRoundedRect(
            0,
            0,
            props.width,
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
            props.height - theme.buttonSize.y - UITheme.panel.padding
        );
        this._prevButton.clicked.connect(() => {
            if (this._currentPage > 0) {
                this.setCurrentPage(this._currentPage - 1);
            }
        });

        this._nextButton = new GameButton()
            .up(Bitmaps.NovaNext)
            .over(Bitmaps.NovaNextOver)
            .down(Bitmaps.NovaNextHit);
        this.addObject(this._nextButton, this.container);
        this._nextButton.display.position = new Point(
            this._prevButton.display.x + UITheme.panel.padding + theme.buttonSize.x,
            this._prevButton.display.y
        );
        this._nextButton.clicked.connect(() => {
            if (this._currentPage < this.pageCount - 1) {
                this.setCurrentPage(this._currentPage + 1);
            }
        });

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

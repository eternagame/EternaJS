
import {
    ContainerObject, DisplayUtil, VAlign, HAlign, StyledTextBuilder
} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import Bitmaps from 'eterna/resources/Bitmaps';
import {Graphics, Point, Container} from 'pixi.js';
import TextUtil from 'eterna/util/TextUtil';
import UITheme from './UITheme';
import GameButton from './GameButton';

interface MultiPagePanelProps {
    title: string;
    pages: string[];
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
        content: {
            fontSize: 14,
            padding: 10
        },
        borderRadius: 5
    };

    private _currentPage = 0;
    private _title: string;

    private _background: Graphics;
    private _pagesContainer: Container;
    private _titleText: PIXI.Text;
    private _prevButton: GameButton;
    private _nextButton: GameButton;

    private get pageCount() { return this._pagesContainer.children.length; }
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
        this._background.lineStyle(1.5, UITheme.colors.border, 1);
        this._background.beginFill(UITheme.colors.background, 1);
        this._background.drawRoundedRect(0, 0, props.width, props.height, theme.borderRadius);
        this._background.endFill();
        this.container.addChild(this._background);

        // Content
        this._pagesContainer = new PIXI.Container();
        this._pagesContainer.position = new Point(theme.content.padding, theme.content.padding + theme.title.height);
        props.pages.forEach((pageText, pageIndex) => {
            const textElem = new StyledTextBuilder({
                fontFamily: Fonts.ARIAL,
                fontSize: theme.content.fontSize,
                fill: 0xffffff,
                wordWrap: true,
                wordWrapWidth: props.width - 2 * theme.content.padding
            })
                .appendHTMLStyledText(TextUtil.processTags(pageText))
                .build();

            this._pagesContainer.addChild(textElem);
            textElem.visible = pageIndex === this._currentPage;
        });
        this.container.addChild(this._pagesContainer);

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
        DisplayUtil.positionRelative(
            this._prevButton.display, HAlign.LEFT, VAlign.BOTTOM,
            this.container, HAlign.LEFT, VAlign.BOTTOM,
            theme.content.padding, -theme.content.padding
        );
        this.addObject(this._prevButton, this.container);
        this._prevButton.clicked.connect(() => {
            if (this._currentPage > 0) {
                this.setCurrentPage(this._currentPage - 1);
            }
        });

        this._nextButton = new GameButton()
            .up(Bitmaps.NovaNext)
            .over(Bitmaps.NovaNextOver)
            .down(Bitmaps.NovaNextHit);
        DisplayUtil.positionRelative(
            this._nextButton.display, HAlign.CENTER, VAlign.BOTTOM,
            this.container, HAlign.CENTER, VAlign.BOTTOM,
            0,
            -theme.content.padding
        );
        this.addObject(this._nextButton, this.container);
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

        this._pagesContainer.children[this._currentPage].visible = false;
        this._pagesContainer.children[pageIndex].visible = true;
        this._currentPage = pageIndex;

        this._titleText.text = this.title;

        this._prevButton.display.visible = this._currentPage > 0;
        this._nextButton.display.visible = this._currentPage < this.pageCount - 1;
    }
}

import MultiStyleText from 'pixi-multistyle-text';
import {Point, Text} from 'pixi.js';
import {StyledTextBuilder, DisplayUtil, ContainerObject} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import GameButton from './GameButton';
import GamePanel, {GamePanelType} from './GamePanel';
import {FontWeight} from '../../flashbang/util/TextBuilder';

export default class TextBalloon extends ContainerObject {
    constructor(
        text: string = '',
        balloonColor: number = 0xFFFFFF,
        balloonAlpha: number = 0.07,
        borderColor: number = 0,
        borderAlpha: number = 0,
        width: number | null = null,
        height: number | null = null,
        borderRadius: number | undefined = undefined,
        textOffset: number = 0,
        textColor: number = TextBalloon.DEFAULT_FONT_COLOR,
        textWeight: string = FontWeight.REGULAR
    ) {
        super();

        this._textOffset = textOffset;
        this._panel = new GamePanel({
            type: GamePanelType.NORMAL,
            alpha: balloonAlpha,
            color: balloonColor,
            borderAlpha,
            borderColor,
            borderRadius
        });
        if (width && height) {
            this._width = width;
            this._height = height;
            this._panel.setSize(width, height);
        }
        this.addObject(this._panel, this.container);

        this._button = new GameButton().label('Next', 12);
        this.addObject(this._button, this.container);
        this._button.display.visible = false;

        if (text != null && text.length > 0) {
            this.setText(text, TextBalloon.DEFAULT_FONT_SIZE, textColor, textWeight);
        }
    }

    protected added(): void {
        super.added();

        if (this._initialText != null) {
            this.styledText = this._initialText;
        }

        this.updateView();
    }

    public get text(): Text {
        return this._text;
    }

    public set centered(center: boolean) {
        this._centered = center;
        this.updateView();
    }

    public set title(title: string) {
        this._panel.title = title;
        this._hasTitle = title != null;
    }

    public set styledText(builder: StyledTextBuilder) {
        if (this.isLiveObject) {
            if (this._text != null) {
                this._text.destroy({children: true});
            }

            this._text = builder.build();
            this.container.addChildAt(this._text, 1);
            this.updateView();
        } else {
            this._initialText = builder;
        }
    }

    public setText(
        text: string,
        fontsize: number = 15,
        fontColor: number = TextBalloon.DEFAULT_FONT_COLOR,
        fontWeight: string = FontWeight.REGULAR
    ): void {
        this.styledText = new StyledTextBuilder({
            fontFamily: Fonts.STDFONT,
            fontSize: fontsize,
            fill: fontColor,
            fontWeight
        }).append(text);
    }

    public setBalloonColor(color: number = 0xFFFFFF): void {
        this._panel.color = color;
    }

    public showButton(show: boolean): GameButton {
        if (show !== this._button.display.visible) {
            this._button.display.visible = show;
            this.updateView();
        }
        return this._button;
    }

    public get width(): number {
        let wholeWidth: number = this._text != null ? this._text.width : 0;
        if (this._button != null && this._button.display.visible) {
            wholeWidth += TextBalloon.W_MARGIN;
            wholeWidth += DisplayUtil.width(this._button.display);
        }

        return wholeWidth + 2 * TextBalloon.W_MARGIN;
    }

    public get height(): number {
        let wholeHeight = this._text != null ? this._text.height : 0;

        if (this._button != null && this._button.display.visible) {
            wholeHeight = Math.max(wholeHeight, DisplayUtil.height(this._button.display));
        }

        return wholeHeight + 2 * TextBalloon.H_MARGIN + this._panel.titleHeight;
    }

    protected updateView(): void {
        if (!this.isLiveObject) {
            return;
        }

        let {width} = this;
        let {height} = this;
        if (this._width) {
            width = this._width;
        }
        if (this._height) {
            height = this._height;
        }
        this._panel.setSize(width, height);

        const wholeWidth: number = width - 2 * TextBalloon.W_MARGIN;
        const titleSpace: number = this._panel.titleHeight;

        if (!this._centered) {
            if (this._text != null) {
                this._text.position = new Point(
                    TextBalloon.W_MARGIN + this._textOffset,
                    TextBalloon.H_MARGIN + titleSpace
                );
            }

            if (this._button.display.visible) {
                this._button.display.position = new Point(
                    TextBalloon.W_MARGIN + this._text.width + TextBalloon.W_MARGIN,
                    TextBalloon.H_MARGIN + titleSpace + this._text.height - DisplayUtil.height(this._button.display)
                );
            }

            this._panel.display.position = new Point(0, 0);
        } else {
            if (this._text != null) {
                this._text.position = new Point(-wholeWidth / 2, TextBalloon.H_MARGIN + titleSpace);
            }

            if (this._button.display.visible) {
                this._button.display.position = new Point(
                    -wholeWidth / 2 + this._text.width + TextBalloon.W_MARGIN,
                    TextBalloon.H_MARGIN + titleSpace + this._text.height - DisplayUtil.height(this._button.display)
                );
            }

            this._panel.display.position = new Point(-wholeWidth / 2, 0);
        }
    }

    protected _initialText: StyledTextBuilder;

    protected _button: GameButton;

    private _panel: GamePanel;
    protected _text: MultiStyleText;
    protected _centered: boolean = false;
    protected _hasTitle: boolean = false;

    private _width: number | null;
    private _height: number | null;

    private _textOffset: number = 0;

    protected static readonly W_MARGIN = 10;
    protected static readonly H_MARGIN = 10;
    public static readonly DEFAULT_FONT_SIZE = 15;
    public static readonly DEFAULT_FONT_COLOR = 0xC0DCE7;
}

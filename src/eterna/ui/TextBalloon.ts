import MultiStyleText from "pixi-multistyle-text";
import {Point, Text} from "pixi.js";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {DisplayUtil} from "../../flashbang/util/DisplayUtil";
import {StyledTextBuilder} from "../../flashbang/util/StyledTextBuilder";
import {Fonts} from "../util/Fonts";
import {BaseGamePanel} from "./BaseGamePanel";
import {GameButton} from "./GameButton";
import {GamePanel, GamePanelType} from "./GamePanel";

export class TextBalloon extends ContainerObject {
    public constructor(text: string = "", balloonColor: number = 0xFFFFFF, balloonAlpha: number = 0.07, borderColor: number = 0, borderAlpha: number = 0) {
        super();

        this._panel = new GamePanel(GamePanelType.NORMAL, balloonAlpha, balloonColor, borderAlpha, borderColor);
        this.addObject(this._panel, this.container);

        this._button = new GameButton().label("Next", 12);
        this.addObject(this._button, this.container);
        this._button.display.visible = false;

        if (text != null && text.length > 0) {
            this.set_text(text);
        }
    }

    protected added(): void {
        super.added();

        if (this._initialText != null) {
            this.set_styled_text(this._initialText);
        }

        this.updateView();
    }

    public get_game_text(): Text {
        return this._text;
    }

    public set_centered(center: boolean): void {
        this._centered = center;
        this.updateView();
    }

    public set_title(title: string): void {
        this._panel.set_panel_title(title);
        this._hasTitle = title != null;
    }

    public set_styled_text(builder: StyledTextBuilder): void {
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

    public set_text(text: string, fontsize: number = 15, font_color: number = 0xC0DCE7): void {
        let styled = new StyledTextBuilder({
            fontFamily: Fonts.ARIAL,
            fontSize: fontsize,
            fill: font_color
        }).append(text);

        this.set_styled_text(styled);
    }

    public showButton(show: boolean): GameButton {
        if (show !== this._button.display.visible) {
            this._button.display.visible = show;
            this.updateView();
        }
        return this._button;
    }

    public balloon_width(): number {
        let whole_width: number = this._text != null ? this._text.width : 0;
        if (this._button != null && this._button.display.visible) {
            whole_width += TextBalloon.W_MARGIN;
            whole_width += DisplayUtil.width(this._button.display);
        }

        return whole_width + 2 * TextBalloon.W_MARGIN;
    }

    public balloon_height(): number {
        let whole_height: number = 0;
        whole_height += this._text != null ? this._text.height : 0;

        if (this._button != null && this._button.display.visible) {
            whole_height = Math.max(whole_height, DisplayUtil.height(this._button.display));
        }

        return whole_height + 2 * TextBalloon.H_MARGIN + this._panel.get_title_space();
    }

    protected updateView(): void {
        if (!this.isLiveObject) {
            return;
        }

        let balloon_width = this.balloon_width();
        let balloon_height = this.balloon_height();
        this._panel.setSize(balloon_width, balloon_height);

        let whole_width: number = balloon_width - 2 * TextBalloon.W_MARGIN;
        let title_space: number = this._panel.get_title_space();

        if (!this._centered) {
            if (this._text != null) {
                this._text.position = new Point(TextBalloon.W_MARGIN, TextBalloon.H_MARGIN + title_space);
            }

            if (this._button.display.visible) {
                this._button.display.position = new Point(
                    TextBalloon.W_MARGIN + this._text.width + TextBalloon.W_MARGIN,
                    TextBalloon.H_MARGIN + title_space + this._text.height - DisplayUtil.height(this._button.display)
                );
            }

            this._panel.display.position = new Point(0, 0);
        } else {
            if (this._text != null) {
                this._text.position = new Point(-whole_width / 2, TextBalloon.H_MARGIN + title_space);
            }

            if (this._button.display.visible) {
                this._button.display.position = new Point(
                    -whole_width / 2 + this._text.width + TextBalloon.W_MARGIN,
                    TextBalloon.H_MARGIN + title_space + this._text.height - DisplayUtil.height(this._button.display)
                );
            }

            this._panel.display.position = new Point(-whole_width / 2, 0);
        }
    }

    protected _initialText: StyledTextBuilder;

    protected _button: GameButton;

    protected _panel: BaseGamePanel;
    protected _text: MultiStyleText;
    protected _centered: boolean = false;
    protected _hasTitle: boolean = false;

    protected static readonly W_MARGIN: number = 10;
    protected static readonly H_MARGIN: number = 10;
}

import {Point, Text} from "pixi.js";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {DisplayUtil} from "../../flashbang/util/DisplayUtil";
import {Fonts} from "../util/Fonts";
import {GameButton} from "./GameButton";
import {GamePanel} from "./GamePanel";

export class TextBalloon extends ContainerObject {
    public constructor(text: string = "", balloon_color: number = 0xFFFFFF, balloon_alpha: number = 0.07, border_color: number = 0, border_alpha: number = 0.0) {
        super();

        this._panel = new GamePanel(0, balloon_alpha, balloon_color, border_alpha, border_color);
        this.addObject(this._panel, this.container);

        this._text = Fonts.arial("", 15).bold().build();

        this._centered = false;
        this._hasTitle = false;
        this.container.addChild(this._text);

        this._button = new GameButton().text("Next", 12);
        this.addObject(this._button, this.container);
        this._button.display.visible = false;

        if (text != null && text.length > 0) {
            this.set_text(text);
        }
    }

    protected added(): void {
        super.added();
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

    public set_text(text: string, fontsize: number = 15, font_color: number = 0xC0DCE7): void {
        this._text.text = text;
        this._text.style = Fonts.arial("", fontsize).color(font_color).style;
        this.updateView();
    }

    public showButton(): GameButton {
        if (!this._button.display.visible) {
            this._button.display.visible = true;
            this.updateView();
        }
        return this._button;
    }

    public balloon_width(): number {
        let whole_width: number = this._text.width;
        if (this._button.display.visible) {
            whole_width += TextBalloon.W_MARGIN;
            whole_width += DisplayUtil.width(this._button.display);
        }

        return whole_width + 2 * TextBalloon.W_MARGIN;
    }

    public balloon_height(): number {
        let whole_height: number = 0;
        whole_height += this._text.height;

        if (this._button.display.visible) {
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
        this._panel.set_size(balloon_width, balloon_height);

        let whole_width: number = balloon_width - 2 * TextBalloon.W_MARGIN;
        let title_space: number = this._panel.get_title_space();

        if (!this._centered) {
            this._text.position = new Point(TextBalloon.W_MARGIN, TextBalloon.H_MARGIN + title_space);
            if (this._button.display.visible) {
                this._button.display.position = new Point(
                    TextBalloon.W_MARGIN + this._text.width + TextBalloon.W_MARGIN,
                    TextBalloon.H_MARGIN + title_space + this._text.height - DisplayUtil.height(this._button.display));
            }

            this._panel.display.position = new Point(0, 0);

        } else {
            this._text.position = new Point(-whole_width / 2, TextBalloon.H_MARGIN + title_space);
            if (this._button.display.visible) {
                this._button.display.position = new Point(
                    -whole_width / 2 + this._text.width + TextBalloon.W_MARGIN,
                    TextBalloon.H_MARGIN + title_space + this._text.height - DisplayUtil.height(this._button.display));
            }

            this._panel.display.position = new Point(-whole_width / 2, 0);
        }
    }

    protected _button: GameButton;
    protected _height: number = 0;

    protected _panel: GamePanel;
    protected _text: Text;
    protected _centered: boolean;
    protected _hasTitle: boolean;

    protected static readonly W_MARGIN: number = 10;
    protected static readonly H_MARGIN: number = 10;

}

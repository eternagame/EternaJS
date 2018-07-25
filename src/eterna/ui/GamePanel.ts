import {Graphics, Point, Text} from "pixi.js";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {Fonts} from "../util/Fonts";

export enum GamePanelType {
    NORMAL, INVISIBLE
}

export class GamePanel extends ContainerObject {
    public constructor(panel_type: GamePanelType = GamePanelType.NORMAL, alpha_val: number = 0.07, color: number = 0xffffff, border_alpha: number = 0.0, border_color: number = 0) {
        super();

        this._background = new Graphics();
        this.container.addChild(this._background);

        this.setup(panel_type, alpha_val, color, border_alpha, border_color);
    }

    public setup(panel_type: GamePanelType, alpha_val: number, color: number, border_alpha: number, border_color: number): void {
        this._panel_type = panel_type;
        this._alpha = alpha_val;
        this._color = color;
        this._border_alpha = border_alpha;
        this._border_color = border_color;
        this.updateView();
    }

    public set_size(width: number, height: number): void {
        this._width = width;
        this._height = height;
        this.updateView();
    }

    public set_panel_title(title: string): void {
        this._title = title;
        this.updateView();
    }

    public get_title_space(): number {
        return this._title == null ? 0 : 35;
    }

    public get_panel_width(): number {
        return this._width;
    }

    public get_panel_height(): number {
        return this._height;
    }

    protected updateView(): void {
        this._background.clear();

        if (this._width <= 0 || this._height <= 0) {
            return;
        }

        if (this._panel_type == GamePanelType.INVISIBLE) {
            this._background.beginFill(0x000000, 0);
            this._background.drawRect(0, 0, this._width, this._height);
            this._background.endFill();

        } else {
            this._background.lineStyle(2, this._border_color, this._border_alpha);
            this._background.beginFill(this._color, this._alpha);
            this._background.drawRoundedRect(0, 0, this._width, this._height, 5);
            this._background.endFill();

            if (this._title != null) {
                if (this._title_text == null) {
                    this._title_text = Fonts.std_medium().fontSize(16).color(0xffffff).build();
                    this._title_text.position = new Point(7, 6);
                    this.container.addChild(this._title_text);
                }

                this._title_text.text = this._title;
                this._background.lineStyle(2, 0xC0DCE7, 0.27); // 0xFEC942);
                this._background.moveTo(0, 35);
                this._background.lineTo(this._width, 35);
            }
        }
    }

    protected readonly _background: Graphics;

    protected _panel_type: GamePanelType;

    protected _alpha: number = 0;
    protected _color: number = 0;
    protected _border_alpha: number = 0;
    protected _border_color: number = 0;
    protected _title: string = null;
    protected _title_text: Text = null;

    protected _width: number = 0;
    protected _height: number = 0;
}


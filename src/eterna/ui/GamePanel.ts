import {Point, Text} from "pixi.js";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {Fonts} from "../util/Fonts";
import {UDim} from "../util/UDim";
import Graphics = PIXI.Graphics;

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

    public setup(panel_type: number, alpha_val: number, color: number, border_alpha: number, border_color: number): void {
        this._panel_type = panel_type;
        this._alpha = alpha_val;
        this._color = color;
        this._border_alpha = border_alpha;
        this._border_color = border_color;
        this.on_resize();
    }

    public set_size(width: number, height: number): void {
        this._width = width;
        this._height = height;
        this.on_resize();
    }

    public set_panel_title(title: string): void {
        this._title = title;
        this.on_resize();
    }

    public set_auto_collapse(enabled: boolean, normal: UDim = null, hidden: UDim = null): void {
        this._auto_collapse = enabled;
        this._normal_pos = normal;
        this._hidden_pos = hidden;

        // if (this._auto_collapse) {
        //     this.display.interactive = true;
        //     this.addEventListener(MouseEvent.MOUSE_OVER, this.panel_mouse_over);
        //     this.addEventListener(MouseEvent.MOUSE_OUT, this.panel_mouse_out);
        //     this._is_mouse_over = true;
        //     this.panel_mouse_out(null);
        // } else {
        //     if (this._normal_pos) {
        //         this.remove_all_animators();
        //         this.set_pos(this._normal_pos);
        //     }
        //     this.removeEventListener(MouseEvent.MOUSE_OVER, this.panel_mouse_over);
        //     this.removeEventListener(MouseEvent.MOUSE_OUT, this.panel_mouse_out);
        //     this.display.interactive = false;
        // }
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

    /*override*/
    private on_resize(): void {
        this._background.clear();

        if (this._width <= 0 || this._height <= 0) {
            return;
        }

        if (this._panel_type == GamePanelType.INVISIBLE) {
            this._background.beginFill(0x000000, 0);
            this._background.drawRect(0, 0, this._width, this._height);
            this._background.endFill();
            return;
        }

        this._background.lineStyle(1, this._border_color, this._border_alpha);
        this._background.beginFill(this._color, this._alpha);
        this._background.drawRoundedRect(0, 0, this._width, this._height, 5);
        this._background.endFill();

        if (this._title != null) {
            if (this._title_text == null) {
                this._title_text = Fonts.std_medium().fontSize(16).build();
                this._title_text.position = new Point(7, 6);
                this.container.addChild(this._title_text);
            }

            this._title_text.text = this._title;
            this._background.lineStyle(2, 0xC0DCE7, 0.27); // 0xFEC942);
            this._background.moveTo(0, 35);
            this._background.lineTo(this._width, 35);
        }
    }

    // private panel_mouse_over(): void {
    //     if (!this._is_mouse_over) {
    //         this._is_mouse_over = true;
    //         this.remove_all_animators();
    //         if (this._normal_pos) this.set_animator(new GameAnimatorMover(this._normal_pos, 0.5, false));
    //     }
    // }
    //
    // private panel_mouse_out(): void {
    //     if (this._is_mouse_over) {
    //         this._is_mouse_over = false;
    //         this.remove_all_animators();
    //         if (this._hidden_pos) this.set_animator(new GameAnimatorMover(this._hidden_pos, 0.5, false));
    //     }
    // }

    private _panel_type: GamePanelType;
    private _background: Graphics;

    private _alpha: number = 0;
    private _color: number = 0;
    private _border_alpha: number = 0;
    private _border_color: number = 0;
    private _title: string = null;
    private _title_text: Text = null;
    private _auto_collapse: boolean;
    private _normal_pos: UDim;
    private _hidden_pos: UDim;

    private _width: number = 0;
    private _height :number = 0;
}


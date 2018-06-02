import {ImageButton} from "../../flashbang/objects/ImageButton";
import {Texture} from "pixi.js";

export class GameButton extends ImageButton {
    public constructor(idle_img: Texture = null, hover_img: Texture = null, mouse_down_img: Texture = null,
                       selected_img: Texture = null, disabled_img: Texture = null) {
        super([idle_img, hover_img, mouse_down_img, disabled_img]);
    }
}

// import {Graphics, Sprite, Text, Texture} from "pixi.js";
// import {SpriteObject} from "../../flashbang/objects/SpriteObject";
//
// export class GameButton extends SpriteObject {
//     constructor(fontsize: number = 22, img: Texture = null, sel_offset_x: number = 0, sel_offset_y: number = 0, play_sound: boolean = true) {
//         super();
//
//         // if (!GameButton._sound_initialized) {
//         //     GameButton._sound_initialized = true;
//         //     SoundManager.instance.add_sound_by_name(GameButton.GAMESOUND_BUTTON_CLICK, "SoundButtonClick");
//         // }
//
//         this._use_states = false;
//         this._style_box = new Graphics();
//         this.sprite.addChild(this._style_box);
//
//         this._soundname = GameButton.GAMESOUND_BUTTON_CLICK;
//         this._play_sound = play_sound;
//
//         this._w_margin = 4;
//         this._h_margin = 3;
//
//         if (img != null) {
//             this._w_margin = 0;
//             this._h_margin = 0;
//         }
//         this._has_text = false;
//
//         this._respond = false;
//         this._selected = false;
//         this._style = null;
//
//         this._is_disabled = false;
//
//         this._hotkey = -1;
//         this._hotkey_string = "";
//         this._tooltip_string = "";
//
//         this.add_object(this._text);
//
//         if (img != null) {
//             this._img = new Bitmap(img);
//             this.set_size(new UDim(0, 0, this._img.width, this._img.height));
//             this.addChild(this._img);
//         }
//         this._current_state = 0;
//         this.on_state_change();
//
//         this._sel_box = new Sprite;
//         this.addChild(this._sel_box);
//
//         this._select_offset_x = sel_offset_x;
//         this._select_offset_y = sel_offset_y;
//
//         this._use_response_animation = true;
//
//         this.addEventListener(MouseEvent.CLICK, this.on_click);
//         this.addEventListener(MouseEvent.MOUSE_OVER, this.on_hover);
//         this.addEventListener(MouseEvent.MOUSE_OUT, this.on_stop_hover);
//         this.addEventListener(MouseEvent.MOUSE_DOWN, this.on_mouse_down);
//         this.addEventListener(MouseEvent.MOUSE_UP, this.on_mouse_up);
//     }
//
//     public register_ui_for_rscript(id: string): void {
//         this._rscript_name = id;
//     }
//
//     public set_states(idle_img: Texture = null, hover_img: Texture = null, mouse_down_img: Texture = null,
//                       selected_img: Texture = null, disabled_img: Texture = null): void {
//         this._img_states[0] = idle_img;
//         this._img_states[1] = hover_img;
//         this._img_states[2] = mouse_down_img;
//         this._img_states[3] = selected_img;
//         this._img_states[4] = disabled_img;
//         this._use_response_animation = false;
//         this._use_states = true;
//         // _use_states must be set to true first.
//         if (idle_img != null) {
//             this.set_icon(idle_img);
//             this.refresh_graphic();
//         }
//     }
//
//     public button_width(): number {
//         if (this._img == null) {
//             return this._text.text_width() + this._w_margin * 2;
//         }
//         if (!this._use_states && this._has_text)
//             return this._img.width + this._text.text_width() + 5;
//         else
//             return this._img.width;
//     }
//
//     public button_height(): number {
//         if (this._img == null) {
//             return this._text.text_height() + this._h_margin * 2;
//         }
//         return Math.max(this._img.height, this._text.text_height());
//     }
//
//     // Button State Images. _img is the 'idle' state
//     // Possible States:
//     //	- Idle
//     //	- Hover
//     //	- Mouse Down
//     //	- Selected
//     //	- Disabled
//     // State when user goes to click a button IF a 'selected' state exists
//     // Idle -> (Move Cursor over Button) -> Hover -> (Mouse Click) -> Mouse Down -> (Mouse Up) -> Selected
//     // Other:
//
//     public set_icon(img: Texture): void {
//         if (img != null) {
//             if (this._img == null) {
//                 this._img = new Bitmap(img);
//                 this.addChild(this._img);
//             } else {
//                 this._img.bitmapData = img;
//             }
//
//             this.set_size(new UDim(0, 0, this._img.width, this._img.height));
//
//         } else {
//             if (this.contains(this._img))
//                 this.removeChild(this._img);
//             this._img = null;
//         }
//
//         this.refresh_graphic();
//     }
//
//     public set_font(font: TextFormat): void {
//         this._text.set_font(font);
//         this.refresh_graphic();
//     }
//
//     public set_hotkey(key: number, ctrl: boolean, txt: string): void {
//         this._hotkey = key;
//         if (txt != null) {
//             this._hotkey_string = txt;
//             this.set_tooltip(this._tooltip_string);
//         }
//     }
//
//     public unset_hotkey(): void {
//         this._hotkey = -1;
//         this._hotkey_string = "";
//         this.set_tooltip(this._tooltip_string);
//     }
//
//     public set_tooltip(text: string): void {
//         // this._tooltip_string = text;
//         //
//         // if (text.length + this._hotkey_string.length == 0) {
//         //     this.set_mouse_over_object(null, 1.0);
//         //     return;
//         // }
//         //
//         // if (this._hotkey_string.length > 0)
//         //     this.set_mouse_over_object(new TextBalloon(text + " (" + this._hotkey_string + ")", 0x0, 0.8), 1.0);
//         // else
//         //     this.set_mouse_over_object(new TextBalloon(text, 0x0, 0.8), 1.0);
//     }
//
//     public set_color(col: number): void {
//         this._text.set_text_color(col);
//     }
//
//     public set_text(txt: string): void {
//         this._text.set_text(txt);
//         this._has_text = (txt != null && txt.length > 0);
//         this.refresh_graphic();
//     }
//
//     public scale_icon_to_text(): void {
//         if (this._img == null) return;
//         let factor: number = 1.5 * this._text.text_height() / this._img.height;
//         this._img.scaleX = factor;
//         this._img.scaleY = factor;
//         this.refresh_graphic();
//     }
//
//     public set_selected(sel: boolean): void {
//         this._selected = sel;
//         if (sel) {
//             this._current_state = 3;
//         } else {
//             this._current_state = 0;
//         }
//         this.on_state_change();
//         this.refresh_graphic();
//     }
//
//     public get_selected(): boolean {
//         return this._selected;
//     }
//
//     public set_style(style: string): void {
//         this._style = style;
//         this.refresh_graphic();
//     }
//
//     /*override*/
//     public set_disabled(dis: boolean): void {
//         super.set_disabled(dis);
//         if (this._is_disabled) {
//             if (this._img != null) {
//                 this._img.alpha = 0.3;
//             }
//             this._text.alpha = 0.3;
//         } else {
//             if (this._img != null) {
//                 this._img.alpha = 1.0;
//             }
//             this._text.alpha = 1.0;
//         }
//
//         if (this._is_disabled) {
//             this._current_state = 4;
//         } else if (this._current_state == 4) {
//             this._current_state = 0;
//         }
//         this.on_state_change();
//     }
//
//     public respond(rdur: number = 70, hfactor: number = 40): void {
//         this._respond_duration = rdur;
//         this._respond_hfactor = hfactor;
//         this._respond = true;
//         this._respond_start_time = -1;
//     }
//
//     public set_use_response_animation(use_anim: boolean): void {
//         this._use_response_animation = use_anim;
//     }
//
//     public set_click_callback(cb: Function): void {
//         this._cb = cb;
//     }
//
//     /*override*/
//     public update(current_time: number, paused: boolean): void {
//         if (this._respond) {
//             if (this._respond_start_time < 0)
//                 this._respond_start_time = current_time;
//
//             let prog: number = (current_time - this._respond_start_time) / this._respond_duration;
//
//             if (prog >= Math.PI) {
//                 prog = Math.PI;
//                 this._respond = false;
//                 if (this._img != null)
//                     this._img.y = 0;
//                 this._text.y = this._h_margin;
//             } else {
//                 let adder: number = Math.sin(prog) * 0.4;
//                 if (this._img != null)
//                     this._img.y = -adder / 2.0 * this._respond_hfactor;
//                 this._text.y = this._h_margin - adder / 2.0 * this._respond_hfactor;
//             }
//
//         }
//     }
//
//     /*override*/
//     public on_key_down(key: number, ctrl: boolean, shift: boolean): boolean {
//         if (this._hotkey == key && this._hotkey_ctrl == ctrl) {
//             this.on_click(null);
//             return true;
//         }
//
//         return super.on_key_down(key, ctrl, shift);
//     }
//
//     private on_hover(e: Event): void {
//         if (this._current_state != 0) return;
//         this._current_state = 1;
//         this.on_state_change();
//     }
// ,
//
//     private on_stop_hover(e: Event): void {
//         if (this._current_state >= 3) return;
//         this._current_state = 0;
//         this.on_state_change();
//     }
//
//     private on_mouse_down(e: Event): void {
//         this._current_state = 2;
//         this.on_state_change();
//     }
//
//     private on_mouse_up(e: Event): void {
//         if (this._img_states[3] != null || this._current_state != 2) return;
//         this._current_state = 0;
//         this.on_state_change();
//     }
//
//     private on_state_change(): void {
//         if (this._img_states[this._current_state] == null) {
//             if (this._style == "nova")
//                 this.refresh_graphic();
//         } else {
//             this.set_icon(this._img_states[this._current_state]);
//         }
//     }
//
//     private refresh_graphic(): void {
//         this._sel_box.graphics.clear();
//         this._style_box.graphics.clear();
//         if (this._img == null) {
//             if (this._style == "nova") {
//
//                 let mx: Matrix = new Matrix();
//                 mx.createGradientBox(20, 20, 3 * Math.PI / 2, 0, 0);
//
//                 switch (this._current_state) {
//                 case 0:
//                     this.set_color(0xC0DCE7);
//                     this._style_box.graphics.beginGradientFill(GradientType.LINEAR, [0x2D4159, 0x5f7689], [1, 1], [0, 255], mx);
//                     break;
//                 case 1:
//                     this.set_color(0xFFFFFF);
//                     this._style_box.graphics.beginGradientFill(GradientType.LINEAR, [0x2D4159, 0x99B3C1], [1, 1], [0, 255], mx);
//                     break;
//                 case 2:
//                     this.set_color(0x333333);
//                     this._style_box.graphics.beginFill(0xFFCC00);
//                     break;
//                 }
//
//             } else if (this._style == "eterna2-green" && !this._use_states) {
//                 this._style_box.graphics.lineStyle(2, 0x2F4A68);
//                 this._style_box.graphics.beginFill(0x439645);
//             } else if (this._style == "eterna2-red" && !this._use_states) {
//                 this._style_box.graphics.lineStyle(2, 0x2F4A68);
//                 this._style_box.graphics.beginFill(0xB93F3C);
//             }
//             this._style_box.graphics.drawRoundRect(0, 0, this._text.text_width() + (this._w_margin) * 2, this._text.text_height() + (this._h_margin) * 2, 5);
//             this._style_box.graphics.endFill();
//
//             if (this._selected && this._img_states[3] == null) {
//                 this._sel_box.graphics.lineStyle(3, 0xFFFFFF, 0.4);
//                 this._sel_box.graphics.drawRoundRect(0, 0, this._text.text_width() + (this._w_margin) * 2, this._text.text_height() + (this._h_margin) * 2, 5);
//             }
//
//             this._text.visible = true;
//         } else {
//
//             if (this._selected && this._img_states[3] == null) {
//                 let img_w: number = this._img.width;
//                 let img_h: number = this._img.height;
//
//                 this._sel_box.graphics.lineStyle(5, 0xFFFFFF, 0.4);
//                 this._sel_box.graphics.drawRoundRect(this._select_offset_x, this._select_offset_y, img_w, img_h, 10);
//
//             } else {
//
//             }
//
//             this.graphics.clear();
//             this.graphics.beginFill(0, 0);
//             this.graphics.drawRect(0, 0, this.button_width(), this._img.height);
//
//             this._h_margin = this._img.height / 2 - this._text.text_height() / 2;
//             if (!this._use_states) {
//                 this._text.set_pos(new UDim(0, 0, this._img.width + 5, this._h_margin));
//             }
//         }
//     }
//
//     private on_click(e: Event): void {
//         if (this._is_disabled)
//             return;
//
//         if (this._cb == null)
//             return;
//
//         if (e != null)
//             e.stopPropagation();
//
//         if (this._play_sound) {
//             // SoundManager.instance.play_se(this._soundname, 0.5);
//         }
//
//         if (this._use_response_animation) {
//             this.respond();
//         }
//
//         if (this._cb != null && !GameButton._cb_in_progress) {
//             GameButton._cb_in_progress = true;
//             this._cb();
//             GameButton._cb_in_progress = false;
//         }
//
//         this.on_state_change();
//
//         // Application.instance.NotifyClickUI(this._rscript_name);
//     }
//
//     private _img: Sprite;
//     private _style_box: Graphics;
//     private _sel_box: Graphics;
//     private _text: Text;
//
//     private _disabled: boolean;
//     private _has_text: boolean;
//     private _w_margin: number;
//     private _h_margin: number;
//     private _cb: Function;
//     // Idle -> (Move Cursor over Button) -> Hover -> (Mouse Click) -> Mouse Down -> (Mouse Up) -> Idle
//     private _img_states: Texture[] = [null, null, null, null, null];
//     private _current_state: number;
//     private _use_states: boolean;
//
//     private _hotkey: number;
//     private _hotkey_ctrl: boolean;
//     private _hotkey_string: string;
//     private _tooltip_string: string;
//     private _selected: boolean;
//     private _style: string;
//     private _respond: boolean;
//     private _respond_start_time: number;
//     private _respond_duration: number;
//     private _respond_hfactor: number;
//     private _use_response_animation: boolean;
//     private _select_offset_x: number;
//     private _select_offset_y: number;
//     private _play_sound: boolean;
//     private _soundname: string;
//     private _rscript_name: string = "";
//
//     private static _cb_in_progress: boolean = false;
//     private static _sound_initialized: boolean;
//
//     private static readonly GAMESOUND_BUTTON_CLICK: string = "BUTTON_CLICK";
// }

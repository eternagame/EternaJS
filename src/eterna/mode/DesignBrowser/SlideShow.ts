import {Text} from "pixi.js";
import {GameObject} from "../../../flashbang/core/GameObject";
import {GameButton} from "../../ui/GameButton";
import {Fonts} from "../../util/Fonts";

export class SlideShow extends GameObject {
    // public constructor() {
    //     super();
    //
    //     this._slides = [];
    //     this._current_index = -1;
    //
    //     this._next_button = new GameButton;
    //     this._next_button.set_text("Next");
    //     this._next_button.set_selected(true);
    //     this._next_button.set_click_callback(this.go_next);
    //     this._next_button.set_use_response_animation(false);
    //     this.add_object(this._next_button);
    //
    //     this._prev_button = new GameButton;
    //     this._prev_button.set_text("Prev");
    //     this._prev_button.set_selected(true);
    //     this._prev_button.set_click_callback(this.go_prev);
    //     this._prev_button.set_use_response_animation(false);
    //     this.add_object(this._prev_button);
    //
    //     this._cancel_button = new GameButton;
    //     this._cancel_button.set_text("Cancel");
    //     this._cancel_button.set_selected(true);
    //     this._cancel_button.set_use_response_animation(false);
    //     this._cancel_button.set_click_callback(this.hide_show);
    //     this.add_object(this._cancel_button);
    //
    //     this._slidenum = new GameText(Fonts.arial(22, true));
    //     this.add_object(this._slidenum);
    // }
    //
    // public add_slide(bitmap: GameBitmap): void {
    //     bitmap.visible = false;
    //     this._slides.push(bitmap);
    //     this.add_object(bitmap);
    // }
    //
    // public show_show(): void {
    //     if (this._current_index < 0) {
    //         this.layout(0);
    //     }
    //
    //     Application.instance.add_lock("eterna.mode.DesignBrowser.SlideShow");
    //     Application.instance.get_modal_container().add_object(this);
    // }
    //
    // private hide_show(): void {
    //     Application.instance.remove_lock("eterna.mode.DesignBrowser.SlideShow");
    //     Application.instance.get_modal_container().remove_object(this);
    // }
    //
    // private go_next(): void {
    //     this.layout(this._current_index + 1);
    // }
    //
    // private go_prev(): void {
    //     this.layout(this._current_index - 1);
    // }
    //
    // private layout(newindex: number): void {
    //
    //     if (this._current_index >= 0) {
    //         this._slides[this._current_index].set_animator(new GameAnimatorFader(1, 0, 0.3, true));
    //     }
    //
    //     this._current_index = newindex;
    //
    //     var slide: GameBitmap = this._slides[this._current_index];
    //
    //     slide.alpha = 0;
    //     slide.visible = true;
    //     slide.set_animator(new GameAnimatorFader(0, 1, 0.3, false));
    //
    //     slide.set_pos(new UDim(0.5, 0.5, -slide.width / 2, -slide.height / 2));
    //
    //     slide.graphics.clear();
    //     slide.graphics.lineStyle(4, 0xFFFFFF);
    //     slide.graphics.drawRect(0, 0, slide.width, slide.height);
    //
    //     this._slidenum.set_text((this._current_index + 1) + " of " + this._slides.length);
    //     this._slidenum.set_pos(new UDim(0.5, 0.5, -this._slidenum.text_width() / 2, slide.height / 2 + 20));
    //
    //     if (this._current_index > 0) {
    //         this._prev_button.visible = true;
    //         this._prev_button.set_pos(new UDim(0.5, 0.5, -this._slidenum.text_width() / 2 - 10 - this._prev_button.button_width(), slide.height / 2 + 20));
    //     } else {
    //         this._prev_button.visible = false;
    //     }
    //
    //     if (this._current_index < this._slides.length - 1) {
    //         this._next_button.visible = true;
    //         this._next_button.set_pos(new UDim(0.5, 0.5, this._slidenum.text_width() / 2 + 10, slide.height / 2 + 20));
    //
    //         this._cancel_button.set_pos(new UDim(0.5, 0.5, this._slidenum.text_width() / 2 + 10 + this._next_button.button_width() + 10, slide.height / 2 + 20));
    //     } else {
    //         this._next_button.visible = false;
    //         this._cancel_button.set_pos(new UDim(0.5, 0.5, this._slidenum.text_width() / 2 + 10, slide.height / 2 + 20));
    //     }
    //
    // }
    //
    // private _slides: any[];
    // private _current_index: number;
    // private _next_button: GameButton;
    // private _prev_button: GameButton;
    // private _slidenum: Text;
    // private _cancel_button: GameButton;
}

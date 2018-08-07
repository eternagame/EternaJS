import {Sprite} from "pixi.js";
import {GameObject} from "../flashbang/core/GameObject";
import {Assert} from "../flashbang/util/Assert";
import {Puzzle} from "./puzzle/Puzzle";

// / TODO: remove this entire class
export class Application {
    public static get instance(): Application {
        if (Application._instance == null) {
            new Application();
        }

        return Application._instance;
    }

    public constructor(minimal: boolean = false) {
        if (Application._instance != null) {
            throw new Error("You can't create two applications");
        }
        Application._instance = this;

        this._url_base = "";

        if (minimal) {
            return;
        }

        this._player_points = -1;
        this._player_rank = -1;

        this._pointsrank_url = "";

        this._is_debug_mode = false;

        this._ui_count = 0;
    }

    public get_url_base(): string {
        return this._url_base;
    }

    // public get_mouse_over_container(): GameObject {
    //     return this._mouse_over_container;
    // }

    public set_mouse_over_position(mouse_over_object: GameObject): void {
        Assert.isTrue(false, "TODO");
        // /// Mouse over container is always the same size & pos with the application
        // /// So it's fine to use Application mouse coordinate
        //
        // let final_x: number = this.mouseX;
        // let final_y: number = this.mouseY;
        //
        // if (final_x + mouse_over_object.width > this.stage.stageWidth) {
        //     final_x -= (final_x + mouse_over_object.width - this.stage.stageWidth);
        // }
        //
        // if (final_y + mouse_over_object.height > this.stage.stageHeight) {
        //     final_y -= (final_y + mouse_over_object.height - this.stage.stageHeight);
        // }
        //
        // mouse_over_object.set_pos(new UDim(0, 0, final_x, final_y));
    }

    public set_dragger(mouse_move_cb: Function, mouse_up_cb: Function): void {
        Assert.isTrue(false, "TODO");
        // this._transparent_dragger.visible = true;
        // this._mouse_move_cb = mouse_move_cb;
        // this._mouse_up_cb = mouse_up_cb;
        // this._transparent_dragger.addEventListener(MouseEvent.MOUSE_MOVE, this.move_dragger);
        // this._transparent_dragger.addEventListener(MouseEvent.MOUSE_UP, this.remove_dragger);
        // this.stage.addEventListener(Event.MOUSE_LEAVE, this.remove_dragger);
    }

    public is_dragging(): boolean {
        return false;
        // TODO
        // return this._transparent_dragger.visible;
    }

    public setup_msg_box(msg: string, use_ok: boolean = true, extra_button_name: string = null, extra_button_cb: Function = null): void {
        Assert.isTrue(false, "TODO");
        // this._msg_box.set_title("Notice");
        //
        // if (use_ok) {
        //     this._msg_box.set_text(msg + "\n\n\n");
        //     this._msg_box.set_pos(new UDim(0.5, 0.5, -this._msg_box.balloon_width() / 2, -this._msg_box.balloon_height() / 2));
        //     this._msg_box.alpha = 0;
        //     this._msg_box.visible = true;
        //     this._ok_button.visible = true;
        //
        //     if (extra_button_name != null) {
        //         this._extra_button.set_text(extra_button_name);
        //         this._extra_button.visible = true;
        //         this._extra_button.set_click_callback(extra_button_cb);
        //
        //         let total_width: number = this._ok_button.button_width() + this._extra_button.button_width() + 10;
        //
        //         this._ok_button.set_pos(new UDim(0.5, 1.0, -total_width / 2.0, -33));
        //         this._extra_button.set_pos(new UDim(0.5, 1.0, -total_width / 2.0 + 10 + this._ok_button.button_width(), -33));
        //     } else {
        //         this._ok_button.set_pos(new UDim(0.5, 1.0, -10, -33));
        //         this._extra_button.visible = false;
        //     }
        //
        // } else {
        //     this._msg_box.set_text(msg + "\n\n\n");
        //     this._msg_box.set_pos(new UDim(0.5, 0.5, -this._msg_box.balloon_width() / 2, -this._msg_box.balloon_height() / 2));
        //     this._msg_box.alpha = 1;
        //     this._msg_box.visible = true;
        //     this._ok_button.visible = false;
        //
        //     if (extra_button_name != null) {
        //         this._extra_button.set_text(extra_button_name);
        //         this._extra_button.visible = true;
        //         this._extra_button.set_click_callback(extra_button_cb);
        //         this._extra_button.set_pos(new UDim(0.5, 1.0, -this._extra_button.button_width() / 2.0, -33));
        //     } else {
        //         this._extra_button.visible = false;
        //     }
        //
        // }
        //
        // if (!this._modal_container.is_child(this._msg_box)) {
        //     this._modal_container.add_object(this._msg_box);
        //     this.add_lock("MSG_BOX");
        // }
        //
        // if (use_ok) {
        //     this._msg_box.set_animator(new GameAnimatorFader(0, 1, 0.3, false));
        // }
    }

    public close_msg_box(): void {
        Assert.isTrue(false, "TODO");
        // this.remove_lock("MSG_BOX");
        // this._modal_container.remove_object(this._msg_box);
        // this._msg_box.remove_all_animators();
    }

    public set_debug_mode(): void {
        this._is_debug_mode = true;
        this.configure_debug_mode();
    }

    public is_debug_mode(): boolean {
        return this._is_debug_mode;
    }

    public copy_url(url: string): void {
        Assert.isTrue(false, "TODO");
        // System.setClipboard(url);
        // this.setup_msg_box("Copied URL\n" + url, false, "Dismiss", this.close_msg_box);
        // let effect: GameAnimatorFader = new GameAnimatorFader(1, 0, 0.5, true, false, 3);
        // effect.set_done_callback(this.close_msg_box);
        // this._msg_box.set_animator(effect);
    }

    public copy_to_clipboard(data: string, text: string): void {
        Assert.isTrue(false, "TODO");
        // System.setClipboard(data);
        // this.setup_msg_box(text, false, "Dismiss", this.close_msg_box);
        // let effect: GameAnimatorFader = new GameAnimatorFader(1, 0, 0.5, true, false, 3);
        // effect.set_done_callback(this.close_msg_box);
        // this._msg_box.set_animator(effect);
    }

    public increase_UI_count(): void {
        this._ui_count++;
    }

    public get_UI_count(): number {
        return this._ui_count;
    }

    public init(): void {
    }

    public get_application_gui(keyword: string): GameObject {
        return null;
    }

    public transit_game_mode(new_state: number, args: any[]): void {
    }

    public get_previous_game_mode(): number {
        return -1;
    }

    public InitializeRScript(puz: Puzzle): void {
    }

    public StartRScript(): void {
    }

    public StopRScript(): void {
    }

    public NotifyClickUI(key: string): void {
    }

    protected configure_debug_mode(): void {
    }

    private move_dragger(e: Event): void {
        Assert.isTrue(false, "TODO");
        // if (this._mouse_move_cb != null) {
        //     this._mouse_move_cb(e);
        // }
        //
        // e.stopPropagation();
    }

    private remove_dragger(e: Event): void {
        Assert.isTrue(false, "TODO");
        // this._transparent_dragger.removeEventListener(MouseEvent.MOUSE_MOVE, this.move_dragger);
        // this._transparent_dragger.removeEventListener(MouseEvent.MOUSE_UP, this.remove_dragger);
        // this.stage.removeEventListener(Event.MOUSE_LEAVE, this.remove_dragger);
        // this._transparent_dragger.visible = false;
        //
        // if (this._mouse_up_cb != null) {
        //     this._mouse_up_cb(e);
        // }
        //
        // e.stopPropagation();
        //
        // this._mouse_move_cb = null;
        // this._mouse_up_cb = null;
    }

    protected _player_points: number;
    protected _player_rank: number;
    protected _pointsrank_url: string;
    protected _url_base: string;

    private _transparent_dragger: Sprite;
    private _mouse_move_cb: Function;

    private _is_debug_mode: boolean;
    // / Temporary variables for debugging
    private _ui_count: number;

    private static _instance: Application;
}

import {Sprite} from "pixi.js";
import {GameObject} from "../flashbang/core/GameObject";
import {Assert} from "../flashbang/util/Assert";
import {Puzzle} from "./puzzle/Puzzle";

/// TODO: remove this entire class
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

        this._locks = [];

        this._key_states = new Map<any, any>();

        // this._yesno_box = new TextBalloon("", 0x152843, 1.0, 0xC0DCE7, 0.27);
        // this._yesno_box.set_mouse_enabled(true);
        // this._yesno_box.visible = false;
        //
        // let yes_button: GameButton = new GameButton(14);
        // yes_button.set_text("<U>Y</U>es");
        // yes_button.set_pos(new UDim(0.5, 1.0, -35, -33));
        // yes_button.set_click_callback(this.on_yes);
        // yes_button.set_states();
        // yes_button.set_style("nova");
        // yes_button.set_use_response_animation(false);
        // this._yesno_box.add_object(yes_button);
        //
        // let no_button: GameButton = new GameButton(14);
        // no_button.set_text("<U>N</U>o");
        // no_button.set_pos(new UDim(0.5, 1.0, 15, -33));
        // no_button.set_click_callback(this.on_no);
        // no_button.set_states();
        // no_button.set_style("nova");
        // no_button.set_use_response_animation(false);
        // this._yesno_box.add_object(no_button);
        //
        // this._msg_box = new TextBalloon("", 0x152843, 1.0, 0xC0DCE7, 0.27);
        // this._msg_box.visible = false;
        //
        // this._ok_button = new GameButton(14);
        // this._ok_button.set_text("Ok");
        // this._ok_button.set_click_callback(this.close_msg_box);
        // this._ok_button.set_states();
        // this._ok_button.set_style("nova");
        // this._ok_button.set_use_response_animation(false);
        // this._msg_box.add_object(this._ok_button);

        // this._extra_button = new GameButton(14);
        // this._extra_button.set_text("Extra");
        // this._extra_button.set_click_callback(this.close_msg_box);
        // this._extra_button.set_states();
        // this._extra_button.set_style("nova");
        // this._extra_button.set_use_response_animation(false);
        // this._msg_box.add_object(this._extra_button);

        this._is_dev_mode = false;

        this._url_base = "";

        this._player_name = "Anonymous";
        this._player_id = 0;

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

    public set_dev_mode(devmode: boolean): void {
        this._is_dev_mode = devmode;
    }

    public is_dev_mode(): boolean {
        return this._is_dev_mode;
    }

    public get_player_name(): string {
        return this._player_name;
    }

    public get_player_id(): number {
        return this._player_id;
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
        return this._transparent_dragger.visible;
    }

    public setup_yesno(question: string, yes_cb: Function, no_cb: Function): void {
        Assert.isTrue(false, "TODO");
        // this._yes_cb = yes_cb;
        // this._no_cb = no_cb;
        //
        // this._yesno_box.set_title("Are you sure?");
        // this._yesno_box.set_text(question + "\n\n\n");
        // this._yesno_box.set_pos(new UDim(0.5, 0.5, -this._yesno_box.balloon_width() / 2, -this._yesno_box.balloon_height() / 2));
        // this._yesno_box.alpha = 0;
        // this._yesno_box.visible = true;
        //
        // this._modal_container.add_object(this._yesno_box);
        // this.add_lock("YESNO_BOX");
        // this._yesno_box.set_animator(new GameAnimatorFader(0, 1, 0.3, false));
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

    public add_lock(lock: string): void {
        this._locks.push(lock);
        this.block_screen();
    }

    public remove_lock(lock: string): void {
        for (let ii: number = 0; ii < this._locks.length; ii++) {
            if (this._locks[ii] == lock) {
                this._locks.splice(ii, 1);
                break;
            }
        }

        if (this._locks.length == 0) {
            this.unblock_screen();
        }

    }

    public set_blocker_opacity(n: number): void {
        Assert.isTrue(false, "TODO");
        // this._blocker_opacity = n;
        // this._screen_blocker.graphics.clear();
        // this._screen_blocker.graphics.beginFill(0x0, this._blocker_opacity);
        // this._screen_blocker.graphics.drawRect(0, 0, this.stage.stageWidth, this.stage.stageHeight);
    }

    public get_screen_blocker(): GameObject {
        return this._screen_blocker;
    }

    public get_modal_container(): GameObject {
        throw new Error("Remove me");
        // return this._modal_container;
    }

    // public get_front_object_container(): GameObject {
    //     return this._front_object_root;
    // }

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

    public CompleteLevel(): void {
    }

    public NotifyClickUI(key: string): void {
    }

    protected set_player(namestr: string, uid: number): void {
        this._player_name = namestr;
        this._player_id = uid;
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

    private on_yes(): void {
        Assert.isTrue(false, "TODO");
        // if (this._yes_cb != null) {
        //     this._yes_cb();
        // }
        //
        // this._yesno_box.visible = false;
        // this._yes_cb = null;
        // this._no_cb = null;
        //
        // this.remove_lock("YESNO_BOX");
        // this._modal_container.remove_object(this._yesno_box);

    }

    private on_no(): void {
        Assert.isTrue(false, "TODO");
        // if (this._no_cb != null) {
        //     this._no_cb();
        // }
        //
        // this._yesno_box.visible = false;
        // this._yes_cb = null;
        // this._no_cb = null;
        //
        // this.remove_lock("YESNO_BOX");
        // this._modal_container.remove_object(this._yesno_box);

    }

    private block_screen(): void {
        Assert.isTrue(false, "TODO");
        // if (this._screen_blocker.visible) {
        //     return;
        // }
        //
        // this._screen_blocker.visible = true;
        // this._modal_container.visible = true;
        //
        // this._screen_blocker.set_animator(new GameAnimatorFader(0, 1, 0.2, false));
        // this._modal_container.set_animator(new GameAnimatorFader(0, 1, 0.2, false));
    }

    private unblock_screen(): void {
        Assert.isTrue(false, "TODO");
        // this._screen_blocker.visible = false;
        // this._modal_container.visible = false;
        //
        // this._screen_blocker.remove_all_animators();
        // this._modal_container.remove_all_animators();
    }

    protected _player_name: string;
    protected _player_id: number;
    protected _player_points: number;
    protected _player_rank: number;
    protected _pointsrank_url: string;
    protected _url_base: string;

    // private _modal_container: GameObject;
    private _screen_blocker: GameObject;
    private _blocker_opacity: number;
    private _locks: any[];
    private _transparent_dragger: Sprite;
    private _mouse_move_cb: Function;

    private _is_debug_mode: boolean;
    private _is_dev_mode: boolean;
    private _key_states: Map<any, any>;
    /// Temporary variables for debugging
    private _ui_count: number;

    private static _instance: Application;
}

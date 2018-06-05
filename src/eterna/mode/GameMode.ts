import {AppMode} from "../../flashbang/core/AppMode";
import {GameObject} from "../../flashbang/core/GameObject";
import {Pose2D} from "../pose2D/Pose2D";
import {PoseField} from "../pose2D/PoseField";

export abstract class GameMode extends AppMode {
    protected constructor() {
        super();
        this._pose_fields_container = new GameObject();
        this.addObject(this._pose_fields_container);
    }

    public get_pose(i: number): GameObject {
        return this._poses[i];
    }

    protected enter(): void {
        super.enter();

        // if (this._is_screenshot_supported) {
        //     if (this._pic_button == null) {
        //         let chatbox_camera: BitmapData = BitmapManager.get_bitmap(BitmapManager.ImgScreenshot);
        //         this._pic_button = new GameButton(22, chatbox_camera);
        //         this._pic_button.set_states(chatbox_camera,
        //             BitmapManager.get_bitmap(BitmapManager.ImgScreenshotOver),
        //             BitmapManager.get_bitmap(BitmapManager.ImgScreenshotHit),
        //             null,
        //             null);
        //         this._pic_button.set_disabled(false);
        //     }
        //     this._pic_button.visible = true;
        //     this._pic_button.set_click_callback(this.take_picture);
        //     this._pic_button.set_tooltip("Take a screenshot");
        //     this.addObject(this._pic_button);
        // }
    }

    protected exit(): void {
        // if (this._is_screenshot_supported) {
        //     this._pic_button.set_click_callback(null);
        //     this.remove_object(this._pic_button);
        // }

        super.exit();
    }

    public number_of_pose_fields(): number {
        return this._pose_fields.length;
    }

    public rop_set_pip(pip_mode: boolean): void {
        this.set_pip(pip_mode);
    }

    public is_forced_synch(): boolean {
        return this._force_synch;
    }

    public set_forced_synch(forced: boolean): void {
        this._force_synch = forced;
    }

    // overridables
    public set_multi_engines(multi: boolean): void {
    }

    public set_toolbar_autohide(auto: boolean): void {
    }

    public register_script_callbacks(): void {
    }

    public register_setter_callbacks(): void {
    }

    protected set_pose_fields(pose_fields: any[]): void {
        throw new Error("TODO");
        // let ii: number;
        //
        // if (this._pose_fields != null) {
        //     for (ii = 0; ii < this._pose_fields.length; ii++) {
        //         this._pose_fields_container.remove_object(this._pose_fields[ii]);
        //     }
        // }
        //
        // this._pose_fields = [];
        // let poses: any[] = [];
        //
        // for (ii = 0; ii < pose_fields.length; ii++) {
        //     this._pose_fields_container.add_object(pose_fields[ii]);
        //     this._pose_fields.push(pose_fields[ii]);
        //     poses.push(pose_fields[ii].get_pose());
        // }
        // this._poses = poses;
        //
        // let opt: GameObject = (<GameObject>Application.instance.get_application_gui("View options"));
        // if (opt != null) opt.load_options(this._poses, this);
    }

    protected toggle_pip(): void {
        this._is_pip_mode = !this._is_pip_mode;
        this.set_pip(this._is_pip_mode);
    }

    protected set_pip(pip_mode: boolean): void {
        throw new Error("TODO");
        // this._is_pip_mode = pip_mode;
        //
        // if (pip_mode) {
        //     let N: number = this._pose_fields.length;
        //     for (let ii = 0; ii < N; ii++) {
        //         this._pose_fields[ii].set_pos(new UDim(1.0 / N * ii, 0, 0, 0));
        //         this._pose_fields[ii].set_size(new UDim(1.0 / N, 1, 0, 0));
        //         this._pose_fields[ii].visible = true;
        //     }
        // } else {
        //     for (let ii = 0; ii < this._pose_fields.length; ii++) {
        //         if (ii == 0) {
        //             this._pose_fields[ii].set_pos(new UDim(0, 0, 0, 0));
        //             this._pose_fields[ii].set_size(new UDim(1, 1, 0, 0));
        //             this._pose_fields[ii].visible = true;
        //         } else {
        //             this._pose_fields[ii].visible = false;
        //         }
        //
        //     }
        // }
        //
        // this.on_set_pip(pip_mode);
    }

    protected on_set_pip(pip_mode: boolean): void {
    }

    protected take_picture(): void {
        throw new Error("TODO");
        // this._pic_button.set_click_callback(null);
        // this._pic_button.alpha = 1.0;
        // //This could take awhile, any way to redraw here?
        // let img: BitmapData = this.get_screenshot();
        //
        // if (img) {
        //     let imageBytes: ByteArray = PNGEncoder.encode(img);
        //     GameClient.instance.post_screenshot(imageBytes, function (datastring: string): void {
        //         let data: any = this.com.adobe.serialization.json.JSON.decode(datastring)['data'];
        //         if (!data['success']) {
        //             Application.instance.setup_msg_box("Error - " + data['error']);
        //         }
        //         this._pic_button.set_click_callback(this.take_picture);
        //     });
        //
        // } else {
        //     this._pic_button.set_click_callback(this.take_picture);
        //     this._pic_button.alpha = 0.5;
        //     Application.instance.setup_msg_box("There's no image to take a screenshot of right now!");
        // }
    }

    /// To be overridden
    protected get_screenshot(): any {
        return null;
    }

    protected _is_screenshot_supported: boolean = false;
    protected _pose_fields_container: GameObject;
    protected _pose_fields: PoseField[] = [];
    protected _poses: Pose2D[] = [];
    protected _is_pip_mode: boolean = false;
    protected _force_synch: boolean = false;

    // protected _pic_button: GameButton;

}

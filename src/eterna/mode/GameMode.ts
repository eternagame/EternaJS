import * as log from "loglevel";
import {Container, Point} from "pixi.js";
import {AppMode} from "../../flashbang/core/AppMode";
import {Flashbang} from "../../flashbang/core/Flashbang";
import {GameObjectRef} from "../../flashbang/core/GameObjectRef";
import {SceneObject} from "../../flashbang/objects/SceneObject";
import {Assert} from "../../flashbang/util/Assert";
import {Pose2D} from "../pose2D/Pose2D";
import {PoseField} from "../pose2D/PoseField";
import {ConfirmDialog} from "../ui/ConfirmDialog";
import {NotificationDialog} from "../ui/NotificationDialog";

export abstract class GameMode extends AppMode {
    public readonly bgLayer: Container = new Container();
    public readonly poseLayer: Container = new Container();
    public readonly uiLayer: Container = new Container();
    public readonly dialogLayer: Container = new Container();
    public readonly achievementsLayer: Container = new Container();

    protected setup(): void {
        super.setup();

        this.modeSprite.addChild(this.bgLayer);
        this.modeSprite.addChild(this.poseLayer);
        this.modeSprite.addChild(this.uiLayer);
        this.modeSprite.addChild(this.dialogLayer);
        this.modeSprite.addChild(this.achievementsLayer);
    }

    public get_pose(i: number): Pose2D {
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

    protected showConfirmDialog(prompt: string): ConfirmDialog {
        return this.showDialog(new ConfirmDialog(prompt));
    }

    protected showNotificationDialog(message: string, extraButtonTitle?: string): NotificationDialog {
        return this.showDialog(new NotificationDialog(message, "Ok", extraButtonTitle));
    }

    protected showDialog<T extends SceneObject>(dialog: T): T {
        if (this._dialogRef.isLive) {
            log.warn("Dialog already showing");
            this._dialogRef.destroyObject();
        }

        this._dialogRef = this.addObject(dialog, this.dialogLayer);
        return dialog;
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

    public register_script_callbacks(): void {
    }

    public register_setter_callbacks(): void {
    }

    protected set_pose_fields(newPoseFields: PoseField[]): void {
        if (this._pose_fields != null) {
            for (let poseField of this._pose_fields) {
                poseField.destroySelf();
            }
        }

        this._pose_fields = [];
        let poses: Pose2D[] = [];

        for (let newPoseField of newPoseFields) {
            this.addObject(newPoseField, this.poseLayer);
            this._pose_fields.push(newPoseField);
            poses.push(newPoseField.get_pose());
        }
        this._poses = poses;
    }

    protected toggle_pip(): void {
        this.set_pip(!this._is_pip_mode);
    }

    protected set_pip(pip_mode: boolean): void {
        this._is_pip_mode = pip_mode;

        if (pip_mode) {
            let numFields: number = this._pose_fields.length;
            for (let ii = 0; ii < numFields; ii++) {
                let poseField = this._pose_fields[ii];
                poseField.display.position = new Point(Flashbang.stageWidth / numFields * ii, 0);
                poseField.set_size(Flashbang.stageWidth / numFields, Flashbang.stageHeight, true);
                poseField.display.visible = true;
            }
        } else {
            for (let ii = 0; ii < this._pose_fields.length; ii++) {
                let poseField = this._pose_fields[ii];
                if (ii === 0) {
                    poseField.display.position = new Point(0, 0);
                    poseField.set_size(Flashbang.stageWidth, Flashbang.stageHeight, false);
                    poseField.display.visible = true;
                } else {
                    poseField.display.visible = false;
                }
            }
        }

        this.on_set_pip(pip_mode);
    }

    protected on_set_pip(pip_mode: boolean): void {
    }

    protected take_picture(): void {
        Assert.isTrue(false, "TODO");
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

    // / To be overridden
    protected get_screenshot(): any {
        return null;
    }

    protected _dialogRef: GameObjectRef = GameObjectRef.NULL;

    protected _is_screenshot_supported: boolean = false;
    protected _pose_fields: PoseField[] = [];
    protected _poses: Pose2D[] = [];
    protected _is_pip_mode: boolean = false;
    protected _force_synch: boolean = false;

    // protected _pic_button: GameButton;
}

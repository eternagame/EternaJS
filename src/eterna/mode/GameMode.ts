import * as log from "loglevel";
import {Container, Point} from "pixi.js";
import {AppMode} from "../../flashbang/core/AppMode";
import {Flashbang} from "../../flashbang/core/Flashbang";
import {GameObjectRef} from "../../flashbang/core/GameObjectRef";
import {SceneObject} from "../../flashbang/objects/SceneObject";
import {AchievementManager} from "../achievements/AchievementManager";
import {Eterna} from "../Eterna";
import {Pose2D} from "../pose2D/Pose2D";
import {PoseField} from "../pose2D/PoseField";
import {ConfirmDialog} from "../ui/ConfirmDialog";
import {NotificationDialog} from "../ui/NotificationDialog";
import {UILockDialog} from "../ui/UILockDialog";

export abstract class GameMode extends AppMode {
    public readonly bgLayer: Container = new Container();
    public readonly poseLayer: Container = new Container();
    public readonly uiLayer: Container = new Container();
    public readonly dialogLayer: Container = new Container();
    public readonly notifLayer: Container = new Container();
    public readonly achievementsLayer: Container = new Container();

    protected setup(): void {
        super.setup();

        this.container.addChild(this.bgLayer);
        this.container.addChild(this.poseLayer);
        this.container.addChild(this.uiLayer);
        this.container.addChild(this.dialogLayer);
        this.container.addChild(this.notifLayer);
        this.container.addChild(this.achievementsLayer);

        this._achievements = new AchievementManager();
        this.addObject(this._achievements);
    }

    public getPose(i: number): Pose2D {
        return this._poses[i];
    }

    public showConfirmDialog(prompt: string, promptIsHTML: boolean = false): ConfirmDialog {
        return this.showDialog(new ConfirmDialog(prompt, promptIsHTML));
    }

    /** Show a dialog. Removes any existing dialog. */
    public showDialog<T extends SceneObject>(dialog: T): T {
        if (this._dialogRef.isLive) {
            log.warn("Dialog already showing");
            this._dialogRef.destroyObject();
        }

        this._dialogRef = this.addObject(dialog, this.dialogLayer);
        return dialog;
    }

    /**
     * Show a notification. Removes any existing notification. Dialogs will be hidden while the notification exists.
     * Returns a Promise that will resolve when the notification is dismissed.
     */
    public showNotification(message: string, extraButtonTitle?: string): NotificationDialog {
        if (this._notifRef.isLive) {
            log.warn("Notification already showing");
            this._notifRef.destroyObject();
        }

        let notif = new NotificationDialog(message, extraButtonTitle);
        this._notifRef = this.addObject(notif, this.notifLayer);

        // Hide dialogs while a notification is showing
        this.dialogLayer.visible = false;
        notif.destroyed.connect(() => this.dialogLayer.visible = true);

        return notif;
    }

    /** Draws a dimrect over the game + UI (but below the achievements layer.) */
    public pushUILock(): void {
        if (this._uiLockRef.isLive) {
            (this._uiLockRef.object as UILockDialog).addRef();
        } else {
            this._uiLockRef = this.addObject(new UILockDialog(), this.dialogLayer, 0);
        }
    }

    /** Removes the currently-active ui lock */
    public popUILock(): void {
        if (this._uiLockRef.isLive) {
            (this._uiLockRef.object as UILockDialog).releaseRef();
        } else {
            log.warn("UILockDialog not currently active");
        }
    }

    public get numPoseFields(): number {
        return this._poseFields.length;
    }

    public ropSetPip(pip_mode: boolean): void {
        this.setPip(pip_mode);
    }

    public get isForcedSynch(): boolean {
        return this._forceSynch;
    }

    public set isForcedSynch(forced: boolean) {
        this._forceSynch = forced;
    }

    public registerScriptCallbacks(): void {
    }

    public registerSetterCallbacks(): void {
    }

    public onResized(): void {
        this.layoutPoseFields();
        super.onResized();
    }

    protected setPoseFields(newPoseFields: PoseField[]): void {
        if (this._poseFields != null) {
            for (let poseField of this._poseFields) {
                poseField.destroySelf();
            }
        }

        this._poseFields = [];
        this._poses = [];

        for (let newPoseField of newPoseFields) {
            this._poseFields.push(newPoseField);
            this._poses.push(newPoseField.get_pose());
        }
    }

    protected togglePip(): void {
        this.setPip(!this._isPipMode);
    }

    protected setPip(pip_mode: boolean): void {
        this._isPipMode = pip_mode;
        this.layoutPoseFields();
        this.onSetPip(pip_mode);
    }

    protected layoutPoseFields(): void {
        if (this._isPipMode) {
            let numFields: number = this._poseFields.length;
            for (let ii = 0; ii < numFields; ii++) {
                let poseField = this._poseFields[ii];
                poseField.display.position = new Point(Flashbang.stageWidth / numFields * ii, 0);
                poseField.set_size(Flashbang.stageWidth / numFields, Flashbang.stageHeight, true);
                poseField.display.visible = true;
            }
        } else {
            for (let ii = 0; ii < this._poseFields.length; ii++) {
                let poseField = this._poseFields[ii];
                if (ii === 0) {
                    poseField.display.position = new Point(0, 0);
                    poseField.set_size(Flashbang.stageWidth, Flashbang.stageHeight, false);
                    poseField.display.visible = true;
                } else {
                    poseField.display.visible = false;
                }
            }
        }
    }

    protected onSetPip(pip_mode: boolean): void {
    }

    protected postScreenshot(screenshot: ArrayBuffer): void {
        this.pushUILock();

        Eterna.client.postScreenshot(screenshot)
            .then(filename => {
                let url = new URL(filename, Eterna.serverURL);
                let prompt = `Do you want to post <u><a href="${url.href}" target="_blank">this</a></u> screenshot in chat?`;
                this.showConfirmDialog(prompt, true).closed.then(confirmed => {
                    if (confirmed) {
                        log.info("TODO: post to chat!");
                    }
                });
            })
            .catch(err => {
                this.showNotification(`There was an error posting the screenshot\n${err}`);
            })
            ./*finally*/then(() => {
                this.popUILock();
            });
    }

    protected _achievements: AchievementManager;

    protected _dialogRef: GameObjectRef = GameObjectRef.NULL;
    protected _uiLockRef: GameObjectRef = GameObjectRef.NULL;
    protected _notifRef: GameObjectRef = GameObjectRef.NULL;

    protected _poseFields: PoseField[] = [];
    protected _poses: Pose2D[] = [];    // TODO: remove me!
    protected _isPipMode: boolean = false;
    protected _forceSynch: boolean = false;
}

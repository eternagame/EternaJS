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
import {ContextMenu} from "../ui/ContextMenu";
import {Dialog} from "../ui/Dialog";
import {NotificationDialog} from "../ui/NotificationDialog";
import {Tooltips} from "../ui/Tooltips";
import {UILockDialog} from "../ui/UILockDialog";
import {ExternalInterface, ExternalInterfaceCtx} from "../util/ExternalInterface";

export abstract class GameMode extends AppMode {
    public readonly bgLayer = new Container();
    public readonly poseLayer = new Container();
    public readonly uiLayer = new Container();
    public readonly dialogLayer = new Container();
    public readonly notifLayer = new Container();
    public readonly tooltipLayer = new Container();
    public readonly achievementsLayer = new Container();
    public readonly contextMenuLayer = new Container();

    /** Controls whether certain folding operations are run synchronously or queued up */
    public forceSync: boolean = false;

    protected setup(): void {
        super.setup();

        this.container.addChild(this.bgLayer);
        this.container.addChild(this.poseLayer);
        this.container.addChild(this.uiLayer);
        this.container.addChild(this.dialogLayer);
        this.container.addChild(this.notifLayer);
        this.container.addChild(this.tooltipLayer);
        this.container.addChild(this.achievementsLayer);
        this.container.addChild(this.contextMenuLayer);

        this._achievements = new AchievementManager();
        this.addObject(this._achievements);
        this.addObject(new Tooltips(this.tooltipLayer));
    }

    protected enter(): void {
        super.enter();
        if (this._modeScriptInterface != null) {
            ExternalInterface.pushContext(this._modeScriptInterface);
        }
    }

    protected exit(): void {
        if (this._modeScriptInterface != null) {
            ExternalInterface.popContext(this._modeScriptInterface);
        }
        super.exit();
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
    public pushUILock(name?: string): void {
        let lockDialog = this._uiLockRef.object as UILockDialog;
        if (lockDialog == null) {
            lockDialog = new UILockDialog();
            this._uiLockRef = this.addObject(lockDialog, this.dialogLayer, 0);
        }

        lockDialog.addRef(name);
    }

    /** Removes the currently-active ui lock */
    public popUILock(name?: string): void {
        if (this._uiLockRef.isLive) {
            (this._uiLockRef.object as UILockDialog).releaseRef(name);
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

    protected registerScriptInterface(ctx: ExternalInterfaceCtx): void {
        if (this._modeScriptInterface != null) {
            throw new Error("ExternalInterfaceCtx already registered for this mode");
        }

        this._modeScriptInterface = ctx;
        if (this._isActive) {
            ExternalInterface.pushContext(ctx);
        }
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
            this._poses.push(newPoseField.pose);
        }

        this.layoutPoseFields();
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
                poseField.setSize(Flashbang.stageWidth / numFields, Flashbang.stageHeight, true);
                poseField.display.visible = true;
            }
        } else {
            for (let ii = 0; ii < this._poseFields.length; ii++) {
                let poseField = this._poseFields[ii];
                if (ii === 0) {
                    poseField.display.position = new Point(0, 0);
                    poseField.setSize(Flashbang.stageWidth, Flashbang.stageHeight, false);
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
        this.pushUILock("Screenshot");

        Eterna.client.postScreenshot(screenshot)
            .then(filename => {
                let url = new URL(filename, Eterna.SERVER_URL);
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
                this.popUILock("Screenshot");
            });
    }

    public onContextMenuEvent(e: Event): void {
        let handled = false;
        if (this._contextMenuDialogRef.isLive) {
            this._contextMenuDialogRef.destroyObject();
            handled = true;
        } else {
            let menu = this.createContextMenu();
            if (menu != null) {
                this._contextMenuDialogRef = this.addObject(
                    new ContextMenuDialog(menu, Flashbang.globalMouse),
                    this.contextMenuLayer);
                handled = true;
            }
        }

        if (handled) {
            e.preventDefault();
        }
    }

    /** Subclasses can override to create a ContextMenu that will be shown when the user right-clicks */
    protected createContextMenu(): ContextMenu {
        return null;
    }

    protected get isDialogOrNotifShowing(): boolean {
        return this._dialogRef.isLive || this._notifRef.isLive;
    }

    protected get hasUILock(): boolean {
        return this._uiLockRef.isLive;
    }

    protected _achievements: AchievementManager;

    protected _dialogRef: GameObjectRef = GameObjectRef.NULL;
    protected _uiLockRef: GameObjectRef = GameObjectRef.NULL;
    protected _notifRef: GameObjectRef = GameObjectRef.NULL;
    protected _contextMenuDialogRef: GameObjectRef = GameObjectRef.NULL;

    private _modeScriptInterface: ExternalInterfaceCtx;

    protected _poseFields: PoseField[] = [];
    protected _poses: Pose2D[] = [];    // TODO: remove me!
    protected _isPipMode: boolean = false;
}

class ContextMenuDialog extends Dialog<void> {
    public constructor(menu: ContextMenu, menuLoc: Point) {
        super();
        this._menu = menu;
        this._menuLoc = menuLoc;
    }

    protected added(): void {
        super.added();
        this.addObject(this._menu, this.container);

        this._menu.display.position = this._menuLoc;
        this._menu.menuItemSelected.connect(() => this.close(null));
    }

    protected onBGClicked(): void {
        this.close(null);
    }

    protected get bgAlpha(): number {
        return 0;
    }

    private readonly _menu: ContextMenu;
    private readonly _menuLoc: Point;
}

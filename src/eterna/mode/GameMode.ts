import * as log from 'loglevel';
import {Container, Point} from 'pixi.js';
import Eterna from 'eterna/Eterna';
import UndoBlock, {TargetConditions} from 'eterna/UndoBlock';
import EPars from 'eterna/EPars';
import {
    AppMode, SceneObject, Flashbang, GameObjectRef, Assert
} from 'flashbang';
import AchievementManager from 'eterna/achievements/AchievementManager';
import Tooltips from 'eterna/ui/Tooltips';
import ExternalInterface, {ExternalInterfaceCtx} from 'eterna/util/ExternalInterface';
import Pose2D from 'eterna/pose2D/Pose2D';
import ConfirmDialog from 'eterna/ui/ConfirmDialog';
import NotificationDialog from 'eterna/ui/NotificationDialog';
import UILockDialog from 'eterna/ui/UILockDialog';
import PoseField from 'eterna/pose2D/PoseField';
import ContextMenu from 'eterna/ui/ContextMenu';
import URLButton from 'eterna/ui/URLButton';
import EternaURL from 'eterna/net/EternaURL';
import Folder from 'eterna/folding/Folder';
import Dialog from 'eterna/ui/Dialog';

export default abstract class GameMode extends AppMode {
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
        Assert.assertIsDefined(this.container);

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
            log.warn('Dialog already showing');
            this._dialogRef.destroyObject();
        }

        this._dialogRef = this.addObject(dialog, this.dialogLayer);
        return dialog;
    }

    public closeCurDialog(): void {
        this._dialogRef.destroyObject();
    }

    /**
     *
     * Show a notification. Removes any existing notification. Dialogs will be hidden while the notification exists.
     *
     * @param message the message to display
     * @param extraButtonTitle if provided, creates a second button with a label containing the given text
     *
     * @returns a NotificationDialogue constructed from the provided parameters
     */
    public showNotification(message: string, extraButtonTitle?: string): NotificationDialog {
        if (this._notifRef.isLive) {
            log.warn('Notification already showing');
            this._notifRef.destroyObject();
        }

        let notif = new NotificationDialog(message, extraButtonTitle);
        this._notifRef = this.addObject(notif, this.notifLayer);

        // Hide dialogs while a notification is showing
        this.dialogLayer.visible = false;
        notif.destroyed.connect(() => { this.dialogLayer.visible = true; });

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
            log.warn('UILockDialog not currently active');
        }
    }

    public get numPoseFields(): number {
        return this._poseFields.length;
    }

    public ropSetPip(pipMode: boolean): void {
        this.setPip(pipMode);
    }

    protected registerScriptInterface(ctx: ExternalInterfaceCtx): void {
        if (this._modeScriptInterface != null) {
            throw new Error('ExternalInterfaceCtx already registered for this mode');
        }

        this._modeScriptInterface = ctx;
        if (this._isActive) {
            ExternalInterface.pushContext(ctx);
        }
    }

    public onResized(): void {
        super.onResized();
        this.layoutPoseFields();
    }

    protected setPoseFields(newPoseFields: PoseField[]): void {
        if (this._poseFields != null) {
            for (let poseField of this._poseFields) {
                poseField.destroySelf();
            }
        }

        this._poseFields = [];
        this._poses = [];

        newPoseFields.forEach((newField, idx) => {
            this._poseFields.push(newField);
            this._poses.push(newField.pose);
            newField.pose.getEnergyDelta = () => {
                // Sanity check
                if (this._folder !== null) {
                    let poseidx = this._isPipMode ? idx : this._curTargetIndex;

                    let score = null;
                    let pseudoknots: boolean = this._targetConditions != null
                        && this._targetConditions[0] != null
                        && this._targetConditions[0]['type'] === 'pseudoknot';
                    if (pseudoknots) {
                        score = (pairs: number[]) => {
                            Assert.assertIsDefined(this._folder);
                            return this._folder.scoreStructures(
                                newField.pose.fullSequence, pairs, true
                            );
                        };
                    } else {
                        score = (pairs: number[]) => {
                            Assert.assertIsDefined(this._folder);
                            return this._folder.scoreStructures(
                                newField.pose.fullSequence, pairs
                            );
                        };
                    }

                    let targetPairs: number[] | undefined = this._targetPairs
                        ? this._targetPairs[poseidx] : this.getCurrentTargetPairs(poseidx);
                    Assert.assertIsDefined(
                        targetPairs,
                        "This poses's targetPairs are undefined; energy delta cannot be computed!"
                    );
                    const ublk = this.getCurrentUndoBlock(poseidx);
                    Assert.assertIsDefined(ublk, 'getEnergyDelta is being called where UndoBlocks are unavailable!');
                    let nativePairs: number[] = ublk.getPairs(37, pseudoknots);
                    return score(EPars.getSatisfiedPairs(targetPairs, newField.pose.fullSequence))
                        - score(nativePairs);
                }
                return -1;
            };
        });

        this.layoutPoseFields();
    }

    protected togglePip(): void {
        this.setPip(!this._isPipMode);
    }

    protected setPip(pipMode: boolean): void {
        this._isPipMode = pipMode;
        this.layoutPoseFields();
        this.onSetPip(pipMode);
    }

    protected layoutPoseFields(): void {
        Assert.assertIsDefined(Flashbang.stageHeight);
        if (this._isPipMode) {
            let numFields: number = this._poseFields.length;
            for (let ii = 0; ii < numFields; ii++) {
                let poseField = this._poseFields[ii];
                poseField.display.position = new Point((this.posesWidth / numFields) * ii, 0);
                poseField.setSize(this.posesWidth / numFields, Flashbang.stageHeight, true);
                poseField.display.visible = true;
            }
        } else {
            for (let ii = 0; ii < this._poseFields.length; ii++) {
                let poseField = this._poseFields[ii];
                if (ii === 0) {
                    poseField.display.position = new Point(0, 0);
                    poseField.setSize(this.posesWidth, Flashbang.stageHeight, false);
                    poseField.display.visible = true;
                } else {
                    poseField.display.visible = false;
                }
            }
        }
    }

    protected get posesWidth(): number {
        Assert.assertIsDefined(Flashbang.stageWidth);
        return Flashbang.stageWidth;
    }

    protected onSetPip(pipMode: boolean): void {
    }

    protected postScreenshot(screenshot: ArrayBuffer): void {
        this.pushUILock('Screenshot');

        Eterna.client.postScreenshot(screenshot)
            .then((filename) => {
                let url = new URL(filename, Eterna.SERVER_URL);
                let prompt = `Do you want to post <u><a href="${url.href}" target="_blank">this</a></u> screenshot in chat?`;
                this.showConfirmDialog(prompt, true).closed.then((confirmed) => {
                    if (confirmed) {
                        Eterna.chat.postText(url.href);
                    }
                });
            })
            .catch((err) => {
                this.showNotification(`There was an error posting the screenshot\n${err}`);
            })
            ./* finally */then(() => {
                this.popUILock('Screenshot');
            });
    }

    public onContextMenuEvent(e: Event): void {
        Assert.assertIsDefined(Flashbang.globalMouse);
        let handled = false;
        if (((e.target as HTMLElement).parentNode as HTMLElement).id === Eterna.PIXI_CONTAINER_ID) {
            if (this._contextMenuDialogRef.isLive) {
                this._contextMenuDialogRef.destroyObject();
                handled = true;
            } else {
                let menu = this.createContextMenu();
                if (menu != null) {
                    this._contextMenuDialogRef = this.addObject(
                        new ContextMenuDialog(menu, Flashbang.globalMouse),
                        this.contextMenuLayer
                    );
                    handled = true;
                }
            }
        }

        if (handled) {
            e.preventDefault();
        }
    }

    /** Subclasses can override to create a ContextMenu that will be shown when the user right-clicks */
    protected createContextMenu(): ContextMenu | null {
        return null;
    }

    protected get isDialogOrNotifShowing(): boolean {
        return this._dialogRef.isLive || this._notifRef.isLive;
    }

    protected get hasUILock(): boolean {
        return this._uiLockRef.isLive;
    }

    protected static createHomeButton(): URLButton {
        let button = new URLButton('Go to Home', EternaURL.createURL({page: 'lab_bench'}));
        button.selectable(false);
        return button;
    }

    protected _achievements: AchievementManager;

    protected _dialogRef: GameObjectRef = GameObjectRef.NULL;
    protected _uiLockRef: GameObjectRef = GameObjectRef.NULL;
    protected _notifRef: GameObjectRef = GameObjectRef.NULL;
    protected _contextMenuDialogRef: GameObjectRef = GameObjectRef.NULL;

    private _modeScriptInterface: ExternalInterfaceCtx;

    protected _poseFields: PoseField[] = [];
    protected _poses: Pose2D[] = []; // TODO: remove me!
    protected _isPipMode: boolean = false;

    // Things that might or might not be set in children so that getEnergyDelta can get set in setPoseFields
    protected get _folder(): Folder | null {
        return null;
    }

    protected _curTargetIndex: number;
    protected getCurrentUndoBlock(index: number): UndoBlock | undefined {
        return undefined;
    }

    protected getCurrentTargetPairs(index: number): number[] | undefined {
        return undefined;
    }

    protected _targetPairs: number[][];

    protected _targetConditions: (TargetConditions | undefined)[];
}

class ContextMenuDialog extends Dialog<void> {
    constructor(menu: ContextMenu, menuLoc: Point) {
        super();
        this._menu = menu;
        this._menuLoc = menuLoc;
    }

    protected added(): void {
        super.added();
        this.addObject(this._menu, this.container);

        this._menu.display.position = this._menuLoc;
        this._menu.menuItemSelected.connect(() => this.close());
    }

    protected onBGClicked(): void {
        this.close();
    }

    protected get bgAlpha(): number {
        return 0;
    }

    private readonly _menu: ContextMenu;
    private readonly _menuLoc: Point;
}

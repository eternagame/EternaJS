import * as log from 'loglevel';
import {Container, Text} from 'pixi.js';
import Eterna from 'eterna/Eterna';
import UndoBlock, {TargetConditions} from 'eterna/UndoBlock';
import SecStruct from 'eterna/rnatypes/SecStruct';
import {
    AppMode, SceneObject, Flashbang, GameObjectRef, Assert, AlphaTask, RepeatingTask, SerialTask
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
import ContextMenuDialog from 'eterna/ui/ContextMenuDialog';
import Utility from 'eterna/util/Utility';
import PasteSequenceDialog from 'eterna/ui/PasteSequenceDialog';
import NucleotideFinder from 'eterna/ui/NucleotideFinder';
import ExplosionFactorDialog from 'eterna/ui/ExplosionFactorDialog';
import NucleotideRangeSelector from 'eterna/ui/NucleotideRangeSelector';
import Sequence from 'eterna/rnatypes/Sequence';
import EPars from 'eterna/EPars';
import Fonts from 'eterna/util/Fonts';
import CopyTextDialog from 'eterna/ui/CopyTextDialog';
import Toolbar from 'eterna/ui/toolbar/Toolbar';
import WindowDialog from 'eterna/ui/WindowDialog';
import Pose3DDialog from 'eterna/pose3D/Pose3DDialog';

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
        this.bgLayer.name = 'bgLayer';
        this.container.addChild(this.poseLayer);
        this.poseLayer.name = 'poseLayer';
        this.container.addChild(this.uiLayer);
        this.uiLayer.name = 'uiLayer';
        this.container.addChild(this.dialogLayer);
        this.dialogLayer.name = 'dialogLayer';
        this.container.addChild(this.notifLayer);
        this.notifLayer.name = 'notifLayer';
        this.container.addChild(this.achievementsLayer);
        this.achievementsLayer.name = 'achievementsLayer';
        this.container.addChild(this.contextMenuLayer);
        this.contextMenuLayer.name = 'contextMenuLayer';
        this.container.addChild(this.tooltipLayer);
        this.tooltipLayer.name = 'tooltipLayer';

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

    public getPoseField(i: number): PoseField {
        return this._poseFields[i];
    }

    public showConfirmDialog(prompt: string, promptIsHTML: boolean = false): ConfirmDialog {
        return this.showDialog(new ConfirmDialog(prompt, promptIsHTML));
    }

    /** Show a dialog. Removes any existing modal dialogs if modal. */
    public showDialog<T extends SceneObject>(dialog: T): T;
    public showDialog<T extends SceneObject>(dialog: T, id: string): T | null;
    public showDialog<T extends SceneObject>(dialog: T, id?: string): T | null {
        const isModal = !(dialog instanceof WindowDialog) || dialog.modal;

        if (id && this.hasNamedObject(id) && !isModal) return null;

        if (isModal) {
            if (this._dialogRef.isLive) {
                log.warn('Dialog already showing');
                this._dialogRef.destroyObject();
            }
        }

        const ref = id ? this.addNamedObject(id, dialog, this.dialogLayer) : this.addObject(dialog, this.dialogLayer);
        if (isModal) this._dialogRef = ref;

        return dialog;
    }

    public closeCurDialog(): void {
        this._dialogRef.destroyObject();
    }

    protected static createStatusText(text: string): SceneObject<Text> {
        const statusText = new SceneObject<Text>(Fonts.std(text, 22).color(0xffffff).bold().build());
        statusText.addObject(new RepeatingTask(() => new SerialTask(
            new AlphaTask(0, 0.3),
            new AlphaTask(1, 0.3)
        )));
        return statusText;
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

        const notif = new NotificationDialog(message, extraButtonTitle);
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
            for (const poseField of this._poseFields) {
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
                    const poseidx = this._isPipMode ? idx : this._curTargetIndex;

                    const pseudoknots: boolean = this._targetConditions != null
                        && this._targetConditions[0] != null
                        && this._targetConditions[0]['type'] === 'pseudoknot';
                    const score = (sequence: Sequence, pairs: SecStruct) => {
                        Assert.assertIsDefined(this._folder);
                        return this._folder.scoreStructures(
                            sequence, pairs, pseudoknots
                        );
                    };

                    const ublk = this.getCurrentUndoBlock(poseidx);
                    Assert.assertIsDefined(ublk, 'getEnergyDelta is being called where UndoBlocks are unavailable!');

                    const targetPairs: SecStruct | undefined = this._targetPairs
                        ? this._targetPairs[poseidx] : this.getCurrentTargetPairs(poseidx);
                    Assert.assertIsDefined(
                        targetPairs,
                        "This poses's targetPairs are undefined; energy delta cannot be computed!"
                    );
                    const nativePairs: SecStruct = ublk.getPairs(37, pseudoknots);
                    const targetSeq = EPars.constructFullSequence(
                        newField.pose.sequence,
                        ublk.targetOligo,
                        ublk.targetOligos,
                        ublk.targetOligoOrder,
                        ublk.oligoMode
                    );
                    const nativeSeq = EPars.constructFullSequence(
                        newField.pose.sequence,
                        ublk.targetOligo,
                        ublk.targetOligos,
                        ublk.oligoOrder,
                        ublk.oligoMode
                    );

                    return score(targetSeq, targetPairs.getSatisfiedPairs(targetSeq)) - score(nativeSeq, nativePairs);
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
            const numFields: number = this._poseFields.length;
            for (let ii = 0; ii < numFields; ii++) {
                const poseField = this._poseFields[ii];
                poseField.display.position.set((this.posesWidth / numFields) * ii, 0);
                poseField.setSize(this.posesWidth / numFields, Flashbang.stageHeight, true);
                poseField.display.visible = true;
            }
        } else {
            for (let ii = 0; ii < this._poseFields.length; ii++) {
                const poseField = this._poseFields[ii];
                if (ii === 0) {
                    poseField.display.position.set(0, 0);
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

    protected onSetPip(_pipMode: boolean): void {
    }

    protected addPose3D(structureFile: string | File | Blob) {
        const ublk = this.getCurrentUndoBlock(0);
        Assert.assertIsDefined(ublk, "Can't create 3D view - undo state not available");

        const show3d = () => {
            const pose3D = this.showDialog(
                new Pose3DDialog(structureFile, ublk.sequence, ublk.targetPairs, this._poses[0].customNumbering),
                'Pose3DDialog'
            );

            // Already live
            if (!pose3D) return;

            this._pose3D = pose3D;

            this.regs?.add(pose3D.baseHovered.connect((closestIndex) => {
                this._poses.forEach((pose) => {
                    pose.on3DPickingMouseMoved(closestIndex);
                });
            }));
            this.regs?.add(pose3D.baseClicked.connect((closestIndex) => {
                this._poses.forEach((pose) => {
                    pose.simulateMousedownCallback(closestIndex);
                });
            }));
        };

        this._toolbar.addView3DButton();
        this.regs?.add(this._toolbar.view3DButton.clicked.connect(show3d));
        show3d();

        this.regs?.add(this._poses[0].baseHovered.connect(
            (val: number) => this._pose3D?.hover3D(val)
        ));
        this.regs?.add(this._poses[0].baseMarked.connect(
            (val: number) => this._pose3D?.mark3D(val)
        ));
        this.regs?.add(this._poses[0].basesSparked.connect(
            (val: number[]) => this._pose3D?.spark3D(val)
        ));
    }

    protected postScreenshot(screenshot: ArrayBuffer): void {
        this.pushUILock('Screenshot');

        Eterna.client.postScreenshot(screenshot)
            .then((filename) => {
                const url = new URL(filename, Eterna.SERVER_URL);
                const prompt = `Do you want to post <u><a href="${url.href}" target="_blank">this</a></u> screenshot in chat?`;
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
                const menu = this.createContextMenu();
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
        const button = new URLButton('Go to Home', EternaURL.createURL({page: 'home'}));
        button.selectable(false);
        return button;
    }

    private download(filename: string, text: string) {
        const element = document.createElement('a');
        element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`);
        element.setAttribute('download', filename);

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    }

    private letterColorName(letter: string): string {
        if (letter === 'G') {
            return '#FF3333';
        } else if (letter === 'A') {
            return '#FFFF33';
        } else if (letter === 'U') {
            return '#7777FF';
        } else if (letter === 'C') {
            return '#33FF33';
        }
        return '#000000';
    }

    private canDownload(): boolean {
        for (let ii = 0; ii < this._poses.length; ++ii) {
            const cl = this._poses[ii].customLayout;
            if (cl) return true;
        }
        this.showDialog(new NotificationDialog('There is no layout to download'));
        return false;
    }

    protected downloadSVG(): void {
        if (!this.canDownload()) {
            return;
        }
        for (let ii = 0; ii < this._poses.length; ++ii) {
            const cl = this._poses[ii].customLayout;
            if (cl === undefined) continue;
            // width and height: xmax-xmin+20
            // each coord is x-xmin+10
            Assert.assertIsDefined(cl);
            const xmin = Math.min(...cl.map((v) => (v[0] ? v[0] : 0)));
            const xmax = Math.max(...cl.map((v) => (v[0] ? v[0] : 0)));
            const ymin = Math.min(...cl.map((v) => (v[1] ? v[1] : 0)));
            const ymax = Math.max(...cl.map((v) => (v[1] ? v[1] : 0)));
            const width = xmax - xmin + 20;
            const height = ymax - ymin + 20;

            // Maybe set default font size based on distance between letters.
            // Yes -- using pairSpace
            let pairSpace = 45;
            for (let jj = 0; jj < this._poses[ii].secstruct.length; ++jj) {
                if (this._poses[ii].secstruct.isPaired(jj)) {
                    const x1 = cl[jj][0];
                    const y1 = cl[jj][1];
                    if (x1 === null) continue;
                    if (y1 === null) continue;
                    const x2 = cl[this._poses[ii].secstruct.pairingPartner(jj)][0];
                    const y2 = cl[this._poses[ii].secstruct.pairingPartner(jj)][1];
                    if (x2 === null) continue;
                    if (y2 === null) continue;
                    pairSpace = Math.sqrt(
                        (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)
                    );
                }
            }

            let svgText = `<svg width="${width}" height="${height}" >\n`;

            // Add in all letters.
            for (let jj = 0; jj < this._poses[ii].sequence.length; ++jj) {
                const x = cl[jj][0];
                const y = cl[jj][1];
                if (x === null) continue;
                if (y === null) continue;
                const s = this._poses[ii].sequence.sequenceString()[jj];

                svgText += `\t<text text-anchor="middle" x="${x - xmin + 10}" y="${y - ymin + 10}" font-size="${pairSpace / 2}" fill="${this.letterColorName(s)}">${s}</text>\n`;
                // ,${this._poses[ii].sequence.sequenceString()[jj]},${this._poses[ii].targetPairs.pairs[jj]}\n`;
            }

            // Base pairs
            for (let jj = 0; jj < this._poses[ii].sequence.length; ++jj) {
                if (this._poses[ii].secstruct.isPaired(jj)) {
                    const x1 = cl[jj][0];
                    const y1 = cl[jj][1];
                    if (x1 === null) continue;
                    if (y1 === null) continue;
                    const x2 = cl[this._poses[ii].secstruct.pairingPartner(jj)][0];
                    const y2 = cl[this._poses[ii].secstruct.pairingPartner(jj)][1];
                    if (x2 === null) continue;
                    if (y2 === null) continue;

                    // OK: line from "10% to 90%"
                    const p1 = [
                        x1 * 0.8 + x2 * 0.2,
                        y1 * 0.8 + y2 * 0.2
                    ];
                    const p2 = [
                        x1 * 0.2 + x2 * 0.8,
                        y1 * 0.2 + y2 * 0.8
                    ];

                    const d = y1 === y2 ? 0 : pairSpace / 4;

                    svgText += `\t<line x1="${p1[0] - xmin + 10}" y1="${p1[1] - d - ymin + 10}" x2="${p2[0] - xmin + 10}" y2="${p2[1] - d - ymin + 10}" style="stroke:rgb(0,0,0);stroke-width:${pairSpace / 20}" />\n`;
                }
            }

            svgText += '</svg>\n';
            this.download(`${ii}.svg`, svgText);
        }
    }

    protected showCopySequenceDialog(): void {
        let sequenceString = this._poses[0].sequence.sequenceString();
        if (this._poses[0].customNumbering != null) sequenceString += ` ${Utility.arrayToRangeString(this._poses[0].customNumbering)}`;
        this._copySequenceDialog = this.showDialog(
            new CopyTextDialog(sequenceString, 'Current Sequence'),
            'CopySequenceDialog'
        );
    }

    protected updateCopySequenceDialog(): void {
        if (this._copySequenceDialog) {
            let sequenceString = this._poses[0].sequence.sequenceString();
            if (this._poses[0].customNumbering != null) sequenceString += ` ${Utility.arrayToRangeString(this._poses[0].customNumbering)}`;
            this._copySequenceDialog.text = sequenceString;
        }
    }

    protected showPasteSequenceDialog(): void {
        const customNumbering = this._poses[0].customNumbering;
        const pasteDialog = this.showDialog(new PasteSequenceDialog(customNumbering), 'PasteSequenceDialog');
        // Already live
        if (!pasteDialog) return;
        pasteDialog.applyClicked.connect((sequence) => {
            for (const pose of this._poses) {
                pose.pasteSequence(sequence);
            }
        });
    }

    protected findNucleotide(): void {
        const finder = this.showDialog(new NucleotideFinder(), 'NucleotideFinder');
        // Already live
        if (!finder) return;
        finder.jumpClicked.connect((baseNum) => {
            if (this._isPipMode) {
                this._poses.forEach((p) => p.focusNucleotide(baseNum));
            } else {
                this._poses[this._curTargetIndex].focusNucleotide(baseNum);
            }
        });
    }

    protected showNucleotideRange(): void {
        const fullRange: [number, number] = [
            1,
            Math.max(...this._poses.map((p) => p.fullSequenceLength))
        ];
        const initialRange = this._nucleotideRangeToShow ?? fullRange;

        const selector = this.showDialog(
            new NucleotideRangeSelector(fullRange, initialRange),
            'NucleotideRangeSelector'
        );
        // Already live
        if (!selector) return;
        selector.applyClicked.connect((result) => {
            this._nucleotideRangeToShow = [result.start, result.end];
            this._poses.forEach((p) => p.showNucleotideRange(this._nucleotideRangeToShow));
        });
    }

    protected changeExplosionFactor(): void {
        const factorDialog = this.showDialog(
            new ExplosionFactorDialog(this._poseFields[0].explosionFactor),
            'ExplosionFactorDialog'
        );
        // Already live
        if (!factorDialog) return;
        factorDialog.factor.connect((factor) => {
            this._poseFields.forEach((pf) => { pf.explosionFactor = factor; });
        });
    }

    protected _achievements: AchievementManager;

    protected _dialogRef: GameObjectRef = GameObjectRef.NULL;
    protected _uiLockRef: GameObjectRef = GameObjectRef.NULL;
    protected _notifRef: GameObjectRef = GameObjectRef.NULL;
    protected _contextMenuDialogRef: GameObjectRef = GameObjectRef.NULL;
    protected _copySequenceDialog: CopyTextDialog | null = null;

    private _modeScriptInterface: ExternalInterfaceCtx;

    protected _poseFields: PoseField[] = [];
    protected _poses: Pose2D[] = []; // TODO: remove me!
    protected _isPipMode: boolean = false;
    protected _pose3D: Pose3DDialog | null = null;
    protected _toolbar: Toolbar;

    protected _nucleotideRangeToShow: [number, number] | null = null;

    // Things that might or might not be set in children so that getEnergyDelta can get set in setPoseFields
    protected get _folder(): Folder | null {
        return null;
    }

    protected _curTargetIndex: number;
    protected getCurrentUndoBlock(_index: number): UndoBlock | undefined {
        return undefined;
    }

    protected getCurrentTargetPairs(_index: number): SecStruct | undefined {
        return undefined;
    }

    protected _targetPairs: SecStruct[];

    protected _targetConditions: (TargetConditions | undefined)[] = [];
}

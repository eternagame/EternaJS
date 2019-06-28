import * as log from "loglevel";
import {Container, Point, Text, Sprite} from "pixi.js";
import {AppMode, GameObjectRef, HAlign, VAlign} from "flashbang/core";
import { KeyCode } from "flashbang/input";
import {AchievementManager} from "eterna/achievements";
import { Bitmaps, BitmapManager } from "eterna/resources";
import {Tooltips, UILockDialog, SpecBox, GameButton, ConstraintBox, URLButton, EternaViewOptionsMode, Toolbar, HTMLTextObject} from "eterna/ui";
import {Background} from "eterna/vfx";
import { EternaURL } from "eterna/net";
import { ToolbarType } from "eterna/ui/Toolbar";
import Eterna from "eterna/Eterna";
import { Puzzle } from "eterna/puzzle";
import { DisplayUtil } from "flashbang/util";
import Fonts from "eterna/resources/Fonts";
import { ExternalInterface } from "eterna/boosters";
import { ExternalInterfaceCtx } from "eterna/boosters/ExternalInterface";
import { Folder } from "eterna/folding";
import { StateCondition } from "eterna/puzzle/Puzzle";
import DesignPanel from "eterna/diagram/DesignPanel";

type InteractionEvent = PIXI.interaction.InteractionEvent;

interface OligoDef {
    sequence: string;
    malus: number;
    name: string;
    bind?: boolean;
    concentration?: string;
    label?: string;
}

/**
 * Base mode for modes which display RNA
 */
export default abstract class PoseMode extends AppMode {
    public readonly bgLayer = new Container();
    public readonly poseLayer = new Container();
    public readonly uiLayer = new Container();
    public readonly dialogLayer = new Container();
    public readonly notifLayer = new Container();
    public readonly tooltipLayer = new Container();
    public readonly achievementsLayer = new Container();
    public readonly contextMenuLayer = new Container();

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

        this._background = new Background();
        this.addObject(this._background, this.bgLayer);

        // Add our docked SpecBox at the bottom of uiLayer
        this._dockedSpecBox = new SpecBox(true);
        this._dockedSpecBox.display.position = new Point(15, 190);
        this._dockedSpecBox.setSize(155, 251);
        this._dockedSpecBox.display.visible = false;
        this.addObject(this._dockedSpecBox, this.uiLayer, 0);
        this._dockedSpecBox.shouldMaximize.connect(() => this.showSpec());

        this._undockSpecBoxButton = new GameButton()
            .allStates(Bitmaps.ImgMaximize)
            .tooltip("Re-maximize")
            .hotkey(KeyCode.KeyM);
        this._undockSpecBoxButton.clicked.connect(() => {
            this._dockedSpecBox.display.visible = false;
            this.showSpec();
        });
        this._dockedSpecBox.addObject(this._undockSpecBoxButton, this._dockedSpecBox.container);

        this._targetName = Fonts.stdRegular("", 18).build();
        this._targetName.visible = false;
        this.uiLayer.addChild(this._targetName);

        this._homeButton = new URLButton("Go to Home", EternaURL.createURL({page: "lab_bench"}));
        this._homeButton.selectable(false);
        this._homeButton.hideWhenModeInactive();
        this.addObject(this._homeButton, this.uiLayer);

        this._asyncText = Fonts.arial("folding...", 12).bold().color(0xffffff).build();
        this._asyncText.position = new Point(16, 200);
        this.dialogLayer.addChild(this._asyncText);
        this._asyncText.visible = false;

        this._toolbar = new Toolbar(this._toolbarType, {} /* TODO: Additional parameters */);
        this.addObject(this._toolbar, this.uiLayer);
        this._toolbar.zoomInButton.clicked.connect(() => this.zoomIn());
        this._toolbar.zoomOutButton.clicked.connect(() => this.zoomOut());
        this._toolbar.pipButton.clicked.connect(() => this.togglePip());
        this._toolbar.stateToggle.stateChanged.connect((newState: number) => this.changeState(newState));
        this._toolbar.targetButton.clicked.connect(() => this.toggleMode());
        this._toolbar.viewOptionsButton.clicked.connect(() => this.showViewOptionsDialog(this._viewOptionsMode));
        this._toolbar.screenshotButton.clicked.connect(() => this.postScreenshot());
        this._toolbar.specButton.clicked.connect(() => this.showSpec());

        /*for (let condition of this._puzzle.stateConditions) {
            this._poseFields.push(this.createPose(condition));
        }*/

        Eterna.settings.pipEnabled.connectNotify((enabled: boolean) => {
            if (enabled) {
                this._designPanels = this._puzzle.stateConditions.map(() => this.createDesignPanel());
                //this._designPanels.foreach((panel, i) => panel.state = this._puzzle.stateConditions[i])
                //autorun(() => this._designPanels.foreach(panel => panel.mode = mode));
            }
        });

        this.layoutPoseFields();

        let puzzleIcon = new Sprite(BitmapManager.getBitmap(Bitmaps.NovaPuzzleImg));
        puzzleIcon.position = new Point(11, 8);
        this.uiLayer.addChild(puzzleIcon);

        let puzzleTitle = new HTMLTextObject(this._puzzle.linkedName)
            .font(Fonts.ARIAL)
            .fontSize(14)
            .bold()
            .selectable(false)
            .color(0xffffff);
        puzzleTitle.hideWhenModeInactive();
        this.addObject(puzzleTitle, this.uiLayer);

        DisplayUtil.positionRelative(
            puzzleTitle.display, HAlign.LEFT, VAlign.CENTER,
            puzzleIcon, HAlign.RIGHT, VAlign.CENTER, 3, 0
        );

        this._solutionTitle = Fonts.arial("", 14).bold().color(0xc0c0c0).build();
        this.uiLayer.addChild(this._solutionTitle);
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

    protected abstract toggleMode(): void;

    protected zoomIn(): void {
        for (let poseField of this._poseFields) {
            poseField.zoomIn();
        }
    }
    protected zoomOut(): void {
        for (let poseField of this._poseFields) {
            poseField.zoomOut();
        }
    }

    protected loadDesignBrowser(puzzleOrID: number|Puzzle): void {
        this.pushUILock();
        Eterna.app.switchToDesignBrowser(puzzleOrID)
            .then(() => this.popUILock())
            .catch((e) => {
                log.error(e);
                this.popUILock();
            });
    }

    protected createDesignPanel(): DesignPanel {
        /*let poseField = new PoseField(this._posesEditable);
        let pose: Pose2D = poseField.pose;

        this.addObject(poseField, this.poseLayer);

        pose.mousedownCallback = (e: InteractionEvent, closestIndex: number): void => {
            for (let {pose: propogatePose} of this._poseFields) {
                if (propogatePose !== pose) {
                    pose.onPoseMouseDownPropagated(e, closestIndex);
                }
            }
        };
        pose.getEnergyDelta = (): number => this.getEnergyDelta();

        return poseField;*/
    }

    // TODO
    private togglePip(): void {}
    private changeState(newState: number): void {}
    private showViewOptionsDialog(mode: EternaViewOptionsMode): void {};
    private postScreenshot(): void {}
    private showSpec(): void {}
    private getEnergyDelta(): number {} // Probably needs to be different between PoseEdit and Feedback
    protected layoutPoseFields(): void {}

    protected _achievements: AchievementManager;
    private _modeScriptInterface: ExternalInterfaceCtx;
    
    private _background: Background;
    protected _uiLockRef: GameObjectRef = GameObjectRef.NULL;
    private _dockedSpecBox: SpecBox;
    private _undockSpecBoxButton: GameButton;
    protected _toolbar: Toolbar;
    protected abstract readonly _toolbarType: ToolbarType;
    protected abstract readonly _viewOptionsMode: EternaViewOptionsMode;

    private _homeButton: URLButton;
    private _targetName: Text;
    private _asyncText: Text;
    protected _solutionTitle: Text;
    
    //protected _poseFields: PoseField[];
    protected _designPanels: DesignPanel[];
    protected abstract readonly _posesEditable: boolean;

    protected _puzzle: Puzzle;
    private _folder: Folder;
}
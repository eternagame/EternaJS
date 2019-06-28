import { Graphics, Container, Point } from "pixi.js";
import { RegistrationGroup, Value } from "signals";
import { Flashbang, HAlign, VAlign } from "flashbang/core";
import { KeyCode } from "flashbang/input";
import { HLayoutContainer } from "flashbang/layout";
import { ContainerObject } from "flashbang/objects";
import { LocationTask } from "flashbang/tasks";
import { Easing, DisplayUtil } from "flashbang/util";
import Eterna from "eterna/Eterna";
import { Bitmaps } from "eterna/resources";
import { RScriptUIElementID } from "eterna/rscript";
import { BoostersData } from "eterna/puzzle";
import { NucleotidePalette, GameButton, ToggleBar, EternaMenu, EternaMenuStyle } from ".";
import { Booster } from "eterna/mode-old/PoseEdit";
import {PoseMode} from "eterna/mode";

export enum ToolbarType {
    PUZZLE,
    PUZZLEMAKER,
    PUZZLEMAKER_EMBEDDED,
    LAB,
    FEEDBACK
}

export default class Toolbar extends ContainerObject {
    // Core
    public zoomInButton: GameButton;
    public zoomOutButton: GameButton;
    public pipButton: GameButton;
    public stateToggle: ToggleBar;

    public targetButton: GameButton;

    public viewOptionsButton: GameButton;

    public screenshotButton: GameButton;

    public specButton: GameButton;

    public actionMenu: EternaMenu;

    // Pose Editing
    public palette: NucleotidePalette;
    public pairSwapButton: GameButton;

    public naturalButton: GameButton;

    public undoButton: GameButton;
    public redoButton: GameButton;
    public resetButton: GameButton;

    public copyButton: GameButton;
    public pasteButton: GameButton;

    public freezeButton: GameButton;

    public boostersMenu: GameButton;

    public dynPaintTools: GameButton[] = [];
    public dynActionTools: GameButton[] = [];

    // Puzzle Maker
    public addbaseButton: GameButton;
    public addpairButton: GameButton;
    public deleteButton: GameButton;
    public lockButton: GameButton;
    public moleculeButton: GameButton;

    // Puzzle Solving
    public hintButton: GameButton;

    // Feedback
    public estimateButton: GameButton;
    public letterColorButton: GameButton;
    public expColorButton: GameButton;

    // Lab + Feedback
    public viewSolutionsButton: GameButton;

    // Puzzle Maker + Lab
    public submitButton: GameButton;

    constructor(type: ToolbarType,
        {states=1, showHint=false, boosters=null}: {states?: number, showHint?: boolean, boosters?: BoostersData}
    ) {
        super();
        this._type = type;
        this._states = states;
        this._showHint = showHint;
        this._boostersData = boosters;
    }

    protected added(): void {
        super.added();

        this.regs.add(Eterna.settings.autohideToolbar.connectNotify((value) => {
            this.setToolbarAutohide(value);
        }));

        const SPACE_NARROW = 7;
        const SPACE_WIDE = 25;

        this._invisibleBackground = new Graphics();
        this._invisibleBackground
            .beginFill(0, 0)
            .drawRect(0, 0, Flashbang.stageWidth, 100)
            .endFill();
        this._invisibleBackground.y = -this._invisibleBackground.height;
        this.container.addChild(this._invisibleBackground);

        this._content = new Container();
        this.container.addChild(this._content);

        this._toolbarLayout = new HLayoutContainer();
        this._content.addChild(this._toolbarLayout);

        this.actionMenu = new EternaMenu(EternaMenuStyle.PULLUP);
        this.addObject(this.actionMenu, this._toolbarLayout);
        this.actionMenu.addMenuButton(new GameButton().allStates(Bitmaps.NovaMenu).disabled(null));

        this.screenshotButton = new GameButton()
            .allStates(Bitmaps.ImgScreenshot)
            .disabled(null)
            .label("Screenshot", 14)
            .scaleBitmapToLabel()
            .tooltip("Screenshot");
        this.actionMenu.addSubMenuButton(0, this.screenshotButton);

        this.viewOptionsButton = new GameButton()
            .allStates(Bitmaps.ImgSettings)
            .disabled(null)
            .label("Settings", 14)
            .scaleBitmapToLabel()
            .tooltip("Game options");
        this.actionMenu.addSubMenuButton(0, this.viewOptionsButton);

        if (this._type == ToolbarType.LAB || this._type == ToolbarType.FEEDBACK) {
            this.viewSolutionsButton = new GameButton()
                .allStates(Bitmaps.ImgFile)
                .disabled(null)
                .label("Designs", 14)
                .scaleBitmapToLabel()
                .tooltip("View all submitted designs for this puzzle.");
            this.actionMenu.addSubMenuButton(0, this.viewSolutionsButton);
        }

        this.specButton = new GameButton()
            .allStates(Bitmaps.ImgSpec)
            .disabled(null)
            .label("Specs", 14)
            .scaleBitmapToLabel()
            .tooltip("View RNA's melting point, dotplot and other specs")
            .hotkey(KeyCode.KeyS);
        this.actionMenu.addSubMenuButton(0, this.specButton);

        if (this._type != ToolbarType.FEEDBACK) {
            this.resetButton = new GameButton()
                .allStates(Bitmaps.ImgReset)
                .disabled(null)
                .label("Reset", 14)
                .scaleBitmapToLabel()
                .tooltip("Reset and try this puzzle again.")
                .rscriptID(RScriptUIElementID.RESET);
            this.actionMenu.addSubMenuButton(0, this.resetButton);

            this.copyButton = new GameButton()
                .allStates(Bitmaps.ImgCopy)
                .disabled(null)
                .label("Copy", 14)
                .scaleBitmapToLabel()
                .tooltip("Copy the current sequence");
            this.actionMenu.addSubMenuButton(0, this.copyButton);

            this.pasteButton = new GameButton()
                .allStates(Bitmaps.ImgPaste)
                .disabled(null)
                .label("Paste", 14)
                .scaleBitmapToLabel()
                .tooltip("Type in a sequence");
            this.actionMenu.addSubMenuButton(0, this.pasteButton);
        }

        if (this._boostersData != null && this._boostersData.actions != null) {
            this.boostersMenu = new GameButton().allStates(Bitmaps.NovaBoosters).disabled(null);
            let boosterMenuIdx = this.actionMenu.addMenuButton(this.boostersMenu);
            for (let ii = 0; ii < this._boostersData.actions.length; ii++) {
                let data = this._boostersData.actions[ii];
                Booster.create(this.mode as PoseMode, data).then((booster) => {
                    let button: GameButton = booster.createButton(14);
                    button.clicked.connect(() => booster.onRun());
                    this.actionMenu.addSubMenuButtonAt(boosterMenuIdx, button, ii);
                    this.dynActionTools.push(button);
                });
            }
        }

        if (this._type == ToolbarType.LAB) {
            this.submitButton = new GameButton()
                .up(Bitmaps.ImgSubmit)
                .over(Bitmaps.ImgSubmitOver)
                .down(Bitmaps.ImgSubmitHit)
                .tooltip("Publish your solution!");
            this._toolbarLayout.addHSpacer(SPACE_NARROW);
            this.addObject(this.submitButton, this._toolbarLayout);
        }

        if (this._states > 1) {
            this.pipButton = new GameButton()
                .up(Bitmaps.ImgPip)
                .over(Bitmaps.ImgPipOver)
                .down(Bitmaps.ImgPipHit)
                .tooltip("Set PiP mode")
                .hotkey(KeyCode.KeyP)
                .rscriptID(RScriptUIElementID.PIP);
            this.addObject(this.pipButton, this._toolbarLayout);
            this._toolbarLayout.addHSpacer(SPACE_NARROW);
        }

        if (this._type != ToolbarType.PUZZLEMAKER_EMBEDDED) {
            if (this._type != ToolbarType.FEEDBACK) {
                this.naturalButton = new GameButton()
                    .up(Bitmaps.ImgNative)
                    .over(Bitmaps.ImgNativeOver)
                    .down(Bitmaps.ImgNativeSelected)
                    .selected(Bitmaps.ImgNativeSelected)
                    .tooltip("Natural Mode. RNA folds into the most stable shape.")
                    .rscriptID(RScriptUIElementID.TOGGLENATURAL);
                this.addObject(this.naturalButton, this._toolbarLayout);
            } else {
                this.estimateButton = new GameButton()
                    .up(Bitmaps.ImgEstimate)
                    .over(Bitmaps.ImgEstimateOver)
                    .down(Bitmaps.ImgEstimateSelected)
                    .selected(Bitmaps.ImgEstimateSelected)
                    .tooltip("Estimate Mode. The game approximates how the RNA actually folded in a test tube.");
                this.addObject(this.estimateButton, this._toolbarLayout);
            }

            this.targetButton = new GameButton()
                .up(Bitmaps.ImgTarget)
                .over(Bitmaps.ImgTargetOver)
                .down(Bitmaps.ImgTargetSelected)
                .selected(Bitmaps.ImgTargetSelected)
                .tooltip("Target Mode. RNA freezes into the desired shape.")
                .rscriptID(RScriptUIElementID.TOGGLETARGET);
            this.addObject(this.targetButton, this._toolbarLayout);
        }

        if (this._type == ToolbarType.FEEDBACK) {
            this._toolbarLayout.addHSpacer(SPACE_NARROW);

            this.letterColorButton = new GameButton()
                .up(Bitmaps.ImgColoring)
                .over(Bitmaps.ImgColoringOver)
                .down(Bitmaps.ImgColoringSelected)
                .selected(Bitmaps.ImgColoringSelected)
                .tooltip("Color sequences based on base colors as in the game.");
            this.letterColorButton.toggled.value = false;
            this.addObject(this.letterColorButton, this._toolbarLayout);

            this.expColorButton = new GameButton()
                .up(Bitmaps.ImgFlask)
                .over(Bitmaps.ImgFlaskOver)
                .down(Bitmaps.ImgFlaskSelected)
                .selected(Bitmaps.ImgFlaskSelected)
                .tooltip("Color sequences based on experimental data.");
            this.expColorButton.toggled.value = true;
            this.addObject(this.expColorButton, this._toolbarLayout);
        }

        if (this._type != ToolbarType.FEEDBACK) {
            this._toolbarLayout.addHSpacer(SPACE_WIDE);

            this.freezeButton = new GameButton()
                .up(Bitmaps.ImgFreeze)
                .over(Bitmaps.ImgFreezeOver)
                .down(Bitmaps.ImgFreezeSelected)
                .selected(Bitmaps.ImgFreezeSelected)
                .tooltip("Frozen mode. Suspends/resumes folding engine calculations.")
                .hotkey(KeyCode.KeyF)
                .rscriptID(RScriptUIElementID.FREEZE);
            this.addObject(this.freezeButton, this._toolbarLayout);
            this._toolbarLayout.addHSpacer(SPACE_NARROW);
            this.freezeButton.display.visible = Eterna.settings.freezeButtonAlwaysVisible.value;
            this.regs.add(Eterna.settings.freezeButtonAlwaysVisible.connect((visible) => {
                this.freezeButton.display.visible = visible;
                this.updateLayout();
            }));

            this.palette = new NucleotidePalette();
            this.addObject(this.palette, this._toolbarLayout);
            this.palette.changeDefaultMode();

            this._toolbarLayout.addHSpacer(SPACE_NARROW);

            this.pairSwapButton = new GameButton()
                .up(Bitmaps.ImgSwap)
                .over(Bitmaps.ImgSwapOver)
                .down(Bitmaps.ImgSwapOver)
                .selected(Bitmaps.ImgSwapSelect)
                .hotkey(KeyCode.Digit5)
                .tooltip("Swap paired bases.")
                .rscriptID(RScriptUIElementID.SWAP);
            this.addObject(this.pairSwapButton, this._toolbarLayout);

            if (this._boostersData != null && this._boostersData.paint_tools != null) {
                let mode: PoseMode = this.mode as PoseMode;
                let boosterPaintToolsLayout = new HLayoutContainer();
                this._toolbarLayout.addHSpacer(SPACE_NARROW);
                this._toolbarLayout.addChild(boosterPaintToolsLayout);
                for (let data of this._boostersData.paint_tools) {
                    Booster.create(mode, data).then((booster) => {
                        booster.onLoad();
                        let button: GameButton = booster.createButton();
                        button.clicked.connect(() => {
                            mode.setPosesColor(booster.toolColor);
                            mode.deselectAllColorings();
                        });
                        this.dynPaintTools.push(button);
                        this.addObject(button, boosterPaintToolsLayout);
                        this.updateLayout();
                    });
                }
            }
        }

        if (this._type == ToolbarType.PUZZLEMAKER || this._type == ToolbarType.PUZZLEMAKER_EMBEDDED) {
            this.addbaseButton = new GameButton()
                .up(Bitmaps.ImgAddBase)
                .over(Bitmaps.ImgAddBaseOver)
                .down(Bitmaps.ImgAddBaseSelect)
                .selected(Bitmaps.ImgAddBaseSelect)
                .hotkey(KeyCode.Digit6)
                .tooltip("Add a single base.");
            this.addObject(this.addbaseButton, this._toolbarLayout);

            this.addpairButton = new GameButton()
                .up(Bitmaps.ImgAddPair)
                .over(Bitmaps.ImgAddPairOver)
                .down(Bitmaps.ImgAddPairSelect)
                .selected(Bitmaps.ImgAddPairSelect)
                .hotkey(KeyCode.Digit7)
                .tooltip("Add a pair.");
            this.addObject(this.addpairButton, this._toolbarLayout);

            this.deleteButton = new GameButton()
                .up(Bitmaps.ImgErase)
                .over(Bitmaps.ImgEraseOver)
                .down(Bitmaps.ImgEraseSelect)
                .selected(Bitmaps.ImgEraseSelect)
                .hotkey(KeyCode.Digit8)
                .tooltip("Delete a base or a pair.");
            this.addObject(this.deleteButton, this._toolbarLayout);

            this.lockButton = new GameButton()
                .up(Bitmaps.ImgLock)
                .over(Bitmaps.ImgLockOver)
                .down(Bitmaps.ImgLockSelect)
                .selected(Bitmaps.ImgLockSelect)
                .hotkey(KeyCode.Digit9)
                .tooltip("Lock or unlock a base.");
            this.addObject(this.lockButton, this._toolbarLayout);

            this.moleculeButton = new GameButton()
                .up(Bitmaps.ImgMolecule)
                .over(Bitmaps.ImgMoleculeOver)
                .down(Bitmaps.ImgMoleculeSelect)
                .selected(Bitmaps.ImgMoleculeSelect)
                .hotkey(KeyCode.Digit0)
                .tooltip("Create or remove a molecular binding site.");
            this.addObject(this.moleculeButton, this._toolbarLayout);
        }

        this._toolbarLayout.addHSpacer(SPACE_WIDE);

        this.zoomInButton = new GameButton()
            .up(Bitmaps.ImgZoomIn)
            .over(Bitmaps.ImgZoomInOver)
            .down(Bitmaps.ImgZoomInHit)
            .disabled(Bitmaps.ImgZoomInDisable)
            .tooltip("Zoom in")
            .hotkey(KeyCode.Equal)
            .rscriptID(RScriptUIElementID.ZOOMIN);
        this.addObject(this.zoomInButton, this._toolbarLayout);

        this.zoomOutButton = new GameButton()
            .up(Bitmaps.ImgZoomOut)
            .over(Bitmaps.ImgZoomOutOver)
            .down(Bitmaps.ImgZoomOutHit)
            .disabled(Bitmaps.ImgZoomOutDisable)
            .tooltip("Zoom out")
            .hotkey(KeyCode.Minus)
            .rscriptID(RScriptUIElementID.ZOOMOUT);
        this.addObject(this.zoomOutButton, this._toolbarLayout);

        if (this._type != ToolbarType.FEEDBACK) {
            this.undoButton = new GameButton()
                .up(Bitmaps.ImgUndo)
                .over(Bitmaps.ImgUndoOver)
                .down(Bitmaps.ImgUndoHit)
                .tooltip("Undo")
                .hotkey(KeyCode.KeyZ)
                .rscriptID(RScriptUIElementID.UNDO);
            this.addObject(this.undoButton, this._toolbarLayout);

            this.redoButton = new GameButton()
                .up(Bitmaps.ImgRedo)
                .over(Bitmaps.ImgRedoOver)
                .down(Bitmaps.ImgRedoHit)
                .tooltip("Redo")
                .hotkey(KeyCode.KeyY)
                .rscriptID(RScriptUIElementID.REDO);
            this.addObject(this.redoButton, this._toolbarLayout);
        }

        if (this._showHint) {
            this.hintButton = new GameButton()
                .up(Bitmaps.ImgHint)
                .over(Bitmaps.ImgHintOver)
                .down(Bitmaps.ImgHintHit)
                .hotkey(KeyCode.KeyH)
                .tooltip("Hint")
                .rscriptID(RScriptUIElementID.HINT);
            this.addObject(this.hintButton, this._toolbarLayout);
        }

        if (this._type == ToolbarType.PUZZLEMAKER) {
            this.submitButton = new GameButton()
                .up(Bitmaps.ImgSubmit)
                .over(Bitmaps.ImgSubmitOver)
                .down(Bitmaps.ImgSubmitHit)
                .tooltip("Publish your puzzle!");
                this.addObject(this.submitButton, this._toolbarLayout);
        }

        this.stateToggle = new ToggleBar(this._states);
        if (this._states > 1) {
            // We create the puzzleStateToggle even if we don't add it to the mode,
            // as scripts may rely on its existence
            this.addObject(this.stateToggle, this._content);
        }

        this.updateLayout();
        this._uncollapsedContentLoc = new Point(this._content.position.x, this._content.position.y);
    }

    private updateLayout(): void {
        this._toolbarLayout.layout(true);

        if (this.stateToggle.isLiveObject) {
            DisplayUtil.positionRelative(
                this.stateToggle.display, HAlign.CENTER, VAlign.BOTTOM,
                this._toolbarLayout, HAlign.CENTER, VAlign.TOP, 0, -5
            );
        }

        // If we have no boosters menu, we offset our entire layout by the .5 width of
        // the boosters button. The tutorial hardcodes screen locations for its
        // point-at-toolbar-buttons tips, so everything needs to be laid out *just so*,
        // unfortunately.
        let hOffset = (this.boostersMenu == null ? 27 : 0);

        DisplayUtil.positionRelative(
            this._content, HAlign.CENTER, VAlign.BOTTOM,
            this._invisibleBackground, HAlign.CENTER, VAlign.BOTTOM,
            hOffset, 0
        );
    }

    public setToolbarAutohide(enabled: boolean): void {
        const COLLAPSE_ANIM = "CollapseAnim";
        if (enabled) {
            this.display.interactive = true;

            let collapsed = false;

            const uncollapse = () => {
                if (collapsed) {
                    collapsed = false;
                    this.removeNamedObjects(COLLAPSE_ANIM);
                    this.addNamedObject(
                        COLLAPSE_ANIM,
                        new LocationTask(
                            this._uncollapsedContentLoc.x,
                            this._uncollapsedContentLoc.y,
                            0.25, Easing.easeOut, this._content
                        )
                    );
                }
            };

            const collapse = () => {
                if (!collapsed) {
                    collapsed = true;
                    this.removeNamedObjects(COLLAPSE_ANIM);
                    this.addNamedObject(
                        COLLAPSE_ANIM,
                        new LocationTask(
                            this._uncollapsedContentLoc.x,
                            this._uncollapsedContentLoc.y + 72,
                            0.25, Easing.easeOut, this._content
                        )
                    );
                }
            };

            this._autoCollapseRegs = new RegistrationGroup();
            this._autoCollapseRegs.add(this.pointerOver.connect(uncollapse));
            this._autoCollapseRegs.add(this.pointerOut.connect(collapse));

            collapse();
        } else {
            if (this._autoCollapseRegs != null) {
                this._autoCollapseRegs.close();
                this._autoCollapseRegs = null;
            }

            this.removeNamedObjects(COLLAPSE_ANIM);
            this._content.position = this._uncollapsedContentLoc;
            this.display.interactive = false;
        }
    }

    private readonly _type: ToolbarType;
    private readonly _states: number;
    private readonly _showHint: boolean;
    private readonly _boostersData: BoostersData;
    
    private _invisibleBackground: Graphics;
    private _content: Container;
    private _toolbarLayout: HLayoutContainer;

    private _uncollapsedContentLoc: Point;
    private _autoCollapseRegs: RegistrationGroup;
}
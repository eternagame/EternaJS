import {Container, Graphics, Point} from "pixi.js";
import {HAlign, VAlign} from "../../../flashbang/core/Align";
import {Flashbang} from "../../../flashbang/core/Flashbang";
import {KeyCode} from "../../../flashbang/input/KeyCode";
import {HLayoutContainer} from "../../../flashbang/layout/HLayoutContainer";
import {ContainerObject} from "../../../flashbang/objects/ContainerObject";
import {LocationTask} from "../../../flashbang/tasks/LocationTask";
import {DisplayUtil} from "../../../flashbang/util/DisplayUtil";
import {Easing} from "../../../flashbang/util/Easing";
import {RegistrationGroup} from "../../../signals/RegistrationGroup";
import {Eterna} from "../../Eterna";
import {BoostersData, Puzzle, PuzzleType} from "../../puzzle/Puzzle";
import {Bitmaps} from "../../resources/Bitmaps";
import {RScriptUIElementID} from "../../rscript/RScriptUIElement";
import {EternaMenu, EternaMenuStyle} from "../../ui/EternaMenu";
import {GameButton} from "../../ui/GameButton";
import {NucleotidePalette} from "../../ui/NucleotidePalette";
import {ToggleBar} from "../../ui/ToggleBar";
import {ExternalInterfaceCtx} from "../../util/ExternalInterface";
import {Booster} from "./Booster";
import {PoseEditMode} from "./PoseEditMode";

export class PoseEditToolbar extends ContainerObject {
    public palette: NucleotidePalette;

    public nativeButton: GameButton;
    public targetButton: GameButton;
    public pipButton: GameButton;
    public freezeButton: GameButton;

    public puzzleStateToggle: ToggleBar;

    public actionMenu: EternaMenu;
    public boostersMenu: GameButton;
    public undoButton: GameButton;
    public redoButton: GameButton;
    public zoomInButton: GameButton;
    public zoomOutButton: GameButton;
    public copyButton: GameButton;
    public pasteButton: GameButton;
    public viewOptionsButton: GameButton;
    public retryButton: GameButton;
    public specButton: GameButton;
    public screenshotButton: GameButton;

    public pairSwapButton: GameButton;
    public hintButton: GameButton;
    public dynPaintTools: GameButton[] = [];
    public dynActionTools: GameButton[] = [];

    public submitButton: GameButton;
    public viewSolutionsButton: GameButton;

    public constructor(puz: Puzzle, scriptInterface: ExternalInterfaceCtx) {
        super();
        this._puzzle = puz;
        this._scriptInterface = scriptInterface;
    }

    protected added(): void {
        super.added();

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

        const isExperimental = this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL;

        this.actionMenu = new EternaMenu(EternaMenuStyle.PULLUP);
        this.addObject(this.actionMenu, this._toolbarLayout);

        // ACTION MENU
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

        this.viewSolutionsButton = new GameButton()
            .allStates(Bitmaps.ImgFile)
            .disabled(null)
            .label("Designs", 14)
            .scaleBitmapToLabel()
            .tooltip("View all submitted designs for this puzzle.");

        this.specButton = new GameButton()
            .allStates(Bitmaps.ImgSpec)
            .disabled(null)
            .label("Specs", 14)
            .scaleBitmapToLabel()
            .tooltip("View RNA's melting point, dotplot and other specs")
            .hotkey(KeyCode.KeyS);

        if (isExperimental) {
            this.actionMenu.addSubMenuButton(0, this.viewSolutionsButton);
            this.actionMenu.addSubMenuButton(0, this.specButton);
        }

        this.retryButton = new GameButton()
            .allStates(Bitmaps.ImgReset)
            .disabled(null)
            .label("Reset", 14)
            .scaleBitmapToLabel()
            .tooltip("Reset and try this puzzle again.")
            .rscriptID(RScriptUIElementID.RESET);
        this.actionMenu.addSubMenuButton(0, this.retryButton);

        this.copyButton = new GameButton()
            .allStates(Bitmaps.ImgCopy)
            .disabled(null)
            .label("Copy", 14)
            .scaleBitmapToLabel()
            .tooltip("Copy the current sequence");

        this.pasteButton = new GameButton()
            .allStates(Bitmaps.ImgPaste)
            .disabled(null)
            .label("Paste", 14)
            .scaleBitmapToLabel()
            .tooltip("Type in a sequence");

        if (this._puzzle.puzzleType !== PuzzleType.BASIC) {
            this.actionMenu.addSubMenuButton(0, this.copyButton);
            this.actionMenu.addSubMenuButton(0, this.pasteButton);
        }

        // BOOSTERS
        let boostersData: BoostersData = this._puzzle.boosters;
        if (boostersData) {
            let mode: PoseEditMode = this.mode as PoseEditMode;

            if (boostersData.paint_tools != null) {
                let boosterPaintToolsLayout = new HLayoutContainer();
                this._toolbarLayout.addHSpacer(SPACE_NARROW);
                this._toolbarLayout.addChild(boosterPaintToolsLayout);
                for (let data of boostersData.paint_tools) {
                    Booster.create(mode, this._scriptInterface, data).then(booster => {
                        booster.onLoad();
                        let button: GameButton = booster.createButton();
                        button.clicked.connect(() => {
                            mode.setPosesColor(booster.toolColor);
                            mode.deselectAllColorings();
                            button.toggled.value = true;
                        });
                        this.dynPaintTools.push(button);
                        this.addObject(button, boosterPaintToolsLayout);
                        this.updateLayout();
                    });
                }
            }

            if (boostersData.actions != null) {
                this.boostersMenu = new GameButton().allStates(Bitmaps.NovaBoosters).disabled(null);
                let boosterMenuIdx = this.actionMenu.addMenuButton(this.boostersMenu);
                for (let ii = 0; ii < boostersData.actions.length; ii++) {
                    let data = boostersData.actions[ii];
                    Booster.create(mode, this._scriptInterface, data).then(booster => {
                        let button: GameButton = booster.createButton(14);
                        button.clicked.connect(() => booster.onRun());
                        this.actionMenu.addSubMenuButtonAt(boosterMenuIdx, button, ii);
                        this.dynActionTools.push(button);
                    });
                }
            }
        }

        // SUBMIT BUTTON
        this.submitButton = new GameButton()
            .up(Bitmaps.ImgSubmit)
            .over(Bitmaps.ImgSubmitOver)
            .down(Bitmaps.ImgSubmitHit)
            .tooltip("Publish your solution!");
        if (isExperimental) {
            this._toolbarLayout.addHSpacer(SPACE_NARROW);
            this.addObject(this.submitButton, this._toolbarLayout);
        }

        this._toolbarLayout.addHSpacer(SPACE_WIDE);

        // PIP BUTTON
        this.pipButton = new GameButton()
            .up(Bitmaps.ImgPip)
            .over(Bitmaps.ImgPipOver)
            .down(Bitmaps.ImgPipHit)
            .tooltip("Set PiP mode")
            .hotkey(KeyCode.KeyP)
            .rscriptID(RScriptUIElementID.PIP);
        if (this._puzzle.getSecstructs().length > 1) {
            this.addObject(this.pipButton, this._toolbarLayout);
            this._toolbarLayout.addHSpacer(SPACE_NARROW);
        }

        // FREEZE
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
        this.regs.add(Eterna.settings.freezeButtonAlwaysVisible.connect(visible => {
            this.freezeButton.display.visible = visible;
            this.updateLayout();
        }));

        // NATIVE
        this.nativeButton = new GameButton()
            .up(Bitmaps.ImgNative)
            .over(Bitmaps.ImgNativeOver)
            .down(Bitmaps.ImgNativeSelected)
            .selected(Bitmaps.ImgNativeSelected)
            .tooltip("Natural Mode. RNA folds into the most stable shape.")
            .rscriptID(RScriptUIElementID.TOGGLENATURAL);
        this.addObject(this.nativeButton, this._toolbarLayout);

        // TARGET
        this.targetButton = new GameButton()
            .up(Bitmaps.ImgTarget)
            .over(Bitmaps.ImgTargetOver)
            .down(Bitmaps.ImgTargetSelected)
            .selected(Bitmaps.ImgTargetSelected)
            .tooltip("Target Mode. RNA freezes into the desired shape.")
            .rscriptID(RScriptUIElementID.TOGGLETARGET);
        this.addObject(this.targetButton, this._toolbarLayout);

        this._toolbarLayout.addHSpacer(SPACE_WIDE);

        // PALETTE
        this.palette = new NucleotidePalette();
        this.addObject(this.palette, this._toolbarLayout);
        if (this._puzzle.isPalleteAllowed) {
            if (this._puzzle.isPairBrushAllowed) {
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
            } else {
                this.palette.changeNoPairMode();
            }
        } else {
            this.palette.enabled = false;
        }

        // ZOOM IN, ZOOM OUT, UNDO, REDO
        this.zoomInButton = new GameButton()
            .up(Bitmaps.ImgZoomIn)
            .over(Bitmaps.ImgZoomInOver)
            .down(Bitmaps.ImgZoomInHit)
            .disabled(Bitmaps.ImgZoomInDisable)
            .tooltip("Zoom in")
            .hotkey(KeyCode.Equal)
            .rscriptID(RScriptUIElementID.ZOOMIN);

        this.zoomOutButton = new GameButton()
            .up(Bitmaps.ImgZoomOut)
            .over(Bitmaps.ImgZoomOutOver)
            .down(Bitmaps.ImgZoomOutHit)
            .disabled(Bitmaps.ImgZoomOutDisable)
            .tooltip("Zoom out")
            .hotkey(KeyCode.Minus)
            .rscriptID(RScriptUIElementID.ZOOMOUT);

        this.undoButton = new GameButton()
            .up(Bitmaps.ImgUndo)
            .over(Bitmaps.ImgUndoOver)
            .down(Bitmaps.ImgUndoHit)
            .tooltip("Undo")
            .hotkey(KeyCode.KeyZ)
            .rscriptID(RScriptUIElementID.UNDO);

        this.redoButton = new GameButton()
            .up(Bitmaps.ImgRedo)
            .over(Bitmaps.ImgRedoOver)
            .down(Bitmaps.ImgRedoHit)
            .tooltip("Redo")
            .hotkey(KeyCode.KeyY)
            .rscriptID(RScriptUIElementID.REDO);

        if (this._puzzle.isUndoZoomAllowed) {
            this._toolbarLayout.addHSpacer(SPACE_WIDE);
            this.addObject(this.zoomInButton, this._toolbarLayout);
            this.addObject(this.zoomOutButton, this._toolbarLayout);

            this._toolbarLayout.addHSpacer(SPACE_NARROW);
            this.addObject(this.undoButton, this._toolbarLayout);
            this.addObject(this.redoButton, this._toolbarLayout);
        }

        this.hintButton = new GameButton()
            .up(Bitmaps.ImgHint)
            .over(Bitmaps.ImgHintOver)
            .down(Bitmaps.ImgHintHit)
            .hotkey(KeyCode.KeyH)
            .tooltip("Hint")
            .rscriptID(RScriptUIElementID.HINT);
        if (this._puzzle.hint != null) {
            this.addObject(this.hintButton, this._toolbarLayout);
        }

        // TOGGLE_BAR
        let target_secstructs: string[] = this._puzzle.getSecstructs();
        this.puzzleStateToggle = new ToggleBar(target_secstructs.length);
        if (target_secstructs.length > 1) {
            // We create the puzzleStateToggle even if we don't add it to the mode,
            // as scripts may rely on its existence
            this.addObject(this.puzzleStateToggle, this._content);
        }

        this.updateLayout();
        this._uncollapsedContentLoc = new Point(this._content.position.x, this._content.position.y);
    }

    private updateLayout(): void {
        this._toolbarLayout.layout(true);

        if (this.puzzleStateToggle.isLiveObject) {
            DisplayUtil.positionRelative(
                this.puzzleStateToggle.display, HAlign.CENTER, VAlign.BOTTOM,
                this._toolbarLayout, HAlign.CENTER, VAlign.TOP, 0, -5);
        }

        // If we have no boosters menu, we offset our entire layout by the .5 width of
        // the boosters button. The tutorial hardcodes screen locations for its
        // point-at-toolbar-buttons tips, so everything needs to be laid out *just so*,
        // unfortunately.
        let hOffset = (this.boostersMenu == null ? 27 : 0);

        DisplayUtil.positionRelative(
            this._content, HAlign.CENTER, VAlign.BOTTOM,
            this._invisibleBackground, HAlign.CENTER, VAlign.BOTTOM,
            hOffset, 0);
    }

    public setToolbarAutohide(enabled: boolean): void {
        const COLLAPSE_ANIM = "CollapseAnim";

        if (this._autoCollapse === enabled) {
            return;
        }

        this._autoCollapse = enabled;

        if (this._autoCollapse) {
            this.display.interactive = true;

            let collapsed: boolean = false;

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

    public disableTools(disable: boolean): void {
        this.palette.enabled = !disable;
        this.pairSwapButton.enabled = !disable;
        for (let k: number = 0; k < this.dynPaintTools.length; k++) {
            this.dynPaintTools[k].enabled = !disable;
        }

        this.targetButton.enabled = !disable;
        this.nativeButton.enabled = !disable;

        this.zoomInButton.enabled = !disable;
        this.zoomOutButton.enabled = !disable;

        this.nativeButton.enabled = !disable;
        this.targetButton.enabled = !disable;

        this.viewOptionsButton.enabled = !disable;
        this.retryButton.enabled = !disable;
        this.copyButton.enabled = !disable;
        this.pasteButton.enabled = !disable;
        this.specButton.enabled = !disable;

        this.undoButton.enabled = !disable;
        this.redoButton.enabled = !disable;

        this.submitButton.enabled = !disable;
        this.viewSolutionsButton.enabled = !disable;

        this.hintButton.enabled = !disable;

        this.freezeButton.enabled = !disable;
        this.specButton.enabled = !disable;

        this.pipButton.enabled = !disable;

        if (this.puzzleStateToggle != null) {
            this.puzzleStateToggle.enabled = !disable;
        }

        this.actionMenu.enabled = !disable;
    }

    private readonly _puzzle: Puzzle;
    private readonly _scriptInterface: ExternalInterfaceCtx;

    private _invisibleBackground: Graphics;
    private _content: Container;
    private _toolbarLayout: HLayoutContainer;

    private _uncollapsedContentLoc: Point;
    private _autoCollapse: boolean;
    private _autoCollapseRegs: RegistrationGroup;
}

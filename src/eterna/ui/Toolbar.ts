import {Graphics, Point, Sprite} from 'pixi.js';
import {RegistrationGroup} from 'signals';
import Eterna from 'eterna/Eterna';
import Booster from 'eterna/mode/PoseEdit/Booster';
import PoseEditMode from 'eterna/mode/PoseEdit/PoseEditMode';
import {
    ContainerObject, Flashbang, VLayoutContainer, HLayoutContainer,
    KeyCode, VAlign, HAlign, DisplayUtil, LocationTask, Easing, Assert
} from 'flashbang';
import {BoostersData} from 'eterna/puzzle/Puzzle';
import Bitmaps from 'eterna/resources/Bitmaps';
import {RScriptUIElementID} from 'eterna/rscript/RScriptUIElement';
import BitmapManager from 'eterna/resources/BitmapManager';
import NucleotidePalette from './NucleotidePalette';
import GameButton from './GameButton';
import ToggleBar from './ToggleBar';
import EternaMenu, {EternaMenuStyle} from './EternaMenu';

export enum ToolbarType {
    PUZZLE,
    PUZZLEMAKER,
    PUZZLEMAKER_EMBEDDED,
    LAB,
    FEEDBACK
}

class ToolbarButton extends GameButton {
    protected added() {
        super.added();
        this._arrow = new Sprite(BitmapManager.getBitmap(Bitmaps.ImgToolbarArrow));
        this._arrow.position.x = (this.container.width - this._arrow.width) / 2;
        this._arrow.visible = false;
        this.container.addChild(this._arrow);

        this.toggled.connectNotify((toggled) => {
            this._arrow.visible = toggled;
        });
    }

    private _arrow: Sprite;
}

export default class Toolbar extends ContainerObject {
    // Core
    public zoomInButton?: GameButton;
    public zoomOutButton?: GameButton;
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
    public nucleotideFindButton: GameButton;
    public nucleotideRangeButton: GameButton;

    public freezeButton: GameButton;

    public boostersMenu: GameButton;

    public baseMarkerButton: GameButton;
    public magicGlueButton: GameButton;

    public dynPaintTools: GameButton[] = [];
    public dynActionTools: GameButton[] = [];

    public get position() { return new Point(this._content.x, this._content.y); }

    // Puzzle Maker
    public addbaseButton: GameButton;
    public addpairButton: GameButton;
    public deleteButton: GameButton;
    public lockButton: GameButton;
    public moleculeButton: GameButton;

    // Feedback
    public estimateButton: GameButton;
    public letterColorButton: GameButton;
    public expColorButton: GameButton;

    // Lab + Feedback
    public viewSolutionsButton: GameButton;

    // Puzzle Maker + Lab
    public submitButton: GameButton;

    constructor(
        type: ToolbarType,
        {
            states = 1,
            showGlue = false,
            boosters
        }: {
            states?: number;
            showGlue?: boolean;
            boosters?: BoostersData;
        }
    ) {
        super();
        this._type = type;
        this._states = states;
        this._showGlue = showGlue;
        this._boostersData = boosters ?? null;
    }

    public onResized() {
        Assert.assertIsDefined(Flashbang.stageWidth);
        this.stateToggle.container.position = new Point(
            Flashbang.stageWidth / 2 - this.container.position.x,
            -this.container.position.y + 8
        );
    }

    protected added(): void {
        super.added();

        const APPROX_ITEM_COUNT = 12;
        const APPROX_ITEM_WIDTH = 55;
        Assert.assertIsDefined(Flashbang.stageWidth);
        const SPACE_WIDE = Math.min((Flashbang.stageWidth / APPROX_ITEM_COUNT) - APPROX_ITEM_WIDTH, 13);
        const SPACE_NARROW = SPACE_WIDE * 0.28;

        // This can be used in both puzzlemaker and lab, so we'll create the base button ahead of time
        // TODO: Maybe these should really be two separate buttons set on different properties?
        this.submitButton = new GameButton()
            .up(Bitmaps.ImgSubmit)
            .over(Bitmaps.ImgSubmitOver)
            .down(Bitmaps.ImgSubmitHit);

        this._invisibleBackground = new Graphics();
        Assert.assertIsDefined(Flashbang.stageWidth);
        this._invisibleBackground
            .beginFill(0, 0)
            .drawRect(0, 0, Flashbang.stageWidth, 100)
            .endFill();
        this._invisibleBackground.y = -this._invisibleBackground.height;
        this.container.addChild(this._invisibleBackground);

        this._content = new VLayoutContainer(SPACE_NARROW);
        this.container.addChild(this._content);

        this.stateToggle = new ToggleBar(this._states);

        // UPPER TOOLBAR (structure editing tools)
        let upperToolbarLayout = new HLayoutContainer(SPACE_NARROW);
        if (this._type === ToolbarType.PUZZLEMAKER || this._type === ToolbarType.PUZZLEMAKER_EMBEDDED) {
            this._content.addChild(upperToolbarLayout);
        }

        this.addbaseButton = new ToolbarButton()
            .up(Bitmaps.ImgAddBase)
            .over(Bitmaps.ImgAddBaseOver)
            .down(Bitmaps.ImgAddBaseSelect)
            .hotkey(KeyCode.Digit6)
            .tooltip('Add a single base.');

        this.addpairButton = new ToolbarButton()
            .up(Bitmaps.ImgAddPair)
            .over(Bitmaps.ImgAddPairOver)
            .down(Bitmaps.ImgAddPairSelect)
            .hotkey(KeyCode.Digit7)
            .tooltip('Add a pair.');

        this.deleteButton = new ToolbarButton()
            .up(Bitmaps.ImgErase)
            .over(Bitmaps.ImgEraseOver)
            .down(Bitmaps.ImgEraseSelect)
            .hotkey(KeyCode.Digit8)
            .tooltip('Delete a base or a pair.');

        this.lockButton = new ToolbarButton()
            .up(Bitmaps.ImgLock)
            .over(Bitmaps.ImgLockOver)
            .down(Bitmaps.ImgLockSelect)
            .hotkey(KeyCode.Digit9)
            .tooltip('Lock or unlock a base.');

        this.moleculeButton = new ToolbarButton()
            .up(Bitmaps.ImgMolecule)
            .over(Bitmaps.ImgMoleculeOver)
            .down(Bitmaps.ImgMoleculeSelect)
            .hotkey(KeyCode.Digit0)
            .tooltip('Create or remove a molecular binding site.');

        if (this._type === ToolbarType.PUZZLEMAKER || this._type === ToolbarType.PUZZLEMAKER_EMBEDDED) {
            this.addObject(this.addbaseButton, upperToolbarLayout);
            this.addObject(this.addpairButton, upperToolbarLayout);
            this.addObject(this.deleteButton, upperToolbarLayout);
            this.addObject(this.lockButton, upperToolbarLayout);
            this.addObject(this.moleculeButton, upperToolbarLayout);

            this.regs.add(this.addbaseButton.clicked.connect(() => {
                this._deselectAllPaintTools();
                this.addbaseButton.toggled.value = true;
            }));
            this.regs.add(this.addpairButton.clicked.connect(() => {
                this._deselectAllPaintTools();
                this.addpairButton.toggled.value = true;
            }));
            this.regs.add(this.deleteButton.clicked.connect(() => {
                this._deselectAllPaintTools();
                this.deleteButton.toggled.value = true;
            }));
            this.regs.add(this.lockButton.clicked.connect(() => {
                this._deselectAllPaintTools();
                this.lockButton.toggled.value = true;
            }));
            this.regs.add(this.moleculeButton.clicked.connect(() => {
                this._deselectAllPaintTools();
                this.moleculeButton.toggled.value = true;
            }));
        }

        // LOWER TOOLBAR (palette, zoom, settings, etc)
        let lowerToolbarLayout = new HLayoutContainer();
        this._content.addChild(lowerToolbarLayout);

        if (
            this._states > 1
            && this._type !== ToolbarType.PUZZLEMAKER
            && this._type !== ToolbarType.PUZZLEMAKER_EMBEDDED
        ) {
            // We create the stateToggle even if we don't add it to the mode,
            // as scripts may rely on its existence
            this.addObject(this.stateToggle, this.container);
        }

        this.actionMenu = new EternaMenu(EternaMenuStyle.PULLUP);
        this.addObject(this.actionMenu, lowerToolbarLayout);
        this.actionMenu.addMenuButton(new GameButton().allStates(Bitmaps.NovaMenu).disabled(undefined));

        this.screenshotButton = new GameButton()
            .allStates(Bitmaps.ImgScreenshot)
            .disabled(undefined)
            .label('Screenshot', 14)
            .scaleBitmapToLabel()
            .tooltip('Screenshot');
        this.actionMenu.addSubMenuButton(0, this.screenshotButton);

        this.viewOptionsButton = new GameButton()
            .allStates(Bitmaps.ImgSettings)
            .disabled(undefined)
            .label('Settings', 14)
            .scaleBitmapToLabel()
            .tooltip('Game options');
        this.actionMenu.addSubMenuButton(0, this.viewOptionsButton);

        this.viewSolutionsButton = new GameButton()
            .allStates(Bitmaps.ImgFile)
            .disabled(undefined)
            .label('Designs', 14)
            .scaleBitmapToLabel()
            .tooltip('View all submitted designs for this puzzle.');

        if (this._type === ToolbarType.LAB || this._type === ToolbarType.FEEDBACK) {
            this.actionMenu.addSubMenuButton(0, this.viewSolutionsButton);
        }

        this.specButton = new GameButton()
            .allStates(Bitmaps.ImgSpec)
            .disabled(undefined)
            .label('Specs', 14)
            .scaleBitmapToLabel()
            .tooltip("View RNA's melting point, dotplot and other specs")
            .hotkey(KeyCode.KeyS);

        if (this._type !== ToolbarType.PUZZLEMAKER && this._type !== ToolbarType.PUZZLEMAKER_EMBEDDED) {
            this.actionMenu.addSubMenuButton(0, this.specButton);
        }

        let resetTooltip = this._type === ToolbarType.PUZZLEMAKER || this._type === ToolbarType.PUZZLEMAKER_EMBEDDED
            ? 'Reset all bases to A' : 'Reset and try this puzzle again.';

        this.resetButton = new GameButton()
            .allStates(Bitmaps.ImgReset)
            .disabled(undefined)
            .label('Reset', 14)
            .scaleBitmapToLabel()
            .tooltip(resetTooltip)
            .rscriptID(RScriptUIElementID.RESET);

        this.copyButton = new GameButton()
            .allStates(Bitmaps.ImgCopy)
            .disabled(undefined)
            .label('Copy', 14)
            .scaleBitmapToLabel()
            .tooltip('Copy the current sequence');

        this.pasteButton = new GameButton()
            .allStates(Bitmaps.ImgPaste)
            .disabled(undefined)
            .label('Paste', 14)
            .scaleBitmapToLabel()
            .tooltip('Type in a sequence');

        if (this._type !== ToolbarType.FEEDBACK) {
            this.actionMenu.addSubMenuButton(0, this.resetButton);
            this.actionMenu.addSubMenuButton(0, this.copyButton);
            this.actionMenu.addSubMenuButton(0, this.pasteButton);
        }

        this.nucleotideFindButton = new GameButton()
            .allStates(Bitmaps.ImgFind)
            .disabled()
            .label('Jump to Nucleotide', 14)
            .scaleBitmapToLabel()
            .tooltip('Type a nucleotide index to put it in the center of the screen (j)')
            .hotkey(KeyCode.KeyJ);

        this.actionMenu.addSubMenuButton(0, this.nucleotideFindButton);

        this.nucleotideRangeButton = new GameButton()
            .allStates(Bitmaps.NovaPuzzleImg)
            .disabled()
            .label('View Nucleotide Range', 14)
            .scaleBitmapToLabel()
            .tooltip('Enter a nucleotide range to view (v)')
            .hotkey(KeyCode.KeyV);

        this.actionMenu.addSubMenuButton(0, this.nucleotideRangeButton);

        this.boostersMenu = new GameButton().allStates(Bitmaps.NovaBoosters).disabled(undefined);

        if (this._boostersData != null && this._boostersData.actions != null) {
            let boosterMenuIdx = this.actionMenu.addMenuButton(this.boostersMenu);
            for (let ii = 0; ii < this._boostersData.actions.length; ii++) {
                let data = this._boostersData.actions[ii];
                Booster.create(this.mode as PoseEditMode, data).then((booster) => {
                    let button: GameButton = booster.createButton(14);
                    button.clicked.connect(() => booster.onRun());
                    this.actionMenu.addSubMenuButtonAt(boosterMenuIdx, button, ii);
                    this.dynActionTools.push(button);
                });
            }
        }

        if (this._type === ToolbarType.LAB) {
            this.submitButton.tooltip('Publish your solution!');
            lowerToolbarLayout.addHSpacer(SPACE_NARROW);
            this.addObject(this.submitButton, lowerToolbarLayout);
        }

        lowerToolbarLayout.addHSpacer(SPACE_WIDE);

        this.freezeButton = new ToolbarButton()
            .up(Bitmaps.ImgFreeze)
            .over(Bitmaps.ImgFreezeOver)
            .down(Bitmaps.ImgFreezeSelected)
            .tooltip('Frozen mode. Suspends/resumes folding engine calculations.')
            .hotkey(KeyCode.KeyF)
            .rscriptID(RScriptUIElementID.FREEZE);

        if (this._type === ToolbarType.LAB || this._type === ToolbarType.PUZZLE) {
            this.addObject(this.freezeButton, lowerToolbarLayout);
            lowerToolbarLayout.addHSpacer(SPACE_NARROW);
            this.freezeButton.display.visible = Eterna.settings.freezeButtonAlwaysVisible.value;
            this.regs.add(Eterna.settings.freezeButtonAlwaysVisible.connect((visible) => {
                this.freezeButton.display.visible = visible;
                this.updateLayout();
            }));
        }

        this.pipButton = new GameButton()
            .up(Bitmaps.ImgPip)
            .over(Bitmaps.ImgPipOver)
            .down(Bitmaps.ImgPipHit)
            .tooltip('Set PiP mode')
            .hotkey(KeyCode.KeyP)
            .rscriptID(RScriptUIElementID.PIP);

        if (
            this._states > 1
            && this._type !== ToolbarType.PUZZLEMAKER && this._type !== ToolbarType.PUZZLEMAKER_EMBEDDED
        ) {
            this.addObject(this.pipButton, lowerToolbarLayout);
            lowerToolbarLayout.addHSpacer(SPACE_NARROW);
        }

        this.naturalButton = new ToolbarButton()
            .up(Bitmaps.ImgNative)
            .over(Bitmaps.ImgNativeOver)
            .down(Bitmaps.ImgNativeSelected)
            .selected(Bitmaps.ImgNativeSelected)
            .tooltip('Natural Mode. RNA folds into the most stable shape.')
            .rscriptID(RScriptUIElementID.TOGGLENATURAL);

        this.estimateButton = new ToolbarButton()
            .up(Bitmaps.ImgEstimate)
            .over(Bitmaps.ImgEstimateOver)
            .down(Bitmaps.ImgEstimateSelected)
            .selected(Bitmaps.ImgEstimateSelected)
            .tooltip('Estimate Mode. The game approximates how the RNA actually folded in a test tube.');

        this.targetButton = new ToolbarButton()
            .up(Bitmaps.ImgTarget)
            .over(Bitmaps.ImgTargetOver)
            .down(Bitmaps.ImgTargetSelected)
            .selected(Bitmaps.ImgTargetSelected)
            .tooltip('Target Mode. RNA freezes into the desired shape.')
            .rscriptID(RScriptUIElementID.TOGGLETARGET);

        if (this._type !== ToolbarType.PUZZLEMAKER_EMBEDDED) {
            if (this._type !== ToolbarType.FEEDBACK) {
                this.addObject(this.naturalButton, lowerToolbarLayout);
            } else {
                this.addObject(this.estimateButton, lowerToolbarLayout);
            }

            this.addObject(this.targetButton, lowerToolbarLayout);
        }

        this.letterColorButton = new ToolbarButton()
            .up(Bitmaps.ImgColoring)
            .over(Bitmaps.ImgColoringOver)
            .down(Bitmaps.ImgColoringSelected)
            .selected(Bitmaps.ImgColoringSelected)
            .tooltip('Color sequences based on base colors as in the game.');

        this.expColorButton = new ToolbarButton()
            .up(Bitmaps.ImgFlask)
            .over(Bitmaps.ImgFlaskOver)
            .down(Bitmaps.ImgFlaskSelected)
            .selected(Bitmaps.ImgFlaskSelected)
            .tooltip('Color sequences based on experimental data.');

        if (this._type === ToolbarType.FEEDBACK) {
            lowerToolbarLayout.addHSpacer(SPACE_NARROW);

            this.letterColorButton.toggled.value = false;
            this.addObject(this.letterColorButton, lowerToolbarLayout);

            this.expColorButton.toggled.value = true;
            this.addObject(this.expColorButton, lowerToolbarLayout);
        }

        this.palette = new NucleotidePalette();

        this.regs.add(this.palette.targetClicked.connect(() => {
            this._deselectAllPaintTools();
        }));

        this.pairSwapButton = new ToolbarButton()
            .up(Bitmaps.ImgSwap)
            .over(Bitmaps.ImgSwapOver)
            .down(Bitmaps.ImgSwapOver)
            .hotkey(KeyCode.Digit5)
            .tooltip('Swap paired bases.')
            .rscriptID(RScriptUIElementID.SWAP);

        if (this._type !== ToolbarType.FEEDBACK) {
            lowerToolbarLayout.addHSpacer(SPACE_WIDE);

            this.addObject(this.palette, lowerToolbarLayout);
            this.palette.changeDefaultMode();

            lowerToolbarLayout.addHSpacer(SPACE_NARROW);

            this.addObject(this.pairSwapButton, lowerToolbarLayout);

            this.regs.add(this.pairSwapButton.clicked.connect(() => {
                this._deselectAllPaintTools();
                this.pairSwapButton.toggled.value = true;
            }));

            if (this._boostersData != null && this._boostersData.paint_tools != null) {
                let mode: PoseEditMode = this.mode as PoseEditMode;
                let boosterPaintToolsLayout = new HLayoutContainer();
                lowerToolbarLayout.addHSpacer(SPACE_NARROW);
                lowerToolbarLayout.addChild(boosterPaintToolsLayout);
                for (let data of this._boostersData.paint_tools) {
                    Booster.create(mode, data).then((booster) => {
                        booster.onLoad();
                        let button: GameButton = booster.createButton();
                        button.clicked.connect(() => {
                            mode.setPosesColor(booster.toolColor);
                            this._deselectAllPaintTools();
                        });
                        this.dynPaintTools.push(button);
                        this.addObject(button, boosterPaintToolsLayout);
                        this.updateLayout();
                    });
                }
            }
        }

        lowerToolbarLayout.addHSpacer(SPACE_WIDE);

        if (!Eterna.MOBILE_APP) {
            this.zoomInButton = new GameButton()
                .up(Bitmaps.ImgZoomIn)
                .over(Bitmaps.ImgZoomInOver)
                .down(Bitmaps.ImgZoomInHit)
                .disabled(Bitmaps.ImgZoomInDisable)
                .tooltip('Zoom in')
                .hotkey(KeyCode.Equal)
                .rscriptID(RScriptUIElementID.ZOOMIN);
            this.addObject(this.zoomInButton, lowerToolbarLayout);

            this.zoomOutButton = new GameButton()
                .up(Bitmaps.ImgZoomOut)
                .over(Bitmaps.ImgZoomOutOver)
                .down(Bitmaps.ImgZoomOutHit)
                .disabled(Bitmaps.ImgZoomOutDisable)
                .tooltip('Zoom out')
                .hotkey(KeyCode.Minus)
                .rscriptID(RScriptUIElementID.ZOOMOUT);
            this.addObject(this.zoomOutButton, lowerToolbarLayout);

            lowerToolbarLayout.addHSpacer(SPACE_NARROW);
        }

        this.undoButton = new GameButton()
            .up(Bitmaps.ImgUndo)
            .over(Bitmaps.ImgUndoOver)
            .down(Bitmaps.ImgUndoHit)
            .tooltip('Undo')
            .hotkey(KeyCode.KeyZ)
            .rscriptID(RScriptUIElementID.UNDO);

        this.redoButton = new GameButton()
            .up(Bitmaps.ImgRedo)
            .over(Bitmaps.ImgRedoOver)
            .down(Bitmaps.ImgRedoHit)
            .tooltip('Redo')
            .hotkey(KeyCode.KeyY)
            .rscriptID(RScriptUIElementID.REDO);

        if (this._type !== ToolbarType.FEEDBACK) {
            this.addObject(this.undoButton, lowerToolbarLayout);
            this.addObject(this.redoButton, lowerToolbarLayout);
        }

        lowerToolbarLayout.addHSpacer(SPACE_WIDE);
        this.baseMarkerButton = new ToolbarButton()
            .up(Bitmaps.ImgBaseMarker)
            .over(Bitmaps.ImgBaseMarkerOver)
            .down(Bitmaps.ImgBaseMarker)
            .tooltip('Mark bases (hold ctrl)');
        this.addObject(this.baseMarkerButton, lowerToolbarLayout);

        this.regs.add(this.baseMarkerButton.clicked.connect(() => {
            this._deselectAllPaintTools();
            this.baseMarkerButton.toggled.value = true;
        }));

        lowerToolbarLayout.addHSpacer(SPACE_WIDE);
        this.magicGlueButton = new ToolbarButton()
            .up(Bitmaps.ImgMagicGlue)
            .over(Bitmaps.ImgMagicGlueOver)
            .down(Bitmaps.ImgMagicGlue)
            .tooltip('Magic glue - change target structure in purple areas (hold alt)');
        if (this._showGlue) {
            this.addObject(this.magicGlueButton, lowerToolbarLayout);
            lowerToolbarLayout.addHSpacer(SPACE_NARROW);
        }

        this.regs.add(this.magicGlueButton.clicked.connect(() => {
            this._deselectAllPaintTools();
            this.magicGlueButton.toggled.value = true;
        }));

        if (this._type === ToolbarType.PUZZLEMAKER) {
            this.submitButton.tooltip('Publish your puzzle!');

            this.addObject(this.submitButton, lowerToolbarLayout);
        }

        this.updateLayout();
        this._uncollapsedContentLoc = new Point(this._content.position.x, this._content.position.y);
        this.regs.add(Eterna.settings.autohideToolbar.connectNotify((value) => {
            this.setToolbarAutohide(value);
        }));
    }

    private updateLayout(): void {
        this._content.layout(true);

        DisplayUtil.positionRelative(
            this._content, HAlign.CENTER, VAlign.BOTTOM,
            this._invisibleBackground, HAlign.CENTER, VAlign.BOTTOM,
            -25, 0
        );
    }

    private setToolbarAutohide(enabled: boolean): void {
        const COLLAPSE_ANIM = 'CollapseAnim';
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

    public disableTools(disable: boolean): void {
        if (this.zoomInButton) {
            this.zoomInButton.enabled = !disable;
        }
        if (this.zoomOutButton) {
            this.zoomOutButton.enabled = !disable;
        }
        this.pipButton.enabled = !disable;
        this.stateToggle.enabled = !disable;

        this.targetButton.enabled = !disable;

        this.actionMenu.enabled = !disable;

        this.palette.enabled = !disable;
        this.pairSwapButton.enabled = !disable;

        this.naturalButton.enabled = !disable;

        this.undoButton.enabled = !disable;
        this.redoButton.enabled = !disable;

        this.freezeButton.enabled = !disable;

        this.boostersMenu.enabled = !disable;

        this.addbaseButton.enabled = !disable;
        this.addpairButton.enabled = !disable;
        this.deleteButton.enabled = !disable;
        this.lockButton.enabled = !disable;
        this.moleculeButton.enabled = !disable;

        this.estimateButton.enabled = !disable;
        this.letterColorButton.enabled = !disable;
        this.expColorButton.enabled = !disable;

        this.submitButton.enabled = !disable;
    }

    private _deselectAllPaintTools(): void {
        this.palette.clearSelection();
        this.pairSwapButton.toggled.value = false;
        this.addbaseButton.toggled.value = false;
        this.addpairButton.toggled.value = false;
        this.deleteButton.toggled.value = false;
        this.lockButton.toggled.value = false;
        this.moleculeButton.toggled.value = false;
        this.magicGlueButton.toggled.value = false;
        this.baseMarkerButton.toggled.value = false;

        for (let button of this.dynPaintTools) {
            button.toggled.value = false;
        }
    }

    private readonly _type: ToolbarType;
    private readonly _states: number;
    private readonly _showGlue: boolean;
    private readonly _boostersData: BoostersData | null;

    private _invisibleBackground: Graphics;
    private _content: VLayoutContainer;

    private _uncollapsedContentLoc: Point;
    private _autoCollapseRegs: RegistrationGroup | null;
}

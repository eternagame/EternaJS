import {
    Graphics, Point, Sprite, Container
} from 'pixi.js';
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
import AnnotationManager, {AnnotationData} from 'eterna/AnnotationManager';
import NucleotidePalette from './NucleotidePalette';
import GameButton from './GameButton';
import ToggleBar from './ToggleBar';
import EternaMenu, {EternaMenuStyle} from './EternaMenu';
import ScrollContainer from './ScrollContainer';
import AnnotationPanel from './AnnotationPanel';

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

    public lowerToolbarLayout: HLayoutContainer;
    public scrollContainer: ScrollContainer;
    public scrollContainerContainer: HLayoutContainer;

    public leftArrow: GameButton;
    public rightArrow: GameButton;

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
    public explosionFactorButton: GameButton;

    // Annotations
    public annotationModeButton: GameButton;
    public annotationPanelButton: GameButton;
    public annotationPanel: AnnotationPanel;

    public freezeButton: GameButton;

    public boostersMenu: GameButton;

    public baseMarkerButton: GameButton;
    public librarySelectionButton: GameButton;
    public magicGlueButton: GameButton;
    public moveButton: GameButton;
    public rotateStemButton: GameButton;
    public flipStemButton: GameButton;
    public snapToGridButton: GameButton;
    public downloadHKWSButton: GameButton;
    public downloadSVGButton: GameButton;

    public dynPaintTools: GameButton[] = [];
    public dynActionTools: GameButton[] = [];

    public get position() { return new Point(this._content.x, this._content.y); }

    // Puzzle Maker
    public addBaseButton: GameButton;
    public addPairButton: GameButton;
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
            boosters,
            showGlue = false,
            showAdvancedMenus = true,
            showLibrarySelect = false,
            annotationManager
        }: {
            states?: number;
            boosters?: BoostersData;
            showGlue?: boolean;
            showAdvancedMenus?: boolean;
            showLibrarySelect?: boolean;
            annotationManager?: AnnotationManager;
        }
    ) {
        super();
        this._type = type;
        this._states = states;
        this._showGlue = showGlue;
        this._showAdvancedMenus = showAdvancedMenus;
        this._showLibrarySelect = showLibrarySelect;
        this._boostersData = boosters ?? null;
        this._annotationManager = annotationManager;
    }

    public onResized() {
        Assert.assertIsDefined(Flashbang.stageWidth);
        this.stateToggle.container.position.set(
            Flashbang.stageWidth / 2 - this.container.position.x,
            -this.container.position.y + 8
        );
        this.updateLayout();
    }

    protected added(): void {
        super.added();

        const APPROX_ITEM_COUNT = 13;
        const APPROX_ITEM_HEIGHT = 52;
        // For some reason there's a 2px margin on either side of our UI elements baked in... because.
        const APPROX_ITEM_WIDTH = APPROX_ITEM_HEIGHT + (2 * 2);
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
            .beginFill(0xff0000, 0)
            .drawRect(0, 0, Flashbang.stageWidth, 100)
            .endFill();
        this._invisibleBackground.y = -this._invisibleBackground.height;
        this.container.addChild(this._invisibleBackground);

        this._content = new VLayoutContainer(SPACE_NARROW);
        this.container.addChild(this._content);

        this.stateToggle = new ToggleBar(this._states);

        // UPPER TOOLBAR (structure editing tools)
        const upperToolbarLayout = new HLayoutContainer(SPACE_NARROW);
        if (this._type === ToolbarType.PUZZLEMAKER || this._type === ToolbarType.PUZZLEMAKER_EMBEDDED) {
            this._content.addChild(upperToolbarLayout);
        }

        this.addBaseButton = new ToolbarButton()
            .up(Bitmaps.ImgAddBase)
            .over(Bitmaps.ImgAddBaseOver)
            .down(Bitmaps.ImgAddBaseSelect)
            .hotkey(KeyCode.Digit6)
            .tooltip('Add a single base.');

        this.addPairButton = new ToolbarButton()
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
            this.addObject(this.addBaseButton, upperToolbarLayout);
            this.addObject(this.addPairButton, upperToolbarLayout);
            this.addObject(this.deleteButton, upperToolbarLayout);
            this.addObject(this.lockButton, upperToolbarLayout);
            this.addObject(this.moleculeButton, upperToolbarLayout);

            this.regs.add(this.addBaseButton.clicked.connect(() => {
                this._deselectAllPaintTools();
                this.addBaseButton.toggled.value = true;
            }));
            this.regs.add(this.addPairButton.clicked.connect(() => {
                this._deselectAllPaintTools();
                this.addPairButton.toggled.value = true;
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
        this.lowerToolbarLayout = new HLayoutContainer(0, VAlign.BOTTOM);
        this.scrollContainerContainer = new HLayoutContainer(0, VAlign.BOTTOM);
        Assert.assertIsDefined(Flashbang.stageHeight);
        this.scrollContainer = new ScrollContainer(Flashbang.stageWidth, Flashbang.stageHeight);
        this._content.addChild(this.scrollContainerContainer);
        this.scrollContainer.container.addChild(this.lowerToolbarLayout);

        /*
        The lower toolbar structure is a HLayoutContainer wrapped in ScrollContainer wrapped in another HLayoutContainer
        The arrows are in the outer HLayoutContainer, along with the ScrollContainer
        The actual toolbar content is in the innermost HLayoutContainer
        */

        if (
            this._states > 1
            && this._type !== ToolbarType.PUZZLEMAKER
            && this._type !== ToolbarType.PUZZLEMAKER_EMBEDDED
        ) {
            // We create the stateToggle even if we don't add it to the mode,
            // as scripts may rely on its existence
            this.addObject(this.stateToggle, this.container);
        }

        this.leftArrow = this.makeArrowButton('left');

        this.addObject(this.leftArrow, this.scrollContainerContainer);
        this.addObject(this.scrollContainer, this.scrollContainerContainer);

        this.actionMenu = new EternaMenu(EternaMenuStyle.PULLUP, true);
        this.addObject(this.actionMenu, this.lowerToolbarLayout);

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

        const resetTooltip = this._type === ToolbarType.PUZZLEMAKER || this._type === ToolbarType.PUZZLEMAKER_EMBEDDED
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

        this.explosionFactorButton = new GameButton()
            .allStates(Bitmaps.ImgFlare)
            .disabled()
            .label('Explosion Factor', 14)
            .scaleBitmapToLabel()
            .tooltip('Set explosion factor ([, ])');

        this.actionMenu.addSubMenuButton(0, this.explosionFactorButton);

        this.boostersMenu = new GameButton().allStates(Bitmaps.NovaBoosters).disabled(undefined);

        if (this._boostersData != null && this._boostersData.actions != null && this._showAdvancedMenus) {
            const boosterMenuIdx = this.actionMenu.addMenuButton(this.boostersMenu);
            for (let ii = 0; ii < this._boostersData.actions.length; ii++) {
                const data = this._boostersData.actions[ii];
                Booster.create(this.mode as PoseEditMode, data).then((booster) => {
                    const button: GameButton = booster.createButton(14);
                    this.regs.add(button.clicked.connect(() => booster.onRun()));
                    this.actionMenu.addSubMenuButtonAt(boosterMenuIdx, button, ii);
                    this.dynActionTools.push(button);
                });
            }
        }

        this.moveButton = new GameButton()
            .allStates(Bitmaps.CustomLayout)
            .disabled(undefined)
            .label('Move', 14)
            .scaleBitmapToLabel()
            .tooltip('Move a nucleotide or stem by ctrl-shift-click');

        this.rotateStemButton = new GameButton()
            .allStates(Bitmaps.CustomLayout)
            .disabled(undefined)
            .label('Rotate stem', 14)
            .scaleBitmapToLabel()
            .tooltip('Rotate stem clockwise 1/4 turn by ctrl-shift-click');

        this.flipStemButton = new GameButton()
            .allStates(Bitmaps.CustomLayout)
            .disabled(undefined)
            .label('Flip stem', 14)
            .scaleBitmapToLabel()
            .tooltip('Flip stem by ctrl-shift-click');

        this.snapToGridButton = new GameButton()
            .allStates(Bitmaps.CustomLayout)
            .disabled(undefined)
            .label('Snap to grid', 14)
            .scaleBitmapToLabel()
            .tooltip('Snap current layout to a grid');

        this.downloadHKWSButton = new GameButton()
            .allStates(Bitmaps.CustomLayout)
            .disabled(undefined)
            .label('Download HKWS format', 14)
            .scaleBitmapToLabel()
            .tooltip('Download a draw_rna input file for the current layout');

        this.downloadSVGButton = new GameButton()
            .allStates(Bitmaps.CustomLayout)
            .disabled(undefined)
            .label('Download SVG format', 14)
            .scaleBitmapToLabel()
            .tooltip('Download an SVG of the current RNA layout');

        if (this._showAdvancedMenus) {
            const alterMenuIdx = this.actionMenu.addMenuButton(
                new GameButton().allStates(Bitmaps.CustomLayout).disabled(undefined)
            );

            this.actionMenu.addSubMenuButton(alterMenuIdx, this.moveButton);
            this.actionMenu.addSubMenuButton(alterMenuIdx, this.rotateStemButton);
            this.actionMenu.addSubMenuButton(alterMenuIdx, this.flipStemButton);
            this.actionMenu.addSubMenuButton(alterMenuIdx, this.snapToGridButton);
            this.actionMenu.addSubMenuButton(alterMenuIdx, this.downloadHKWSButton);
            this.actionMenu.addSubMenuButton(alterMenuIdx, this.downloadSVGButton);
        }

        if (this._type === ToolbarType.LAB) {
            this.submitButton.tooltip('Publish your solution!');
            this.lowerToolbarLayout.addHSpacer(SPACE_NARROW);
            this.addObject(this.submitButton, this.lowerToolbarLayout);
        }

        this.lowerToolbarLayout.addHSpacer(SPACE_WIDE);

        this.freezeButton = new ToolbarButton()
            .up(Bitmaps.ImgFreeze)
            .over(Bitmaps.ImgFreezeOver)
            .down(Bitmaps.ImgFreezeSelected)
            .tooltip('Frozen mode. Suspends/resumes folding engine calculations.')
            .hotkey(KeyCode.KeyF)
            .rscriptID(RScriptUIElementID.FREEZE);

        if (this._type === ToolbarType.LAB || this._type === ToolbarType.PUZZLE) {
            this.addObject(this.freezeButton, this.lowerToolbarLayout);
            this.lowerToolbarLayout.addHSpacer(SPACE_NARROW);
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
            this.addObject(this.pipButton, this.lowerToolbarLayout);
            this.lowerToolbarLayout.addHSpacer(SPACE_NARROW);
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
                this.addObject(this.naturalButton, this.lowerToolbarLayout);
            } else {
                this.addObject(this.estimateButton, this.lowerToolbarLayout);
            }

            this.addObject(this.targetButton, this.lowerToolbarLayout);
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
            this.lowerToolbarLayout.addHSpacer(SPACE_NARROW);

            this.letterColorButton.toggled.value = false;
            this.addObject(this.letterColorButton, this.lowerToolbarLayout);

            this.expColorButton.toggled.value = true;
            this.addObject(this.expColorButton, this.lowerToolbarLayout);
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
            this.lowerToolbarLayout.addHSpacer(SPACE_WIDE);

            this.addObject(this.palette, this.lowerToolbarLayout);
            this.palette.changeDefaultMode();

            this.lowerToolbarLayout.addHSpacer(SPACE_NARROW);

            this.addObject(this.pairSwapButton, this.lowerToolbarLayout);

            this.regs.add(this.pairSwapButton.clicked.connect(() => {
                this._deselectAllPaintTools();
                this.pairSwapButton.toggled.value = true;
            }));

            if (this._boostersData != null && this._boostersData.paint_tools != null) {
                const mode: PoseEditMode = this.mode as PoseEditMode;
                const boosterPaintToolsLayout = new HLayoutContainer();
                this.lowerToolbarLayout.addHSpacer(SPACE_NARROW);
                this.lowerToolbarLayout.addChild(boosterPaintToolsLayout);
                for (const data of this._boostersData.paint_tools) {
                    Booster.create(mode, data).then((booster) => {
                        booster.onLoad();
                        const button: GameButton = booster.createButton();
                        this.regs.add(button.clicked.connect(() => {
                            mode.setPosesColor(booster.toolColor);
                            this._deselectAllPaintTools();
                        }));
                        this.dynPaintTools.push(button);
                        this.addObject(button, boosterPaintToolsLayout);
                        this.updateLayout();
                    });
                }
            }
        }

        this.lowerToolbarLayout.addHSpacer(SPACE_WIDE);

        if (!Eterna.MOBILE_APP) {
            this.zoomInButton = new GameButton()
                .up(Bitmaps.ImgZoomIn)
                .over(Bitmaps.ImgZoomInOver)
                .down(Bitmaps.ImgZoomInHit)
                .disabled(Bitmaps.ImgZoomInDisable)
                .tooltip('Zoom in')
                .hotkey(KeyCode.Equal)
                .rscriptID(RScriptUIElementID.ZOOMIN);
            this.addObject(this.zoomInButton, this.lowerToolbarLayout);

            this.zoomOutButton = new GameButton()
                .up(Bitmaps.ImgZoomOut)
                .over(Bitmaps.ImgZoomOutOver)
                .down(Bitmaps.ImgZoomOutHit)
                .disabled(Bitmaps.ImgZoomOutDisable)
                .tooltip('Zoom out')
                .hotkey(KeyCode.Minus)
                .rscriptID(RScriptUIElementID.ZOOMOUT);
            this.addObject(this.zoomOutButton, this.lowerToolbarLayout);

            this.lowerToolbarLayout.addHSpacer(SPACE_NARROW);
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
            this.addObject(this.undoButton, this.lowerToolbarLayout);
            this.addObject(this.redoButton, this.lowerToolbarLayout);
        }

        this.lowerToolbarLayout.addHSpacer(SPACE_WIDE);
        this.baseMarkerButton = new ToolbarButton()
            .up(Bitmaps.ImgBaseMarker)
            .over(Bitmaps.ImgBaseMarkerOver)
            .down(Bitmaps.ImgBaseMarker)
            .tooltip('Mark bases (hold ctrl)');

        if (this.type !== ToolbarType.FEEDBACK) {
            this.addObject(this.baseMarkerButton, this.lowerToolbarLayout);
        }

        this.regs.add(this.baseMarkerButton.clicked.connect(() => {
            this._deselectAllPaintTools();
            this.baseMarkerButton.toggled.value = true;
        }));

        this.librarySelectionButton = new ToolbarButton()
            .up(Bitmaps.RandomBtn)
            .over(Bitmaps.RandomBtnOver)
            .down(Bitmaps.RandomBtn)
            .tooltip('Select bases to randomize');

        if (this._showLibrarySelect) {
            this.lowerToolbarLayout.addHSpacer(SPACE_WIDE);
            this.addObject(this.librarySelectionButton, this.lowerToolbarLayout);

            this.regs.add(this.librarySelectionButton.clicked.connect(() => {
                this._deselectAllPaintTools();
                this.librarySelectionButton.toggled.value = true;
            }));
        }

        this.lowerToolbarLayout.addHSpacer(SPACE_WIDE);
        this.magicGlueButton = new ToolbarButton()
            .up(Bitmaps.ImgMagicGlue)
            .over(Bitmaps.ImgMagicGlueOver)
            .down(Bitmaps.ImgMagicGlue)
            .tooltip('Magic glue - change target structure in purple areas (hold alt)');
        if (this._showGlue) {
            this.lowerToolbarLayout.addHSpacer(SPACE_WIDE);
            this.addObject(this.magicGlueButton, this.lowerToolbarLayout);
            this.lowerToolbarLayout.addHSpacer(SPACE_NARROW);
        }

        this.regs.add(this.magicGlueButton.clicked.connect(() => {
            this._deselectAllPaintTools();
            this.magicGlueButton.toggled.value = true;
        }));

        if (this._annotationManager) {
            this.annotationModeButton = new ToolbarButton()
                .up(Bitmaps.ImgAnnotationMode)
                .over(Bitmaps.ImgAnnotationModeOver)
                .down(Bitmaps.ImgAnnotationModeSelected)
                .selected(Bitmaps.ImgAnnotationModeSelected)
                .tooltip('Annotation Mode');

            this.annotationPanelButton = new ToolbarButton()
                .up(Bitmaps.ImgAnnotationLayer)
                .over(Bitmaps.ImgAnnotationLayerOver)
                .down(Bitmaps.ImgAnnotationLayerSelected)
                .selected(Bitmaps.ImgAnnotationLayerSelected)
                .tooltip('Annotations Panel');
            this.annotationPanel = new AnnotationPanel(
                this.annotationPanelButton,
                this._annotationManager
            );

            if (this._showAdvancedMenus) {
                this.addObject(this.annotationPanel, this.mode?.container);
                this.addObject(this.annotationModeButton, this.lowerToolbarLayout);
                this.addObject(this.annotationPanelButton, this.lowerToolbarLayout);
            }

            this.regs.add(this.annotationModeButton.clicked.connect(() => {
                this._deselectAllPaintTools();
                this.annotationModeButton.toggled.value = true;

                Assert.assertIsDefined(this._annotationManager);
                this._annotationManager.setAnnotationMode(true);
            }));

            this.regs.add(this._annotationManager.selectedItem.connect(
                (newAnnotation: AnnotationData | null, oldAnnotation: AnnotationData | null) => {
                    if (newAnnotation) {
                        this.annotationPanel.setAnnotationPanelItemSelection(newAnnotation, true);
                    }
                    if (oldAnnotation) {
                        this.annotationPanel.setAnnotationPanelItemSelection(oldAnnotation, false);
                    }
                }
            ));

            this.regs.add(this._annotationManager.viewAnnotationDataUpdated.connect(() => {
                this.annotationPanel.updatePanel();
            }));
        }

        if (this._type === ToolbarType.PUZZLEMAKER) {
            this.submitButton.tooltip('Publish your puzzle!');
            this.lowerToolbarLayout.addHSpacer(SPACE_WIDE);
            this.addObject(this.submitButton, this.lowerToolbarLayout);
        }

        this.rightArrow = this.makeArrowButton('right');
        this.addObject(this.rightArrow, this.scrollContainerContainer);

        let interval: NodeJS.Timeout;
        const endScroll = () => {
            if (interval) clearInterval(interval);
        };
        const scrollRight = () => {
            this.scrollContainer.setScroll(this.scrollContainer.scrollX + 10, this.scrollContainer.scrollY);
            this.updateArrowVisibility();
        };
        const scrollLeft = () => {
            this.scrollContainer.setScroll(this.scrollContainer.scrollX - 10, this.scrollContainer.scrollY);
            this.updateArrowVisibility();
        };
        this.regs.add(this.rightArrow.pointerDown.connect(() => {
            endScroll();
            interval = setInterval(scrollRight, 100);
        }));
        this.regs.add(this.rightArrow.pointerUp.connect(() => endScroll()));
        this.regs.add(this.leftArrow.pointerDown.connect(() => {
            endScroll();
            interval = setInterval(scrollLeft, 100);
        }));
        this.regs.add(this.leftArrow.pointerUp.connect(() => endScroll()));
        this.regs.add(this.rightArrow.pointerTap.connect(() => {
            endScroll();
            scrollRight();
        }));
        this.regs.add(this.leftArrow.pointerTap.connect(() => {
            endScroll();
            scrollLeft();
        }));

        this.onResized();

        this._uncollapsedContentLoc = new Point(this._content.position.x, this._content.position.y);
        this.regs.add(Eterna.settings.autohideToolbar.connectNotify((value) => {
            this.setToolbarAutohide(value);
        }));
        this._setupToolbarDrag();
    }

    private makeArrowButton(direction: 'left' | 'right'): GameButton {
        // Height of the rest of the toolbar elements
        const HEIGHT = 52;

        const arrowImg = new Sprite(BitmapManager.getBitmap(
            direction === 'left' ? Bitmaps.ImgArrowLeft : Bitmaps.ImgArrowRight
        ));
        // GameButton resets location/scale/etc, so we have to wrap it in a container and then
        // create an invisible object to force the height to be what we want, then position
        // our thing in the center. Ugh.
        const arrowContainer = new Container();
        const arrowFrame = new Graphics()
            .beginFill(0x0)
            .drawRect(0, 0, 1, HEIGHT)
            .endFill();
        arrowFrame.alpha = 0;
        arrowContainer.addChild(arrowImg);
        arrowContainer.addChild(arrowFrame);
        DisplayUtil.positionRelative(
            arrowImg, HAlign.LEFT, VAlign.CENTER,
            arrowFrame, HAlign.LEFT, VAlign.CENTER
        );

        return new GameButton()
            .allStates(arrowContainer)
            .disabled(undefined)
            .tooltip(`Scroll ${direction}`);
    }

    private _setupToolbarDrag() {
        let mouseDown = false;
        let startingX: number;
        let startingScroll: number;
        this.regs.add(this.pointerDown.connect((e) => {
            const {x, y} = e.data.global;
            if (this.lowerToolbarLayout.getBounds().contains(x, y)) {
                mouseDown = true;
                startingX = x;
                startingScroll = this.scrollContainer.scrollX;
            }
        }));

        this.regs.add(this.pointerUp.connect((_e) => {
            mouseDown = false;
        }));

        this.regs.add(this.scrollContainer.pointerUpOutside.connect(() => {
            mouseDown = false;
        }));

        this.regs.add(this.pointerMove.connect((e) => {
            const {x, y} = e.data.global;
            if (e.data.buttons === 1 && mouseDown && this.lowerToolbarLayout.getBounds().contains(x, y)) {
                const offset = x - startingX;
                if (Math.abs(offset) > 15) {
                    this.scrollContainer.scrollX = startingScroll - offset;
                }
            }
        }));
    }

    private updateLayout(): void {
        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);
        // Update the scroll container size, accounting for buttons
        const buttonOffset = this.leftArrow.display.width + this.rightArrow.display.width;
        this.scrollContainer.setSize(Flashbang.stageWidth - buttonOffset, Flashbang.stageHeight);

        // lowerToolbarLayout isn't a child of another LayoutContainer (since we have the ScrollContainer)
        // so we'll need to play some games to make sure both are updated when their sizes change
        this._content.layout(true);
        this.lowerToolbarLayout.layout(true);
        this._content.layout(true);

        this.updateArrowVisibility();

        DisplayUtil.positionRelative(
            this._content, HAlign.CENTER, VAlign.BOTTOM,
            this._invisibleBackground, HAlign.CENTER, VAlign.BOTTOM,
            -25, 0
        );
    }

    private updateArrowVisibility() {
        this.rightArrow.display.visible = true;
        this.leftArrow.display.visible = true;

        // maxScrollX being greater than 0 indicates that scrolling is possible and some content is covered up
        // Alpha is used here since we don't want to shift the scrollcontainer around the screen
        // when the arrows get shown/hidden - reserve some space for them!
        if (this.scrollContainer.maxScrollX > 0) {
            if (this.scrollContainer.scrollX > 0) {
                this.leftArrow.display.alpha = 1;
            } else {
                this.leftArrow.display.alpha = 0;
            }

            if (this.scrollContainer.scrollX < this.scrollContainer.maxScrollX) {
                this.rightArrow.display.alpha = 1;
            } else {
                this.rightArrow.display.alpha = 0;
            }
        } else {
            this.rightArrow.display.visible = false;
            this.leftArrow.display.visible = false;
        }
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
            this._content.position.copyFrom(this._uncollapsedContentLoc);
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

        this.annotationModeButton.enabled = !disable;
        this.annotationPanelButton.enabled = !disable;

        this.freezeButton.enabled = !disable;

        this.boostersMenu.enabled = !disable;

        this.addBaseButton.enabled = !disable;
        this.addPairButton.enabled = !disable;
        this.deleteButton.enabled = !disable;
        this.lockButton.enabled = !disable;
        this.moleculeButton.enabled = !disable;

        this.moveButton.enabled = !disable;
        this.rotateStemButton.enabled = !disable;
        this.flipStemButton.enabled = !disable;
        this.downloadHKWSButton.enabled = !disable;
        this.downloadSVGButton.enabled = !disable;

        this.estimateButton.enabled = !disable;
        this.letterColorButton.enabled = !disable;
        this.expColorButton.enabled = !disable;

        this.submitButton.enabled = !disable;
    }

    private _deselectAllPaintTools(): void {
        this.palette.clearSelection();
        this.pairSwapButton.toggled.value = false;
        this.addBaseButton.toggled.value = false;
        this.addPairButton.toggled.value = false;
        this.deleteButton.toggled.value = false;
        this.lockButton.toggled.value = false;
        this.moleculeButton.toggled.value = false;
        this.magicGlueButton.toggled.value = false;
        this.baseMarkerButton.toggled.value = false;
        this.librarySelectionButton.toggled.value = false;

        for (const button of this.dynPaintTools) {
            button.toggled.value = false;
        }

        this.annotationModeButton.toggled.value = false;
        if (this._annotationManager) {
            this._annotationManager.setAnnotationMode(false);
        }
    }

    public get type(): ToolbarType {
        return this._type;
    }

    private readonly _type: ToolbarType;
    private readonly _states: number;
    private readonly _showGlue: boolean;
    private readonly _showAdvancedMenus: boolean;
    private readonly _showLibrarySelect: boolean;
    private readonly _boostersData: BoostersData | null;

    private _invisibleBackground: Graphics;
    private _content: VLayoutContainer;

    private _uncollapsedContentLoc: Point;
    private _autoCollapseRegs: RegistrationGroup | null;

    private _annotationManager: AnnotationManager | undefined;
}

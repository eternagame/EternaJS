import {
    Graphics, Point, Sprite, Container, InteractionEvent, DisplayObject, Text, Rectangle
} from 'pixi.js';
import {RegistrationGroup} from 'signals';
import Eterna from 'eterna/Eterna';
import Booster from 'eterna/mode/PoseEdit/Booster';
import PoseEditMode from 'eterna/mode/PoseEdit/PoseEditMode';
import {
    ContainerObject, Flashbang, VLayoutContainer, HLayoutContainer,
    KeyCode, VAlign, HAlign, DisplayUtil, LocationTask, Easing, Assert, ParallelTask, VisibleTask
} from 'flashbang';
import {BoostersData} from 'eterna/puzzle/Puzzle';
import Bitmaps from 'eterna/resources/Bitmaps';
import {RScriptUIElementID} from 'eterna/rscript/RScriptUIElement';
import BitmapManager from 'eterna/resources/BitmapManager';
import AnnotationManager from 'eterna/AnnotationManager';
import Fonts from 'eterna/util/Fonts';
import {FontWeight} from 'flashbang/util/TextBuilder';
import NucleotidePalette from './NucleotidePalette';
import GameButton, {ButtonCategory} from './GameButton';
import ToggleBar from './ToggleBar';
import ScrollContainer from './ScrollContainer';
import AnnotationPanel from './AnnotationPanel';
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

export class ButtonsGroup extends ContainerObject {
    public _content: HLayoutContainer;
    private _background: Graphics;
    private _buttons: GameButton[];

    private static BUTTON_WIDTH = 55;

    constructor(buttons: GameButton[]) {
        super();
        this._buttons = buttons;
    }

    protected added(): void {
        super.added();

        const {BUTTON_WIDTH} = ButtonsGroup;

        this._content = new HLayoutContainer();
        this._background = new Graphics()
            .beginFill(0x043468, 1)
            .drawRoundedRect(0, 0, (this._buttons.length * BUTTON_WIDTH), 51, 7)
            .endFill();

        this.container.addChild(this._background);
        this.container.addChild(this._content);

        this._buttons.forEach((button, index) => {
            button.display.x = BUTTON_WIDTH * index;
            this.addObject(button, this._content);
        });
    }

    public resizeContainer(): void {
        const {BUTTON_WIDTH} = ButtonsGroup;
        this._background.width = this._content.children.length * BUTTON_WIDTH;
        this._content.layout(true);
    }

    public toggleInteractive(value: boolean): void {
        this._content.children.forEach((button) => {
            button.interactive = value;
        });
    }

    public changeMode(value: boolean): void {
        const {BUTTON_WIDTH} = ButtonsGroup;
        if (value) {
            this._background
                .lineStyle(1, 0x3397DB, 1)
                .drawRoundedRect(0, 0, this._content.children.length * BUTTON_WIDTH, 51, 7)
                .endFill();
        } else {
            this._background
                .clear()
                .beginFill(0x043468, 1)
                .drawRoundedRect(0, 0, (this._content.children.length * BUTTON_WIDTH), 51, 7)
                .endFill();
        }
        this._background.width = this._content.children.length * BUTTON_WIDTH;
    }

    public addButton(newButton: DisplayObject): void {
        const {BUTTON_WIDTH} = ButtonsGroup;
        this._content.addChildAt(newButton, 0);
        this._background.width = this._content.children.length * BUTTON_WIDTH;
    }

    public addButtonAt(newButton: DisplayObject, position: number): void {
        const {BUTTON_WIDTH} = ButtonsGroup;
        this._content.addChildAt(newButton, position);
        this._background.width = this._content.children.length * BUTTON_WIDTH;
    }

    public removeButton(button: DisplayObject): void {
        const {BUTTON_WIDTH} = ButtonsGroup;
        const childrenIndex = this._content.children.findIndex((el) => el === button);
        if (childrenIndex < 0) return;
        this._content.removeChildAt(childrenIndex);
        this._background.width = this._content.children.length * BUTTON_WIDTH;
        this._content.layout(true);
    }

    public removeButtonAt(index: number): Container {
        return this._content.removeChildAt(index);
    }

    public getButtonIndex(button: DisplayObject): number {
        return this._content.children.findIndex((el) => el === button);
    }

    public forceLayout(): void {
        this._content.layout(true);
    }
}

export default class Toolbar extends ContainerObject {
    // Core
    public zoomInButton?: GameButton;
    public zoomOutButton?: GameButton;
    public pipButton: GameButton;
    public stateToggle: ToggleBar;
    public actionMenu: EternaMenu;

    public targetButton: GameButton;

    public viewOptionsButton: GameButton;

    public screenshotButton: GameButton;

    public specButton: GameButton;

    public settingsButton: GameButton;
    public futureFeatureButton: GameButton;

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

    public expandButton: GameButton;
    public collapseButton: GameButton;

    public activeButtons: GameButton[] = [];

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

    public leftButtonsGroup: ButtonsGroup;
    public rightButtonsGroup: ButtonsGroup;

    public lowerToolbarContainer: VLayoutContainer;
    public top: HLayoutContainer;
    public middle: HLayoutContainer;
    public middleBg: Graphics;
    public backgroundContainer: Container;
    public backgroundContainerBackgroundContainer: Graphics;
    public text: Text;

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
        this._scrollStep = 55;
        this._scrollOffset = 0;
    }

    public onResized() {
        Assert.assertIsDefined(Flashbang.stageWidth);
        this.updateLayout();
    }

    private _renderButtonsWithNewCategory(category: ButtonCategory): void {
        this._scrollContainer.content.removeChildren();
        this._scrollContainer.content.addChild(this.middleBg);
        const newButtons = this._tabs.get(category);
        newButtons?.forEach((button) => {
            if (
                !this.leftButtonsGroup._content.children.includes(button.display)
                && !this.rightButtonsGroup._content.children.includes(button.display)
            ) {
                this._scrollContainer.content.addChild(button.display);
            }
        });
        this._updateAvailableButtonsContainer();
    }

    // eslint-disable-next-line max-len
    private _createTab(title: ButtonCategory): {container: Container, enable: () => void, disable: () => void, category: ButtonCategory} {
        const TAB_WIDTH = 99;
        const TAB_HEIGHT = 17;

        const tabBg = new Graphics()
            .beginFill(0x0c2040)
            .drawRect(0, 0, TAB_WIDTH, TAB_HEIGHT)
            .drawRoundedRect(0, -3, TAB_WIDTH, 10, 7)
            .endFill();

        const tabContainer = new Container();
        const tabText = new Text(title, {
            fontSize: 10,
            fontFamily: Fonts.STDFONT,
            fill: 0xFFFFFF,
            fontWeight: FontWeight.REGULAR
        });

        tabContainer.addChild(tabBg);
        tabContainer.addChild(tabText);
        const textX = (TAB_WIDTH / 2) - (tabText.width / 2);
        // const textY = ((TAB_HEIGHT + 3) / 2) - (tabText.height / 2);
        const textY = 0;
        tabText.position.set(textX, textY);
        tabContainer.interactive = true;
        tabContainer.buttonMode = true;
        const enable = (): void => {
            this._currentTab?.disable();
            tabBg.clear()
                .beginFill(0x043468)
                .drawRect(0, 0, TAB_WIDTH, TAB_HEIGHT)
                .drawRoundedRect(0, -3, TAB_WIDTH, 10, 7)
                .endFill();
        };

        const disable = (): void => {
            tabBg.clear()
                .beginFill(0x0c2040)
                .drawRect(0, 0, TAB_WIDTH, TAB_HEIGHT)
                .drawRoundedRect(0, -3, TAB_WIDTH, 10, 7)
                .endFill();
        };
        tabContainer.on('click', () => {
            this._currentTab.disable();
            tabBg.clear()
                .beginFill(0x043468)
                .drawRect(0, 0, TAB_WIDTH, TAB_HEIGHT)
                .drawRoundedRect(0, -3, TAB_WIDTH, 10, 7)
                .endFill();
            this._renderButtonsWithNewCategory(title);
            this._currentTab = {
                container: tabContainer,
                enable,
                disable,
                category: title
            };
        });

        return {
            container: tabContainer,
            enable,
            disable,
            category: title
        };
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

        this._tabs = new Map([
            [ButtonCategory.SOLVE, []],
            [ButtonCategory.CREATE, []],
            [ButtonCategory.VIEW, []],
            [ButtonCategory.ANNOTATE, []],
            [ButtonCategory.IMPORT_EXPORT, []],
            [ButtonCategory.CUSTOM_LAYOUT, []]
        ]);

        this._tabsContainer = new HLayoutContainer(2);

        this._tabsContainer.visible = false;

        const tab1 = this._createTab(ButtonCategory.SOLVE);
        const tab2 = this._createTab(ButtonCategory.CREATE);
        const tab3 = this._createTab(ButtonCategory.VIEW);
        const tab4 = this._createTab(ButtonCategory.ANNOTATE);
        const tab5 = this._createTab(ButtonCategory.IMPORT_EXPORT);
        const tab6 = this._createTab(ButtonCategory.CUSTOM_LAYOUT);

        this._currentTab = tab1;

        this._tabsContainer.addChild(tab1.container);
        this._tabsContainer.addChild(tab2.container);
        this._tabsContainer.addChild(tab3.container);
        this._tabsContainer.addChild(tab4.container);
        this._tabsContainer.addChild(tab5.container);
        this._tabsContainer.addChild(tab6.container);

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
            .allStates(Bitmaps.ImgAddBase)
            .hotkey(KeyCode.Digit6)
            .tooltip('Add a single base.')
            .setCategory(ButtonCategory.CREATE);

        this.addPairButton = new ToolbarButton()
            .allStates(Bitmaps.ImgAddPair)
            .hotkey(KeyCode.Digit7)
            .tooltip('Add a pair.')
            .setCategory(ButtonCategory.CREATE);

        this.deleteButton = new ToolbarButton()
            .allStates(Bitmaps.ImgErase)
            .hotkey(KeyCode.Digit8)
            .tooltip('Delete a base or a pair.')
            .setCategory(ButtonCategory.CREATE);

        this.lockButton = new ToolbarButton()
            .allStates(Bitmaps.ImgLock)
            .hotkey(KeyCode.Digit9)
            .tooltip('Lock or unlock a base.')
            .setCategory(ButtonCategory.CREATE);

        this.moleculeButton = new ToolbarButton()
            .allStates(Bitmaps.ImgMolecule)
            .hotkey(KeyCode.Digit0)
            .tooltip('Create or remove a molecular binding site.')
            .setCategory(ButtonCategory.CREATE);

        // LOWER TOOLBAR (palette, zoom, settings, etc)
        this.lowerToolbarLayout = new HLayoutContainer(0, VAlign.BOTTOM);
        this.backgroundContainer = new Container();

        this.backgroundContainerBackgroundContainer = new Graphics()
            .beginFill(0x21508C, 1)
            .drawRect(0, 0, 666, 223)
            .drawRoundedRect(0, -5, 666, 10, 7)
            .endFill();
        this.backgroundContainerBackgroundContainer.visible = false;

        this.lowerToolbarContainer = new VLayoutContainer();
        this.backgroundContainer.addChild(this.backgroundContainerBackgroundContainer);
        this.backgroundContainer.addChild(this.lowerToolbarContainer);
        this.lowerToolbarLayout.addChild(this.backgroundContainer);

        this.top = new HLayoutContainer();
        this.middle = new HLayoutContainer();
        this.middleBg = new Graphics()
            .beginFill(0x043468)
            .drawRect(0, 0, 605, 47)
            .drawRoundedRect(0, 43, 605, 10, 7)
            .endFill();
        this.middle.visible = false;
        this.lowerToolbarContainer.addChild(this.top);
        // this.lowerToolbarContainer.addVSpacer(30);

        this.middle.position.set(this.middle.position.x, this.middle.position.y + 30);

        DisplayUtil.positionRelative(
            this._tabsContainer, HAlign.CENTER, VAlign.TOP,
            this.middle, HAlign.CENTER, VAlign.TOP,
            0, -20
        );

        this._scrollPrevButton = new ToolbarButton()
            .allStates(Bitmaps.PrevArrow);
        this._scrollNextButton = new ToolbarButton()
            .allStates(Bitmaps.NextArrow);

        this.addObject(this._scrollPrevButton, this.middle);

        this._scrollContainer = new ScrollContainer(605, 55);
        this._scrollContainer.content.addChild(this.middleBg);
        this.addObject(this._scrollContainer, this.middle);
        this.addObject(this._scrollNextButton, this.middle);
        this.lowerToolbarContainer.addChild(this.middle);
        // eslint-disable-next-line max-len
        this.text = new Text('Drag an icon to the right or left above to replace the existing tool, or tap an icon to use it.', {
            fontSize: 12,
            fontFamily: Fonts.STDFONT,
            fill: 0xABC9D8,
            fontWeight: FontWeight.MEDIUM
        });
        this.text.visible = false;
        this.lowerToolbarContainer.addVSpacer(14);
        this.lowerToolbarContainer.addChild(this.text);
        this.scrollContainerContainer = new HLayoutContainer(0, VAlign.BOTTOM);
        Assert.assertIsDefined(Flashbang.stageHeight);
        this.scrollContainer = new ScrollContainer(Flashbang.stageWidth, Flashbang.stageHeight);
        this._content.addChild(this.scrollContainerContainer);
        this.scrollContainer.container.addChild(this.lowerToolbarLayout);

        this.regs.add(this._scrollPrevButton.clicked.connect(() => {
            if (this._scrollOffset <= 0) return;
            this._scrollOffset -= this._scrollOffset < this._scrollStep ? this._scrollOffset : this._scrollStep;
            this._scrollContainer.setScroll(this._scrollOffset, 0);
            const cntr = this._scrollContainer.content.children.reduce((acc, el) => {
                if (!el.buttonMode || !el.visible) return acc;
                return acc + 1;
            }, 0);
            const newWidth = cntr * this._scrollStep;
            this.middleBg.width = newWidth < 605 ? 605 : newWidth;
        }));

        this.regs.add(this._scrollNextButton.clicked.connect(() => {
            const contentWidth = this._scrollContainer.content.children.length * this._scrollStep;
            if (contentWidth < this._scrollContainer.content.width) return;
            if (this._scrollOffset >= this._scrollContainer.maxScrollX) return;
            const diff = this._scrollContainer.maxScrollX - this._scrollOffset;
            this._scrollOffset += diff < this._scrollStep ? diff : this._scrollStep;
            this._scrollContainer.setScroll(this._scrollOffset, 0);
            const cntr = this._scrollContainer.content.children.reduce((acc, el) => {
                if (!el.buttonMode || !el.visible) return acc;
                return acc + 1;
            }, 0);
            const newWidth = cntr * this._scrollStep;
            this.middleBg.width = newWidth < 605 ? 605 : newWidth;
        }));

        DisplayUtil.positionRelative(
            this.lowerToolbarContainer, HAlign.CENTER, VAlign.TOP,
            this.backgroundContainer, HAlign.CENTER, VAlign.TOP,
            0, 20
        );

        this._isDragging = false;
        this.middle.interactive = true;

        this.middle.on('pointerup', (e: InteractionEvent) => {
            this.onDragEnd(e);
        });

        this.middle.on('pointerupoutside', (e: InteractionEvent) => {
            this.onDragEnd(e);
        });

        this.middle.on('pointermove', (e) => {
            this.onDragMove(e);
        });

        this.middle.on('pointerdown', (e: InteractionEvent) => {
            this.onDragStart(e);
        });

        if (this._type === ToolbarType.PUZZLEMAKER || this._type === ToolbarType.PUZZLEMAKER_EMBEDDED) {
            this._scrollContainer.addObject(this.addBaseButton, this._scrollContainer.content);
            this._scrollContainer.addObject(this.addPairButton, this._scrollContainer.content);
            this._scrollContainer.addObject(this.deleteButton, this._scrollContainer.content);
            this._scrollContainer.addObject(this.lockButton, this._scrollContainer.content);
            this._scrollContainer.addObject(this.moleculeButton, this._scrollContainer.content);
            this._setButtonToCategory(ButtonCategory.CREATE, this.addBaseButton);
            this._setButtonToCategory(ButtonCategory.CREATE, this.addPairButton);
            this._setButtonToCategory(ButtonCategory.CREATE, this.deleteButton);
            this._setButtonToCategory(ButtonCategory.CREATE, this.lockButton);
            this._setButtonToCategory(ButtonCategory.CREATE, this.moleculeButton);

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

        /*
        The lower toolbar structure is a HLayoutContainer wrapped in ScrollContainer wrapped in another HLayoutContainer
        The arrows are in the outer HLayoutContainer, along with the ScrollContainer
        The actual toolbar content is in the innermost HLayoutContainer
        */

        this.leftArrow = this.makeArrowButton('left');

        this.addObject(this.leftArrow, this.scrollContainerContainer);
        this.addObject(this.scrollContainer, this.scrollContainerContainer);

        this.actionMenu = new EternaMenu(EternaMenuStyle.PULLUP, true);
        this.addObject(this.actionMenu, this.lowerToolbarLayout);

        this._expandButtonContainer = new HLayoutContainer(0, VAlign.CENTER);
        this._content.addChild(this._expandButtonContainer);
        this.expandButton = new GameButton()
            .allStates(Bitmaps.ImgExpandArrow);
        this.addObject(this.expandButton, this._expandButtonContainer);
        this.collapseButton = new GameButton()
            .allStates(Bitmaps.ImgCollapseArrow);
        this.collapseButton.container.visible = false;
        this.addObject(this.collapseButton, this.lowerToolbarContainer);

        DisplayUtil.positionRelative(
            this.collapseButton.container, HAlign.CENTER, VAlign.BOTTOM,
            this.backgroundContainer, HAlign.CENTER, VAlign.BOTTOM,
            0, -10
        );

        this.regs.add(this.expandButton.clicked.connect(() => {
            if (this._isExpanded) return;
            this.expand();
            this.updateLayout();
        }));
        this.regs.add(this.collapseButton.clicked.connect(() => {
            if (!this._isExpanded) return;
            this.collapse();
            this.updateLayout();
        }));

        this.viewOptionsButton = new GameButton()
            .allStates(Bitmaps.ImgSettings)
            .disabled(undefined)
            .label('Settings', 14)
            .scaleBitmapToLabel()
            .tooltip('Game options');

        this.viewSolutionsButton = new ToolbarButton()
            .allStates(Bitmaps.ImgFile)
            .disabled(undefined)
            .tooltip('View all submitted designs for this puzzle.');

        if (this._type === ToolbarType.LAB || this._type === ToolbarType.FEEDBACK) {
            this._scrollContainer.addObject(this.viewSolutionsButton, this._scrollContainer.content);
        }

        this.specButton = new ToolbarButton()
            .allStates(Bitmaps.ImgSpec)
            .disabled(undefined)
            .tooltip("View RNA's melting point, dotplot and other specs (S)")
            .hotkey(KeyCode.KeyS);

        if (this._type !== ToolbarType.PUZZLEMAKER && this._type !== ToolbarType.PUZZLEMAKER_EMBEDDED) {
            this._scrollContainer.addObject(this.specButton, this._scrollContainer.content);
        }

        const resetTooltip = this._type === ToolbarType.PUZZLEMAKER || this._type === ToolbarType.PUZZLEMAKER_EMBEDDED
            ? 'Reset all bases to A' : 'Reset and try this puzzle again.';

        this.resetButton = new ToolbarButton()
            .allStates(Bitmaps.ImgReset)
            .tooltip(resetTooltip)
            .rscriptID(RScriptUIElementID.RESET)
            .setCategory(ButtonCategory.SOLVE);
        this._setButtonToCategory(ButtonCategory.SOLVE, this.resetButton);

        this.copyButton = new ToolbarButton()
            .allStates(Bitmaps.ImgCopy)
            .tooltip('Copy the current sequence')
            .setCategory(ButtonCategory.IMPORT_EXPORT);
        this._setButtonToCategory(ButtonCategory.IMPORT_EXPORT, this.copyButton);

        this.pasteButton = new ToolbarButton()
            .allStates(Bitmaps.ImgPaste)
            .tooltip('Type in a sequence')
            .setCategory(ButtonCategory.IMPORT_EXPORT);
        this._setButtonToCategory(ButtonCategory.IMPORT_EXPORT, this.pasteButton);

        if (this._type !== ToolbarType.FEEDBACK) {
            this._scrollContainer.addObject(this.resetButton, this._scrollContainer.content);
            this._scrollContainer.addObject(this.copyButton, this._scrollContainer.content);
            this._scrollContainer.addObject(this.pasteButton, this._scrollContainer.content);
        }

        this.nucleotideFindButton = new ToolbarButton()
            .allStates(Bitmaps.ImgFind)
            .disabled()
            .tooltip('Type a nucleotide index to put it in the center of the screen (J)')
            .hotkey(KeyCode.KeyJ);

        this._scrollContainer.addObject(this.nucleotideFindButton, this._scrollContainer.content);

        this.nucleotideRangeButton = new ToolbarButton()
            .allStates(Bitmaps.NovaPuzzleImg)
            .disabled()
            .tooltip('Enter a nucleotide range to view (V)')
            .hotkey(KeyCode.KeyV);

        this.explosionFactorButton = new ToolbarButton()
            .allStates(Bitmaps.ImgFlare)
            .disabled()
            .tooltip('Set explosion factor ([, ])')
            .setCategory(ButtonCategory.VIEW);
        this._setButtonToCategory(ButtonCategory.VIEW, this.explosionFactorButton);

        // this._scrollContainer.addObject(this.explosionFactorButton, this._scrollContainer.content);

        this.boostersMenu = new GameButton()
            .allStates(Bitmaps.NovaBoosters)
            .disabled(undefined)
            .setCategory(ButtonCategory.SOLVE);
        // this._setButtonToCategory(ButtonCategory.SOLVE, this.boostersMenu);

        // if (this._boostersData != null && this._boostersData.actions != null && this._showAdvancedMenus) {
        //     const boosterMenuIdx = this.actionMenu.addMenuButton(this.boostersMenu);
        //     for (let ii = 0; ii < this._boostersData.actions.length; ii++) {
        //         const data = this._boostersData.actions[ii];
        //         Booster.create(this.mode as PoseEditMode, data).then((booster) => {
        //             const button: GameButton = booster.createButton(14);
        //             this.regs.add(button.clicked.connect(() => booster.onRun()));
        //             this.actionMenu.addSubMenuButtonAt(boosterMenuIdx, button, ii);
        //             this.dynActionTools.push(button);
        //         });
        //     }
        // }

        this.moveButton = new GameButton()
            .allStates(Bitmaps.CustomLayout)
            .tooltip('Move a nucleotide or stem by Ctrl-Shift-Click')
            .setCategory(ButtonCategory.CUSTOM_LAYOUT);
        this.moveButton.display.buttonMode = true;
        this.moveButton.display.interactive = true;

        this.rotateStemButton = new GameButton()
            .allStates(Bitmaps.CustomLayout)
            .tooltip('Rotate stem clockwise 1/4 turn by Ctrl-Shift-Click')
            .setCategory(ButtonCategory.CUSTOM_LAYOUT);
        this.rotateStemButton.display.buttonMode = true;
        this.rotateStemButton.display.interactive = true;

        this.flipStemButton = new GameButton()
            .allStates(Bitmaps.CustomLayout)
            .tooltip('Flip stem by Ctrl-Shift-Click')
            .setCategory(ButtonCategory.CUSTOM_LAYOUT);
        this.flipStemButton.display.buttonMode = true;
        this.flipStemButton.display.interactive = true;

        this.snapToGridButton = new GameButton()
            .allStates(Bitmaps.CustomLayout)
            .tooltip('Snap current layout to a grid')
            .setCategory(ButtonCategory.CUSTOM_LAYOUT);
        this.snapToGridButton.display.buttonMode = true;
        this.snapToGridButton.display.interactive = true;

        this.downloadHKWSButton = new GameButton()
            .allStates(Bitmaps.CustomLayout)
            .tooltip('Download a draw_rna input file for the current layout')
            .setCategory(ButtonCategory.IMPORT_EXPORT);
        this.downloadHKWSButton.display.buttonMode = true;
        this.downloadHKWSButton.display.interactive = true;

        this.downloadSVGButton = new GameButton()
            .allStates(Bitmaps.CustomLayout)
            .tooltip('Download an SVG of the current RNA layout')
            .setCategory(ButtonCategory.IMPORT_EXPORT);
        this.downloadSVGButton.display.buttonMode = true;
        this.downloadSVGButton.display.interactive = true;

        if (this._showAdvancedMenus) {
            // this.addObject(this.moveButton, this.middle);
            // this.addObject(this.rotateStemButton, this.middle);
            // this.addObject(this.flipStemButton, this.middle);
            // this.addObject(this.snapToGridButton, this.middle);
            // this.addObject(this.downloadHKWSButton, this.middle);
            // this.addObject(this.downloadSVGButton, this.middle);
            this._setButtonToCategory(ButtonCategory.CUSTOM_LAYOUT, this.moveButton);
            this._setButtonToCategory(ButtonCategory.CUSTOM_LAYOUT, this.rotateStemButton);
            this._setButtonToCategory(ButtonCategory.CUSTOM_LAYOUT, this.flipStemButton);
            this._setButtonToCategory(ButtonCategory.CUSTOM_LAYOUT, this.snapToGridButton);
            this._setButtonToCategory(ButtonCategory.IMPORT_EXPORT, this.downloadHKWSButton);
            this._setButtonToCategory(ButtonCategory.IMPORT_EXPORT, this.downloadSVGButton);
        }

        if (this._type === ToolbarType.LAB) {
            this.submitButton.tooltip('Publish your solution!');
            this._scrollContainer.addObject(this.submitButton, this._scrollContainer.content);
        }

        this.freezeButton = new ToolbarButton()
            .allStates(Bitmaps.ImgFreeze)
            .tooltip('Frozen mode. Suspends/resumes folding engine calculations. (F)')
            .hotkey(KeyCode.KeyF)
            .rscriptID(RScriptUIElementID.FREEZE)
            .setCategory(ButtonCategory.SOLVE);
        this._setButtonToCategory(ButtonCategory.SOLVE, this.freezeButton);

        if (this._type === ToolbarType.LAB || this._type === ToolbarType.PUZZLE) {
            this._scrollContainer.addObject(this.freezeButton, this._scrollContainer.content);
            this.freezeButton.display.visible = Eterna.settings.freezeButtonAlwaysVisible.value;
            this.regs.add(Eterna.settings.freezeButtonAlwaysVisible.connect((visible) => {
                this.freezeButton.display.visible = visible;
                this.updateLayout();
            }));
        }

        this.pipButton = new ToolbarButton()
            .allStates(Bitmaps.ImgPip)
            .tooltip('Set PiP mode (P)')
            .hotkey(KeyCode.KeyP)
            .rscriptID(RScriptUIElementID.PIP);

        if (
            this._states > 1
            && this._type !== ToolbarType.PUZZLEMAKER && this._type !== ToolbarType.PUZZLEMAKER_EMBEDDED
        ) {
            this._scrollContainer.addObject(this.pipButton, this._scrollContainer.content);
        }

        this.naturalButton = new GameButton()
            .up(Bitmaps.ImgNative)
            .over(Bitmaps.ImgNativeOver)
            .down(Bitmaps.ImgNativeOver)
            .selected(Bitmaps.ImgNativeOver)
            .tooltip('Natural Mode. RNA folds into the most stable shape. (Space)')
            .rscriptID(RScriptUIElementID.TOGGLENATURAL);

        this.estimateButton = new ToolbarButton()
            .allStates(Bitmaps.ImgEstimate)
            .tooltip('Estimate Mode. The game approximates how the RNA actually folded in a test tube.');

        this.targetButton = new GameButton()
            .up(Bitmaps.ImgTarget)
            .over(Bitmaps.ImgTargetOver)
            .down(Bitmaps.ImgTargetOver)
            .selected(Bitmaps.ImgTargetOver)
            .tooltip('Target Mode. RNA freezes into the desired shape. (Space)')
            .rscriptID(RScriptUIElementID.TOGGLETARGET);

        if (this._type !== ToolbarType.PUZZLEMAKER_EMBEDDED) {
            if (this._type !== ToolbarType.FEEDBACK) {
                this._scrollContainer.addObject(this.estimateButton, this._scrollContainer.content);
            } else {
                this._scrollContainer.addObject(this.naturalButton, this._scrollContainer.content);
            }

            // this._scrollContainer.addObject(this.targetButton, this._scrollContainer.content);
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
            this.letterColorButton.toggled.value = false;
            this._scrollContainer.addObject(this.letterColorButton, this._scrollContainer.content);

            this.expColorButton.toggled.value = true;
            this._scrollContainer.addObject(this.expColorButton, this._scrollContainer.content);
        }

        this.palette = new NucleotidePalette();

        this.regs.add(this.palette.targetClicked.connect(() => {
            this._deselectAllPaintTools();
        }));

        this.pairSwapButton = new ToolbarButton()
            .allStates(Bitmaps.ImgSwap)
            .tooltip('Swap paired bases. (5)')
            .rscriptID(RScriptUIElementID.SWAP)
            .setCategory(ButtonCategory.SOLVE);
        this._setButtonToCategory(ButtonCategory.SOLVE, this.pairSwapButton);

        this.screenshotButton = new ToolbarButton()
            .allStates(Bitmaps.ImgScreenshot)
            .tooltip('Screenshot')
            .disabled(undefined)
            .setCategory(ButtonCategory.IMPORT_EXPORT);
        this._setButtonToCategory(ButtonCategory.IMPORT_EXPORT, this.screenshotButton);

        this.futureFeatureButton = new ToolbarButton()
            .allStates(Bitmaps.FutureFeature)
            .tooltip('Something')
            .disabled(undefined);

        this._scrollContainer.addObject(this.screenshotButton, this._scrollContainer.content);

        this.settingsButton = new ToolbarButton()
            .allStates(Bitmaps.ImgSettings)
            .tooltip('Game options');
        this.undoButton = new GameButton()
            .allStates(Bitmaps.ImgUndo)
            .tooltip('Undo')
            .hotkey(KeyCode.KeyZ)
            .rscriptID(RScriptUIElementID.UNDO)
            .setCategory(ButtonCategory.SOLVE);
        this._setButtonToCategory(ButtonCategory.SOLVE, this.undoButton);

        this.redoButton = new GameButton()
            .allStates(Bitmaps.ImgRedo)
            .tooltip('Redo')
            .hotkey(KeyCode.KeyY)
            .rscriptID(RScriptUIElementID.REDO)
            .setCategory(ButtonCategory.SOLVE);
        this._setButtonToCategory(ButtonCategory.SOLVE, this.redoButton);

        if (this._type !== ToolbarType.FEEDBACK) {
            this.leftButtonsGroup = new ButtonsGroup([this.settingsButton, this.futureFeatureButton]);
            this.rightButtonsGroup = new ButtonsGroup([this.undoButton, this.redoButton]);
            this.addObject(this.leftButtonsGroup, this.top);
            this.top.addHSpacer(SPACE_WIDE);
            this.addObject(this.palette, this.top);
            this.top.addHSpacer(SPACE_WIDE);
            this.addObject(this.rightButtonsGroup, this.top);
            this.palette.changeDefaultMode();
            this.leftButtonsGroup._content.interactive = true;
            this.leftButtonsGroup._content.on('pointerup', (e: InteractionEvent) => {
                this.onDragEnd(e);
            });
            this.leftButtonsGroup._content.on('pointerupoutside', (e: InteractionEvent) => {
                this.onDragEnd(e);
            });
            this.leftButtonsGroup._content.on('pointermove', (e) => {
                this.onDragMove(e);
            });
            this.leftButtonsGroup._content.on('pointerdown', (e: InteractionEvent) => {
                this.onDragStart(e);
            });

            this.rightButtonsGroup._content.interactive = true;
            this.rightButtonsGroup._content.on('pointerup', (e: InteractionEvent) => {
                this.onDragEnd(e);
            });
            this.rightButtonsGroup._content.on('pointerupoutside', (e: InteractionEvent) => {
                this.onDragEnd(e);
            });
            this.rightButtonsGroup._content.on('pointermove', (e) => {
                this.onDragMove(e);
            });
            this.rightButtonsGroup._content.on('pointerdown', (e: InteractionEvent) => {
                this.onDragStart(e);
            });

            this._scrollContainer.addObject(this.pairSwapButton, this._scrollContainer.content);

            this.regs.add(this.pairSwapButton.clicked.connect(() => {
                this._deselectAllPaintTools();
                this.pairSwapButton.toggled.value = true;
            }));

            if (this._boostersData != null && this._boostersData.paint_tools != null) {
                const mode: PoseEditMode = this.mode as PoseEditMode;
                const boosterPaintToolsLayout = new HLayoutContainer();
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

        if (!Eterna.MOBILE_APP) {
            this.zoomInButton = new GameButton()
                .up(Bitmaps.ImgZoomIn)
                .over(Bitmaps.ImgZoomInOver)
                .down(Bitmaps.ImgZoomInHit)
                .disabled(Bitmaps.ImgZoomInDisable)
                .tooltip('Zoom in (=)')
                .hotkey(KeyCode.Equal)
                .rscriptID(RScriptUIElementID.ZOOMIN)
                .setCategory(ButtonCategory.VIEW);
            this._setButtonToCategory(ButtonCategory.VIEW, this.zoomInButton);
            this._scrollContainer.addObject(this.zoomInButton, this._scrollContainer.content);

            this.zoomOutButton = new GameButton()
                .up(Bitmaps.ImgZoomOut)
                .over(Bitmaps.ImgZoomOutOver)
                .down(Bitmaps.ImgZoomOutHit)
                .disabled(Bitmaps.ImgZoomOutDisable)
                .tooltip('Zoom out (-)')
                .hotkey(KeyCode.Minus)
                .rscriptID(RScriptUIElementID.ZOOMOUT)
                .setCategory(ButtonCategory.VIEW);
            this._setButtonToCategory(ButtonCategory.VIEW, this.zoomOutButton);
            this._scrollContainer.addObject(this.zoomOutButton, this._scrollContainer.content);
        }

        this.baseMarkerButton = new ToolbarButton()
            .allStates(Bitmaps.ImgBaseMarker)
            .tooltip('Mark bases (hold ctrl)')
            .setCategory(ButtonCategory.ANNOTATE);
        this._setButtonToCategory(ButtonCategory.ANNOTATE, this.baseMarkerButton);

        if (this.type !== ToolbarType.FEEDBACK) {
            this._scrollContainer.addObject(this.baseMarkerButton, this._scrollContainer.content);
        }

        this.regs.add(this.baseMarkerButton.clicked.connect(() => {
            this._deselectAllPaintTools();
            this.baseMarkerButton.toggled.value = true;
        }));

        this.librarySelectionButton = new ToolbarButton()
            .up(Bitmaps.RandomBtn)
            .over(Bitmaps.RandomBtnOver)
            .down(Bitmaps.RandomBtn)
            .tooltip('Select bases to randomize')
            .setCategory(ButtonCategory.SOLVE);
        this._setButtonToCategory(ButtonCategory.SOLVE, this.librarySelectionButton);

        if (this._showLibrarySelect) {
            this._scrollContainer.addObject(this.librarySelectionButton, this._scrollContainer.content);

            this.regs.add(this.librarySelectionButton.clicked.connect(() => {
                this._deselectAllPaintTools();
                this.librarySelectionButton.toggled.value = true;
            }));
        }

        this.magicGlueButton = new ToolbarButton()
            .up(Bitmaps.ImgMagicGlue)
            .over(Bitmaps.ImgMagicGlueOver)
            .down(Bitmaps.ImgMagicGlue)
            .tooltip('Magic glue - change target structure in purple areas (Hold Alt)')
            .setCategory(ButtonCategory.SOLVE);
        this._setButtonToCategory(ButtonCategory.SOLVE, this.magicGlueButton);
        if (this._showGlue) {
            this._scrollContainer.addObject(this.magicGlueButton, this._scrollContainer.content);
        }

        this.regs.add(this.magicGlueButton.clicked.connect(() => {
            this._deselectAllPaintTools();
            this.magicGlueButton.toggled.value = true;
        }));

        if (this._annotationManager) {
            this.annotationModeButton = new ToolbarButton()
                .up(Bitmaps.ImgAnnotationMode)
                .over(Bitmaps.ImgAnnotationModeOver)
                .down(Bitmaps.ImgAnnotationMode)
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

                this.regs.add(this.annotationModeButton.clicked.connect(() => {
                    this._deselectAllPaintTools();
                    this.annotationModeButton.toggled.value = true;

                    Assert.assertIsDefined(this._annotationManager);
                    // this._annotationManager.setAnnotationMode(true);
                }));

                this.regs.add(this._annotationManager.viewAnnotationDataUpdated.connect(() => {
                    // this.annotationPanel.updatePanel();
                }));
            }
        }

        if (this._type === ToolbarType.PUZZLEMAKER) {
            this.submitButton.tooltip('Publish your puzzle!');
            this._scrollContainer.addObject(this.submitButton, this._scrollContainer.content);
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

        this.lowerToolbarContainer.addChild(this._tabsContainer);
        this._renderButtonsWithNewCategory(ButtonCategory.SOLVE);
        tab1.enable();
    }

    private _updateAvailableButtonsContainer(): void {
        let offset = 0;
        for (const child of this._scrollContainer.content.children) {
            if (!child.buttonMode || !child.visible) continue;
            const bounds = child.getLocalBounds();
            child.x = offset;
            child.y = 0;
            offset += bounds.width;
        }
    }

    private resetDragState(): void {
        Assert.assertIsDefined(this._draggingElement);
        Assert.assertIsDefined(this._startPoint);

        this._draggingElement.position.copyFrom(this._startPoint);
        this._draggingElement.interactive = true;
        this._draggingElement = null;
        this._startPoint = null;
        this._startPointContainer = null;
    }

    private _toggleButtonsInteractive(value: boolean): void {
        this.leftButtonsGroup.toggleInteractive(value);
        this.rightButtonsGroup.toggleInteractive(value);
        this._scrollContainer.content.children.forEach((button) => {
            button.interactive = value;
        });
    }

    private _setButtonToCategory(category: ButtonCategory, button: GameButton): void {
        const prev = this._tabs.get(category);
        if (!prev) throw new Error('unknown category provided');

        prev.push(button);
    }

    private _getButtonCategory(target: DisplayObject): ButtonCategory | null {
        return Array.from(this._tabs.values()).flat().find((button) => button.display === target)?.category ?? null;
    }

    private onDragStart(e: InteractionEvent): void {
        e.stopPropagation();
        if (e.target === this._scrollNextButton.container || e.target === this._scrollPrevButton.container) return;
        if (!e.target.buttonMode) return;
        if (this._isDragging || !this._isExpanded) return;
        if (DisplayUtil.hitTest(this.leftButtonsGroup.container, e.data.global)) {
            this._startPointContainer = this.leftButtonsGroup._content;
        }
        if (DisplayUtil.hitTest(this.rightButtonsGroup.container, e.data.global)) {
            this._startPointContainer = this.rightButtonsGroup._content;
        }
        if (DisplayUtil.hitTest(this._scrollContainer.content, e.data.global)) {
            this._startPointContainer = this._scrollContainer.content;
        }

        if (!this._startPointContainer) return;
        if (this._startPointContainer.children.length <= 1) return;

        this._isDragging = true;
        this._draggingElement = e.target;
        this._startPoint = new Point(e.target.position.x, e.target.position.y);
        this._startPointGlobal = new Point(e.data.global.x, e.data.global.y);
        const btnIndex = this._startPointContainer.children.findIndex((el) => el === this._draggingElement);
        if (btnIndex >= 0) {
            this._draggingElementIndex = btnIndex;
        }
    }

    private _getUnderButtonIndex(buttonSize: number, pos: number): number {
        return Math.floor(pos / buttonSize);
    }

    private _getPointsDifference(p1: Point, p2: Point): Point {
        const x = Math.abs(p1.x - p2.x);
        const y = Math.abs(p1.y - p2.y);
        return new Point(x, y);
    }

    private _updateActiveButtonsGroup(
        currentButtonGroup: ButtonsGroup,
        currentButtonBounds: Rectangle,
        startPointContainer: Container,
        draggingElement: DisplayObject,
        anotherButtonGroup: ButtonsGroup,
        lastKnownPoint: Point
    ): void {
        Assert.assertIsDefined(this._draggingElement);
        if (currentButtonGroup._content.children.length < 3) {
            this.container.removeChild(this._draggingElement);
            currentButtonGroup.addButton(draggingElement);
        } else {
            const minX = currentButtonBounds.x;
            const cursorX = lastKnownPoint.x;
            const pos = cursorX - minX;
            const underButtonIndex = this._getUnderButtonIndex(55, pos);

            if (startPointContainer === anotherButtonGroup._content) {
                const replacedButton = currentButtonGroup.removeButtonAt(underButtonIndex);
                this.container.removeChild(this._draggingElement);
                anotherButtonGroup.addButton(replacedButton);
                currentButtonGroup.addButtonAt(draggingElement, underButtonIndex);
            } else {
                const replacedButton = currentButtonGroup.removeButtonAt(underButtonIndex);
                this.container.removeChild(this._draggingElement);
                currentButtonGroup.addButtonAt(draggingElement, underButtonIndex);
                if (this._currentTab.category === this._getButtonCategory(replacedButton)) {
                    this._scrollContainer.content.addChildAt(replacedButton, this._draggingElementIndex);
                }
                replacedButton.interactive = true;
            }
        }
        currentButtonGroup.resizeContainer();
        anotherButtonGroup.resizeContainer();
    }

    private onDragEnd(e: InteractionEvent): void {
        e.stopPropagation();
        this._isDragging = false;
        this._canDrag = false;
        if (!this._draggingElement || !this._isExpanded || !this._startPoint || !this._startPointContainer) return;
        if (
            this._startPoint?.x === e.data.global.x
            && this._startPoint?.y === e.data.global.y
        ) {
            this._toggleButtonsInteractive(true);
            return;
        }

        const leftButtonsRect = this.leftButtonsGroup.container.getBounds();
        const rightButtonsRect = this.rightButtonsGroup.container.getBounds();
        const availableButtonsRect = this._scrollContainer.content.getBounds();

        const leftButtonsBounds = new Rectangle(
            leftButtonsRect.x,
            leftButtonsRect.y,
            leftButtonsRect.width,
            leftButtonsRect.height
        );
        const rightButtonsBounds = new Rectangle(
            rightButtonsRect.x,
            rightButtonsRect.y,
            rightButtonsRect.width,
            rightButtonsRect.height
        );
        const availableButtonsBounds = new Rectangle(
            availableButtonsRect.x,
            availableButtonsRect.y,
            availableButtonsRect.width,
            availableButtonsRect.height
        );
        // for some reason the height of the container changes when button is dragging
        leftButtonsBounds.height = 52;
        rightButtonsBounds.height = 52;
        availableButtonsBounds.height = 52;

        leftButtonsBounds.width = this.leftButtonsGroup._content.children.length * 55;
        rightButtonsBounds.width = this.rightButtonsGroup._content.children.length * 55;
        // availableButtonsBounds.width = this._scrollContainer.content.children.length * 55;
        availableButtonsBounds.width = 605;

        if (
            !leftButtonsBounds.contains(e.data.global.x, e.data.global.y)
            && !rightButtonsBounds.contains(e.data.global.x, e.data.global.y)
            && !availableButtonsBounds.contains(e.data.global.x, e.data.global.y)
        ) {
            this.container.removeChild(this._draggingElement);
            this._startPointContainer.addChild(this._draggingElement);
            this._toggleButtonsInteractive(true);
            this.resetDragState();
            return;
        }

        if (leftButtonsBounds.contains(e.data.global.x, e.data.global.y)) {
            if (this.leftButtonsGroup._content === this._startPointContainer) {
                this.container.removeChild(this._draggingElement);
                this.leftButtonsGroup.addButtonAt(this._draggingElement, this._draggingElementIndex);
                this.resetDragState();
                this.updateLayout();
                this._toggleButtonsInteractive(true);
                return;
            }
            this._updateActiveButtonsGroup(
                this.leftButtonsGroup,
                leftButtonsBounds,
                this._startPointContainer,
                this._draggingElement,
                this.rightButtonsGroup,
                e.data.global
            );
            this._toggleButtonsInteractive(true);
        } else if (rightButtonsBounds.contains(e.data.global.x, e.data.global.y)) {
            if (this.rightButtonsGroup._content === this._startPointContainer) {
                this.container.removeChild(this._draggingElement);
                this.rightButtonsGroup.addButtonAt(this._draggingElement, this._draggingElementIndex);
                this.resetDragState();
                this.updateLayout();
                this._toggleButtonsInteractive(true);
                return;
            }
            this._updateActiveButtonsGroup(
                this.rightButtonsGroup,
                rightButtonsBounds,
                this._startPointContainer,
                this._draggingElement,
                this.leftButtonsGroup,
                e.data.global
            );
            this._toggleButtonsInteractive(true);
        } else if (availableButtonsBounds.contains(e.data.global.x, e.data.global.y)) {
            if (this._startPointContainer === this._scrollContainer.content) {
                this.container.removeChild(this._draggingElement);
                this._scrollContainer.content.addChild(this._draggingElement);
                this.resetDragState();
                this.updateLayout();
                this._toggleButtonsInteractive(true);
                return;
            }
            this.container.removeChild(this._draggingElement);
            if (this._currentTab.category === this._getButtonCategory(this._draggingElement)) {
                this._scrollContainer.content.addChild(this._draggingElement);
            }
            this._draggingElement.interactive = true;
            this._updateAvailableButtonsContainer();
            if (this._startPointContainer === this.leftButtonsGroup._content) {
                this.leftButtonsGroup.resizeContainer();
            }
            if (this._startPointContainer === this.rightButtonsGroup._content) {
                this.rightButtonsGroup.resizeContainer();
            }
            this.updateLayout();
        }

        this._updateAvailableButtonsContainer();
        this._toggleButtonsInteractive(true);
        this._isDisabled = false;
        // this._draggingElement.interactive = true;
        this._draggingElement = null;
        this._startPoint = null;
        this.updateLayout();
    }

    private onDragMove(e: InteractionEvent): void {
        e.stopPropagation();
        if (!this._draggingElement || !this._isExpanded) return;

        Assert.assertIsDefined(this._startPointContainer);
        Assert.assertIsDefined(this._startPointGlobal);

        if (!this._isDisabled) {
            this._toggleButtonsInteractive(false);
            this._isDisabled = true;
        }

        const minPointDiff = 5;
        if (!this._canDrag) {
            const diff = this._getPointsDifference(e.data.global, this._startPointGlobal);
            if (diff.x < minPointDiff && diff.y < minPointDiff) return;

            this._startPointContainer.removeChild(this._draggingElement);
            this.container.addChild(this._draggingElement);
            this._canDrag = true;
        }
        this._draggingElement.interactive = false;
        if (this._isDragging && this._canDrag) {
            const pos = e.data.getLocalPosition(this._draggingElement.parent);
            const buttonBounds = this._draggingElement.getLocalBounds();
            this._draggingElement.position.set(
                pos.x - Math.floor(buttonBounds.width / 2),
                pos.y - Math.floor(buttonBounds.height / 2)
            );
        }
    }

    private collapse() {
        this._isExpanded = false;
        this.collapseButton.container.visible = false;
        this.expandButton.container.visible = true;
        this._tabsContainer.visible = false;

        // this.removeNamedObjects('test');
        this.addNamedObject(
            'test',
            new ParallelTask(
                new LocationTask(
                    0,
                    0,
                    3, Easing.easeOut, this.lowerToolbarLayout
                ),
                // new AlphaTask(0, 3, Easing.easeOut, this.middle),
                new VisibleTask(false, this.middle),
                // new AlphaTask(0, 3, Easing.easeOut, this.text),
                new VisibleTask(false, this.text),
                // new AlphaTask(0, 3, Easing.easeOut, this.backgroundContainerBackgroundContainer),
                new VisibleTask(false, this.backgroundContainerBackgroundContainer)
            )
        );
        this.leftButtonsGroup.changeMode(false);
        this.rightButtonsGroup.changeMode(false);
        this.updateLayout();
    }

    private expand() {
        this._isExpanded = true;
        this.collapseButton.container.visible = true;
        this.expandButton.container.visible = false;
        this._tabsContainer.visible = true;
        DisplayUtil.positionRelative(
            this.collapseButton.container, HAlign.CENTER, VAlign.BOTTOM,
            this.backgroundContainer, HAlign.CENTER, VAlign.BOTTOM,
            0, -10
        );
        // this.removeNamedObjects('test');
        this.addNamedObject(
            'test',
            new ParallelTask(
                new LocationTask(
                    0,
                    0,
                    3, Easing.easeOut, this.lowerToolbarLayout
                ),
                // new AlphaTask(1, 3, Easing.easeOut, this.middle),
                new VisibleTask(true, this.middle),
                // new AlphaTask(1, 3, Easing.easeOut, this.text),
                new VisibleTask(true, this.text),
                // new AlphaTask(1, 3, Easing.easeOut, this.backgroundContainerBackgroundContainer),
                new VisibleTask(true, this.backgroundContainerBackgroundContainer)
            )
        );

        this.leftButtonsGroup.changeMode(true);
        this.rightButtonsGroup.changeMode(true);
        this._updateAvailableButtonsContainer();
        this.updateLayout();
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
        this._scrollContainer.doLayout();
        this._content.layout(true);
        this.lowerToolbarLayout.layout(true);
        this.lowerToolbarContainer.layout(true);
        this._content.layout(true);

        this.middle.position.y += 30;
        this.text.position.y += 30;

        this.updateArrowVisibility();

        DisplayUtil.positionRelative(
            this._content, HAlign.CENTER, VAlign.BOTTOM,
            this._invisibleBackground, HAlign.CENTER, VAlign.BOTTOM
        );

        DisplayUtil.positionRelative(
            this.collapseButton.container, HAlign.CENTER, VAlign.BOTTOM,
            this.backgroundContainer, HAlign.CENTER, VAlign.BOTTOM,
            0, -10
        );

        DisplayUtil.positionRelative(
            this.expandButton.container, HAlign.CENTER, VAlign.BOTTOM,
            this._expandButtonContainer, HAlign.CENTER, VAlign.BOTTOM,
            0, -10
        );

        DisplayUtil.positionRelative(
            this._tabsContainer, HAlign.CENTER, VAlign.TOP,
            this.middle, HAlign.CENTER, VAlign.TOP,
            0, -20
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

        // this.actionMenu.enabled = !disable;

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

    private _scrollContainer: ScrollContainer;

    private _tabs: Map<ButtonCategory, GameButton[]>;
    private _tabsContainer: HLayoutContainer;
    private _currentTab: {container: Container, enable: () => void, disable: () => void, category: ButtonCategory};

    private _expandButtonContainer: HLayoutContainer;

    private _uncollapsedContentLoc: Point;
    private _autoCollapseRegs: RegistrationGroup | null;

    private _isExpanded: boolean;
    private _isDragging: boolean;
    private _canDrag: boolean;
    private _isDisabled: boolean;

    private _scrollStep: number;
    private _scrollOffset: number;

    private _draggingElement: DisplayObject | null;
    private _draggingElementIndex: number = 0;

    private _startPoint: Point | null;
    private _startPointGlobal: Point | null;
    private _startPointContainer: Container | null;

    private _scrollNextButton: GameButton;
    private _scrollPrevButton: GameButton;

    private _annotationManager: AnnotationManager | undefined;
}

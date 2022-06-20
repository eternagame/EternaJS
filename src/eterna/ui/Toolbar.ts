import {
    Graphics,
    Point,
    Sprite,
    Container,
    InteractionEvent,
    DisplayObject,
    Text,
    Rectangle
} from 'pixi.js';
import {RegistrationGroup, Signal} from 'signals';
import Eterna from 'eterna/Eterna';
import Booster from 'eterna/mode/PoseEdit/Booster';
import PoseEditMode from 'eterna/mode/PoseEdit/PoseEditMode';
import {
    ContainerObject,
    Flashbang,
    VLayoutContainer,
    HLayoutContainer,
    KeyCode,
    VAlign,
    HAlign,
    DisplayUtil,
    LocationTask,
    Easing,
    Assert,
    GameObjectRef,
    SerialTask,
    CallbackTask
} from 'flashbang';
import {BoostersData} from 'eterna/puzzle/Puzzle';
import Bitmaps from 'eterna/resources/Bitmaps';
import {
    RScriptUIElement,
    RScriptUIElementID
} from 'eterna/rscript/RScriptUIElement';
import BitmapManager from 'eterna/resources/BitmapManager';
import AnnotationManager from 'eterna/AnnotationManager';
import Fonts from 'eterna/util/Fonts';
import {FontWeight} from 'flashbang/util/TextBuilder';
import GameMode from 'eterna/mode/GameMode';
import NucleotidePalette from './NucleotidePalette';
import GameButton from './GameButton';
import ToggleBar from './ToggleBar';
import ScrollContainer from './ScrollContainer';
import AnnotationPanelDialog from './AnnotationPanelDialog';
import TextBalloon from './TextBalloon';
import BoosterDialog from './BoosterDialog';
import ToolbarButton, {ButtonCategory, BUTTON_WIDTH, ToolbarParam} from './ToolbarButton';

export enum ToolbarType {
    PUZZLE,
    PUZZLEMAKER,
    PUZZLEMAKER_EMBEDDED,
    LAB,
    FEEDBACK,
}

export const MIDDLE_BACKCOLOR = 0x043468;
const LINE_COLOR = 0x3397db;
const EDIT_BACKCOLOR = 0x21508c;

const TOP_HSPACE = 4;
const EMPTY_SIZE = 1;
const APPROX_ITEM_HEIGHT = 52;
const TAB_WIDTH = 60;
const TAB_HEIGHT = 20;
const TOOLBAR_WIDTH = 780;
let MIDDLE_WIDTH = TOOLBAR_WIDTH - 30 * 2;
const tabGap = 2;

export interface TopBarSetting {
    type: number;
    left: string[];
    right: string[];
}

export class ButtonsGroup extends ContainerObject {
    public _content: HLayoutContainer;
    private _background: Graphics;
    private _buttons: ToolbarButton[];
    private _editMode: boolean = false;
    public topTooltip: TextBalloon;
    public _cursor: Graphics;
    public _highlight: Graphics;
    public _capability: number;

    constructor(buttons: ToolbarButton[]) {
        super();
        this._buttons = buttons;
        this._capability = 3;
    }

    public get buttons() {
        return this._buttons;
    }

    protected added(): void {
        super.added();
        Assert.assertIsDefined(this.mode);

        this._background = new Graphics()
            .beginFill(MIDDLE_BACKCOLOR, 1)
            .drawRoundedRect(
                0,
                0,
                Math.max(this._buttons.length, EMPTY_SIZE) * BUTTON_WIDTH,
                APPROX_ITEM_HEIGHT,
                7
            )
            .endFill();

        this.container.addChild(this._background);
        this._highlight = new Graphics()
            .beginFill(0xc0c0c0, 0.4)
            .drawRoundedRect(0, 0, BUTTON_WIDTH, APPROX_ITEM_HEIGHT, 7)
            .endFill();
        this._cursor = new Graphics()
            .beginFill(0xc0c0c0)
            .drawRect(0, 2, 2, APPROX_ITEM_HEIGHT - 4)
            .endFill();
        this.container.addChild(this._highlight);
        this.container.addChild(this._cursor);
        this._highlight.visible = false;
        this._cursor.visible = false;

        this.topTooltip = new TextBalloon('', 0x0, 1);
        this.topTooltip.display.visible = false;
        this.addObject(this.topTooltip, this.mode.container);

        this._content = new HLayoutContainer();
        for (const button of this._buttons) {
            button.display.visible = true;
            this.addObject(button, this._content);
        }
        this._content.layout(true);
        this.container.addChild(this._content);
    }

    public resizeContainer(): void {
        this.changeMode(this._editMode);
        this._content.layout(true);
    }

    public toggleInteractive(value: boolean): void {
        this._content.children.forEach((button) => {
            button.interactive = value;
        });
    }

    public changeMode(value: boolean): void {
        this._editMode = value;
        if (value) {
            this._background
                .clear()
                .lineStyle(1, LINE_COLOR, 1)
                .beginFill(MIDDLE_BACKCOLOR, 1)
                .drawRoundedRect(
                    -1,
                    -1,
                    Math.max(this._content.children.length, EMPTY_SIZE)
                        * BUTTON_WIDTH
                        + 2,
                    APPROX_ITEM_HEIGHT + 2,
                    7
                )
                .endFill();

            this._background.width = Math.max(this._content.children.length, EMPTY_SIZE)
                    * BUTTON_WIDTH
                + 2;
        } else {
            this._highlight.visible = false;
            this._cursor.visible = false;
            this.topTooltip.display.visible = false;

            this._background
                .clear()
                .beginFill(MIDDLE_BACKCOLOR, 1)
                .drawRoundedRect(
                    0,
                    0,
                    Math.max(this._content.children.length, EMPTY_SIZE)
                        * BUTTON_WIDTH,
                    APPROX_ITEM_HEIGHT,
                    7
                )
                .endFill();

            this._background.width = Math.max(this._content.children.length, EMPTY_SIZE)
                * BUTTON_WIDTH;
        }
    }

    public addButton(newButton: DisplayObject): void {
        this._content.addChildAt(newButton, 0);
        this._background.width = Math.max(this._content.children.length, EMPTY_SIZE) * BUTTON_WIDTH;
        this._content.layout(true);
    }

    public addButtonAt(newButton: DisplayObject, position: number): void {
        this._content.addChildAt(newButton, position);
        this._background.width = Math.max(this._content.children.length, EMPTY_SIZE) * BUTTON_WIDTH;
        this._content.layout(true);
    }

    public swapButton(bt1: DisplayObject, bt2: DisplayObject) {
        this._content.swapChildren(bt1, bt2);
        this._content.layout();
    }

    public getButtonAt(id: number): DisplayObject {
        return this._content.getChildAt(id);
    }

    public removeButton(button: DisplayObject): void {
        const childrenIndex = this._content.children.findIndex(
            (el) => el === button
        );
        if (childrenIndex < 0) return;
        this._content.removeChildAt(childrenIndex);
        this._background.width = Math.max(this._content.children.length, EMPTY_SIZE) * BUTTON_WIDTH;
        this._content.layout(true);
    }

    public removeButtonAt(index: number): Container {
        const bt = this._content.removeChildAt(index);
        this._content.layout(true);
        return bt;
    }

    public getButtonIndex(button: DisplayObject): number {
        return this._content.children.findIndex((el) => el === button);
    }

    public forceLayout(): void {
        this._content.layout(true);
    }
}

type VoidHandler = () => void;

export default class Toolbar extends ContainerObject {
    public zoomInButton: ToolbarButton;
    public zoomOutButton: ToolbarButton;
    public pipButton: ToolbarButton;
    public stateToggle: ToggleBar;

    public targetButton: ToolbarButton;
    public naturalButton: ToolbarButton;
    public annotationPanelDlg: AnnotationPanelDialog;

    public screenshotButton: ToolbarButton;

    public specButton: ToolbarButton;
    public _contextMenuDialogRef: GameObjectRef = GameObjectRef.NULL;

    public settingsButton: ToolbarButton;

    public lowerHLayout: HLayoutContainer;
    public scrollContainer: ScrollContainer;
    public scrollContainerContainer: HLayoutContainer;

    public leftArrow: ToolbarButton;
    public rightArrow: ToolbarButton;

    // Pose Editing
    public palette: NucleotidePalette;
    public pairSwapButton: ToolbarButton;
    public baseShiftButton: ToolbarButton;

    public undoButton: ToolbarButton;
    public redoButton: ToolbarButton;
    public resetButton: ToolbarButton;
    public copyButton: ToolbarButton;
    public pasteButton: ToolbarButton;
    public nucleotideFindButton: ToolbarButton;
    public nucleotideRangeButton: ToolbarButton;
    public explosionFactorButton: ToolbarButton;

    // Annotations
    public annotationModeButton: ToolbarButton;
    public annotationPanelButton: ToolbarButton;

    public freezeButton: ToolbarButton;
    public boostersMenuButton: ToolbarButton;

    public selected3DFile: Signal<FileList | null>;

    public baseMarkerButton: ToolbarButton;

    public librarySelectionButton: ToolbarButton;
    public magicGlueButton: ToolbarButton;
    public moveButton: ToolbarButton;
    public rotateStemButton: ToolbarButton;
    public flipStemButton: ToolbarButton;
    public snapToGridButton: ToolbarButton;
    public downloadHKWSButton: ToolbarButton;
    public downloadSVGButton: ToolbarButton;

    public dynPaintTools: ToolbarButton[] = [];
    public dynActionTools: ToolbarButton[] = [];

    public expandButton: GameButton;
    public collapseButton: GameButton;

    public activeButtons: ToolbarButton[] = [];

    public get position() {
        return new Point(this._vContent.x, this._vContent.y);
    }

    // Puzzle Maker
    public addBaseButton: ToolbarButton;
    public addPairButton: ToolbarButton;
    public deleteButton: ToolbarButton;
    public lockButton: ToolbarButton;
    public moleculeButton: ToolbarButton;
    public validate3DButton: ToolbarButton;

    // Feedback
    public estimateButton: ToolbarButton;
    public letterColorButton: ToolbarButton;
    public expColorButton: ToolbarButton;

    // Lab + Feedback
    public viewSolutionsButton: ToolbarButton;

    // Puzzle Maker + Lab
    public submitButton: ToolbarButton;

    public leftButtonsGroup: ButtonsGroup;
    public rightButtonsGroup: ButtonsGroup;

    public lowerVContainer: VLayoutContainer;
    public topHLayout: HLayoutContainer;
    public topScrollContainer: ScrollContainer;
    public middleHLayout: HLayoutContainer;
    public topBg: Graphics;
    public middleBg: Graphics;
    public tabsBg: Graphics;
    public backgroundContainer: Container;
    public background: Graphics;
    public textHLayout: HLayoutContainer;
    public textScrollContainer: ScrollContainer;
    public text: Text;
    private handlers: {
        pairSwapButtonHandler: VoidHandler;
        baseMarkerButtonHandler: VoidHandler;
        settingsButtonHandler: VoidHandler;
    };

    private visiblities: Map<DisplayObject, boolean> = new Map();

    constructor(
        type: ToolbarType,
        {
            states = 1,
            boosters,
            showGlue = false,
            showLibrarySelect = false,
            annotationManager
        }: {
            states?: number;
            boosters?: BoostersData;
            showGlue?: boolean;
            showFreeze?: boolean;
            showAdvancedMenus?: boolean;
            showLibrarySelect?: boolean;
            annotationManager?: AnnotationManager;
        },
        handlers: {
            pairSwapButtonHandler: VoidHandler;
            baseMarkerButtonHandler: VoidHandler;
            settingsButtonHandler: VoidHandler;
        }
    ) {
        super();
        this._type = type;
        this._states = states;
        this._showGlue = showGlue;
        this._showLibrarySelect = showLibrarySelect;
        this._boostersData = boosters ?? null;
        this._annotationManager = annotationManager;
        this._scrollStep = BUTTON_WIDTH;
        this._scrollOffset = 0;
        this.handlers = handlers;

        this.makeTargetButtons();
    }

    public onResized() {
        this.resizeToolbar();
        const mode = this.mode as GameMode;
        mode.updateUILayout();
    }

    private _renderButtonsWithNewCategory(category: ButtonCategory): void {
        this.middleScrollContainer.content.removeChildren();
        this.middleScrollContainer.content.addChild(this.middleBg);
        this.visiblities.clear();
        const newButtons = this._tabs.get(category);
        newButtons?.forEach((button) => {
            this.visiblities.set(button.display, button.display.visible);
            this.middleScrollContainer.content.addChild(button.display);
        });

        // this.middleScrollContainer.content.children.forEach((c) => {
        //     const v = this.visiblities.get(c);
        //     if (v) c.visible = v;
        //     else if(c.buttonMode) c.visible = false;
        // });

        this._updateAvailableButtonsContainer();
    }

    // eslint-disable-next-line max-len
    private _createTab(title: ButtonCategory): {
        container: Container;
        enable: () => void;
        disable: () => void;
        category: ButtonCategory;
        tabWidth: number;
    } {
        const tabText = new Text(title, {
            fontSize: 10,
            fontFamily: Fonts.STDFONT,
            fill: 0xffffff,
            fontWeight: FontWeight.REGULAR
        });
        const tabWidth = Math.max(tabText.width + 20, TAB_WIDTH);

        const tabBg = new Graphics()
            .beginFill(0x0c2040)
            .drawRect(0, 4, tabWidth, TAB_HEIGHT - 4)
            .drawRoundedRect(0, 0, tabWidth, 10, 8)
            .endFill();

        const tabContainer = new Container();

        tabContainer.addChild(tabBg);
        tabContainer.addChild(tabText);
        const textX = tabWidth / 2 - tabText.width / 2;
        const textY = (TAB_HEIGHT - tabText.height) / 2;
        tabText.position.set(textX, textY);
        tabContainer.interactive = true;
        tabContainer.buttonMode = true;
        const enable = (): void => {
            this._currentTab?.disable();
            tabBg
                .clear()
                .beginFill(MIDDLE_BACKCOLOR)
                .drawRect(0, 4, tabWidth, TAB_HEIGHT - 4)
                .drawRoundedRect(0, 0, tabWidth, 10, 8)
                .endFill();
        };

        const disable = (): void => {
            tabBg
                .clear()
                .beginFill(0x0c2040)
                .drawRect(0, 4, tabWidth, TAB_HEIGHT - 4)
                .drawRoundedRect(0, 0, tabWidth, 10, 8)
                .endFill();
        };
        new ContainerObject(tabContainer).pointerTap.connect(() => {
            this._currentTab.disable();
            tabBg
                .clear()
                .beginFill(MIDDLE_BACKCOLOR)
                .drawRect(0, 4, tabWidth, TAB_HEIGHT - 4)
                .drawRoundedRect(0, 0, tabWidth, 10, 8)
                .endFill();
            this._renderButtonsWithNewCategory(title);
            this._currentTab = {
                container: tabContainer,
                enable,
                disable,
                category: title,
                tabWidth
            };
        });

        return {
            container: tabContainer,
            enable,
            disable,
            category: title,
            tabWidth
        };
    }

    private makeTabs() {
        this._tabs = new Map([
            [ButtonCategory.INFO, []],
            [ButtonCategory.SOLVE, []],
            [ButtonCategory.CREATE, []],
            [ButtonCategory.VIEW, []],
            [ButtonCategory.ANNOTATE, []],
            [ButtonCategory.IMPORT_EXPORT, []],
            [ButtonCategory.CUSTOM_LAYOUT, []]
        ]);

        this._tabsScrollContainer = new ScrollContainer(
            MIDDLE_WIDTH,
            TAB_HEIGHT
        );
        this.tabsBg = new Graphics()
            .beginFill(MIDDLE_BACKCOLOR)
            .drawRect(0, 0, MIDDLE_WIDTH, TAB_HEIGHT)
            .endFill();
        this._tabsScrollContainer.content.addChild(this.tabsBg);
        this.tabsBg.visible = false;

        this._tabsHContainer = new HLayoutContainer(2);
        this.addObject(this._tabsScrollContainer, this._tabsHContainer);

        this._tabsHContainer.visible = false;

        this._tabArray = [];
        const tab0 = this._createTab(ButtonCategory.INFO);
        const tab1 = this._createTab(ButtonCategory.SOLVE);
        const tab2 = this._createTab(ButtonCategory.CREATE);
        const tab3 = this._createTab(ButtonCategory.VIEW);
        const tab4 = this._createTab(ButtonCategory.ANNOTATE);
        const tab5 = this._createTab(ButtonCategory.IMPORT_EXPORT);
        const tab6 = this._createTab(ButtonCategory.CUSTOM_LAYOUT);

        this._tabArray.push(tab0);
        this._tabArray.push(tab1);
        this._tabArray.push(tab2);
        this._tabArray.push(tab3);
        this._tabArray.push(tab4);
        this._tabArray.push(tab5);
        this._tabArray.push(tab6);

        let totalWidth = 0;
        this._tabArray.forEach((tab) => {
            totalWidth += tab.tabWidth;
            totalWidth += tabGap;
        });

        this._currentTab = tab1;

        this._tabsScrollContainer.addObject(
            new ContainerObject(tab0.container),
            this._tabsScrollContainer.content
        );
        this._tabsScrollContainer.addObject(
            new ContainerObject(tab1.container),
            this._tabsScrollContainer.content
        );
        this._tabsScrollContainer.addObject(
            new ContainerObject(tab2.container),
            this._tabsScrollContainer.content
        );
        this._tabsScrollContainer.addObject(
            new ContainerObject(tab3.container),
            this._tabsScrollContainer.content
        );
        this._tabsScrollContainer.addObject(
            new ContainerObject(tab4.container),
            this._tabsScrollContainer.content
        );
        this._tabsScrollContainer.addObject(
            new ContainerObject(tab5.container),
            this._tabsScrollContainer.content
        );
        this._tabsScrollContainer.addObject(
            new ContainerObject(tab6.container),
            this._tabsScrollContainer.content
        );
        let offset = 0;
        for (const child of this._tabsScrollContainer.content.children) {
            if (!child.visible) continue;
            const bounds = child.getLocalBounds();
            child.x = offset;
            child.y = 0;
            offset += bounds.width + tabGap;
        }
        this._tabsScrollContainer.doLayout();
        this._tabsScrollContainer.content.interactive = true;
        let downed = false;
        let downX = 0;
        this._tabsScrollContainer.pointerDown.connect((e: InteractionEvent) => {
            downed = true;
            downX = e.data.global.x;
        });
        this._tabsScrollContainer.pointerMove.connect((e: InteractionEvent) => {
            if (downed) {
                const dx = downX - e.data.global.x;
                const dW = totalWidth
                        - this._tabsScrollContainer.scrollX
                        - MIDDLE_WIDTH;
                if (totalWidth > MIDDLE_WIDTH && dW - dx > 0) {
                    this._tabsScrollContainer.scrollX += dx;
                }
                downX = e.data.global.x;
            }
        });
        this._tabsScrollContainer.pointerUp.connect(() => {
            downed = false;
        });
        this._tabsScrollContainer.pointerUpOutside.connect(() => {
            downed = false;
        });
    }

    private layoutTabs() {
        this._tabArray.forEach((tab) => {
            const newButtons = this._tabs.get(tab.category);
            if (!newButtons || newButtons.length === 0) {
                tab.container.visible = false;
            } else tab.container.visible = true;
        });
        let offset = 0;
        for (const child of this._tabsScrollContainer.content.children) {
            if (!child.visible) continue;
            const bounds = child.getLocalBounds();
            child.x = offset;
            child.y = 0;
            offset += bounds.width + tabGap;
        }
        this._tabsScrollContainer.doLayout();
    }

    private createToolbarButton(paramInfo:ToolbarParam) {
        const button = ToolbarButton.createButton(paramInfo);
        this._bottomButtons.set(
            paramInfo.name,
            ToolbarButton.createButton(paramInfo)
        );
        this.toolbarButtons.set(paramInfo.name, button);
        return button;
    }

    private makeInfoButtons() {
        this.submitButton = this.createToolbarButton({
            cat: ButtonCategory.INFO,
            name: 'Submit',
            allImg: Bitmaps.ImgSubmit,
            overImg: Bitmaps.ImgOverSubmit,
            disableImg: Bitmaps.ImgGreySubmit,
            tooltip: 'Publish your solution!'
        });

        this.viewSolutionsButton = this.createToolbarButton({
            cat: ButtonCategory.INFO,
            name: 'Solutions',
            allImg: Bitmaps.ImgViewSolutions,
            overImg: Bitmaps.ImgOverViewSolutions,
            disableImg: Bitmaps.ImgGreyViewSolutions,
            tooltip: 'View all submitted designs for this puzzle.'
        });

        this.specButton = this.createToolbarButton({
            cat: ButtonCategory.INFO,
            name: 'Spec',
            allImg: Bitmaps.ImgSpec,
            overImg: Bitmaps.ImgOverSpec,
            disableImg: Bitmaps.ImgGreySpec,
            tooltip: "View RNA's melting point, dotplot and other specs (S)",
            hotKey: KeyCode.KeyS
        });

        this.settingsButton = this.createToolbarButton({
            cat: ButtonCategory.INFO,
            name: 'Settings',
            allImg: Bitmaps.ImgSettings,
            overImg: Bitmaps.ImgOverSettings,
            disableImg: Bitmaps.ImgGreySettings,
            tooltip: 'Game options'
        });
        this.settingsButton.clicked.connect(
            this.handlers.settingsButtonHandler
        );
    }

    private makeInfoLayout() {
        if (
            this._type === ToolbarType.LAB
            || this._type === ToolbarType.FEEDBACK
        ) {
            this.pushButtonToCategory(this.viewSolutionsButton);
        }
        if (
            this._type !== ToolbarType.PUZZLEMAKER
            && this._type !== ToolbarType.PUZZLEMAKER_EMBEDDED
        ) {
            this.pushButtonToCategory(this.specButton);
        }

        if (this._type === ToolbarType.LAB) {
            this.submitButton.tooltip('Publish your solution!');
            this.getMirrorButtons(this.submitButton).forEach((b) => { if (b) b.tooltip('Publish your solution!'); });
            this.pushButtonToCategory(this.submitButton);
        } else if (this._type === ToolbarType.PUZZLEMAKER) {
            this.submitButton.tooltip('Publish your puzzle!');
            this.getMirrorButtons(this.submitButton).forEach((b) => { if (b) b.tooltip('Publish your puzzle!'); });
            this.pushButtonToCategory(this.submitButton);
        }

        this.pushButtonToCategory(this.settingsButton);
    }

    private makeCreateButtons() {
        this.addBaseButton = this.createToolbarButton({
            cat: ButtonCategory.CREATE,
            name: 'Add base',
            allImg: Bitmaps.ImgAddBase,
            overImg: Bitmaps.ImgOverAddBase,
            disableImg: Bitmaps.ImgGreyAddBase,
            tooltip: 'Add a single base.',
            hotKey: KeyCode.Digit6
        });

        this.addPairButton = this.createToolbarButton({
            cat: ButtonCategory.CREATE,
            name: 'Add pair',
            allImg: Bitmaps.ImgAddPair,
            overImg: Bitmaps.ImgOverAddPair,
            disableImg: Bitmaps.ImgGreyAddPair,
            tooltip: 'Add a pair.',
            hotKey: KeyCode.Digit7
        });

        this.deleteButton = this.createToolbarButton({
            cat: ButtonCategory.CREATE,
            name: 'Delete',
            allImg: Bitmaps.ImgDelete,
            overImg: Bitmaps.ImgOverDelete,
            disableImg: Bitmaps.ImgGreyDelete,
            tooltip: 'Delete a base or a pair.',
            hotKey: KeyCode.Digit8
        });

        this.lockButton = this.createToolbarButton({
            cat: ButtonCategory.CREATE,
            name: 'Lock',
            allImg: Bitmaps.ImgLock,
            overImg: Bitmaps.ImgOverLock,
            disableImg: Bitmaps.ImgGreyLock,
            tooltip: 'Lock or unlock a base.',
            hotKey: KeyCode.Digit9
        });

        this.moleculeButton = this.createToolbarButton({
            cat: ButtonCategory.CREATE,
            name: 'Molecule',
            allImg: Bitmaps.ImgMolecule,
            overImg: Bitmaps.ImgOverMolecule,
            disableImg: Bitmaps.ImgGreyMolecule,
            tooltip: 'Create or remove a molecular binding site.',
            hotKey: KeyCode.Digit0
        });

        this.validate3DButton = this.createToolbarButton({
            cat: ButtonCategory.CREATE,
            name: 'Open 3D',
            allImg: Bitmaps.ImgValidate3D,
            overImg: Bitmaps.ImgOverValidate3D,
            disableImg: Bitmaps.ImgGreyValidate3D,
            tooltip: 'Validate 3D Models'
        });

        this.regs.add(
            this.addBaseButton.clicked.connect(() => {
                this._deselectAllPaintTools();
                this.addBaseButton.toggled.value = true;
                this.getMirrorButtons(this.addBaseButton).forEach((b) => { if (b) b.toggled.value = true; });
            })
        );
        this.regs.add(
            this.addPairButton.clicked.connect(() => {
                this._deselectAllPaintTools();
                this.addPairButton.toggled.value = true;
                this.getMirrorButtons(this.addPairButton).forEach((b) => { if (b) b.toggled.value = true; });
            })
        );
        this.regs.add(
            this.deleteButton.clicked.connect(() => {
                this._deselectAllPaintTools();
                this.deleteButton.toggled.value = true;
                this.getMirrorButtons(this.deleteButton).forEach((b) => { if (b) b.toggled.value = true; });
            })
        );
        this.regs.add(
            this.lockButton.clicked.connect(() => {
                this._deselectAllPaintTools();
                this.lockButton.toggled.value = true;
                this.getMirrorButtons(this.lockButton).forEach((b) => { if (b) b.toggled.value = true; });
            })
        );
        this.regs.add(
            this.moleculeButton.clicked.connect(() => {
                this._deselectAllPaintTools();
                this.moleculeButton.toggled.value = true;
                this.getMirrorButtons(this.moleculeButton).forEach((b) => { if (b) b.toggled.value = true; });
            })
        );
    }

    private makeCreateLayout() {
        if (
            this._type === ToolbarType.PUZZLEMAKER
            || this._type === ToolbarType.PUZZLEMAKER_EMBEDDED
        ) {
            this.pushButtonToCategory(this.addBaseButton);
            this.pushButtonToCategory(this.addPairButton);
            this.pushButtonToCategory(this.deleteButton);
            this.pushButtonToCategory(this.lockButton);
            this.pushButtonToCategory(this.moleculeButton);
            this.pushButtonToCategory(this.validate3DButton);
        }
    }

    private makeSolveButtons() {
        this.resetButton = this.createToolbarButton({
            cat: ButtonCategory.SOLVE,
            name: 'Reset',
            allImg: Bitmaps.ImgReset,
            overImg: Bitmaps.ImgOverReset,
            disableImg: Bitmaps.ImgGreyReset,
            tooltip: 'Reset',
            rscriptID: RScriptUIElementID.RESET
        });

        this.freezeButton = this.createToolbarButton({
            cat: ButtonCategory.SOLVE,
            name: 'Freeze',
            allImg: Bitmaps.ImgFreeze,
            overImg: Bitmaps.ImgOverFreeze,
            disableImg: Bitmaps.ImgGreyFreeze,
            tooltip: 'Frozen mode. Suspends/resumes folding engine calculations. (F)',
            hotKey: KeyCode.KeyF,
            rscriptID: RScriptUIElementID.FREEZE
        });

        this.baseShiftButton = this.createToolbarButton({
            cat: ButtonCategory.SOLVE,
            name: 'Shift base',
            allImg: Bitmaps.ImgBaseShift,
            overImg: Bitmaps.ImgOverBaseShift,
            disableImg: Bitmaps.ImgGreyBaseShift,
            tooltip: 'Base shift'
        });

        this.pairSwapButton = this.createToolbarButton({
            cat: ButtonCategory.SOLVE,
            name: 'Swap pair',
            allImg: Bitmaps.ImgPairSwap,
            overImg: Bitmaps.ImgOverPairSwap,
            disableImg: Bitmaps.ImgGreyPairSwap,
            tooltip: 'Swap paired bases',
            rscriptID: RScriptUIElementID.SWAP
        });
        this.pairSwapButton.clicked.connect(
            this.handlers.pairSwapButtonHandler
        );

        this.undoButton = this.createToolbarButton({
            cat: ButtonCategory.SOLVE,
            name: 'Undo',
            allImg: Bitmaps.ImgUndo,
            overImg: Bitmaps.ImgOverUndo,
            disableImg: Bitmaps.ImgGreyUndo,
            tooltip: 'Undo',
            hotKey: KeyCode.KeyZ,
            rscriptID: RScriptUIElementID.UNDO
        });

        this.redoButton = this.createToolbarButton({
            cat: ButtonCategory.SOLVE,
            name: 'Redo',
            allImg: Bitmaps.ImgRedo,
            overImg: Bitmaps.ImgOverRedo,
            disableImg: Bitmaps.ImgGreyRedo,
            tooltip: 'Redo',
            hotKey: KeyCode.KeyY,
            rscriptID: RScriptUIElementID.REDO
        });

        this.librarySelectionButton = this.createToolbarButton({
            cat: ButtonCategory.SOLVE,
            name: 'Select lib',
            allImg: Bitmaps.ImgLibrarySelection,
            overImg: Bitmaps.ImgOverLibrarySelection,
            disableImg: Bitmaps.ImgGreyLibrarySelection,
            tooltip: 'Select bases to randomize'
        });

        this.magicGlueButton = this.createToolbarButton({
            cat: ButtonCategory.SOLVE,
            name: 'Magic glue',
            allImg: Bitmaps.ImgMagicGlue,
            overImg: Bitmaps.ImgOverMagicGlue,
            disableImg: Bitmaps.ImgGreyMagicGlue,
            tooltip: 'Magic glue - change target structure in purple areas (Hold Alt)'
        });
        this.magicGlueButton.display.interactive = true;
    }

    private makeSolveLayout() {
        if (
            this._type === ToolbarType.LAB
            || this._type === ToolbarType.PUZZLE
        ) {
            this.pushButtonToCategory(this.freezeButton);
        }

        this.pushButtonToCategory(this.pairSwapButton);
        this.pushButtonToCategory(this.baseShiftButton);

        this.regs.add(
            this.pairSwapButton.clicked.connect(() => {
                this._deselectAllPaintTools();
                this.pairSwapButton.toggled.value = true;
                this.getMirrorButtons(this.pairSwapButton).forEach((b) => { if (b) b.toggled.value = true; });
            })
        );

        this.pushButtonToCategory(this.undoButton);
        this.pushButtonToCategory(this.redoButton);

        if (this._showLibrarySelect) {
            this.pushButtonToCategory(this.librarySelectionButton);
            this.regs.add(
                this.librarySelectionButton.clicked.connect(() => {
                    this._deselectAllPaintTools();
                    this.librarySelectionButton.toggled.value = true;
                    this.getMirrorButtons(this.librarySelectionButton).forEach((b) => {
                        if (b) b.toggled.value = true;
                    });
                })
            );
        }
        if (this._type !== ToolbarType.FEEDBACK) {
            this.pushButtonToCategory(this.resetButton);
        }

        if (this._showGlue) {
            this.pushButtonToCategory(this.magicGlueButton);
            this.regs.add(
                this.magicGlueButton.clicked.connect(() => {
                    this._deselectAllPaintTools();
                    this.magicGlueButton.toggled.value = true;
                    this.getMirrorButtons(this.magicGlueButton).forEach((b) => { if (b) b.toggled.value = true; });
                })
            );
        }
    }

    private makeInoutButtons() {
        this.copyButton = this.createToolbarButton({
            cat: ButtonCategory.IMPORT_EXPORT,
            name: 'Copy',
            allImg: Bitmaps.ImgCopy,
            overImg: Bitmaps.ImgOverCopy,
            disableImg: Bitmaps.ImgGreyCopy,
            tooltip: 'Copy the current sequence'
        });
        this.pasteButton = this.createToolbarButton({
            cat: ButtonCategory.IMPORT_EXPORT,
            name: 'Paste',
            allImg: Bitmaps.ImgPaste,
            overImg: Bitmaps.ImgOverPaste,
            disableImg: Bitmaps.ImgGreyPaste,
            tooltip: 'Type in a sequence'
        });

        this.downloadHKWSButton = this.createToolbarButton({
            cat: ButtonCategory.IMPORT_EXPORT,
            name: 'Download HKWS',
            allImg: Bitmaps.ImgDownloadHKWS,
            overImg: Bitmaps.ImgOverDownloadHKWS,
            disableImg: Bitmaps.ImgGreyDownloadHKWS,
            tooltip: 'Download a draw_rna input file for the current layout'
        });
        // this.downloadHKWSButton.display.buttonMode = true;
        // this.downloadHKWSButton.display.interactive = true;

        this.downloadSVGButton = this.createToolbarButton({
            cat: ButtonCategory.IMPORT_EXPORT,
            name: 'Download SVG',
            allImg: Bitmaps.ImgDownloadSVG,
            overImg: Bitmaps.ImgOverDownloadSVG,
            disableImg: Bitmaps.ImgGreyDownloadSVG,
            tooltip: 'Download an SVG of the current RNA layout'
        });
        // this.downloadSVGButton.display.buttonMode = true;
        // this.downloadSVGButton.display.interactive = true;

        this.screenshotButton = this.createToolbarButton({
            cat: ButtonCategory.IMPORT_EXPORT,
            name: 'Screenshot',
            allImg: Bitmaps.ImgScreenshot,
            overImg: Bitmaps.ImgOverScreenshot,
            disableImg: Bitmaps.ImgGreyScreenshot,
            tooltip: 'Screenshot'
        });
    }

    private makeInoutLayout() {
        if (this._type !== ToolbarType.FEEDBACK) {
            this.pushButtonToCategory(this.copyButton);
            this.pushButtonToCategory(this.pasteButton);
        }
        this.pushButtonToCategory(this.downloadHKWSButton);
        this.pushButtonToCategory(this.downloadSVGButton);
        this.pushButtonToCategory(this.screenshotButton);
    }

    private makeViewButtons() {
        this.nucleotideFindButton = this.createToolbarButton({
            cat: ButtonCategory.VIEW,
            name: 'Find',
            allImg: Bitmaps.ImgNucleotideFind,
            overImg: Bitmaps.ImgOverNucleotideFind,
            disableImg: Bitmaps.ImgGreyNucleotideFind,
            tooltip: 'Type a nucleotide index to put it in the center of the screen (J)',
            hotKey: KeyCode.KeyJ
        });

        this.nucleotideRangeButton = this.createToolbarButton({
            cat: ButtonCategory.VIEW,
            name: 'Range',
            allImg: Bitmaps.ImgNucleotideRange,
            overImg: Bitmaps.ImgOverNucleotideRange,
            disableImg: Bitmaps.ImgGreyNucleotideRange,
            tooltip: 'Enter a nucleotide range to view (V)',
            hotKey: KeyCode.KeyV
        });

        this.explosionFactorButton = this.createToolbarButton({
            cat: ButtonCategory.VIEW,
            name: 'Explosion factor',
            allImg: Bitmaps.ImgExplosionFactor,
            overImg: Bitmaps.ImgOverExplosionFactor,
            disableImg: Bitmaps.ImgGreyExplosionFactor,
            tooltip: 'Set explosion factor ([, ])'
        });

        this.pipButton = this.createToolbarButton({
            cat: ButtonCategory.VIEW,
            name: 'PiP',
            allImg: Bitmaps.ImgPip,
            overImg: Bitmaps.ImgOverPip,
            disableImg: Bitmaps.ImgGreyPip,
            tooltip: 'Set PiP mode (P)',
            hotKey: KeyCode.KeyP,
            rscriptID: RScriptUIElementID.PIP
        });

        this.zoomInButton = this.createToolbarButton({
            cat: ButtonCategory.VIEW,
            name: 'Zoom in',
            allImg: Bitmaps.ImgZoomIn,
            overImg: Bitmaps.ImgOverZoomIn,
            disableImg: Bitmaps.ImgGreyZoomIn,
            tooltip: 'Zoom in (=)',
            hotKey: KeyCode.Equal,
            rscriptID: RScriptUIElementID.ZOOMIN
        });

        this.zoomOutButton = this.createToolbarButton({
            cat: ButtonCategory.VIEW,
            name: 'Zoom out',
            allImg: Bitmaps.ImgZoomOut,
            overImg: Bitmaps.ImgOverZoomOut,
            disableImg: Bitmaps.ImgGreyZoomOut,
            tooltip: 'Zoom out (-)',
            hotKey: KeyCode.Minus,
            rscriptID: RScriptUIElementID.ZOOMOUT
        });
    }

    private makeViewLayout() {
        this.pushButtonToCategory(this.nucleotideFindButton);
        this.pushButtonToCategory(this.nucleotideRangeButton);
        this.pushButtonToCategory(this.explosionFactorButton);

        if (
            this._states > 1
            && this._type !== ToolbarType.PUZZLEMAKER
            && this._type !== ToolbarType.PUZZLEMAKER_EMBEDDED
        ) {
            this.pushButtonToCategory(this.pipButton);
        }

        if (!Eterna.MOBILE_APP) {
            this.pushButtonToCategory(this.zoomInButton);
            this.pushButtonToCategory(this.zoomOutButton);
        }
    }

    private makeCustomButtons() {
        this.moveButton = this.createToolbarButton({
            cat: ButtonCategory.CUSTOM_LAYOUT,
            name: 'Move',
            allImg: Bitmaps.ImgMove,
            overImg: Bitmaps.ImgOverMove,
            disableImg: Bitmaps.ImgGreyMove,
            tooltip: 'Move a nucleotide or stem by Ctrl-Shift-Click'
        });
        this.moveButton.display.buttonMode = true;
        this.moveButton.display.interactive = true;

        this.rotateStemButton = this.createToolbarButton({
            cat: ButtonCategory.CUSTOM_LAYOUT,
            name: 'Rotate stem',
            allImg: Bitmaps.ImgRotateStem,
            overImg: Bitmaps.ImgOverRotateStem,
            disableImg: Bitmaps.ImgGreyRotateStem,
            tooltip: 'Rotate stem clockwise 1/4 turn by Ctrl-Shift-Click'
        });
        this.rotateStemButton.display.buttonMode = true;
        this.rotateStemButton.display.interactive = true;

        this.flipStemButton = this.createToolbarButton({
            cat: ButtonCategory.CUSTOM_LAYOUT,
            name: 'Flip stem',
            allImg: Bitmaps.ImgFlipStem,
            overImg: Bitmaps.ImgOverFlipStem,
            disableImg: Bitmaps.ImgGreyFlipStem,
            tooltip: 'Flip stem by Ctrl-Shift-Click'
        });
        this.flipStemButton.display.buttonMode = true;
        this.flipStemButton.display.interactive = true;

        this.snapToGridButton = this.createToolbarButton({
            cat: ButtonCategory.CUSTOM_LAYOUT,
            name: 'Snap to grid',
            allImg: Bitmaps.ImgSnapToGrid,
            overImg: Bitmaps.ImgOverSnapToGrid,
            disableImg: Bitmaps.ImgGreySnapToGrid,
            tooltip: 'Snap current layout to a grid'
        });
        this.snapToGridButton.display.buttonMode = true;
        this.snapToGridButton.display.interactive = true;
    }

    private makeCustomLayout() {
        this.pushButtonToCategory(this.moveButton);
        this.pushButtonToCategory(this.rotateStemButton);
        this.pushButtonToCategory(this.flipStemButton);
        this.pushButtonToCategory(this.snapToGridButton);
    }

    private makeAnnotateButtons() {
        this.baseMarkerButton = this.createToolbarButton({
            cat: ButtonCategory.ANNOTATE,
            name: 'Base marker',
            allImg: Bitmaps.ImgBaseMarker,
            overImg: Bitmaps.ImgOverBaseMarker,
            disableImg: Bitmaps.ImgGreyBaseMarker,
            tooltip: 'Mark bases (hold ctrl)'
        });
        this.baseMarkerButton.display.interactive = true;

        this.annotationModeButton = this.createToolbarButton({
            cat: ButtonCategory.ANNOTATE,
            name: 'Annotation mode',
            allImg: Bitmaps.ImgAnnotationMode,
            overImg: Bitmaps.ImgOverAnnotationMode,
            disableImg: Bitmaps.ImgGreyAnnotationMode,
            tooltip: 'Annotation mode'
        });
        this.annotationModeButton.display.interactive = true;

        this.annotationPanelButton = this.createToolbarButton({
            cat: ButtonCategory.ANNOTATE,
            name: 'Annotation panel',
            allImg: Bitmaps.ImgAnnotationPanel,
            overImg: Bitmaps.ImgOverAnnotationPanel,
            disableImg: Bitmaps.ImgGreyAnnotationPanel,
            tooltip: 'Annotation panel'
        });
        this.annotationPanelButton.display.interactive = true;
    }

    private makeAnnotateLayout() {
        if (this.type !== ToolbarType.FEEDBACK) {
            this.pushButtonToCategory(this.baseMarkerButton);
            this.baseMarkerButton.clicked.connect(
                this.handlers.baseMarkerButtonHandler
            );
        }
        this.regs.add(
            this.baseMarkerButton.clicked.connect(() => {
                this._deselectAllPaintTools();
                this.baseMarkerButton.toggled.value = true;
                this.getMirrorButtons(this.baseMarkerButton).forEach((b) => { if (b) b.toggled.value = true; });
            })
        );

        if (this._annotationManager) {
            this.pushButtonToCategory(this.annotationModeButton);
            this.pushButtonToCategory(this.annotationPanelButton);

            this.regs.add(
                this.annotationModeButton.clicked.connect(() => {
                    this._deselectAllPaintTools();
                    this.annotationModeButton.toggled.value = true;
                    this.getMirrorButtons(this.annotationModeButton).forEach((b) => { if (b) b.toggled.value = true; });

                    Assert.assertIsDefined(this._annotationManager);
                    // this._annotationManager.setAnnotationMode(true);
                })
            );

            this.regs.add(
                this.annotationPanelButton.clicked.connect(() => {
                    Assert.assertIsDefined(this._annotationManager);
                    const mode = this.mode as GameMode;
                    this.annotationPanelDlg = new AnnotationPanelDialog(this._annotationManager);
                    mode.showDialog(this.annotationPanelDlg);
                })
            );

            this.regs.add(
                this._annotationManager.viewAnnotationDataUpdated.connect(
                    () => {
                        if (this.annotationPanelDlg) this.annotationPanelDlg.updateFinalFloatLocation();
                    }
                )
            );
        }
    }

    private makeTargetButtons() {
        this.naturalButton = ToolbarButton.createButton({
            color: {color: MIDDLE_BACKCOLOR, alpha: 1},
            cat: ButtonCategory.NONE,
            name: 'naturalButton',
            allImg: Bitmaps.ImgNatural,
            overImg: Bitmaps.ImgOverNatural,
            disableImg: Bitmaps.ImgGreyNatural,
            selectedImg: Bitmaps.ImgNatural,
            tooltip: 'Natural Mode. RNA folds into the most stable shape.',
            rscriptID: RScriptUIElementID.TOGGLENATURAL
        });

        this.estimateButton = ToolbarButton.createButton({
            color: {color: MIDDLE_BACKCOLOR, alpha: 1},
            cat: ButtonCategory.NONE,
            name: 'estimateButton',
            allImg: Bitmaps.ImgEstimate,
            overImg: Bitmaps.ImgOverEstimate,
            disableImg: Bitmaps.ImgGreyEstimate,
            selectedImg: Bitmaps.ImgEstimate,
            tooltip: 'Estimate Mode. The game approximates how the RNA actually folded in a test tube.'
        });

        this.targetButton = ToolbarButton.createButton({
            color: {color: MIDDLE_BACKCOLOR, alpha: 1},
            cat: ButtonCategory.NONE,
            name: 'targetButton',
            allImg: Bitmaps.ImgTarget,
            overImg: Bitmaps.ImgOverTarget,
            disableImg: Bitmaps.ImgGreyTarget,
            selectedImg: Bitmaps.ImgTarget,
            tooltip: 'Target Mode. RNA freezes into the desired shape.',
            rscriptID: RScriptUIElementID.TOGGLETARGET
        });

        this.stateToggle = new ToggleBar(this._states);
    }

    private makeFeedbackLayout() {
        this.letterColorButton = this.createToolbarButton({
            cat: ButtonCategory.VIEW,
            name: 'Letter color',
            allImg: Bitmaps.ImgLetterColor,
            overImg: Bitmaps.ImgOverLetterColor,
            disableImg: Bitmaps.ImgGreyLetterColor,
            selectedImg: Bitmaps.ImgLetterColor,
            tooltip: 'Color sequences based on base colors as in the game.'
        });

        this.expColorButton = this.createToolbarButton({
            cat: ButtonCategory.VIEW,
            name: 'Exp color',
            allImg: Bitmaps.ImgExpColor,
            overImg: Bitmaps.ImgOverExpColor,
            disableImg: Bitmaps.ImgGreyExpColor,
            selectedImg: Bitmaps.ImgExpColor,
            tooltip: 'Color sequences based on experimental data.'
        });

        if (this._type === ToolbarType.FEEDBACK) {
            this.letterColorButton.toggled.value = false;
            this.getMirrorButtons(this.letterColorButton).forEach((b) => { if (b) b.toggled.value = false; });
            this.addObject(
                this.letterColorButton,
                this.middleScrollContainer.content
            );

            this.expColorButton.toggled.value = true;
            this.getMirrorButtons(this.expColorButton).forEach((b) => { if (b) b.toggled.value = true; });
            this.addObject(
                this.expColorButton,
                this.middleScrollContainer.content
            );
        }
    }

    private initializeTopButtons() {
        const leftBts: ToolbarButton[] = [];
        const rightBts: ToolbarButton[] = [];

        const leftButtonNames: string[] = [];
        const rightButtonNames: string[] = [];

        if (
            this._type === ToolbarType.PUZZLEMAKER
            || this._type === ToolbarType.PUZZLEMAKER_EMBEDDED
        ) {
            // add
        } else if (this._type === ToolbarType.LAB) {
            leftBts.push(this.getMirrorButton(this.viewSolutionsButton) as ToolbarButton);
            leftBts.push(this.getMirrorButton(this.submitButton) as ToolbarButton);

            leftButtonNames.push(this.viewSolutionsButton.name as string);
            leftButtonNames.push(this.submitButton.name as string);
        } else if (this._type === ToolbarType.PUZZLE) {
            // add code
        }
        leftBts.push(this.getMirrorButton(this.settingsButton) as ToolbarButton);
        leftButtonNames.push(this.settingsButton.name as string);

        leftBts.forEach((b) => {
            if (b.name) {
                b.display.visible = true;
                this._bottomButtons.delete(b.name);
                this._topButtons.set(b.name, b);
            }
        });
        this.leftButtonsGroup = new ButtonsGroup(leftBts);

        if (this.pairSwapButton.display.visible) {
            rightBts.push(this.getMirrorButton(this.pairSwapButton) as ToolbarButton);
            rightButtonNames.push(this.pairSwapButton.name as string);
        }
        rightBts.push(this.getMirrorButton(this.undoButton) as ToolbarButton);
        rightBts.push(this.getMirrorButton(this.redoButton) as ToolbarButton);
        rightButtonNames.push(this.undoButton.name as string);
        rightButtonNames.push(this.redoButton.name as string);
        rightBts.forEach((b) => {
            if (b.name) {
                b.display.visible = true;
                this._bottomButtons.delete(b.name);
                this._topButtons.set(b.name, b);
            }
        });
        this.rightButtonsGroup = new ButtonsGroup(rightBts);

        Eterna.settings.topToolbarSettings.value = {
            type: this._type,
            left: leftButtonNames,
            right: rightButtonNames
        };
    }

    private saveTopButtons() {
        const leftButtonNames: string[] = [];
        const rightButtonNames: string[] = [];
        this.leftButtonsGroup._content.children.forEach((e) => {
            leftButtonNames.push(e.name);
        });
        this.rightButtonsGroup._content.children.forEach((e) => {
            rightButtonNames.push(e.name);
        });
        Eterna.settings.topToolbarSettings.value = {
            type: this._type,
            left: leftButtonNames,
            right: rightButtonNames
        };
    }

    private makeTopLayout() {
        Assert.assertIsDefined(Flashbang.stageWidth);

        this.palette = new NucleotidePalette();

        this.regs.add(
            this.palette.targetClicked.connect(() => {
                this._deselectAllPaintTools();
            })
        );

        if (this._type !== ToolbarType.FEEDBACK) {
            const topToolbarSettings = Eterna.settings.topToolbarSettings.value;
            if (topToolbarSettings === null) {
                this.initializeTopButtons();
            } else {
                try {
                    const leftBts: ToolbarButton[] = [];
                    const rightBts: ToolbarButton[] = [];
                    if (topToolbarSettings.type === this._type) {
                        topToolbarSettings.left.forEach((name) => {
                            leftBts.push(
                                this.getMirrorButton(
                                    this.toolbarButtons.get(name) as ToolbarButton
                                ) as ToolbarButton
                            );
                        });
                        topToolbarSettings.right.forEach((name) => {
                            rightBts.push(
                                this.getMirrorButton(
                                    this.toolbarButtons.get(name) as ToolbarButton
                                ) as ToolbarButton
                            );
                        });
                        leftBts.forEach((b) => {
                            if (b.name) {
                                b.display.visible = true;
                                this._bottomButtons.delete(b.name);
                                this._topButtons.set(b.name, b);
                            }
                        });
                        this.leftButtonsGroup = new ButtonsGroup(leftBts);
                        rightBts.forEach((b) => {
                            if (b.name) {
                                b.display.visible = true;
                                this._bottomButtons.delete(b.name);
                                this._topButtons.set(b.name, b);
                            }
                        });
                        this.rightButtonsGroup = new ButtonsGroup(rightBts);
                    }
                } catch {
                    this._topButtons.clear();
                }
                if (this._topButtons.size === 0) {
                    this.initializeTopButtons();
                }
            }

            this.addObject(this.leftButtonsGroup, this.topScrollContainer.content);
            this.addObject(this.palette, this.topScrollContainer.content);
            this.palette.changeDefaultMode();
            this.addObject(this.rightButtonsGroup, this.topScrollContainer.content);
            this.topScrollContainer.doLayout();

            this.leftButtonsGroup._content.interactive = true;
            this.leftButtonsGroup._content.on('pointerup',
                (e: InteractionEvent) => {
                    this.onDragEnd(e);
                });
            this.leftButtonsGroup._content.on('pointerupoutside',
                (e: InteractionEvent) => {
                    this.onDragEnd(e);
                });
            this.leftButtonsGroup._content.on('pointermove', (e) => {
                this.onDragMove(e);
            });
            this.leftButtonsGroup._content.on('pointerdown',
                (e: InteractionEvent) => {
                    this.onDragStart(e);
                });

            this.rightButtonsGroup._content.interactive = true;
            this.rightButtonsGroup._content.on('pointerup',
                (e: InteractionEvent) => {
                    this.onDragEnd(e);
                });
            this.rightButtonsGroup._content.on('pointerupoutside',
                (e: InteractionEvent) => {
                    this.onDragEnd(e);
                });
            this.rightButtonsGroup._content.on('pointermove', (e) => {
                this.onDragMove(e);
            });
            this.rightButtonsGroup._content.on('pointerdown',
                (e: InteractionEvent) => {
                    this.onDragStart(e);
                });
        }
    }

    private makeBoosterMenu() {
        if (this._type !== ToolbarType.FEEDBACK && this._boostersData != null) {
            this.boostersMenuButton = this.createToolbarButton({
                cat: ButtonCategory.SOLVE,
                name: 'BoosterMenu',
                allImg: Bitmaps.ImgBoosters,
                overImg: Bitmaps.ImgOverBoosters,
                disableImg: Bitmaps.ImgGreyBoosters,
                tooltip: 'BoosterMenu'
            });
            this.boostersMenuButton.display.interactive = true;
            this.pushButtonToCategory(this.boostersMenuButton);

            this.boostersMenuButton.clicked.connect(() => {
                if (this._boostersData != null && this._boostersData.actions != null) {
                    const mode = this.mode as GameMode;
                    mode.showDialog(new BoosterDialog(this._boostersData));
                }
            });

            if (this._boostersData.paint_tools != null) {
                const mode: PoseEditMode = this.mode as PoseEditMode;
                for (const data of this._boostersData.paint_tools) {
                    Booster.create(mode, data).then((booster) => {
                        booster.onLoad();
                        const button: ToolbarButton = booster.createButton();
                        button.setCategory(ButtonCategory.SOLVE)
                            .setName(`BoosterPainting-${button.label}`);
                        this.regs.add(
                            button.clicked.connect(() => {
                                mode.setPosesColor(booster.toolColor);
                                this._deselectAllPaintTools();
                            })
                        );
                        this.dynPaintTools.push(button);
                        button.display.interactive = true;
                        this.pushButtonToCategory(button);
                    });
                }
            }
        }
    }

    public resizeToolbar() {
        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);

        const WIDTH = Math.min(TOOLBAR_WIDTH, Flashbang.stageWidth * 0.8);
        MIDDLE_WIDTH = WIDTH - (this._scrollPrevButton.display.width + this._scrollNextButton.display.width);

        this.background
            .clear()
            .beginFill(EDIT_BACKCOLOR, 1)
            .drawRect(0, 0, WIDTH, 223)
            .drawRoundedRect(0, -5, WIDTH, 10, 7)
            .endFill();

        this.middleBg
            .clear()
            .beginFill(MIDDLE_BACKCOLOR)
            .drawRect(0, 0, MIDDLE_WIDTH, 47)
            .drawRoundedRect(0, 43, MIDDLE_WIDTH, 10, 7)
            .endFill();

        this.tabsBg = new Graphics()
            .clear()
            .beginFill(MIDDLE_BACKCOLOR)
            .drawRect(0, 0, MIDDLE_WIDTH, TAB_HEIGHT)
            .endFill();

        this.topBg
            .clear()
            .beginFill(MIDDLE_BACKCOLOR, 0)
            .drawRect(0, 0, MIDDLE_WIDTH, BUTTON_WIDTH + 2)
            .endFill();

        this.middleBg.width = MIDDLE_WIDTH;
        this.tabsBg.width = MIDDLE_WIDTH;
        this.middleScrollContainer.setSize(MIDDLE_WIDTH, BUTTON_WIDTH);
        this._tabsScrollContainer.setSize(MIDDLE_WIDTH, TAB_HEIGHT);
        this.topScrollContainer.setSize(MIDDLE_WIDTH, BUTTON_WIDTH + 3);
        this.textScrollContainer.setSize(MIDDLE_WIDTH, this.text.height);

        this.updateLayout();
    }

    private updateTopContainer() {
        let palWidth = this.palette.display.width;
        if (this._type === ToolbarType.FEEDBACK) {
            palWidth = 0;
        } else {
            this.palette.display.visible = true;
        }

        const topSpace = TOOLBAR_WIDTH - palWidth - 2 * TOP_HSPACE;
        let buttonCapability = Math.floor(topSpace / BUTTON_WIDTH);
        if (buttonCapability < 6) buttonCapability = 6;

        this.rightButtonsGroup._capability = Math.floor(buttonCapability / 2);
        this.leftButtonsGroup._capability = buttonCapability - this.rightButtonsGroup._capability;

        while (
            this.leftButtonsGroup._content.children.length
            > this.leftButtonsGroup._capability
        ) {
            const element = this.leftButtonsGroup._content.children[0];
            let name = null;
            let button: ToolbarButton | null = null;
            let category: ButtonCategory | null = null;
            this._topButtons.forEach((bt, key) => {
                if (bt.display === element) {
                    name = key;
                    button = bt;
                    category = bt.category;
                }
            });
            if (name && button && category) {
                this._topButtons.delete(name);
                this._bottomButtons.set(name, button);
                this.leftButtonsGroup.removeButton(button);
                element.visible = false;
                this.middleScrollContainer.content.addChild(element);
                this.leftButtonsGroup.resizeContainer();
            }
        }
        while (
            this.rightButtonsGroup._content.children.length
            > this.rightButtonsGroup._capability
        ) {
            const element = this.rightButtonsGroup._content.children[0];
            let name = null;
            let button: ToolbarButton | null = null;
            let category: ButtonCategory | null = null;
            this._topButtons.forEach((bt, key) => {
                if (bt.display === element) {
                    name = key;
                    button = bt;
                    category = bt.category;
                }
            });
            if (name && button && category) {
                this._topButtons.delete(name);
                this._bottomButtons.set(name, button);
                this.rightButtonsGroup.removeButton(button);
                element.visible = false;
                this.middleScrollContainer.content.addChild(element);
                this.rightButtonsGroup.resizeContainer();
            }
        }

        const leftWidth = this.leftButtonsGroup.display.width;
        const rightWidth = this.rightButtonsGroup.display.width;

        const topWidth = leftWidth + TOP_HSPACE + palWidth + TOP_HSPACE + rightWidth;

        if (topWidth > MIDDLE_WIDTH) {
            this._scrollTopPrevButton.display.visible = true;
            this._scrollTopNextButton.display.visible = true;

            let x = 0;
            this.leftButtonsGroup.display.position.x = x;
            this.leftButtonsGroup.display.position.y = 1;
            x += leftWidth + TOP_HSPACE;

            if (this._type !== ToolbarType.FEEDBACK) {
                this.palette.display.position.x = x;
                this.palette.display.position.y = 1;
                x += palWidth + TOP_HSPACE;
            }
            this.rightButtonsGroup.display.position.x = x;
            this.rightButtonsGroup.display.position.y = 1;

            if (topWidth - this.topScrollContainer.scrollX < MIDDLE_WIDTH) {
                this.topScrollContainer.scrollX = topWidth - MIDDLE_WIDTH;
            } else if (this.topScrollContainer.scrollX < 0) {
                this.topScrollContainer.scrollX = 0;
            }
        } else {
            this._scrollTopPrevButton.display.visible = false;
            this._scrollTopNextButton.display.visible = false;

            const dx = (MIDDLE_WIDTH - topWidth) / 2;
            let x = dx;
            this.leftButtonsGroup.display.position.x = x;
            this.leftButtonsGroup.display.position.y = 1;
            x += leftWidth + TOP_HSPACE;

            if (this._type !== ToolbarType.FEEDBACK) {
                this.palette.display.position.x = x;
                this.palette.display.position.y = 1;
                x += palWidth + TOP_HSPACE;
            }
            this.rightButtonsGroup.display.position.x = x;
            this.rightButtonsGroup.display.position.y = 1;

            this.topScrollContainer.scrollX = 0;
        }
    }

    private updateEnableOfMiddleButtons() {
        const leftButtonNames: string[] = [];
        const rightButtonNames: string[] = [];

        this.leftButtonsGroup._content.children.forEach((e) => {
            leftButtonNames.push(e.name);
        });
        this.rightButtonsGroup._content.children.forEach((e) => {
            rightButtonNames.push(e.name);
        });

        this.toolbarButtons.forEach((bt) => {
            bt.enabled = true;
            bt.display.interactive = true;
        });
        leftButtonNames.forEach((name) => {
            const button = this.toolbarButtons.get(name);
            if (button) {
                button.enabled = false;
            }
        });
        rightButtonNames.forEach((name) => {
            const button = this.toolbarButtons.get(name);
            if (button) {
                button.enabled = false;
            }
        });
    }

    private updateLayout(): void {
        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);
        // Update the scroll container size, accounting for buttons
        const buttonOffset = this.leftArrow.display.width + this.rightArrow.display.width;
        this.scrollContainer.setSize(
            Flashbang.stageWidth - buttonOffset,
            Flashbang.stageHeight
        );

        this.topScrollContainer.doLayout();
        this._tabsScrollContainer.doLayout();
        this.middleScrollContainer.doLayout();
        this.textScrollContainer.doLayout();
        this.lowerVContainer.layout(true);
        this.lowerHLayout.layout(true);
        this._vContent.layout(true);

        this.middleHLayout.position.y += 30;
        this.textScrollContainer.display.position.y += 30;

        this.updateArrowVisibility();
        this.updateTopContainer();
        this.updateEnableOfMiddleButtons();

        // Center the toolbar
        this._vContent.x = (Flashbang.stageWidth - this._vContent.width) / 2;

        DisplayUtil.positionRelative(
            this.collapseButton.container,
            HAlign.CENTER,
            VAlign.BOTTOM,
            this.backgroundContainer,
            HAlign.CENTER,
            VAlign.BOTTOM,
            0,
            -10
        );

        DisplayUtil.positionRelative(
            this.expandButton.container,
            HAlign.CENTER,
            VAlign.BOTTOM,
            this._expandButtonContainer,
            HAlign.CENTER,
            VAlign.BOTTOM,
            0,
            -10
        );

        DisplayUtil.positionRelative(
            this._tabsHContainer,
            HAlign.LEFT,
            VAlign.TOP,
            this.middleScrollContainer.content,
            HAlign.LEFT,
            VAlign.TOP,
            0,
            -20
        );

        this._invisibleBackground
            .beginFill(0xff0000)
            .drawRect(0, Flashbang.stageHeight - 30, Flashbang.stageWidth, 30)
            .endFill();

        if (!this._isAutoCollapsed) {
            DisplayUtil.positionRelativeToStage(
                this._vContent,
                HAlign.CENTER,
                VAlign.BOTTOM,
                HAlign.CENTER,
                VAlign.BOTTOM,
                0,
                this._isExpanded ? 0 : -10
            );
        } else {
            DisplayUtil.positionRelativeToStage(
                this._vContent,
                HAlign.CENTER,
                VAlign.TOP,
                HAlign.CENTER,
                VAlign.BOTTOM,
                0,
                -10
            );
        }
    }

    private makeLayout() {
        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);

        this._invisibleBackground = new Graphics();
        this._invisibleBackground.alpha = 0;
        this.container.addChild(this._invisibleBackground);

        this._vContent = new VLayoutContainer(7);
        this.container.addChild(this._vContent);

        // LOWER TOOLBAR (palette, zoom, settings, etc)
        this.lowerHLayout = new HLayoutContainer(0, VAlign.BOTTOM);
        this.backgroundContainer = new Container();

        this._scrollPrevButton = new GameButton();
        this._scrollPrevButton.allStates(Bitmaps.PrevArrow);

        this._scrollNextButton = new GameButton();
        this._scrollNextButton.allStates(Bitmaps.NextArrow);

        this._scrollTopPrevButton = new GameButton();
        this._scrollTopPrevButton.allStates(Bitmaps.PrevArrow);

        this._scrollTopNextButton = new GameButton();
        this._scrollTopNextButton.allStates(Bitmaps.NextArrow);

        const WIDTH = Math.min(TOOLBAR_WIDTH, Flashbang.stageWidth * 0.8);
        MIDDLE_WIDTH = WIDTH - (this._scrollPrevButton.display.width + this._scrollNextButton.display.width);

        this.background = new Graphics()
            .beginFill(EDIT_BACKCOLOR, 1)
            .drawRect(0, 0, WIDTH, 223)
            .drawRoundedRect(0, -5, WIDTH, 10, 7)
            .endFill();
        this.background.visible = false;

        this.lowerVContainer = new VLayoutContainer();
        this.backgroundContainer.addChild(this.background);
        this.backgroundContainer.addChild(this.lowerVContainer);
        this.lowerHLayout.addChild(this.backgroundContainer);

        this.topHLayout = new HLayoutContainer();
        this.topBg = new Graphics()
            .beginFill(MIDDLE_BACKCOLOR, 0)
            .drawRect(0, 0, MIDDLE_WIDTH, BUTTON_WIDTH + 2)
            .endFill();
        this.topScrollContainer = new ScrollContainer(
            MIDDLE_WIDTH,
            BUTTON_WIDTH + 3
        );
        this.topScrollContainer.content.addChild(this.topBg);

        this.addObject(this._scrollTopPrevButton, this.topHLayout);
        this.addObject(this.topScrollContainer, this.topHLayout);
        this.addObject(this._scrollTopNextButton, this.topHLayout);

        this.middleHLayout = new HLayoutContainer();
        this.middleBg = new Graphics()
            .beginFill(MIDDLE_BACKCOLOR)
            .drawRect(0, 0, MIDDLE_WIDTH, 47)
            .drawRoundedRect(0, 43, MIDDLE_WIDTH, 10, 7)
            .endFill();
        this.middleHLayout.visible = false;
        this.lowerVContainer.addChild(this.topHLayout);

        // this.middleHLayout.position.set(this.middleHLayout.position.x, this.middleHLayout.position.y + 30);

        DisplayUtil.positionRelative(
            this._tabsHContainer,
            HAlign.CENTER,
            VAlign.TOP,
            this.middleHLayout,
            HAlign.CENTER,
            VAlign.TOP,
            0,
            -TAB_HEIGHT
        );

        this.addObject(this._scrollPrevButton, this.middleHLayout);

        this.middleScrollContainer = new ScrollContainer(
            MIDDLE_WIDTH,
            BUTTON_WIDTH
        );
        this.middleScrollContainer.content.addChild(this.middleBg);
        this.addObject(this.middleScrollContainer, this.middleHLayout);
        this.addObject(this._scrollNextButton, this.middleHLayout);
        this.lowerVContainer.addChild(this.middleHLayout);
        // eslint-disable-next-line max-len
        this.text = new Text(
            'Drag an icon to the right or left above to replace the existing tool, or tap an icon to use it.',
            {
                fontSize: 12,
                fontFamily: Fonts.STDFONT,
                fill: 0xabc9d8,
                fontWeight: FontWeight.MEDIUM
            }
        );
        this.textHLayout = new HLayoutContainer();
        this.textScrollContainer = new ScrollContainer(
            MIDDLE_WIDTH,
            this.text.height
        );
        this.textScrollContainer.content.addChild(this.text);
        this.textHLayout.visible = false;
        this.addObject(this.textScrollContainer, this.textHLayout);
        this.lowerVContainer.addVSpacer(14);
        this.lowerVContainer.addChild(this.textHLayout);

        this.scrollContainerContainer = new HLayoutContainer(0, VAlign.BOTTOM);
        this._vContent.addChild(this.scrollContainerContainer);

        this.scrollContainer = new ScrollContainer(
            Flashbang.stageWidth,
            Flashbang.stageHeight
        );
        this.scrollContainer.content.addChild(this.lowerHLayout);

        DisplayUtil.positionRelative(
            this.lowerVContainer,
            HAlign.CENTER,
            VAlign.TOP,
            this.backgroundContainer,
            HAlign.CENTER,
            VAlign.TOP,
            0,
            20
        );

        this.regs.add(
            this._scrollPrevButton.clicked.connect(() => {
                if (this._scrollOffset <= 0) return;
                this._scrollOffset
                    -= this._scrollOffset < this._scrollStep
                        ? this._scrollOffset
                        : this._scrollStep;
                this.middleScrollContainer.setScroll(this._scrollOffset, 0);
                const cntr = this.middleScrollContainer.content.children.reduce(
                    (acc, el) => {
                        if (!el.buttonMode || !el.visible) return acc;
                        return acc + 1;
                    },
                    0
                );
                const newWidth = cntr * this._scrollStep;
                this.middleBg.width = newWidth < MIDDLE_WIDTH ? MIDDLE_WIDTH : newWidth;
            })
        );

        this.regs.add(
            this._scrollNextButton.clicked.connect(() => {
                const contentWidth = this.middleScrollContainer.content.children.length
                    * this._scrollStep;
                if (contentWidth < this.middleScrollContainer.content.width) return;
                if (this._scrollOffset >= this.middleScrollContainer.maxScrollX) return;
                const diff = this.middleScrollContainer.maxScrollX - this._scrollOffset;
                this._scrollOffset
                    += diff < this._scrollStep ? diff : this._scrollStep;
                this.middleScrollContainer.setScroll(this._scrollOffset, 0);
                const cntr = this.middleScrollContainer.content.children.reduce(
                    (acc, el) => {
                        if (!el.buttonMode || !el.visible) return acc;
                        return acc + 1;
                    },
                    0
                );
                const newWidth = cntr * this._scrollStep;
                this.middleBg.width = newWidth < MIDDLE_WIDTH ? MIDDLE_WIDTH : newWidth;
            })
        );

        this.regs.add(
            this._scrollTopPrevButton.clicked.connect(() => {
                const width = this.topScrollContainer.content.width;
                const dW = width - MIDDLE_WIDTH;
                if (dW > 0 && this.topScrollContainer.scrollX > 0) {
                    this.topScrollContainer.scrollX -= Math.min(
                        BUTTON_WIDTH,
                        this.topScrollContainer.scrollX
                    );
                }
            })
        );

        this.regs.add(
            this._scrollTopNextButton.clicked.connect(() => {
                const width = this.topScrollContainer.content.width;
                const dW = width - MIDDLE_WIDTH;
                if (dW > 0) {
                    const dx = width - this.topScrollContainer.scrollX - MIDDLE_WIDTH;
                    if (dx > 0) {
                        this.topScrollContainer.scrollX += Math.min(
                            BUTTON_WIDTH,
                            dx
                        );
                    }
                }
            })
        );

        this.textScrollContainer.content.interactive = true;
        let downed = false;
        let downX = 0;
        this.textScrollContainer.pointerDown.connect((e) => {
            downed = true;
            downX = e.data.global.x;
        });
        this.textScrollContainer.pointerMove.connect((e) => {
            if (downed) {
                const dx = downX - e.data.global.x;
                const dW = this.text.width
                    - this.textScrollContainer.scrollX
                    - MIDDLE_WIDTH;
                if (this.text.width > MIDDLE_WIDTH && dW - dx > 0) {
                    this.textScrollContainer.scrollX += dx;
                }
                downX = e.data.global.x;
            }
        });
        this.textScrollContainer.pointerUp.connect(() => {
            downed = false;
        });
        this.textScrollContainer.pointerUpOutside.connect(() => {
            downed = false;
        });

        this._isDragging = false;
        this.middleHLayout.interactive = true;

        this.middleHLayout.on('pointerup', (e: InteractionEvent) => {
            this.onDragEnd(e);
        });

        this.middleHLayout.on('pointerupoutside', (e: InteractionEvent) => {
            this.onDragEnd(e);
        });

        this.middleHLayout.on('pointermove', (e) => {
            this.onDragMove(e);
        });

        this.middleHLayout.on('pointerdown', (e: InteractionEvent) => {
            this.onDragStart(e);
        });
    }

    private makeExpandControl() {
        this._expandButtonContainer = new HLayoutContainer(0, VAlign.CENTER);
        this._vContent.addChild(this._expandButtonContainer);
        this.expandButton = new GameButton();
        this.expandButton.allStates(Bitmaps.ImgExpandArrow);
        this.addObject(this.expandButton, this._expandButtonContainer);

        this.collapseButton = new GameButton();
        this.collapseButton.allStates(Bitmaps.ImgCollapseArrow);
        this.collapseButton.container.visible = false;
        this.addObject(this.collapseButton, this.lowerVContainer);

        DisplayUtil.positionRelative(
            this.collapseButton.container,
            HAlign.CENTER,
            VAlign.BOTTOM,
            this.backgroundContainer,
            HAlign.CENTER,
            VAlign.BOTTOM,
            0,
            -10
        );

        this.regs.add(
            this.expandButton.clicked.connect(() => {
                if (this._isExpanded) return;
                this.expand();
            })
        );
        this.regs.add(
            this.collapseButton.clicked.connect(() => {
                if (!this._isExpanded) return;
                this.collapse();
            })
        );
    }

    private switchTab(category:ButtonCategory) {
        if (category !== this._currentTab.category) {
            this._renderButtonsWithNewCategory(category);
            this._tabArray.forEach((tab) => {
                if (tab.category === category) {
                    this._currentTab.disable();
                    this._currentTab = tab;
                    this._currentTab.enable();
                }
            });
        }
    }

    public getScriptUIElement(bt: ToolbarButton, scriptID: RScriptUIElementID): RScriptUIElement {
        if (this._isExpanded) {
            const button = this.getMirrorTopButton(bt);
            if (button && button.display.visible) {
                button.rscriptID(scriptID);
                return button;
            } else {
                const category = bt.category as ButtonCategory;
                this.switchTab(category);
                if (category === this._currentTab.category) {
                    bt.rscriptID(scriptID);
                    return bt;
                } else {
                    return {
                        rect: this._currentTab.container.getBounds(),
                        proxy: true
                    };
                }
            }
        } else {
            const button = this.getMirrorTopButton(bt);
            if (button && button.display.visible) return button;
            else {
                this.expandButton.rscriptID(scriptID);
                return {
                    rect: this.expandButton.display.getBounds(),
                    proxy: true
                };
            }
        }
    }

    private makeCategory() {
        this.makeInfoButtons();
        this.makeSolveButtons();
        this.makeCreateButtons();
        this.makeViewButtons();
        this.makeInoutButtons();
        this.makeAnnotateButtons();
        this.makeCustomButtons();

        this.makeInfoLayout();
        this.makeSolveLayout();
        this.makeCreateLayout();
        this.makeViewLayout();
        this.makeInoutLayout();
        this.makeAnnotateLayout();
        this.makeCustomLayout();
    }

    protected added(): void {
        super.added();

        this._isExpanded = false;
        this.makeTabs();

        this.makeLayout();

        this.leftArrow = this.makeArrowButton('left');
        this.addObject(this.leftArrow, this.scrollContainerContainer);

        this.addObject(this.scrollContainer, this.scrollContainerContainer);

        this.makeExpandControl();

        this.makeCategory();

        this.makeFeedbackLayout();

        this.layoutTabs();

        this.rightArrow = this.makeArrowButton('right');
        this.addObject(this.rightArrow, this.scrollContainerContainer);

        let interval: NodeJS.Timeout;
        const endScroll = () => {
            if (interval) clearInterval(interval);
        };
        const scrollRight = () => {
            this.scrollContainer.setScroll(
                this.scrollContainer.scrollX + 10,
                this.scrollContainer.scrollY
            );
            this.updateArrowVisibility();
        };
        const scrollLeft = () => {
            this.scrollContainer.setScroll(
                this.scrollContainer.scrollX - 10,
                this.scrollContainer.scrollY
            );
            this.updateArrowVisibility();
        };
        this.regs.add(
            this.rightArrow.pointerDown.connect(() => {
                endScroll();
                interval = setInterval(scrollRight, 100);
            })
        );
        this.regs.add(this.rightArrow.pointerUp.connect(() => endScroll()));
        this.regs.add(
            this.leftArrow.pointerDown.connect(() => {
                endScroll();
                interval = setInterval(scrollLeft, 100);
            })
        );
        this.regs.add(this.leftArrow.pointerUp.connect(() => endScroll()));
        this.regs.add(
            this.rightArrow.pointerTap.connect(() => {
                endScroll();
                scrollRight();
            })
        );
        this.regs.add(
            this.leftArrow.pointerTap.connect(() => {
                endScroll();
                scrollLeft();
            })
        );

        this.regs.add(
            Eterna.settings.autohideToolbar.connectNotify((value) => {
                this.setToolbarAutohide(value);
            })
        );

        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mode.resized.connect(() => this.onResized()));

        this._setupToolbarDrag();

        this.lowerVContainer.addChild(this._tabsHContainer);

        this.makeBoosterMenu();
        this.makeTopLayout();

        this._currentTab.enable();
        this._renderButtonsWithNewCategory(this._currentTab.category);

        this._toggleButtonsInteractive(true);

        this.resizeToolbar();
    }

    private _updateAvailableButtonsContainer(): void {
        let offset = 0;
        for (const child of this.middleScrollContainer.content.children) {
            if (!child.buttonMode) {
                continue;
            }
            if (!child.visible) {
                continue;
            }
            const bounds = child.getLocalBounds();
            child.x = offset;
            child.y = 0;
            offset += bounds.width;
        }
    }

    private resetDragState(recovery = true): void {
        Assert.assertIsDefined(this._draggingElement);
        Assert.assertIsDefined(this._startPoint);

        if (recovery) {
            this._draggingElement.display.position.copyFrom(this._startPoint);
            this._draggingElement.display.interactive = true;
        }

        this._draggingElement = undefined;
        this._startPoint = null;
        this._startPointContainer = null;
    }

    private _toggleButtonsInteractive(value: boolean): void {
        this.leftButtonsGroup.toggleInteractive(value);
        this.rightButtonsGroup.toggleInteractive(value);
        this.middleScrollContainer.content.children.forEach((button) => {
            if (button.visible) button.interactive = value;
            else button.interactive = false;
        });
    }

    private pushButtonToCategory(button: ToolbarButton): void {
        const category = button.category;
        if (category) {
            const buttons = this._tabs.get(category);
            if (!buttons) {
                throw new Error('unknown category provided');
            }

            const mirrorButtons = this.getMirrorButtons(button);
            mirrorButtons.forEach((mirrorButton) => {
                if (mirrorButton) {
                    this.regs.add(
                        mirrorButton.clicked.connect(() => {
                            if (mirrorButton.display.visible) button.clicked.emit();
                        })
                    );
                }
            });

            buttons.push(button);
            this.addObject(button, this.middleScrollContainer.content);
        }
    }

    private _getButtonName(target: DisplayObject): string | null {
        return (
            Array.from(this._tabs.values())
                .flat()
                .find((button) => button.display === target)?.name ?? null
        );
    }

    private _getUnderButtonInfo(
        buttonGroup: ButtonsGroup,
        buttonSize: number,
        pos: number
    ): { insertPos: boolean; pos: number } {
        const count = buttonGroup._content.children.length;
        if (count === 0 || pos < 0) {
            return {insertPos: true, pos: 0};
        }
        const n = pos / buttonSize;
        if (n < 0) {
            return {insertPos: true, pos: 0};
        } else if (n < count) {
            const m = n - Math.floor(n);
            const p = Math.ceil(n) - n;

            if (m > 2 * p) {
                return {insertPos: true, pos: Math.floor(n + 1)};
            } else if (p > 2 * m) {
                return {insertPos: true, pos: Math.floor(n)};
            } else {
                return {insertPos: false, pos: Math.floor(n)};
            }
        } else {
            return {insertPos: true, pos: count};
        }
    }

    private _getPointsDifference(p1: Point, p2: Point): Point {
        const x = Math.abs(p1.x - p2.x);
        const y = Math.abs(p1.y - p2.y);
        return new Point(x, y);
    }

    private getDragName(
        draggingElement: DisplayObject,
        buttonMap: Map<string, GameButton>
    ) {
        let name = null;
        buttonMap.forEach((bt, key) => {
            if (bt.display === draggingElement) name = key;
        });
        return name;
    }

    private _updateActiveButtonsGroup(
        endButtonGroup: ButtonsGroup,
        topButtons: Map<string, ToolbarButton>,
        endButtonBounds: Rectangle,
        startPointContainer: Container,
        draggingElement: ToolbarButton,
        anotherButtonGroup: ButtonsGroup,
        endPoint: Point
    ): boolean {
        Assert.assertIsDefined(draggingElement);
        const minX = endButtonBounds.x;
        const cursorX = endPoint.x;
        const pos = cursorX - minX;
        const underButtonInfo = this._getUnderButtonInfo(
            endButtonGroup,
            BUTTON_WIDTH,
            pos
        );
        const count = endButtonGroup._content.children.length;
        if (count < endButtonGroup._capability && underButtonInfo.insertPos) {
            this.container.removeChild(draggingElement.display);
            if (startPointContainer === this.middleScrollContainer.content) {
                const name = this.getDragName(
                    draggingElement.display,
                    this._bottomButtons
                );
                if (name) {
                    const bt = this._bottomButtons.get(name);
                    if (bt) {
                        this._bottomButtons.delete(name);
                        topButtons.set(name, bt);
                    }
                    startPointContainer.removeChild(draggingElement.display);
                }
            } else {
                Assert.isTrue(
                    anotherButtonGroup._content === startPointContainer
                );
                let name = null;
                let button: ToolbarButton | null = null;
                // let category:ButtonCategory | null = null;
                this._topButtons.forEach((bt, key) => {
                    if (bt === draggingElement) {
                        name = key;
                        button = bt;
                        // category = bt.category;
                    }
                });
                if (name && button) {
                    anotherButtonGroup.removeButton(button);
                }
            }
            endButtonGroup.addButtonAt(draggingElement.display, underButtonInfo.pos);
        } else if (underButtonInfo.insertPos) {
            return false;
        } else if (startPointContainer === anotherButtonGroup._content) {
            const replacedButton = endButtonGroup.removeButtonAt(
                underButtonInfo.pos
            );
            this.container.removeChild(draggingElement.display);
            anotherButtonGroup.addButtonAt(
                replacedButton,
                this._draggingElementIndex
            );
            endButtonGroup.addButtonAt(draggingElement.display, underButtonInfo.pos);
        } else {
            const replacedButton = endButtonGroup.removeButtonAt(
                underButtonInfo.pos
            );
            this.container.removeChild(draggingElement.display);

            endButtonGroup.addButtonAt(draggingElement.display, underButtonInfo.pos);
            const name = this.getDragName(draggingElement.display, this._bottomButtons);
            if (name) {
                const bt = this._bottomButtons.get(name);
                if (bt) {
                    topButtons.set(name, bt);
                    this._bottomButtons.delete(name);
                }
                startPointContainer.removeChild(draggingElement.display);
                startPointContainer.addChild(replacedButton);
                replacedButton.visible = false;
                replacedButton.interactive = true;

                const replaceName = this.getDragName(
                    replacedButton,
                    topButtons
                );
                if (replaceName) {
                    const replaceBt = topButtons.get(replaceName);
                    if (replaceBt) {
                        this._bottomButtons.set(replaceName, replaceBt);
                        topButtons.delete(replaceName);
                    }
                }
            }
        }
        endButtonGroup.resizeContainer();
        anotherButtonGroup.resizeContainer();

        this.saveTopButtons();

        return true;
    }

    public get isExpanded(): boolean {
        return this._isExpanded;
    }

    private onDragStart(e: InteractionEvent): void {
        e.stopPropagation();

        this._draggingElement = undefined;

        if (
            e.target === this._scrollNextButton.container
            || e.target === this._scrollPrevButton.container
        ) return;
        if (!e.target.buttonMode) return;
        if (this._isDragging || !this._isExpanded) return;

        if (
            DisplayUtil.hitTest(this.leftButtonsGroup.container, e.data.global)
        ) {
            this._startPointContainer = this.leftButtonsGroup._content;
        }
        if (
            DisplayUtil.hitTest(this.rightButtonsGroup.container, e.data.global)
        ) {
            this._startPointContainer = this.rightButtonsGroup._content;
        }
        if (
            DisplayUtil.hitTest(
                this.middleScrollContainer.content,
                e.data.global
            )
        ) {
            this._startPointContainer = this.middleScrollContainer.content;
        }

        if (!this._startPointContainer) return;
        if (this._startPointContainer.children.length <= 1) return;

        const btnIndex = this._startPointContainer.children.findIndex(
            (el) => el === e.target
        );

        if (this.leftButtonsGroup._content === this._startPointContainer) {
            if (btnIndex >= 0) {
                this._draggingElementIndex = btnIndex;
                let name = null;
                this._topButtons.forEach((bt, key) => {
                    if (bt.display === e.target) {
                        name = key;
                    }
                });
                if (name) {
                    const foundButton = this._topButtons.get(name);
                    if (foundButton) {
                        this._draggingElement = foundButton;
                        this._draggingElement.display.visible = true;
                        this._draggingElement.display.position.copyFrom(e.target);
                    } else return;
                } else return;
            }
        } else if (
            this.rightButtonsGroup._content === this._startPointContainer
        ) {
            if (btnIndex >= 0) {
                this._draggingElementIndex = btnIndex;
                let name = null;
                this._topButtons.forEach((bt, key) => {
                    if (bt.display === e.target) {
                        name = key;
                    }
                });
                if (name) {
                    const foundButton = this._topButtons.get(name);
                    if (foundButton) {
                        this._draggingElement = foundButton;
                        this._draggingElement.display.visible = true;
                        this._draggingElement.display.position.copyFrom(e.target);
                    } else return;
                } else return;
            }
        } else if (
            this.middleScrollContainer.content === this._startPointContainer
        ) {
            if (btnIndex >= 0) {
                this._draggingElementIndex = btnIndex;
                const name = this._getButtonName(e.target);
                if (name) {
                    const foundButton = this._bottomButtons.get(name);
                    if (foundButton) {
                        this._draggingElement = foundButton;
                        this._draggingElement.display.visible = true;
                        // this._draggingElement.display.interactive = false;
                        this.middleScrollContainer.content.addChild(
                            this._draggingElement.display
                        );
                        this._draggingElement.display.position.copyFrom(e.target);
                        this.middleScrollContainer.doLayout();
                    } else return;
                } else return;
            }
        }

        this._isDragging = true;
        this._canDrag = false;
        this._startPoint = new Point(e.target.position.x, e.target.position.y);
        this._startPointGlobal = new Point(e.data.global.x, e.data.global.y);
    }

    private onDragEnd(e: InteractionEvent): void {
        e.stopPropagation();

        this.leftButtonsGroup.topTooltip.display.visible = false;
        this.leftButtonsGroup._highlight.visible = false;
        this.leftButtonsGroup._cursor.visible = false;

        this.rightButtonsGroup.topTooltip.display.visible = false;
        this.rightButtonsGroup._highlight.visible = false;
        this.rightButtonsGroup._cursor.visible = false;

        this._isDragging = false;
        if (
            !this._draggingElement
            || !this._isExpanded
            || !this._startPoint
            || !this._startPointContainer
        ) {
            this._canDrag = false;
            this._toggleButtonsInteractive(true);
            this._isDisabled = false;
            return;
        }
        Assert.assertIsDefined(this._startPointContainer);
        Assert.assertIsDefined(this._startPointGlobal);
        if (
            this._startPoint?.x === e.data.global.x
            && this._startPoint?.y === e.data.global.y
        ) {
            if (this._canDrag) {
                if (
                    this._startPointContainer
                    === this.middleScrollContainer.content
                ) {
                    this._draggingElement.display.visible = false;
                }
                this._startPointContainer.addChildAt(
                    this._draggingElement.display,
                    this._draggingElementIndex
                );
            }
            this._canDrag = false;
            this._toggleButtonsInteractive(true);
            this._isDisabled = false;
            return;
        }

        this._canDrag = false;

        const leftButtonsRect = this.leftButtonsGroup.container.getBounds();
        const rightButtonsRect = this.rightButtonsGroup.container.getBounds();
        const availableButtonsRect = this.middleScrollContainer.content.getBounds();

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
        availableButtonsBounds.height = APPROX_ITEM_HEIGHT;
        availableButtonsBounds.width = MIDDLE_WIDTH;

        if (
            !leftButtonsBounds.contains(e.data.global.x, e.data.global.y)
            && !rightButtonsBounds.contains(e.data.global.x, e.data.global.y)
            && !availableButtonsBounds.contains(e.data.global.x, e.data.global.y)
        ) {
            this.container.removeChild(this._draggingElement.display);
            if (
                this._startPointContainer === this.middleScrollContainer.content
            ) {
                this._draggingElement.display.visible = false;
            }
            this._startPointContainer.addChildAt(
                this._draggingElement.display,
                this._draggingElementIndex
            );
            this._toggleButtonsInteractive(true);
            this._isDisabled = false;
            this.resetDragState();
            return;
        }

        if (leftButtonsBounds.contains(e.data.global.x, e.data.global.y)) {
            if (this.leftButtonsGroup._content === this._startPointContainer) {
                Assert.assertIsDefined(this._draggingElement);
                this.container.removeChild(this._draggingElement.display);
                const minX = leftButtonsBounds.x;
                const cursorX = e.data.global.x;
                const pos = cursorX - minX;
                const underButtonInfo = this._getUnderButtonInfo(
                    this.leftButtonsGroup,
                    BUTTON_WIDTH,
                    pos
                );
                this.leftButtonsGroup._content.addChildAt(
                    this._draggingElement.display,
                    this._draggingElementIndex
                );
                this.leftButtonsGroup.swapButton(this._draggingElement.display,
                    this.leftButtonsGroup.getButtonAt(underButtonInfo.pos));
                this.leftButtonsGroup.resizeContainer();

                this.resetDragState(false);
                this.updateLayout();
                this._toggleButtonsInteractive(true);
                this._isDisabled = false;

                return;
            }
            const result = this._updateActiveButtonsGroup(
                this.leftButtonsGroup,
                this._topButtons,
                leftButtonsBounds,
                this._startPointContainer,
                this._draggingElement,
                this.rightButtonsGroup,
                e.data.global
            );
            if (!result) {
                this.container.removeChild(this._draggingElement.display);
                if (
                    this._startPointContainer
                    === this.middleScrollContainer.content
                ) {
                    this._draggingElement.display.visible = false;
                }
                this._startPointContainer.addChildAt(
                    this._draggingElement.display,
                    this._draggingElementIndex
                );
                this._toggleButtonsInteractive(true);
                this._isDisabled = false;
                this.resetDragState();

                this.saveTopButtons();

                return;
            }
            this._toggleButtonsInteractive(true);
            this._isDisabled = false;
        } else if (
            rightButtonsBounds.contains(e.data.global.x, e.data.global.y)
        ) {
            if (this.rightButtonsGroup._content === this._startPointContainer) {
                Assert.assertIsDefined(this._draggingElement);
                this.container.removeChild(this._draggingElement.display);
                const minX = rightButtonsBounds.x;
                const cursorX = e.data.global.x;
                const pos = cursorX - minX;
                const underButtonInfo = this._getUnderButtonInfo(
                    this.rightButtonsGroup,
                    BUTTON_WIDTH,
                    pos
                );
                this.rightButtonsGroup._content.addChildAt(
                    this._draggingElement.display,
                    this._draggingElementIndex
                );
                this.rightButtonsGroup.swapButton(this._draggingElement.display,
                    this.rightButtonsGroup.getButtonAt(underButtonInfo.pos));
                this.rightButtonsGroup.resizeContainer();

                this.resetDragState(false);
                this.updateLayout();
                this._toggleButtonsInteractive(true);
                this._isDisabled = false;

                return;
            }

            const result = this._updateActiveButtonsGroup(
                this.rightButtonsGroup,
                this._topButtons,
                rightButtonsBounds,
                this._startPointContainer,
                this._draggingElement,
                this.leftButtonsGroup,
                e.data.global
            );
            if (!result) {
                this.container.removeChild(this._draggingElement.display);
                if (
                    this._startPointContainer
                    === this.middleScrollContainer.content
                ) {
                    this._draggingElement.display.visible = false;
                }
                this._startPointContainer.addChildAt(
                    this._draggingElement.display,
                    this._draggingElementIndex
                );
                this._toggleButtonsInteractive(true);
                this._isDisabled = false;
                this.resetDragState();
                return;
            }
            this._toggleButtonsInteractive(true);
            this._isDisabled = false;
        } else if (
            availableButtonsBounds.contains(e.data.global.x, e.data.global.y)
        ) {
            if (
                this._startPointContainer === this.middleScrollContainer.content
            ) {
                this.container.removeChild(this._draggingElement.display);
                this._draggingElement.display.visible = false;
                // this._scrollContainer.content.addChild(this._draggingElement.display);
                this.resetDragState();
                this.updateLayout();
                this._toggleButtonsInteractive(true);
                this._isDisabled = false;
                return;
            }

            this.container.removeChild(this._draggingElement.display);
            this._draggingElement.display.visible = false;
            if (this._startPointContainer === this.rightButtonsGroup._content) {
                let name = null;
                let button: ToolbarButton | null = null;
                let category: ButtonCategory | null = null;
                this._topButtons.forEach((bt, key) => {
                    if (bt === this._draggingElement) {
                        name = key;
                        button = bt;
                        category = bt.category;
                    }
                });
                if (name && button && category) {
                    this._topButtons.delete(name);
                    this._bottomButtons.set(name, button);
                    this.rightButtonsGroup.removeButton(button);
                    this.middleScrollContainer.content.addChild(
                        this._draggingElement.display
                    );

                    this.switchTab(category);
                }
            } else if (
                this._startPointContainer === this.leftButtonsGroup._content
            ) {
                let name = null;
                let button: ToolbarButton | null = null;
                let category: ButtonCategory | null = null;
                this._topButtons.forEach((bt, key) => {
                    if (bt === this._draggingElement) {
                        name = key;
                        button = bt;
                        category = bt.category;
                    }
                });
                if (name && button && category) {
                    this._topButtons.delete(name);
                    this._bottomButtons.set(name, button);
                    this.leftButtonsGroup.removeButton(button);
                    this.middleScrollContainer.content.addChild(
                        this._draggingElement.display
                    );

                    this.switchTab(category);
                }
            }

            this._draggingElement.display.interactive = true;
            this._updateAvailableButtonsContainer();
            if (this._startPointContainer === this.leftButtonsGroup._content) {
                this.leftButtonsGroup.resizeContainer();
            }
            if (this._startPointContainer === this.rightButtonsGroup._content) {
                this.rightButtonsGroup.resizeContainer();
            }
            this.updateLayout();
        } else {
            // add code
        }

        this._updateAvailableButtonsContainer();
        this._toggleButtonsInteractive(true);
        this._isDisabled = false;
        // this._draggingElement.display.interactive = true;
        this._draggingElement = undefined;
        this._startPoint = null;
        this.updateLayout();

        this.saveTopButtons();
    }

    private checkDragElement(x: number, y: number) {
        Assert.assertIsDefined(this._startPointContainer);
        const leftButtonsRect = this.leftButtonsGroup.container.getBounds();
        const rightButtonsRect = this.rightButtonsGroup.container.getBounds();

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

        this.leftButtonsGroup.topTooltip.display.visible = false;
        this.leftButtonsGroup._highlight.visible = false;
        this.leftButtonsGroup._cursor.visible = false;

        this.rightButtonsGroup.topTooltip.display.visible = false;
        this.rightButtonsGroup._highlight.visible = false;
        this.rightButtonsGroup._cursor.visible = false;

        let endButtonGroup = null;
        let endButtonBounds = null;

        let inPlace = false;
        if (leftButtonsBounds.contains(x, y)) {
            if (this.leftButtonsGroup._content === this._startPointContainer) {
                inPlace = true;
            }
            endButtonGroup = this.leftButtonsGroup;
            endButtonBounds = leftButtonsBounds;
        } else if (rightButtonsBounds.contains(x, y)) {
            if (this.rightButtonsGroup._content === this._startPointContainer) {
                inPlace = true;
            }
            endButtonGroup = this.rightButtonsGroup;
            endButtonBounds = rightButtonsBounds;
        }
        if (endButtonGroup && endButtonBounds) {
            const count = endButtonGroup._content.children.length;

            const minX = endButtonBounds.x;
            const cursorX = x;
            const pos = cursorX - minX;
            const underButtonInfo = this._getUnderButtonInfo(
                endButtonGroup,
                BUTTON_WIDTH,
                pos
            );
            endButtonGroup._cursor.position.x = underButtonInfo.pos * BUTTON_WIDTH;
            endButtonGroup._highlight.position.x = underButtonInfo.pos * BUTTON_WIDTH;

            if (inPlace) {
                endButtonGroup._highlight.visible = true;
                endButtonGroup.topTooltip.setText(
                    'Swap buttons',
                    15,
                    TextBalloon.DEFAULT_FONT_COLOR
                );
            } else if (
                count < endButtonGroup._capability
                    && underButtonInfo.insertPos
            ) {
                endButtonGroup._cursor.visible = true;
                endButtonGroup.topTooltip.setText(
                    'Insert',
                    15,
                    TextBalloon.DEFAULT_FONT_COLOR
                );
            } else if (underButtonInfo.insertPos) {
                endButtonGroup._cursor.visible = true;
                endButtonGroup.topTooltip.setText(
                    'Only replacement is allowed',
                    15,
                    0xff0000
                );
            } else {
                endButtonGroup._highlight.visible = true;
                endButtonGroup.topTooltip.setText(
                    'Replace',
                    15,
                    TextBalloon.DEFAULT_FONT_COLOR
                );
            }
            endButtonGroup.topTooltip.display.position.set(x - 10, y - 60);
            endButtonGroup.topTooltip.display.visible = true;
        }
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
            const diff = this._getPointsDifference(
                e.data.global,
                this._startPointGlobal
            );
            if (diff.x < minPointDiff && diff.y < minPointDiff) return;

            this._startPointContainer.removeChild(this._draggingElement.display);
            this.container.addChild(this._draggingElement.display);
            this._canDrag = true;
        }
        // this._draggingElement.display.interactive = false;
        if (this._isDragging && this._canDrag) {
            const pos = e.data.getLocalPosition(this._draggingElement.display.parent);
            const buttonBounds = this._draggingElement.display.getLocalBounds();
            const x = pos.x - Math.floor(buttonBounds.width / 2);
            const y = pos.y - Math.floor(buttonBounds.height / 2);
            this._draggingElement.display.position.set(x, y);
            this.checkDragElement(e.data.global.x, e.data.global.y);
        }
    }

    public getMirrorButtons(bt: ToolbarButton) {
        if (bt.name) {
            const b1 = this._bottomButtons.get(bt.name);
            const b2 = this._topButtons.get(bt.name);
            return [b1, b2];
        }
        return [undefined, undefined];
    }

    public getMirrorButton(bt: ToolbarButton) {
        const bts = this.getMirrorButtons(bt);
        if (bts[0]) return bts[0];
        else if (bts[1]) return bts[1];
        else return undefined;
    }

    public getMirrorTopButton(bt: ToolbarButton): ToolbarButton | undefined {
        if (bt.name) {
            const b = this._topButtons.get(bt.name);
            if (b) return b;
        }
        return undefined;
    }

    private collapse() {
        const mode = this.mode as GameMode;
        const x = this._vContent.position.x;
        const y = this._vContent.position.y;
        const h = this._vContent.getBounds().height;

        this.removeNamedObjects('animation');
        this.addNamedObject(
            'animation',
            new SerialTask(
                new LocationTask(x, y + h, 0.3, Easing.easeOut, this._vContent, () => { mode.updateUILayout(false); }),
                new CallbackTask(() => {
                    this._isExpanded = false;
                    this.collapseButton.container.visible = false;
                    this.expandButton.container.visible = true;
                    // this._tabsHContainer.visible = false;

                    this.middleHLayout.visible = false;
                    this.textHLayout.visible = false;
                    this._tabsHContainer.visible = false;
                    this.background.visible = false;

                    this.leftButtonsGroup.changeMode(false);
                    this.rightButtonsGroup.changeMode(false);
                    this.updateLayout();
                    mode.updateUILayout(false);
                })
            )
        );
    }

    private expand() {
        const mode = this.mode as GameMode;
        this._isExpanded = true;
        this.collapseButton.container.visible = true;
        this.expandButton.container.visible = false;

        this.middleHLayout.visible = true;
        this.textHLayout.visible = true;
        this._tabsHContainer.visible = true;
        this.background.visible = true;

        this.leftButtonsGroup.changeMode(true);
        this.rightButtonsGroup.changeMode(true);
        this.updateLayout();

        const x = this._vContent.position.x;
        const y = this._vContent.position.y;
        const h = this._vContent.getBounds().height;
        this._vContent.position.y = y + h;
        this.removeNamedObjects('animation');
        this.addNamedObject(
            'animation',
            new SerialTask(
                new LocationTask(x, y, 0.3, Easing.easeOut, this._vContent, () => { mode.updateUILayout(false); })
            )
        );
    }

    private makeArrowButton(direction: 'left' | 'right'): ToolbarButton {
        // Height of the rest of the toolbar elements
        const HEIGHT = APPROX_ITEM_HEIGHT;

        const arrowImg = new Sprite(
            BitmapManager.getBitmap(
                direction === 'left'
                    ? Bitmaps.ImgArrowLeft
                    : Bitmaps.ImgArrowRight
            )
        );

        const arrowContainer = new Container();
        const arrowFrame = new Graphics()
            .beginFill(0x0)
            .drawRect(0, 0, 1, HEIGHT)
            .endFill();
        arrowFrame.alpha = 0;
        arrowContainer.addChild(arrowImg);
        arrowContainer.addChild(arrowFrame);
        DisplayUtil.positionRelative(
            arrowImg,
            HAlign.LEFT,
            VAlign.CENTER,
            arrowFrame,
            HAlign.LEFT,
            VAlign.CENTER
        );

        const bt = new ToolbarButton();
        bt.setName('arrowButton');
        bt.allStates(arrowContainer);
        bt.tooltip(`Scroll ${direction}`);
        return bt;
    }

    private _setupToolbarDrag() {
        let mouseDown = false;
        let startingX: number;
        let startingScroll: number;
        this.regs.add(
            this.pointerDown.connect((e) => {
                const {x, y} = e.data.global;
                if (this.lowerHLayout.getBounds().contains(x, y)) {
                    mouseDown = true;
                    startingX = x;
                    startingScroll = this.scrollContainer.scrollX;
                }
            })
        );

        this.regs.add(
            this.pointerUp.connect((_e) => {
                this.disableTools(false);
                mouseDown = false;
            })
        );

        this.regs.add(
            this.scrollContainer.pointerUpOutside.connect(() => {
                this.disableTools(false);
                mouseDown = false;
            })
        );

        this.regs.add(
            this.pointerMove.connect((e) => {
                const {x, y} = e.data.global;
                if (
                    e.data.buttons === 1
                    && mouseDown
                    && this.lowerHLayout.getBounds().contains(x, y)
                ) {
                    const offset = x - startingX;
                    if (Math.abs(offset) > 15) {
                        this.disableTools(true);
                        this.scrollContainer.scrollX = startingScroll - offset;
                        this.updateArrowVisibility();
                    }
                }
            })
        );
    }

    private updateArrowVisibility() {
        if (this.scrollContainer.maxScrollX > 0) {
            this.rightArrow.display.visible = true;
            this.leftArrow.display.visible = true;

            if (this.scrollContainer.scrollX > 0) {
                this.leftArrow.display.alpha = 1;
            } else {
                this.leftArrow.display.alpha = 0;
            }

            if (
                this.scrollContainer.scrollX < this.scrollContainer.maxScrollX
            ) {
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
            this._invisibleBackground.interactive = true;
            this._isAutoCollapsed = false;

            const uncollapse = () => {
                if (this._isAutoCollapsed) {
                    Assert.assertIsDefined(Flashbang.stageHeight);
                    this._isAutoCollapsed = false;
                    this.removeNamedObjects(COLLAPSE_ANIM);
                    this.addNamedObject(
                        COLLAPSE_ANIM,
                        new LocationTask(
                            null,
                            Flashbang.stageHeight - this._vContent.height - (this._isExpanded ? 0 : 10),
                            0.25,
                            Easing.easeOut,
                            this._vContent
                        )
                    );
                }
            };

            const collapse = () => {
                if (!this._isAutoCollapsed) {
                    Assert.assertIsDefined(Flashbang.stageHeight);
                    this._isAutoCollapsed = true;
                    this.removeNamedObjects(COLLAPSE_ANIM);
                    this.addNamedObject(
                        COLLAPSE_ANIM,
                        new LocationTask(
                            null,
                            Flashbang.stageHeight - 10,
                            0.25,
                            Easing.easeOut,
                            this._vContent
                        )
                    );
                }
            };

            this._autoCollapseRegs = new RegistrationGroup();
            this._autoCollapseRegs.add(this.pointerTap.connect(() => {
                if (this._isAutoCollapsed) uncollapse(); else collapse();
            }));
            this._autoCollapseRegs.add(this.pointerOver.connect(uncollapse));
            this._autoCollapseRegs.add(this.pointerOut.connect(collapse));

            collapse();
        } else {
            Assert.assertIsDefined(Flashbang.stageHeight);
            this.display.interactive = false;
            this._invisibleBackground.interactive = false;

            if (this._autoCollapseRegs != null) {
                this._autoCollapseRegs.close();
                this._autoCollapseRegs = null;
            }

            this.removeNamedObjects(COLLAPSE_ANIM);
            this._vContent.y = Flashbang.stageHeight - this._vContent.height - (this._isExpanded ? 0 : 10);
        }
    }

    public disableTools(disable: boolean): void {
        this.stateToggle.enabled = !disable;
        this.targetButton.enabled = !disable;
        this.palette.enabled = !disable;
        this.naturalButton.enabled = !disable;
        this.estimateButton.enabled = !disable;

        if (disable) {
            this.toolbarButtons.forEach((bt) => {
                bt.enabled = false;
                this.getMirrorButtons(bt).forEach((b) => {
                    if (b) b.enabled = false;
                });
            });
        } else {
            this.toolbarButtons.forEach((bt) => {
                bt.enabled = true;
                this.getMirrorButtons(bt).forEach((b) => {
                    if (b) b.enabled = true;
                });
            });
            this.updateEnableOfMiddleButtons();
        }
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

        this.getMirrorButtons(this.pairSwapButton).forEach((b) => { if (b) b.toggled.value = false; });
        this.getMirrorButtons(this.addBaseButton).forEach((b) => { if (b) b.toggled.value = false; });
        this.getMirrorButtons(this.addPairButton).forEach((b) => { if (b) b.toggled.value = false; });
        this.getMirrorButtons(this.deleteButton).forEach((b) => { if (b) b.toggled.value = false; });
        this.getMirrorButtons(this.lockButton).forEach((b) => { if (b) b.toggled.value = false; });
        this.getMirrorButtons(this.moleculeButton).forEach((b) => { if (b) b.toggled.value = false; });
        this.getMirrorButtons(this.magicGlueButton).forEach((b) => { if (b) b.toggled.value = false; });
        this.getMirrorButtons(this.baseMarkerButton).forEach((b) => { if (b) b.toggled.value = false; });
        this.getMirrorButtons(this.librarySelectionButton).forEach((b) => { if (b) b.toggled.value = false; });

        for (const button of this.dynPaintTools) {
            button.toggled.value = false;
        }

        this.annotationModeButton.toggled.value = false;
        this.getMirrorButtons(this.annotationModeButton).forEach((b) => { if (b) b.toggled.value = false; });
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
    private readonly _showLibrarySelect: boolean;
    private readonly _boostersData: BoostersData | null;

    private _invisibleBackground: Graphics;
    private _vContent: VLayoutContainer;

    public middleScrollContainer: ScrollContainer;

    private _tabs: Map<ButtonCategory, ToolbarButton[]>;
    private _tabsScrollContainer: ScrollContainer;
    private _tabsHContainer: HLayoutContainer;
    private _currentTab: {
        container: Container;
        enable: () => void;
        disable: () => void;
        category: ButtonCategory;
        tabWidth: number;
    };

    private _tabArray: {
        container: Container;
        enable: () => void;
        disable: () => void;
        category: ButtonCategory;
        tabWidth: number;
    }[];

    public getBounds() {
        return this._vContent.getBounds();
    }

    private toolbarButtons: Map<string, ToolbarButton> = new Map();
    private _bottomButtons: Map<string, ToolbarButton> = new Map();
    public _topButtons: Map<string, ToolbarButton> = new Map();

    private _expandButtonContainer: HLayoutContainer;

    private _autoCollapseRegs: RegistrationGroup | null;

    private _isExpanded: boolean;
    private _isAutoCollapsed: boolean;
    private _isDragging: boolean;
    private _canDrag: boolean;
    private _isDisabled: boolean = false;

    private _scrollStep: number;
    private _scrollOffset: number;

    private _draggingElement: ToolbarButton | undefined;
    private _draggingElementIndex: number = 0;

    private _startPoint: Point | null;
    private _startPointGlobal: Point | null;
    private _startPointContainer: Container | null;

    private _scrollNextButton: GameButton;
    private _scrollPrevButton: GameButton;

    private _scrollTopNextButton: GameButton;
    private _scrollTopPrevButton: GameButton;

    private _annotationManager: AnnotationManager | undefined;
}

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
    CallbackTask,
    Dragger
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
import isMobile from 'is-mobile';
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
const DEFAULT_TOOLBAR_WIDTH = 600;
const tabGap = 2;
const BACKGROUND_HEIGHT = 223;

export interface TopBarSetting {
    type: number;
    newUserMode: boolean;
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
        this._capability = 50;
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

    public addButtonAt(newButton: ToolbarButton, position: number): void {
        this.addObject(newButton, this._content, position);
        this._background.width = Math.max(this._content.children.length, EMPTY_SIZE) * BUTTON_WIDTH;
        this._content.layout(true);
        this._buttons.push(newButton);
    }

    public swapButton(bt1: DisplayObject, bt2: DisplayObject) {
        this._content.swapChildren(bt1, bt2);
        this._content.layout();
    }

    public insertButton(bt1: DisplayObject, newPos: number) {
        const oldPos = this._content.getChildIndex(bt1);
        let i;
        if (oldPos > newPos) {
            for (i = oldPos; i > newPos; i--) {
                const b1 = this._content.getChildAt(i);
                const b2 = this._content.getChildAt(i - 1);
                this.swapButton(b1, b2);
                this._content.layout(true);
            }
        } else if (oldPos < newPos) {
            for (i = oldPos; i < newPos - 1; i++) {
                const b1 = this._content.getChildAt(i);
                const b2 = this._content.getChildAt(i + 1);
                this.swapButton(b1, b2);
                this._content.layout(true);
            }
        }
    }

    public getButtonAt(id: number): DisplayObject | undefined {
        if (this._content.children.length <= id) return undefined;
        return this._content.getChildAt(id);
    }

    public getButtonByName(name: string) {
        return this._buttons.find((bt) => bt.name === name);
    }

    public removeButton(button: ToolbarButton): void {
        const buttons:ToolbarButton[] = [];
        this._buttons.forEach((bt) => {
            if (bt !== button) buttons.push(bt);
        });
        this._buttons = buttons;

        this.removeObject(button);

        this._background.width = Math.max(this._content.children.length, EMPTY_SIZE) * BUTTON_WIDTH;
        this._content.layout(true);
    }

    public getButtonIndex(button: DisplayObject): number {
        return this._content.children.findIndex((el) => el === button);
    }

    public forceLayout(): void {
        this._content.layout(true);
    }
}

type VoidHandler = () => void;

class TopSpacer extends Container {
    sprite: Sprite;
    constructor(width: number, height: number) {
        super();

        // For some reasons, spacers have zero-width bounds
        // unless they're wrapped in a Container
        this.sprite = new Sprite();
        this.sprite.width = width;
        this.sprite.height = height;
        this.addChild(this.sprite);
    }

    public setSize(width:number, height:number) {
        this.sprite.width = width;
        this.sprite.height = height;
    }
}

export default class Toolbar extends ContainerObject {
    public zoomInButton: ToolbarButton;
    public zoomOutButton: ToolbarButton;
    public threeButton: ToolbarButton;
    public pipButton: ToolbarButton;
    public stateToggle: ToggleBar;
    private toolBarEnabled = true;

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

    public leftArrow: GameButton;
    public rightArrow: GameButton;

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
    public topToolsContainer: HLayoutContainer;// ScrollContainer;
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

    public topLeftSpacer: TopSpacer;
    public topRightSpacer: TopSpacer;

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
        this.handlers = handlers;

        this.makeTargetButtons();
    }

    public onResized() {
        this.resizeToolbar();
        const mode = this.mode as GameMode;
        mode.updateUILayout();
    }

    private updateToolbarButtons(category: ButtonCategory) {
        this.toolbarButtons.forEach((b) => {
            if (b.category !== category) b.display.visible = false;
            else b.display.visible = true;
        });
    }

    private _renderButtonsWithNewCategory(category: ButtonCategory): void {
        this.updateToolbarButtons(category);
        this.updateEnableOfMiddleButtons();

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
            fontWeight: FontWeight.BOLD
        });
        const tabWidth = Math.max(tabText.width + 20, TAB_WIDTH);

        const radius = TAB_HEIGHT * 0.4;
        const tabBg = new Graphics()
            .beginFill(0x0c2040)
            .drawRect(0, radius, tabWidth, TAB_HEIGHT - radius)
            .drawRoundedRect(0, 0, tabWidth, TAB_HEIGHT, radius)
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
                .drawRect(0, radius, tabWidth, TAB_HEIGHT - radius)
                .drawRoundedRect(0, 0, tabWidth, TAB_HEIGHT, radius)
                .endFill();
        };

        const disable = (): void => {
            tabBg
                .clear()
                .beginFill(0x0c2040)
                .drawRect(0, radius, tabWidth, TAB_HEIGHT - radius)
                .drawRoundedRect(0, 0, tabWidth, TAB_HEIGHT, radius)
                .endFill();
        };
        new ContainerObject(tabContainer).pointerTap.connect(() => {
            this._currentTab.disable();
            tabBg
                .clear()
                .beginFill(MIDDLE_BACKCOLOR)
                .drawRect(0, radius, tabWidth, TAB_HEIGHT - radius)
                .drawRoundedRect(0, 0, tabWidth, TAB_HEIGHT, radius)
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
            [ButtonCategory.SOLVE, []],
            [ButtonCategory.VIEW, []],
            [ButtonCategory.CREATE, []],
            [ButtonCategory.INFO, []],
            [ButtonCategory.ANNOTATE, []],
            [ButtonCategory.IMPORT_EXPORT, []],
            [ButtonCategory.CUSTOM_LAYOUT, []]
        ]);

        this._tabsScrollContainer = new ScrollContainer(
            this.MIDDLE_WIDTH,
            TAB_HEIGHT
        );
        this.tabsBg = new Graphics()
            .beginFill(MIDDLE_BACKCOLOR)
            .drawRect(0, 0, this.MIDDLE_WIDTH, TAB_HEIGHT)
            .endFill();
        this._tabsScrollContainer.content.addChild(this.tabsBg);
        this.tabsBg.visible = false;

        this._tabsHContainer = new HLayoutContainer(2);
        this.addObject(this._tabsScrollContainer, this._tabsHContainer);

        this._tabsHContainer.visible = false;

        this._tabArray = [];
        const tabSolve = this._createTab(ButtonCategory.SOLVE);
        const tabCreate = this._createTab(ButtonCategory.CREATE);
        const tabView = this._createTab(ButtonCategory.VIEW);
        const tabInfo = this._createTab(ButtonCategory.INFO);
        const tabAnnotate = this._createTab(ButtonCategory.ANNOTATE);
        const tabExport = this._createTab(ButtonCategory.IMPORT_EXPORT);
        const tabLayout = this._createTab(ButtonCategory.CUSTOM_LAYOUT);
        this._currentTab = tabSolve;

        this._tabArray.push(tabSolve);
        this._tabArray.push(tabCreate);
        this._tabArray.push(tabView);
        this._tabArray.push(tabInfo);
        this._tabArray.push(tabAnnotate);
        this._tabArray.push(tabExport);
        this._tabArray.push(tabLayout);

        let totalWidth = 0;
        this._tabArray.forEach((tab) => {
            totalWidth += tab.tabWidth;
            totalWidth += tabGap;
        });

        this._tabsScrollContainer.addObject(
            new ContainerObject(tabSolve.container),
            this._tabsScrollContainer.content
        );
        this._tabsScrollContainer.addObject(
            new ContainerObject(tabCreate.container),
            this._tabsScrollContainer.content
        );
        this._tabsScrollContainer.addObject(
            new ContainerObject(tabView.container),
            this._tabsScrollContainer.content
        );
        this._tabsScrollContainer.addObject(
            new ContainerObject(tabInfo.container),
            this._tabsScrollContainer.content
        );
        this._tabsScrollContainer.addObject(
            new ContainerObject(tabAnnotate.container),
            this._tabsScrollContainer.content
        );
        this._tabsScrollContainer.addObject(
            new ContainerObject(tabExport.container),
            this._tabsScrollContainer.content
        );
        this._tabsScrollContainer.addObject(
            new ContainerObject(tabLayout.container),
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
                        - this.MIDDLE_WIDTH;
                if (totalWidth > this.MIDDLE_WIDTH && dW - dx > 0) {
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

        const invisibleButton = ToolbarButton.createButton(paramInfo);
        invisibleButton.display.visible = false;
        this._containerButtons.set(
            paramInfo.name,
            invisibleButton
        );
        this.addObject(invisibleButton, this.container);
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
        } else if (this._type === ToolbarType.PUZZLEMAKER
            || this._type === ToolbarType.PUZZLEMAKER_EMBEDDED) {
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
            tooltip: 'Upload 3D Model'
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
        // todo
        // this.pushButtonToCategory(this.baseShiftButton);

        this.regs.add(
            this.pairSwapButton.clicked.connect(() => {
                this._deselectAllPaintTools();
                this.pairSwapButton.toggled.value = true;
                this.getMirrorButtons(this.pairSwapButton).forEach((b) => {
                    if (b) b.toggled.value = true;
                });
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
            tooltip: 'Paste a sequence'
        });

        this.downloadHKWSButton = this.createToolbarButton({
            cat: ButtonCategory.IMPORT_EXPORT,
            name: 'Download HKWS',
            allImg: Bitmaps.ImgDownloadHKWS,
            overImg: Bitmaps.ImgOverDownloadHKWS,
            disableImg: Bitmaps.ImgGreyDownloadHKWS,
            tooltip: 'Download a draw_rna input file for the current layout'
        });

        this.downloadSVGButton = this.createToolbarButton({
            cat: ButtonCategory.IMPORT_EXPORT,
            name: 'Download SVG',
            allImg: Bitmaps.ImgDownloadSVG,
            overImg: Bitmaps.ImgOverDownloadSVG,
            disableImg: Bitmaps.ImgGreyDownloadSVG,
            tooltip: 'Download an SVG of the current RNA layout'
        });

        this.screenshotButton = this.createToolbarButton({
            cat: ButtonCategory.IMPORT_EXPORT,
            name: 'Screenshot',
            allImg: Bitmaps.ImgScreenshot,
            overImg: Bitmaps.ImgOverScreenshot,
            disableImg: Bitmaps.ImgGreyScreenshot,
            tooltip: 'Take a screenshot'
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
        this.threeButton = this.createToolbarButton({
            cat: ButtonCategory.VIEW,
            name: 'ThreeWindow',
            allImg: Bitmaps.ImgThreeWindow,
            overImg: Bitmaps.ImgOverThreeWindow,
            disableImg: Bitmaps.ImgGreyThreeWindow,
            tooltip: 'View 3D window'
        });
        this.threeButton.clicked.connect(() => {
            const mode = this.mode as GameMode;
            const pos3D = mode.getPos3D();
            if (pos3D) {
                pos3D.getWindow().display.visible = true;
            }
        });
    }

    public add3DButton() {
        this.pushButtonToCategory(this.threeButton);
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
                    this._annotationManager.setAnnotationMode(true);
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
                        if (this.annotationPanelDlg && this.annotationPanelDlg._ref.isLive) {
                            this.annotationPanelDlg.updatePanel();
                        }
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

        this.stateToggle = new ToggleBar(this._states).tooltip('Switch state');
        if (this.stateToggle.numStates < 2) this.stateToggle.display.visible = false;
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

    private initializeTopLeftButtons() {
        const leftBts: ToolbarButton[] = [];
        const leftButtonNames: string[] = [];
        const mobileMode = isMobile({tablet: true});

        const buttons: ToolbarButton[] = [];

        if (
            this._type === ToolbarType.PUZZLEMAKER
            || this._type === ToolbarType.PUZZLEMAKER_EMBEDDED
        ) {
            buttons.push(this.resetButton);
            buttons.push(this.screenshotButton);
            buttons.push(this.submitButton);
            buttons.push(this.settingsButton);
        } else if (this._type === ToolbarType.LAB) {
            if (mobileMode) {
                buttons.push(this.viewSolutionsButton);
                buttons.push(this.submitButton);
                buttons.push(this.settingsButton);
            } else {
                buttons.push(this.resetButton);
                buttons.push(this.screenshotButton);
                if (this.boostersMenuButton) buttons.push(this.boostersMenuButton);
                buttons.push(this.viewSolutionsButton);
                buttons.push(this.submitButton);
                buttons.push(this.settingsButton);
            }
        } else {
            let newUserMode = true;
            if (this.boostersMenuButton) newUserMode = false;
            if (newUserMode) {
                buttons.push(this.resetButton);
                buttons.push(this.screenshotButton);
                buttons.push(this.settingsButton);
            } else if (mobileMode) {
                buttons.push(this.screenshotButton);
                buttons.push(this.boostersMenuButton);
                buttons.push(this.settingsButton);
            } else {
                buttons.push(this.resetButton);
                buttons.push(this.screenshotButton);
                buttons.push(this.boostersMenuButton);
                buttons.push(this.settingsButton);
            }
        }
        buttons.forEach((b) => {
            leftBts.push(this.getMirrorButton(b) as ToolbarButton);
            leftButtonNames.push(b.name as string);
        });

        for (const b of leftBts) {
            if (b.name) {
                b.display.visible = true;
                this._bottomButtons.delete(b.name);
                this._topButtons.set(b.name, b);
            }
        }
        this.leftButtonsGroup = new ButtonsGroup(leftBts);
        return leftButtonNames;
    }

    private initializeTopRightButtons() {
        const rightBts: ToolbarButton[] = [];
        const rightButtonNames: string[] = [];

        if (this.pairSwapButton.display.visible) {
            rightBts.push(this.getMirrorButton(this.pairSwapButton) as ToolbarButton);
            rightButtonNames.push(this.pairSwapButton.name as string);
        }
        rightBts.push(this.getMirrorButton(this.undoButton) as ToolbarButton);
        rightBts.push(this.getMirrorButton(this.redoButton) as ToolbarButton);
        rightButtonNames.push(this.undoButton.name as string);
        rightButtonNames.push(this.redoButton.name as string);
        if (!isMobile({tablet: true})
            && this.type !== ToolbarType.PUZZLEMAKER
            && this.type !== ToolbarType.PUZZLEMAKER_EMBEDDED) {
            rightBts.push(this.getMirrorButton(this.magicGlueButton) as ToolbarButton);
            rightButtonNames.push(this.magicGlueButton.name as string);
        }
        for (const b of rightBts) {
            if (b.name) {
                b.display.visible = true;
                this._bottomButtons.delete(b.name);
                this._topButtons.set(b.name, b);
            }
        }
        this.rightButtonsGroup = new ButtonsGroup(rightBts);
        return rightButtonNames;
    }

    private saveTopbarSetting(topbarSetting: TopBarSetting) {
        let saved = false;
        const array = [];

        for (const val of Eterna.settings.topToolbarSettings.value) {
            array.push(val);
        }
        for (const val of array) {
            if (val.type === topbarSetting.type) {
                val.left = topbarSetting.left;
                val.right = topbarSetting.right;
                saved = true;
            }
        }
        if (!saved) array.push(topbarSetting);

        Eterna.settings.topToolbarSettings.value = array;
    }

    private readTopbarSetting(type: number) {
        for (const val of Eterna.settings.topToolbarSettings.value) {
            if (val.type === type) {
                return val;
            }
        }
        return null;
    }

    private initializeTopButtons() {
        const leftButtonNames = this.initializeTopLeftButtons();
        const rightButtonNames = this.initializeTopRightButtons();
        let newUserMode = true;
        if (this.boostersMenuButton) newUserMode = false;

        this.saveTopbarSetting({
            type: this._type,
            newUserMode,
            left: leftButtonNames,
            right: rightButtonNames
        });
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

        let newUserMode = true;
        if (this.boostersMenuButton) newUserMode = false;
        this.saveTopbarSetting({
            type: this._type,
            newUserMode,
            left: leftButtonNames,
            right: rightButtonNames
        });
    }

    private makeTopLayout() {
        Assert.assertIsDefined(Flashbang.stageWidth);

        this.palette = new NucleotidePalette();
        this.palette.changeDefaultMode();
        this.regs.add(
            this.palette.targetClicked.connect(() => {
                this._deselectAllPaintTools();
            })
        );

        // if (this._type !== ToolbarType.FEEDBACK)
        {
            const topToolbarSettings = this.readTopbarSetting(this._type);
            if (topToolbarSettings === null
                || topToolbarSettings.left.length === 0
                || topToolbarSettings.right.length === 0) {
                this.initializeTopButtons();
            } else {
                const leftBts: ToolbarButton[] = [];
                const rightBts: ToolbarButton[] = [];
                topToolbarSettings.left.forEach((name) => {
                    const mirrorButton = this.getMirrorButton(
                        this.toolbarButtons.get(name) as ToolbarButton
                    ) as ToolbarButton;
                    if (name === 'PiP') {
                        if (this._states > 1
                            && this._type !== ToolbarType.PUZZLEMAKER
                            && this._type !== ToolbarType.PUZZLEMAKER_EMBEDDED
                        ) {
                            leftBts.push(mirrorButton);
                        }
                    } else if (name !== 'ThreeWindow') {
                        leftBts.push(mirrorButton);
                    }
                });
                topToolbarSettings.right.forEach((name) => {
                    const mirrorButton = this.getMirrorButton(
                        this.toolbarButtons.get(name) as ToolbarButton
                    ) as ToolbarButton;
                    if (name === 'PiP') {
                        if (this._states > 1
                            && this._type !== ToolbarType.PUZZLEMAKER
                            && this._type !== ToolbarType.PUZZLEMAKER_EMBEDDED
                        ) {
                            rightBts.push(mirrorButton);
                        }
                    } else if (name !== 'ThreeWindow') {
                        rightBts.push(mirrorButton);
                    }
                });

                for (const b of leftBts) {
                    if (b.name) {
                        b.display.visible = true;
                        this._bottomButtons.delete(b.name);
                        this._topButtons.set(b.name, b);
                    }
                }
                if (leftBts.length > 0) {
                    this.leftButtonsGroup = new ButtonsGroup(leftBts);
                } else {
                    this.initializeTopLeftButtons();
                }

                for (const b of rightBts) {
                    if (b.name) {
                        b.display.visible = true;
                        this._bottomButtons.delete(b.name);
                        this._topButtons.set(b.name, b);
                    }
                }
                if (rightBts.length > 0) {
                    this.rightButtonsGroup = new ButtonsGroup(rightBts);
                } else {
                    this.initializeTopRightButtons();
                }

                if (this._topButtons.size === 0) {
                    this.initializeTopButtons();
                }
            }

            this.topToolsContainer.addHSpacer(TOP_HSPACE);
            this.addObject(this.leftButtonsGroup, this.topToolsContainer);
            this.topToolsContainer.addHSpacer(TOP_HSPACE);
            this.addObject(this.palette, this.topToolsContainer);
            this.topToolsContainer.addHSpacer(TOP_HSPACE);
            this.addObject(this.rightButtonsGroup, this.topToolsContainer);
            this.topToolsContainer.addHSpacer(TOP_HSPACE);
        }
    }

    private initDragger() {
        this.leftButtonsGroup._content.interactive = true;
        this.leftButtonsGroup._content.on('pointerdown', (e: InteractionEvent) => this.onDragStart(e));
        this.leftButtonsGroup._content.on('pointermove', (e: InteractionEvent) => this.onDragMove(e));
        this.leftButtonsGroup._content.on('pointerup', () => this.onDragEnd());
        this.leftButtonsGroup._content.on('pointerupoutside', () => this.onDragEnd());

        this.rightButtonsGroup._content.interactive = true;
        this.rightButtonsGroup._content.on('pointerdown', (e: InteractionEvent) => this.onDragStart(e));
        this.rightButtonsGroup._content.on('pointermove', (e: InteractionEvent) => this.onDragMove(e));
        this.rightButtonsGroup._content.on('pointerup', () => this.onDragEnd());
        this.rightButtonsGroup._content.on('pointerupoutside', () => this.onDragEnd());

        this.middleHLayout.interactive = true;
        this.middleHLayout.on('pointerdown', (e: InteractionEvent) => this.onDragStart(e));
        this.middleHLayout.on('pointermove', (e: InteractionEvent) => this.onDragMove(e));
        this.middleHLayout.on('pointerup', () => this.onDragEnd());
        this.middleHLayout.on('pointerupoutside', () => this.onDragEnd());
    }

    private makeBoosterMenu() {
        if (this._type !== ToolbarType.FEEDBACK && this._boostersData != null) {
            if (this._boostersData.actions != null) {
                this.boostersMenuButton = this.createToolbarButton({
                    cat: ButtonCategory.SOLVE,
                    name: 'BoosterMenu',
                    allImg: Bitmaps.ImgBoosters,
                    overImg: Bitmaps.ImgOverBoosters,
                    disableImg: Bitmaps.ImgGreyBoosters,
                    tooltip: 'Boosters'
                });
                this.boostersMenuButton.clicked.connect(() => {
                    if (this._boostersData != null && this._boostersData.actions != null) {
                        const mode = this.mode as GameMode;
                        mode.showDialog(new BoosterDialog(this._boostersData));
                    }
                });
                this.boostersMenuButton.display.interactive = true;
                this.pushButtonToCategory(this.boostersMenuButton);
            }

            if (this._boostersData.paint_tools != null) {
                const mode: PoseEditMode = this.mode as PoseEditMode;
                for (const data of this._boostersData.paint_tools) {
                    Booster.create(mode, data).then((booster) => {
                        booster.onLoad();

                        if (booster.buttonStateTextures[0] === null) {
                            throw new Error(
                                'Cannot call createButton before setting at least the first button state texture!'
                            );
                        }

                        const name = `BoosterPainting${booster.label
                            ? (`-${booster.label}`) : ''}`;

                        const boosterPaintButton = this.createToolbarButton({
                            cat: ButtonCategory.SOLVE,
                            name,
                            allImg: booster.buttonStateTextures[0],
                            overImg: booster.buttonStateTextures[1] ? booster.buttonStateTextures[1]
                                : undefined,
                            disableImg: booster.buttonStateTextures[4] ? booster.buttonStateTextures[4]
                                : booster.buttonStateTextures[0],
                            tooltip: booster.tooltip,
                            label: booster.label,
                            fontSize: 14
                        });
                        boosterPaintButton.clicked.connect(() => {
                            mode.setPosesColor(booster.toolColor);

                            this._deselectAllPaintTools();
                            boosterPaintButton.toggled.value = true;
                            this.getMirrorButtons(boosterPaintButton).forEach(
                                (b) => {
                                    if (b) b.toggled.value = true;
                                }
                            );
                        });
                        this.dynPaintTools.push(boosterPaintButton);
                        boosterPaintButton.display.interactive = true;
                        this.pushButtonToCategory(boosterPaintButton);

                        this._renderButtonsWithNewCategory(this._currentTab.category);
                    });
                }
            }
        }
    }

    public resizeToolbar() {
        this.updateLayout();
    }

    private linkClickHandler(bt: ToolbarButton) {
        this.regs.add(
            bt.clicked.connect(() => {
                if (bt.display.visible) {
                    const toolbarButton = this.toolbarButtons.get(bt.name as string);
                    if (toolbarButton) toolbarButton.clicked.emit();
                }
            })
        );
    }

    private updateTopContainer() {
        this.topHLayout.position.x = 0;
    }

    private updateEnableOfMiddleButtons() {
        const leftButtonNames: string[] = [];
        const rightButtonNames: string[] = [];

        this.leftButtonsGroup.buttons.forEach((e) => {
            e.enabled = this.toolBarEnabled;
            leftButtonNames.push(e.name as string);
        });
        this.rightButtonsGroup.buttons.forEach((e) => {
            e.enabled = this.toolBarEnabled;
            rightButtonNames.push(e.name as string);
        });

        this.toolbarButtons.forEach((bt) => {
            bt.enabled = this.toolBarEnabled;
            bt.display.interactive = this.toolBarEnabled;
        });

        // leftButtonNames.forEach((name) => {
        //     const button = this.toolbarButtons.get(name);
        //     if (button) {
        //         button.enabled = false;
        //     }
        // });
        // rightButtonNames.forEach((name) => {
        //     const button = this.toolbarButtons.get(name);
        //     if (button) {
        //         button.enabled = false;
        //     }
        // });
    }

    private updateLayout(): void {
        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);

        const PAL_SPACE = 4;
        let paletteWidth = this.palette.display.width;
        if (!this.palette.display.visible) {
            paletteWidth = 0;
        }

        const leftWidth = this.leftButtonsGroup.display.width;
        const rightWidth = this.rightButtonsGroup.display.width;
        const maxTopWidth = Math.max(leftWidth, rightWidth) * 2
            + TOP_HSPACE + paletteWidth + TOP_HSPACE + 2 * PAL_SPACE;

        const arrowWidth = this.leftArrow.display.width + this.rightArrow.display.width;
        const availableTopWidth = Flashbang.stageWidth - arrowWidth
            - (TOP_HSPACE + paletteWidth + TOP_HSPACE + 2 * PAL_SPACE);

        const availableTopCount = Math.floor(availableTopWidth / BUTTON_WIDTH);
        this.leftButtonsGroup._capability = Math.floor(availableTopCount / 2);
        this.rightButtonsGroup._capability = Math.floor(availableTopCount / 2);

        this.WIDTH = Math.max(DEFAULT_TOOLBAR_WIDTH, maxTopWidth);
        this.MIDDLE_WIDTH = DEFAULT_TOOLBAR_WIDTH - 28;
        this.MIDDLE_MARGIN = (this.WIDTH - DEFAULT_TOOLBAR_WIDTH) / 2;

        const margin = (this.WIDTH - maxTopWidth) / 2;
        if (leftWidth < rightWidth) {
            this.topLeftSpacer.width = margin + Math.abs(rightWidth - leftWidth);
            this.topRightSpacer.width = margin;
        } else if (leftWidth > rightWidth) {
            this.topRightSpacer.width = margin + Math.abs(rightWidth - leftWidth);
            this.topLeftSpacer.width = margin;
        } else {
            this.topLeftSpacer.width = margin;
            this.topRightSpacer.width = margin;
        }

        this.background
            .clear()
            .beginFill(EDIT_BACKCOLOR, 1)
            .drawRect(0, 0, this.WIDTH, BACKGROUND_HEIGHT)
            .drawRoundedRect(0, -5, this.WIDTH, 10, 7)
            .endFill();

        this.middleBg
            .clear()
            .beginFill(MIDDLE_BACKCOLOR)
            .drawRect(0, 0, this.MIDDLE_WIDTH, 47)
            .drawRoundedRect(0, 43, this.MIDDLE_WIDTH, 10, 7)
            .endFill();

        this.tabsBg = new Graphics()
            .clear()
            .beginFill(MIDDLE_BACKCOLOR)
            .drawRect(0, 0, this.MIDDLE_WIDTH, TAB_HEIGHT)
            .endFill();

        this.topBg
            .clear()
            .beginFill(MIDDLE_BACKCOLOR, 0)
            .drawRect(0, 0, this.MIDDLE_WIDTH, BUTTON_WIDTH + 2)
            .endFill();

        this.middleBg.width = this.MIDDLE_WIDTH;
        this.tabsBg.width = this.MIDDLE_WIDTH;
        this.middleScrollContainer.setSize(this.MIDDLE_WIDTH, BUTTON_WIDTH);
        this._tabsScrollContainer.setSize(this.MIDDLE_WIDTH, TAB_HEIGHT);
        this.textScrollContainer.setSize(this.MIDDLE_WIDTH, this.text.height);

        // Update the scroll container size, accounting for buttons
        const buttonOffset = this.leftArrow.display.width + this.rightArrow.display.width;
        this.scrollContainer.setSize(
            Flashbang.stageWidth - buttonOffset,
            Flashbang.stageHeight
        );

        this._tabsScrollContainer.doLayout();
        this.middleScrollContainer.doLayout();
        this.textScrollContainer.doLayout();
        this.lowerVContainer.layout(true);
        this.lowerHLayout.layout(true);

        this.middleHLayout.position.x = this.MIDDLE_MARGIN;
        this.middleHLayout.position.y += 30;
        this.textScrollContainer.display.position.y += 30;
        this.textHLayout.position.x = this.MIDDLE_MARGIN + 20;

        this.updateArrowVisibility();
        this.updateTopContainer();
        this.updateEnableOfMiddleButtons();

        // Center the toolbar
        this._vContent.x = (Flashbang.stageWidth - this._vContent.width) / 2;
        this._vContent.layout(true);

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

        this.lowerHLayout = new HLayoutContainer(0, VAlign.BOTTOM);
        this.backgroundContainer = new Container();

        this.WIDTH = Math.max(DEFAULT_TOOLBAR_WIDTH, Flashbang.stageWidth * 0.8);
        this.MIDDLE_WIDTH = DEFAULT_TOOLBAR_WIDTH - 28;
        this.MIDDLE_MARGIN = (this.WIDTH - DEFAULT_TOOLBAR_WIDTH) / 2;

        this.background = new Graphics()
            .beginFill(EDIT_BACKCOLOR, 1)
            .drawRect(0, 0, this.WIDTH, BACKGROUND_HEIGHT)
            .drawRoundedRect(0, -5, this.WIDTH, 10, 7)
            .endFill();
        this.background.visible = false;

        this.lowerVContainer = new VLayoutContainer(0, HAlign.CENTER);
        this.backgroundContainer.addChild(this.background);
        this.backgroundContainer.addChild(this.lowerVContainer);
        this.lowerHLayout.addChild(this.backgroundContainer);

        this.topHLayout = new HLayoutContainer();
        this.topBg = new Graphics()
            .beginFill(MIDDLE_BACKCOLOR, 0)
            .drawRect(0, 0, this.MIDDLE_WIDTH, BUTTON_WIDTH + 2)
            .endFill();
        this.topToolsContainer = new HLayoutContainer();
        this.topLeftSpacer = new TopSpacer(10, 1);
        this.topRightSpacer = new TopSpacer(10, 1);

        this.topHLayout.addChild(this.topLeftSpacer);
        this.topHLayout.addChild(this.topToolsContainer);
        this.topHLayout.addChild(this.topRightSpacer);

        this.middleHLayout = new HLayoutContainer();
        this.middleBg = new Graphics()
            .beginFill(MIDDLE_BACKCOLOR)
            .drawRect(0, 0, this.MIDDLE_WIDTH, 47)
            .drawRoundedRect(0, 43, this.MIDDLE_WIDTH, 10, 7)
            .endFill();
        this.middleHLayout.visible = false;
        this.lowerVContainer.addChild(this.topHLayout);

        // this.middleHLayout.position.set(this.middleHLayout.position.x, this.middleHLayout.position.y + 30);
        this.middleHLayout.position.x = this.MIDDLE_MARGIN;

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

        this.middleScrollContainer = new ScrollContainer(
            this.MIDDLE_WIDTH,
            BUTTON_WIDTH
        );
        this.middleScrollContainer.content.addChild(this.middleBg);
        this.middleHLayout.addHSpacer(14);
        this.addObject(this.middleScrollContainer, this.middleHLayout);
        this.middleHLayout.addHSpacer(14);
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
            this.MIDDLE_WIDTH,
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
                    - this.MIDDLE_WIDTH;
                if (this.text.width > this.MIDDLE_WIDTH && dW - dx > 0) {
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
        this.updateToolbarButtons(category);
        this.updateEnableOfMiddleButtons();
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
        this.makeSolveButtons();
        this.makeCreateButtons();
        this.makeViewButtons();
        this.makeInfoButtons();
        this.makeInoutButtons();
        this.makeAnnotateButtons();
        this.makeCustomButtons();

        this.makeSolveLayout();
        this.makeCreateLayout();
        this.makeViewLayout();
        this.makeInfoLayout();
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
        this.rightArrow = this.makeArrowButton('right');

        this.addObject(this.leftArrow, this.scrollContainerContainer);

        this.addObject(this.scrollContainer, this.scrollContainerContainer);

        this.makeExpandControl();
        this.makeCategory();
        this.makeFeedbackLayout();
        this.layoutTabs();

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

        this.enableToolbarButtons(true);
        this.initDragger();

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

    private resetDragState(): void {
        this._canDrag = false;
        this._canHotbarDrop = false;
        this._draggingElement = undefined;
        this._startPointGlobal = null;
        this._startPointContainer = null;
    }

    private enableToolbarButtons(value: boolean): void {
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
            const buttonsOfTab = this._tabs.get(category);
            if (!buttonsOfTab) {
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

            buttonsOfTab.push(button);
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
    ): { bInsertPos: boolean; pos: number } {
        const count = buttonGroup._content.children.length;
        if (count === 0 || pos < 0) {
            return {bInsertPos: true, pos: 0};
        }
        const n = pos / buttonSize;
        if (n < 0) {
            return {bInsertPos: true, pos: 0};
        } else if (n < count) {
            const m = n - Math.floor(n);
            const p = Math.ceil(n) - n;

            if (m > 2 * p) {
                return {bInsertPos: true, pos: Math.floor(n + 1)};
            } else if (p > 2 * m) {
                return {bInsertPos: true, pos: Math.floor(n)};
            } else {
                return {bInsertPos: false, pos: Math.floor(n)};
            }
        } else {
            return {bInsertPos: true, pos: count};
        }
    }

    private _getPointsDifference(p1: Point, p2: Point): Point {
        const x = Math.abs(p1.x - p2.x);
        const y = Math.abs(p1.y - p2.y);
        return new Point(x, y);
    }

    private _updateActiveButtonsGroup(
        endButtonGroup: ButtonsGroup,
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

        draggingElement.display.visible = false;
        // swap or replace
        if (!underButtonInfo.bInsertPos) {
            // from middle to top
            if (startPointContainer === this.middleScrollContainer.content) {
                const name = draggingElement.name;
                if (name) {
                    const dragName = draggingElement.name as string;
                    const endBt = endButtonGroup.buttons.find((b) => b.name === dragName);
                    const anotherBt = anotherButtonGroup.buttons.find((b) => b.name === dragName);

                    if (endBt) {
                        const bt = endButtonGroup.getButtonByName(dragName as string) as ToolbarButton;
                        const disp = endButtonGroup.getButtonAt(underButtonInfo.pos);
                        if (disp) endButtonGroup.swapButton(bt.display, disp);
                        endButtonGroup.resizeContainer();
                    } else if (anotherBt) {
                        const bt = anotherBt as ToolbarButton;
                        const index = anotherButtonGroup.getButtonIndex(bt.display);
                        const replaceButton = anotherButtonGroup.getButtonByName(dragName);
                        const disp = endButtonGroup.getButtonAt(underButtonInfo.pos);
                        if (disp) {
                            const bt2 = endButtonGroup.getButtonByName(disp.name);
                            if (replaceButton && bt2) {
                                anotherButtonGroup.removeButton(replaceButton);
                                endButtonGroup.removeButton(bt2);

                                const name2 = bt2.name as string;
                                this._topButtons.delete(dragName);
                                this._topButtons.delete(name2);

                                const newBt = bt.clone();
                                const newBt2 = bt2.clone();
                                this.linkClickHandler(newBt);
                                this.linkClickHandler(newBt2);

                                endButtonGroup.addButtonAt(newBt, underButtonInfo.pos);
                                this._topButtons.set(dragName, newBt);

                                anotherButtonGroup.addButtonAt(newBt2, index);
                                this._topButtons.set(name2, newBt2);
                            }
                        }
                    } else {
                        const button = this._bottomButtons.get(name);
                        const disp = endButtonGroup.getButtonAt(underButtonInfo.pos);
                        if (button && disp) {
                            const replaceButton = endButtonGroup.getButtonByName(disp.name);
                            if (replaceButton) {
                                this._bottomButtons.delete(name);
                                endButtonGroup.removeButton(replaceButton);
                                const newName = replaceButton.name as string;
                                this._topButtons.delete(newName);
                                const newBt = replaceButton.clone();
                                this.linkClickHandler(newBt);
                                this._bottomButtons.set(newName, newBt);
                            }

                            this._topButtons.set(name, button);
                            endButtonGroup.addButtonAt(button, underButtonInfo.pos);
                        }
                    }
                }
            } else {
                // from another top to top
                Assert.isTrue(
                    anotherButtonGroup._content === startPointContainer
                );
                let name = null;
                let button: ToolbarButton | null = null;
                this._topButtons.forEach((bt, key) => {
                    if (bt.name === draggingElement.name) {
                        name = key;
                        button = bt;
                    }
                });
                if (name && button) {
                    const bt = button as ToolbarButton;
                    const index = anotherButtonGroup.getButtonIndex(bt.display);
                    const replaceButton = anotherButtonGroup.getButtonByName(name);
                    const disp = endButtonGroup.getButtonAt(underButtonInfo.pos);
                    if (disp) {
                        const bt2 = endButtonGroup.getButtonByName(disp.name);
                        if (replaceButton && bt2) {
                            anotherButtonGroup.removeButton(replaceButton);
                            endButtonGroup.removeButton(bt2);

                            const name2 = bt2.name as string;
                            this._topButtons.delete(name);
                            this._topButtons.delete(name2);

                            const newBt = bt.clone();
                            const newBt2 = bt2.clone();
                            this.linkClickHandler(newBt);
                            this.linkClickHandler(newBt2);

                            endButtonGroup.addButtonAt(newBt, underButtonInfo.pos);
                            this._topButtons.set(name, newBt);

                            anotherButtonGroup.addButtonAt(newBt2, index);
                            this._topButtons.set(name2, newBt2);
                        }
                    }
                }
            }
        } else {
            // insert
            const count = endButtonGroup.buttons.length;
            // when topButtonGroup has space
            if (count < endButtonGroup._capability) {
                // from middle to top
                if (startPointContainer === this.middleScrollContainer.content) {
                    const name = draggingElement.name;
                    if (name) {
                        const dragName = draggingElement.name as string;
                        const endBt = endButtonGroup.buttons.find((b) => b.name === dragName);
                        const anotherBt = anotherButtonGroup.buttons.find((b) => b.name === dragName);

                        if (endBt) {
                            const bt = endButtonGroup.getButtonByName(dragName as string) as ToolbarButton;
                            endButtonGroup.insertButton(bt.display, underButtonInfo.pos);
                            endButtonGroup.resizeContainer();
                        } else if (anotherBt) {
                            const bt = anotherBt as ToolbarButton;
                            const replaceButton = anotherButtonGroup.getButtonByName(dragName);
                            if (replaceButton) {
                                anotherButtonGroup.removeButton(replaceButton);

                                this._topButtons.delete(dragName);

                                const newBt = bt.clone();
                                this.linkClickHandler(newBt);

                                endButtonGroup.addButtonAt(newBt, underButtonInfo.pos);
                                this._topButtons.set(dragName, newBt);
                            }
                        } else {
                            const button = this._bottomButtons.get(name);
                            this._bottomButtons.delete(name);
                            if (button) {
                                this._topButtons.set(name, button);
                                endButtonGroup.addButtonAt(button, underButtonInfo.pos);
                            }
                        }
                    }
                } else {
                    // from another top to top
                    Assert.isTrue(
                        anotherButtonGroup._content === startPointContainer
                    );
                    let name = null;
                    let button: ToolbarButton | null = null;
                    this._topButtons.forEach((bt, key) => {
                        if (bt.name === draggingElement.name) {
                            name = key;
                            button = bt;
                        }
                    });
                    if (name && button) {
                        const bt = button as ToolbarButton;
                        this._topButtons.delete(name);
                        anotherButtonGroup.removeButton(bt);
                        const newBt = bt.clone();
                        this.linkClickHandler(newBt);
                        this._topButtons.set(name, newBt);
                        endButtonGroup.addButtonAt(newBt, underButtonInfo.pos);
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

    private dragMove(p: Point): void {
        this._movePointGlobal = p;

        if (!this._draggingElement || !this._isExpanded) return;

        Assert.assertIsDefined(this._startPointContainer);
        Assert.assertIsDefined(this._startPointGlobal);

        this.enableToolbarButtons(false);

        if (this._canDrag) {
            this._draggingElement.display.visible = true;

            const gPos = this._draggingElement.display.parent.getGlobalPosition();
            const pos = new Point(p.x - gPos.x, p.y - gPos.y);
            const buttonBounds = this._draggingElement.display.getLocalBounds();
            const x = pos.x - Math.floor(buttonBounds.width / 2);
            const y = pos.y - Math.floor(buttonBounds.height / 2);
            this._draggingElement.display.position.set(x, y);
            this._canHotbarDrop = this.checkDragElement(p.x, p.y, this._draggingElement, this._draggingIndex);
        }
    }

    private hideTopbarTooltip() {
        this.leftButtonsGroup.topTooltip.display.visible = false;
        this.leftButtonsGroup._highlight.visible = false;
        this.leftButtonsGroup._cursor.visible = false;

        this.rightButtonsGroup.topTooltip.display.visible = false;
        this.rightButtonsGroup._highlight.visible = false;
        this.rightButtonsGroup._cursor.visible = false;
    }

    private dragEnd(): void {
        if (this._draggingElement) {
            this._draggingElement.display.visible = false;
        }
        this.hideTopbarTooltip();
        this.enableToolbarButtons(true);

        if (
            !this._draggingElement || !this._isExpanded
            || !this._startPointGlobal || !this._startPointContainer
        ) {
            this.resetDragState();
            return;
        }

        Assert.assertIsDefined(this._startPointContainer);
        Assert.assertIsDefined(this._startPointGlobal);

        const drop_dx = Math.abs(this._startPointGlobal.x - this._movePointGlobal.x);
        const drop_dy = Math.abs(this._startPointGlobal.y - this._movePointGlobal.y);
        const dropDistance = Math.max(drop_dx, drop_dy);
        if (dropDistance < 5) {
            this.resetDragState();
            return;
        }

        const leftButtonsBounds = this.leftButtonsGroup.container.getBounds();
        const rightButtonsBounds = this.rightButtonsGroup.container.getBounds();
        const middleButtonsBounds = this.middleScrollContainer.content.getBounds();

        if (
            !leftButtonsBounds.contains(this._movePointGlobal.x, this._movePointGlobal.y)
            && !rightButtonsBounds.contains(this._movePointGlobal.x, this._movePointGlobal.y)
            && !middleButtonsBounds.contains(this._movePointGlobal.x, this._movePointGlobal.y)
        ) {
            this.resetDragState();
            return;
        }

        // to leftTop
        if (leftButtonsBounds.contains(this._movePointGlobal.x, this._movePointGlobal.y)) {
            if (!this._canHotbarDrop) {
                this.resetDragState();
                return;
            }
            // leftTop to self
            if (this.leftButtonsGroup._content === this._startPointContainer) {
                Assert.assertIsDefined(this._draggingElement);
                this._draggingElement.display.visible = false;
                const minX = leftButtonsBounds.x;
                const cursorX = this._movePointGlobal.x;
                const pos = cursorX - minX;
                const underButtonInfo = this._getUnderButtonInfo(
                    this.leftButtonsGroup,
                    BUTTON_WIDTH,
                    pos
                );
                const bt = this.leftButtonsGroup.getButtonByName(this._draggingElement.name as string) as ToolbarButton;
                const disp = this.leftButtonsGroup.getButtonAt(underButtonInfo.pos);
                if (!underButtonInfo.bInsertPos) {
                    if (disp) this.leftButtonsGroup.swapButton(bt.display, disp);
                } else {
                    this.leftButtonsGroup.insertButton(bt.display, underButtonInfo.pos);
                }
                this.leftButtonsGroup.resizeContainer();

                this.resetDragState();
                this.updateLayout();
                this.saveTopButtons();
                return;
            }
            // to leftTop
            const result = this._updateActiveButtonsGroup(
                this.leftButtonsGroup,
                leftButtonsBounds,
                this._startPointContainer,
                this._draggingElement,
                this.rightButtonsGroup,
                this._movePointGlobal
            );
            if (!result) {
                this._draggingElement.display.visible = false;
                this.resetDragState();
                this.saveTopButtons();
                return;
            }
        } else if (
            // to rightTop
            rightButtonsBounds.contains(this._movePointGlobal.x, this._movePointGlobal.y)
        ) {
            if (!this._canHotbarDrop) {
                this.resetDragState();
                return;
            }
            // rightTop to self
            if (this.rightButtonsGroup._content === this._startPointContainer) {
                Assert.assertIsDefined(this._draggingElement);
                const minX = rightButtonsBounds.x;
                const cursorX = this._movePointGlobal.x;
                const pos = cursorX - minX;
                const underButtonInfo = this._getUnderButtonInfo(
                    this.rightButtonsGroup,
                    BUTTON_WIDTH,
                    pos
                );
                const name = this._draggingElement.name as string;
                const bt = this.rightButtonsGroup.getButtonByName(name) as ToolbarButton;
                const disp = this.rightButtonsGroup.getButtonAt(underButtonInfo.pos);
                if (!underButtonInfo.bInsertPos) {
                    if (disp) this.rightButtonsGroup.swapButton(bt.display, disp);
                } else {
                    this.rightButtonsGroup.insertButton(bt.display, underButtonInfo.pos);
                }
                this.rightButtonsGroup.resizeContainer();

                this.resetDragState();
                this.updateLayout();
                return;
            }

            // to rightTop
            const result = this._updateActiveButtonsGroup(
                this.rightButtonsGroup,
                rightButtonsBounds,
                this._startPointContainer,
                this._draggingElement,
                this.leftButtonsGroup,
                this._movePointGlobal
            );
            if (!result) {
                this._draggingElement.display.visible = false;
                this.resetDragState();
                return;
            }
        } else if (
            // to middle
            middleButtonsBounds.contains(this._movePointGlobal.x, this._movePointGlobal.y)
        ) {
            // middle to middle
            if (this._startPointContainer === this.middleScrollContainer.content) {
                this.resetDragState();
                this.updateLayout();
                return;
            }

            // topRight to middle
            if (this._startPointContainer === this.rightButtonsGroup._content) {
                let name = null;
                let button: ToolbarButton | null = null;
                let category: ButtonCategory | null = null;
                this._topButtons.forEach((bt, key) => {
                    if (this._draggingElement && bt.name === this._draggingElement.name) {
                        name = key;
                        button = bt;
                        category = bt.category;
                    }
                });
                if (name && button && category) {
                    const bt = button as ToolbarButton;
                    this._topButtons.delete(name);
                    const newBt = bt.clone();
                    this.linkClickHandler(newBt);
                    this._bottomButtons.set(name, newBt);
                    this.rightButtonsGroup.removeButton(bt);

                    this.switchTab(category);
                }
            } else if (this._startPointContainer === this.leftButtonsGroup._content) {
                // topLeft to middle
                let name = null;
                let button: ToolbarButton | null = null;
                let category: ButtonCategory | null = null;
                this._topButtons.forEach((bt, key) => {
                    if (this._draggingElement && bt.name === this._draggingElement.name) {
                        name = key;
                        button = bt;
                        category = bt.category;
                    }
                });
                if (name && button && category) {
                    const bt = button as ToolbarButton;
                    this._topButtons.delete(name);
                    const newBt = bt.clone();
                    this.linkClickHandler(newBt);
                    this._bottomButtons.set(name, newBt);
                    this.leftButtonsGroup.removeButton(bt);
                    this.switchTab(category);
                }
            }

            this.resetDragState();
            this._updateAvailableButtonsContainer();
            this.leftButtonsGroup.resizeContainer();
            this.rightButtonsGroup.resizeContainer();
            this.updateLayout();
            this.saveTopButtons();
            return;
        } else {
            // add code
        }

        this.resetDragState();
        this._updateAvailableButtonsContainer();
        this.updateLayout();
        this.saveTopButtons();
    }

    private onDragStart(e: InteractionEvent): void {
        this.resetDragState();

        if (!this._isExpanded) return;

        const p = e.data.global;
        if (
            DisplayUtil.hitTest(this.leftButtonsGroup.container, p)
        ) {
            this._startPointContainer = this.leftButtonsGroup._content;
        }
        if (
            DisplayUtil.hitTest(this.rightButtonsGroup.container, p)
        ) {
            this._startPointContainer = this.rightButtonsGroup._content;
        }
        if (
            DisplayUtil.hitTest(this.middleScrollContainer.container, p)
        ) {
            this._startPointContainer = this.middleScrollContainer.content;
        }

        if (!this._startPointContainer) return;
        const btnIndex = this._startPointContainer.children.findIndex(
            (el) => el.getBounds().contains(p.x, p.y)
        );

        if (this._startPointContainer.children.length <= 1) return;

        if (this.leftButtonsGroup._content === this._startPointContainer) {
            if (btnIndex >= 0) {
                let name = null;
                this._topButtons.forEach((bt, key) => {
                    if (bt.display === e.target) {
                        name = key;
                    }
                });
                if (name) {
                    const foundButton = this._containerButtons.get(name);
                    if (foundButton) {
                        this._draggingElement = foundButton;
                        this._draggingIndex = btnIndex;
                    }
                }
            }
        } else if (
            this.rightButtonsGroup._content === this._startPointContainer
        ) {
            if (btnIndex >= 0) {
                let name = null;
                this._topButtons.forEach((bt, key) => {
                    if (bt.display === e.target) {
                        name = key;
                    }
                });
                if (name) {
                    const foundButton = this._containerButtons.get(name);
                    if (foundButton) {
                        this._draggingElement = foundButton;
                        this._draggingIndex = btnIndex;
                    }
                }
            }
        } else if (
            this.middleScrollContainer.content === this._startPointContainer
        ) {
            if (btnIndex >= 0) {
                const name = this._getButtonName(e.target);
                if (name) {
                    const toolbarButton = this.toolbarButtons.get(name);
                    if (toolbarButton && toolbarButton.enabled) {
                        const foundButton = this._containerButtons.get(name);
                        if (foundButton) {
                            this._draggingElement = foundButton;
                            this._draggingIndex = btnIndex;
                        }
                    }
                }
            }
        }

        if (this._draggingElement) {
            this._startPointGlobal = new Point(e.data.global.x, e.data.global.y);
        }
    }

    private onDragMove(e: InteractionEvent): void {
        if (!this._draggingElement || !this._isExpanded) return;

        Assert.assertIsDefined(this._startPointContainer);
        Assert.assertIsDefined(this._startPointGlobal);

        const minPointDiff = 5;
        if (!this._canDrag) {
            const diff = this._getPointsDifference(
                e.data.global, this._startPointGlobal
            );
            if (diff.x < minPointDiff && diff.y < minPointDiff) return;
            this._canDrag = true;
        }

        if (this._canDrag) {
            const dragger = new Dragger();
            this.addObject(dragger);
            this.regs.add(dragger.dragged.connect((p: Point) => {
                this.dragMove(p);
            }));
            this.regs.add(dragger.dragComplete.connect(() => {
                this.dragEnd();
            }));
        }
    }

    private onDragEnd(): void {
        this._canDrag = false;
        this._canHotbarDrop = false;
        this._draggingElement = undefined;
    }

    private checkDragElement(x: number, y: number, draggingElement: ToolbarButton, draggingIndex: number): boolean {
        Assert.assertIsDefined(this._startPointContainer);
        const leftButtonsBounds = this.leftButtonsGroup.container.getBounds();
        const rightButtonsBounds = this.rightButtonsGroup.container.getBounds();

        this.leftButtonsGroup.topTooltip.display.visible = false;
        this.leftButtonsGroup._highlight.visible = false;
        this.leftButtonsGroup._cursor.visible = false;

        this.rightButtonsGroup.topTooltip.display.visible = false;
        this.rightButtonsGroup._highlight.visible = false;
        this.rightButtonsGroup._cursor.visible = false;

        let endButtonGroup = null;
        let endButtonBounds = null;

        const dragName = draggingElement.name;
        const leftBt = this.leftButtonsGroup.buttons.find((b) => b.name === dragName);
        const rightBt = this.rightButtonsGroup.buttons.find((b) => b.name === dragName);

        let inPlace = false;
        let swapTop = false;
        let swapTop2 = false;
        if (leftButtonsBounds.contains(x, y)) {
            if (this.leftButtonsGroup._content === this._startPointContainer) {
                inPlace = true;
            } else if (this.rightButtonsGroup._content === this._startPointContainer) {
                swapTop = true;
            } else if (leftBt) swapTop2 = true;
            else if (rightBt) swapTop2 = true;

            endButtonGroup = this.leftButtonsGroup;
            endButtonBounds = leftButtonsBounds;
        } else if (rightButtonsBounds.contains(x, y)) {
            if (this.rightButtonsGroup._content === this._startPointContainer) {
                inPlace = true;
            } else if (this.leftButtonsGroup._content === this._startPointContainer) {
                swapTop = true;
            } else if (rightBt) swapTop2 = true;
            else if (leftBt) swapTop2 = true;

            endButtonGroup = this.rightButtonsGroup;
            endButtonBounds = rightButtonsBounds;
        }

        if (endButtonGroup && endButtonBounds) {
            const count = endButtonGroup.buttons.length;

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
                if (!underButtonInfo.bInsertPos && draggingIndex !== underButtonInfo.pos
                    && underButtonInfo.pos < this._startPointContainer.children.length) {
                    endButtonGroup._highlight.visible = true;
                    endButtonGroup.topTooltip.setText(
                        'Swap buttons',
                        15,
                        TextBalloon.DEFAULT_FONT_COLOR
                    );
                    endButtonGroup.topTooltip.display.position.set(x - 10, y - 60);
                    endButtonGroup.topTooltip.display.visible = true;
                    return true;
                } else if (draggingIndex !== underButtonInfo.pos && (draggingIndex + 1) !== underButtonInfo.pos
                    && underButtonInfo.bInsertPos) {
                    endButtonGroup._cursor.visible = true;
                    endButtonGroup.topTooltip.setText(
                        'Insert',
                        15,
                        TextBalloon.DEFAULT_FONT_COLOR
                    );
                    endButtonGroup.topTooltip.display.position.set(x - 10, y - 60);
                    endButtonGroup.topTooltip.display.visible = true;
                    return true;
                }
            } else if (swapTop || swapTop2) {
                let tipText = 'Swap buttons';
                if (!underButtonInfo.bInsertPos) {
                    endButtonGroup._highlight.visible = true;
                    tipText = 'Swap buttons';
                } else {
                    endButtonGroup._cursor.visible = true;
                    tipText = 'Insert';
                }
                endButtonGroup._highlight.visible = true;
                endButtonGroup.topTooltip.setText(
                    tipText,
                    15,
                    TextBalloon.DEFAULT_FONT_COLOR
                );
                endButtonGroup.topTooltip.display.position.set(x - 10, y - 60);
                endButtonGroup.topTooltip.display.visible = true;
                return true;
            } else if (
                count < endButtonGroup._capability
                    && underButtonInfo.bInsertPos
            ) {
                endButtonGroup._cursor.visible = true;
                endButtonGroup.topTooltip.setText(
                    'Insert',
                    15,
                    TextBalloon.DEFAULT_FONT_COLOR
                );
                endButtonGroup.topTooltip.display.position.set(x - 10, y - 60);
                endButtonGroup.topTooltip.display.visible = true;
                return true;
            } else if (underButtonInfo.bInsertPos) {
                endButtonGroup._cursor.visible = true;
                endButtonGroup.topTooltip.setText(
                    'Only replacement is allowed',
                    15,
                    0xff0000
                );
                endButtonGroup.topTooltip.display.position.set(x - 10, y - 60);
                endButtonGroup.topTooltip.display.visible = true;
                return false;
            } else {
                endButtonGroup._highlight.visible = true;
                endButtonGroup.topTooltip.setText(
                    'Replace',
                    15,
                    TextBalloon.DEFAULT_FONT_COLOR
                );
                endButtonGroup.topTooltip.display.position.set(x - 10, y - 60);
                endButtonGroup.topTooltip.display.visible = true;
                return true;
            }
        }
        return false;
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

    public getMirrorBottomButton(bt: ToolbarButton): ToolbarButton | undefined {
        if (bt.name) {
            const b = this._bottomButtons.get(bt.name);
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

    private makeArrowButton(direction: 'left' | 'right'): GameButton {
        // Height of the rest of the toolbar elements
        const HEIGHT = APPROX_ITEM_HEIGHT;

        const arrowImg = new Sprite(
            BitmapManager.getBitmap(
                direction === 'left'
                    ? Bitmaps.PrevArrow
                    : Bitmaps.NextArrow
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

        const bt = new GameButton();
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
                this._disableTools(false);
                mouseDown = false;
            })
        );

        this.regs.add(
            this.scrollContainer.pointerUpOutside.connect(() => {
                this._disableTools(false);
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
                        this._disableTools(this.toolBarEnabled);
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
                if (this._isAutoCollapsed) uncollapse();
                else collapse();
            }));
            this._autoCollapseRegs.add(this.pointerOver.connect(uncollapse));
            this._autoCollapseRegs.add(this.pointerOut.connect(collapse));

            collapse();
        } else {
            Assert.assertIsDefined(Flashbang.stageHeight);
            this.display.interactive = false;
            this._invisibleBackground.interactive = false;
            this._isAutoCollapsed = false;

            if (this._autoCollapseRegs != null) {
                this._autoCollapseRegs.close();
                this._autoCollapseRegs = null;
            }

            this.removeNamedObjects(COLLAPSE_ANIM);
            this._vContent.y = Flashbang.stageHeight - this._vContent.height - (this._isExpanded ? 0 : 10);
        }
    }

    public disableTools(disable: boolean): void {
        this.toolBarEnabled = !disable;
        this._disableTools(disable);
    }

    public _disableTools(disable: boolean): void {
        this.stateToggle.enabled = !disable;
        this.targetButton.enabled = !disable;
        this.palette.enabled = !disable;
        this.naturalButton.enabled = !disable;
        this.estimateButton.enabled = !disable;

        this.leftButtonsGroup.buttons.forEach((e) => {
            e.enabled = !disable;
        });
        this.rightButtonsGroup.buttons.forEach((e) => {
            e.enabled = !disable;
        });

        this.toolbarButtons.forEach((bt) => {
            bt.enabled = !disable;
            this.getMirrorButtons(bt).forEach((b) => {
                if (b) b.enabled = !disable;
            });
        });

        this.updateEnableOfMiddleButtons();
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
            this.getMirrorButtons(button).forEach((b) => { if (b) b.toggled.value = false; });
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

    private WIDTH: number = DEFAULT_TOOLBAR_WIDTH;
    private MIDDLE_WIDTH = DEFAULT_TOOLBAR_WIDTH - 30 * 2;
    private MIDDLE_MARGIN = 0;

    private toolbarButtons: Map<string, ToolbarButton> = new Map();
    private _bottomButtons: Map<string, ToolbarButton> = new Map();
    public _topButtons: Map<string, ToolbarButton> = new Map();
    public _containerButtons: Map<string, ToolbarButton> = new Map();

    private _expandButtonContainer: HLayoutContainer;

    private _autoCollapseRegs: RegistrationGroup | null;

    private _isExpanded: boolean;
    private _isAutoCollapsed: boolean;
    private _canDrag: boolean;
    private _canHotbarDrop: boolean;

    private _draggingElement: ToolbarButton | undefined;
    private _draggingIndex: number;

    private _startPointGlobal: Point | null;
    private _startPointContainer: Container | null;
    private _movePointGlobal: Point = new Point();

    private _annotationManager: AnnotationManager | undefined;
}

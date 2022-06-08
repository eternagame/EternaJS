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
    ParallelTask,
    VisibleTask,
    GameObjectRef,
    SerialTask
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
import NucleotidePalette from './NucleotidePalette';
import GameButton from './GameButton';
import ToggleBar from './ToggleBar';
import ScrollContainer from './ScrollContainer';
import AnnotationPanel from './AnnotationPanel';
import TextBalloon from './TextBalloon';
import BoosterDialog from './BoosterDialog';
import ToolbarButton, {ButtonCategory, BUTTON_WIDTH} from './ToolbarButton';

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
let TOOLBAR_WIDTH = 666;
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

        this._content = new HLayoutContainer();
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
        this.container.addChild(this._content);
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

        this._buttons.forEach((button, index) => {
            button.display.x = BUTTON_WIDTH * index;
            button.display.visible = true;
            this._content.addChild(button.display);
        });
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
    }

    public addButtonAt(newButton: DisplayObject, position: number): void {
        this._content.addChildAt(newButton, position);
        this._background.width = Math.max(this._content.children.length, EMPTY_SIZE) * BUTTON_WIDTH;
    }

    public swapButton(bt1: DisplayObject, bt2: DisplayObject) {
        this._content.swapChildren(bt1, bt2);
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
        return this._content.removeChildAt(index);
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
    // Core
    public zoomInButton: ToolbarButton;
    public zoomOutButton: ToolbarButton;
    public pipButton: ToolbarButton;
    public stateToggle: ToggleBar;

    public targetButton: ToolbarButton;
    public naturalButton: ToolbarButton;

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
    public annotationPanel: AnnotationPanel;

    public freezeButton: ToolbarButton;
    public boostersMenuButton: ToolbarButton;

    public upload3DButton: ToolbarButton;
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
        updateScriptViews: VoidHandler;
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
            updateScriptViews: VoidHandler;
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
    }

    public onResized() {
        Assert.assertIsDefined(Flashbang.stageWidth);
        // this.updateLayout();
        this.resizeToolbar();
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

        this.middleScrollContainer.content.children.forEach((c) => {
            const v = this.visiblities.get(c);
            if (v) c.visible = v;
        });

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

    private makeInfoButtons() {
        this.submitButton = new ToolbarButton();
        this.submitButton.setCategory(ButtonCategory.INFO);
        this.submitButton.setName('Submit');
        this.submitButton.allStates(Bitmaps.ImgSubmit);
        this.submitButton.tooltip('Submit');
        this._gameButtons.set('Submit', this.submitButton);
        this._bottomButtons.set(
            'Submit',
            new ToolbarButton()
                .setCategory(ButtonCategory.INFO)
                .setName('Submit')
                .allStates(Bitmaps.ImgSubmit)
                .tooltip('Submit')
        );

        this.viewSolutionsButton = new ToolbarButton();
        this.viewSolutionsButton.setCategory(ButtonCategory.INFO);
        this.viewSolutionsButton.setName('Solutions');
        this.viewSolutionsButton.allStates(Bitmaps.ImgViewSolutions);
        this.viewSolutionsButton.disabled(undefined);
        this.viewSolutionsButton.tooltip('View all submitted designs for this puzzle.');
        this._gameButtons.set('Solutions', this.viewSolutionsButton);
        this._bottomButtons.set(
            'Solutions',
            new ToolbarButton()
                .setCategory(ButtonCategory.INFO)
                .setName('Solutions')
                .allStates(Bitmaps.ImgViewSolutions)
                .disabled(undefined)
                .tooltip('View all submitted designs for this puzzle.')
        );

        this.specButton = new ToolbarButton();
        this.specButton.setCategory(ButtonCategory.INFO);
        this.specButton.setName('Spec');
        this.specButton.allStates(Bitmaps.ImgSpec);
        this.specButton.disabled(undefined);
        this.specButton.tooltip("View RNA's melting point, dotplot and other specs (S)");
        this.specButton.hotkey(KeyCode.KeyS);
        this._gameButtons.set('Spec', this.specButton);
        this._bottomButtons.set(
            'Spec',
            new ToolbarButton()
                .setCategory(ButtonCategory.INFO)
                .setName('Spec')
                .allStates(Bitmaps.ImgSpec)
                .disabled(undefined)
                .tooltip("View RNA's melting point, dotplot and other specs (S)")
        );

        this.settingsButton = new ToolbarButton();
        this.settingsButton.setCategory(ButtonCategory.INFO);
        this.settingsButton.setName('Settings');
        this.settingsButton.allStates(Bitmaps.ImgSettings);
        this.settingsButton.tooltip('Game options');
        this._gameButtons.set('Settings', this.settingsButton);
        this._bottomButtons.set(
            'Settings',
            new ToolbarButton()
                .setCategory(ButtonCategory.INFO)
                .setName('Settings')
                .allStates(Bitmaps.ImgSettings)
                .tooltip('Game options')
        );
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
            this.getMirrorButton(this.submitButton).tooltip('Publish your solution!');
            this.pushButtonToCategory(this.submitButton);
        } else if (this._type === ToolbarType.PUZZLEMAKER) {
            this.submitButton.tooltip('Publish your puzzle!');
            this.getMirrorButton(this.submitButton).tooltip('Publish your puzzle!');
            this.pushButtonToCategory(this.submitButton);
        }

        this.pushButtonToCategory(this.settingsButton);
    }

    private makeCreateButtons() {
        this.addBaseButton = new ToolbarButton();
        this.addBaseButton.setCategory(ButtonCategory.CREATE);
        this.addBaseButton.setName('Add base');
        this.addBaseButton.allStates(Bitmaps.ImgAddBase);
        this.addBaseButton.hotkey(KeyCode.Digit6);
        this.addBaseButton.tooltip('Add a single base.');
        this._gameButtons.set('Add base', this.addBaseButton);
        this._bottomButtons.set(
            'Add base',
            new ToolbarButton()
                .setCategory(ButtonCategory.CREATE)
                .setName('Add base')
                .allStates(Bitmaps.ImgAddBase)
                .tooltip('Add a single base.')
        );

        this.addPairButton = new ToolbarButton();
        this.addPairButton.setCategory(ButtonCategory.CREATE);
        this.addPairButton.setName('Add pair');
        this.addPairButton.allStates(Bitmaps.ImgAddPair);
        this.addPairButton.hotkey(KeyCode.Digit7);
        this.addPairButton.tooltip('Add a pair.');
        this._gameButtons.set('Add pair', this.addPairButton);
        this._bottomButtons.set(
            'Add pair',
            new ToolbarButton()
                .setCategory(ButtonCategory.CREATE)
                .setName('Add pair')
                .allStates(Bitmaps.ImgAddPair)
                .tooltip('Add a pair.')
        );

        this.deleteButton = new ToolbarButton();
        this.deleteButton.setCategory(ButtonCategory.CREATE);
        this.deleteButton.setName('Delete');
        this.deleteButton.allStates(Bitmaps.ImgDelete);
        this.deleteButton.hotkey(KeyCode.Digit8);
        this.deleteButton.tooltip('Delete a base or a pair.');
        this._gameButtons.set('Delete', this.deleteButton);
        this._bottomButtons.set(
            'Delete',
            new ToolbarButton()
                .setCategory(ButtonCategory.CREATE)
                .setName('Delete')
                .allStates(Bitmaps.ImgDelete)
                .tooltip('Delete a base or a pair.')
        );

        this.lockButton = new ToolbarButton();
        this.lockButton.setCategory(ButtonCategory.CREATE);
        this.lockButton.setName('Lock');
        this.lockButton.allStates(Bitmaps.ImgLock);
        this.lockButton.hotkey(KeyCode.Digit9);
        this.lockButton.tooltip('Lock or unlock a base.');
        this._gameButtons.set('Lock', this.lockButton);
        this._bottomButtons.set(
            'Lock',
            new ToolbarButton()
                .setCategory(ButtonCategory.CREATE)
                .setName('Lock')
                .allStates(Bitmaps.ImgLock)
                .tooltip('Lock or unlock a base.')
        );

        this.moleculeButton = new ToolbarButton();
        this.moleculeButton.setCategory(ButtonCategory.CREATE);
        this.moleculeButton.setName('Molecule');
        this.moleculeButton.allStates(Bitmaps.ImgMolecule);
        this.moleculeButton.hotkey(KeyCode.Digit0);
        this.moleculeButton.tooltip('Create or remove a molecular binding site.');
        this._gameButtons.set('Molecule', this.moleculeButton);
        this._bottomButtons.set(
            'Molecule',
            new ToolbarButton()
                .setCategory(ButtonCategory.CREATE)
                .setName('Molecule')
                .allStates(Bitmaps.ImgMolecule)
                .tooltip('Create or remove a molecular binding site.')
        );

        this.validate3DButton = new ToolbarButton();
        this.validate3DButton.setCategory(ButtonCategory.CREATE);
        this.validate3DButton.setName('Open 3D');
        this.validate3DButton.allStates(Bitmaps.ImgValidate3D);
        this.validate3DButton.tooltip('Validate 3D Models');
        this._gameButtons.set('Open 3D', this.validate3DButton);
        this._bottomButtons.set(
            'Open 3D',
            new ToolbarButton()
                .setCategory(ButtonCategory.CREATE)
                .setName('Open 3D')
                .allStates(Bitmaps.ImgValidate3D)
                .tooltip('Validate 3D Models')
        );

        this.regs.add(
            this.addBaseButton.clicked.connect(() => {
                this._deselectAllPaintTools();
                this.addBaseButton.toggled.value = true;
                this.getMirrorButton(this.addBaseButton).toggled.value = true;
            })
        );
        this.regs.add(
            this.addPairButton.clicked.connect(() => {
                this._deselectAllPaintTools();
                this.addPairButton.toggled.value = true;
                this.getMirrorButton(this.addPairButton).toggled.value = true;
            })
        );
        this.regs.add(
            this.deleteButton.clicked.connect(() => {
                this._deselectAllPaintTools();
                this.deleteButton.toggled.value = true;
                this.getMirrorButton(this.deleteButton).toggled.value = true;
            })
        );
        this.regs.add(
            this.lockButton.clicked.connect(() => {
                this._deselectAllPaintTools();
                this.lockButton.toggled.value = true;
                this.getMirrorButton(this.lockButton).toggled.value = true;
            })
        );
        this.regs.add(
            this.moleculeButton.clicked.connect(() => {
                this._deselectAllPaintTools();
                this.moleculeButton.toggled.value = true;
                this.getMirrorButton(this.moleculeButton).toggled.value = true;
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
        this.resetButton = new ToolbarButton();
        this.resetButton.setCategory(ButtonCategory.SOLVE);
        this.resetButton.setName('Reset');
        this.resetButton.allStates(Bitmaps.ImgReset);
        this.resetButton.tooltip('Reset');
        this.resetButton.rscriptID(RScriptUIElementID.RESET);
        this._gameButtons.set('Reset', this.resetButton);
        this._bottomButtons.set(
            'Reset',
            new ToolbarButton()
                .setCategory(ButtonCategory.SOLVE)
                .setName('Reset')
                .allStates(Bitmaps.ImgReset)
                .tooltip('Reset')
                .rscriptID(RScriptUIElementID.RESET)
        );

        this.freezeButton = new ToolbarButton();
        this.freezeButton.setCategory(ButtonCategory.SOLVE);
        this.freezeButton.setName('Freeze');
        this.freezeButton.allStates(Bitmaps.ImgFreeze);
        this.freezeButton.tooltip('Frozen mode. Suspends/resumes folding engine calculations. (F)');
        this.freezeButton.hotkey(KeyCode.KeyF);
        this.freezeButton.rscriptID(RScriptUIElementID.FREEZE);
        this._gameButtons.set('Freeze', this.freezeButton);
        this._bottomButtons.set(
            'Freeze',
            new ToolbarButton()
                .setCategory(ButtonCategory.SOLVE)
                .setName('Freeze')
                .allStates(Bitmaps.ImgFreeze)
                .tooltip('Frozen mode. Suspends/resumes folding engine calculations. (F)')
                .rscriptID(RScriptUIElementID.FREEZE)
        );

        this.baseShiftButton = new ToolbarButton();
        this.baseShiftButton.setCategory(ButtonCategory.SOLVE);
        this.baseShiftButton.setName('Shift base');
        this.baseShiftButton.allStates(Bitmaps.ImgBaseShift);
        this.baseShiftButton.tooltip('Base shift');
        this._gameButtons.set('Shift base', this.baseShiftButton);
        this._bottomButtons.set(
            'Shift base',
            new ToolbarButton()
                .setCategory(ButtonCategory.SOLVE)
                .setName('Shift base')
                .allStates(Bitmaps.ImgBaseShift)
                .tooltip('Base shift')
        );

        this.pairSwapButton = new ToolbarButton();
        this.pairSwapButton.setCategory(ButtonCategory.SOLVE);
        this.pairSwapButton.setName('Swap pair');
        this.pairSwapButton.allStates(Bitmaps.ImgPairSwap);
        this.pairSwapButton.tooltip('Swap paired bases');
        this.pairSwapButton.rscriptID(RScriptUIElementID.SWAP);
        this._gameButtons.set('Swap pair', this.pairSwapButton);
        this.pairSwapButton.clicked.connect(
            this.handlers.pairSwapButtonHandler
        );
        this._bottomButtons.set(
            'Swap pair',
            new ToolbarButton()
                .setCategory(ButtonCategory.SOLVE)
                .setName('Swap pair')
                .allStates(Bitmaps.ImgPairSwap)
                .tooltip('Swap paired bases')
                .rscriptID(RScriptUIElementID.SWAP)
        );

        this.undoButton = new ToolbarButton();
        this.undoButton.setCategory(ButtonCategory.SOLVE);
        this.undoButton.setName('Undo');
        this.undoButton.allStates(Bitmaps.ImgUndo);
        this.undoButton.tooltip('Undo');
        this.undoButton.hotkey(KeyCode.KeyZ);
        this.undoButton.rscriptID(RScriptUIElementID.UNDO);
        this._gameButtons.set('Undo', this.undoButton);
        this._bottomButtons.set(
            'Undo',
            new ToolbarButton()
                .setCategory(ButtonCategory.SOLVE)
                .setName('Undo')
                .allStates(Bitmaps.ImgUndo)
                .tooltip('Undo')
        );

        this.redoButton = new ToolbarButton();
        this.redoButton.setCategory(ButtonCategory.SOLVE);
        this.redoButton.setName('Redo');
        this.redoButton.allStates(Bitmaps.ImgRedo);
        this.redoButton.tooltip('Redo');
        this.redoButton.hotkey(KeyCode.KeyY);
        this.redoButton.rscriptID(RScriptUIElementID.REDO);
        this._gameButtons.set('Redo', this.redoButton);
        this._bottomButtons.set(
            'Redo',
            new ToolbarButton()
                .setCategory(ButtonCategory.SOLVE)
                .setName('Redo')
                .allStates(Bitmaps.ImgRedo)
                .tooltip('Redo')
        );

        this.librarySelectionButton = new ToolbarButton();
        this.librarySelectionButton.setCategory(ButtonCategory.SOLVE);
        this.librarySelectionButton.setName('Select lib');
        this.librarySelectionButton.allStates(Bitmaps.ImgLibrarySelection);
        this.librarySelectionButton.tooltip('Select bases to randomize');
        this._gameButtons.set('Select lib', this.librarySelectionButton);
        this._bottomButtons.set(
            'Select lib',
            new ToolbarButton()
                .setCategory(ButtonCategory.SOLVE)
                .setName('Select lib')
                .allStates(Bitmaps.ImgLibrarySelection)
                .tooltip('Select bases to randomize')
        );

        this.magicGlueButton = new ToolbarButton();
        this.magicGlueButton.setCategory(ButtonCategory.SOLVE);
        this.magicGlueButton.setName('Magic glue');
        this.magicGlueButton.allStates(Bitmaps.ImgMagicGlue);
        this.magicGlueButton.tooltip('Magic glue - change target structure in purple areas (Hold Alt)');
        this._gameButtons.set('Magic glue', this.magicGlueButton);
        this.magicGlueButton.display.interactive = true;
        this._bottomButtons.set(
            'Magic glue',
            new ToolbarButton()
                .setCategory(ButtonCategory.SOLVE)
                .setName('Magic glue')
                .allStates(Bitmaps.ImgMagicGlue)
                .tooltip('Magic glue - change target structure in purple areas (Hold Alt)')
        );
    }

    private makeSolveLayout() {
        if (
            this._type === ToolbarType.LAB
            || this._type === ToolbarType.PUZZLE
        ) {
            this.pushButtonToCategory(this.freezeButton);
            this.freezeButton.display.visible = Eterna.settings.freezeButtonAlwaysVisible.value;
            this.regs.add(
                Eterna.settings.freezeButtonAlwaysVisible.connect((visible) => {
                    this.freezeButton.display.visible = visible;
                    this.updateLayout();
                })
            );
        }

        this.pushButtonToCategory(this.pairSwapButton);
        this.pushButtonToCategory(this.baseShiftButton);

        this.regs.add(
            this.pairSwapButton.clicked.connect(() => {
                this._deselectAllPaintTools();
                this.pairSwapButton.toggled.value = true;
                this.getMirrorButton(this.pairSwapButton).toggled.value = true;
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
                    this.getMirrorButton(
                        this.librarySelectionButton
                    ).toggled.value = true;
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
                    this.getMirrorButton(this.magicGlueButton).toggled.value = true;
                })
            );
        }
    }

    private makeInoutButtons() {
        this.copyButton = new ToolbarButton();
        this.copyButton.setCategory(ButtonCategory.IMPORT_EXPORT);
        this.copyButton.setName('Copy');
        this.copyButton.allStates(Bitmaps.ImgCopy);
        this.copyButton.tooltip('Copy the current sequence');
        this._gameButtons.set('Copy', this.copyButton);
        this._bottomButtons.set(
            'Copy',
            new ToolbarButton()
                .setCategory(ButtonCategory.IMPORT_EXPORT)
                .setName('Copy')
                .allStates(Bitmaps.ImgCopy)
                .tooltip('Copy the current sequence')
        );

        this.pasteButton = new ToolbarButton();
        this.pasteButton.setCategory(ButtonCategory.IMPORT_EXPORT);
        this.pasteButton.setName('Paste');
        this.pasteButton.allStates(Bitmaps.ImgPaste);
        this.pasteButton.tooltip('Type in a sequence');
        this._gameButtons.set('Paste', this.pasteButton);
        this._bottomButtons.set(
            'Paste',
            new ToolbarButton()
                .setCategory(ButtonCategory.IMPORT_EXPORT)
                .setName('Paste')
                .allStates(Bitmaps.ImgPaste)
                .tooltip('Type in a sequence')
        );

        this.downloadHKWSButton = new ToolbarButton();
        this.downloadHKWSButton.setCategory(ButtonCategory.IMPORT_EXPORT);
        this.downloadHKWSButton.setName('Download HKWS');
        this.downloadHKWSButton.allStates(Bitmaps.ImgDownloadHKWS);
        this.downloadHKWSButton.tooltip('Download a draw_rna input file for the current layout');
        this._gameButtons.set('Download HKWS', this.downloadHKWSButton);
        this._bottomButtons.set(
            'Download HKWS',
            new ToolbarButton()
                .setCategory(ButtonCategory.IMPORT_EXPORT)
                .setName('Download HKWS')
                .allStates(Bitmaps.ImgDownloadHKWS)
                .tooltip('Download a draw_rna input file for the current layout')
        );
        this.downloadHKWSButton.display.buttonMode = true;
        this.downloadHKWSButton.display.interactive = true;

        this.downloadSVGButton = new ToolbarButton();
        this.downloadSVGButton.setCategory(ButtonCategory.IMPORT_EXPORT);
        this.downloadSVGButton.setName('Download SVG');
        this.downloadSVGButton.allStates(Bitmaps.ImgDownloadSVG);
        this.downloadSVGButton.tooltip('Download an SVG of the current RNA layout');
        this._gameButtons.set('Download SVG', this.downloadSVGButton);
        this._bottomButtons.set(
            'Download SVG',
            new ToolbarButton()
                .setCategory(ButtonCategory.IMPORT_EXPORT)
                .setName('Download SVG')
                .allStates(Bitmaps.ImgDownloadSVG)
                .tooltip('Download an SVG of the current RNA layout')
        );
        // this.downloadSVGButton.display.buttonMode = true;
        // this.downloadSVGButton.display.interactive = true;

        this.screenshotButton = new ToolbarButton();
        this.screenshotButton.setCategory(ButtonCategory.IMPORT_EXPORT);
        this.screenshotButton.setName('Screenshot');
        this.screenshotButton.allStates(Bitmaps.ImgScreenshot);
        this.screenshotButton.tooltip('Screenshot');
        this.screenshotButton.disabled(undefined);
        this._gameButtons.set('Screenshot', this.screenshotButton);
        this._bottomButtons.set(
            'Screenshot',
            new ToolbarButton()
                .setCategory(ButtonCategory.IMPORT_EXPORT)
                .setName('Screenshot')
                .allStates(Bitmaps.ImgScreenshot)
                .tooltip('Screenshot')
                .disabled(undefined)
        );
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
        this.nucleotideFindButton = new ToolbarButton();
        this.nucleotideFindButton.setCategory(ButtonCategory.VIEW);
        this.nucleotideFindButton.setName('Find');
        this.nucleotideFindButton.allStates(Bitmaps.ImgNucleotideFind);
        this.nucleotideFindButton.disabled();
        this.nucleotideFindButton.tooltip('Type a nucleotide index to put it in the center of the screen (J)');
        this.nucleotideFindButton.hotkey(KeyCode.KeyJ);
        this._gameButtons.set('Find', this.nucleotideFindButton);
        this._bottomButtons.set(
            'Find',
            new ToolbarButton()
                .setCategory(ButtonCategory.VIEW)
                .setName('Find')
                .allStates(Bitmaps.ImgNucleotideFind)
                .disabled()
                .tooltip('Type a nucleotide index to put it in the center of the screen (J)')
        );

        this.nucleotideRangeButton = new ToolbarButton();
        this.nucleotideRangeButton.setCategory(ButtonCategory.VIEW);
        this.nucleotideRangeButton.setName('Range');
        this.nucleotideRangeButton.allStates(Bitmaps.ImgNucleotideRange);
        this.nucleotideRangeButton.disabled();
        this.nucleotideRangeButton.tooltip('Enter a nucleotide range to view (V)');
        this.nucleotideRangeButton.hotkey(KeyCode.KeyV);
        this._gameButtons.set('Range', this.nucleotideRangeButton);
        this._bottomButtons.set(
            'Range',
            new ToolbarButton()
                .setCategory(ButtonCategory.VIEW)
                .setName('Range')
                .allStates(Bitmaps.ImgNucleotideRange)
                .disabled()
                .tooltip('Enter a nucleotide range to view (V)')
        );

        this.explosionFactorButton = new ToolbarButton();
        this.explosionFactorButton.setCategory(ButtonCategory.VIEW);
        this.explosionFactorButton.setName('Explosion factor');
        this.explosionFactorButton.allStates(Bitmaps.ImgExplosionFactor);
        this.explosionFactorButton.disabled();
        this.explosionFactorButton.tooltip('Set explosion factor ([, ])');
        this._gameButtons.set('Explosion factor', this.explosionFactorButton);
        this._bottomButtons.set(
            'Explosion factor',
            new ToolbarButton()
                .setCategory(ButtonCategory.VIEW)
                .setName('Explosion factor')
                .allStates(Bitmaps.ImgExplosionFactor)
                .disabled()
                .tooltip('Set explosion factor ([, ])')
        );

        this.pipButton = new ToolbarButton();
        this.pipButton.setCategory(ButtonCategory.VIEW);
        this.pipButton.setName('PiP');
        this.pipButton.allStates(Bitmaps.ImgPip);
        this.pipButton.tooltip('Set PiP mode (P)');
        this.pipButton.hotkey(KeyCode.KeyP);
        this.pipButton.rscriptID(RScriptUIElementID.PIP);
        this._gameButtons.set('PiP', this.pipButton);
        this._bottomButtons.set(
            'PiP',
            new ToolbarButton()
                .setCategory(ButtonCategory.VIEW)
                .setName('PiP')
                .allStates(Bitmaps.ImgPip)
                .tooltip('Set PiP mode (P)')
        );

        this.zoomInButton = new ToolbarButton();
        this.zoomInButton.setCategory(ButtonCategory.VIEW);
        this.zoomInButton.setName('Zoom in');
        this.zoomInButton.allStates(Bitmaps.ImgZoomIn);
        this.zoomInButton.tooltip('Zoom in (=)');
        this.zoomInButton.hotkey(KeyCode.Equal);
        this.zoomInButton.rscriptID(RScriptUIElementID.ZOOMIN);
        this._gameButtons.set('Zoom in', this.zoomInButton);
        this._bottomButtons.set(
            'Zoom in',
            new ToolbarButton()
                .setCategory(ButtonCategory.VIEW)
                .setName('Zoom in')
                .allStates(Bitmaps.ImgZoomIn)
                .tooltip('Zoom in (=)')
        );

        this.zoomOutButton = new ToolbarButton();
        this.zoomOutButton.setCategory(ButtonCategory.VIEW);
        this.zoomOutButton.setName('Zoom out');
        this.zoomOutButton.allStates(Bitmaps.ImgZoomOut);
        this.zoomOutButton.tooltip('Zoom out (-)');
        this.zoomOutButton.hotkey(KeyCode.Minus);
        this.zoomOutButton.rscriptID(RScriptUIElementID.ZOOMOUT);
        this._gameButtons.set('Zoom out', this.zoomOutButton);
        this._bottomButtons.set(
            'Zoom out',
            new ToolbarButton()
                .setCategory(ButtonCategory.VIEW)
                .setName('Zoom out')
                .allStates(Bitmaps.ImgZoomOut)
                .tooltip('Zoom out (-)')
        );
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
        this.moveButton = new ToolbarButton();
        this.moveButton.setCategory(ButtonCategory.CUSTOM_LAYOUT);
        this.moveButton.setName('Move');
        this.moveButton.allStates(Bitmaps.ImgMove);
        this.moveButton.tooltip('Move a nucleotide or stem by Ctrl-Shift-Click');
        this._gameButtons.set('Move', this.moveButton);
        this._bottomButtons.set(
            'Move',
            new ToolbarButton()
                .setCategory(ButtonCategory.CUSTOM_LAYOUT)
                .setName('Move')
                .allStates(Bitmaps.ImgMove)
                .tooltip('Move a nucleotide or stem by Ctrl-Shift-Click')
        );
        this.moveButton.display.buttonMode = true;
        this.moveButton.display.interactive = true;

        this.rotateStemButton = new ToolbarButton();
        this.rotateStemButton.setCategory(ButtonCategory.CUSTOM_LAYOUT);
        this.rotateStemButton.setName('Rotate stem');
        this.rotateStemButton.allStates(Bitmaps.ImgRotateStem);
        this.rotateStemButton.tooltip('Rotate stem clockwise 1/4 turn by Ctrl-Shift-Click');
        this._gameButtons.set('Rotate stem', this.rotateStemButton);
        this._bottomButtons.set(
            'Rotate stem',
            new ToolbarButton()
                .setCategory(ButtonCategory.CUSTOM_LAYOUT)
                .setName('Rotate stem')
                .allStates(Bitmaps.ImgRotateStem)
                .tooltip('Rotate stem clockwise 1/4 turn by Ctrl-Shift-Click')
        );
        this.rotateStemButton.display.buttonMode = true;
        this.rotateStemButton.display.interactive = true;

        this.flipStemButton = new ToolbarButton();
        this.flipStemButton.setCategory(ButtonCategory.CUSTOM_LAYOUT);
        this.flipStemButton.setName('Flip stem');
        this.flipStemButton.allStates(Bitmaps.ImgFlipStem);
        this.flipStemButton.tooltip('Flip stem by Ctrl-Shift-Click');
        this._gameButtons.set('Flip stem', this.flipStemButton);
        this._bottomButtons.set(
            'Flip stem',
            new ToolbarButton()
                .setCategory(ButtonCategory.CUSTOM_LAYOUT)
                .setName('Flip stem')
                .allStates(Bitmaps.ImgFlipStem)
                .tooltip('Flip stem by Ctrl-Shift-Click')
        );
        this.flipStemButton.display.buttonMode = true;
        this.flipStemButton.display.interactive = true;

        this.snapToGridButton = new ToolbarButton();
        this.snapToGridButton.setCategory(ButtonCategory.CUSTOM_LAYOUT);
        this.snapToGridButton.setName('Snap to grid');
        this.snapToGridButton.allStates(Bitmaps.ImgSnapToGrid);
        this.snapToGridButton.tooltip('Snap current layout to a grid');
        this._gameButtons.set('Snap to grid', this.snapToGridButton);
        this._bottomButtons.set(
            'Snap to grid',
            new ToolbarButton()
                .setCategory(ButtonCategory.CUSTOM_LAYOUT)
                .setName('Snap to grid')
                .allStates(Bitmaps.ImgSnapToGrid)
                .tooltip('Snap current layout to a grid')
        );
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
        this.baseMarkerButton = new ToolbarButton();
        this.baseMarkerButton.setCategory(ButtonCategory.ANNOTATE);
        this.baseMarkerButton.setName('Base marker');
        this.baseMarkerButton.allStates(Bitmaps.ImgBaseMarker);
        this.baseMarkerButton.tooltip('Mark bases (hold ctrl)');
        this._gameButtons.set('Base marker', this.baseMarkerButton);
        this.baseMarkerButton.display.interactive = true;
        this._bottomButtons.set(
            'Base marker',
            new ToolbarButton()
                .setCategory(ButtonCategory.ANNOTATE)
                .setName('Base marker')
                .allStates(Bitmaps.ImgBaseMarker)
                .tooltip('Mark bases (hold ctrl)')
        );

        this.annotationModeButton = new ToolbarButton();
        this.annotationModeButton.setCategory(ButtonCategory.ANNOTATE);
        this.annotationModeButton.setName('Annotation mode');
        this.annotationModeButton.allStates(Bitmaps.ImgAnnotationMode);
        this.annotationModeButton.tooltip('Annotation Mode');
        this._gameButtons.set('Annotation mode', this.annotationModeButton);
        this.annotationModeButton.display.interactive = true;
        this._bottomButtons.set(
            'Annotation mode',
            new ToolbarButton()
                .setCategory(ButtonCategory.ANNOTATE)
                .setName('Annotation mode')
                .allStates(Bitmaps.ImgAnnotationMode)
                .tooltip('Annotation Mode')
        );

        this.annotationPanelButton = new ToolbarButton();
        this.annotationPanelButton.setCategory(ButtonCategory.ANNOTATE);
        this.annotationPanelButton.setName('Annotation panel');
        this.annotationPanelButton.allStates(Bitmaps.ImgAnnotationPanel);
        this.annotationPanelButton.selected(Bitmaps.ImgAnnotationPanel);
        this.annotationPanelButton.tooltip('Annotations Panel');
        this._gameButtons.set('Annotation panel', this.annotationPanelButton);
        this.annotationPanelButton.display.interactive = true;
        this._bottomButtons.set(
            'Annotation panel',
            new ToolbarButton()
                .setCategory(ButtonCategory.ANNOTATE)
                .setName('Annotation panel')
                .allStates(Bitmaps.ImgAnnotationPanel)
                .selected(Bitmaps.ImgAnnotationPanel)
                .tooltip('Annotations Panel')
        );
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
                this.getMirrorButton(this.baseMarkerButton).toggled.value = true;
            })
        );

        if (this._annotationManager) {
            this.annotationPanel = new AnnotationPanel(
                this.annotationPanelButton,
                this._annotationManager
            );
            this.addObject(this.annotationPanel, this.mode?.container);

            this.pushButtonToCategory(this.annotationModeButton);
            this.pushButtonToCategory(this.annotationPanelButton);

            this.regs.add(
                this.annotationModeButton.clicked.connect(() => {
                    this._deselectAllPaintTools();
                    this.annotationModeButton.toggled.value = true;
                    this.getMirrorButton(
                        this.annotationModeButton
                    ).toggled.value = true;

                    Assert.assertIsDefined(this._annotationManager);
                    // this._annotationManager.setAnnotationMode(true);
                })
            );

            this.regs.add(
                this._annotationManager.viewAnnotationDataUpdated.connect(
                    () => {
                        // this.annotationPanel.updatePanel();
                    }
                )
            );
        }
    }

    private makeTargetButtons() {
        this.naturalButton = new ToolbarButton();
        this.naturalButton.setName('naturalButton');
        this.naturalButton.allStates(Bitmaps.ImgNatural);
        this.naturalButton.selected(Bitmaps.ImgNatural);
        this.naturalButton.tooltip('Natural Mode. RNA folds into the most stable shape.');
        this.naturalButton.rscriptID(RScriptUIElementID.TOGGLENATURAL);

        this.estimateButton = new ToolbarButton();
        this.estimateButton.setName('estimateButton');
        this.estimateButton.allStates(Bitmaps.ImgEstimate);
        this.estimateButton.selected(Bitmaps.ImgEstimate);
        this.estimateButton.tooltip(
            'Estimate Mode. The game approximates how the RNA actually folded in a test tube.'
        );

        this.targetButton = new ToolbarButton();
        this.targetButton.setName('targetButton');
        this.targetButton.allStates(Bitmaps.ImgTarget);
        this.targetButton.selected(Bitmaps.ImgTarget);
        this.targetButton.tooltip('Target Mode. RNA freezes into the desired shape.');
        this.targetButton.rscriptID(RScriptUIElementID.TOGGLETARGET);
    }

    private makeFeedbackLayout() {
        this.letterColorButton = new ToolbarButton();
        this.letterColorButton.setCategory(ButtonCategory.VIEW);
        this.letterColorButton.setName('Letter color');
        this.letterColorButton.allStates(Bitmaps.ImgLetterColor);
        this.letterColorButton.selected(Bitmaps.ImgLetterColor);
        this.letterColorButton.tooltip('Color sequences based on base colors as in the game.');
        this._gameButtons.set('Letter color', this.letterColorButton);
        this._bottomButtons.set(
            'Letter color',
            new ToolbarButton()
                .setCategory(ButtonCategory.VIEW)
                .setName('Letter color')
                .allStates(Bitmaps.ImgLetterColor)
                .selected(Bitmaps.ImgLetterColor)
                .tooltip('Color sequences based on base colors as in the game.')
        );

        this.expColorButton = new ToolbarButton();
        this.expColorButton.setCategory(ButtonCategory.VIEW);
        this.expColorButton.setName('Exp color');
        this.expColorButton.allStates(Bitmaps.ImgExpColor);
        this.expColorButton.selected(Bitmaps.ImgExpColor);
        this.expColorButton.tooltip('Color sequences based on experimental data.');
        this._gameButtons.set('Exp color', this.expColorButton);
        this._bottomButtons.set(
            'Exp color',
            new ToolbarButton()
                .setCategory(ButtonCategory.VIEW)
                .setName('Exp color')
                .allStates(Bitmaps.ImgExpColor)
                .selected(Bitmaps.ImgExpColor)
                .tooltip('Color sequences based on experimental data.')
        );

        if (this._type === ToolbarType.FEEDBACK) {
            this.letterColorButton.toggled.value = false;
            this.getMirrorButton(this.letterColorButton).toggled.value = false;
            this.addObject(
                this.letterColorButton,
                this.middleScrollContainer.content
            );

            this.expColorButton.toggled.value = true;
            this.getMirrorButton(this.expColorButton).toggled.value = false;
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
            leftBts.push(this.getMirrorButton(this.viewSolutionsButton));
            leftBts.push(this.getMirrorButton(this.submitButton));

            leftButtonNames.push(this.viewSolutionsButton.name as string);
            leftButtonNames.push(this.submitButton.name as string);
        } else if (this._type === ToolbarType.PUZZLE) {
            // add code
        }
        leftBts.push(this.getMirrorButton(this.settingsButton));
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
            rightBts.push(this.getMirrorButton(this.pairSwapButton));
            rightButtonNames.push(this.pairSwapButton.name as string);
        }
        rightBts.push(this.getMirrorButton(this.undoButton));
        rightBts.push(this.getMirrorButton(this.redoButton));
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

        const topToolbarSettings: TopBarSetting[] = [];
        if (Eterna.settings.topToolbarSettings.value !== null) {
            Eterna.settings.topToolbarSettings.value.forEach((v) => {
                topToolbarSettings.push(v);
            });
        }
        topToolbarSettings.push({
            type: this._type,
            left: leftButtonNames,
            right: rightButtonNames
        });
        Eterna.settings.topToolbarSettings.value = topToolbarSettings;
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
        const topToolbarSettings: TopBarSetting[] = [];
        if (Eterna.settings.topToolbarSettings.value !== null) {
            Eterna.settings.topToolbarSettings.value.forEach((v) => {
                if (v.type !== this._type) topToolbarSettings.push(v);
            });
        }
        topToolbarSettings.push({
            type: this._type,
            left: leftButtonNames,
            right: rightButtonNames
        });
        Eterna.settings.topToolbarSettings.value = topToolbarSettings;
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
                    topToolbarSettings.forEach((s) => {
                        if (s.type === this._type) {
                            s.left.forEach((name) => {
                                leftBts.push(
                                    this.getMirrorButton(
                                        this._gameButtons.get(name) as ToolbarButton
                                    )
                                );
                            });
                            s.right.forEach((name) => {
                                rightBts.push(
                                    this.getMirrorButton(
                                        this._gameButtons.get(name) as ToolbarButton
                                    )
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
                    });
                } catch {
                    this._topButtons.clear();
                }
                if (this._topButtons.size === 0) {
                    this.initializeTopButtons();
                }
            }

            this.addObject(
                this.leftButtonsGroup,
                this.topScrollContainer.content
            );

            if (this._boostersData != null) {
                this.boostersMenuButton = new ToolbarButton();
                this.boostersMenuButton.setCategory(ButtonCategory.SOLVE);
                this.boostersMenuButton.setName('BoosterMenu');
                this.boostersMenuButton.allStates(Bitmaps.ImgBoosters);
                this.boostersMenuButton.tooltip('BoosterMenu');
                this.boostersMenuButton.disabled(undefined);
                this._gameButtons.set('BoosterMenu', this.boostersMenuButton);
                this._bottomButtons.set(
                    'BoosterMenu',
                    new ToolbarButton()
                        .setCategory(ButtonCategory.SOLVE)
                        .setName('BoosterMenu')
                        .allStates(Bitmaps.ImgBoosters)
                        .tooltip('BoosterMenu')
                );
                this.boostersMenuButton.display.interactive = true;
                this.pushButtonToCategory(this.boostersMenuButton);

                this.boostersMenuButton.clicked.connect(() => {
                    if (this._boostersData != null && this._boostersData.actions != null) {
                        const mode = this.mode as PoseEditMode;
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

            this.addObject(this.palette, this.topScrollContainer.content);
            this.palette.changeDefaultMode();

            this.addObject(
                this.rightButtonsGroup,
                this.topScrollContainer.content
            );

            this.leftButtonsGroup._content.interactive = true;
            this.leftButtonsGroup._content.on(
                'pointerup',
                (e: InteractionEvent) => {
                    this.onDragEnd(e);
                }
            );
            this.leftButtonsGroup._content.on(
                'pointerupoutside',
                (e: InteractionEvent) => {
                    this.onDragEnd(e);
                }
            );
            this.leftButtonsGroup._content.on('pointermove', (e) => {
                this.onDragMove(e);
            });
            this.leftButtonsGroup._content.on(
                'pointerdown',
                (e: InteractionEvent) => {
                    this.onDragStart(e);
                }
            );

            this.rightButtonsGroup._content.interactive = true;
            this.rightButtonsGroup._content.on(
                'pointerup',
                (e: InteractionEvent) => {
                    this.onDragEnd(e);
                }
            );
            this.rightButtonsGroup._content.on(
                'pointerupoutside',
                (e: InteractionEvent) => {
                    this.onDragEnd(e);
                }
            );
            this.rightButtonsGroup._content.on('pointermove', (e) => {
                this.onDragMove(e);
            });
            this.rightButtonsGroup._content.on(
                'pointerdown',
                (e: InteractionEvent) => {
                    this.onDragStart(e);
                }
            );
        }
    }

    private resizeToolbar() {
        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);

        TOOLBAR_WIDTH = Math.min(780, Flashbang.stageWidth * 0.8);
        MIDDLE_WIDTH = TOOLBAR_WIDTH
            - this._scrollPrevButton.display.width
            - this._scrollNextButton.display.width;

        this.background
            .clear()
            .beginFill(EDIT_BACKCOLOR, 1)
            .drawRect(0, 0, TOOLBAR_WIDTH, 223)
            .drawRoundedRect(0, -5, TOOLBAR_WIDTH, 10, 7)
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

        const topSpace = MIDDLE_WIDTH - palWidth - 2 * TOP_HSPACE;
        let buttonCount = Math.floor(topSpace / BUTTON_WIDTH);
        if (buttonCount < 6) buttonCount = 6;

        this.rightButtonsGroup._capability = Math.floor(buttonCount / 2);
        this.leftButtonsGroup._capability = buttonCount - this.rightButtonsGroup._capability;

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

        this.handlers.updateScriptViews();

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
        // For some reason there's a 2px margin on either side of our UI elements baked in... because.
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

        TOOLBAR_WIDTH = Math.min(980, Flashbang.stageWidth * 0.8);
        MIDDLE_WIDTH = TOOLBAR_WIDTH
            - this._scrollPrevButton.display.width
            - this._scrollNextButton.display.width;

        this.background = new Graphics()
            .beginFill(EDIT_BACKCOLOR, 1)
            .drawRect(0, 0, TOOLBAR_WIDTH, 223)
            .drawRoundedRect(0, -5, TOOLBAR_WIDTH, 10, 7)
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
        this.makeTargetButtons();

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

        this.makeTabs();
        this.stateToggle = new ToggleBar(this._states);

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
        this._setupToolbarDrag();

        this.lowerVContainer.addChild(this._tabsHContainer);

        this.makeTopLayout();

        this._currentTab.enable();
        this._renderButtonsWithNewCategory(this._currentTab.category);

        this.onResized();
        this._toggleButtonsInteractive(true);
    }

    private _updateAvailableButtonsContainer(): void {
        let offset = 0;
        for (const child of this.middleScrollContainer.content.children) {
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

            this.addObject(button, this.middleScrollContainer.content);
            const mirrorButton = this.getMirrorButton(button);
            this.addObject(mirrorButton, this.middleScrollContainer.content);
            this.regs.add(
                mirrorButton.clicked.connect(() => {
                    button.clicked.emit();
                })
            );
            buttons.push(button);
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
        topButtons: Map<string, GameButton>,
        endButtonBounds: Rectangle,
        startPointContainer: Container,
        draggingElement: DisplayObject,
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
            this.container.removeChild(draggingElement);
            if (startPointContainer === this.middleScrollContainer.content) {
                const name = this.getDragName(
                    draggingElement,
                    this._bottomButtons
                );
                if (name) {
                    const bt = this._bottomButtons.get(name);
                    if (bt) {
                        this._bottomButtons.delete(name);
                        topButtons.set(name, bt);
                    }
                    startPointContainer.removeChild(draggingElement);
                }
            } else {
                Assert.isTrue(
                    anotherButtonGroup._content === startPointContainer
                );
                let name = null;
                let button: ToolbarButton | null = null;
                // let category:ButtonCategory | null = null;
                this._topButtons.forEach((bt, key) => {
                    if (bt.display === draggingElement) {
                        name = key;
                        button = bt;
                        // category = bt.category;
                    }
                });
                if (name && button) {
                    anotherButtonGroup.removeButton(button);
                }
            }
            endButtonGroup.addButtonAt(draggingElement, underButtonInfo.pos);
        } else if (underButtonInfo.insertPos) {
            return false;
        } else if (startPointContainer === anotherButtonGroup._content) {
            const replacedButton = endButtonGroup.removeButtonAt(
                underButtonInfo.pos
            );
            this.container.removeChild(draggingElement);
            anotherButtonGroup.addButtonAt(
                replacedButton,
                this._draggingElementIndex
            );
            endButtonGroup.addButtonAt(draggingElement, underButtonInfo.pos);
        } else {
            const replacedButton = endButtonGroup.removeButtonAt(
                underButtonInfo.pos
            );
            this.container.removeChild(draggingElement);

            endButtonGroup.addButtonAt(draggingElement, underButtonInfo.pos);
            const name = this.getDragName(draggingElement, this._bottomButtons);
            if (name) {
                const bt = this._bottomButtons.get(name);
                if (bt) {
                    topButtons.set(name, bt);
                    this._bottomButtons.delete(name);
                }
                startPointContainer.removeChild(draggingElement);
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

        this._draggingElement = null;

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
                        this._draggingElement = foundButton.display;
                        this._draggingElement.visible = true;
                        this._draggingElement.position.copyFrom(e.target);
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
                        this._draggingElement = foundButton.display;
                        this._draggingElement.visible = true;
                        this._draggingElement.position.copyFrom(e.target);
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
                        this._draggingElement = foundButton.display;
                        this._draggingElement.visible = true;
                        // this._draggingElement.interactive = false;
                        this.middleScrollContainer.content.addChild(
                            this._draggingElement
                        );
                        this._draggingElement.position.copyFrom(e.target); // kkk
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
                    this._draggingElement.visible = false;
                }
                this._startPointContainer.addChildAt(
                    this._draggingElement,
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
            this.container.removeChild(this._draggingElement);
            if (
                this._startPointContainer === this.middleScrollContainer.content
            ) {
                this._draggingElement.visible = false;
            }
            this._startPointContainer.addChildAt(
                this._draggingElement,
                this._draggingElementIndex
            );
            this._toggleButtonsInteractive(true);
            this._isDisabled = false;
            this.resetDragState();
            return;
        }

        if (leftButtonsBounds.contains(e.data.global.x, e.data.global.y)) {
            if (this.leftButtonsGroup._content === this._startPointContainer) {
                this.container.removeChild(this._draggingElement);
                this.leftButtonsGroup._content.addChildAt(
                    this._draggingElement,
                    this._draggingElementIndex
                );
                this.leftButtonsGroup.resizeContainer();

                this.resetDragState();
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
                this.container.removeChild(this._draggingElement);
                if (
                    this._startPointContainer
                    === this.middleScrollContainer.content
                ) {
                    this._draggingElement.visible = false;
                }
                this._startPointContainer.addChildAt(
                    this._draggingElement,
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
                this.container.removeChild(this._draggingElement);
                this.rightButtonsGroup._content.addChildAt(
                    this._draggingElement,
                    this._draggingElementIndex
                );
                this.rightButtonsGroup.resizeContainer();

                this.resetDragState();
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
                this.container.removeChild(this._draggingElement);
                if (
                    this._startPointContainer
                    === this.middleScrollContainer.content
                ) {
                    this._draggingElement.visible = false;
                }
                this._startPointContainer.addChildAt(
                    this._draggingElement,
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
                this.container.removeChild(this._draggingElement);
                this._draggingElement.visible = false;
                // this._scrollContainer.content.addChild(this._draggingElement);
                this.resetDragState();
                this.updateLayout();
                this._toggleButtonsInteractive(true);
                this._isDisabled = false;
                return;
            }

            this.container.removeChild(this._draggingElement);
            this._draggingElement.visible = false;
            if (this._startPointContainer === this.rightButtonsGroup._content) {
                let name = null;
                let button: ToolbarButton | null = null;
                let category: ButtonCategory | null = null;
                this._topButtons.forEach((bt, key) => {
                    if (bt.display === this._draggingElement) {
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
                        this._draggingElement
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
                    if (bt.display === this._draggingElement) {
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
                        this._draggingElement
                    );

                    this.switchTab(category);
                }
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
        } else {
            // add code
        }

        this._updateAvailableButtonsContainer();
        this._toggleButtonsInteractive(true);
        this._isDisabled = false;
        // this._draggingElement.interactive = true;
        this._draggingElement = null;
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

        if (leftButtonsBounds.contains(x, y)) {
            if (this.leftButtonsGroup._content === this._startPointContainer) {
                return;
            }
            endButtonGroup = this.leftButtonsGroup;
            endButtonBounds = leftButtonsBounds;
        } else if (rightButtonsBounds.contains(x, y)) {
            if (this.rightButtonsGroup._content === this._startPointContainer) {
                return;
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

            if (
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

            this._startPointContainer.removeChild(this._draggingElement); // kkk
            this.container.addChild(this._draggingElement);
            this._canDrag = true;
        }
        // this._draggingElement.interactive = false;
        if (this._isDragging && this._canDrag) {
            const pos = e.data.getLocalPosition(this._draggingElement.parent);
            const buttonBounds = this._draggingElement.getLocalBounds();
            const x = pos.x - Math.floor(buttonBounds.width / 2);
            const y = pos.y - Math.floor(buttonBounds.height / 2);
            this._draggingElement.position.set(x, y);
            this.checkDragElement(e.data.global.x, e.data.global.y);
        }
    }

    public getMirrorButton(bt: ToolbarButton): ToolbarButton {
        if (bt.name) {
            let b = this._bottomButtons.get(bt.name);
            if (b) return b as ToolbarButton;
            b = this._topButtons.get(bt.name);
            if (b) return b as ToolbarButton;
        }
        return new ToolbarButton();
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
            if (b) return b as ToolbarButton;
        }
        return undefined;
    }

    private collapse() {
        this._isExpanded = false;
        this.collapseButton.container.visible = false;
        this.expandButton.container.visible = true;
        // this._tabsHContainer.visible = false;

        this.removeNamedObjects('animation');
        this.addNamedObject(
            'animation',
            new ParallelTask(
                // new LocationTask(0, 0, 3, Easing.easeOut, this.lowerHLayout),
                // new AlphaTask(0, 3, Easing.easeOut, this.middle),
                new VisibleTask(false, this.middleHLayout),
                // new AlphaTask(0, 3, Easing.easeOut, this.text),
                new VisibleTask(false, this.textHLayout),
                new VisibleTask(false, this._tabsHContainer),
                // new AlphaTask(0, 3, Easing.easeOut, this.backgroundContainerBackgroundContainer),
                new VisibleTask(false, this.background)
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
        // this._tabsHContainer.visible = true;
        // DisplayUtil.positionRelative(
        //     this.collapseButton.container,
        //     HAlign.CENTER,
        //     VAlign.BOTTOM,
        //     this.backgroundContainer,
        //     HAlign.CENTER,
        //     VAlign.BOTTOM,
        //     0,
        //     -10
        // );
        this.removeNamedObjects('animation');
        this.addNamedObject(
            'animation',
            new SerialTask(
                new ParallelTask(
                    // new LocationTask(0, 0, 3, Easing.easeOut, this.lowerHLayout),
                    new VisibleTask(true, this.middleHLayout),
                    new VisibleTask(true, this.textHLayout),
                    new VisibleTask(true, this._tabsHContainer),
                    new VisibleTask(true, this.background)
                )
            )
        );

        this.leftButtonsGroup.changeMode(true);
        this.rightButtonsGroup.changeMode(true);
        this.updateLayout();
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
        bt.disabled(undefined);
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
        // maxScrollX being greater than 0 indicates that scrolling is possible and some content is covered up
        // Alpha is used here since we don't want to shift the scrollcontainer around the screen
        // when the arrows get shown/hidden - reserve some space for them!
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
        if (this.zoomInButton) {
            this.zoomInButton.enabled = !disable;
        }
        if (this.zoomOutButton) {
            this.zoomOutButton.enabled = !disable;
        }
        this.pipButton.enabled = !disable;
        this.stateToggle.enabled = !disable;

        this.targetButton.enabled = !disable;

        this.palette.enabled = !disable;
        this.pairSwapButton.enabled = !disable;

        this.naturalButton.enabled = !disable;

        this.undoButton.enabled = !disable;
        this.redoButton.enabled = !disable;

        this.baseMarkerButton.enabled = !disable;

        if (this.annotationModeButton) this.annotationModeButton.enabled = !disable;
        if (this.annotationPanelButton) this.annotationPanelButton.enabled = !disable;

        this.freezeButton.enabled = !disable;

        if (this.boostersMenuButton) this.boostersMenuButton.enabled = !disable;

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

        this.getMirrorButton(this.pairSwapButton).toggled.value = false;
        this.getMirrorButton(this.addBaseButton).toggled.value = false;
        this.getMirrorButton(this.addPairButton).toggled.value = false;
        this.getMirrorButton(this.deleteButton).toggled.value = false;
        this.getMirrorButton(this.lockButton).toggled.value = false;
        this.getMirrorButton(this.moleculeButton).toggled.value = false;
        this.getMirrorButton(this.magicGlueButton).toggled.value = false;
        this.getMirrorButton(this.baseMarkerButton).toggled.value = false;
        this.getMirrorButton(this.librarySelectionButton).toggled.value = false;

        for (const button of this.dynPaintTools) {
            button.toggled.value = false;
        }

        this.annotationModeButton.toggled.value = false;
        this.getMirrorButton(this.annotationModeButton).toggled.value = false;
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

    private _gameButtons: Map<string, ToolbarButton> = new Map();
    private _bottomButtons: Map<string, GameButton> = new Map();
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

    private _draggingElement: DisplayObject | null;
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

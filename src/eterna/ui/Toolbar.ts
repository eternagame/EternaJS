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
import {RegistrationGroup} from 'signals';
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
    GameObjectRef
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
import GameButton, {ButtonCategory} from './GameButton';
import ToggleBar from './ToggleBar';
import ScrollContainer from './ScrollContainer';
import AnnotationPanel from './AnnotationPanel';
import TextBalloon from './TextBalloon';
import BoosterDialog from './BoosterDialog';

export enum ToolbarType {
    PUZZLE,
    PUZZLEMAKER,
    PUZZLEMAKER_EMBEDDED,
    LAB,
    FEEDBACK,
}

const MIDDLE_BACKCOLOR = 0x043468;
const LINE_COLOR = 0x3397db;
const EDIT_BACKCOLOR = 0x21508c;

const TOP_HSPACE = 4;
const EMPTY_SIZE = 1;
const APPROX_ITEM_COUNT = 13;
const APPROX_ITEM_HEIGHT = 52;
const TAB_WIDTH = 60;
const TAB_HEIGHT = 20;
let TOOLBAR_WIDTH = 666;
let MIDDLE_WIDTH = TOOLBAR_WIDTH - 30 * 2;
const BUTTON_WIDTH = 55;
const tabGap = 2;

class ToolbarButton extends GameButton {
    protected added() {
        super.added();
        this._arrow = new Sprite(
            BitmapManager.getBitmap(Bitmaps.ImgToolbarArrow)
        );
        this._arrow.position.x = (this.container.width - this._arrow.width) / 2;
        this._arrow.visible = false;
        this.container.addChild(this._arrow);

        this.toggled.connectNotify((toggled) => {
            this._arrow.visible = toggled;
        });
    }

    private _arrow: Sprite;
}
export interface TopBarSetting {
    type: number;
    left: string[];
    right: string[];
}

export class ButtonsGroup extends ContainerObject {
    public _content: HLayoutContainer;
    private _background: Graphics;
    private _buttons: GameButton[];
    private _editMode: boolean = false;
    public topTooltip: TextBalloon;
    // private toolbar: Toolbar;
    public _cursor: Graphics;
    public _highlight: Graphics;
    public _capability: number;

    constructor(buttons: GameButton[]) {
        super();
        // this.toolbar = toolbar;
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
    public zoomInButton: GameButton;
    public zoomOutButton: GameButton;
    public pipButton: GameButton;
    public stateToggle: ToggleBar;

    public targetButton: GameButton;
    public naturalButton: GameButton;

    public screenshotButton: GameButton;

    public specButton: GameButton;
    public _contextMenuDialogRef: GameObjectRef = GameObjectRef.NULL;

    public settingsButton: GameButton;
    public futureFeatureButton: GameButton;

    public lowerHLayout: HLayoutContainer;
    public scrollContainer: ScrollContainer;
    public scrollContainerContainer: HLayoutContainer;

    public leftArrow: GameButton;
    public rightArrow: GameButton;

    // Pose Editing
    public palette: NucleotidePalette;
    public pairSwapButton: GameButton;
    public baseShiftButton: GameButton;

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

    public get position() {
        return new Point(this.vContent.x, this.vContent.y);
    }

    // Puzzle Maker
    public addBaseButton: GameButton;
    public addPairButton: GameButton;
    public deleteButton: GameButton;
    public lockButton: GameButton;
    public moleculeButton: GameButton;
    public validate3DButton: GameButton;

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
    public boosterButtonsGroup: ButtonsGroup;

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
        tabContainer.on('click', () => {
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
        tabContainer.on('tap', () => {
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

        this.tabsScrollContainer = new ScrollContainer(
            MIDDLE_WIDTH,
            TAB_HEIGHT
        );
        this.tabsBg = new Graphics()
            .beginFill(MIDDLE_BACKCOLOR)
            .drawRect(0, 0, MIDDLE_WIDTH, TAB_HEIGHT)
            .endFill();
        this.tabsScrollContainer.content.addChild(this.tabsBg);
        this.tabsBg.visible = false;

        this.tabsHContainer = new HLayoutContainer(2);
        this.addObject(this.tabsScrollContainer, this.tabsHContainer);

        this.tabsHContainer.visible = false;

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

        this.tabsScrollContainer.addObject(
            new ContainerObject(tab0.container),
            this.tabsScrollContainer.content
        );
        this.tabsScrollContainer.addObject(
            new ContainerObject(tab1.container),
            this.tabsScrollContainer.content
        );
        this.tabsScrollContainer.addObject(
            new ContainerObject(tab2.container),
            this.tabsScrollContainer.content
        );
        this.tabsScrollContainer.addObject(
            new ContainerObject(tab3.container),
            this.tabsScrollContainer.content
        );
        this.tabsScrollContainer.addObject(
            new ContainerObject(tab4.container),
            this.tabsScrollContainer.content
        );
        this.tabsScrollContainer.addObject(
            new ContainerObject(tab5.container),
            this.tabsScrollContainer.content
        );
        this.tabsScrollContainer.addObject(
            new ContainerObject(tab6.container),
            this.tabsScrollContainer.content
        );
        let offset = 0;
        for (const child of this.tabsScrollContainer.content.children) {
            if (!child.visible) continue;
            const bounds = child.getLocalBounds();
            child.x = offset;
            child.y = 0;
            offset += bounds.width + tabGap;
        }
        this.tabsScrollContainer.doLayout();
        this.tabsScrollContainer.content.interactive = true;
        let downed = false;
        let downX = 0;
        this.tabsScrollContainer.content.on(
            'pointerdown',
            (e: InteractionEvent) => {
                downed = true;
                downX = e.data.global.x;
            }
        );
        this.tabsScrollContainer.content.on(
            'pointermove',
            (e: InteractionEvent) => {
                if (downed) {
                    const dx = downX - e.data.global.x;
                    const dW = totalWidth
                        - this.tabsScrollContainer.scrollX
                        - MIDDLE_WIDTH;
                    if (totalWidth > MIDDLE_WIDTH && dW - dx > 0) {
                        this.tabsScrollContainer.scrollX += dx;
                    }
                    downX = e.data.global.x;
                }
            }
        );
        this.tabsScrollContainer.content.on('pointerup', () => {
            downed = false;
        });
        this.tabsScrollContainer.content.on('pointerupoutside', () => {
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
        for (const child of this.tabsScrollContainer.content.children) {
            if (!child.visible) continue;
            const bounds = child.getLocalBounds();
            child.x = offset;
            child.y = 0;
            offset += bounds.width + tabGap;
        }
        this.tabsScrollContainer.doLayout();
    }

    private makeInfoButtons() {
        this.submitButton = new GameButton()
            .allStates(Bitmaps.smallImgSubmit)
            // .tooltip('Submit')
            .setCategory(ButtonCategory.INFO)
            .setName('Submit');
        this.gameButtons.set('Submit', this.submitButton);
        this.bottomButtons.set(
            'Submit',
            new GameButton()
                .allStates(Bitmaps.smallImgSubmit)
                // .tooltip('Submit')
                .setCategory(ButtonCategory.INFO)
                .setName('Submit')
        );

        this.viewSolutionsButton = new ToolbarButton()
            .allStates(Bitmaps.smallImgViewSolutions)
            .disabled(undefined)
            .tooltip('View all submitted designs for this puzzle.')
            .setCategory(ButtonCategory.INFO)
            .setName('Solutions');
        this.gameButtons.set('Solutions', this.viewSolutionsButton);
        this.bottomButtons.set(
            'Solutions',
            new ToolbarButton()
                .allStates(Bitmaps.smallImgViewSolutions)
                .disabled(undefined)
                // .tooltip('View all submitted designs for this puzzle.')
                .setCategory(ButtonCategory.INFO)
                .setName('Solutions')
        );

        this.specButton = new ToolbarButton()
            .allStates(Bitmaps.smallImgSpec)
            .disabled(undefined)
            // .tooltip("View RNA's melting point, dotplot and other specs (S)")
            .hotkey(KeyCode.KeyS)
            .setCategory(ButtonCategory.INFO)
            .setName('Spec');
        this.gameButtons.set('Spec', this.specButton);
        this.bottomButtons.set(
            'Spec',
            new ToolbarButton()
                .allStates(Bitmaps.smallImgSpec)
                .disabled(undefined)
                // .tooltip("View RNA's melting point, dotplot and other specs (S)")
                .setCategory(ButtonCategory.INFO)
                .setName('Spec')
        );

        this.settingsButton = new ToolbarButton()
            .allStates(Bitmaps.smallImgSettings)
            // .tooltip('Game options')
            .setCategory(ButtonCategory.INFO)
            .setName('Settings');
        this.gameButtons.set('Settings', this.settingsButton);
        this.bottomButtons.set(
            'Settings',
            new ToolbarButton()
                .allStates(Bitmaps.smallImgSettings)
                // .tooltip('Game options')
                .setCategory(ButtonCategory.INFO)
                .setName('Settings')
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
            // this.submitButton.tooltip('Publish your solution!');
            // this.getMirrorButton(this.submitButton).tooltip('Publish your solution!');
            this.pushButtonToCategory(this.submitButton);
        } else if (this._type === ToolbarType.PUZZLEMAKER) {
            // this.submitButton.tooltip('Publish your puzzle!');
            // this.getMirrorButton(this.submitButton).tooltip('Publish your puzzle!');
            this.pushButtonToCategory(this.submitButton);
        }

        this.pushButtonToCategory(this.settingsButton);
    }

    private makeCreateButtons() {
        this.addBaseButton = new ToolbarButton()
            .allStates(Bitmaps.smallImgAddBase)
            .hotkey(KeyCode.Digit6)
            // .tooltip('Add a single base.')
            .setCategory(ButtonCategory.CREATE)
            .setName('Add base');
        this.gameButtons.set('Add base', this.addBaseButton);
        this.bottomButtons.set(
            'Add base',
            new GameButton()
                .allStates(Bitmaps.smallImgAddBase)
                // .tooltip('Add a single base.')
                .setCategory(ButtonCategory.CREATE)
                .setName('Add base')
        );

        this.addPairButton = new ToolbarButton()
            .allStates(Bitmaps.smallImgAddPair)
            .hotkey(KeyCode.Digit7)
            // .tooltip('Add a pair.')
            .setCategory(ButtonCategory.CREATE)
            .setName('Add pair');
        this.gameButtons.set('Add pair', this.addPairButton);
        this.bottomButtons.set(
            'Add pair',
            new ToolbarButton()
                .allStates(Bitmaps.smallImgAddPair)
                // .tooltip('Add a pair.')
                .setCategory(ButtonCategory.CREATE)
                .setName('Add pair')
        );

        this.deleteButton = new ToolbarButton()
            .allStates(Bitmaps.smallImgDelete)
            .hotkey(KeyCode.Digit8)
            // .tooltip('Delete a base or a pair.')
            .setCategory(ButtonCategory.CREATE)
            .setName('Delete');
        this.gameButtons.set('Delete', this.deleteButton);
        this.bottomButtons.set(
            'Delete',
            new ToolbarButton()
                .allStates(Bitmaps.smallImgDelete)
                // .tooltip('Delete a base or a pair.')
                .setCategory(ButtonCategory.CREATE)
                .setName('Delete')
        );

        this.lockButton = new ToolbarButton()
            .allStates(Bitmaps.smallImgLock)
            .hotkey(KeyCode.Digit9)
            // .tooltip('Lock or unlock a base.')
            .setCategory(ButtonCategory.CREATE)
            .setName('Lock');
        this.gameButtons.set('Lock', this.lockButton);
        this.bottomButtons.set(
            'Lock',
            new ToolbarButton()
                .allStates(Bitmaps.smallImgLock)
                // .tooltip('Lock or unlock a base.')
                .setCategory(ButtonCategory.CREATE)
                .setName('Lock')
        );

        this.moleculeButton = new ToolbarButton()
            .allStates(Bitmaps.smallImgMolecule)
            .hotkey(KeyCode.Digit0)
            // .tooltip('Create or remove a molecular binding site.')
            .setCategory(ButtonCategory.CREATE)
            .setName('Molecule');
        this.gameButtons.set('Molecule', this.moleculeButton);
        this.bottomButtons.set(
            'Molecule',
            new ToolbarButton()
                .allStates(Bitmaps.smallImgMolecule)
                // .tooltip('Create or remove a molecular binding site.')
                .setCategory(ButtonCategory.CREATE)
                .setName('Molecule')
        );

        this.validate3DButton = new ToolbarButton()
            .allStates(Bitmaps.smallImgValidate3D)
            // .tooltip('Validate 3D Models')
            .setCategory(ButtonCategory.CREATE)
            .setName('Open 3D');
        this.gameButtons.set('Open 3D', this.validate3DButton);
        this.bottomButtons.set(
            'Open 3D',
            new ToolbarButton()
                .allStates(Bitmaps.smallImgValidate3D)
                // .tooltip('Validate 3D Models')
                .setCategory(ButtonCategory.CREATE)
                .setName('Open 3D')
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
        this.resetButton = new ToolbarButton()
            .allStates(Bitmaps.smallImgReset)
            // .tooltip(resetTooltip)
            .rscriptID(RScriptUIElementID.RESET)
            .setCategory(ButtonCategory.SOLVE)
            .setName('Reset');
        this.gameButtons.set('Reset', this.resetButton);
        this.bottomButtons.set(
            'Reset',
            new ToolbarButton()
                .allStates(Bitmaps.smallImgReset)
                // .tooltip(resetTooltip)
                .rscriptID(RScriptUIElementID.RESET)
                .setCategory(ButtonCategory.SOLVE)
                .setName('Reset')
        );

        this.freezeButton = new ToolbarButton()
            .allStates(Bitmaps.smallImgFreeze)
            // .tooltip('Frozen mode. Suspends/resumes folding engine calculations. (F)')
            .hotkey(KeyCode.KeyF)
            .rscriptID(RScriptUIElementID.FREEZE)
            .setCategory(ButtonCategory.SOLVE)
            .setName('Freeze');
        this.gameButtons.set('Freeze', this.freezeButton);
        this.bottomButtons.set(
            'Freeze',
            new ToolbarButton()
                .allStates(Bitmaps.smallImgFreeze)
                // .tooltip('Frozen mode. Suspends/resumes folding engine calculations. (F)')
                .rscriptID(RScriptUIElementID.FREEZE)
                .setCategory(ButtonCategory.SOLVE)
                .setName('Freeze')
        );

        this.baseShiftButton = new ToolbarButton()
            .allStates(Bitmaps.smallImgBaseShift)
            // .tooltip('Base shift')
            .setCategory(ButtonCategory.SOLVE)
            .setName('Shift base');
        this.gameButtons.set('Shift base', this.baseShiftButton);
        this.bottomButtons.set(
            'Shift base',
            new ToolbarButton()
                .allStates(Bitmaps.smallImgBaseShift)
                // .tooltip('Base shift')
                .setCategory(ButtonCategory.SOLVE)
                .setName('Shift base')
        );

        this.pairSwapButton = new ToolbarButton()
            .allStates(Bitmaps.smallImgPairSwap)
            // .tooltip('Swap paired bases. (5)')
            .rscriptID(RScriptUIElementID.SWAP)
            .setCategory(ButtonCategory.SOLVE)
            .setName('Swap pair');
        this.gameButtons.set('Swap pair', this.pairSwapButton);
        this.pairSwapButton.clicked.connect(
            this.handlers.pairSwapButtonHandler
        );
        this.bottomButtons.set(
            'Swap pair',
            new ToolbarButton()
                .allStates(Bitmaps.smallImgPairSwap)
                // .tooltip('Swap paired bases. (5)')
                .rscriptID(RScriptUIElementID.SWAP)
                .setCategory(ButtonCategory.SOLVE)
                .setName('Swap pair')
        );

        this.undoButton = new GameButton()
            .allStates(Bitmaps.smallImgUndo)
            // .tooltip('Undo')
            .hotkey(KeyCode.KeyZ)
            .rscriptID(RScriptUIElementID.UNDO)
            .setCategory(ButtonCategory.SOLVE)
            .setName('Undo');
        this.gameButtons.set('Undo', this.undoButton);
        this.bottomButtons.set(
            'Undo',
            new GameButton()
                .allStates(Bitmaps.smallImgUndo)
                // .tooltip('Undo')
                .setCategory(ButtonCategory.SOLVE)
                .setName('Undo')
        );

        this.redoButton = new GameButton()
            .allStates(Bitmaps.smallImgRedo)
            // .tooltip('Redo')
            .hotkey(KeyCode.KeyY)
            .rscriptID(RScriptUIElementID.REDO)
            .setCategory(ButtonCategory.SOLVE)
            .setName('Redo');
        this.gameButtons.set('Redo', this.redoButton);
        this.bottomButtons.set(
            'Redo',
            new GameButton()
                .allStates(Bitmaps.smallImgRedo)
                // .tooltip('Redo')
                .setCategory(ButtonCategory.SOLVE)
                .setName('Redo')
        );

        this.librarySelectionButton = new ToolbarButton()
            .allStates(Bitmaps.smallImgLibrarySelection)
            // .tooltip('Select bases to randomize')
            .setCategory(ButtonCategory.SOLVE)
            .setName('Select lib');
        this.gameButtons.set('Select lib', this.librarySelectionButton);
        this.bottomButtons.set(
            'Select lib',
            new ToolbarButton()
                .allStates(Bitmaps.smallImgLibrarySelection)
                // .tooltip('Select bases to randomize')
                .setCategory(ButtonCategory.SOLVE)
                .setName('Select lib')
        );

        this.magicGlueButton = new ToolbarButton()
            .allStates(Bitmaps.smallImgMagicGlue)
            // .tooltip('Magic glue - change target structure in purple areas (Hold Alt)')
            .setCategory(ButtonCategory.SOLVE)
            .setName('Magic glue');
        this.gameButtons.set('Magic glue', this.magicGlueButton);
        this.magicGlueButton.display.interactive = true;
        this.bottomButtons.set(
            'Magic glue',
            new ToolbarButton()
                .allStates(Bitmaps.smallImgMagicGlue)
                // .tooltip('Magic glue - change target structure in purple areas (Hold Alt)')
                .setCategory(ButtonCategory.SOLVE)
                .setName('Magic glue')
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
        this.copyButton = new GameButton()
            .allStates(Bitmaps.smallImgCopy)
            // .tooltip('Copy the current sequence')
            .setCategory(ButtonCategory.IMPORT_EXPORT)
            .setName('Copy');
        this.gameButtons.set('Copy', this.copyButton);
        this.bottomButtons.set(
            'Copy',
            new GameButton()
                .allStates(Bitmaps.smallImgCopy)
                // .tooltip('Copy the current sequence')
                .setCategory(ButtonCategory.IMPORT_EXPORT)
                .setName('Copy')
        );

        this.pasteButton = new GameButton()
            .allStates(Bitmaps.smallImgPaste)
            // .tooltip('Type in a sequence')
            .setCategory(ButtonCategory.IMPORT_EXPORT)
            .setName('Paste');
        this.gameButtons.set('Paste', this.pasteButton);
        this.bottomButtons.set(
            'Paste',
            new GameButton()
                .allStates(Bitmaps.smallImgPaste)
                // .tooltip('Type in a sequence')
                .setCategory(ButtonCategory.IMPORT_EXPORT)
                .setName('Paste')
        );

        this.downloadHKWSButton = new GameButton()
            .allStates(Bitmaps.smallImgDownloadHKWS)
            // .tooltip('Download a draw_rna input file for the current layout')
            .setCategory(ButtonCategory.IMPORT_EXPORT)
            .setName('Download HKWS');
        this.gameButtons.set('Download HKWS', this.downloadHKWSButton);
        this.bottomButtons.set(
            'Download HKWS',
            new GameButton()
                .allStates(Bitmaps.smallImgDownloadHKWS)
                // .tooltip('Download a draw_rna input file for the current layout')
                .setCategory(ButtonCategory.IMPORT_EXPORT)
                .setName('Download HKWS')
        );
        this.downloadHKWSButton.display.buttonMode = true;
        this.downloadHKWSButton.display.interactive = true;

        this.downloadSVGButton = new GameButton()
            .allStates(Bitmaps.smallImgDownloadSVG)
            // .tooltip('Download an SVG of the current RNA layout')
            .setCategory(ButtonCategory.IMPORT_EXPORT)
            .setName('Download SVG');
        this.gameButtons.set('Download SVG', this.downloadSVGButton);
        this.bottomButtons.set(
            'Download SVG',
            new GameButton()
                .allStates(Bitmaps.smallImgDownloadSVG)
                // .tooltip('Download an SVG of the current RNA layout')
                .setCategory(ButtonCategory.IMPORT_EXPORT)
                .setName('Download SVG')
        );
        // this.downloadSVGButton.display.buttonMode = true;
        // this.downloadSVGButton.display.interactive = true;

        this.screenshotButton = new ToolbarButton()
            .allStates(Bitmaps.smallImgScreenshot)
            // .tooltip('Screenshot')
            .disabled(undefined)
            .setCategory(ButtonCategory.IMPORT_EXPORT)
            .setName('Screenshot');
        this.gameButtons.set('Screenshot', this.screenshotButton);
        this.bottomButtons.set(
            'Screenshot',
            new ToolbarButton()
                .allStates(Bitmaps.smallImgScreenshot)
                // .tooltip('Screenshot')
                .disabled(undefined)
                .setCategory(ButtonCategory.IMPORT_EXPORT)
                .setName('Screenshot')
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
        this.nucleotideFindButton = new ToolbarButton()
            .allStates(Bitmaps.smallImgNucleotideFind)
            .disabled()
            // .tooltip('Type a nucleotide index to put it in the center of the screen (J)')
            .hotkey(KeyCode.KeyJ)
            .setCategory(ButtonCategory.VIEW)
            .setName('Find');
        this.gameButtons.set('Find', this.nucleotideFindButton);
        this.bottomButtons.set(
            'Find',
            new ToolbarButton()
                .allStates(Bitmaps.smallImgNucleotideFind)
                .disabled()
                // .tooltip('Type a nucleotide index to put it in the center of the screen (J)')
                .setCategory(ButtonCategory.VIEW)
                .setName('Find')
        );

        this.nucleotideRangeButton = new ToolbarButton()
            .allStates(Bitmaps.smallImgNucleotideRange)
            .disabled()
            // .tooltip('Enter a nucleotide range to view (V)')
            .hotkey(KeyCode.KeyV)
            .setCategory(ButtonCategory.VIEW)
            .setName('Range');
        this.gameButtons.set('Range', this.nucleotideRangeButton);
        this.bottomButtons.set(
            'Range',
            new ToolbarButton()
                .allStates(Bitmaps.smallImgNucleotideRange)
                .disabled()
                // .tooltip('Enter a nucleotide range to view (V)')
                .setCategory(ButtonCategory.VIEW)
                .setName('Range')
        );

        this.explosionFactorButton = new ToolbarButton()
            .allStates(Bitmaps.smallImgExplosionFactor)
            .disabled()
            // .tooltip('Set explosion factor ([, ])')
            .setCategory(ButtonCategory.VIEW)
            .setName('Explosion factor');
        this.gameButtons.set('Explosion factor', this.explosionFactorButton);
        this.bottomButtons.set(
            'Explosion factor',
            new ToolbarButton()
                .allStates(Bitmaps.smallImgExplosionFactor)
                .disabled()
                // .tooltip('Set explosion factor ([, ])')
                .setCategory(ButtonCategory.VIEW)
                .setName('Explosion factor')
        );

        this.pipButton = new ToolbarButton()
            .allStates(Bitmaps.smallImgPip)
            // .tooltip('Set PiP mode (P)')
            .hotkey(KeyCode.KeyP)
            .rscriptID(RScriptUIElementID.PIP)
            .setCategory(ButtonCategory.VIEW)
            .setName('PiP');
        this.gameButtons.set('PiP', this.pipButton);
        this.bottomButtons.set(
            'PiP',
            new ToolbarButton()
                .allStates(Bitmaps.smallImgPip)
                // .tooltip('Set PiP mode (P)')
                .setCategory(ButtonCategory.VIEW)
                .setName('PiP')
        );

        this.zoomInButton = new GameButton()
            .allStates(Bitmaps.smallImgZoomIn)
            .disabled(Bitmaps.ImgZoomInDisable)
            // .tooltip('Zoom in (=)')
            .hotkey(KeyCode.Equal)
            .rscriptID(RScriptUIElementID.ZOOMIN)
            .setCategory(ButtonCategory.VIEW)
            .setName('Zoom in');
        this.gameButtons.set('Zoom in', this.zoomInButton);
        this.bottomButtons.set(
            'Zoom in',
            new GameButton()
                .allStates(Bitmaps.smallImgZoomIn)
                .disabled(Bitmaps.ImgZoomInDisable)
                // .tooltip('Zoom in (=)')
                .setCategory(ButtonCategory.VIEW)
                .setName('Zoom in')
        );

        this.zoomOutButton = new GameButton()
            .allStates(Bitmaps.smallImgZoomOut)
            .disabled(Bitmaps.ImgZoomOutDisable)
            // .tooltip('Zoom out (-)')
            .hotkey(KeyCode.Minus)
            .rscriptID(RScriptUIElementID.ZOOMOUT)
            .setCategory(ButtonCategory.VIEW)
            .setName('Zoom out');
        this.gameButtons.set('Zoom out', this.zoomOutButton);
        this.bottomButtons.set(
            'Zoom out',
            new GameButton()
                .allStates(Bitmaps.smallImgZoomOut)
                .disabled(Bitmaps.ImgZoomOutDisable)
                // .tooltip('Zoom out (-)')
                .setCategory(ButtonCategory.VIEW)
                .setName('Zoom out')
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
        this.moveButton = new GameButton()
            .allStates(Bitmaps.smallImgMove)
            // .tooltip('Move a nucleotide or stem by Ctrl-Shift-Click')
            .setCategory(ButtonCategory.CUSTOM_LAYOUT)
            .setName('Move');
        this.gameButtons.set('Move', this.moveButton);
        this.bottomButtons.set(
            'Move',
            new GameButton()
                .allStates(Bitmaps.smallImgMove)
                // .tooltip('Move a nucleotide or stem by Ctrl-Shift-Click')
                .setCategory(ButtonCategory.CUSTOM_LAYOUT)
                .setName('Move')
        );
        this.moveButton.display.buttonMode = true;
        this.moveButton.display.interactive = true;

        this.rotateStemButton = new GameButton()
            .allStates(Bitmaps.smallImgRotateStem)
            // .tooltip('Rotate stem clockwise 1/4 turn by Ctrl-Shift-Click')
            .setCategory(ButtonCategory.CUSTOM_LAYOUT)
            .setName('Rotate stem');
        this.gameButtons.set('Rotate stem', this.rotateStemButton);
        this.bottomButtons.set(
            'Rotate stem',
            new GameButton()
                .allStates(Bitmaps.smallImgRotateStem)
                // .tooltip('Rotate stem clockwise 1/4 turn by Ctrl-Shift-Click')
                .setCategory(ButtonCategory.CUSTOM_LAYOUT)
                .setName('Rotate stem')
        );
        this.rotateStemButton.display.buttonMode = true;
        this.rotateStemButton.display.interactive = true;

        this.flipStemButton = new GameButton()
            .allStates(Bitmaps.smallImgFlipStem)
            // .tooltip('Flip stem by Ctrl-Shift-Click')
            .setCategory(ButtonCategory.CUSTOM_LAYOUT)
            .setName('Flip stem');
        this.gameButtons.set('Flip stem', this.flipStemButton);
        this.bottomButtons.set(
            'Flip stem',
            new GameButton()
                .allStates(Bitmaps.smallImgFlipStem)
                // .tooltip('Flip stem by Ctrl-Shift-Click')
                .setCategory(ButtonCategory.CUSTOM_LAYOUT)
                .setName('Flip stem')
        );
        this.flipStemButton.display.buttonMode = true;
        this.flipStemButton.display.interactive = true;

        this.snapToGridButton = new GameButton()
            .allStates(Bitmaps.smallImgSnapToGrid)
            // .tooltip('Snap current layout to a grid')
            .setCategory(ButtonCategory.CUSTOM_LAYOUT)
            .setName('Snap to grid');
        this.gameButtons.set('Snap to grid', this.snapToGridButton);
        this.bottomButtons.set(
            'Snap to grid',
            new GameButton()
                .allStates(Bitmaps.smallImgSnapToGrid)
                // .tooltip('Snap current layout to a grid')
                .setCategory(ButtonCategory.CUSTOM_LAYOUT)
                .setName('Snap to grid')
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
        this.baseMarkerButton = new ToolbarButton()
            .allStates(Bitmaps.smallImgBaseMarker)
            // .tooltip('Mark bases (hold ctrl)')
            .setCategory(ButtonCategory.ANNOTATE)
            .setName('Base marker');
        this.gameButtons.set('Base marker', this.baseMarkerButton);
        this.baseMarkerButton.display.interactive = true;
        this.bottomButtons.set(
            'Base marker',
            new ToolbarButton()
                .allStates(Bitmaps.smallImgBaseMarker)
                // .tooltip('Mark bases (hold ctrl)')
                .setCategory(ButtonCategory.ANNOTATE)
                .setName('Base marker')
        );

        this.annotationModeButton = new ToolbarButton()
            .allStates(Bitmaps.smallImgAnnotationMode)
            // .tooltip('Annotation Mode')
            .setCategory(ButtonCategory.ANNOTATE)
            .setName('Annotation mode');
        this.gameButtons.set('Annotation mode', this.annotationModeButton);
        this.annotationModeButton.display.interactive = true;
        this.bottomButtons.set(
            'Annotation mode',
            new ToolbarButton()
                .allStates(Bitmaps.smallImgAnnotationMode)
                // .tooltip('Annotation Mode')
                .setCategory(ButtonCategory.ANNOTATE)
                .setName('Annotation mode')
        );

        this.annotationPanelButton = new ToolbarButton()
            .allStates(Bitmaps.smallImgAnnotationPanel)
            .selected(Bitmaps.smallImgAnnotationPanel)
            // .tooltip('Annotations Panel')
            .setCategory(ButtonCategory.ANNOTATE)
            .setName('Annotation panel');
        this.gameButtons.set('Annotation panel', this.annotationPanelButton);
        this.annotationPanelButton.display.interactive = true;
        this.bottomButtons.set(
            'Annotation panel',
            new ToolbarButton()
                .allStates(Bitmaps.smallImgAnnotationPanel)
                .selected(Bitmaps.smallImgAnnotationPanel)
                // .tooltip('Annotations Panel')
                .setCategory(ButtonCategory.ANNOTATE)
                .setName('Annotation panel')
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
        this.naturalButton = new ToolbarButton()
            .allStates(Bitmaps.smallImgNatural)
            .selected(Bitmaps.smallImgNatural)
            // .tooltip('Natural Mode. RNA folds into the most stable shape.')
            .rscriptID(RScriptUIElementID.TOGGLENATURAL)
            .setName('naturalButton');

        this.estimateButton = new ToolbarButton()
            .allStates(Bitmaps.smallImgEstimate)
            .selected(Bitmaps.smallImgEstimate)
            // .tooltip(
            //     'Estimate Mode. The game approximates how the RNA actually folded in a test tube.'
            // )
            .setName('estimateButton');

        this.targetButton = new ToolbarButton()
            .allStates(Bitmaps.smallImgTarget)
            .selected(Bitmaps.smallImgTarget)
            // .tooltip('Target Mode. RNA freezes into the desired shape.')
            .rscriptID(RScriptUIElementID.TOGGLETARGET)
            .setName('targetButton');
    }

    private makeFeedbackLayout() {
        this.letterColorButton = new ToolbarButton()
            .allStates(Bitmaps.smallImgLetterColor)
            .selected(Bitmaps.smallImgLetterColor)
            // .tooltip('Color sequences based on base colors as in the game.')
            .setName('Letter color');
        this.gameButtons.set('Letter color', this.letterColorButton);
        this.bottomButtons.set(
            'Letter color',
            new ToolbarButton()
                .allStates(Bitmaps.smallImgLetterColor)
                .selected(Bitmaps.smallImgLetterColor)
                // .tooltip('Color sequences based on base colors as in the game.')
                .setName('Letter color')
        );

        this.expColorButton = new ToolbarButton()
            .allStates(Bitmaps.smallImgExpColor)
            .selected(Bitmaps.smallImgExpColor)
            // .tooltip('Color sequences based on experimental data.')
            .setName('Exp color');
        this.gameButtons.set('Exp color', this.expColorButton);
        this.bottomButtons.set(
            'Exp color',
            new ToolbarButton()
                .allStates(Bitmaps.smallImgExpColor)
                .selected(Bitmaps.smallImgExpColor)
                // .tooltip('Color sequences based on experimental data.')
                .setName('Exp color')
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
        const leftBts: GameButton[] = [];
        const rightBts: GameButton[] = [];

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
                this.bottomButtons.delete(b.name);
                this.topButtons.set(b.name, b);
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
                this.bottomButtons.delete(b.name);
                this.topButtons.set(b.name, b);
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

        this.futureFeatureButton = new ToolbarButton()
            .allStates(Bitmaps.FutureFeature)
            // .tooltip('Something')
            .disabled(undefined)
            .setName('futureFeatureButton');

        if (this._type !== ToolbarType.FEEDBACK) {
            const topToolbarSettings = Eterna.settings.topToolbarSettings.value;
            if (topToolbarSettings === null) {
                this.initializeTopButtons();
            } else {
                try {
                    const leftBts: GameButton[] = [];
                    const rightBts: GameButton[] = [];
                    topToolbarSettings.forEach((s) => {
                        if (s.type === this._type) {
                            s.left.forEach((name) => {
                                leftBts.push(
                                    this.getMirrorButton(
                                        this.gameButtons.get(name) as GameButton
                                    )
                                );
                            });
                            s.right.forEach((name) => {
                                rightBts.push(
                                    this.getMirrorButton(
                                        this.gameButtons.get(name) as GameButton
                                    )
                                );
                            });
                            leftBts.forEach((b) => {
                                if (b.name) {
                                    b.display.visible = true;
                                    this.bottomButtons.delete(b.name);
                                    this.topButtons.set(b.name, b);
                                }
                            });
                            this.leftButtonsGroup = new ButtonsGroup(leftBts);
                            rightBts.forEach((b) => {
                                if (b.name) {
                                    b.display.visible = true;
                                    this.bottomButtons.delete(b.name);
                                    this.topButtons.set(b.name, b);
                                }
                            });
                            this.rightButtonsGroup = new ButtonsGroup(rightBts);
                        }
                    });
                } catch {
                    this.topButtons.clear();
                }
                if (this.topButtons.size === 0) {
                    this.initializeTopButtons();
                }
            }

            this.addObject(
                this.leftButtonsGroup,
                this.topScrollContainer.content
            );

            const boosterBts: GameButton[] = [];
            if (this._boostersData != null) {
                this.boostersMenu = new ToolbarButton()
                    .allStates(Bitmaps.smallImgBoosters)
                    .setCategory(ButtonCategory.SOLVE)
                    .setName('BoosterMenu')
                    .disabled(undefined);
                this.bottomButtons.set(
                    'BoosterMenu',
                    new ToolbarButton()
                        .allStates(Bitmaps.smallImgBoosters)
                    // .tooltip('Game options')
                        .setCategory(ButtonCategory.SOLVE)
                        .setName('BoosterMenu')
                );

                this.gameButtons.set('BoosterMenu', this.boostersMenu);
                boosterBts.push(this.getMirrorButton(this.boostersMenu));
                this.boostersMenu.display.interactive = true;
                this.pushButtonToCategory(this.boostersMenu);

                this.boostersMenu.clicked.connect(() => {
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
                            const button: GameButton = booster.createButton();
                            button.setName(`BoosterPainting-${button.label}`)
                                .setCategory(ButtonCategory.SOLVE);
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
            this.boosterButtonsGroup = new ButtonsGroup(boosterBts);
            if (this.boosterButtonsGroup.buttons.length > 0) {
                this.addObject(
                    this.boosterButtonsGroup,
                    this.topScrollContainer.content
                );
                this.boosterButtonsGroup._content.interactive = true;
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

        TOOLBAR_WIDTH = Math.min(980, Flashbang.stageWidth * 0.8);
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
        this.tabsScrollContainer.setSize(MIDDLE_WIDTH, TAB_HEIGHT);
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
            let button: GameButton | null = null;
            let category: ButtonCategory | null = null;
            this.topButtons.forEach((bt, key) => {
                if (bt.display === element) {
                    name = key;
                    button = bt;
                    category = bt.category;
                }
            });
            if (name && button && category) {
                this.topButtons.delete(name);
                this.bottomButtons.set(name, button);
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
            let button: GameButton | null = null;
            let category: ButtonCategory | null = null;
            this.topButtons.forEach((bt, key) => {
                if (bt.display === element) {
                    name = key;
                    button = bt;
                    category = bt.category;
                }
            });
            if (name && button && category) {
                this.topButtons.delete(name);
                this.bottomButtons.set(name, button);
                this.rightButtonsGroup.removeButton(button);
                element.visible = false;
                this.middleScrollContainer.content.addChild(element);
                this.rightButtonsGroup.resizeContainer();
            }
        }

        const leftWidth = this.leftButtonsGroup.display.width;
        const rightWidth = this.rightButtonsGroup.display.width;
        const boosterWidth = this.boosterButtonsGroup.buttons.length > 0 ? this.boosterButtonsGroup.display.width : 0;

        const topWidth = leftWidth + TOP_HSPACE + palWidth + TOP_HSPACE
        + (boosterWidth > 0 ? (boosterWidth + TOP_HSPACE) : 0) + rightWidth;

        if (topWidth > MIDDLE_WIDTH) {
            this._scrollTopPrevButton.display.visible = true;
            this._scrollTopNextButton.display.visible = true;

            let x = 0;
            this.leftButtonsGroup.display.position.x = x;
            this.leftButtonsGroup.display.position.y = 1;
            x += leftWidth + TOP_HSPACE;

            if (boosterWidth > 0) {
                this.boosterButtonsGroup.display.position.x = x;
                this.boosterButtonsGroup.display.position.y = 1;
                x += boosterWidth + TOP_HSPACE;
            }

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

            if (boosterWidth > 0) {
                this.boosterButtonsGroup.display.position.x = x;
                this.boosterButtonsGroup.display.position.y = 1;
                x += boosterWidth + TOP_HSPACE;
            }

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

        // lowerToolbarLayout isn't a child of another LayoutContainer (since we have the ScrollContainer)
        // so we'll need to play some games to make sure both are updated when their sizes change

        this.topScrollContainer.doLayout();
        this.tabsScrollContainer.doLayout();
        this.middleScrollContainer.doLayout();
        this.textScrollContainer.doLayout();
        this.lowerVContainer.layout(true);
        this.lowerHLayout.layout(true);
        this.vContent.layout(true);

        this.middleHLayout.position.y += 30;
        this.textScrollContainer.display.position.y += 30;

        this.updateArrowVisibility();
        this.updateTopContainer();

        DisplayUtil.positionRelative(
            this.vContent,
            HAlign.CENTER,
            VAlign.BOTTOM,
            this.invisibleBackground,
            HAlign.CENTER,
            VAlign.BOTTOM
        );

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
            this.tabsHContainer,
            HAlign.LEFT,
            VAlign.TOP,
            this.middleScrollContainer.content,
            HAlign.LEFT,
            VAlign.TOP,
            0,
            -20
        );

        this.handlers.updateScriptViews();
    }

    private makeLayout() {
        // For some reason there's a 2px margin on either side of our UI elements baked in... because.
        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);
        const APPROX_ITEM_WIDTH = APPROX_ITEM_HEIGHT + 2 * 2;
        const SPACE_WIDE = Math.min(
            Flashbang.stageWidth / APPROX_ITEM_COUNT - APPROX_ITEM_WIDTH,
            13
        );
        const SPACE_NARROW = SPACE_WIDE * 0.28;

        this.invisibleBackground = new Graphics();
        this.invisibleBackground
            .beginFill(0xff0000, 0)
            .drawRect(0, 0, Flashbang.stageWidth, 100)
            .endFill();
        this.invisibleBackground.y = -this.invisibleBackground.height;
        this.container.addChild(this.invisibleBackground);

        this.vContent = new VLayoutContainer(SPACE_NARROW);
        this.container.addChild(this.vContent);

        // UPPER TOOLBAR (structure editing tools)
        // kkk
        const upperToolbarLayout = new HLayoutContainer(SPACE_NARROW);
        if (
            this._type === ToolbarType.PUZZLEMAKER
            || this._type === ToolbarType.PUZZLEMAKER_EMBEDDED
        ) {
            this.vContent.addChild(upperToolbarLayout);
        }

        // LOWER TOOLBAR (palette, zoom, settings, etc)
        this.lowerHLayout = new HLayoutContainer(0, VAlign.BOTTOM);
        this.backgroundContainer = new Container();

        this._scrollPrevButton = new ToolbarButton()
            .allStates(Bitmaps.PrevArrow)
            .setName('scrollPrevButton');
        this._scrollNextButton = new ToolbarButton()
            .allStates(Bitmaps.NextArrow)
            .setName('scrollNextButton');

        this._scrollTopPrevButton = new ToolbarButton()
            .allStates(Bitmaps.PrevArrow)
            .setName('scrollPrevButton');
        this._scrollTopNextButton = new ToolbarButton()
            .allStates(Bitmaps.NextArrow)
            .setName('scrollNextButton');

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
            this.tabsHContainer,
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
        this.vContent.addChild(this.scrollContainerContainer);

        this.scrollContainer = new ScrollContainer(
            Flashbang.stageWidth,
            Flashbang.stageHeight
        );
        this.scrollContainer.container.addChild(this.lowerHLayout);

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
        this.textScrollContainer.content.on(
            'pointerdown',
            (e: InteractionEvent) => {
                downed = true;
                downX = e.data.global.x;
            }
        );
        this.textScrollContainer.content.on(
            'pointermove',
            (e: InteractionEvent) => {
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
            }
        );
        this.textScrollContainer.content.on('pointerup', () => {
            downed = false;
        });
        this.textScrollContainer.content.on('pointerupoutside', () => {
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
        this.vContent.addChild(this._expandButtonContainer);
        this.expandButton = new GameButton()
            .allStates(Bitmaps.ImgExpandArrow)
            .setName('expandButton');
        this.addObject(this.expandButton, this._expandButtonContainer);

        this.collapseButton = new GameButton()
            .allStates(Bitmaps.ImgCollapseArrow)
            .setName('collapseButton');
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
                this.updateLayout();
            })
        );
        this.regs.add(
            this.collapseButton.clicked.connect(() => {
                if (!this._isExpanded) return;
                this.collapse();
                this.updateLayout();
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

    public getScriptUIElement(bt: GameButton, scriptID: RScriptUIElementID): RScriptUIElement {
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

    protected added(): void {
        super.added();

        // For some reason there's a 2px margin on either side of our UI elements baked in... because.
        this.makeTabs();
        this.stateToggle = new ToggleBar(this._states);

        // This can be used in both puzzlemaker and lab, so we'll create the base button ahead of time
        // TODO: Maybe these should really be two separate buttons set on different properties?
        this.makeLayout();

        /*
        The lower toolbar structure is a HLayoutContainer wrapped in ScrollContainer wrapped in another HLayoutContainer
        The arrows are in the outer HLayoutContainer, along with the ScrollContainer
        The actual toolbar content is in the innermost HLayoutContainer
        */

        this.leftArrow = this.makeArrowButton('left');
        this.addObject(this.leftArrow, this.scrollContainerContainer);

        this.addObject(this.scrollContainer, this.scrollContainerContainer);

        this.makeExpandControl();

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

        this._uncollapsedContentLoc = new Point(
            this.vContent.position.x,
            this.vContent.position.y
        );
        this.regs.add(
            Eterna.settings.autohideToolbar.connectNotify((value) => {
                this.setToolbarAutohide(value);
            })
        );
        this._setupToolbarDrag();

        this.lowerVContainer.addChild(this.tabsHContainer);

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

    private pushButtonToCategory(button: GameButton): void {
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
                    this.bottomButtons
                );
                if (name) {
                    const bt = this.bottomButtons.get(name);
                    if (bt) {
                        this.bottomButtons.delete(name);
                        topButtons.set(name, bt);
                    }
                    startPointContainer.removeChild(draggingElement);
                }
            } else {
                Assert.isTrue(
                    anotherButtonGroup._content === startPointContainer
                );
                let name = null;
                let button: GameButton | null = null;
                // let category:ButtonCategory | null = null;
                this.topButtons.forEach((bt, key) => {
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
            const name = this.getDragName(draggingElement, this.bottomButtons);
            if (name) {
                const bt = this.bottomButtons.get(name);
                if (bt) {
                    topButtons.set(name, bt);
                    this.bottomButtons.delete(name);
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
                        this.bottomButtons.set(replaceName, replaceBt);
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
                this.topButtons.forEach((bt, key) => {
                    if (bt.display === e.target) {
                        name = key;
                    }
                });
                if (name) {
                    const foundButton = this.topButtons.get(name);
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
                this.topButtons.forEach((bt, key) => {
                    if (bt.display === e.target) {
                        name = key;
                    }
                });
                if (name) {
                    const foundButton = this.topButtons.get(name);
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
                if (name && !name.includes('Booster')) {
                    const foundButton = this.bottomButtons.get(name);
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
                this.topButtons,
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
                this.topButtons,
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
                let button: GameButton | null = null;
                let category: ButtonCategory | null = null;
                this.topButtons.forEach((bt, key) => {
                    if (bt.display === this._draggingElement) {
                        name = key;
                        button = bt;
                        category = bt.category;
                    }
                });
                if (name && button && category) {
                    this.topButtons.delete(name);
                    this.bottomButtons.set(name, button);
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
                let button: GameButton | null = null;
                let category: ButtonCategory | null = null;
                this.topButtons.forEach((bt, key) => {
                    if (bt.display === this._draggingElement) {
                        name = key;
                        button = bt;
                        category = bt.category;
                    }
                });
                if (name && button && category) {
                    this.topButtons.delete(name);
                    this.bottomButtons.set(name, button);
                    this.leftButtonsGroup.removeButton(button);
                    this.middleScrollContainer.content.addChild(
                        this._draggingElement
                    );

                    this.switchTab(category);
                }
            }

            // this._scrollContainer.content.addChild(this._draggingElement)
            // if (this._currentTab.category === this._getButtonCategory(this._draggingElement)) {
            //     // this._scrollContainer.content.addChild(this._draggingElement);//kkk
            // }
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

    public getMirrorButton(bt: GameButton): GameButton {
        if (bt.name) {
            let b = this.bottomButtons.get(bt.name);
            if (b) return b;
            b = this.topButtons.get(bt.name);
            if (b) return b;
        }
        return new GameButton();
    }

    public getMirrorTopButton(bt: GameButton): GameButton | undefined {
        if (bt.name) {
            const b = this.topButtons.get(bt.name);
            if (b) return b;
        }
        return undefined;
    }

    public getMirrorBottomButton(bt: GameButton): GameButton | undefined {
        if (bt.name) {
            const b = this.bottomButtons.get(bt.name);
            if (b) return b;
        }
        return undefined;
    }

    private collapse() {
        this._isExpanded = false;
        this.collapseButton.container.visible = false;
        this.expandButton.container.visible = true;
        this.tabsHContainer.visible = false;

        this.removeNamedObjects('test');
        this.addNamedObject(
            'test',
            new ParallelTask(
                new LocationTask(0, 0, 3, Easing.easeOut, this.lowerHLayout),
                // new AlphaTask(0, 3, Easing.easeOut, this.middle),
                new VisibleTask(false, this.middleHLayout),
                // new AlphaTask(0, 3, Easing.easeOut, this.text),
                new VisibleTask(false, this.textHLayout),
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
        this.tabsHContainer.visible = true;
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
        this.removeNamedObjects('test');
        this.addNamedObject(
            'test',
            new ParallelTask(
                new LocationTask(0, 0, 3, Easing.easeOut, this.lowerHLayout),
                // new AlphaTask(1, 3, Easing.easeOut, this.middle),
                new VisibleTask(true, this.middleHLayout),
                // new AlphaTask(1, 3, Easing.easeOut, this.text),
                new VisibleTask(true, this.textHLayout),
                // new AlphaTask(1, 3, Easing.easeOut, this.backgroundContainerBackgroundContainer),
                new VisibleTask(true, this.background)
            )
        );

        this.leftButtonsGroup.changeMode(true);
        this.rightButtonsGroup.changeMode(true);
        this._updateAvailableButtonsContainer();
        this.updateLayout();
    }

    private makeArrowButton(direction: 'left' | 'right'): GameButton {
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

        return (
            new GameButton()
                .allStates(arrowContainer)
                .disabled(undefined)
                // .tooltip(`Scroll ${direction}`)
                .setName('arrowButton')
        );
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
                mouseDown = false;
            })
        );

        this.regs.add(
            this.scrollContainer.pointerUpOutside.connect(() => {
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
                        this.scrollContainer.scrollX = startingScroll - offset;
                    }
                }
            })
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
                            0.25,
                            Easing.easeOut,
                            this.vContent
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
                            0.25,
                            Easing.easeOut,
                            this.vContent
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
            this.vContent.position.copyFrom(this._uncollapsedContentLoc);
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

    private invisibleBackground: Graphics;
    private vContent: VLayoutContainer;

    public middleScrollContainer: ScrollContainer;

    private _tabs: Map<ButtonCategory, GameButton[]>;
    private tabsScrollContainer: ScrollContainer;
    private tabsHContainer: HLayoutContainer;
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

    private gameButtons: Map<string, GameButton> = new Map();
    private bottomButtons: Map<string, GameButton> = new Map();
    public topButtons: Map<string, GameButton> = new Map();

    private _expandButtonContainer: HLayoutContainer;

    private _uncollapsedContentLoc: Point;
    private _autoCollapseRegs: RegistrationGroup | null;

    private _isExpanded: boolean;
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

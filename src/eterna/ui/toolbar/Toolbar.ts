import AnnotationManager from 'eterna/AnnotationManager';
import Eterna from 'eterna/Eterna';
import GameMode from 'eterna/mode/GameMode';
import Booster from 'eterna/mode/PoseEdit/Booster';
import PoseEditMode from 'eterna/mode/PoseEdit/PoseEditMode';
import {BoostersData} from 'eterna/puzzle/Puzzle';
import Bitmaps from 'eterna/resources/Bitmaps';
import {RScriptUIElementID} from 'eterna/rscript/RScriptUIElement';
import Fonts from 'eterna/util/Fonts';
import {
    AlphaTask, Assert, CallbackTask, ContainerObject, Easing, Flashbang, HLayoutContainer,
    LocationTask, ObjectTask, ParallelTask, PointerCapture, SerialTask, Vector2
} from 'flashbang';
import {FontWeight} from 'flashbang/util/TextBuilder';
import log from 'loglevel';
import {
    Container, Graphics, Point, Text
} from 'pixi.js';
import {Connection, RegistrationGroup} from 'signals';
import {FederatedPointerEvent, FederatedWheelEvent} from '@pixi/events';
import AnnotationPanelDialog from '../AnnotationPanelDialog';
import BoosterDialog from '../BoosterDialog';
import GameButton from '../GameButton';
import {ToolTipPositioner} from '../help/HelpToolTip';
import NucleotidePalette from './NucleotidePalette';
import HotbarBay from './HotbarBay';
import ToolbarButton, {
    ButtonCategory, ToolbarParam
} from './ToolbarButton';
import {
    specButtonProps, viewSolutionsButtonProps, settingsButtonProps, submitSolutionButtonProps,
    submitPuzzleButtonProps, addBaseButtonProps, addPairButtonProps, deleteButtonProps, lockButtonProps,
    moleculeButtonProps, upload3DButtonProps, freezeButtonProps, pairSwapButtonProps, undoButtonProps,
    redoButtonProps, librarySelectionButtonProps, resetButtonProps, magicGlueButtonProps, copyButtonProps,
    pasteButtonProps, downloadSVGButtonProps, screenshotButtonProps, nucleotideFindButtonProps,
    nucleotideRangeButtonProps, explosionFactorButtonProps, pipButtonProps, zoomInButtonProps,
    zoomOutButtonProps, view3DButtonProps, moveButtonProps, rotateStemButtonProps, flipStemButtonProps,
    snapToGridButtonProps, baseMarkerButtonProps, annotationModeButtonProps, annotationPanelButtonProps,
    boostersMenuButtonProps
} from './ToolbarButtons';
import ToolShelf from './ToolShelf';

export enum ToolbarType {
    PUZZLE,
    PUZZLEMAKER,
    PUZZLEMAKER_EMBEDDED,
    LAB,
    FEEDBACK,
}

const HOTBAR_H_MARGIN = 4;
const CONTENT_PADDING = 10;
const CONTENT_V_MARGIN = 10;
const AUTOHIDE_AMOUNT_VISIBLE = 25;

export default class Toolbar extends ContainerObject {
    public palette: NucleotidePalette;

    // Info
    public viewSolutionsButton: ToolbarButton;
    public specButton: ToolbarButton;
    public submitButton: ToolbarButton;
    public settingsButton: ToolbarButton;

    // Create
    public addBaseButton: ToolbarButton;
    public addPairButton: ToolbarButton;
    public deleteButton: ToolbarButton;
    public lockButton: ToolbarButton;
    public moleculeButton: ToolbarButton;
    public upload3DButton: ToolbarButton;

    // Solve
    public freezeButton: ToolbarButton;
    public resetButton: ToolbarButton;
    public baseShiftButton: ToolbarButton;
    public pairSwapButton: ToolbarButton;
    public undoButton: ToolbarButton;
    public redoButton: ToolbarButton;
    public librarySelectionButton: ToolbarButton;
    public magicGlueButton: ToolbarButton;
    public boostersMenuButton: ToolbarButton;
    public dynPaintTools: ToolbarButton[] = [];

    // Import/Export
    public copyButton: ToolbarButton;
    public pasteButton: ToolbarButton;
    public downloadSVGButton: ToolbarButton;
    public screenshotButton: ToolbarButton;

    // View
    public nucleotideFindButton: ToolbarButton;
    public nucleotideRangeButton: ToolbarButton;
    public explosionFactorButton: ToolbarButton;
    public pipButton: ToolbarButton;
    public zoomInButton: ToolbarButton;
    public zoomOutButton: ToolbarButton;
    public view3DButton: ToolbarButton;

    // Custom Layout
    public moveButton: ToolbarButton;
    public rotateStemButton: ToolbarButton;
    public flipStemButton: ToolbarButton;
    public snapToGridButton: ToolbarButton;

    // Annotation
    public baseMarkerButton: ToolbarButton;
    public annotationModeButton: ToolbarButton;
    public annotationPanelButton: ToolbarButton;

    constructor(
        type: ToolbarType,
        {
            boosters,
            showGlue = false,
            showLibrarySelect = false,
            showPip = false,
            annotationManager
        }: {
            boosters?: BoostersData;
            showGlue?: boolean;
            showLibrarySelect?: boolean;
            showPip?: boolean;
            annotationManager?: AnnotationManager;
        }
    ) {
        super();
        this._type = type;
        this._showGlue = showGlue;
        this._showLibrarySelect = showLibrarySelect;
        this._showPip = showPip;
        this._boostersData = boosters ?? null;
        this._annotationManager = annotationManager;
        this.display.name = 'Toolbar';
    }

    protected added(): void {
        super.added();

        // We're going to instantiate bottom to top (decreasing y) because that's how we will be
        // laying out the vertical positions plus we want the hotbar to have the highest z-ordering.
        // Relative to the content container, the expand/collapse button will always be in the same
        // place, as will the help text and tool shelf (they will fade in/out behind the hotbar
        // depending on whether the toolbar is expanded, but will stay in the same location). The
        // hotbar is the only thing that actually moves, and the background is drawn around the entire content.
        // The entire toolbar is then positioned at the bottom of the stage (or below the bottom of the
        // stage, if autohide is enabled)

        // Also note that when collapsed, hidden elements are BOTH marked invisible and 0 alpha.
        // This is because the alpha is used for animating the display, but setting visible to false
        // ensures that these elements aren't taken into consideration for bounds checking, interactivity, etc.

        this._expandedBackground = new Graphics();
        this._expandedBackground.alpha = 0;
        this._expandedBackground.name = 'Expanded Background';
        this.container.addChild(this._expandedBackground);

        // All toolbar content, minus the background
        // Note that we're not using a VLayoutContainer because the open/close animation overlaps elements
        this._content = new Container();
        this.container.addChild(this._content);
        this._content.name = 'Content';

        let yPos = -CONTENT_PADDING;

        this._expandCollapseButton = new GameButton().allStates(Bitmaps.ImgExpandArrow);
        this.addObject(this._expandCollapseButton, this._content);
        this._expandCollapseButton.display.name = 'Expand/Collapse Button';
        yPos -= this._expandCollapseButton.display.height;
        this._expandCollapseButton.display.y = yPos;

        this._helpText = new Text(
            'Drag an icon to the right or left of the nucleotide pallette above\n'
            + 'to insert or replace an existing tool in the hotbar, or tap an icon to use it.',
            {
                fontSize: 14,
                fontFamily: Fonts.STDFONT,
                fill: 0xabc9d8,
                fontWeight: FontWeight.MEDIUM,
                align: 'center'
            }
        );
        this._content.addChild(this._helpText);
        this._helpText.name = 'Help Text';
        // Remember - distance from top of chevron to top of help text (the origin is the top left corner)
        yPos -= CONTENT_V_MARGIN;
        yPos -= this._helpText.height;
        this._helpText.y = yPos;
        this._helpText.alpha = 0;
        this._helpText.visible = false;

        this._toolShelf = new ToolShelf();
        this.addObject(this._toolShelf, this._content);
        this._toolShelf.display.name = 'Tool Shelf';
        yPos -= CONTENT_V_MARGIN;
        yPos -= this._toolShelf.display.height;
        this._toolShelf.display.y = yPos;
        this._toolShelf.display.visible = false;
        this._toolShelf.display.alpha = 0;

        // Hotbar
        this._hotbarLayout = new HLayoutContainer(HOTBAR_H_MARGIN);
        this._content.addChild(this._hotbarLayout);
        this._leftBay = new HotbarBay('left', this.getInitialTools().left);
        this.addObject(this._leftBay, this._hotbarLayout);
        this.palette = new NucleotidePalette();
        this.palette.enabled = this._type !== ToolbarType.FEEDBACK;
        this.addObject(this.palette, this._hotbarLayout);
        this._rightBay = new HotbarBay('right', this.getInitialTools().right);
        this.addObject(this._rightBay, this._hotbarLayout);
        // By default, the toolbar is collapsed, so the hotbar is right above the chevron
        this._hotbarLayout.y = this._expandCollapseButton.display.y
            - CONTENT_V_MARGIN
            - this._hotbarLayout.height;

        this.setupButtons();

        this.palette.targetClicked.connect(() => {
            this.changeActivePaintTool('palette');
        });

        this._expandCollapseButton.clicked.connect(() => {
            this._expanded = !this._expanded;
            this.toggleExpanded(this._expanded);
        });

        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mode.resized.connect(() => this.layout()));
        this.layout();

        // Do this AFTER initial layout in order to ensure the initial autohide animation has the
        // correct location
        this.regs.add(Eterna.settings.autohideToolbar.connectNotify((autohide) => {
            this.setToolbarAutohide(autohide);
        }));
    }

    private getInitialTools(): {left: string[]; right: string[];} {
        if (this._type === ToolbarType.PUZZLEMAKER) {
            if (Eterna.settings.puzzlemakerHotbarTools.value) return Eterna.settings.puzzlemakerHotbarTools.value;
            return {
                left: [
                    upload3DButtonProps.id,
                    moleculeButtonProps.id,
                    lockButtonProps.id,
                    addBaseButtonProps.id,
                    addPairButtonProps.id,
                    deleteButtonProps.id
                ],
                right: [
                    submitPuzzleButtonProps.id,
                    undoButtonProps.id,
                    redoButtonProps.id,
                    pairSwapButtonProps.id
                ]
            };
        } else {
            if (Eterna.settings.puzzleSolvingHotbarTools.value) return Eterna.settings.puzzleSolvingHotbarTools.value;
            return {
                left: [
                    resetButtonProps.id, // not present in ToolbarType.FEEDBACK
                    screenshotButtonProps.id,
                    settingsButtonProps.id,
                    boostersMenuButtonProps.id, // only present after labs are unlocked and not in ToolbarType.FEEDBACK
                    viewSolutionsButtonProps.id, // only present in ToolbarType.LAB and ToolbarType.FEEDBACK
                    submitSolutionButtonProps.id // only present in ToolbarType.LAB
                ],
                right: [
                    pairSwapButtonProps.id, // not present in ToolbarType.FEEDBACK
                    undoButtonProps.id, // not present in ToolbarType.FEEDBACK
                    redoButtonProps.id, // not present in ToolbarType.FEEDBACK
                    baseMarkerButtonProps.id,
                    magicGlueButtonProps.id // only present in puzzles with unconstrained regions
                ]
            };
        }
    }

    private layout() {
        this.drawExpandedBackground();
        const totalWidth = this._expandedBackground.width;
        const contentWidth = totalWidth - 2 * CONTENT_PADDING;
        const bayWidth = (
            contentWidth
            - 2 * HOTBAR_H_MARGIN
            - (this.palette.isLiveObject ? this.palette.width : 0)
        ) / 2;

        this._leftBay.targetWidth = bayWidth;
        this._rightBay.targetWidth = bayWidth;
        this._hotbarLayout.layout(true);
        this._toolShelf.width = Math.min(contentWidth, 575);
        // Ensure help text has a max scale of 1 and is scaled down equally on x and y
        this._helpText.scale.x = 1;
        if (this._helpText.width > contentWidth) {
            this._helpText.width = contentWidth;
            this._helpText.scale.y = this._helpText.scale.x;
        }
        // Position the hotbar layout such that the palette is centered
        this._hotbarLayout.x = (totalWidth / 2) - (this.palette.width / 2) - this.palette.display.x;
        // this._hotbarLayout.x = (totalWidth - this._hotbarLayout.width) / 2;
        // Center all the other things
        this._helpText.x = (totalWidth - this._helpText.width) / 2;
        this._toolShelf.display.x = (totalWidth - this._toolShelf.display.width) / 2;
        this._expandCollapseButton.display.x = (totalWidth - this._expandCollapseButton.display.width) / 2;

        this.repositionOnStage();
    }

    private repositionOnStage() {
        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);
        this.display.x = (Flashbang.stageWidth - this.display.width) / 2;
        // If we're in the middle of changing our autohide state, just skip to wherever we should be
        if (this._autohideTask && this._autohideTask.isLiveObject) this._autohideTask.destroySelf();
        // Note that because we position our UI elements on negative y, the y=0 of the toolbar winds
        // up being at the bottom
        this.display.y = this._hidden
            ? Flashbang.stageHeight + this.display.height - AUTOHIDE_AMOUNT_VISIBLE
            : Flashbang.stageHeight;
    }

    private drawExpandedBackground() {
        const RADIUS = 7;
        // Only the top is rounded, so we draw a regular rect on the bottom then an overlapping rounded rect on the top
        const totalHeight = this._content.height + CONTENT_PADDING * 2;

        Assert.assertIsDefined(Flashbang.stageWidth, 'Tried resizing toolbar after app has been stopped');
        const MIN_WIDTH = 600;
        const MAX_WIDTH = Flashbang.stageWidth - 100;
        const width = Math.min(MAX_WIDTH, Math.max(
            MIN_WIDTH,
            // The widest we'll go is however much space it takes to show all tools in the hotbar
            // (left bay, right bay, palette, the spaces between them, and the padding we add to the left and right)
            // Note that we double the max of the left and right bay because we always keep the palette centered, so
            // we allocate as much room as required for both sides to be balanced
            Math.max(this._leftBay.maxWidth, this._rightBay.maxWidth) * 2
            + (this.palette.isLiveObject ? this.palette.width : 0)
            + 2 * HOTBAR_H_MARGIN
            + 2 * CONTENT_PADDING
        ));

        this._expandedBackground
            .clear()
            .beginFill(0x21508c, 1)
            .drawRect(0, -(totalHeight - RADIUS), width, totalHeight - RADIUS)
            .drawRoundedRect(0, -totalHeight, width, RADIUS * 2, RADIUS)
            .endFill();
    }

    private toggleExpanded(expand: boolean) {
        // If we're already moving one way, stop so we can move the other way immediately
        if (this._expandCollapseTask && this._expandCollapseTask.isLiveObject) this._expandCollapseTask.destroySelf();

        // If we currently have an active autohide animation going, wait for it to complete, then try again
        if (this._autohideTask && this._autohideTask.isLiveObject) {
            this._autohideTask.destroyed.connect(() => {
                this.toggleExpanded(expand);
            }).once();
        } else {
            // For more info on how positioning is intended to work, see added()
            const ANIM_TIME = 0.3;
            if (expand) {
                this._expandCollapseButton.allStates(Bitmaps.ImgCollapseArrow);
                // Move the hotbar up and unhide the shelf/help text/background
                const targetY = this._toolShelf.display.y - CONTENT_V_MARGIN - this._hotbarLayout.height;
                this._toolShelf.display.visible = true;
                this._helpText.visible = true;
                this._leftBay.editable = true;
                this._rightBay.editable = true;
                this._expandCollapseTask = new ParallelTask(
                    new LocationTask(null, targetY, ANIM_TIME, null, this._hotbarLayout, () => {
                        this.drawExpandedBackground();
                        // We've grown and our origin is the top-left hand corner, so we need move
                        // to the bottom of the screen.
                        this.repositionOnStage();
                    }),
                    new AlphaTask(1, ANIM_TIME, null, this._expandedBackground),
                    new AlphaTask(1, ANIM_TIME, null, this._helpText),
                    new AlphaTask(1, ANIM_TIME, null, this._toolShelf.display)
                );
                this.addObject(this._expandCollapseTask);
            } else {
                this._expandCollapseButton.allStates(Bitmaps.ImgExpandArrow);
                // Move the hotbar down and hide the shelf/help text/background
                const targetY = this._expandCollapseButton.display.y - CONTENT_V_MARGIN - this._hotbarLayout.height;
                this._expandCollapseTask = new SerialTask(
                    new ParallelTask(
                        new LocationTask(null, targetY, ANIM_TIME, null, this._hotbarLayout, () => {
                            this.drawExpandedBackground();
                            // We've shrunk and our origin is the top-left hand corner, so we need move
                            // to the bottom of the screen.
                            this.repositionOnStage();
                        }),
                        new AlphaTask(0, ANIM_TIME, null, this._expandedBackground),
                        new AlphaTask(0, ANIM_TIME, null, this._helpText),
                        new AlphaTask(0, ANIM_TIME, null, this._toolShelf.display)
                    ),
                    new CallbackTask(() => {
                        this._toolShelf.display.visible = false;
                        this._helpText.visible = false;
                        this._leftBay.editable = false;
                        this._rightBay.editable = false;
                        // Ensure expanded background isn't overdrawn now that the extra stuff is hidden
                        this.drawExpandedBackground();
                    })
                );
                this.addObject(this._expandCollapseTask);
            }
        }
    }

    private setToolbarAutohide(enabled: boolean) {
        const ANIM_TIME = 0.25;

        if (enabled) {
            this.display.interactive = true;

            let deferredAnimConn: Connection | null = null;

            const unhide = () => {
                if (deferredAnimConn) {
                    // 1) We only needed this signal to fire once, so we can close it
                    // 2) If we had an action queued up but changed our minds before getting to it,
                    //    we need to make sure we throw the old one out
                    deferredAnimConn.close();
                    deferredAnimConn = null;
                }
                if (!this._hidden) return;
                // We hit expand or collapse, but moved our cursor outside and then back inside
                // before the animation finished
                if (this._expandCollapseTask && this._expandCollapseTask.isLiveObject) {
                    // Try again once the animation is done. I think this may not be technically necessary since
                    // as far as I know it's only possible to be in this situation if we were going to hide
                    // but changed our minds, but I'm including it just in case.
                    deferredAnimConn = this._expandCollapseTask.destroyed.connect(unhide);
                    return;
                }

                Assert.assertIsDefined(Flashbang.stageHeight);
                this._hidden = false;
                if (this._autohideTask && this._autohideTask.isLiveObject) this._autohideTask.destroySelf();
                this.addObject(new LocationTask(
                    null,
                    Flashbang.stageHeight,
                    ANIM_TIME,
                    Easing.easeOut,
                    this.display
                ));
            };

            const hide = () => {
                if (deferredAnimConn) {
                    // 1) We only needed this signal to fire once, so we can close it
                    // 2) If we had an action queued up but changed our minds before getting to it,
                    //    we need to make sure we throw the old one out
                    deferredAnimConn.close();
                    deferredAnimConn = null;
                }
                if (this._hidden) return;
                // We hit expand or collapse, but moved our cursor outside before the animation finished
                if (this._expandCollapseTask && this._expandCollapseTask.isLiveObject) {
                    // Try again once the animation is done.
                    deferredAnimConn = this._expandCollapseTask.destroyed.connect(hide);
                    return;
                }

                Assert.assertIsDefined(Flashbang.stageHeight);
                this._hidden = true;
                if (this._autohideTask && this._autohideTask.isLiveObject) this._autohideTask.destroySelf();
                this.addObject(new LocationTask(
                    null,
                    Flashbang.stageHeight + this.display.height - AUTOHIDE_AMOUNT_VISIBLE,
                    ANIM_TIME,
                    Easing.easeOut,
                    this.display
                ));
            };

            this._autohideRegs = new RegistrationGroup();
            this._autohideRegs.add(this.pointerTap.connect(() => {
                if (this._hidden) unhide();
                else hide();
            }));
            this._autohideRegs.add(this.pointerOver.connect(unhide));
            this._autohideRegs.add(this.pointerLeave.connect(hide));

            hide();
        } else {
            Assert.assertIsDefined(Flashbang.stageHeight);
            this.display.interactive = false;
            this._hidden = false;

            if (this._autohideRegs !== null) {
                this._autohideRegs.close();
                this._autohideRegs = null;
            }

            if (this._autohideTask && this._autohideTask.isLiveObject) this._autohideTask.destroySelf();
            this.addObject(new LocationTask(
                null,
                Flashbang.stageHeight,
                ANIM_TIME,
                Easing.easeOut,
                this.display
            ));
        }
    }

    private setupButtons() {
        const isPoseEdit = this._type === ToolbarType.LAB || this._type === ToolbarType.PUZZLE;
        const isPuzzlemaker = this._type === ToolbarType.PUZZLEMAKER || this._type === ToolbarType.PUZZLEMAKER_EMBEDDED;
        const isEditable = this._type !== ToolbarType.FEEDBACK;
        const isSubmittable = this._type === ToolbarType.LAB || isPuzzlemaker;
        const canViewDesigns = this._type === ToolbarType.LAB || this._type === ToolbarType.FEEDBACK;

        // Solve
        this.freezeButton = this.setupButton(freezeButtonProps, isPoseEdit);
        this.pairSwapButton = this.setupButton(pairSwapButtonProps, isEditable);
        this.undoButton = this.setupButton(undoButtonProps, isEditable);
        this.redoButton = this.setupButton(redoButtonProps, isEditable);
        // TODO: Enable once we have a UI for this
        // this.baseShiftButton = this.registerButton(baseShiftButtonProps, isEditable);
        this.librarySelectionButton = this.setupButton(librarySelectionButtonProps, this._showLibrarySelect);
        this.resetButton = this.setupButton(resetButtonProps, isEditable);
        this.magicGlueButton = this.setupButton(magicGlueButtonProps, this._showGlue);
        this.boostersMenuButton = this.setupButton(
            boostersMenuButtonProps,
            isEditable && this._boostersData !== null
        );
        // FIXME: Handle in modes
        if (isEditable && this._boostersData !== null) {
            this.boostersMenuButton.clicked.connect(() => {
                if (this._boostersData != null && this._boostersData.actions != null) {
                    const mode = this.mode as GameMode;
                    mode.showDialog(new BoosterDialog(this._boostersData), 'BoosterDialog');
                }
            });
        }
        this.setupDynamicPaintTools();

        // Create
        this.addBaseButton = this.setupButton(addBaseButtonProps, isPuzzlemaker);
        this.addPairButton = this.setupButton(addPairButtonProps, isPuzzlemaker);
        this.deleteButton = this.setupButton(deleteButtonProps, isPuzzlemaker);
        this.lockButton = this.setupButton(lockButtonProps, isPuzzlemaker);
        this.moleculeButton = this.setupButton(moleculeButtonProps, isPuzzlemaker);
        this.upload3DButton = this.setupButton(upload3DButtonProps, isPuzzlemaker);

        // View
        this.nucleotideFindButton = this.setupButton(nucleotideFindButtonProps);
        this.nucleotideRangeButton = this.setupButton(nucleotideRangeButtonProps);
        this.explosionFactorButton = this.setupButton(explosionFactorButtonProps);
        this.pipButton = this.setupButton(pipButtonProps, this._showPip);
        this.zoomInButton = this.setupButton(zoomInButtonProps);
        this.zoomOutButton = this.setupButton(zoomOutButtonProps);

        // Info
        this.viewSolutionsButton = this.setupButton(viewSolutionsButtonProps, canViewDesigns);
        this.specButton = this.setupButton(specButtonProps, !isPuzzlemaker);
        this.submitButton = this.setupButton(
            isPuzzlemaker ? submitPuzzleButtonProps : submitSolutionButtonProps,
            isSubmittable
        );
        this.settingsButton = this.setupButton(settingsButtonProps);

        // Annotation
        this.baseMarkerButton = this.setupButton(baseMarkerButtonProps, isEditable);
        this.annotationModeButton = this.setupButton(annotationModeButtonProps, !!this._annotationManager);
        this.annotationPanelButton = this.setupButton(annotationPanelButtonProps, !!this._annotationManager);
        // FIXME: Handle in modes
        if (this._annotationManager) {
            let annotationPanelDialog: AnnotationPanelDialog | null = null;
            this.regs.add(
                this.annotationPanelButton.clicked.connect(() => {
                    Assert.assertIsDefined(this._annotationManager);
                    const mode = this.mode as GameMode;
                    annotationPanelDialog = new AnnotationPanelDialog(this._annotationManager);
                    mode.showDialog(annotationPanelDialog, 'AnnotationsPanel');
                })
            );
            this.regs.add(
                this._annotationManager.viewAnnotationDataUpdated.connect(
                    () => {
                        if (annotationPanelDialog && annotationPanelDialog.isLiveObject) {
                            annotationPanelDialog.updatePanel();
                        }
                    }
                )
            );
        }

        // Import/Export
        this.copyButton = this.setupButton(copyButtonProps, isEditable);
        this.pasteButton = this.setupButton(pasteButtonProps, isEditable);
        this.downloadSVGButton = this.setupButton(downloadSVGButtonProps);
        this.screenshotButton = this.setupButton(screenshotButtonProps);

        // Custom Layout
        this.moveButton = this.setupButton(moveButtonProps);
        this.rotateStemButton = this.setupButton(rotateStemButtonProps);
        this.flipStemButton = this.setupButton(flipStemButtonProps);
        this.snapToGridButton = this.setupButton(snapToGridButtonProps);
    }

    private setupDynamicPaintTools() {
        if (this._boostersData?.paint_tools) {
            const mode: PoseEditMode = this.mode as PoseEditMode;
            for (const data of this._boostersData.paint_tools) {
                Booster.create(mode, data).then((booster) => {
                    booster.onLoad();

                    if (booster.buttonStateTextures[0] === null) {
                        throw new Error(
                            'Cannot call createButton before setting at least the first button state texture!'
                        );
                    }

                    const boosterPaintButton = this.setupButton({
                        cat: ButtonCategory.SOLVE,
                        id: booster.label,
                        displayName: booster.label,
                        isPaintTool: true,
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
                    });
                    this.dynPaintTools.push(boosterPaintButton);
                });
            }
        }
    }

    public addView3DButton() {
        // A bit of a shame we can't use a constructor parameter like everything else, but in puzzlemaker
        // we have to wait to add this until a 3D model is actually loaded
        this.view3DButton = this.setupButton(view3DButtonProps);
    }

    private setupButton(props: ToolbarParam, enabled: boolean = true): ToolbarButton {
        const button = ToolbarButton.createButton(props);
        if (enabled) {
            this._toolShelf.addButton(button);
            this.setupButtonDrag(button, 'shelf');
            const leftClone = button.clone();
            this._leftBay.registerButton(leftClone);
            this.setupButtonDrag(leftClone, 'hotbar');
            const rightClone = button.clone();
            this._rightBay.registerButton(rightClone);
            this.setupButtonDrag(rightClone, 'hotbar');
            if (props.isPaintTool) {
                this.regs.add(button.clicked.connect(() => {
                    this.changeActivePaintTool(props.id);
                }));
                this.regs.add(leftClone.clicked.connect(() => {
                    this.changeActivePaintTool(props.id);
                }));
                this.regs.add(rightClone.clicked.connect(() => {
                    this.changeActivePaintTool(props.id);
                }));
            }
        }
        return button;
    }

    private setupButtonDrag(button: ToolbarButton, location: 'shelf' | 'hotbar') {
        let state: {
            name: 'initial'
        } | {
            name: 'pointerdown',
            downPos: Point,
            capture: PointerCapture
        } | {
            name: 'dragging',
            capture: PointerCapture,
            draggingButton: ToolbarButton
        } = {name: 'initial'};

        const captureCallback = (e: FederatedPointerEvent | FederatedWheelEvent) => {
            switch (state.name) {
                case 'initial':
                    // This should never happen because we destroy the PointerCapture before resetting the
                    // state, but in case something goes screwy, log so we have some indication of what happened
                    log.error('PointerCapture active in initial state');
                    break;
                case 'pointerdown':
                    // Note that if the toolbar is not expanded, the hotbar buttons should not be draggable
                    if (e.type === 'pointermove' && this._expanded) {
                        // Only start dragging a new button if the user has actually started moving their mouse
                        // 5px is rather arbitrary for "has started to move", but should be fine. It's not super
                        // noticeable, and if we run into issues where users find clicks being interpreted as drags
                        // (because they're actually moving their mouse/finger slightly), we can increase
                        if (Vector2.distance(state.downPos.x, state.downPos.y, e.global.x, e.global.y) > 5) {
                            const buttonCopy = button.clone();
                            // Temporarily own this object + put it on the top of the display stack
                            Assert.assertIsDefined(this.mode);
                            this.addObject(buttonCopy, this.mode.container);
                            // Take over any events that may be going on outside our drag handling
                            e.stopPropagation();
                            button.cancelInteraction();
                            state = {
                                name: 'dragging',
                                capture: state.capture,
                                draggingButton: buttonCopy
                            };
                        }
                    } else if (e.type === 'pointerup') {
                        state.capture.destroySelf();
                        state = {name: 'initial'};
                    }
                    // If we haven't moved far enough to initiate a drag, do whatever it was that we were going to do
                    break;
                case 'dragging':
                    e.stopPropagation();
                    switch (e.type) {
                        case 'pointermove': {
                            state.draggingButton.display.position.copyFrom(e.global);
                            const existsInHotbar = this._leftBay.isToolActive(button.id)
                                || this._rightBay.isToolActive(button.id);
                            this._leftBay.updateHoverIndicator(e as FederatedPointerEvent, existsInHotbar);
                            this._rightBay.updateHoverIndicator(e as FederatedPointerEvent, existsInHotbar);
                            break;
                        }
                        case 'pointercancel':
                        case 'pointerupoutside':
                            // We've bailed, get rid of our button copy. Technically pointerupoutside
                            // should never occur since the display object events are captured on is over the
                            // entire stage, but just in case, handle it.
                            state.draggingButton.destroySelf();
                            state.capture.destroySelf();
                            state = {name: 'initial'};
                            break;
                        case 'pointerup': {
                            // If we've added a tool to one bay, make sure it's removed from the other bay
                            // (and if it's replacing an existing tool, the tool that gets popped should
                            // go into the other bay in it's place, as it's a swap)
                            const leftUpdate = this._leftBay.handleButtonDrop(e as FederatedPointerEvent, button.id);
                            if (leftUpdate) {
                                const rightSubUpdate = this._rightBay.deactivateTool(button.id, leftUpdate.removedId);
                                if (this._type === ToolbarType.PUZZLEMAKER) {
                                    Eterna.settings.puzzlemakerHotbarTools.value = {
                                        left: leftUpdate.activated,
                                        right: rightSubUpdate.activated
                                    };
                                } else {
                                    Eterna.settings.puzzleSolvingHotbarTools.value = {
                                        left: leftUpdate.activated,
                                        right: rightSubUpdate.activated
                                    };
                                }
                            }
                            const rightUpdate = this._rightBay.handleButtonDrop(e as FederatedPointerEvent, button.id);
                            if (rightUpdate) {
                                const leftSubUpdate = this._leftBay.deactivateTool(button.id, rightUpdate.removedId);
                                if (this._type === ToolbarType.PUZZLEMAKER) {
                                    Eterna.settings.puzzlemakerHotbarTools.value = {
                                        left: leftSubUpdate.activated,
                                        right: rightUpdate.activated
                                    };
                                } else {
                                    Eterna.settings.puzzleSolvingHotbarTools.value = {
                                        left: leftSubUpdate.activated,
                                        right: rightUpdate.activated
                                    };
                                }
                            }
                            if (!leftUpdate && !rightUpdate && location === 'hotbar') {
                                // We dragged out of a hotbar and didn't release over a hotbar, trash it
                                this._leftBay.deactivateTool(button.id);
                                this._rightBay.deactivateTool(button.id);
                            }
                            state.draggingButton.destroySelf();
                            state.capture.destroySelf();
                            state = {name: 'initial'};
                            this.layout();
                            break;
                        }
                        default:
                            // pointerdown and pointertap shouldn't be possible as the pointer is already down
                            // pointerout and pointerover shouldn't be possible because the display object
                            // events are captured on covers the entire screen
                            log.warn(`Unhandled event in ToolbarButton drag: ${e.type}`);
                            break;
                    }
                    break;
                default:
                    Assert.unreachable(state);
            }
        };

        this.regs.add(button.pointerDown.connect((e) => {
            state = {
                name: 'pointerdown',
                downPos: e.global.clone(),
                capture: new PointerCapture(null, captureCallback)
            };
            this.addObject(state.capture);
        }));
    }

    private changeActivePaintTool(toolId: string) {
        if (toolId !== 'palette') this.palette.clearSelection();
        // FIXME: Handle in modes
        if (toolId === annotationModeButtonProps.id) {
            if (this._annotationManager) this._annotationManager.setAnnotationMode(true);
        } else if (this._annotationManager) this._annotationManager.setAnnotationMode(false);
        this._toolShelf.changeActivePaintTool(toolId);
    }

    public disableTools(disable: boolean) {
        this._toolShelf.disableTools(disable);
        this.palette.enabled = !disable && this._type !== ToolbarType.FEEDBACK;
        this._leftBay.display.alpha = disable ? 0.5 : 1;
        this._rightBay.display.alpha = disable ? 0.5 : 1;
        this._expandCollapseButton.enabled = !disable;
        this._expandCollapseButton.display.alpha = disable ? 0.5 : 1;
    }

    public getScriptUIElement(button: ToolbarButton, scriptID: RScriptUIElementID) {
        // The passed button will be from the tool shelf as that's what's exposed as properties on the toolbar
        const hotbarButton = this._leftBay.getButton(button.id) || this._rightBay.getButton(button.id);
        if (this._expanded) {
            if (hotbarButton && hotbarButton.display.visible) {
                hotbarButton.rscriptID(scriptID);
                return hotbarButton;
            } else if (button.category === this._toolShelf.currentTab) {
                button.rscriptID(scriptID);
                return button;
            } else {
                const rect = this._toolShelf.getTabBounds(button.category);
                if (rect) {
                    return {
                        rect,
                        proxy: true
                    };
                }
                // TODO: Can we avoid this?
                return null;
            }
        } else if (hotbarButton && hotbarButton.display.visible) {
            return hotbarButton;
        } else {
            this._expandCollapseButton.rscriptID(scriptID);
            return {
                rect: this._expandCollapseButton.display.getBounds(),
                proxy: true
            };
        }
    }

    public getTooltipPositioners(): ToolTipPositioner[] {
        return [...this._leftBay.getTooltipPositioners(), ...this._rightBay.getTooltipPositioners()];
    }

    private _expandedBackground: Graphics;
    private _content: Container;
    private _hotbarLayout: HLayoutContainer;
    private _leftBay: HotbarBay;
    private _rightBay: HotbarBay;
    private _toolShelf: ToolShelf;
    private _helpText: Text;
    private _expandCollapseButton: GameButton;

    private _expanded: boolean = false;
    private _expandCollapseTask: ObjectTask;
    private _hidden: boolean = false;
    private _autohideTask: ObjectTask;
    private _autohideRegs: RegistrationGroup | null = null;

    private readonly _type: ToolbarType;
    private readonly _showGlue: boolean;
    private readonly _showLibrarySelect: boolean;
    private readonly _showPip: boolean;
    private readonly _boostersData: BoostersData | null;
    private readonly _annotationManager: AnnotationManager | undefined;
}

import * as log from 'loglevel';
import {
    Container, DisplayObject, Point, Sprite, Text, Rectangle, InteractionEvent
} from 'pixi.js';
import EPars, {RNABase, RNAPaint} from 'eterna/EPars';
import Eterna from 'eterna/Eterna';
import {PuzzleID} from 'eterna/EternaApp';
import UndoBlock, {
    UndoBlockParam, FoldData, TargetConditions, OligoDef
} from 'eterna/UndoBlock';
import Solution from 'eterna/puzzle/Solution';
import Puzzle, {
    PuzzleType, PoseState, BoostersData, TargetType
} from 'eterna/puzzle/Puzzle';
import Background from 'eterna/vfx/Background';
import Toolbar, {ToolbarType} from 'eterna/ui/Toolbar';
import SpecBox from 'eterna/ui/SpecBox';
import GameButton from 'eterna/ui/GameButton';
import Bitmaps from 'eterna/resources/Bitmaps';
import {
    KeyCode, SpriteObject, DisplayUtil, HAlign, VAlign, Flashbang, KeyboardEventType, Assert,
    GameObjectRef, SerialTask, AlphaTask, Easing, SelfDestructTask, ContainerObject
} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import EternaSettingsDialog, {EternaViewOptionsMode} from 'eterna/ui/EternaSettingsDialog';
import FolderManager from 'eterna/folding/FolderManager';
import Folder, {MultiFoldResult, CacheKey, SuboptEnsembleResult} from 'eterna/folding/Folder';
import {PaletteTargetType, GetPaletteTargetBaseType} from 'eterna/ui/NucleotidePalette';
import PoseField from 'eterna/pose2D/PoseField';
import Pose2D, {Layout, SCRIPT_MARKER_LAYER} from 'eterna/pose2D/Pose2D';
import Pose3D from 'eterna/pose3D/Pose3D';
import PuzzleEditOp from 'eterna/pose2D/PuzzleEditOp';
import BitmapManager from 'eterna/resources/BitmapManager';
import ConstraintBar from 'eterna/constraints/ConstraintBar';
import ConstraintBox from 'eterna/constraints/ConstraintBox';
import int from 'eterna/util/int';
import PoseOp from 'eterna/pose2D/PoseOp';
import RNAScript from 'eterna/rscript/RNAScript';
import SolutionManager from 'eterna/puzzle/SolutionManager';
import {ExternalInterfaceCtx} from 'eterna/util/ExternalInterface';
import ContextMenu from 'eterna/ui/ContextMenu';
import {SaveStoreItem} from 'flashbang/settings/SaveGameManager';
import SpecBoxDialog from 'eterna/ui/SpecBoxDialog';
import BubbleSweep from 'eterna/vfx/BubbleSweep';
import Sounds from 'eterna/resources/Sounds';
import EternaURL from 'eterna/net/EternaURL';
import PuzzleManager, {PuzzleJSON} from 'eterna/puzzle/PuzzleManager';
import FoldUtil from 'eterna/folding/FoldUtil';
import ShapeConstraint, {AntiShapeConstraint} from 'eterna/constraints/constraints/ShapeConstraint';
import {HighlightType} from 'eterna/pose2D/HighlightBox';
import Utility from 'eterna/util/Utility';
import HintsPanel from 'eterna/ui/HintsPanel';
import HelpBar from 'eterna/ui/HelpBar';
import HelpScreen from 'eterna/ui/help/HelpScreen';
import {HighlightInfo} from 'eterna/constraints/Constraint';
import {AchievementData} from 'eterna/achievements/AchievementManager';
import {RankScrollData} from 'eterna/rank/RankScroll';
import FolderSwitcher from 'eterna/ui/FolderSwitcher';
import MarkerSwitcher from 'eterna/ui/MarkerSwitcher';
import DotPlot from 'eterna/rnatypes/DotPlot';
import {Oligo, OligoMode} from 'eterna/rnatypes/Oligo';
import SecStruct from 'eterna/rnatypes/SecStruct';
import Sequence from 'eterna/rnatypes/Sequence';
import UITheme from 'eterna/ui/UITheme';
import AnnotationManager, {
    AnnotationData,
    AnnotationCategory,
    AnnotationDataBundle,
    AnnotationHierarchyType,
    AnnotationRange
} from 'eterna/AnnotationManager';
import LibrarySelectionConstraint from 'eterna/constraints/constraints/LibrarySelectionConstraint';
import ErrorDialog from 'eterna/ui/ErrorDialog';
import AnnotationDialog from 'eterna/ui/AnnotationDialog';
import {ToolTipPositioner} from 'eterna/ui/help/HelpToolTip';
import GameMode from '../GameMode';
import SubmittingDialog from './SubmittingDialog';
import SubmitPoseDialog from './SubmitPoseDialog';
import SubmitPoseDetails from './SubmitPoseDetails';
import MissionIntroMode from './MissionIntroMode';
import MissionClearedPanel from './MissionClearedPanel';
import ViewSolutionOverlay from '../DesignBrowser/ViewSolutionOverlay';
import {PuzzleEditPoseData} from '../PuzzleEdit/PuzzleEditMode';
import {DesignCategory} from '../DesignBrowser/DesignBrowserMode';
import VoteProcessor from '../DesignBrowser/VoteProcessor';

export interface PoseEditParams {
    isReset?: boolean;
    initialFolder?: string;
    rscript?: string;

    // A sequence to initialize our pose with. If initialSolution is set, this will be ignored.
    initSequence?: string;

    // A solution to initialize our pose with. If set, initSequence is ignored.
    initSolution?: Solution;
    // a list of solutions we can iterate through
    solutions?: Solution[];
}

interface MoveHistory {
    beginFrom: string;
    numMoves: number;
    moves: Move[][];
    elapsed: string;
}

// Mutation moves have pos and base
// sequence pasting or resetting have type and sequence
export interface Move {
    pos?: number;
    base?: string;
    type?: string;
    sequence?: string;
}

// AMW TODO: we need the "all optional" impl for piece by piece buildup.
// Should be converted to an "all required" type for subsequent processing.
// JAR TODO: This seems to conflate the request data with the response data.
// Should be converted to two separate structures (in addition to the above)
export type SubmitSolutionData = {
    'next-puzzle'?: PuzzleJSON | number | null;
    'recommend-puzzle'?: boolean;
    pointsrank?: boolean;
    'ancestor-id'?: number;
    'move-history'?: string;
    title?: string;
    energy?: number;
    puznid?: number;
    sequence?: string;
    repetition?: number;
    gu?: number;
    gc?: number;
    ua?: number;
    body?: string;
    melt?: number;
    'fold-data'?: string;
    error?: string;
    'solution-id'?: number;
    'pointsrank-before'?: RankScrollData | null;
    'pointsrank-after'?: RankScrollData | null;
    'selected-nts'?: number[];
    'annotations'?: string;
};

export default class PoseEditMode extends GameMode {
    constructor(puzzle: Puzzle, params: PoseEditParams, autosaveData: SaveStoreItem | null = null) {
        super();
        this._puzzle = puzzle;
        this._params = params;
        this._autosaveData = autosaveData;

        if (this._params.rscript != null) {
            puzzle.rscript = this._params.rscript;
        }
    }

    public get puzzleID(): number { return this._puzzle.nodeID; }
    public get background(): Background { return this._background; }

    public get isOpaque(): boolean { return true; }

    protected setup(): void {
        super.setup();

        this._background = new Background();
        this.addObject(this._background, this.bgLayer);

        const toolbarType = this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL ? ToolbarType.LAB : ToolbarType.PUZZLE;

        this._annotationManager = new AnnotationManager(toolbarType);
        this._annotationManager.persistentAnnotationDataUpdated.connect(() => this.saveData());
        this._annotationManager.annotationEditRequested.connect((annotation: AnnotationData) => {
            if (annotation.ranges) {
                const dialog = new AnnotationDialog({
                    edit: true,
                    title: true,
                    sequenceLength: this._poses[0].fullSequenceLength,
                    customNumbering: this._poses[0].customNumbering,
                    initialRanges: annotation.ranges,
                    initialLayers: this._annotationManager.allLayers,
                    activeCategory: this._annotationManager.activeCategory,
                    initialAnnotation: annotation
                });
                dialog.onUpdateRanges.connect((ranges: AnnotationRange[] | null) => {
                    if (ranges) {
                        this._poses.forEach((pose) => pose.setAnnotationRanges(ranges));
                    }
                });
                this._annotationManager.persistentAnnotationDataUpdated.connect(() => {
                    dialog.layers = this._annotationManager.allLayers;
                });
                this.showDialog(dialog).closed.then((editedAnnotation: AnnotationData | null) => {
                    if (editedAnnotation) {
                        editedAnnotation.selected = false;
                        this._annotationManager.editAnnotation(editedAnnotation);
                    } else if (annotation) {
                        // We interpret null argument as delete intent when editing
                        this._annotationManager.deleteAnnotation(annotation);
                    }
                });
            }
        });

        this._toolbar = new Toolbar(toolbarType, {
            states: this._puzzle.getSecstructs().length,
            showGlue: this._puzzle.targetConditions
                ?.some((condition) => condition?.structure_constrained_bases),
            boosters: this._puzzle.boosters ? this._puzzle.boosters : undefined,
            showAdvancedMenus: this._puzzle.puzzleType !== PuzzleType.PROGRESSION,
            showLibrarySelect: this._puzzle.constraints?.some((con) => con instanceof LibrarySelectionConstraint),
            annotationManager: this._annotationManager
        }, {
            pairSwapButtonHandler: () => this.onSwapClicked(),
            baseMarkerButtonHandler: () => this.setPosesColor(RNAPaint.BASE_MARK),
            settingsButtonHandler: () => this.showSettingsDialog(),
            updateScriptViews: () => { this._resized.emit(); }
        });
        this.addObject(this._toolbar, this.uiLayer);
        this.addObject(this._toolbar.naturalButton, this.uiLayer);
        this.addObject(this._toolbar.targetButton, this.uiLayer);
        this.addObject(this._toolbar.stateToggle, this.uiLayer);

        this._helpBar = new HelpBar({
            onHintClicked: this._puzzle.hint
                ? () => this.onHintClicked()
                : undefined,
            onHelpClicked: () => this.onHelpClicked(),
            onChatClicked: () => {
                Eterna.settings.showChat.value = !Eterna.settings.showChat.value;
            },
            onInfoClicked: this._params.initSolution ? () => {
                if (this._solutionView) {
                    this._solutionView.container.visible = !this._solutionView.container.visible;
                    this.onResized();
                }
            } : undefined
        });
        this.addObject(this._helpBar, this.uiLayer);

        this._toolbar.undoButton.clicked.connect(() => this.moveUndoStackBackward());
        this._toolbar.redoButton.clicked.connect(() => this.moveUndoStackForward());
        if (this._toolbar.zoomOutButton) {
            this._toolbar.zoomOutButton.clicked.connect(() => {
                for (const poseField of this._poseFields) {
                    poseField.zoomOut();
                }
            });
        }
        if (this._toolbar.zoomInButton) {
            this._toolbar.zoomInButton.clicked.connect(() => {
                for (const poseField of this._poseFields) {
                    poseField.zoomIn();
                }
            });
        }
        this._toolbar.submitButton.clicked.connect(() => this.submitCurrentPose());
        this._toolbar.viewSolutionsButton.clicked.connect(() => this.openDesignBrowserForOurPuzzle());
        this._toolbar.resetButton.clicked.connect(() => this.showResetPrompt());

        this._toolbar.naturalButton.clicked.connect(() => this.togglePoseState());
        this._toolbar.targetButton.clicked.connect(() => this.togglePoseState());

        this._toolbar.specButton.clicked.connect(() => this.showSpec());
        this._toolbar.copyButton.clicked.connect(() => this.showCopySequenceDialog());
        this._toolbar.pasteButton.clicked.connect(() => this.showPasteSequenceDialog());
        this._toolbar.screenshotButton.clicked.connect(() => this.postScreenshot(this.createScreenshot()));

        this._toolbar.pipButton.clicked.connect(() => this.togglePip());

        this._toolbar.stateToggle.stateChanged.connect((targetIdx) => this.changeTarget(targetIdx));

        this._toolbar.freezeButton.clicked.connect(() => this.toggleFreeze());
        this._toolbar.palette.targetClicked.connect((targetType) => this.onPaletteTargetSelected(targetType));
        this._toolbar.pairSwapButton.clicked.connect(() => this.onSwapClicked());

        this._toolbar.nucleotideFindButton.clicked.connect(() => this.findNucleotide());
        this._toolbar.nucleotideRangeButton.clicked.connect(() => this.showNucleotideRange());
        this._toolbar.explosionFactorButton.clicked.connect(() => this.changeExplosionFactor());

        this._toolbar.baseMarkerButton.clicked.connect(() => {
            this.setPosesColor(RNAPaint.BASE_MARK);
        });

        this._toolbar.librarySelectionButton.clicked.connect(() => {
            this.setPosesColor(RNAPaint.LIBRARY_SELECT);
        });

        this._toolbar.magicGlueButton.clicked.connect(() => {
            this.setPosesColor(RNAPaint.MAGIC_GLUE);
        });

        this._toolbar.moveButton.clicked.connect(() => {
            this.setPosesLayoutTool(Layout.MOVE);
        });

        this._toolbar.rotateStemButton.clicked.connect(() => {
            this.setPosesLayoutTool(Layout.ROTATE_STEM);
        });

        this._toolbar.flipStemButton.clicked.connect(() => {
            this.setPosesLayoutTool(Layout.FLIP_STEM);
        });

        this._toolbar.snapToGridButton.clicked.connect(() => {
            for (const pose of this._poses) {
                pose.snapToGrid();
            }
        });

        this._toolbar.downloadHKWSButton.clicked.connect(() => {
            this.downloadHKWS();
        });

        this._toolbar.downloadSVGButton.clicked.connect(() => {
            this.downloadSVG();
        });

        this._toolbar.annotationPanelButton.toggled.connect((visible) => {
            if (visible) {
                this._toolbar.annotationPanel.isVisible = true;
            } else {
                this._toolbar.annotationPanel.isVisible = false;
            }
        });

        // Add our docked SpecBox at the bottom of uiLayer
        this._dockedSpecBox = new SpecBox(true);
        this._dockedSpecBox.display.position.set(15, 190);
        this._dockedSpecBox.setSize(155, 251);
        this._dockedSpecBox.display.visible = false;
        this.addObject(this._dockedSpecBox, this.uiLayer, 0);
        this._dockedSpecBox.shouldMaximize.connect(() => this.showSpec());

        this._undockSpecBoxButton = new GameButton()
            .allStates(Bitmaps.ImgMaximize)
            .tooltip('Re-maximize')
            .hotkey(KeyCode.KeyM);
        this._undockSpecBoxButton.clicked.connect(() => {
            this._dockedSpecBox.display.visible = false;
            this.showSpec();
        });
        this._dockedSpecBox.addObject(this._undockSpecBoxButton, this._dockedSpecBox.container);

        this._uiHighlight = new SpriteObject();
        this.addObject(this._uiHighlight, this.uiLayer);

        this._exitButton = new GameButton().allStates(Bitmaps.ImgNextInside);
        this._exitButton.display.scale.set(0.3, 0.3);
        this._exitButton.display.visible = false;

        Assert.assertIsDefined(this.regs);
        this.regs.add(this._exitButton.clicked.connect(() => this.exitPuzzle()));

        this._targetName = Fonts.std('', 18).build();
        this._targetName.visible = false;
        this.uiLayer.addChild(this._targetName);

        this._homeButton = new GameButton()
            .up(Bitmaps.ImgHome)
            .over(Bitmaps.ImgHome)
            .down(Bitmaps.ImgHome);
        this._homeButton.display.position.set(18, 10);
        this._homeButton.clicked.connect(() => {
            if (Eterna.MOBILE_APP) {
                if (window.frameElement) window.frameElement.dispatchEvent(new CustomEvent('navigate', {detail: '/'}));
            } else {
                window.location.href = EternaURL.createURL({page: 'home'});
            }
        });
        this.addObject(this._homeButton, this.uiLayer);

        const homeArrow = new Sprite(BitmapManager.getBitmap(Bitmaps.ImgHomeArrow));
        homeArrow.position.set(45, 14);
        Assert.assertIsDefined(this.container);
        this.container.addChild(homeArrow);

        // Async text shows above our UI lock, and right below all dialogs
        this._asynchText = Fonts.std('folding...', 12).bold().color(0xffffff).build();
        this._asynchText.position.set(16, 200);
        this.dialogLayer.addChild(this._asynchText);
        this.hideAsyncText();

        this.setPuzzle();

        this.buildScriptInterface();
        this.registerScriptInterface(this._scriptInterface);

        this.updateUILayout();
    }

    protected enter(): void {
        super.enter();
        this.hideAsyncText();
    }

    public onResized(): void {
        this.updateUILayout();
        super.onResized();
    }

    private showAsyncText(text: string): void {
        this._asynchText.text = text;
        this._asynchText.visible = true;
    }

    private hideAsyncText(): void {
        this._asynchText.visible = false;
    }

    private get _solDialogOffset(): number {
        return this._solutionView !== undefined && this._solutionView.container.visible
            ? ViewSolutionOverlay.theme.width : 0;
    }

    protected get posesWidth(): number {
        Assert.assertIsDefined(Flashbang.stageWidth);
        return Flashbang.stageWidth - this._solDialogOffset;
    }

    private updateUILayout(): void {
        this._toolbar.onResized();

        DisplayUtil.positionRelativeToStage(
            this._helpBar.display, HAlign.RIGHT, VAlign.TOP,
            HAlign.RIGHT, VAlign.TOP, 0 - this._solDialogOffset, 0
        );

        DisplayUtil.positionRelativeToStage(
            this._solutionNameText, HAlign.CENTER, VAlign.TOP,
            HAlign.CENTER, VAlign.TOP, 0, 8
        );

        let w = 17;
        const h = 175;
        DisplayUtil.positionRelativeToStage(
            this._toolbar.naturalButton.display, HAlign.LEFT, VAlign.TOP,
            HAlign.LEFT, VAlign.TOP, w, h
        );
        w += this._toolbar.naturalButton.display.width;
        DisplayUtil.positionRelativeToStage(
            this._toolbar.targetButton.display, HAlign.LEFT, VAlign.TOP,
            HAlign.LEFT, VAlign.TOP, w, h
        );
        w += this._toolbar.targetButton.display.width;
        DisplayUtil.positionRelativeToStage(
            this._toolbar.stateToggle.display, HAlign.LEFT, VAlign.TOP,
            HAlign.LEFT, VAlign.TOP, w,
            h + (this._toolbar.targetButton.display.height - this._toolbar.stateToggle.display.height) / 2
        );

        this._folderSwitcher.display.position.set(17, h + this._toolbar.targetButton.display.height + 20);

        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);
        this._exitButton.display.position.set(
            Flashbang.stageWidth - 85 - this._solDialogOffset,
            Flashbang.stageHeight - 120
        );
        this._undockSpecBoxButton.display.position.set(Flashbang.stageWidth - 22 - this._solDialogOffset, 5);

        this._constraintBar.layout();

        this._dockedSpecBox.setSize(Flashbang.stageWidth - this._solDialogOffset, Flashbang.stageHeight - 340);
        const s: number = this._dockedSpecBox.plotSize;
        this._dockedSpecBox.setSize(s + 55, s * 2 + 51);

        if (this._toolbar.annotationPanel.isVisible) {
            this._toolbar.annotationPanel.updatePanelPosition();
        }
    }

    public get toolbar(): Toolbar {
        return this._toolbar;
    }

    public get constraintsLayer(): Container {
        return this._constraintsLayer;
    }

    private showSettingsDialog(): void {
        const mode = this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL
            ? EternaViewOptionsMode.LAB
            : EternaViewOptionsMode.PUZZLE;
        this.showDialog(new EternaSettingsDialog(mode));
    }

    public set puzzleDefaultMode(defaultMode: PoseState) {
        this._puzzle.defaultMode = defaultMode;
    }

    public ropChangeTarget(targetIndex: number): void {
        this.changeTarget(targetIndex);
        if (this._toolbar.stateToggle != null) {
            this._toolbar.stateToggle.state = targetIndex;
        }
    }

    public ropSetToNativeMode(): void {
        this.setToNativeMode();
    }

    public ropSetToTargetMode(): void {
        this.setToTargetMode();
    }

    public setDisplayScoreTexts(display: boolean): void {
        for (const pose of this._poses) {
            pose.displayScoreTexts = display;
        }
    }

    public ropSetDisplayScoreTexts(display: boolean): void {
        this._ropPresets.push(() => this.setDisplayScoreTexts(display));
    }

    public setShowNumbering(show: boolean): void {
        for (const pose of this._poses) {
            pose.showNumbering = show;
        }
    }

    public ropSetShowNumbering(show: boolean): void {
        this._ropPresets.push(() => this.setShowNumbering(show));
    }

    public setShowRope(show: boolean): void {
        for (const pose of this._poses) {
            pose.showRope = show;
        }
    }

    public setShowTotalEnergy(show: boolean): void {
        for (const poseField of this._poseFields) {
            poseField.showTotalEnergy = show;
        }
    }

    public ropSetShowTotalEnergy(show: boolean): void {
        this._ropPresets.push(() => this.setShowTotalEnergy(show));
    }

    public selectFolder(folderName: string): boolean {
        return this._folderSwitcher.changeFolder(folderName);
    }

    public onPaletteTargetSelected(type: PaletteTargetType): void {
        const baseType = GetPaletteTargetBaseType(type);
        this.setPosesColor(baseType);
    }

    public onSwapClicked(): void {
        this.setPosesColor(RNAPaint.PAIR);
    }

    public onHintClicked(): void {
        if (this._hintBoxRef.isLive) {
            this._hintBoxRef.destroyObject();
        } else {
            const panel = new HintsPanel(this._puzzle.hint || '');
            this._hintBoxRef = this.addObject(panel, this.container);
        }
    }

    public publicStartCountdown(): void {
        this.startCountdown();
    }

    private onHelpClicked() {
        const getBounds = (elem: ContainerObject | undefined) => {
            Assert.assertIsDefined(elem);
            const globalPos = elem.container.toGlobal(new Point());
            return new Rectangle(
                globalPos.x,
                globalPos.y,
                elem.container.width,
                elem.container.height
            );
        };

        const switchStateButton = Boolean(this.toolbar.stateToggle.container.parent)
            && this.toolbar.stateToggle.display.visible;
        Assert.assertIsDefined(this.modeStack);

        const helpers:ToolTipPositioner[] = [];
        const topBtArray:GameButton[] = [];
        this.toolbar._topButtons.forEach((val) => {
            topBtArray.push(val);
        });
        topBtArray.sort((b1, b2) => {
            const r1 = getBounds(b1);
            const r2 = getBounds(b2);
            if (r1.x < r2.x) return -1;
            else return 1;
        });
        for (let i = 0; i < topBtArray.length; i++) {
            const bt = topBtArray[i];
            const rect = getBounds(bt);
            helpers.push([() => rect, 0, bt.name as string]);
        }
        this.modeStack.pushMode(new HelpScreen({
            toolTips: {
                topbarHelpers: helpers,

                hints: this._puzzle.hint
                    ? [
                        () => new Rectangle(
                            this._helpBar.container.x,
                            this._helpBar.container.y,
                            this._helpBar.container.width,
                            this._helpBar.container.height
                        ),
                        0, 'Hint'
                    ]
                    : undefined,

                modeSwitch: this.toolbar.naturalButton.display.visible
                    ? [() => getBounds(this.toolbar.naturalButton),
                        this.toolbar.naturalButton.container.width / 2, 'Mode switch']
                    : undefined,

                switchState: switchStateButton
                    ? [
                        () => new Rectangle(
                            this.toolbar.stateToggle.container.x + this.toolbar.container.x,
                            this.toolbar.stateToggle.container.y + this.toolbar.container.y,
                            this.toolbar.stateToggle.container.width,
                            this.toolbar.stateToggle.container.height
                        ),
                        0, 'Switch state'
                    ]
                    : undefined,

                palette: this.toolbar.palette.display.visible
                    ? [() => getBounds(this.toolbar.palette), 0, 'Pallete']
                    : undefined
            }
        }));
    }

    private showSolution(solution: Solution): void {
        this.clearUndoStack();
        this.pushUILock();

        const setSolution = (foldData: FoldData[] | null) => {
            this.hideAsyncText();
            this.popUILock();

            if (foldData != null) {
                this._stackLevel++;
                this._stackSize = this._stackLevel + 1;
                this._seqStacks[this._stackLevel] = [];

                for (let ii = 0; ii < this._poses.length; ii++) {
                    const undoBlock: UndoBlock = new UndoBlock(new Sequence([]), this._folder?.name ?? '');
                    undoBlock.fromJSON(foldData[ii]);
                    this._seqStacks[this._stackLevel][ii] = undoBlock;
                }

                this.savePosesMarkersContexts();
                this.moveUndoStack();
                this.updateScore();
                this.transformPosesMarkers();
            } else {
                const sequence = solution.sequence;
                for (const pose of this._poses) {
                    pose.pasteSequence(sequence);
                    pose.librarySelections = solution.libraryNT;
                }
            }
            this.clearMoveTracking(solution.sequence.sequenceString());
            this.setAncestorId(solution.nodeID);

            const annotations = solution.annotations;
            this._annotationManager.setSolutionAnnotations(annotations ?? []);
        };

        if (this._puzzle.hasTargetType('multistrand')) {
            this.showAsyncText('retrieving...');
            solution.queryFoldData().then((result) => setSolution(result));
        } else {
            setSolution(null);
        }
    }

    private highlightSequences(highlightInfos: HighlightInfo[] | null) {
        for (const [poseIdx, pose] of this._poses.entries()) {
            pose.clearRestrictedHighlight();
            pose.clearUnstableHighlight();
            pose.clearUserDefinedHighlight();
            const poseState = this._isPipMode || poseIdx !== 0 ? poseIdx : this._curTargetIndex;
            if (!highlightInfos) continue;
            for (const highlightInfo of highlightInfos) {
                if (highlightInfo.stateIndex !== undefined && poseState !== highlightInfo.stateIndex) {
                    continue;
                }

                const currBlock = this.getCurrentUndoBlock(poseState);
                const naturalMap = currBlock.reorderedOligosIndexMap(currBlock.oligoOrder);
                const targetMap = currBlock.reorderedOligosIndexMap(currBlock.targetOligoOrder);
                let ranges = highlightInfo.ranges;
                if (this._poseState === PoseState.NATIVE && naturalMap !== undefined) {
                    ranges = highlightInfo.ranges.map((index: number) => naturalMap.indexOf(index));
                } else if (this._poseState === PoseState.TARGET && targetMap !== undefined) {
                    ranges = highlightInfo.ranges.map((index: number) => targetMap.indexOf(index));
                }

                switch (highlightInfo.color) {
                    case HighlightType.RESTRICTED:
                        pose.highlightRestrictedSequence(ranges);
                        break;
                    case HighlightType.UNSTABLE:
                        pose.highlightUnstableSequence(ranges);
                        break;
                    case HighlightType.USER_DEFINED:
                        pose.highlightUserDefinedSequence(ranges);
                        break;
                    default:
                        log.error(`Invalid highlight type: ${highlightInfo.color}`);
                }
            }
        }
    }

    private addMarkerLayer(layer: string, resetSelectedLayer?: boolean) {
        this._markerSwitcher.addMarkerLayer(layer, resetSelectedLayer);
        this._markerSwitcher.display.visible = true;
    }

    private setMarkerLayer(layer: string) {
        for (const pose of this._poses) {
            pose.setMarkerLayer(layer);
        }
    }

    private setPuzzle(): void {
        const poseFields: PoseField[] = [];

        const targetSecstructs: string[] = this._puzzle.getSecstructs();
        const targetConditions = this._puzzle.targetConditions;

        // TSC: this crashes, and doesn't seem to accomplish anything
        // let before_reset: number[] = null;
        // if (is_reset) {
        //     before_reset = this._puzzle.transform_sequence(this.get_current_undo_block(0).get_sequence(), 0);
        // }

        const bindAddBaseCB = (pose: Pose2D, kk: number) => {
            pose.addBaseCallback = ((parenthesis: string | null, op: PuzzleEditOp | null, index: number) => {
                Assert.assertIsDefined(parenthesis);
                Assert.assertIsDefined(op);
                pose.baseShift(parenthesis, op, index);
                this.poseEditByTarget(kk);
            });
        };

        const bindPoseEdit = (pose: Pose2D, index: number) => {
            pose.poseEditCallback = (() => {
                this.poseEditByTarget(index);
            });
        };
        const bindTrackMoves = (pose: Pose2D, _index: number) => {
            pose.trackMovesCallback = ((count: number, moves: Move[]) => {
                this._moveCount += count;
                if (moves) {
                    this._moves.push(moves.slice());
                }
            });
        };

        const bindMousedownEvent = (pose: Pose2D, index: number) => {
            pose.startMousedownCallback = ((e: InteractionEvent, _closestDist: number, closestIndex: number) => {
                for (let ii = 0; ii < poseFields.length; ++ii) {
                    const poseField: PoseField = poseFields[ii];
                    const poseToNotify: Pose2D = poseField.pose;
                    if (index === ii) {
                        poseToNotify.onPoseMouseDown(e, closestIndex);
                    } else {
                        poseToNotify.onPoseMouseDownPropagate(e, closestIndex);
                    }
                }
            });
            pose.startPickCallback = (closestIndex: number):void => {
                for (let ii = 0; ii < poseFields.length; ++ii) {
                    const poseField: PoseField = poseFields[ii];
                    const poseToNotify = poseField.pose;
                    if (ii === index) {
                        poseToNotify.onVirtualPoseMouseDown(closestIndex);
                    } else {
                        poseToNotify.onVirtualPoseMouseDownPropagate(closestIndex);
                    }
                }
            };
        };

        for (let ii = 0; ii < targetConditions.length; ii++) {
            const poseField: PoseField = new PoseField(true, this._annotationManager);
            this.addObject(poseField, this.poseLayer);
            const pose: Pose2D = poseField.pose;
            bindAddBaseCB(pose, ii);
            bindPoseEdit(pose, ii);
            bindTrackMoves(pose, ii);
            bindMousedownEvent(pose, ii);
            poseFields.push(poseField);
        }

        this.setPoseFields(poseFields);

        // if (this.root.loaderInfo.parameters.databrowser
        //     && this.root.loaderInfo.parameters.databrowser === "true") {
        //     this._is_databrowser_mode = true;
        // }

        // Unroll a lot of the data in the puzzle's TargetConditions into members
        // that PoseEditMode handles itself
        for (let ii = 0; ii < targetSecstructs.length; ii++) {
            this._targetConditions.push(targetConditions[ii]);
            this._targetOligos.push(undefined);
            this._targetOligosOrder.push(undefined);
            this._targetOligo.push(undefined);
            this._oligoMode.push(undefined);
            this._oligoName.push(undefined);
            if (targetConditions[ii] === undefined) continue;

            const tc = targetConditions[ii] as TargetConditions;
            if (tc['oligo_sequence']) {
                this._targetOligo[ii] = Sequence.fromSequenceString(tc['oligo_sequence'] as string).baseArray;
                this._oligoMode[ii] = tc['fold_mode'] === undefined
                    ? OligoMode.DIMER
                    : Number(tc['fold_mode']);
                this._oligoName[ii] = tc['oligo_name'];
            }
            if (tc['oligos']) {
                // Map from OligoDef to Oligo, basically requires turning
                // a sequence string into a baseArray.
                this._targetOligos[ii] = tc['oligos'].map(
                    (odef) => ({
                        sequence: Sequence.fromSequenceString(odef.sequence).baseArray,
                        malus: odef.malus,
                        name: odef.name
                    })
                );
            }
        }

        this._exitButton.display.visible = false;
        this.addObject(this._exitButton, this.uiLayer);

        const puzzleTitle = UITheme.makeTitle(this._puzzle.getName(!Eterna.MOBILE_APP), 0xC0DCE7);
        puzzleTitle.hideWhenModeInactive();
        this.addObject(puzzleTitle, this.uiLayer);
        puzzleTitle.display.position.set(57, 8);

        this._solutionNameText = Fonts.std('', 14).bold().color(0xc0c0c0).build();
        this.uiLayer.addChild(this._solutionNameText);

        let initialFolder: Folder | null = null;
        if (this._params.initialFolder != null) {
            initialFolder = FolderManager.instance.getFolder(this._params.initialFolder);
            if (initialFolder == null) {
                log.warn(`No such folder '${this._params.initialFolder}'`);
            }
        }

        initialFolder = initialFolder || FolderManager.instance.getFolder(this._puzzle.folderName);
        if (!initialFolder) {
            throw new Error('Big problem; unable to initialize folder!');
        }

        // now that we have made the folder check, we can set _targetPairs. Used to do this
        // above but because NuPACK can handle pseudoknots, we shouldn't
        for (let ii = 0; ii < targetSecstructs.length; ii++) {
            if (this._targetConditions && this._targetConditions[0]
                && this._targetConditions[0]['type'] === 'pseudoknot') {
                this._targetPairs.push(SecStruct.fromParens(targetSecstructs[ii], true));
                this._poseFields[ii].pose.pseudoknotted = true;
            } else {
                this._targetPairs.push(SecStruct.fromParens(targetSecstructs[ii]));
            }
        }

        // We can only set up the folderSwitcher once we have set up the poses
        this._folderSwitcher = new FolderSwitcher(
            (folder) => this._puzzle.canUseFolder(folder),
            initialFolder,
            this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL
        );
        this.addObject(this._folderSwitcher, this.uiLayer);

        this._folderSwitcher.selectedFolder.connectNotify((folder) => {
            if (folder.canScoreStructures) {
                for (const pose of this._poses) {
                    pose.scoreFolder = folder;
                }
            } else {
                for (const pose of this._poses) {
                    pose.scoreFolder = null;
                }
            }

            this.onChangeFolder();
        });

        this._markerSwitcher = new MarkerSwitcher();
        this._markerSwitcher.display.position.set(17, 294);
        this.addObject(this._markerSwitcher, this.uiLayer);
        this.regs?.add(this._markerSwitcher.selectedLayer.connectNotify((val) => this.setMarkerLayer(val)));
        this._markerSwitcher.display.visible = false;

        this._constraintsLayer = new Container();
        this.uiLayer.addChild(this._constraintsLayer);

        this._constraintsLayer.visible = true;

        this._toolbar.palette.clickTarget(PaletteTargetType.A);

        // Set up the constraintBar
        this._constraintBar = new ConstraintBar(this._puzzle.constraints, this._puzzle.getSecstructs.length);
        this._constraintBar.display.visible = false;
        this.addObject(this._constraintBar, this._constraintsLayer);
        this._constraintBar.sequenceHighlights.connect(
            (highlightInfos: HighlightInfo[] | null) => this.highlightSequences(highlightInfos)
        );

        // Initialize sequence and/or solution as relevant
        let initialSequence: Sequence | null = null;
        let librarySelections: number[] = [];
        if (this._params.initSolution != null) {
            Assert.assertIsDefined(
                this._params.solutions,
                'Initial solution provided, but no solution list is available'
            );
            initialSequence = this._params.initSolution.sequence.slice(0);
            const annotations = this._params.initSolution.annotations;
            if (annotations) {
                this._annotationManager.setSolutionAnnotations(annotations);
            }

            librarySelections = this._params.initSolution.libraryNT;
            this._curSolutionIdx = this._params.solutions.indexOf(this._params.initSolution);
            this.showSolutionDetailsDialog(this._params.initSolution, true);
        } else if (this._params.initSequence != null) {
            initialSequence = Sequence.fromSequenceString(this._params.initSequence);
        }

        // Load elements from targetConditions into poses.
        for (let ii = 0; ii < this._poses.length; ii++) {
            // If the initialSequence (from a starting solution or other source)
            // isn't available, load in a cached sequence. Otherwise, apply the
            // fixed tails if necessary.
            let seq = initialSequence;
            if (seq == null) {
                seq = this._puzzle.getBeginningSequence(ii);
                if (this._puzzle.puzzleType === PuzzleType.CHALLENGE && !this._params.isReset) {
                    const savedSeq: Sequence = this._puzzle.savedSequence;
                    if (savedSeq != null) {
                        if (savedSeq.length === seq.length) {
                            seq = savedSeq;
                        }
                    }
                }
            } else if (this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL && this._puzzle.isUsingTails) {
                seq = Puzzle.probeTail(seq);
            }

            Assert.assertIsDefined(seq);
            this._poses[ii].sequence = this._puzzle.transformSequence(seq, ii);
            if (this._puzzle.barcodeIndices != null) {
                this._poses[ii].barcodes = this._puzzle.barcodeIndices;
            }
            this._poses[ii].setOligos(this._targetOligos[ii], this._targetOligosOrder[ii]);
            this._poses[ii].setOligo(this._targetOligo[ii], this._oligoMode[ii], this._oligoName[ii]);
            this._poses[ii].secstruct = this._targetPairs[ii];
            this._poses[ii].targetPairs = this._targetPairs[ii];
            if (this._targetConditions[ii] !== undefined) {
                const tc = this._targetConditions[ii] as TargetConditions;
                this._poses[ii].structConstraints = tc['structure_constraints'];

                const annotations = tc['annotations'];
                if (annotations) {
                    this._annotationManager.setPuzzleAnnotations(annotations);
                }

                this._poses[ii].customLayout = tc['custom-layout'];
                const customLayout = this._poses[ii].customLayout;
                if (customLayout != null && customLayout.length !== targetSecstructs[ii].length) {
                    log.warn(
                        'custom-layout field from puzzle objective json does not match target length.'
                        + ' Ignoring custom-layout'
                    );
                    this._poses[ii].customLayout = undefined;
                }

                this._poses[ii].customNumbering = Utility.numberingJSONToArray(
                    tc['custom-numbering']
                );
                const customNumbering = this._poses[ii].customNumbering;
                if (customNumbering != null) {
                    if (customNumbering.length !== targetSecstructs[ii].length) {
                        log.warn(
                            'custom-numbering field from puzzle objective json does not match target length.'
                            + ' Ignoring custom-numbering'
                        );
                        log.warn(
                            `custom-numbering length ${customNumbering.length} vs. target length `
                            + `${targetSecstructs[ii].length}`
                        );
                        this._poses[ii].customNumbering = undefined;
                    } else {
                        const x = customNumbering;
                        for (let jj = 0; jj < x.length; jj++) {
                            if (x[jj] == null) continue;
                            const kk = x.indexOf(x[jj]);
                            if (kk !== jj) {
                                log.warn(
                                    `custom-numbering field ${String(x[jj])} appears twice.`
                                    + ' Ignoring custom-numbering'
                                );
                                this._poses[ii].customNumbering = undefined;
                                break;
                            }
                        }
                    }
                }
            }

            this._poses[ii].puzzleLocks = this._puzzle.puzzleLocks;
            this._poses[ii].shiftLimit = this._puzzle.shiftLimit;
            this._poses[ii].librarySelections = librarySelections;
        }

        this.clearUndoStack();

        this.disableTools(true);

        // reset lineage for experimental targets
        this.setAncestorId(0);

        // We don't load saved data if we're viewing someone else's solution
        // If there's an initial solution, still autoload if we've previously played
        if (!this._params.isReset
            && this._params.initSolution == null) {
            this.loadSavedData();
        }

        this._poseEditByTargetCb = () => {
            if (this.forceSync) {
                this.setPuzzleEpilog(initialSequence, this._params.isReset);
            } else {
                this._opQueue.push(new PoseOp(
                    this._targetPairs.length,
                    () => this.setPuzzleEpilog(initialSequence, this._params.isReset)
                ));
            }
            this._poseEditByTargetCb = null;
        };

        this.poseEditByTarget(0);

        // Setup RScript and execute the ROPPRE ops
        this._rscript = new RNAScript(this._puzzle, this);
        this._rscript.tick();

        // RScript can set our initial poseState
        this._poseState = this._puzzle.defaultMode;

        // add 3DWindow
        const threePath = this._puzzle.threePath;
        if (threePath) {
            const url = new URL(threePath, Eterna.SERVER_URL);
            Pose3D.checkModelFile(url.href, this._puzzle.getSecstruct(0).length).then(() => {
                this.addPose3D(url.href);
            }).catch((err) => {
                this.showDialog(new ErrorDialog(err));
            });
        }
    }

    private async switchToBrowser(solution: Solution, sortOnSolution: boolean = false): Promise<void> {
        this.pushUILock();
        try {
            // AMW: this is very similar to the DesignBrowserMode method, but we
            // don't know about a bunch of solutions -- so instead we switch with
            // only this one available.
            await Eterna.app.switchToDesignBrowser(
                this.puzzleID,
                solution,
                sortOnSolution
            );
        } catch (e) {
            log.error(e);
        } finally {
            this.popUILock();
        }
    }

    private vote(solution: Solution): void {
        this.pushUILock();

        const statusText = PoseEditMode.createStatusText('Submitting...');
        this.addObject(statusText, this.notifLayer);
        DisplayUtil.positionRelativeToStage(statusText.display,
            HAlign.CENTER, VAlign.CENTER,
            HAlign.CENTER, VAlign.CENTER);

        const cleanup = () => {
            this.popUILock();
            statusText.destroySelf();
            this.closeCurDialog();
        };

        // string | number => definitely a number
        const myVotes = Number(solution.getProperty(DesignCategory.MY_VOTES));
        Eterna.client.toggleSolutionVote(solution.nodeID, this._puzzle.nodeID, myVotes)
            .then((data) => {
                VoteProcessor.processDataGlobal(data['votes']);
                const cheevs: {[name: string]: AchievementData} = data['new_achievements'];
                if (cheevs != null) {
                    this._achievements.awardAchievements(cheevs).then(() => { /* ignore result */ });
                }
                cleanup();

                const newVoteStatus = (1 - myVotes) > 0;

                // Toggle vote button
                if (this._solutionView) {
                    this._solutionView.setVoteStatus(newVoteStatus);
                }
            })
            .catch((err) => {
                this.showNotification(`Vote failed: ${err}`);
                cleanup();
            });
    }

    private unpublish(solution: Solution): void {
        this.pushUILock();

        const statusText = PoseEditMode.createStatusText('Deleting...');
        this.addObject(statusText, this.notifLayer);
        DisplayUtil.positionRelativeToStage(statusText.display,
            HAlign.CENTER, VAlign.CENTER,
            HAlign.CENTER, VAlign.CENTER);

        const cleanup = () => {
            this.popUILock();
            statusText.destroySelf();
            this.closeCurDialog();
        };

        Eterna.client.deleteSolution(solution.nodeID)
            .then(() => SolutionManager.instance.getSolutionsForPuzzle(this._puzzle.nodeID))
            .then(() => this.reloadCurrentSolution())
            .then(cleanup)
            .catch((err) => {
                this.showNotification(`Delete failed: ${err}`);
                cleanup();
            });
    }

    private buildScriptInterface(): void {
        this._scriptInterface.addCallback('get_sequence_string', (): string => this.getPose(0).getSequenceString());

        this._scriptInterface.addCallback('get_custom_numbering_to_index',
            (): { [customNumber: number]: number } | undefined => {
                const customNumbering = this.getPose(0).customNumbering;
                if (customNumbering === undefined) return undefined;

                // At Omei's request, create maps both ways
                const numberingToIdx: { [customNumber: number]: number } = {};
                for (let ii = 0; ii < customNumbering.length; ++ii) {
                    const cn: number | null = customNumbering[ii];
                    if (cn !== null) {
                        numberingToIdx[cn] = ii;
                    }
                }
                return numberingToIdx;
            });

        this._scriptInterface.addCallback('get_index_to_custom_numbering',
            (): { [serialIndex: number]: number | null } | undefined => {
                const customNumbering = this.getPose(0).customNumbering;
                if (customNumbering === undefined) return undefined;

                // At Omei's request, create maps both ways
                const idxToNumbering: { [serialIndex: number]: number | null } = {};
                for (let ii = 0; ii < customNumbering.length; ++ii) {
                    idxToNumbering[ii] = customNumbering[ii];
                }
                return idxToNumbering;
            });

        this._scriptInterface.addCallback('get_full_sequence', (indx: number): string | null => {
            if (indx < 0 || indx >= this._poses.length) {
                return null;
            } else {
                return this.getPose(indx).fullSequence.sequenceString();
            }
        });

        this._scriptInterface.addCallback('get_locks', (): boolean[] | null => {
            const pose: Pose2D = this.getPose(0);
            return pose.puzzleLocks ? pose.puzzleLocks.slice(0, pose.sequence.length) : null;
        });

        this._scriptInterface.addCallback('get_targets', (): TargetConditions[] => {
            const conditions = this._puzzle.targetConditions;
            if (conditions.length === 0) {
                conditions.push(undefined);
            }
            for (let ii = 0; ii < conditions.length; ii++) {
                if (conditions[ii] === undefined) {
                    // conditions[ii] = {};
                    conditions[ii] = {
                        type: 'single',
                        secstruct: this._puzzle.getSecstruct(ii)
                    };
                    // conditions[ii]['type'] = 'single';
                    // conditions[ii]['secstruct'] = this._puzzle.getSecstruct(ii);
                }
            }
            return JSON.parse(JSON.stringify(conditions));
        });

        this._scriptInterface.addCallback('get_native_structure', (indx: number): string | null => {
            if (indx < 0 || indx >= this._poses.length) return null;
            const nativepairs = this.getCurrentUndoBlock(indx).getPairs();
            return nativepairs.getParenthesis();
        });

        this._scriptInterface.addCallback('get_full_structure', (indx: number): string | null => {
            if (indx < 0 || indx >= this._poses.length) {
                return null;
            }

            const nativePairs: SecStruct = this.getCurrentUndoBlock(indx).getPairs();
            const seq: Sequence = this.getPose(indx).fullSequence;
            return nativePairs.getParenthesis(seq);
        });

        this._scriptInterface.addCallback('get_free_energy', (indx: number): number => {
            if (indx < 0 || indx >= this._poses.length) {
                return Number.NaN;
            }
            return this.getCurrentUndoBlock(indx).getParam(UndoBlockParam.FE) as number;
        });

        this._scriptInterface.addCallback('check_constraints', (): boolean => this.checkConstraints());

        this._scriptInterface.addCallback('constraint_satisfied', (idx: number): boolean | null => {
            this.checkConstraints();
            if (idx >= 0 && this.constraintCount && idx < this.constraintCount) {
                return this._puzzle.constraints ? this._puzzle.constraints[idx].evaluate({
                    undoBlocks: this._seqStacks[this._stackLevel],
                    targetConditions: this._targetConditions,
                    puzzle: this._puzzle
                }).satisfied : null;
            } else {
                return false;
            }
        });

        this._scriptInterface.addCallback('get_tracked_indices', (): number[] => this.getPose(0).trackedIndices);
        this._scriptInterface.addCallback('get_barcode_indices', (): number[] | null => this._puzzle.barcodeIndices);
        this._scriptInterface.addCallback('is_barcode_available',
            (seq: string): boolean => SolutionManager.instance.checkRedundancyByHairpin(seq));

        this._scriptInterface.addCallback('current_folder',
            (): string | null => (this._folder ? this._folder.name : null));

        this._scriptInterface.addCallback('fold',
            (seq: string, constraint: string | null = null): string | null => {
                if (this._folder === null) {
                    return null;
                }
                const seqArr: Sequence = Sequence.fromSequenceString(seq);
                if (this._targetConditions && this._targetConditions[0]
                    && this._targetConditions[0]['type'] === 'pseudoknot') {
                    const folded: SecStruct | null = this._folder.foldSequence(seqArr, null, constraint, true);
                    Assert.assertIsDefined(folded);
                    return folded.getParenthesis(null, true);
                } else {
                    const folded: SecStruct | null = this._folder.foldSequence(seqArr, null, constraint);
                    Assert.assertIsDefined(folded);
                    return folded.getParenthesis();
                }
            });

        this._scriptInterface.addCallback('fold_with_binding_site',
            (seq: string, site: number[], bonus: number): string | null => {
                if (this._folder === null) {
                    return null;
                }
                const seqArr: Sequence = Sequence.fromSequenceString(seq);
                const folded: SecStruct | null = this._folder.foldSequenceWithBindingSite(
                    seqArr, null, site, Math.floor(bonus * 100), 2.5
                );
                if (folded === null) {
                    return null;
                }
                return folded.getParenthesis();
            });

        this._scriptInterface.addCallback('energy_of_structure', (seq: string, secstruct: string): number | null => {
            if (this._folder === null) {
                return null;
            }
            const seqArr: Sequence = Sequence.fromSequenceString(seq);
            const structArr: SecStruct = SecStruct.fromParens(secstruct);
            const freeEnergy = (this._targetConditions && this._targetConditions[0]
                && this._targetConditions[0]['type'] === 'pseudoknot')
                ? this._folder.scoreStructures(seqArr, structArr, true)
                : this._folder.scoreStructures(seqArr, structArr);
            return 0.01 * freeEnergy;
        });

        // AMW: still give number[] back because external scripts may rely on it
        this._scriptInterface.addCallback('pairing_probabilities',
            (seq: string, secstruct: string | null = null): number[] | null => {
                if (this._folder === null) {
                    return null;
                }
                const seqArr: Sequence = Sequence.fromSequenceString(seq);
                let folded: SecStruct | null;
                if (secstruct) {
                    folded = SecStruct.fromParens(secstruct);
                } else {
                    folded = this._folder.foldSequence(seqArr, null, null);
                    if (folded === null) {
                        return null;
                    }
                }
                const pp: DotPlot | null = this._folder.getDotPlot(seqArr, folded);
                Assert.assertIsDefined(pp);
                return pp.data;
            });

        this._scriptInterface.addCallback('subopt_single_sequence',
            (seq: string, kcalDelta: number,
                pseudoknotted: boolean, temp: number = 37): SuboptEnsembleResult | null => {
                if (this._folder === null) {
                    return null;
                }
                // now get subopt stuff
                const seqArr: Sequence = Sequence.fromSequenceString(seq);
                return this._folder.getSuboptEnsembleNoBindingSite(seqArr,
                    kcalDelta, pseudoknotted, temp);
            });

        this._scriptInterface.addCallback('subopt_oligos',
            (seq: string, oligoStrings: string[], kcalDelta: number,
                pseudoknotted: boolean, temp: number = 37): SuboptEnsembleResult | null => {
                if (this._folder === null) {
                    return null;
                }
                // make the sequence string from the oligos
                let newSequence: string = seq;
                for (let oligoIndex = 0; oligoIndex < oligoStrings.length; oligoIndex++) {
                    const oligoSequence: string = oligoStrings[oligoIndex];
                    newSequence = `${newSequence}&${oligoSequence}`;
                }

                // now get subopt stuff
                const seqArr: Sequence = Sequence.fromSequenceString(newSequence);
                return this._folder.getSuboptEnsembleWithOligos(seqArr,
                    oligoStrings, kcalDelta, pseudoknotted, temp);
            });

        this._scriptInterface.addCallback('cofold',
            (seq: string, oligo: string, malus: number = 0.0, constraint: string | null = null): string | null => {
                if (this._folder === null) {
                    return null;
                }
                const len: number = seq.length;
                const cseq = `${seq}&${oligo}`;
                const seqArr: Sequence = Sequence.fromSequenceString(cseq);
                const folded: SecStruct | null = this._folder.cofoldSequence(
                    seqArr, null, Math.floor(malus * 100), constraint
                );
                if (folded === null) {
                    return null;
                }
                return `${folded.slice(0, len).getParenthesis()
                }&${folded.slice(len).getParenthesis()}`;
            });

        if (this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL) {
            this._scriptInterface.addCallback(
                'select_folder', (folderName: string): boolean => this.selectFolder(folderName)
            );

            this._scriptInterface.addCallback('load_parameters_from_buffer', (_str: string): boolean => {
                log.info('TODO: load_parameters_from_buffer');
                return false;
                // let buf: ByteArray = new ByteArray;
                // buf.writeUTFBytes(str);
                // let res: boolean = folder.load_parameters_from_buffer(buf);
                // if (res) {
                //     this.on_change_folder();
                // }
                // return res;
            });
        }

        // Miscellanous
        this._scriptInterface.addCallback('sparks_effect', (from: number, to: number): void => {
            // FIXME: check PiP mode and handle accordingly
            for (const pose of this._poses) {
                pose.praiseSequence(from, to);
            }
        });

        // Setters
        this._scriptInterface.addCallback('set_sequence_string', (seq: string): boolean => {
            const sequence: Sequence = Sequence.fromSequenceString(seq);
            if (sequence.findUndefined() >= 0 || sequence.findCut() >= 0) {
                log.info(`Invalid characters in ${seq}`);
                return false;
            }
            const prevForceSync = this.forceSync;
            this.forceSync = true;
            for (const pose of this._poses) {
                pose.pasteSequence(sequence);
            }
            this.forceSync = prevForceSync;
            this.moveHistoryAddSequence('paste', seq);
            return true;
        });

        this._scriptInterface.addCallback('set_tracked_indices',
            (
                marks: (number | { baseIndex: number; colors?: number | number[] })[],
                options?: { layerName?: string }
            ): void => {
                const standardizedMarks = marks.map(
                    (mark) => (typeof (mark) === 'number' ? {baseIndex: mark as number} : mark)
                );

                if (standardizedMarks.some((mark) => typeof (mark.baseIndex) !== 'number')) {
                    log.error(
                        "At least one mark object either doesn't have a `baseIndex` property or has a non-numeric one",
                        '- aborting'
                    );
                    return;
                }

                const layer = options?.layerName ?? SCRIPT_MARKER_LAYER;
                this.addMarkerLayer(layer);

                for (let ii = 0; ii < this.numPoseFields; ii++) {
                    const pose: Pose2D = this.getPose(ii);
                    pose.clearLayerTracking(layer);
                    for (const mark of standardizedMarks) {
                        pose.addBaseMark(mark.baseIndex, layer, mark.colors);
                    }
                }
            });

        this._scriptInterface.addCallback('set_design_title', (_designTitle: string): void => {
            log.info('TODO: set_design_title');
            // Application.instance.get_application_gui("Design Name").set_text(design_title);
            // Application.instance.get_application_gui("Design Name").visible = true;
            this.clearUndoStack();
            this.poseEditByTarget(0);
        });
    }

    public onKeyboardEvent(e: KeyboardEvent): void {
        let handled: boolean = this.keyboardInput.handleKeyboardEvent(e);

        if (!handled && e.type === KeyboardEventType.KEY_DOWN) {
            const key = e.code;
            const ctrl = e.ctrlKey;

            if (!ctrl && key === KeyCode.KeyN) {
                Eterna.settings.showNumbers.value = !Eterna.settings.showNumbers.value;
                handled = true;
            } else if (!ctrl && key === KeyCode.KeyR) {
                Eterna.settings.showRope.value = !Eterna.settings.showRope.value;
                handled = true;
            } else if (!ctrl && key === KeyCode.KeyG) {
                Eterna.settings.displayFreeEnergies.value = !Eterna.settings.displayFreeEnergies.value;
                handled = true;
            } else if (!ctrl && key === KeyCode.Comma) {
                Eterna.settings.simpleGraphics.value = !Eterna.settings.simpleGraphics.value;
                handled = true;
            } else if (!ctrl && key === KeyCode.KeyL) {
                Eterna.settings.usePuzzlerLayout.value = !Eterna.settings.usePuzzlerLayout.value;
                handled = true;
            } else if (ctrl && key === KeyCode.KeyZ) {
                this.moveUndoStackToLastStable();
                handled = true;
            } else if (ctrl && key === KeyCode.KeyS) {
                this.downloadSVG();
                handled = true;
            } else if (ctrl && key === KeyCode.KeyH) {
                this.downloadHKWS();
                handled = true;
            } else if (key === KeyCode.BracketLeft) {
                const factor = Math.max(0, Math.round((this._poseFields[0].explosionFactor - 0.25) * 1000) / 1000);
                for (const pf of this._poseFields) {
                    pf.explosionFactor = factor;
                }
                handled = true;
            } else if (key === KeyCode.BracketRight) {
                const factor = Math.max(0, Math.round((this._poseFields[0].explosionFactor + 0.25) * 1000) / 1000);
                for (const pf of this._poseFields) {
                    pf.explosionFactor = factor;
                }
                handled = true;
            }
        }

        if (handled) {
            e.stopPropagation();
        }
    }

    private reloadCurrentSolution(): void {
        if (this._params.solutions == null || this._params.solutions.length === 0) {
            // If we've deleted our current solution and there's none to replace it,
            // close the dialog
            if (this._solutionView) this.removeObject(this._solutionView);
            return;
        }

        // get sol at current index again, wrapped around.
        const newCurrentIdx = this._curSolutionIdx >= this._params.solutions.length
            ? 0
            : this._curSolutionIdx;

        const newSolution = this._params.solutions[newCurrentIdx];
        this.showSolution(newSolution);
        this.showSolutionDetailsDialog(newSolution);
    }

    private showNextSolution(indexOffset: number): void {
        if (this._params.solutions == null || this._params.solutions.length === 0) {
            return;
        }

        let nextSolutionIdx = (
            this._curSolutionIdx >= 0 ? this._curSolutionIdx + indexOffset : 0
        ) % this._params.solutions.length;
        if (nextSolutionIdx < 0) {
            nextSolutionIdx = this._params.solutions.length + nextSolutionIdx;
        }

        const solution = this._params.solutions[nextSolutionIdx];
        this.showSolution(solution);
        this.showSolutionDetailsDialog(solution);
        this._curSolutionIdx = nextSolutionIdx;
    }

    public showSolutionDetailsDialog(solution: Solution, forceShow: boolean = false): void {
        const visible = this._solutionView?.container.visible ?? false;
        if (this._solutionView) this.removeObject(this._solutionView);
        this._solutionView = new ViewSolutionOverlay({
            solution,
            puzzle: this._puzzle,
            voteDisabled: false,
            onPrevious: () => this.showNextSolution(-1),
            onNext: () => this.showNextSolution(1),
            parentMode: (() => this)()
        });
        this._solutionView.container.visible = visible || forceShow;
        this.addObject(this._solutionView, this.dialogLayer);

        this._solutionView.seeResultClicked.connect(() => {
            this.switchToFeedbackViewForSolution(solution);
        });
        this._solutionView.sortClicked.connect(() => this.switchToBrowser(solution, true));
        this._solutionView.returnClicked.connect(() => this.switchToBrowser(solution));
        this._solutionView.voteClicked.connect(() => this.vote(solution));
        this._solutionView.deleteClicked.connect(() => this.unpublish(solution));
    }

    /* override */
    public update(dt: number): void {
        // process queued asynchronous operations (folding)
        const startTime = new Date().getTime();
        let elapsed = 0;
        while (this._opQueue.length > 0 && elapsed < 50) { // FIXME: arbitrary
            // We can ! guard because we know _opQueue.length > 0
            const op = this._opQueue.shift();
            Assert.assertIsDefined(op);
            op.fn();
            if (op.sn) {
                this.showAsyncText(`folding ${op.sn} of ${this._targetPairs.length} (${this._opQueue.length})`);
            }

            elapsed = new Date().getTime() - startTime;
        }

        if (this._opQueue.length === 0) {
            this.hideAsyncText();
        }

        this._rscript.tick();

        super.update(dt);
    }

    public get isPlaying(): boolean {
        return this._isPlaying;
    }

    public showMissionScreen(doShow: boolean): void {
        this._showMissionScreen = doShow;
        if (doShow) {
            if (this._isPlaying) {
                this.showIntroScreen();
            }
        }
    }

    public showConstraints(doShow: boolean): void {
        this._overrideShowConstraints = doShow;
        if (this._constraintsLayer != null) {
            this._constraintsLayer.visible = this._constraintsLayer.visible && this._overrideShowConstraints;
        }
    }

    public get constraintCount(): number | null {
        return this._puzzle.constraints ? this._puzzle.constraints.length : null;
    }

    public getConstraintBox(i: number): ConstraintBox | null {
        return this._constraintBar.getConstraintBox(i);
    }

    public getShapeBox(i: number): ConstraintBox | null {
        return this._constraintBar.getShapeBox(i);
    }

    public setAncestorId(id: number): void {
        this._ancestorId = id;
    }

    /* override */
    protected onSetPip(pipMode: boolean): void {
        Eterna.settings.pipEnabled.value = pipMode;

        if (pipMode) {
            this._toolbar.stateToggle.display.visible = false;
            this._targetName.visible = false;

            this._constraintBar.highlightState(-1);
            this._constraintBar.layout();

            for (let ii = 0; ii < this._poses.length; ii++) {
                this.setPoseTarget(ii, ii);
            }

            if (this._poseState === PoseState.NATIVE) {
                this.setToNativeMode();
            } else if (this._poseState === PoseState.TARGET) {
                this.setToTargetMode();
            } else {
                this.setToFrozenMode();
            }

            const minZoom = Math.max(...this._poses.map(
                (pose) => pose.computeDefaultZoomLevel()
            ));

            for (const pose of this._poses) {
                pose.setZoomLevel(minZoom);
            }
        } else {
            this._toolbar.stateToggle.display.visible = true;
            this._targetName.visible = true;

            this._constraintBar.highlightState(this._curTargetIndex);
            this._constraintBar.layout();

            this.changeTarget(this._curTargetIndex);
            this._poses[0].setZoomLevel(this._poses[0].computeDefaultZoomLevel(), true, true);
        }
    }

    /* override */
    protected createContextMenu(): ContextMenu | null {
        if (this.isDialogOrNotifShowing || this.hasUILock) {
            return null;
        }

        const menu = new ContextMenu({horizontal: false});

        menu.addItem('Preferences').clicked.connect(() => this.showSettingsDialog());
        if (this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL) {
            menu.addItem('Design Browser').clicked.connect(() => this.openDesignBrowserForOurPuzzle());
            menu.addItem('Submit').clicked.connect(() => this.submitCurrentPose());
        }
        menu.addItem('Specs').clicked.connect(() => this.showSpec());

        menu.addItem('Reset').clicked.connect(() => this.showResetPrompt());
        menu.addItem('Copy Sequence').clicked.connect(() => this.showCopySequenceDialog());
        menu.addItem('Paste Sequence').clicked.connect(() => this.showPasteSequenceDialog());
        menu.addItem('Beam to PuzzleMaker').clicked.connect(() => this.transferToPuzzlemaker());

        return menu;
    }

    private openDesignBrowserForOurPuzzle(): void {
        if (this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL) {
            this.pushUILock();
            Eterna.app.switchToDesignBrowser(this._puzzle, this._params.solutions?.[this._curSolutionIdx], false)
                .then(() => this.popUILock())
                .catch((e) => {
                    log.error(e);
                    this.popUILock();
                });
        }
    }

    private createScreenshot(): ArrayBuffer {
        Assert.assertIsDefined(this.container);
        const visibleState: Map<DisplayObject, boolean> = new Map();
        const pushVisibleState = (disp: DisplayObject) => {
            visibleState.set(disp, disp.visible);
            disp.visible = false;
        };

        pushVisibleState(this.bgLayer);
        pushVisibleState(this.constraintsLayer);
        pushVisibleState(this.uiLayer);
        pushVisibleState(this.dialogLayer);
        pushVisibleState(this.achievementsLayer);
        const showingHint = this._hintBoxRef.isLive;
        this._hintBoxRef.destroyObject();

        const tempBG = DisplayUtil.fillStageRect(0x061A34);
        this.container.addChildAt(tempBG, 0);

        const info = `Player: ${Eterna.playerName}\n`
            + `Puzzle ID: ${this._puzzle.nodeID}\n`
            + `Puzzle Title: ${this._puzzle.getName()}\n`
            + `Mode: ${this.toolbar.naturalButton.isSelected ? 'NativeMode' : 'TargetMode'}`;
        const infoText = Fonts.std(info).color(0xffffff).build();
        this.container.addChild(infoText);

        const pngData = DisplayUtil.renderToPNG(this.container);

        tempBG.destroy({children: true});
        infoText.destroy({children: true});

        for (const [disp, wasVisible] of visibleState.entries()) {
            disp.visible = wasVisible;
        }

        if (showingHint) {
            const panel = new HintsPanel(this._puzzle.hint || '');
            this._hintBoxRef = this.addObject(panel, this.container);
        }

        return pngData;
    }

    private exitPuzzle(): void {
        this.showMissionClearedPanel(this._submitSolutionRspData);
    }

    private showResetPrompt(): void {
        const PROMPT = 'Do you really want to reset?\nResetting will clear your undo stack.';
        this.showConfirmDialog(PROMPT).closed.then((confirmed) => {
            if (confirmed) {
                this.resetAutosaveData();
                Assert.assertIsDefined(this.modeStack);
                this.modeStack.changeMode(new PoseEditMode(this._puzzle, {isReset: true}));
            }
        });
    }

    private changeTarget(targetIndex: number): void {
        this._curTargetIndex = targetIndex;

        this._constraintBar.highlightState(targetIndex);

        if (this._targetConditions[this._curTargetIndex] !== undefined) {
            const tc = this._targetConditions[this._curTargetIndex] as TargetConditions;
            if (tc['state_name'] !== undefined) {
                this._targetName.text = tc['state_name'];
            }
        }

        if (this._poseState === PoseState.NATIVE) {
            this.setToNativeMode();
        } else {
            this.setPoseTarget(0, this._curTargetIndex);
            this.setToTargetMode();
        }
    }

    private getForcedHighlights(targetIndex: number): number[] {
        const elems: number[] = [];

        if (this._targetConditions[targetIndex] === undefined) {
            return elems;
        }

        const tc = this._targetConditions[targetIndex] as TargetConditions;
        const maxLen: number = this._poses[targetIndex].sequence.length;
        for (let ii = 0; ii < this._poses.length; ii++) {
            if (ii === targetIndex || tc['force_struct'] == null) {
                continue;
            }

            let curr = 1;
            const forced: number[] = EPars.parenthesisToForcedArray(tc['force_struct']);
            let jj;
            for (jj = 0; jj < maxLen && jj < forced.length; jj++) {
                const _stat: number = (forced[jj] === EPars.FORCE_IGNORE ? 1 : 0);
                if ((curr ^ _stat) !== 0) {
                    elems.push(jj - _stat);
                    curr = _stat;
                }
            }
            if ((elems.length % 2) === 1) {
                elems.push(jj - 1);
            }
        }

        return elems;
    }

    private setPoseTarget(poseIndex: number, targetIndex: number): void {
        if (this._targetConditions[targetIndex] !== undefined) {
            const tc = this._targetConditions[targetIndex] as TargetConditions;
            this._poses[poseIndex].sequence = this._puzzle.transformSequence(
                this._poses[targetIndex].sequence, targetIndex
            );
            const tcType: TargetType = tc['type'];

            if (tcType === 'multistrand') {
                if (tc['oligos'] !== undefined) {
                    this._poses[poseIndex].setOligos(tc['oligos'].map((odef) => ({
                        sequence: Sequence.fromSequenceString(odef.sequence).baseArray,
                        malus: odef.malus,
                        name: odef.name
                    })));
                }
            } else {
                this._poses[poseIndex].setOligos(undefined);
            }

            if (Puzzle.isOligoType(tcType)) {
                const foldMode: number = tc['fold_mode'] === undefined
                    ? OligoMode.DIMER
                    : Number(tc['fold_mode']);
                this._poses[poseIndex].setOligo(
                    Sequence.fromSequenceString(tc['oligo_sequence'] as string).baseArray,
                    foldMode,
                    tc['oligo_name']
                );
                this._poses[poseIndex].oligoMalus = tc['malus'] as number;
            } else {
                this._poses[poseIndex].setOligo(undefined);
            }

            if (Puzzle.isAptamerType(tcType)) {
                this._poses[poseIndex].setMolecularBinding(
                    tc['site'],
                    tc['binding_pairs'],
                    tc['bonus'] as number / 100.0
                );
            } else {
                this._poses[poseIndex].setMolecularBinding(undefined, undefined, undefined);
            }

            let forcedStruct: number[] | null = null;
            if (tc['force_struct'] !== undefined) {
                forcedStruct = EPars.parenthesisToForcedArray(tc['force_struct']);
            }
            this._poses[poseIndex].forcedStruct = forcedStruct;
            this._poses[poseIndex].structConstraints = tc['structure_constraints'];
        } else {
            this._poses[poseIndex].setMolecularBinding(undefined, undefined, 0);
            this._poses[poseIndex].forcedStruct = null;
            this._poses[poseIndex].structConstraints = undefined;
            this._poses[poseIndex].setOligos(undefined);
            this._poses[poseIndex].setOligo(undefined);
        }
        this._poses[poseIndex].forcedHighlights = this.getForcedHighlights(targetIndex);

        if (this._puzzle.nodeID === PuzzleID.TheophyllineRibozymeSwitch) {
            const annotation: AnnotationData = {
                id: 5000549,
                type: AnnotationHierarchyType.ANNOTATION,
                category: AnnotationCategory.PUZZLE,
                timestamp: (new Date()).getTime(),
                playerID: 12345,
                title: 'Ribozyme cleaving site',
                ranges: [{
                    start: 28,
                    end: 28
                }],
                positions: [],
                children: []
            };
            if (targetIndex === 1) {
                this._annotationManager.deleteAnnotation(annotation);
            } else {
                this._annotationManager.addAnnotation(annotation);
            }
        }
    }

    private savePosesMarkersContexts(): void {
        for (const pose of this._poses) {
            pose.saveMarkersContext();
        }
    }

    private transformPosesMarkers(): void {
        for (const pose of this._poses) {
            pose.transformMarkers();
        }
    }

    private setToNativeMode(): void {
        this._poseState = PoseState.NATIVE;

        this._toolbar.targetButton.toggled.value = false;
        this._toolbar.naturalButton.toggled.value = true;

        this._toolbar.targetButton.hotkey(KeyCode.Space);
        this._toolbar.naturalButton.hotkey();

        this.savePosesMarkersContexts();
        this._paused = false;
        this.updateScore();
        this.transformPosesMarkers();
    }

    private setToTargetMode(): void {
        this._poseState = PoseState.TARGET;

        this._toolbar.targetButton.toggled.value = true;
        this._toolbar.naturalButton.toggled.value = false;

        this._toolbar.naturalButton.hotkey(KeyCode.Space);
        this._toolbar.targetButton.hotkey();

        this.savePosesMarkersContexts();

        if (this._isPipMode) {
            for (let ii = 0; ii < this._poses.length; ii++) {
                this._poses[ii].setOligos(this._targetOligos[ii], this._targetOligosOrder[ii]);
                this._poses[ii].setOligo(this._targetOligo[ii], this._oligoMode[ii], this._oligoName[ii]);
                this._poses[ii].secstruct = this._targetPairs[ii];
                if (this._targetConditions != null && this._targetConditions[ii] !== undefined) {
                    const tc = this._targetConditions[ii] as TargetConditions;
                    this._poses[ii].structConstraints = tc['structure_constraints'];
                }
            }
        } else {
            this._poses[0].setOligos(
                this._targetOligos[this._curTargetIndex], this._targetOligosOrder[this._curTargetIndex]
            );
            this._poses[0].setOligo(
                this._targetOligo[this._curTargetIndex],
                this._oligoMode[this._curTargetIndex],
                this._oligoName[this._curTargetIndex]
            );
            this._poses[0].secstruct = this._targetPairs[this._curTargetIndex];
            if (this._targetConditions != null && this._targetConditions[this._curTargetIndex] !== undefined) {
                const tc = this._targetConditions[this._curTargetIndex] as TargetConditions;
                const newConstraints = tc['structure_constraints'];
                this._poses[0].structConstraints = newConstraints;
            }
        }

        this._paused = true;
        this.updateScore();
        this.transformPosesMarkers();
    }

    private togglePoseState(): void {
        if (this._poseState === PoseState.TARGET) {
            this.setToNativeMode();
        } else if (this._poseState === PoseState.NATIVE) {
            this.setToTargetMode();
        } else {
            throw new Error('Invalid pose state');
        }
    }

    private toggleFreeze(): void {
        this._isFrozen = !this._isFrozen;

        this._constraintsLayer.alpha = (this._isFrozen ? 0.25 : 1.0);
        this.setShowTotalEnergy(!this._isFrozen);

        this._toolbar.undoButton.enabled = !this._isFrozen;
        this._toolbar.redoButton.enabled = !this._isFrozen;
        this._toolbar.freezeButton.toggled.value = this._isFrozen;

        if (!this._isFrozen) { // we just "thawed", update
            this.poseEditByTarget(this._curTargetIndex);
        }

        this._background.freezeBackground(this._isFrozen);
    }

    // / This mode is strictly for internal use, not to be used by users
    private setToFrozenMode(): void {
        this._poseState = PoseState.FROZEN;
        this._paused = true;
        this.updateScore();
    }

    private onChangeFolder(): void {
        this.clearUndoStack();
        this.poseEditByTarget(0);
        for (const pose of this._poses) {
            pose.updateHighlightsAndScores();
        }
    }

    private ropPresets(): void {
        while (this._ropPresets.length) {
            const func = this._ropPresets.pop();
            Assert.assertIsDefined(func);
            func();
        }
    }

    private showSpec(): void {
        this._dockedSpecBox.display.visible = false;

        this.updateCurrentBlockWithDotAndMeltingPlot();
        const puzzleState = this.getCurrentUndoBlock();

        const dialog = this.showDialog(new SpecBoxDialog(puzzleState));
        dialog.closed.then((showDocked) => {
            if (showDocked) {
                this._dockedSpecBox.setSpec(puzzleState);
                this._dockedSpecBox.display.visible = true;
            }
        });
    }

    private updateDockedSpecBox(): void {
        if (this._dockedSpecBox.display.visible) {
            this.updateCurrentBlockWithDotAndMeltingPlot();
            const datablock: UndoBlock = this.getCurrentUndoBlock();
            this._dockedSpecBox.setSpec(datablock);
        }
    }

    private updateCurrentBlockWithDotAndMeltingPlot(index: number = -1): void {
        const datablock: UndoBlock = this.getCurrentUndoBlock(index);
        if (this._folder && this._folder.canDotPlot && datablock.sequence.length < 500) {
            if (this._targetConditions && this._targetConditions[0]
                && this._targetConditions[0]['type'] === 'pseudoknot') {
                datablock.updateMeltingPointAndDotPlot(true);
            } else {
                datablock.updateMeltingPointAndDotPlot();
            }
        }
    }

    private submitCurrentPose(): void {
        if (this._puzzle.puzzleType !== PuzzleType.EXPERIMENTAL) {
            // / Always submit the sequence in the first state
            const solToSubmit: UndoBlock = this.getCurrentUndoBlock(0);
            this.submitSolution({
                title: 'Cleared Solution',
                comment: 'No comment',
                annotations: this._annotationManager.categoryAnnotationData(AnnotationCategory.SOLUTION),
                libraryNT: this._poses[0].librarySelections ?? []
            }, solToSubmit);
        } else {
            const NOT_SATISFIED_PROMPT = 'Puzzle constraints are not satisfied.\n'
                + 'You can still submit the sequence, but please note that there is a risk of not getting\n'
                + 'synthesized properly';

            if (!this.checkConstraints()) {
                // If we pass constraints when taking into account soft constraints, just prompt
                if (this.checkConstraints(this._puzzle.isSoftConstraint || Eterna.DEV_MODE)) {
                    this.showConfirmDialog(NOT_SATISFIED_PROMPT).closed
                        .then((confirmed) => {
                            if (confirmed) {
                                this.promptForExperimentalPuzzleSubmission();
                            }
                        });
                } else {
                    this.showNotification("You didn't satisfy all requirements!");
                }
            } else {
                this.promptForExperimentalPuzzleSubmission();
            }
        }
    }

    private promptForExperimentalPuzzleSubmission(): void {
        // / Generate dot and melting plot data
        this.updateCurrentBlockWithDotAndMeltingPlot();

        // / Generate dot and melting plot data
        const datablock: UndoBlock = this.getCurrentUndoBlock();
        if (datablock.getParam(UndoBlockParam.DOTPLOT_BITMAP) == null) {
            this.updateCurrentBlockWithDotAndMeltingPlot();
        }

        const initScore: number = datablock.getParam(UndoBlockParam.PROB_SCORE, 37) as number;

        let meltpoint = 107;
        for (let ii = 47; ii < 100; ii += 10) {
            const currentScore: number = datablock.getParam(UndoBlockParam.PROB_SCORE, ii) as number;
            if (currentScore < initScore * 0.5) {
                meltpoint = ii;
                break;
            }
        }

        datablock.setParam(UndoBlockParam.MELTING_POINT, meltpoint, 37);

        const dialog = new SubmitPoseDialog(this._savedInputs);
        dialog.saveInputs.connect((e) => {
            this._savedInputs = e;
        });

        this.showDialog(dialog).closed.then((submitDetails) => {
            if (submitDetails != null) {
                // / Always submit the sequence in the first state
                this.updateCurrentBlockWithDotAndMeltingPlot(0);
                const solToSubmit: UndoBlock = this.getCurrentUndoBlock(0);
                submitDetails.annotations = this._annotationManager.categoryAnnotationData(
                    AnnotationCategory.SOLUTION
                );
                this.submitSolution(submitDetails, solToSubmit);
            }
        });
    }

    /** Creates solution-submission data for shipping off to the server */
    private createSubmitData(details: SubmitPoseDetails, undoBlock: UndoBlock): SubmitSolutionData {
        if (!details.title || details.title.length === 0) {
            details.title = 'Default title';
        }

        if (!details.comment || details.comment.length === 0) {
            details.comment = 'No comment';
        }

        const postData: SubmitSolutionData = {};

        if (this._puzzle.puzzleType !== PuzzleType.EXPERIMENTAL) {
            const nextPuzzle: number = this._puzzle.nextPuzzleID;

            if (nextPuzzle > 0) {
                postData['next-puzzle'] = nextPuzzle;
            } else {
                postData['recommend-puzzle'] = true;
            }

            postData['pointsrank'] = true;
        } else if (this._ancestorId > 0) {
            // is experimental
            postData['ancestor-id'] = this._ancestorId;
        }

        const elapsed: number = (new Date().getTime() - this._startSolvingTime) / 1000;
        const moveHistory: MoveHistory = {
            beginFrom: this._startingPoint,
            numMoves: this._moveCount,
            moves: this._moves.slice(),
            elapsed: elapsed.toFixed(0)
        };
        postData['move-history'] = JSON.stringify(moveHistory);

        const newlinereg = new RegExp('/"/g');
        details.comment = details.comment.replace(newlinereg, "'");
        details.title = details.title.replace(newlinereg, "'");

        const seqString: string = this._puzzle.transformSequence(undoBlock.sequence, 0).sequenceString();

        postData['title'] = details.title;
        postData['energy'] = undoBlock.getParam(UndoBlockParam.FE) as number / 100.0;
        postData['puznid'] = this._puzzle.nodeID;
        postData['sequence'] = seqString;
        postData['repetition'] = undoBlock.getParam(UndoBlockParam.REPETITION) as number;
        postData['gu'] = undoBlock.getParam(UndoBlockParam.GU) as number;
        postData['gc'] = undoBlock.getParam(UndoBlockParam.GC) as number;
        postData['ua'] = undoBlock.getParam(UndoBlockParam.AU) as number;
        postData['body'] = details.comment;
        if (details.annotations) {
            postData['annotations'] = JSON.stringify(details.annotations);
        }

        if (this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL) {
            postData['melt'] = undoBlock.getParam(UndoBlockParam.MELTING_POINT) as number;

            if (this._foldTotalTime >= 1000.0) {
                const fd: FoldData[] = [];
                for (let ii = 0; ii < this._poses.length; ii++) {
                    fd.push(this.getCurrentUndoBlock(ii).toJSON());
                }
                postData['fold-data'] = JSON.stringify(fd);
            }

            // Record designStruct numbers, used for library puzzles.
            postData['selected-nts'] = this._poses[0].librarySelections;
        }

        return postData;
    }

    private async submitSolution(details: SubmitPoseDetails, undoBlock: UndoBlock): Promise<void> {
        if (this._puzzle.nodeID < 0) {
            return;
        }

        let submittingRef: GameObjectRef = GameObjectRef.NULL;
        let fxComplete: Promise<void> | null = null;

        if (this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL) {
            // Show a "Submitting now!" dialog
            submittingRef = this.showDialog(new SubmittingDialog()).ref;
            fxComplete = Promise.resolve();
        } else {
            this._alreadyCleared = true;
            if (!this._puzzle.alreadySolved || this._puzzle.rscript !== '') {
                // Kick off a BubbleSweep animation
                const bubbles = new BubbleSweep(800);
                this.addObject(bubbles, this.bgLayer);
                bubbles.start();

                // Show an explosion animation
                this.disableTools(true);

                Flashbang.sound.playSound(Sounds.SoundPuzzleClear);
                for (const pose of this._poses) {
                    pose.setZoomLevel(0, true, true);
                    const p = pose.startExplosion();
                    if (fxComplete != null) continue;

                    fxComplete = p.then(() => {
                        bubbles.decay();
                        bubbles.addObject(new SerialTask(
                            new AlphaTask(0, 5, Easing.easeIn),
                            new SelfDestructTask()
                        ));

                        for (const poseFieldToClear of this._poseFields) {
                            poseFieldToClear.showTotalEnergy = false;
                        }
                        for (const poseExplosion of this._poses) {
                            poseExplosion.clearExplosion();
                        }

                        this._constraintsLayer.visible = false;
                    });
                }
            }
        }

        let data: SubmitSolutionData;

        if (
            !this._puzzle.alreadySolved
            || this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL
            || this._puzzle.rscript !== ''
        ) {
            // submit our solution to the server
            log.debug('Submitting solution...');
            const submissionPromise = Eterna.client.submitSolution(this.createSubmitData(details, undoBlock));

            // Wait for explosion completion
            await fxComplete;

            // Wait for the submission to the server, and for the mode to be active.
            // 'waitTillActive' is probably not necessary in practice, but if another mode is pushed onto this one
            // during submission, we want to wait till we're the top-most mode before executing more view logic.
            const allResults = await Promise.all([submissionPromise, this.waitTillActive()]);

            // 'allResults' contains the results of our submission, and the "waitTillActive" void promise
            const submissionResponse = allResults[0];

            // show achievements, if we were awarded any
            const cheevs: { [name: string]: AchievementData } = submissionResponse['new_achievements'];
            if (cheevs != null) {
                await this._achievements.awardAchievements(cheevs);
            }

            submittingRef.destroyObject();
            data = submissionResponse['data'];
            if (this._puzzle.puzzleType !== PuzzleType.EXPERIMENTAL) {
                this.showMissionClearedPanel(data);
            }
        } else {
            this.showMissionClearedPanel(null, true);
            return;
        }

        const seqString = this._puzzle.transformSequence(undoBlock.sequence, 0).sequenceString;

        if (data['error'] !== undefined) {
            log.debug(`Got solution submission error: ${data['error']}`);
            if (data['error'].indexOf('barcode') >= 0) {
                const dialog = this.showNotification(data['error'], 'More Information');
                dialog.extraButton.clicked.connect(() => window.open(EternaURL.BARCODE_HELP, '_blank'));
                const hairpin: string | null = EPars.getBarcodeHairpin(seqString());
                if (hairpin != null) {
                    SolutionManager.instance.addHairpins([hairpin]);
                    this.checkConstraints();
                }
            } else {
                this.showNotification(data['error']);
            }
        } else {
            log.debug('Solution submitted');

            if (data['solution-id'] !== undefined) {
                this.setAncestorId(data['solution-id']);
            }

            if (this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL
                && this._puzzle.useBarcode
                && EPars.getBarcodeHairpin(seqString()) !== null) {
                SolutionManager.instance.addHairpins([EPars.getBarcodeHairpin(seqString()) as string]);
                this.checkConstraints();
            }
        }
    }

    private showMissionClearedPanel(submitSolutionRspData: SubmitSolutionData | null, onlyShowArrow = false): void {
        this._submitSolutionRspData = submitSolutionRspData;

        // Hide some UI
        this.disableTools(true);
        this._constraintsLayer.visible = false;
        this._exitButton.display.visible = false;
        this._helpBar.display.visible = false;
        for (const poseField of this._poseFields) {
            poseField.showTotalEnergy = false;
        }
        Eterna.chat.pushHideChat();

        // Show the panel
        const boostersData = this._puzzle.boosters;
        const infoText: string | null = (boostersData && boostersData.mission_cleared)
            ? boostersData.mission_cleared['info']
            : null;
        const moreText: string | null = (boostersData && boostersData.mission_cleared)
            ? boostersData.mission_cleared['more']
            : null;

        const nextPuzzleData: PuzzleJSON | number | null | undefined = submitSolutionRspData?.['next-puzzle'];

        // For some reason the backend returns 0 in the progression instead of just null
        // when we want to redirect back to the homepage...? I imagine we should change that
        // at some point
        const hasNextPuzzle = nextPuzzleData !== null && nextPuzzleData !== 0;

        let missionClearedPanel: MissionClearedPanel | null = new MissionClearedPanel(
            hasNextPuzzle, infoText, moreText
        );
        missionClearedPanel.display.alpha = 0;
        missionClearedPanel.addObject(new AlphaTask(1, 0.3));
        this.addObject(missionClearedPanel, this.dialogLayer);
        if (submitSolutionRspData) missionClearedPanel.createRankScroll(submitSolutionRspData);

        const keepPlaying = () => {
            if (missionClearedPanel === null) return;
            Eterna.chat.popHideChat();

            missionClearedPanel.destroySelf();
            missionClearedPanel = null;

            // Restore UI
            this._constraintsLayer.visible = true;
            this.disableTools(false);

            for (const poseField of this._poseFields) {
                poseField.showTotalEnergy = true;
            }

            this._exitButton.display.alpha = 0;
            this._exitButton.display.visible = true;
            this._exitButton.addObject(new AlphaTask(1, 0.3));

            this._helpBar.display.visible = true;
        };

        if (hasNextPuzzle) {
            // Don't just await here nor initialize the call in the nextButton callback
            // so that we can load in the background
            const nextPuzzlePromise = nextPuzzleData
                ? PuzzleManager.instance.parsePuzzle(nextPuzzleData as PuzzleJSON)
                : PuzzleManager.instance.getPuzzleByID(this._puzzle.nextPuzzleID);
            nextPuzzlePromise.then((puzzle) => log.info(`Loaded next puzzle [id=${puzzle.nodeID}]`));

            missionClearedPanel.nextButton.clicked.connect(async () => {
                try {
                    this._rscript.finishLevel();
                    const nextPuzzle = await nextPuzzlePromise;
                    Eterna.chat.popHideChat();
                    Assert.assertIsDefined(this.modeStack);
                    this.modeStack.changeMode(new PoseEditMode(nextPuzzle, {}));
                    const oldURL = window.location.toString();
                    const newURL = Eterna.DEV_MODE
                        ? oldURL.replace(/puzzle=\d+?$/, `puzzle=${nextPuzzle.nodeID}`)
                        : oldURL.replace(/\d+(\/?)$/, `${nextPuzzle.nodeID.toString()}$1`);
                    // eslint-disable-next-line no-restricted-globals
                    if (!Eterna.MOBILE_APP) history.pushState(null, '', newURL);
                } catch (err) {
                    log.error(err);
                    throw new Error(`Failed to load next puzzle - ${err}`);
                }
            });
        } else {
            missionClearedPanel.nextButton.clicked.connect(() => {
                keepPlaying();
                if (Eterna.MOBILE_APP) {
                    if (window.frameElement) {
                        window.frameElement.dispatchEvent(new CustomEvent('navigate', {detail: '/'}));
                    }
                } else {
                    window.open(EternaURL.getFeedURL(), '_self');
                }
            });
        }
        missionClearedPanel.closeButton.clicked.connect(() => keepPlaying());
        if (onlyShowArrow) {
            keepPlaying();
        }
    }

    private switchToFeedbackViewForSolution(solution: Solution): void {
        this.pushUILock();

        Eterna.app.switchToFeedbackView(this._puzzle, solution, this._params.solutions)
            .then(() => this.popUILock())
            .catch((e) => {
                log.error(e);
                this.popUILock();
            });
    }

    public setPosesColor(paintColor: RNABase | RNAPaint): void {
        if (this._pose3D) this._pose3D.currentColor = paintColor;
        for (const pose of this._poses) {
            pose.currentColor = paintColor;
        }
    }

    public setPosesLayoutTool(layoutTool: Layout): void {
        for (const pose of this._poses) {
            pose.currentArrangementTool = layoutTool;
        }
    }

    private disableTools(disable: boolean): void {
        this._toolbar.disableTools(disable);
        this._hintBoxRef.destroyObject();

        this._folderSwitcher.display.visible = !disable;

        for (const field of this._poseFields) {
            field.container.interactive = !disable;
            field.container.interactiveChildren = !disable;
        }

        if (disable) {
            for (const pose of this._poses) {
                pose.clearMouse();
            }
        }
    }

    private startCountdown(): void {
        this._isPlaying = false;

        const constraints = this._puzzle.constraints;
        if (constraints == null || constraints.length === 0 || !this._showMissionScreen) {
            this.startPlaying();
        } else {
            this._startSolvingTime = new Date().getTime();
            this.startPlaying();
            this.showIntroScreen();

            // Fast-forward the intro-animation before mission screen
            for (const pose of this._poses) {
                pose.setAnimationProgress(1);
            }
        }
    }

    private showIntroScreen() {
        this.hideAsyncText();

        let missionText = this._puzzle.missionText;
        const boosters: BoostersData | null = this._puzzle.boosters;
        if (boosters && boosters.mission != null) {
            missionText = boosters.mission['text'];
        }

        const introConstraintBoxes: ConstraintBox[] = this._puzzle.constraints
            ? this._puzzle.constraints.filter(
                (constraint) => !(constraint instanceof ShapeConstraint || constraint instanceof AntiShapeConstraint)
            ).map(
                (constraint) => {
                    const box = new ConstraintBox(true, this._puzzle.getSecstructs().length);
                    box.setContent(constraint.getConstraintBoxConfig(
                        constraint.evaluate({
                            undoBlocks: this._seqStacks[this._stackLevel],
                            targetConditions: this._targetConditions,
                            puzzle: this._puzzle
                        }),
                        true,
                        this._seqStacks[this._stackLevel],
                        this._targetConditions
                    ));
                    return box;
                }
            )
            : [];

        const customLayout: Array<[number, number] | [null, null]> | undefined = (
            (this._targetConditions && this._targetConditions[0])
                ? this._targetConditions[0]['custom-layout'] : undefined
        );
        Assert.assertIsDefined(this.modeStack);
        this.modeStack.pushMode(new MissionIntroMode(
            this._puzzle.getName(!Eterna.MOBILE_APP),
            missionText,
            this._targetPairs,
            introConstraintBoxes,
            customLayout
        ));
    }

    private startPlaying(): void {
        this._isPlaying = true;
        this.disableTools(false);

        this._constraintBar.display.visible = true;
        this._constraintBar.layout();
    }

    private resetAutosaveData(): void {
        Eterna.saveManager.remove(this.savedDataTokenName);
    }

    private saveData(): void {
        if (this._puzzle.puzzleType === PuzzleType.BASIC) {
            return;
        }

        if (this._stackLevel < 1) {
            return;
        }

        const objs: SaveStoreItem = [
            0,
            this._seqStacks[this._stackLevel][0].sequence.baseArray
        ];
        for (let ii = 0; ii < this._poses.length; ++ii) {
            objs.push(JSON.stringify({
                undoBlock: this._seqStacks[this._stackLevel][ii].toJSON(),
                annotations: this._annotationManager.createAnnotationBundle()
            }));
        }

        Eterna.saveManager.save(this.savedDataTokenName, objs);
    }

    public static savedDataTokenName(puzzleID: number): string {
        return `puz_${puzzleID}`;
    }

    private get savedDataTokenName(): string {
        return PoseEditMode.savedDataTokenName(this._puzzle.nodeID);
    }

    private transferToPuzzlemaker(): void {
        const poseData: SaveStoreItem = [0, this._poses[0].sequence.baseArray];
        for (const [i, pose] of this._poses.entries()) {
            const tc = this._targetConditions[i];
            const ublk = this.getCurrentUndoBlock(i);
            const pseudoknots = tc !== undefined && tc.type === 'pseudoknot';

            const puzzledef: PuzzleEditPoseData = {
                sequence: pose.sequence.sequenceString(),
                structure: (
                    this._poseState === PoseState.TARGET ? ublk.targetPairs : ublk.getPairs(37, pseudoknots)
                ).getParenthesis(),
                startingFolder: this._folder.name,
                annotations: this._annotationManager.createAnnotationBundle()
            };
            if (tc !== undefined && Puzzle.isAptamerType(tc['type'])) {
                puzzledef.site = tc['site'];
                puzzledef.bindingPairs = tc['binding_pairs'];
                puzzledef.bonus = tc['bonus'];
            }

            poseData.push(JSON.stringify(puzzledef));
        }

        Eterna.app.loadPuzzleEditor(1, poseData)
            .catch((err) => Eterna.onFatalError(err));
    }

    private loadSavedData(): boolean {
        if (this._puzzle.puzzleType === PuzzleType.BASIC) {
            return false;
        }

        const beginningSequence: Sequence = this._puzzle.getBeginningSequence();
        const locks: boolean[] = this._puzzle.puzzleLocks;
        let oligoLen = 0;

        if (this._targetConditions[0] && Puzzle.isOligoType(this._targetConditions[0]['type'])) {
            oligoLen = (this._targetConditions[0]['oligo_sequence'] as string).length;
            if (Number(this._targetConditions[0]['fold_mode']) === OligoMode.DIMER) oligoLen++;
        } else if (this._targetConditions[0] && this._targetConditions[0]['type'] === 'multistrand') {
            const oligos: OligoDef[] = this._targetConditions[0]['oligos'] as OligoDef[];
            for (const oligo of oligos) {
                oligoLen += (oligo['sequence'].length + 1);
            }
        }

        if (
            beginningSequence.length !== locks.length
            || (beginningSequence.length + oligoLen) !== this._targetPairs[0].length
        ) {
            return false;
        }
        this.clearUndoStack();

        const saveStoreItem: SaveStoreItem | null = this._autosaveData;
        // no saved data
        if (saveStoreItem == null) {
            // if (this.root.loaderInfo.parameters.inputsequence != null) {
            //     a = EPars.string_to_sequence_array(this.root.loaderInfo.parameters.inputsequence);
            // } else {
            //     return false;
            // }
            return false;
        }

        const a: number[] = saveStoreItem[1];
        const savedAnnotations: (AnnotationDataBundle | null)[] = Array(this._poses.length).fill(null);
        // AMW: this suggests it knows the iteration is from all-but-first-two
        // meaning this is a save datum thing. [number, number[], ...string[]]
        for (let ii = 0; ii < this._poses.length; ++ii) {
            if (saveStoreItem[ii + 2] != null) {
                const undoBlock: UndoBlock = new UndoBlock(new Sequence([]), '');
                try {
                    const saveData = JSON.parse(saveStoreItem[ii + 2] as string);
                    if (saveData.undoBlock) {
                        const pose: FoldData = saveData.undoBlock;
                        savedAnnotations[ii] = saveData.annotations;
                        undoBlock.fromJSON(pose);
                    } else {
                        // Old format before annotations were introduced
                        const pose: FoldData = saveData;
                        undoBlock.fromJSON(pose);
                    }
                } catch (e) {
                    log.error('Error loading saved puzzle data', e);
                    return false;
                }

                // / JEEFIX : Don't override secstruct from autoload without checking whther the puzzle can vary length.
                // / KWSFIX : Only allow when shiftable mode (=> shift_limit = 0)

                if (this._puzzle.shiftLimit === 0 && undoBlock.targetPairs.length !== this._targetPairs[ii].length) {
                    return false;
                }

                this._targetPairs[ii] = undoBlock.targetPairs;
                this._targetOligosOrder[ii] = undoBlock.targetOligoOrder;

                this.setPosesWithUndoBlock(ii, undoBlock);
            }
        }

        if ((a.length + oligoLen) !== this._targetPairs[0].length) {
            return false;
        }

        for (let ii = 0; ii < this._targetPairs[0].length; ii++) {
            if (locks[ii]) {
                a[ii] = beginningSequence.nt(ii);
            }
        }

        for (let ii = 0; ii < this._poses.length; ii++) {
            this._poses[ii].sequence = this._puzzle.transformSequence(new Sequence(a), ii);
            this._poses[ii].puzzleLocks = locks;

            const annotations: AnnotationDataBundle | null = savedAnnotations[ii];
            if (annotations) {
                // Don't load puzzle annotations, as we want to use the up-to-date ones from
                // the current puzzle definition in case they changed
                this._annotationManager.setSolutionAnnotations(annotations.solution);
            }
        }
        this.poseEditByTarget(0);
        return true;
    }

    private clearMoveTracking(seq: string): void {
        // move-tracking
        this._startingPoint = seq;
        this._moveCount = 0;
        this._moves = [];
    }

    private moveHistoryAddMutations(before: Sequence, after: Sequence): void {
        const muts: Move[] = [];
        for (let ii = 0; ii < after.length; ii++) {
            if (after.nt(ii) !== before.nt(ii)) {
                muts.push({pos: ii + 1, base: EPars.nucleotideToString(after.nt(ii))});
            }
        }
        if (muts.length === 0) return;
        this._moveCount++;
        this._moves.push(muts.slice());
    }

    private moveHistoryAddSequence(changeType: string, seq: string): void {
        const muts: Move[] = [];
        muts.push({type: changeType, sequence: seq});
        this._moveCount++;
        this._moves.push(muts.slice());
    }

    private setPuzzleEpilog(initSeq: Sequence | null, isReset: boolean | undefined): void {
        if (isReset) {
            const newSeq: Sequence = this._puzzle.transformSequence(this.getCurrentUndoBlock(0).sequence, 0);
            this.moveHistoryAddSequence('reset', newSeq.sequenceString());
        } else {
            this._startSolvingTime = new Date().getTime();
            this._startingPoint = this._puzzle.transformSequence(
                this.getCurrentUndoBlock(0).sequence, 0
            ).sequenceString();
        }

        if (isReset) {
            this.startPlaying();
        } else if (initSeq == null) {
            this.startCountdown();
        } else if (this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL) {
            // / Given init sequence (solution) in the lab, don't show mission animation - go straight to game
            this.startPlaying();
        } else {
            this.startCountdown();
        }

        this.setPip(Eterna.settings.pipEnabled.value);

        this.ropPresets();
    }

    private checkConstraints(soft: boolean = false): boolean {
        return this._constraintBar.updateConstraints({
            undoBlocks: this._seqStacks[this._stackLevel],
            targetConditions: this._targetConditions,
            puzzle: this._puzzle
        }, soft);
    }

    private updateScore(): void {
        this.saveData();
        // let dn: GameObject = (<GameObject>Application.instance.get_application_gui("Design Name"));
        // if (dn != null) dn.visible = (this._stack_level === 0);

        const undoBlock: UndoBlock = this.getCurrentUndoBlock();
        const pseudoknots: boolean = (
            this._targetConditions
            && this._targetConditions[this._curTargetIndex] !== undefined
            && (this._targetConditions[this._curTargetIndex] as TargetConditions).type === 'pseudoknot'
        );

        if (!this._paused) {
            for (let ii = 0; ii < this._poses.length; ii++) {
                if (ii === 0 && this._poseState === PoseState.NATIVE && !this._isPipMode) {
                    this._poses[0].setOligos(this.getCurrentUndoBlock().targetOligos,
                        this.getCurrentUndoBlock().oligoOrder,
                        this.getCurrentUndoBlock().oligosPaired);
                    this._poses[0].setOligo(this.getCurrentUndoBlock().targetOligo,
                        this.getCurrentUndoBlock().oligoMode,
                        this.getCurrentUndoBlock().oligoName);
                    this._poses[0].secstruct = this.getCurrentUndoBlock().getPairs(37, pseudoknots);
                    this._poses[0].structConstraints = (
                        this._targetConditions?.[this._curTargetIndex]?.['structure_constraints']
                    );
                    continue;
                }
                this._poses[ii].setOligos(this.getCurrentUndoBlock(ii).targetOligos,
                    this.getCurrentUndoBlock(ii).oligoOrder,
                    this.getCurrentUndoBlock(ii).oligosPaired);
                this._poses[ii].setOligo(this.getCurrentUndoBlock(ii).targetOligo,
                    this.getCurrentUndoBlock(ii).oligoMode,
                    this.getCurrentUndoBlock(ii).oligoName);
                this._poses[ii].secstruct = this.getCurrentUndoBlock(ii).getPairs(37, pseudoknots);
                this._poses[ii].structConstraints = (
                    this._targetConditions?.[ii]?.['structure_constraints']
                );
            }
        } else {
            for (let ii = 0; ii < this._poses.length; ++ii) {
                if (ii === 0 && this._poseState === PoseState.TARGET && !this._isPipMode) {
                    this._poses[0].setOligos(this.getCurrentUndoBlock().targetOligos,
                        this.getCurrentUndoBlock().targetOligoOrder,
                        this.getCurrentUndoBlock().oligosPaired);
                    this._poses[0].setOligo(this.getCurrentUndoBlock().targetOligo,
                        this.getCurrentUndoBlock().oligoMode,
                        this.getCurrentUndoBlock().oligoName);
                    this._poses[0].secstruct = this.getCurrentUndoBlock().targetPairs;
                    this._poses[0].structConstraints = (
                        this._targetConditions?.[this._curTargetIndex]?.['structure_constraints']
                    );
                    this._targetOligos[0] = this.getCurrentUndoBlock(0).targetOligos;
                    this._targetOligosOrder[0] = this.getCurrentUndoBlock(0).targetOligoOrder;
                    this._targetOligo[0] = this.getCurrentUndoBlock(0).targetOligo;
                    this._oligoMode[0] = this.getCurrentUndoBlock(0).oligoMode;
                    this._oligoName[0] = this.getCurrentUndoBlock(0).oligoName;
                    this._targetPairs[0] = this.getCurrentUndoBlock(0).targetPairs;
                    continue;
                }
                this._targetOligos[ii] = this.getCurrentUndoBlock(ii).targetOligos;
                this._targetOligosOrder[ii] = this.getCurrentUndoBlock(ii).targetOligoOrder;
                this._targetOligo[ii] = this.getCurrentUndoBlock(ii).targetOligo;
                this._oligoMode[ii] = this.getCurrentUndoBlock(ii).oligoMode;
                this._oligoName[ii] = this.getCurrentUndoBlock(ii).oligoName;
                this._targetPairs[ii] = this.getCurrentUndoBlock(ii).targetPairs;
                this._poses[ii].setOligos(this._targetOligos[ii], this._targetOligosOrder[ii]);
                this._poses[ii].setOligo(this._targetOligo[ii], this._oligoMode[ii], this._oligoName[ii]);
                this._poses[ii].secstruct = this._targetPairs[ii];
                this._poses[ii].structConstraints = (
                    this._targetConditions?.[ii]?.['structure_constraints']
                );
            }
        }

        for (let poseIdx = 0; poseIdx < this._poses.length; poseIdx++) {
            const stateIdx: number = (poseIdx === 0 && !this._isPipMode)
                ? this._curTargetIndex
                : poseIdx;

            if (this._targetConditions == null || this._targetConditions[stateIdx] === undefined
                || (this._targetConditions[stateIdx] as TargetConditions)['type'] === undefined) {
                continue;
            }

            const tc = this._targetConditions[stateIdx] as TargetConditions;
            if (Puzzle.isAptamerType(tc['type'])) {
                this._poses[poseIdx].setMolecularBinding(
                    tc['site'],
                    tc['binding_pairs'],
                    tc['bonus'] as number / 100.0
                );
            } else {
                this._poses[poseIdx].setMolecularBinding(undefined, undefined, 0);
            }
            if (Puzzle.isOligoType(tc['type'])) {
                this._poses[poseIdx].oligoMalus = tc['malus'] as number;
                const nnfe = this.getCurrentUndoBlock(stateIdx).getParam(
                    UndoBlockParam.NNFE_ARRAY, EPars.DEFAULT_TEMPERATURE, pseudoknots
                ) as number[];
                if (nnfe != null && nnfe[0] === -2) {
                    this._poses[poseIdx].oligoPaired = true;
                    this._poses[poseIdx].duplexCost = nnfe[1] * 0.01;
                } else {
                    this._poses[poseIdx].oligoPaired = false;
                }
            }
            if (tc['type'] === 'multistrand') {
                const nnfe = this.getCurrentUndoBlock(stateIdx).getParam(
                    UndoBlockParam.NNFE_ARRAY, EPars.DEFAULT_TEMPERATURE, pseudoknots
                ) as number[];
                if (nnfe != null && nnfe[0] === -2) {
                    this._poses[poseIdx].duplexCost = nnfe[1] * 0.01;
                }
            }
        }

        if (this._pose3D) this._pose3D.sequence.value = this.getCurrentUndoBlock().sequence;

        const numAU: number = undoBlock.getParam(UndoBlockParam.AU, 37, pseudoknots) as number;
        const numGU: number = undoBlock.getParam(UndoBlockParam.GU, 37, pseudoknots) as number;
        const numGC: number = undoBlock.getParam(UndoBlockParam.GC, 37, pseudoknots) as number;
        this._toolbar.palette.setPairCounts(numAU, numGU, numGC);

        if (!this._isFrozen) {
            if (this._toolbar.undoButton.display.visible) {
                this._toolbar.undoButton.enabled = !(this._stackLevel < 1);
            }
            if (this._toolbar.redoButton.display.visible) {
                this._toolbar.redoButton.enabled = !(this._stackLevel + 1 > this._stackSize - 1);
            }
        }

        const constraintsSatisfied: boolean = this.checkConstraints();
        for (let ii = 0; ii < this._poses.length; ii++) {
            this.getCurrentUndoBlock(ii).stable = constraintsSatisfied;
        }

        // / Update spec thumbnail if it is open
        this.updateDockedSpecBox();

        if (constraintsSatisfied || (this._puzzle.alreadySolved && this._puzzle.rscript === '')) {
            if (this._puzzle.puzzleType !== PuzzleType.EXPERIMENTAL && !this._alreadyCleared) {
                this.submitCurrentPose();
            }
        }
    }

    private flashConstraintForTarget(targetIndex: number): void {
        if (this._constraintBar) {
            const shapeBox = this._constraintBar.getShapeBox(targetIndex);
            if (shapeBox !== null) {
                shapeBox.flash(0x00FFFF);
            }
        }
    }

    private establishTargetPairs(targetIndex: number): void {
        const xx: number = this._isPipMode ? targetIndex : this._curTargetIndex;
        const pairsxx = this._targetPairs[xx];
        let segments: number[] = this._poses[targetIndex].designSegments;
        const idxMap: number[] | null = this._poses[targetIndex].getOrderMap(this._targetOligosOrder[xx]);
        if (idxMap != null) {
            segments = segments.map((s) => idxMap.indexOf(s));
        }
        const structureConstraints = this._targetConditions[xx]?.['structure_constraints'];
        if (structureConstraints === undefined) return;

        // we want 2 blocks (2x2) && same length && separated by at least 3 bases
        if (segments.length !== 4
            || segments[1] - segments[0] !== segments[3] - segments[2]
            || (segments[2] - segments[1] <= 3
                && !this._poses[targetIndex].fullSequence.hasCut(segments[1], segments[2]))) {
            return;
        }

        /*
        - get design_segments
        - if (2 groups) and (all paired/unpaired in _target_pairs) and (all as dontcare)
            set _target_pairs
            clear design
        */
        let numUnpaired = 0;
        let numWrong = 0;
        let dontcareOk = true;
        for (let jj = segments[0]; jj <= segments[1] && dontcareOk; jj++) {
            if (structureConstraints[jj]) {
                dontcareOk = false;
                continue;
            }
            if (!pairsxx.isPaired(jj)) {
                numUnpaired++;
            } else if (pairsxx.pairingPartner(jj) < segments[2]
                || pairsxx.pairingPartner(jj) > segments[3]) {
                numWrong++;
            }
        }
        for (let jj = segments[2]; jj <= segments[3] && dontcareOk; jj++) {
            if (structureConstraints[jj]) {
                dontcareOk = false;
                continue;
            }
            if (!pairsxx.isPaired(jj)) {
                numUnpaired++;
            } else if (pairsxx.pairingPartner(jj) < segments[0]
                || pairsxx.pairingPartner(jj) > segments[1]) {
                numWrong++;
            }
        }
        if (!dontcareOk || numWrong !== 0) return;

        if (numUnpaired === 0) {
            for (let jj = segments[0]; jj <= segments[1]; jj++) {
                pairsxx.setUnpaired(jj);
            }
            for (let jj = segments[2]; jj <= segments[3]; jj++) {
                pairsxx.setUnpaired(jj);
            }
            Flashbang.sound.playSound(Sounds.SoundRY);
            this.flashConstraintForTarget(xx);
            this._poses[targetIndex].clearDesignStruct();
        } else if (numUnpaired === segments[1] - segments[0] + segments[3] - segments[2] + 2) {
            const pseudoknots = (this._targetConditions && this._targetConditions[xx] !== undefined
                && (this._targetConditions[xx] as TargetConditions)['type'] === 'pseudoknot');
            // breaking pairs is safe, but adding them may not always be
            if (
                pseudoknots || EPars.validateParenthesis(
                    pairsxx.getParenthesis().slice(segments[1] + 1, segments[2]),
                    false
                ) == null
            ) {
                for (let jj = segments[0]; jj <= segments[1]; jj++) {
                    pairsxx.setPairingPartner(jj, segments[3] - (jj - segments[0]));
                }
                for (let jj = segments[2]; jj <= segments[3]; jj++) {
                    pairsxx.setPairingPartner(jj, segments[1] - (jj - segments[2]));
                }
                Flashbang.sound.playSound(Sounds.SoundGB);
                this.flashConstraintForTarget(xx);
                this._poses[targetIndex].clearDesignStruct();
                return;
            }

            // if the above fails, and we have multi-oligos, there may be a permutation where it works
            const targetOligo = this._targetOligos[xx];
            if (!targetOligo) return;
            if (targetOligo.length <= 1) return;

            const newOrder: number[] = targetOligo.map((_value, idx) => idx);
            let more: boolean;
            do {
                segments = this._poses[targetIndex].designSegments;
                const newMap: number[] | null = this._poses[targetIndex].getOrderMap(newOrder);
                const newPairs: SecStruct = new SecStruct();
                // shouldn't be likely that newMap isn't null but idxMap is, but must add the check
                if (newMap != null && idxMap != null) {
                    segments = segments.map((s) => newMap.indexOf(s));
                    for (let jj = 0; jj < pairsxx.length; jj++) {
                        const kk: number = idxMap.indexOf(newMap[jj]);
                        if (!pairsxx.isPaired(kk)) {
                            newPairs.setUnpaired(jj);
                        } else {
                            const pp: number = pairsxx.pairingPartner(kk);
                            newPairs.setPairingPartner(jj, newMap.indexOf(idxMap[pp]));
                        }
                    }
                }
                if (
                    EPars.validateParenthesis(
                        newPairs.getParenthesis().slice(segments[1] + 1, segments[2]),
                        false
                    ) != null
                ) {
                    more = FoldUtil.nextPerm(newOrder);
                    continue;
                }

                // Finally, a compatible permutation
                this._targetPairs[xx] = newPairs;
                this._targetOligosOrder[xx] = newOrder;
                for (let jj = segments[0]; jj <= segments[1]; jj++) {
                    this._targetPairs[xx].setPairingPartner(jj, segments[3] - (jj - segments[0]));
                }
                for (let jj = segments[2]; jj <= segments[3]; jj++) {
                    this._targetPairs[xx].setPairingPartner(jj, segments[1] - (jj - segments[2]));
                }
                Flashbang.sound.playSound(Sounds.SoundGB);
                this.flashConstraintForTarget(xx);
                this._poses[targetIndex].clearDesignStruct();
                more = false;
            } while (more);
        }
    }

    private processBaseShifts(targetIndex: number): void {
        const lastShiftedIndex: number = this._poses[targetIndex].lastShiftedIndex;
        const lastShiftedCommand: number = this._poses[targetIndex].lastShiftedCommand;
        for (let ii = 0; ii < this._poses.length; ii++) {
            if (lastShiftedIndex <= 0 || lastShiftedCommand < 0) {
                this._poses[ii].sequence = this._poses[targetIndex].sequence;
                this._poses[ii].puzzleLocks = this._poses[targetIndex].puzzleLocks;
                this._poses[ii].librarySelections = this._poses[targetIndex].librarySelections;
                continue;
            }

            if (ii !== targetIndex) {
                this._poses[ii].baseShiftWithCommand(lastShiftedCommand, lastShiftedIndex);
            }

            const results: [string, PuzzleEditOp, number[]?] | null = this._poses[ii].parseCommandWithPairs(
                lastShiftedCommand, lastShiftedIndex, this._targetPairs[ii]
            );
            if (results != null) {
                const parenthesis: string = results[0];
                this._targetPairs[ii] = SecStruct.fromParens(parenthesis);
            }

            // Adjust indices for all constraints in TargetConditions
            const tc = this._targetConditions[ii] as TargetConditions;
            const antiStructureConstraints = tc['anti_structure_constraints'];
            if (antiStructureConstraints !== undefined) {
                if (lastShiftedCommand === RNAPaint.ADD_BASE) {
                    const antiStructureConstraint: boolean = antiStructureConstraints[lastShiftedIndex];
                    antiStructureConstraints.splice(lastShiftedIndex, 0, antiStructureConstraint);
                } else if (lastShiftedCommand === RNAPaint.DELETE) {
                    antiStructureConstraints.splice(lastShiftedIndex, 1);
                }
            }

            const structureConstraints = tc['structure_constraints'];
            if (structureConstraints !== undefined) {
                const constraintVal: boolean = structureConstraints[lastShiftedIndex];
                let newConstraints: boolean[];

                if (lastShiftedCommand === RNAPaint.ADD_BASE) {
                    newConstraints = structureConstraints.slice(0, lastShiftedIndex);
                    newConstraints.push(constraintVal);
                    newConstraints = newConstraints.concat(
                        structureConstraints.slice(lastShiftedIndex, structureConstraints.length)
                    );
                } else {
                    newConstraints = structureConstraints.slice(0, lastShiftedIndex);
                    newConstraints = newConstraints.concat(
                        structureConstraints.slice(lastShiftedIndex + 1, structureConstraints.length)
                    );
                }
                tc['structure_constraints'] = newConstraints;
            }

            const antiSecstruct: string | undefined = tc['anti_secstruct'];
            if (antiSecstruct != null) {
                const antiPairs: SecStruct = SecStruct.fromParens(antiSecstruct);
                const antiResult: [string, PuzzleEditOp, number[]?] | null = this._poses[ii].parseCommandWithPairs(
                    lastShiftedCommand, lastShiftedIndex, antiPairs
                );
                if (antiResult) tc['anti_secstruct'] = antiResult[0];
            }

            if (tc['type'] === 'aptamer') {
                const bindingSite: number[] = (tc['site'] as number[]).slice(0);
                const bindingPairs: number[] = [];
                if (lastShiftedCommand === RNAPaint.ADD_BASE) {
                    for (let ss = 0; ss < bindingSite.length; ss++) {
                        if (bindingSite[ss] >= lastShiftedIndex) {
                            bindingSite[ss]++;
                        }
                    }

                    for (let jj = 0; jj < bindingSite.length; jj++) {
                        bindingPairs.push(this._targetPairs[ii].pairingPartner(bindingSite[jj]));
                    }
                } else {
                    for (let ss = 0; ss < bindingSite.length; ss++) {
                        if (bindingSite[ss] >= lastShiftedIndex) {
                            bindingSite[ss]--;
                        }
                    }

                    for (let jj = 0; jj < bindingSite.length; jj++) {
                        bindingPairs.push(this._targetPairs[ii].pairingPartner(bindingSite[jj]));
                    }
                }

                tc['site'] = bindingSite;
                tc['binding_pairs'] = bindingPairs;
            }

            this._poses[ii].sequence = this._poses[targetIndex].sequence;
            this._poses[ii].puzzleLocks = this._poses[targetIndex].puzzleLocks;
            this._poses[ii].librarySelections = this._poses[targetIndex].librarySelections;
        }
    }

    private poseEditByTarget(targetIndex: number): void {
        this.savePosesMarkersContexts();

        // Reorder oligos and reorganize structure constraints as needed
        this.establishTargetPairs(targetIndex);
        // Ditto but for base shifts
        this.processBaseShifts(targetIndex);

        this._foldTotalTime = 0;

        if (this._isFrozen) {
            return;
        }

        const LOCK_NAME = 'ExecFold';

        const execfoldCB = (fd: FoldData[] | null) => {
            this.hideAsyncText();
            this.popUILock(LOCK_NAME);

            if (fd != null) {
                this._stackLevel++;
                this._stackSize = this._stackLevel + 1;
                this._seqStacks[this._stackLevel] = [];

                for (let ii = 0; ii < this._poses.length; ii++) {
                    this._seqStacks[this._stackLevel][ii] = new UndoBlock(new Sequence([]), '');
                    this._seqStacks[this._stackLevel][ii].fromJSON(fd[ii]);
                }

                this.savePosesMarkersContexts();
                this.moveUndoStack();
                this.updateScore();
                this.transformPosesMarkers();

                if (this._poseEditByTargetCb != null) {
                    this._poseEditByTargetCb();
                }
                return;
            }

            this.poseEditByTargetDoFold(targetIndex);
        };

        this.pushUILock(LOCK_NAME);
        const sol: Solution | null = SolutionManager.instance.getSolutionBySequence(
            this._poses[targetIndex].getSequenceString()
        );
        if (sol != null && this._puzzle.hasTargetType('multistrand')) {
            this.showAsyncText('retrieving...');
            sol.queryFoldData().then((result) => execfoldCB(result));
        } else {
            execfoldCB(null);
        }
    }

    private poseEditByTargetDoFold(targetIndex: number): void {
        this.showAsyncText('folding...');
        this.pushUILock(PoseEditMode.FOLDING_LOCK);

        if (this.forceSync) {
            for (let ii = 0; ii < this._targetPairs.length; ii++) {
                this.poseEditByTargetFoldTarget(ii);
            }
            this.poseEditByTargetEpilog(targetIndex);
        } else {
            for (let ii = 0; ii < this._targetPairs.length; ii++) {
                this._opQueue.push(new PoseOp(ii + 1, () => this.poseEditByTargetFoldTarget(ii)));
            }

            this._opQueue.push(
                new PoseOp(this._targetPairs.length + 1, () => this.poseEditByTargetEpilog(targetIndex))
            );
        }

        if (this._poseEditByTargetCb != null) {
            this._poseEditByTargetCb();
        }
    }

    private poseEditByTargetFoldTarget(ii: number): void {
        if (ii === 0) {
            // / Pushing undo block
            this._stackLevel++;
            this._seqStacks[this._stackLevel] = [];
        }
        // a "trick" used by the 'multifold' branch below, in order to
        // re-queue itself without triggering the stack push coded above
        ii %= this._targetPairs.length;

        const seq: Sequence = this._poses[ii].sequence;

        const pseudoknots = (this._targetConditions && this._targetConditions[ii] !== undefined
            && (this._targetConditions[ii] as TargetConditions)['type'] === 'pseudoknot');

        if (!this._folder) {
            throw new Error('Cannot progress through poseEditByTargetFoldTarget with a null Folder!');
        }

        const tc = this._targetConditions[ii];

        // The rest of this function basically takes tc and a couple other forms
        // of data and turns them into an UndoBlock. Maybe we can factor this out.
        let bestPairs: SecStruct | null = null;
        let bonus: number;
        let sites: number[];
        let foldMode: number;
        let malus: number;
        let oligoOrder: number[] | undefined;
        let oligosPaired = 0;
        const forceStruct = tc ? tc['force_struct'] : undefined;
        if (tc === undefined
            || (tc && tc['type'] === 'single')) {
            bestPairs = this._folder.foldSequence(this._puzzle.transformSequence(seq, ii), null, forceStruct);
        } else if (tc['type'] === 'pseudoknot') {
            bestPairs = this._folder.foldSequence(this._puzzle.transformSequence(seq, ii), null, forceStruct, true);
        } else if (tc['type'] === 'aptamer') {
            bonus = tc['bonus'] as number;
            sites = tc['site'] as number[];
            bestPairs = this._folder.foldSequenceWithBindingSite(
                this._puzzle.transformSequence(seq, ii),
                this._targetPairs[ii],
                sites, Number(bonus),
                (tc as TargetConditions)['fold_version']
            );
        } else if ((tc as TargetConditions)['type'] === 'oligo') {
            foldMode = (tc as TargetConditions)['fold_mode'] === undefined
                ? OligoMode.DIMER
                : Number(tc['fold_mode']);
            if (foldMode === OligoMode.DIMER) {
                log.debug('cofold');
                const fullSeq = seq.concat(Sequence.fromSequenceString(`&${tc['oligo_sequence']}`));
                malus = int(tc['malus'] as number * 100);
                bestPairs = this._folder.cofoldSequence(fullSeq, null, malus, forceStruct);
            } else if (foldMode === OligoMode.EXT5P) {
                const fullSeq = Sequence.fromSequenceString(tc['oligo_sequence'] as string).concat(seq);
                bestPairs = this._folder.foldSequence(fullSeq, null, forceStruct);
            } else {
                const fullSeq = seq.concat(Sequence.fromSequenceString(tc['oligo_sequence'] as string));
                bestPairs = this._folder.foldSequence(fullSeq, null, forceStruct);
            }
        } else if (tc['type'] === 'aptamer+oligo') {
            bonus = tc['bonus'] as number;
            sites = tc['site'] as number[];
            foldMode = tc['fold_mode'] === undefined
                ? OligoMode.DIMER
                : Number(tc['fold_mode']);
            if (foldMode === OligoMode.DIMER) {
                log.debug('cofold');
                const fullSeq = seq.concat(Sequence.fromSequenceString(`&${tc['oligo_sequence']}`));
                malus = int(tc['malus'] as number * 100);
                bestPairs = this._folder.cofoldSequenceWithBindingSite(
                    fullSeq, sites, bonus, forceStruct, malus
                );
            } else if (foldMode === OligoMode.EXT5P) {
                const fullSeq = Sequence.fromSequenceString(tc['oligo_sequence'] as string).concat(seq);
                bestPairs = this._folder.foldSequenceWithBindingSite(
                    fullSeq, this._targetPairs[ii], sites, Number(bonus), tc['fold_version']
                );
            } else {
                const fullSeq = seq.concat(Sequence.fromSequenceString(tc['oligo_sequence'] as string));
                bestPairs = this._folder.foldSequenceWithBindingSite(
                    fullSeq, this._targetPairs[ii], sites, Number(bonus), tc['fold_version']
                );
            }
        } else if (tc['type'] === 'multistrand') {
            const odefs = tc['oligos'] as OligoDef[];
            const oligos: Oligo[] = odefs.map(
                (odef) => ({
                    sequence: Sequence.fromSequenceString(odef['sequence']).baseArray,
                    malus: int(odef['malus'] * 100.0)
                })
            );
            log.debug('multifold');

            const key: CacheKey = {
                primitive: 'multifold',
                seq: this._puzzle.transformSequence(seq, ii).baseArray,
                secondBestPairs: null,
                oligos,
                desiredPairs: null,
                temp: 37
            };
            const mfold: MultiFoldResult = this._folder.getCache(key) as MultiFoldResult;

            if (mfold === null && !this.forceSync) {
                // multistrand folding can be really slow
                // break it down to each permutation
                const ops: PoseOp[] | null = this._folder.multifoldUnroll(
                    this._puzzle.transformSequence(seq, ii), null, oligos
                );
                this._opQueue.unshift(new PoseOp(
                    ii + 1,
                    () => this.poseEditByTargetFoldTarget(ii + this._targetPairs.length)
                ));
                while (ops && ops.length > 0) {
                    const op = ops.pop();
                    Assert.assertIsDefined(op);
                    op.sn = ii + 1;
                    this._opQueue.unshift(op);
                }
                return;
            } else {
                const best: MultiFoldResult = this._folder.multifold(
                    this._puzzle.transformSequence(seq, ii),
                    null,
                    oligos
                ) as MultiFoldResult;
                bestPairs = best.pairs.slice(0);
                oligoOrder = best.order.slice();
                oligosPaired = best.count;
            }
        }

        const undoBlock: UndoBlock = new UndoBlock(this._puzzle.transformSequence(seq, ii), this._folder.name);
        Assert.assertIsDefined(bestPairs);
        undoBlock.setPairs(bestPairs, 37, pseudoknots);
        undoBlock.targetOligos = this._targetOligos[ii];
        undoBlock.targetOligo = this._targetOligo[ii];
        undoBlock.oligoOrder = oligoOrder;
        undoBlock.oligosPaired = oligosPaired;
        undoBlock.targetPairs = this._targetPairs[ii];
        undoBlock.targetOligoOrder = this._targetOligosOrder[ii];
        undoBlock.puzzleLocks = this._poses[ii].puzzleLocks;
        undoBlock.targetConditions = this._targetConditions[ii];
        undoBlock.setBasics(37, pseudoknots);
        undoBlock.librarySelections = this._poses[ii].librarySelections;
        this._seqStacks[this._stackLevel][ii] = undoBlock;
    }

    private poseEditByTargetEpilog(targetIndex: number): void {
        this.hideAsyncText();
        this.popUILock(PoseEditMode.FOLDING_LOCK);

        const pseudoknots = (this._targetConditions && this._targetConditions[targetIndex] !== undefined
            && (this._targetConditions[targetIndex] as TargetConditions)['type'] === 'pseudoknot');

        // this._fold_total_time = new Date().getTime() - this._fold_start_time;
        // if (!this._tools_container.contains(this._freeze_button) && this._fold_total_time >= 1000.0) {
        //     // FIXME: a bit arbitrary...
        //     this._tools_container.addObject(this._freeze_button);
        //     this.layout_bars();
        // }

        this._stackSize = this._stackLevel + 1;
        this.updateScore();
        this.transformPosesMarkers();

        // / JEEFIX

        let lastBestPairs: SecStruct = this._seqStacks[this._stackLevel][targetIndex].getPairs(37, pseudoknots);
        const bestPairs: SecStruct = lastBestPairs;

        if (this._stackLevel > 0) {
            lastBestPairs = this._seqStacks[this._stackLevel - 1][targetIndex].getPairs(37, pseudoknots);
        }

        const isShapeConstrained = this._puzzle.constraints && this._puzzle.constraints.some(
            (constraint) => constraint instanceof ShapeConstraint
        );

        const pairsDiff: number[] = [];

        for (let ii = 0; ii < bestPairs.length; ii++) {
            if (lastBestPairs.pairingPartner(ii) === bestPairs.pairingPartner(ii)) {
                pairsDiff[ii] = 0;
            } else if (!bestPairs.isPaired(ii) && lastBestPairs.isPaired(ii)) {
                pairsDiff[ii] = -1;
            } else if (bestPairs.pairingPartner(ii) > ii) {
                if (!lastBestPairs.isPaired(ii)) {
                    pairsDiff[ii] = 1;
                } else {
                    pairsDiff[ii] = 2;
                }
            } else {
                pairsDiff[ii] = 0;
            }
        }

        if (!this._poses[targetIndex].useSimpleGraphics) {
            let stackStart = -1;
            let lastOtherStack = -1;
            for (let ii = 0; ii < bestPairs.length; ii++) {
                if (
                    pairsDiff[ii] > 0
                    && (
                        (!isShapeConstrained && this._poseState === PoseState.NATIVE)
                        || (bestPairs.pairingPartner(ii) === this._targetPairs[targetIndex].pairingPartner(ii))
                    )
                ) {
                    if (stackStart < 0) {
                        stackStart = ii;
                        lastOtherStack = bestPairs.pairingPartner(ii);
                    } else {
                        if (bestPairs.pairingPartner(ii) !== lastOtherStack - 1) {
                            this._poses[targetIndex].praiseStack(stackStart, ii - 1);
                            stackStart = ii;
                        }

                        lastOtherStack = bestPairs.pairingPartner(ii);
                    }
                } else if (stackStart >= 0) {
                    this._poses[targetIndex].praiseStack(stackStart, ii - 1);
                    stackStart = -1;
                    lastOtherStack = -1;
                }
            }
        }

        if (this._foldTotalTime >= 1000.0 && this._puzzle.hasTargetType('multistrand')) {
            const sol: Solution | null = SolutionManager.instance.getSolutionBySequence(
                this._poses[targetIndex].getSequenceString()
            );
            if (sol != null && !sol.hasFoldData) {
                const fd: FoldData[] = [];
                for (let ii = 0; ii < this._poses.length; ii++) {
                    fd.push(this.getCurrentUndoBlock(ii).toJSON());
                }
                sol.foldData = fd;

                Eterna.client.updateSolutionFoldData(sol.nodeID, fd).then((datastring: string) => {
                    log.debug(datastring);
                });
            }
        }
    }

    protected getCurrentUndoBlock(targetIndex: number = -1): UndoBlock {
        if (targetIndex < 0) {
            return this._seqStacks[this._stackLevel][this._curTargetIndex];
        } else {
            return this._seqStacks[this._stackLevel][targetIndex];
        }
    }

    private setPosesWithUndoBlock(ii: number, undoBlock: UndoBlock): void {
        this._poses[ii].sequence = this._puzzle.transformSequence(undoBlock.sequence, ii);
        this._poses[ii].puzzleLocks = undoBlock.puzzleLocks;
        this._poses[ii].librarySelections = undoBlock.librarySelections;
    }

    private moveUndoStack(): void {
        for (let ii = 0; ii < this._poses.length; ii++) {
            this.setPosesWithUndoBlock(ii, this._seqStacks[this._stackLevel][ii]);
            this._targetPairs[ii] = this._seqStacks[this._stackLevel][ii].targetPairs;
            this._targetConditions[ii] = this._seqStacks[this._stackLevel][ii].targetConditions;
            this._targetOligo[ii] = this._seqStacks[this._stackLevel][ii].targetOligo;
            this._oligoMode[ii] = this._seqStacks[this._stackLevel][ii].oligoMode;
            this._oligoName[ii] = this._seqStacks[this._stackLevel][ii].oligoName;
            this._targetOligos[ii] = this._seqStacks[this._stackLevel][ii].targetOligos;
            this._targetOligosOrder[ii] = this._seqStacks[this._stackLevel][ii].targetOligoOrder;
        }
    }

    private moveUndoStackForward(): void {
        if (this._stackLevel + 1 > this._stackSize - 1) {
            return;
        }
        this.savePosesMarkersContexts();

        const before: Sequence = this._puzzle.transformSequence(this.getCurrentUndoBlock(0).sequence, 0);

        this._stackLevel++;
        this.moveUndoStack();

        const after: Sequence = this._puzzle.transformSequence(this.getCurrentUndoBlock(0).sequence, 0);
        this.moveHistoryAddMutations(before, after);

        this.updateScore();
        this.transformPosesMarkers();
    }

    private moveUndoStackBackward(): void {
        if (this._stackLevel < 1) {
            return;
        }
        this.savePosesMarkersContexts();

        const before: Sequence = this._puzzle.transformSequence(this.getCurrentUndoBlock(0).sequence, 0);

        this._stackLevel--;
        this.moveUndoStack();

        const after: Sequence = this._puzzle.transformSequence(this.getCurrentUndoBlock(0).sequence, 0);
        this.moveHistoryAddMutations(before, after);

        this.updateScore();
        this.transformPosesMarkers();
    }

    private moveUndoStackToLastStable(): void {
        this.savePosesMarkersContexts();
        const before: Sequence = this._puzzle.transformSequence(this.getCurrentUndoBlock(0).sequence, 0);

        const stackLevel: number = this._stackLevel;
        while (this._stackLevel >= 1) {
            if (this.getCurrentUndoBlock(0).stable) {
                this.moveUndoStack();

                const after: Sequence = this._puzzle.transformSequence(
                    this.getCurrentUndoBlock(0).sequence, 0
                );
                this.moveHistoryAddMutations(before, after);

                this.updateScore();
                this.transformPosesMarkers();
                return;
            }

            this._stackLevel--;
        }
        this._stackLevel = stackLevel;
    }

    private clearUndoStack(): void {
        this._stackLevel = -1;
        this._stackSize = 0;
        this._seqStacks = [];
    }

    public set lettersVisible(value: boolean) {
        this._poses.forEach((e) => {
            e.lettermode = value;
        });
    }

    private readonly _puzzle: Puzzle;
    private readonly _params: PoseEditParams;
    private readonly _scriptInterface = new ExternalInterfaceCtx();
    private readonly _autosaveData: SaveStoreItem | null;
    private _savedInputs: SubmitPoseDetails;

    private _constraintsLayer: Container;

    private _background: Background;

    private _toolbar: Toolbar;
    private _helpBar: HelpBar;

    protected get _folder(): Folder {
        return this._folderSwitcher.selectedFolder.value;
    }

    // / Asynch folding
    private _opQueue: PoseOp[] = [];
    private _poseEditByTargetCb: (() => void) | null = null;
    private _asynchText: Text;
    private _foldTotalTime: number;
    // / Undo stack
    private _stackLevel: number;
    private _stackSize: number;
    private _alreadyCleared: boolean = false;
    private _paused: boolean;
    private _startSolvingTime: number;
    private _startingPoint: string;
    private _moveCount: number = 0;
    private _moves: Move[][] = [];
    protected _curTargetIndex: number = 0;
    private _poseState: PoseState = PoseState.NATIVE;

    private _seqStacks: UndoBlock[][];
    protected _targetPairs: SecStruct[] = [];
    protected _targetConditions: (TargetConditions | undefined)[] = [];
    private _targetOligo: (RNABase[] | undefined)[] = [];
    private _oligoMode: (number | undefined)[] = [];
    private _oligoName: (string | undefined)[] = [];
    private _targetOligos: (Oligo[] | undefined)[] = [];
    private _targetOligosOrder: (number[] | undefined)[] = [];

    private _folderSwitcher: FolderSwitcher;
    private _markerSwitcher: MarkerSwitcher;

    private _isFrozen: boolean = false;
    private _targetName: Text;

    private _hintBoxRef: GameObjectRef = GameObjectRef.NULL;

    private _constraintBar: ConstraintBar;

    private _dockedSpecBox: SpecBox;
    private _exitButton: GameButton;

    private _uiHighlight: SpriteObject;

    private _homeButton: GameButton;
    private _undockSpecBoxButton: GameButton;
    private _ropPresets: (() => void)[] = [];

    private _isPlaying: boolean = false;
    private _curSolutionIdx: number;
    private _solutionNameText: Text;

    // Tutorial Script Extra Functionality
    private _showMissionScreen: boolean = true;
    private _overrideShowConstraints: boolean = true;
    private _ancestorId: number;
    private _rscript: RNAScript;

    // Will be non-null after we submit our solution to the server
    private _submitSolutionRspData: SubmitSolutionData | null;

    private _solutionView?: ViewSolutionOverlay;

    // Annotations
    private _annotationManager: AnnotationManager;

    private static readonly FOLDING_LOCK = 'Folding';
}

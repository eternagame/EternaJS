import log from 'loglevel';
import {
    Container, DisplayObject, Point, Sprite, Text, Rectangle
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
import Toolbar, {ToolbarType} from 'eterna/ui/toolbar/Toolbar';
import GameButton from 'eterna/ui/GameButton';
import Bitmaps from 'eterna/resources/Bitmaps';
import {
    KeyCode, SpriteObject, DisplayUtil, HAlign, VAlign, Flashbang, KeyboardEventType, Assert,
    GameObjectRef, SerialTask, AlphaTask, Easing, SelfDestructTask, ContainerObject,
    ErrorUtil
} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import EternaSettingsDialog, {EternaViewOptionsMode} from 'eterna/ui/EternaSettingsDialog';
import FolderManager from 'eterna/folding/FolderManager';
import Folder, {MultiFoldResult, CacheKey, SuboptEnsembleResult} from 'eterna/folding/Folder';
import {PaletteTargetType, GetPaletteTargetBaseType} from 'eterna/ui/toolbar/NucleotidePalette';
import PoseField from 'eterna/pose2D/PoseField';
import Pose2D, {
    Layout, PLAYER_MARKER_LAYER, SCRIPT_MARKER_LAYER, MUTATION_MARKER_LAYER
} from 'eterna/pose2D/Pose2D';
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
import Utility from 'eterna/util/Utility';
import HintsPanel from 'eterna/ui/HintsPanel';
import HelpBar from 'eterna/ui/HelpBar';
import HelpScreen from 'eterna/ui/help/HelpScreen';
import {HighlightInfo} from 'eterna/constraints/Constraint';
import {AchievementData} from 'eterna/achievements/AchievementManager';
import {RankScrollData} from 'eterna/rank/RankScroll';
import FolderSwitcher from 'eterna/ui/FolderSwitcher';
import MarkerSwitcher from 'eterna/ui/MarkerSwitcher';
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
import AnnotationDialog from 'eterna/ui/AnnotationDialog';
import ToolbarButton from 'eterna/ui/toolbar/ToolbarButton';
import StateToggle from 'eterna/ui/StateToggle';
import Pose3DDialog from 'eterna/pose3D/Pose3DDialog';
import ModeBar from 'eterna/ui/ModeBar';
import KeyedCollection from 'eterna/util/KeyedCollection';
import {FederatedPointerEvent} from '@pixi/events';
import NuPACK from 'eterna/folding/NuPACK';
import PasteStructureDialog from 'eterna/ui/PasteStructureDialog';
import ConfirmTargetDialog from 'eterna/ui/ConfirmTargetDialog';
import DotPlot from 'eterna/rnatypes/DotPlot';
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
    beginFrom?: string;
    numMoves?: number;
    moves?: Move[][];
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

        this._annotationManager = new AnnotationManager(toolbarType, this._puzzle.oligoLengths);
        this._annotationManager.persistentAnnotationDataUpdated.connect(() => this.saveData());
        this._annotationManager.annotationEditRequested.connect((annotation: AnnotationData) => {
            if (annotation.ranges) {
                const dialog = new AnnotationDialog({
                    edit: true,
                    title: true,
                    sequenceLength: this._poses[0].fullSequenceLength,
                    oligoLengths: this._puzzle.oligoLengths,
                    customNumbering: this._poses[0].customNumbering,
                    initialRanges: annotation.ranges,
                    initialLayers: this._annotationManager.allLayers,
                    activeCategory: this._annotationManager.activeCategory,
                    initialAnnotation: annotation
                });
                dialog.onUpdateRanges.connect((ranges: AnnotationRange[]) => {
                    this._poses.forEach((pose) => pose.setAnnotationRanges(ranges));
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
            if (window.parent !== window) {
                if (window.frameElement) {
                    window.frameElement.dispatchEvent(new CustomEvent('navigate', {detail: '/'}));
                }
                window.parent.postMessage({type: 'navigate', detail: '/'}, '*');
            } else {
                window.open(EternaURL.createURL({page: 'home'}), '_self');
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

    public updateUILayout(): void {
        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);

        DisplayUtil.positionRelativeToStage(
            this._helpBar.display, HAlign.RIGHT, VAlign.TOP,
            HAlign.RIGHT, VAlign.TOP, 0 - this._solDialogOffset, 0
        );

        DisplayUtil.positionRelativeToStage(
            this._solutionNameText, HAlign.CENTER, VAlign.TOP,
            HAlign.CENTER, VAlign.TOP, 0, 8
        );

        DisplayUtil.positionRelativeToStage(
            this._modeBar.display, HAlign.LEFT, VAlign.TOP,
            HAlign.LEFT, VAlign.TOP, 17, 120
        );
        // Roughly how much space from the bottom of the screen when non-expanded
        // TODO: Is there a way to make this not hardcoded?
        const toolbarHeight = 100;
        this._modeBar.maxHeight = Flashbang.stageHeight - this._modeBar.display.y - toolbarHeight;

        this._exitButton.display.position.set(
            Flashbang.stageWidth - 85 - this._solDialogOffset,
            Flashbang.stageHeight - 120
        );

        this._constraintBar.layout();
    }

    public get constraintsLayer(): Container {
        return this._constraintsLayer;
    }

    private showSettingsDialog(): void {
        const mode = this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL
            ? EternaViewOptionsMode.LAB
            : EternaViewOptionsMode.PUZZLE;
        this.showDialog(new EternaSettingsDialog(mode), 'SettingsDialog');
    }

    public set puzzleDefaultMode(defaultMode: PoseState) {
        this._puzzle.defaultMode = defaultMode;
    }

    public ropChangeTarget(targetIndex: number): void {
        this.changeTarget(targetIndex);
        if (this._stateToggle) {
            this._stateToggle.state = targetIndex;
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

    public layoutModeBar() {
        this._modeBar.layout();
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

    private onHelpClicked() {
        const getBounds = (elem: ContainerObject) => {
            const globalPos = elem.container.toGlobal(new Point());
            return new Rectangle(
                globalPos.x,
                globalPos.y,
                elem.container.width,
                elem.container.height
            );
        };

        const switchStateButton = this._stateToggle && this._stateToggle.display.visible ? this._stateToggle : null;
        Assert.assertIsDefined(this.modeStack);

        this.modeStack.pushMode(new HelpScreen({
            toolTips: {
                hotbarButtons: this._toolbar.getTooltipPositioners(),

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

                modeSwitch: this._naturalButton.display.visible
                    ? [() => getBounds(this._naturalButton),
                        this._naturalButton.container.width / 2, 'Mode switch']
                    : undefined,

                switchState: switchStateButton
                    ? [
                        () => getBounds(switchStateButton),
                        -18, 'Switch state'
                    ]
                    : undefined,

                palette: this._toolbar.palette.display.visible
                    ? [() => getBounds(this._toolbar.palette), 0, 'Pallete']
                    : undefined
            }
        }));
    }

    private async showSolution(solution: Solution): Promise<void> {
        this.clearUndoStack();
        this.pushUILock();

        this.showAsyncText('retrieving...');
        const foldData = await solution.queryFoldData();
        this.hideAsyncText();
        this.popUILock();

        if (foldData != null && (
            foldData[0].folderName_ === this._folder.name
            // Previously, we didn't record the folder name in the undo block.
            // At that time, we only uploaded for nupack.
            || (!foldData[0].folderName_ && this._folder.name === NuPACK.name)
        )) {
            this._stackLevel++;
            this._stackSize = this._stackLevel + 1;
            this._seqStacks[this._stackLevel] = [];

            for (let ii = 0; ii < this._poses.length; ii++) {
                const undoBlock: UndoBlock = new UndoBlock(new Sequence([]), this._folder?.name ?? '');
                undoBlock.fromJSON(foldData[ii], this._puzzle.targetConditions[ii]);
                this._seqStacks[this._stackLevel][ii] = undoBlock;
            }

            this.savePosesMarkersContexts();
            this.moveUndoStack();
            this.updateScore();
            this.transformPosesMarkers();
        } else {
            // Note that we do this first
            for (const pose of this._poses) {
                pose.librarySelections = solution.libraryNT;
                pose.sequence = solution.sequence;
            }
            await this.poseEditByTarget(0);
            this.setSolutionTargetStructure(foldData);
        }
        this.setAncestorId(solution.nodeID);

        const annotations = solution.annotations;
        this._annotationManager.setSolutionAnnotations(annotations ?? []);
    }

    private setSolutionTargetStructure(foldData: FoldData[] | null) {
        for (let ii = 0; ii < this._targetPairs.length; ii++) {
            // pose.pasteSequence resulted in a new undo block being created, filled with the folding
            // engine computations. We want to surgically update just the target structure to match the
            // solution. If freeze mode is enabled however, an undo block won't be created in the stack.
            // The current undo stack item contains the state at the time of being frozen.
            // Unfortunately, unlike sequence, we don't currently have a great way to note a "temporary"
            // target structure pending application to the next block. Unfortunately, that means we
            // don't get the target structure in that case :(
            if (!this._isFrozen) {
                const currUndoBlock = this.getCurrentUndoBlock(ii);
                if (foldData && foldData[ii]) {
                    const cacheUndoBlock: UndoBlock = new UndoBlock(new Sequence([]), this._folder?.name ?? '');
                    cacheUndoBlock.fromJSON(foldData[ii], this._puzzle.targetConditions[ii]);
                    currUndoBlock.targetPairs = cacheUndoBlock.targetPairs;
                    currUndoBlock.targetOligoOrder = cacheUndoBlock.targetOligoOrder;
                } else {
                    // Set to puzzle default instead of using whatever we already had set, as if we previously
                    // loaded a solution that did have a defined target, that's *definitely* bogus. At least
                    // the default structure is "more consistently wrong"
                    currUndoBlock.targetPairs = SecStruct.fromParens(this._puzzle.getSecstruct(ii));
                    currUndoBlock.targetOligoOrder = undefined;
                }
                this.updateScore();
                this.transformPosesMarkers();
            }
        }
    }

    private addMarkerLayer(layer: string, resetSelectedLayer?: boolean) {
        this._markerSwitcher.addMarkerLayer(layer, resetSelectedLayer);
        this._markerSwitcher.display.visible = true;
        this._modeBar.layout();
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

        const bindMousedownEvent = (pose: Pose2D, index: number) => {
            pose.startMousedownCallback = ((e: FederatedPointerEvent, _closestDist: number, closestIndex: number) => {
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
            this._oligoLabel.push(undefined);
            if (targetConditions[ii] === undefined) continue;

            const tc = targetConditions[ii] as TargetConditions;
            if (tc['oligo_sequence']) {
                this._targetOligo[ii] = Sequence.fromSequenceString(tc['oligo_sequence'] as string).baseArray;
                this._oligoMode[ii] = tc['fold_mode'] === undefined
                    ? OligoMode.DIMER
                    : Number(tc['fold_mode']);
                this._oligoName[ii] = tc['oligo_name'];
                this._oligoLabel[ii] = tc['oligo_label'];
            }
            if (tc['oligos']) {
                // Map from OligoDef to Oligo, basically requires turning
                // a sequence string into a baseArray.
                this._targetOligos[ii] = tc['oligos'].map(
                    (odef) => ({
                        sequence: Sequence.fromSequenceString(odef.sequence).baseArray,
                        malus: odef.malus,
                        name: odef.name,
                        label: odef.label
                    })
                );
            }
        }

        this._exitButton.display.visible = false;
        this.addObject(this._exitButton, this.dialogLayer);

        const puzzleTitle = UITheme.makeTitle(this._puzzle.getName(!Eterna.MOBILE_APP && !Eterna.noGame), 0xC0DCE7);
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

        const states = this._puzzle.getSecstructs().length;

        this._modeBar = new ModeBar();
        this.addObject(this._modeBar, this.uiLayer);

        const {actualButton, targetButton} = this._modeBar.addStructToggle('solve');
        this._naturalButton = actualButton;
        this._targetButton = targetButton;

        if (states > 1) {
            this._stateToggle = this._modeBar.addStateToggle(states);
        }

        this._markerSwitcher = this._modeBar.addMarkerSwitcher();
        this.regs?.add(this._markerSwitcher.selectedLayer.connectNotify((val) => this.setMarkerLayer(val)));
        this._markerSwitcher.display.visible = false;
        this._modeBar.layout();

        this._constraintsLayer = new Container();
        this.uiLayer.addChild(this._constraintsLayer);
        this._constraintsLayer.visible = true;

        const toolbarType = this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL ? ToolbarType.LAB : ToolbarType.PUZZLE;
        this._toolbar = new Toolbar(toolbarType, {
            showGlue: this._puzzle.targetConditions
                ?.some((condition) => condition?.structure_constrained_bases),
            boosters: this._puzzle.boosters ? this._puzzle.boosters : undefined,
            showLibrarySelect: this._puzzle.constraints?.some((con) => con instanceof LibrarySelectionConstraint),
            showPip: states > 1,
            annotationManager: this._annotationManager
        });
        this.addObject(this._toolbar, this.uiLayer);

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
        this.setToolbarEventHandlers();

        this._toolbar.palette.clickTarget(PaletteTargetType.A);

        // Set up the constraintBar
        this._constraintBar = new ConstraintBar(this._puzzle.constraints, this._puzzle.getSecstructs.length);
        this._constraintBar.display.visible = false;
        this.addObject(this._constraintBar, this._constraintsLayer);
        this._constraintBar.sequenceHighlights.connect(
            (highlightInfos: HighlightInfo[] | null) => this.highlightSequences(highlightInfos)
        );

        // We can only set up the folderSwitcher once we have set up the poses
        // (and constraintBar, because by setting the folder on the pose, it triggers a fold
        // operation, and we need to have constraints set up before we do that)
        this._folderSwitcher = this._modeBar.addFolderSwitcher(
            (folder) => this._puzzle.canUseFolder(folder),
            initialFolder,
            this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL
        );
        this._folderSwitcher.selectedFolder.connectNotify((folder) => {
            for (const pose of this._poses) {
                pose.scoreFolder = folder;
            }

            this.onChangeFolder();
        });

        // Initialize sequence and/or solution as relevant
        let initialSequence: Sequence | null = null;
        let librarySelections: number[] = [];
        let solutionFoldDataPromise: Promise<FoldData[] | null> | null = null;
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
            solutionFoldDataPromise = this._params.initSolution.queryFoldData();
        } else if (this._params.initSequence != null && !this._puzzle.hasRscript) {
            initialSequence = Sequence.fromSequenceString(this._params.initSequence);
        }

        const puzzleInitSeq = this._puzzle.getBeginningSequence();
        if (
            this._puzzle.puzzleLocks.some(
                (val, idx) => !val && puzzleInitSeq.nt(idx) !== RNABase.ADENINE
            )
        ) {
            // If we have a starting sequence that isn't just all As (excluding locked regions),
            // there's a good chance players may care about seeing mutations from the starting
            // sequence, so we'll add a layer to handle that
            this._shouldMarkMutations = true;
            this.addMarkerLayer(MUTATION_MARKER_LAYER, false);
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
            this._poses[ii].setOligo(
                this._targetOligo[ii],
                this._oligoMode[ii],
                this._oligoName[ii],
                this._oligoLabel[ii]
            );
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

        // Start loading the model file now instead of waiting for the initial
        // fold to complete before doing it
        const pose3DUrl = this._puzzle.threePath ? new URL(this._puzzle.threePath, Eterna.SERVER_URL) : null;
        const pose3DCheckPromise = pose3DUrl
            ? Pose3DDialog.checkModelFile(pose3DUrl.href, this._puzzle.getSecstruct(0).length)
            : null;

        this.clearUndoStack();

        this.disableTools(true);

        // reset lineage for experimental targets
        this.setAncestorId(0);

        // Setup RScript and execute the ROPPRE ops
        this._rscript = new RNAScript(this._puzzle, this);

        // RScript can set our initial poseState
        this._poseState = this._puzzle.defaultMode;

        // We don't load saved data if we're viewing someone else's solution
        // If there's an initial solution, still autoload if we've previously played
        if (
            !this._params.isReset
            && this._params.initSolution == null
            && !this._puzzle.hasRscript
        ) {
            this.loadSavedData();
        }

        this.poseEditByTarget(0);

        // From here on out, all of these things have to happen after the first fold completes.
        // so we put them in the opQueue.
        // NB: forceSync is always false when we do our initial load, so we don't need
        // to have a syncronous version of any of this
        // We split them into separate PoseOps so that the counter in the async text
        // is more fine-grained (ie, you see more status updates if it winds up being slow).
        this._opQueue.push(new PoseOp(
            null,
            async () => {
                if (pose3DUrl && pose3DCheckPromise) {
                    try {
                        await pose3DCheckPromise;
                        this.addPose3D(pose3DUrl.href);
                    } catch (err) {
                        // We don't pause the queue at this point so loading will continue on,
                        // the intro screen will be shown, and then once dismissed you'll see
                        // the notification dialog, but that's fine for our purposes
                        this.showNotification(`Failed to load 3D view: ${ErrorUtil.getErrString(err)}`);
                    }
                }
            }
        ));

        this._opQueue.push(new PoseOp(
            null,
            async () => {
                if (solutionFoldDataPromise) {
                    const fd = await solutionFoldDataPromise;
                    this.setSolutionTargetStructure(fd);
                }
            }
        ));

        // Only once the above are complete can we actually unlock the UI and tell the
        // user we're ready
        this._opQueue.push(new PoseOp(
            null,
            () => {
                if (!this._params.isReset) {
                    this._startSolvingTime = new Date().getTime();
                }

                if (this._params.isReset) {
                    this.startPlaying();
                } else if (initialSequence == null) {
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
        ));
    }

    private setToolbarEventHandlers() {
        Assert.assertIsDefined(this.regs);
        this.regs.add(this._naturalButton.clicked.connect(() => this.togglePoseState()));
        this.regs.add(this._targetButton.clicked.connect(() => this.togglePoseState()));

        this.regs.add(this._toolbar.undoButton.clicked.connect(() => this.moveUndoStackBackward()));
        this.regs.add(this._toolbar.redoButton.clicked.connect(() => this.moveUndoStackForward()));
        if (this._toolbar.zoomOutButton) {
            this.regs.add(this._toolbar.zoomOutButton.clicked.connect(() => {
                for (const poseField of this._poseFields) {
                    poseField.zoomOut();
                }
            }));
        }
        if (this._toolbar.zoomInButton) {
            this.regs.add(this._toolbar.zoomInButton.clicked.connect(() => {
                for (const poseField of this._poseFields) {
                    poseField.zoomIn();
                }
            }));
        }
        this.regs.add(this._toolbar.submitButton.clicked.connect(() => this.submitCurrentPose()));
        this.regs.add(this._toolbar.viewSolutionsButton.clicked.connect(() => this.openDesignBrowserForOurPuzzle()));
        this.regs.add(this._toolbar.resetButton.clicked.connect(() => this.showResetPrompt()));

        this.regs.add(this._toolbar.specButton.clicked.connect(() => this.showSpec()));
        this.regs.add(this._toolbar.copyButton.clicked.connect(() => this.showCopySequenceDialog()));
        this.regs.add(this._toolbar.pasteButton.clicked.connect(() => this.showPasteSequenceDialog()));
        this.regs.add(
            this._toolbar.screenshotButton.clicked.connect(() => this.postScreenshot(this.createScreenshot()))
        );

        this.regs.add(this._toolbar.pipButton.clicked.connect(() => this.togglePip()));

        if (this._stateToggle) {
            this.regs.add(this._stateToggle.stateChanged.connect((targetIdx) => this.changeTarget(targetIdx)));
        }

        this.regs.add(this._toolbar.freezeButton.clicked.connect(() => this.toggleFreeze()));
        this.regs.add(
            this._toolbar.palette.targetClicked.connect((targetType) => this.onPaletteTargetSelected(targetType))
        );
        this.regs.add(this._toolbar.pairSwapButton.clicked.connect(() => this.onSwapClicked()));
        this.regs.add(this._toolbar.baseMarkerButton.clicked.connect(() => this.setPosesColor(RNAPaint.BASE_MARK)));
        this.regs.add(this._toolbar.settingsButton.clicked.connect(() => this.showSettingsDialog()));

        this.regs.add(this._toolbar.nucleotideFindButton.clicked.connect(() => this.findNucleotide()));
        this.regs.add(this._toolbar.nucleotideRangeButton.clicked.connect(() => this.showNucleotideRange()));
        this.regs.add(this._toolbar.explosionFactorButton.clicked.connect(() => this.changeExplosionFactor()));

        this.regs.add(this._toolbar.baseMarkerButton.clicked.connect(() => {
            this.setPosesColor(RNAPaint.BASE_MARK);
        }));

        this.regs.add(this._toolbar.librarySelectionButton.clicked.connect(() => {
            this.setPosesColor(RNAPaint.LIBRARY_SELECT);
        }));

        this.regs.add(this._toolbar.magicGlueButton.clicked.connect(() => {
            this.setPosesColor(RNAPaint.MAGIC_GLUE);
        }));

        this.regs.add(this._toolbar.moveButton.clicked.connect(() => {
            this.setPosesLayoutTool(Layout.MOVE);
        }));

        this.regs.add(this._toolbar.rotateStemButton.clicked.connect(() => {
            this.setPosesLayoutTool(Layout.ROTATE_STEM);
        }));

        this.regs.add(this._toolbar.flipStemButton.clicked.connect(() => {
            this.setPosesLayoutTool(Layout.FLIP_STEM);
        }));

        this.regs.add(this._toolbar.snapToGridButton.clicked.connect(() => {
            for (const pose of this._poses) {
                pose.snapToGrid();
            }
        }));

        this.regs.add(this._toolbar.downloadSVGButton.clicked.connect(() => {
            this.downloadSVG();
        }));
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
        const lockDuringFold = <T extends [...unknown[]], U>(fn: (...args: T) => U) => (...args: T): U => {
            if (this._opQueue.length > 0) {
                throw new Error(
                    'An EternaScript booster attempted to call a method that interacts with the game while a folding'
                    + ' operation is in progress. Maybe you forgot to `await` a setter, or the user triggered a folding'
                    + ' operation from the UI.'
                );
            }

            return fn(...args);
        };

        // Folding
        this._scriptInterface.addCallback(
            'fold',
            (seq: string, constraint: string | null = null): string | null => {
                if (this._folder === null) {
                    return null;
                }
                if (!this._folder.isSync()) {
                    throw new Error('Attempted to use asynchronous folding engine synchronously');
                }
                const seqArr: Sequence = Sequence.fromSequenceString(seq);
                const pseudoknots = this._targetConditions && this._targetConditions[0]
                    && this._targetConditions[0]['type'] === 'pseudoknot';
                const folded: SecStruct | null = this._folder.foldSequence(seqArr, null, constraint, pseudoknots);
                Assert.assertIsDefined(folded);
                return folded.getParenthesis(null, pseudoknots);
            }
        );

        this._scriptInterface.addCallback(
            'fold_async',
            async (seq: string, constraint: string | null = null): Promise<string | null> => {
                if (this._folder === null) {
                    return null;
                }
                const seqArr: Sequence = Sequence.fromSequenceString(seq);
                const pseudoknots = this._targetConditions && this._targetConditions[0]
                    && this._targetConditions[0]['type'] === 'pseudoknot';
                const folded: SecStruct | null = await this._folder.foldSequence(seqArr, null, constraint, pseudoknots);
                Assert.assertIsDefined(folded);
                return folded.getParenthesis(null, pseudoknots);
            }
        );

        this._scriptInterface.addCallback(
            'fold_with_binding_site',
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
            }
        );

        this._scriptInterface.addCallback(
            'fold_with_binding_site_async',
            async (seq: string, site: number[], bonus: number): Promise<string | null> => {
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
            }
        );

        this._scriptInterface.addCallback(
            'energy_of_structure',
            (seq: string, secstruct: string): number | null => {
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
            }
        );

        this._scriptInterface.addCallback(
            'energy_of_structure_async',
            (seq: string, secstruct: string): number | null => {
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
            }
        );

        this._scriptInterface.addCallback(
            'pairing_probabilities',
            (seq: string, secstruct: string | null = null): number[] | null => {
                if (this._folder === null) {
                    return null;
                }
                if (!this._folder.isSync()) {
                    throw new Error('Attempted to use asynchronous folding engine synchronously');
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
            }
        );

        this._scriptInterface.addCallback(
            'pairing_probabilities',
            async (seq: string, secstruct: string | null = null): Promise<number[] | null> => {
                if (this._folder === null) {
                    return null;
                }
                const seqArr: Sequence = Sequence.fromSequenceString(seq);
                let folded: SecStruct | null;
                if (secstruct) {
                    folded = SecStruct.fromParens(secstruct);
                } else {
                    folded = await this._folder.foldSequence(seqArr, null, null);
                    if (folded === null) {
                        return null;
                    }
                }
                const pp: DotPlot | null = await this._folder.getDotPlot(seqArr, folded);
                Assert.assertIsDefined(pp);
                return pp.data;
            }
        );

        this._scriptInterface.addCallback(
            'subopt_single_sequence',
            (
                seq: string, kcalDelta: number,
                pseudoknotted: boolean, temp: number = EPars.DEFAULT_TEMPERATURE
            ): SuboptEnsembleResult | null => {
                if (this._folder === null) {
                    return null;
                }
                // now get subopt stuff
                const seqArr: Sequence = Sequence.fromSequenceString(seq);
                return this._folder.getSuboptEnsembleNoBindingSite(seqArr,
                    kcalDelta, pseudoknotted, temp);
            }
        );

        this._scriptInterface.addCallback(
            'subopt_single_sequence_async',
            async (
                seq: string, kcalDelta: number,
                pseudoknotted: boolean, temp: number = EPars.DEFAULT_TEMPERATURE
            ): Promise<SuboptEnsembleResult | null> => {
                if (this._folder === null) {
                    return null;
                }
                // now get subopt stuff
                const seqArr: Sequence = Sequence.fromSequenceString(seq);
                return this._folder.getSuboptEnsembleNoBindingSite(seqArr,
                    kcalDelta, pseudoknotted, temp);
            }
        );

        this._scriptInterface.addCallback(
            'subopt_oligos',
            (
                seq: string, oligoStrings: string[], kcalDelta: number,
                pseudoknotted: boolean, temp: number = EPars.DEFAULT_TEMPERATURE
            ): SuboptEnsembleResult | null => {
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
            }
        );

        this._scriptInterface.addCallback(
            'subopt_oligos_async',
            async (
                seq: string, oligoStrings: string[], kcalDelta: number,
                pseudoknotted: boolean, temp: number = EPars.DEFAULT_TEMPERATURE
            ): Promise<SuboptEnsembleResult | null> => {
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
            }
        );

        this._scriptInterface.addCallback(
            'cofold',
            (
                seq: string, oligo: string, malus: number = 0.0, constraint: string | null = null
            ): string | null => {
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
            }
        );

        this._scriptInterface.addCallback(
            'cofold_async',
            async (
                seq: string, oligo: string, malus: number = 0.0, constraint: string | null = null
            ): Promise<string | null> => {
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
            }
        );

        this._scriptInterface.addCallback(
            'get_defect',
            (
                seq: string, secstruct: string, pseudoknotted: boolean, temp: number = EPars.DEFAULT_TEMPERATURE
            ): number | null => {
                if (this._folder === null) {
                    return null;
                }
                return this._folder.getDefect(
                    Sequence.fromSequenceString(seq),
                    SecStruct.fromParens(secstruct),
                    temp, pseudoknotted
                );
            }
        );

        this._scriptInterface.addCallback(
            'get_defect_async',
            async (
                seq: string, secstruct: string, pseudoknotted: boolean, temp: number = EPars.DEFAULT_TEMPERATURE
            ): Promise<number | null> => {
                if (this._folder === null) {
                    return null;
                }
                return this._folder.getDefect(
                    Sequence.fromSequenceString(seq),
                    SecStruct.fromParens(secstruct),
                    temp, pseudoknotted
                );
            }
        );

        // Getters
        this._scriptInterface.addCallback(
            'get_puzzle_id',
            lockDuringFold((): number => this._puzzle.nodeID)
        );

        this._scriptInterface.addCallback(
            'get_solution_id',
            lockDuringFold((): number | undefined => this._params.solutions?.[this._curSolutionIdx]?.nodeID)
        );

        this._scriptInterface.addCallback(
            'get_sequence_string',
            lockDuringFold((): string => this.getPose(0).getSequenceString())
        );

        this._scriptInterface.addCallback(
            'get_custom_numbering_to_index',
            lockDuringFold(
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
                }
            )
        );

        this._scriptInterface.addCallback(
            'get_index_to_custom_numbering',
            lockDuringFold(
                (): { [serialIndex: number]: number | null } | undefined => {
                    const customNumbering = this.getPose(0).customNumbering;
                    if (customNumbering === undefined) return undefined;

                    // At Omei's request, create maps both ways
                    const idxToNumbering: { [serialIndex: number]: number | null } = {};
                    for (let ii = 0; ii < customNumbering.length; ++ii) {
                        idxToNumbering[ii] = customNumbering[ii];
                    }
                    return idxToNumbering;
                }
            )
        );

        this._scriptInterface.addCallback(
            'get_full_sequence',
            lockDuringFold(
                (indx: number): string | null => {
                    if (indx < 0 || indx >= this._poses.length) {
                        return null;
                    } else {
                        return this.getPose(indx).fullSequence.sequenceString();
                    }
                }
            )
        );

        this._scriptInterface.addCallback(
            'get_locks',
            lockDuringFold(
                (): boolean[] | null => {
                    const pose: Pose2D = this.getPose(0);
                    return pose.puzzleLocks ? pose.puzzleLocks.slice(0, pose.sequence.length) : null;
                }
            )
        );

        this._scriptInterface.addCallback(
            'get_targets',
            lockDuringFold(
                (): TargetConditions[] => {
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
                }
            )
        );

        this._scriptInterface.addCallback(
            'get_target_structure',
            lockDuringFold(
                (index: number): string | null => {
                    if (index < 0 || index >= this._targetPairs.length) return null;
                    const pseudoknots = this._targetConditions && this._targetConditions[0]
                        && this._targetConditions[0]['type'] === 'pseudoknot';
                    return this._targetPairs[index].getParenthesis(null, pseudoknots);
                }
            )
        );

        this._scriptInterface.addCallback(
            'get_native_structure',
            lockDuringFold(
                (indx: number): string | null => {
                    if (indx < 0 || indx >= this._poses.length) return null;
                    const pseudoknots = this._targetConditions && this._targetConditions[0]
                        && this._targetConditions[0]['type'] === 'pseudoknot';
                    const nativepairs = this.getCurrentUndoBlock(indx).getPairs(EPars.DEFAULT_TEMPERATURE, pseudoknots);
                    return nativepairs.getParenthesis(null, pseudoknots);
                }
            )
        );

        this._scriptInterface.addCallback(
            'get_full_structure',
            lockDuringFold(
                (indx: number): string | null => {
                    if (indx < 0 || indx >= this._poses.length) {
                        return null;
                    }

                    const pseudoknots = this._targetConditions && this._targetConditions[0]
                        && this._targetConditions[0]['type'] === 'pseudoknot';
                    const nativePairs: SecStruct = this.getCurrentUndoBlock(indx).getPairs(
                        EPars.DEFAULT_TEMPERATURE, pseudoknots
                    );
                    const seq: Sequence = this.getPose(indx).fullSequence;
                    return nativePairs.getParenthesis(seq, pseudoknots);
                }
            )
        );

        this._scriptInterface.addCallback(
            'get_free_energy',
            lockDuringFold(
                (indx: number): number => {
                    if (indx < 0 || indx >= this._poses.length) {
                        return Number.NaN;
                    }
                    const ublk = this.getCurrentUndoBlock(indx);
                    const pseudoknots = ublk.targetConditions?.type === 'pseudoknot';
                    return this.getCurrentUndoBlock(indx).getParam(
                        UndoBlockParam.FE, EPars.DEFAULT_TEMPERATURE, pseudoknots
                    ) as number;
                }
            )
        );

        this._scriptInterface.addCallback('check_constraints', lockDuringFold((): boolean => this.checkConstraints()));

        this._scriptInterface.addCallback(
            'constraint_satisfied',
            lockDuringFold(
                (idx: number): boolean | null => {
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
                }
            )
        );

        this._scriptInterface.addCallback(
            'get_tracked_indices',
            lockDuringFold((): number[] => this.getPose(0).trackedIndices)
        );
        this._scriptInterface.addCallback(
            'get_barcode_indices',
            lockDuringFold((): number[] | null => this._puzzle.barcodeIndices)
        );
        this._scriptInterface.addCallback(
            'is_barcode_available',
            lockDuringFold(
                (seq: string): boolean => SolutionManager.instance.isHairpinUsed(
                    this._puzzle.getBarcodeHairpin(Sequence.fromSequenceString(seq)).sequenceString()
                )
            )
        );

        this._scriptInterface.addCallback(
            'current_folder',
            lockDuringFold(
                (): string | null => (
                    this._folder ? this._folder.name : null
                )
            )
        );

        // Setters
        this._scriptInterface.addCallback(
            'set_sequence_string',
            lockDuringFold(
                (seq: string): boolean => {
                    if (!this._folder.isSync()) {
                        throw new Error('Attempted to use asynchronous folding engine synchronously');
                    }
                    const sequence: Sequence = Sequence.fromSequenceString(seq);
                    if (sequence.findUndefined() >= 0 || sequence.findCut() >= 0) {
                        log.info(`Invalid characters in ${seq}`);
                        return false;
                    }
                    const prevForceSync = this.forceSync;
                    this.forceSync = true;
                    this.pasteSequence(sequence);
                    this.forceSync = prevForceSync;
                    return true;
                }
            )
        );

        this._scriptInterface.addCallback(
            'set_sequence_string_async',
            lockDuringFold(
                async (seq: string): Promise<boolean> => {
                    const sequence: Sequence = Sequence.fromSequenceString(seq);
                    if (sequence.findUndefined() >= 0 || sequence.findCut() >= 0) {
                        log.info(`Invalid characters in ${seq}`);
                        return false;
                    }
                    await this.pasteSequence(sequence);
                    return true;
                }
            )
        );

        this._scriptInterface.addCallback(
            'set_target_structure',
            lockDuringFold(
                (index: number, structure: string, startAt: number = 0): void => {
                    if (!this._folder.isSync()) {
                        throw new Error('Attempted to use asynchronous folding engine synchronously');
                    }

                    const pseudoknots = this._targetConditions && this._targetConditions[0]
                        && this._targetConditions[0]['type'] === 'pseudoknot';

                    const prevForceSync = this.forceSync;
                    this.forceSync = true;
                    this.pasteTargetStructure(index, SecStruct.fromParens(structure, pseudoknots), startAt);
                    this.forceSync = prevForceSync;
                }
            )
        );

        this._scriptInterface.addCallback(
            'set_target_structure_async',
            lockDuringFold(
                async (index: number, structure: string, startAt: number = 0): Promise<void> => {
                    const pseudoknots = this._targetConditions && this._targetConditions[0]
                        && this._targetConditions[0]['type'] === 'pseudoknot';

                    await this.pasteTargetStructure(index, SecStruct.fromParens(structure, pseudoknots), startAt);
                }
            )
        );

        this._scriptInterface.addCallback(
            'set_tracked_indices',
            lockDuringFold(
                (
                    marks: (number | { baseIndex: number; colors?: number | number[] })[],
                    options?: { layerName?: string }
                ): void => {
                    const standardizedMarks = marks.map(
                        (mark) => (typeof (mark) === 'number' ? {baseIndex: mark as number} : mark)
                    );

                    if (standardizedMarks.some((mark) => typeof (mark.baseIndex) !== 'number')) {
                        log.error(
                            "At least one mark object either doesn't have a `baseIndex` property or has a",
                            ' non-numeric one - aborting'
                        );
                        return;
                    }

                    let layer = SCRIPT_MARKER_LAYER;
                    if (options?.layerName === PLAYER_MARKER_LAYER) {
                        // Scripts should be able to add marks on behalf of the player
                        layer = PLAYER_MARKER_LAYER;
                    } else if (options?.layerName) {
                        // But we want to ensure that scripts can't override system layers, so we prefix them
                        layer = `${SCRIPT_MARKER_LAYER}: ${options.layerName}`;
                    }
                    this.addMarkerLayer(layer);

                    for (let ii = 0; ii < this.numPoseFields; ii++) {
                        const pose: Pose2D = this.getPose(ii);
                        pose.clearLayerTracking(layer);
                        for (const mark of standardizedMarks) {
                            pose.addBaseMark(mark.baseIndex, layer, mark.colors);
                        }
                    }
                }
            )
        );

        if (this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL) {
            this._scriptInterface.addCallback(
                'select_folder',
                lockDuringFold((folderName: string): boolean => {
                    const newFolder = FolderManager.instance.getFolder(folderName);
                    if (newFolder && !newFolder.isSync()) {
                        throw new Error('Attempted to use asynchronous folding engine synchronously');
                    }

                    return this.selectFolder(folderName);
                })
            );

            this._scriptInterface.addCallback(
                'select_folder_async',
                lockDuringFold((folderName: string): Promise<boolean> => new Promise((resolve) => {
                    const result = this.selectFolder(folderName);
                    this._opQueue.push(new PoseOp(null, () => resolve(result)));
                }))
            );
        }

        // Miscellanous
        this._scriptInterface.addCallback('sparks_effect', (from: number, to: number): void => {
            // FIXME: check PiP mode and handle accordingly
            for (const pose of this._poses) {
                pose.praiseSequence(from, to);
            }
        });

        if (this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL) {
            this._scriptInterface.addCallback(
                'submit_solution',
                lockDuringFold(
                    async (
                        details: {title?: string, description?: string} | 'prompt' = 'prompt',
                        options?: {
                            validate?: boolean,
                            notifyOnError?: boolean
                        }
                    ) => this.submitCurrentPose(
                        details,
                        options?.validate ?? true,
                        {throw: true, notify: options?.notifyOnError ?? true}
                    )
                )
            );
        }
    }

    public onKeyboardEvent(e: KeyboardEvent): boolean {
        let handled: boolean = super.onKeyboardEvent(e);

        if (!handled && e.type === KeyboardEventType.KEY_DOWN) {
            const key = e.code;
            const ctrl = e.ctrlKey;

            if (ctrl && key === KeyCode.KeyZ) {
                this.moveUndoStackToLastStable();
                handled = true;
            }
        }

        if (handled) {
            e.stopPropagation();
        }

        return handled;
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
        this.showSolutionDetailsDialog(newSolution);
        this.showSolution(newSolution);
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

        this._curSolutionIdx = nextSolutionIdx;
        const solution = this._params.solutions[nextSolutionIdx];
        this.showSolutionDetailsDialog(solution);
        this.showSolution(solution);
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
        this.addObject(this._solutionView, this.sidebarLayer);

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
            const op = this._opQueue.shift();
            Assert.assertIsDefined(op);

            // The operation at the front of the queue hasn't been started yet. Run it!
            if (op.state === 'pending') {
                op.fn();
                if (op.sn) {
                    this.showAsyncText(`folding ${op.sn} of ${this._targetPairs.length} (${this._opQueue.length})`);
                } else {
                    this.showAsyncText(`folding (${this._opQueue.length})`);
                }
            }

            // Either we just started an asynchronous operation or otherwise the operation
            // at the front of the queue was already started but not finished. Keep it in the queue
            // and check if it's done next tick
            if (op.state === 'running') {
                this._opQueue.unshift(op);
                break;
            }

            elapsed = new Date().getTime() - startTime;
        }

        if (this._opQueue.length === 0) {
            this.hideAsyncText();
        }

        const rscriptDidSomething = this._rscript.tick();

        // If we deferred completing the puzzle because the tutorial wasn't done executing yet,
        // re-check it now
        if (rscriptDidSomething && this._rscript.done) this.updateScore();

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

        if (pipMode || this._puzzle.getSecstructs().length < 2) {
            if (this._stateToggle) {
                this._stateToggle.display.visible = false;
                this._modeBar.layout();
            }
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
            if (this._stateToggle) {
                this._stateToggle.display.visible = true;
                this._modeBar.layout();
            }
            this._targetName.visible = true;

            this._constraintBar.highlightState(this._curTargetIndex);
            this._constraintBar.layout();

            this.changeTarget(this._curTargetIndex);
            this._poses[0].setZoomLevel(this._poses[0].computeDefaultZoomLevel(), true, true);
        }
    }

    /* override */
    protected createContextMenu(poseIdx: number): ContextMenu | null {
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
        menu.addItem('Copy Structure').clicked.connect(() => this.showCopyStructureDialog(poseIdx));
        const targetIndex = this._isPipMode ? poseIdx : this._curTargetIndex;
        const structureConstraints = this._targetConditions[targetIndex]?.['structure_constraints'];
        if (structureConstraints) {
            menu.addItem('Paste Target Structure').clicked.connect(() => this.showPasteStructureDialog(poseIdx));
        }
        menu.addItem('Beam to PuzzleMaker').clicked.connect(() => this.transferToPuzzlemaker());

        return menu;
    }

    protected showPasteStructureDialog(poseIdx: number): void {
        const pseudoknots: boolean = this._targetConditions != null
            && this._targetConditions[0] != null
            && this._targetConditions[0]['type'] === 'pseudoknot';
        const pasteDialog = this.showDialog(new PasteStructureDialog(pseudoknots), 'PasteSequenceDialog');
        // Already live
        if (!pasteDialog) return;
        this.regs?.add(pasteDialog.applyClicked.connect((pasteResult) => {
            // If we started in pip mode and then leave it, we would be attempting to paste to a
            // pose that's not actually in use.
            // TODO: The UX of pasting given multiple poses needs to be rethought...
            const targetIndex = this._isPipMode ? poseIdx : this._curTargetIndex;

            this.pasteTargetStructure(targetIndex, pasteResult.structure, pasteResult.startAt, poseIdx);
        }));
        this.regs?.add(pasteDialog.resetClicked.connect(() => {
            const targetIndex = this._isPipMode ? poseIdx : this._curTargetIndex;
            this._targetOligosOrder[targetIndex] = undefined;
            this._targetPairs[targetIndex] = SecStruct.fromParens(this._puzzle.getSecstruct(targetIndex));
            this.poseEditByTarget(this._isPipMode ? poseIdx : 0);
        }));
    }

    protected async pasteTargetStructure(targetIndex: number, structure: SecStruct, startAt: number, poseIdx?: number) {
        const structureConstraints = this._targetConditions[targetIndex]?.['structure_constraints'];
        if (structureConstraints === undefined) return;

        const pairs = this._targetPairs[targetIndex].slice(0);
        const startIdx = startAt - 1;

        for (let i = startIdx; i < pairs.length && i - startIdx < structure.length; i++) {
            const rawTargetPartner = structure.pairingPartner(i - startIdx);
            const targetPartner = rawTargetPartner > -1 ? rawTargetPartner + startIdx : rawTargetPartner;
            if (
                targetPartner === -1
                // This base is unconstrained
                && structureConstraints[i] === false
                // If this base is currently paired, its pair is unconstrained
                && (pairs.pairingPartner(i) === -1 || structureConstraints[pairs.pairingPartner(i)] === false)
            ) {
                pairs.setUnpaired(i);
            } else if (
                targetPartner !== -1
                // This base is unconstrained
                && structureConstraints[i] === false
                // The base we're pairing with is unconstrained
                && structureConstraints[targetPartner] === false
                // If this base is currently paired, its pair is unconstrained
                && (pairs.pairingPartner(i) === -1 || structureConstraints[pairs.pairingPartner(i)] === false)
            ) {
                pairs.setPairingPartner(i, targetPartner);
            }
        }
        this._targetPairs[targetIndex] = pairs;

        await this.poseEditByTarget((poseIdx && this._isPipMode) ? poseIdx : 0);
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
        pushVisibleState(this.sidebarLayer);
        pushVisibleState(this.achievementsLayer);
        const showingHint = this._hintBoxRef.isLive;
        this._hintBoxRef.destroyObject();

        const tempBG = DisplayUtil.fillStageRect(0x061A34);
        this.container.addChildAt(tempBG, 0);

        const info = `Player: ${Eterna.playerName}\n`
            + `Puzzle ID: ${this._puzzle.nodeID}\n`
            + `Puzzle Title: ${this._puzzle.getName()}\n`
            + `Mode: ${this._naturalButton.isSelected ? 'NativeMode' : 'TargetMode'}`;
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

        this._poses[0].clearAnnotationCanvas();
        this._poses[0].stateIndex = this._curTargetIndex;

        if (this._poseState === PoseState.NATIVE) {
            this.setToNativeMode();
        } else {
            this.setPoseTarget(0, this._curTargetIndex);
            this.setToTargetMode();
        }

        this._poses[0].redrawAnnotations();
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
                        name: odef.name,
                        label: odef.label
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
                    tc['oligo_name'],
                    tc['oligo_label']
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
                positions: new KeyedCollection(),
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

        this._targetButton.toggled.value = false;
        this._naturalButton.toggled.value = true;

        this._targetButton.hotkey(KeyCode.Space);
        this._naturalButton.hotkey();

        this.savePosesMarkersContexts();
        this._paused = false;
        this.updateScore();
        this.transformPosesMarkers();
    }

    private setToTargetMode(): void {
        this._poseState = PoseState.TARGET;

        this._targetButton.toggled.value = true;
        this._naturalButton.toggled.value = false;

        this._naturalButton.hotkey(KeyCode.Space);
        this._targetButton.hotkey();

        this.savePosesMarkersContexts();

        if (this._isPipMode) {
            for (let ii = 0; ii < this._poses.length; ii++) {
                this._poses[ii].setOligos(this._targetOligos[ii], this._targetOligosOrder[ii]);
                this._poses[ii].setOligo(
                    this._targetOligo[ii],
                    this._oligoMode[ii],
                    this._oligoName[ii],
                    this._oligoLabel[ii]
                );
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
                this._oligoName[this._curTargetIndex],
                this._oligoLabel[this._curTargetIndex]
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

        this._toolbar.undoButton.enabled = !this._isFrozen && !(this._stackLevel < 1);
        this._toolbar.redoButton.enabled = !this._isFrozen && !(this._stackLevel + 1 > this._stackSize - 1);
        this._toolbar.freezeButton.toggled.value = this._isFrozen;

        this._background.freezeBackground(this._isFrozen);

        if (!this._isFrozen) { // we just "thawed", update
            this.poseEditByTarget(this._curTargetIndex);
        }
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
    }

    private ropPresets(): void {
        while (this._ropPresets.length) {
            const func = this._ropPresets.pop();
            Assert.assertIsDefined(func);
            func();
        }
    }

    private async showSpec(): Promise<void> {
        await this.updateCurrentBlockWithDotAndMeltingPlot();
        const puzzleState = this.getCurrentUndoBlock();
        const specBox = this.showDialog(new SpecBoxDialog(), 'SpecBox');
        // Already live
        if (!specBox) return;
        this._specBox = specBox;
        this._specBox.setSpec(puzzleState);
        await this._specBox.closed;
        this._specBox = null;
    }

    private updateSpecBox(): void {
        // updateSpecBox could be triggered in a couple of scenarios:
        // 1) We made a change that triggered a fold
        // 2) We've changed our current pose in a way that didn't trigger a fold, eg by
        // changing between target and natural mode or between states
        //
        // In either case, once we get here we won't have an active UI lock. In case 1, the folding lock
        // is released before updateScore is called - however, the codepath is synchronous between
        // there and here, so there's no opportunity for a UI interaction to have been triggered
        // in the meantime. In case 2, the codepath is synchronous between user action and here.
        // All that to say, introducing a UI lock here is reasonable.
        //
        // * Why do we use a UI lock/PoseOp instead of just starting the async operation
        // and letting it finish whenever? This avoids a race condition where we trigger this twice, the second run
        // finishes before the first, and then the first comes back and we set data which is out-of-date
        // * Why not use just the PoseOp, which on its own would ensure these runs happen in order?
        // While that would be nice so that eg tabbing through states would not require waiting for
        // this to finish, this avoids confusing users since the UI being completely locked makes it
        // clear that computation is in progress. Also, EternaScript commands use the opQueue to
        // know (1) when it's safe to run and (2) when folding operations it has triggered are finished.
        // Without the UI lock, it's more likely that a script operation would attempt to be triggered
        // while this is still in the queue
        // * Well, why not use just the UI lock since that prevents this from being queued multiple times
        // at all? Because that isn't taken into account for scripts (at least currently). Also this just
        // keeps us consistent that when a script triggers a folding operation, it doesnt resolve
        // until the app has fully updated (hence we also handle forceSync).
        //
        // Note we put the operation at the start of the queue instead of the end. That is so that
        // if we were ultimately triggered by an async EternaScript command, this is run before the
        // PoseOp which resolves the EternaScript command's promise (otherwise a script author
        // would assume that it is safe to issue another command, but the commands require the
        // opQueue to be empty to avoid things getting out of sync.)
        const LOCK_NAME = 'updateSpecBox';
        this.pushUILock(LOCK_NAME);
        if (this.forceSync) {
            if (this._specBox) {
                // We don't use the result of updateCurrentBlockWithDotAndMeltingPlot because
                // even if we run synchronously, the result is still a promise. However, we don't
                // need to because we can be absolutely sure the undo block hasn't changed
                // (technically this is now true for the async case as well, but we'll play
                // it safe in case we decide to change that behavior)
                this.updateCurrentBlockWithDotAndMeltingPlot(-1, true);
                this._specBox?.setSpec(this.getCurrentUndoBlock());
            }
            this.popUILock(LOCK_NAME);
        } else {
            this._opQueue.unshift(new PoseOp(null, async () => {
                if (this._specBox) {
                    const undoBlock = await this.updateCurrentBlockWithDotAndMeltingPlot();
                    this._specBox?.setSpec(undoBlock);
                }
                this.popUILock(LOCK_NAME);
            }));
        }
    }

    private async updateCurrentBlockWithDotAndMeltingPlot(index: number = -1, sync = false): Promise<UndoBlock> {
        const datablock: UndoBlock = this.getCurrentUndoBlock(index);
        if (this._folder && this._folder.canDotPlot && datablock.sequence.length < 500) {
            const pseudoknots = (
                this._targetConditions
                && this._targetConditions[0]
                && this._targetConditions[0]['type'] === 'pseudoknot'
            ) || false;
            if (sync) {
                datablock.updateMeltingPointAndDotPlot({sync: true, pseudoknots});
            } else {
                await datablock.updateMeltingPointAndDotPlot({sync: false, pseudoknots});
            }
        }
        return datablock;
    }

    /**
     * Trigger solution submission
     *
     * @param details [Experimental puzzles only] If `'prompt'`, the user will be prompted for
     * submission metadata. Otherwise, the submission metadata itself
     * @param validate [Experimental puzzles only] If `true`, perform sanity checks which
     * the user may want to be warned about, but do not block submission
     * @param errorHandling How to respond to validation errors in the submission process
     * @param errorHandling.throw [Experimental puzzles only] If true, throw an error when solution
     * submission cannot complete due to errors in required validation instead of just exiting (returning false)
     * @param errorHandling.notify [Experimental puzzles only] If true, prompt the user to ask they want
     * to continue if optional validation fails, and show a notification in the UI if required validation fails
     * @returns Promise that resolves to true if the solution submitted successfully or false if cancelled by
     * the user (or errorHandling.throw is false a validation error ocurred)
     */
    private async submitCurrentPose(
        details: {title?: string, description?: string} | 'prompt' = 'prompt',
        validate: boolean = true,
        errorHandling = {throw: false, notify: true}
    ): Promise<boolean> {
        if (this._puzzle.puzzleType !== PuzzleType.EXPERIMENTAL) {
            // NOTE: We don't handle details/validate/errorHandling here because those are specifically
            // for scripts, and we don't surface submission to scripts outside of experimental puzzles

            // / Always submit the sequence in the first state
            const solToSubmit: UndoBlock = this.getCurrentUndoBlock(0);
            await this.submitSolution({
                title: 'Cleared Solution',
                comment: 'No comment',
                annotations: this._annotationManager.categoryAnnotationData(AnnotationCategory.SOLUTION),
                libraryNT: this._poses[0].librarySelections ?? []
            }, solToSubmit);
            return true;
        } else {
            let pipeline: (() => Promise<boolean>)[];
            const next = async () => {
                const nextStage = pipeline.shift();
                if (nextStage) return nextStage();
                return false;
            };

            pipeline = [
                // Stage 1: Make sure constraints are satisfied
                async () => {
                    if (validate && !this.checkConstraints()) {
                        // If we pass constraints when taking into account soft constraints, just prompt
                        if (this.checkConstraints(this._puzzle.isSoftConstraint || Eterna.DEV_MODE)) {
                            const NOT_SATISFIED_PROMPT = 'Puzzle constraints are not satisfied.\n\n'
                            + 'You can still submit the sequence, but please note that there is a risk of the design '
                            + 'not getting synthesized properly';
                            if (errorHandling.notify) {
                                const confirmed = await this.showConfirmDialog(NOT_SATISFIED_PROMPT).closed;
                                if (confirmed) return next();
                                else return false;
                            }
                            return false;
                        } else {
                            if (errorHandling.notify) {
                                await this.showNotification("You didn't satisfy all requirements!").closed;
                            }
                            if (errorHandling.throw) throw new Error('Constraints not satisfied');
                            return false;
                        }
                    } else return next();
                },
                // Stage 2: Make sure if the user specified a custom target structure, the bases used
                // for all pairs are actually valid
                async () => {
                    if (validate && !this.checkValidCustomPairs()) {
                        if (errorHandling.notify) {
                            const dialog = this.showDialog(new ConfirmTargetDialog());
                            const confirmed = await dialog.closed;
                            if (confirmed === 'reset') {
                                for (let i = 0; i < this._targetPairs.length; i++) {
                                    this._targetOligosOrder[i] = undefined;
                                    this._targetPairs[i] = SecStruct.fromParens(this._puzzle.getSecstruct(i));
                                }
                                await this.poseEditByTarget(this._isPipMode ? this._curTargetIndex : 0);
                                return next();
                            } else if (confirmed === 'submit') {
                                return next();
                            } else {
                                return false;
                            }
                        }
                        return false;
                    } else return next();
                },
                // Stage 3: Gather metadata and submit
                async () => {
                    await this.prepareForExperimentalPuzzleSubmission();

                    if (details === 'prompt') {
                        const dialog = new SubmitPoseDialog(this._savedInputs);
                        dialog.saveInputs.connect((e) => {
                            this._savedInputs = e;
                        });

                        this.showDialog(dialog);

                        const submitDetails = await dialog.closed;
                        if (submitDetails != null) {
                            await this.doExperimentalPuzzleSubmission(submitDetails, errorHandling);
                            return true;
                        }
                        return false;
                    } else {
                        await this.doExperimentalPuzzleSubmission(
                            {
                                title: details.title,
                                comment: details.description,
                                annotations: [],
                                libraryNT: []
                            },
                            errorHandling
                        );
                        return true;
                    }
                }
            ];

            return next();
        }
    }

    private async prepareForExperimentalPuzzleSubmission(): Promise<void> {
        // Generate dot and melting plot data
        // JAR: This duplicate function call has been like this since 2010, and I dare not guess why.
        // At least, most of this path is cached so it shouldn't be particularly expensive, but who knows
        // if there was a race condition that can crop up somewhere or something
        // TODO: Investigate if we can just call this once (either with or without the check for
        // prior existance)
        await this.updateCurrentBlockWithDotAndMeltingPlot();
        const datablock: UndoBlock = this.getCurrentUndoBlock();
        const pseudoknots = datablock.targetConditions?.type === 'pseudoknot';
        if (datablock.getParam(UndoBlockParam.DOTPLOT_BITMAP, EPars.DEFAULT_TEMPERATURE, pseudoknots) == null) {
            await this.updateCurrentBlockWithDotAndMeltingPlot();
        }

        const initScore: number = datablock.getParam(
            UndoBlockParam.PROB_SCORE, EPars.DEFAULT_TEMPERATURE, pseudoknots
        ) as number;

        let meltpoint = 107;
        for (let ii = 47; ii < 100; ii += 10) {
            const currentScore: number = datablock.getParam(UndoBlockParam.PROB_SCORE, ii, pseudoknots) as number;
            if (currentScore < initScore * 0.5) {
                meltpoint = ii;
                break;
            }
        }

        datablock.setParam(UndoBlockParam.MELTING_POINT, meltpoint, EPars.DEFAULT_TEMPERATURE, pseudoknots);
    }

    private async doExperimentalPuzzleSubmission(
        submitDetails: SubmitPoseDetails,
        errorHandling?: {notify: boolean, throw: boolean}
    ) {
        // / Always submit the sequence in the first state
        await this.updateCurrentBlockWithDotAndMeltingPlot(0);
        const solToSubmit: UndoBlock = this.getCurrentUndoBlock(0);
        submitDetails.annotations = this._annotationManager.categoryAnnotationData(
            AnnotationCategory.SOLUTION
        );
        await this.submitSolution(submitDetails, solToSubmit, errorHandling);
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
            } else if (!Eterna.noGame) {
                postData['recommend-puzzle'] = true;
            }

            postData['pointsrank'] = true;
        } else if (this._ancestorId > 0) {
            // is experimental
            postData['ancestor-id'] = this._ancestorId;
        }

        const elapsed: number = (new Date().getTime() - this._startSolvingTime) / 1000;
        const moveHistory: MoveHistory = {
            elapsed: elapsed.toFixed(0)
        };
        postData['move-history'] = JSON.stringify(moveHistory);

        const newlinereg = new RegExp('/"/g');
        details.comment = details.comment.replace(newlinereg, "'");
        details.title = details.title.replace(newlinereg, "'");

        const seqString: string = this._puzzle.transformSequence(undoBlock.sequence, 0).sequenceString();

        const pseudoknots = undoBlock.targetConditions?.type === 'pseudoknot';

        postData['title'] = details.title;
        postData['energy'] = undoBlock.getParam(
            UndoBlockParam.FE, EPars.DEFAULT_TEMPERATURE, pseudoknots
        ) as number / 100.0;
        postData['puznid'] = this._puzzle.nodeID;
        postData['sequence'] = seqString;
        postData['repetition'] = undoBlock.getParam(
            UndoBlockParam.REPETITION, EPars.DEFAULT_TEMPERATURE, pseudoknots
        ) as number;
        postData['gu'] = undoBlock.getParam(UndoBlockParam.GU, EPars.DEFAULT_TEMPERATURE, pseudoknots) as number;
        postData['gc'] = undoBlock.getParam(UndoBlockParam.GC, EPars.DEFAULT_TEMPERATURE, pseudoknots) as number;
        postData['ua'] = undoBlock.getParam(UndoBlockParam.AU, EPars.DEFAULT_TEMPERATURE, pseudoknots) as number;
        postData['body'] = details.comment;
        if (details.annotations) {
            postData['annotations'] = JSON.stringify(details.annotations);
        }

        if (this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL) {
            postData['melt'] = undoBlock.getParam(
                UndoBlockParam.MELTING_POINT, EPars.DEFAULT_TEMPERATURE, pseudoknots
            ) as number;

            const fd: FoldData[] = [];
            for (let ii = 0; ii < this._poses.length; ii++) {
                fd.push(this.getCurrentUndoBlock(ii).toJSON());
            }
            postData['fold-data'] = JSON.stringify(fd);

            // Record designStruct numbers, used for library puzzles.
            postData['selected-nts'] = this._poses[0].librarySelections;
        }

        return postData;
    }

    private async submitSolution(
        details: SubmitPoseDetails,
        undoBlock: UndoBlock,
        errorHandling: {notify: boolean, throw: boolean} = {notify: true, throw: false}
    ): Promise<void> {
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

        const seq = this._puzzle.transformSequence(undoBlock.sequence, 0);

        if (data['error'] !== undefined) {
            log.debug(`Got solution submission error: ${data['error']}`);
            // TODO: This is an awfully brittle way of checking for this error, since this means
            // we cannot have another error message containing "barcode"...
            const errorIsBarcodeInUse = data['error'].indexOf('barcode') >= 0;

            if (errorIsBarcodeInUse) {
                // In case this is due to our record of used hairpins being out of date (vs
                // the user submitting even though they knew the barcode was already in use),
                // record the fact this hairpin is in use, and update the constraints to reflect that
                const hairpin = this._puzzle.getBarcodeHairpin(seq);
                SolutionManager.instance.addHairpins([hairpin.sequenceString()]);
                this.checkConstraints();
            }

            if (errorHandling.notify) {
                if (errorIsBarcodeInUse) {
                    const dialog = this.showNotification(data['error'].replace(/ +/, ' '), 'More Information');
                    dialog.extraButton.clicked.connect(() => window.open(EternaURL.BARCODE_HELP, '_blank'));
                    await dialog.closed;
                } else {
                    await this.showNotification(data['error']).closed;
                }
            }
            if (errorHandling.throw) throw new Error(data['error']);
        } else {
            log.debug('Solution submitted');

            if (data['solution-id'] !== undefined) {
                this.setAncestorId(data['solution-id']);
            }

            if (this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL && this._puzzle.useBarcode) {
                const hairpin: Sequence | null = this._puzzle.getBarcodeHairpin(seq);
                SolutionManager.instance.addHairpins([hairpin.sequenceString()]);
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
        this.addObject(missionClearedPanel, this.sidebarLayer);
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
        if (this._puzzle.nextPuzzlePage !== null && this._puzzle.nextPuzzlePage > 0) {
            missionClearedPanel.nextButton.clicked.connect(() => {
                keepPlaying();
                if (window.parent !== window) {
                    if (window.frameElement) {
                        window.frameElement.dispatchEvent(
                            new CustomEvent('navigate', {detail: `/puzzles/${this._puzzle.nextPuzzlePage}`})
                        );
                    }
                    window.parent.postMessage({type: 'navigate', detail: `/puzzles/${this._puzzle.nextPuzzlePage}`}, '*');
                } else {
                    window.open(`/puzzles/${this._puzzle.nextPuzzlePage}`, '_self');
                }
            });
        } else if (hasNextPuzzle) {
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
                    if (window.parent !== window) {
                        if (window.frameElement) {
                            window.frameElement.dispatchEvent(
                                new CustomEvent('puzzleChange', {detail: nextPuzzle.nodeID.toString()})
                            );
                        }
                        window.parent.postMessage({type: 'puzzleChange', detail: nextPuzzle.nodeID.toString()}, '*');
                    } else {
                        const oldURL = window.location.toString();
                        const newURL = Eterna.DEV_MODE
                            ? oldURL.replace(/puzzle=\d+?$/, `puzzle=${nextPuzzle.nodeID}`)
                            : oldURL.replace(/\d+(\/?)$/, `${nextPuzzle.nodeID.toString()}$1`);
                        window.history.pushState(null, '', newURL);
                    }
                } catch (err) {
                    log.error(err);
                    throw new Error(`Failed to load next puzzle - ${err}`);
                }
            });
        } else {
            missionClearedPanel.nextButton.clicked.connect(() => {
                keepPlaying();
                if (window.parent !== window) {
                    if (window.frameElement) {
                        window.frameElement.dispatchEvent(new CustomEvent('navigate', {detail: '/'}));
                    }
                    window.parent.postMessage({type: 'navigate', detail: '/'}, '*');
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

        if (this._stateToggle) this._stateToggle.enabled = !disable;
        this._targetButton.enabled = !disable;
        this._naturalButton.enabled = !disable;

        this._folderSwitcher.enabled = !disable;
        this._markerSwitcher.enabled = !disable;
        this._modeBar.layout();

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

    private async transferToPuzzlemaker(): Promise<void> {
        if (this._targetConditions.some((tc) => tc && (
            Puzzle.isOligoType(tc.type) || Puzzle.isMultistrandType(tc.type)
        ))) {
            this.showNotification('Beam to puzzlemaker is not currently supported for puzzles with oligos');
            return;
        }

        const poseData: SaveStoreItem = [0, this._poses[0].sequence.baseArray];
        const threeDStructure = this._pose3D?.structureFile instanceof File ? {
            name: this._pose3D.structureFile.name,
            content: await this._pose3D.structureFile.text()
        } : this._pose3D?.structureFile;
        for (const [i, pose] of this._poses.entries()) {
            const tc = this._targetConditions[i];
            const ublk = this.getCurrentUndoBlock(i);
            const pseudoknots = tc !== undefined && tc.type === 'pseudoknot';

            const puzzledef: PuzzleEditPoseData = {
                sequence: pose.sequence.sequenceString(),
                structure: (
                    this._poseState === PoseState.TARGET
                        ? ublk.targetPairs
                        : ublk.getPairs(EPars.DEFAULT_TEMPERATURE, pseudoknots)
                ).getParenthesis(null, pseudoknots),
                startingFolder: this._folder.name,
                annotations: this._annotationManager.createAnnotationBundle(),
                locks: this._puzzle.puzzleLocks
            };
            if (tc !== undefined && Puzzle.isAptamerType(tc['type'])) {
                puzzledef.site = tc['site'];
                puzzledef.bindingPairs = tc['binding_pairs'];
                puzzledef.bonus = tc['bonus'];
            }
            if (tc !== undefined && tc['custom-layout']) {
                puzzledef.customLayout = tc['custom-layout'];
            }
            if (threeDStructure) {
                puzzledef.threeDStructure = threeDStructure;
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
                        undoBlock.fromJSON(pose, this._puzzle.targetConditions[ii]);
                    } else {
                        // Old format before annotations were introduced
                        const pose: FoldData = saveData;
                        undoBlock.fromJSON(pose, this._puzzle.targetConditions[ii]);
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
        return true;
    }

    private checkConstraints(soft: boolean = false): boolean {
        return this._constraintBar.updateConstraints({
            undoBlocks: this._seqStacks[this._stackLevel],
            targetConditions: this._targetConditions,
            puzzle: this._puzzle
        }, soft);
    }

    private checkValidCustomPairs(): boolean {
        for (const ublk of this.getCurrentUndoBlocks()) {
            const constraints = ublk.targetAlignedStructureConstraints;
            if (constraints) {
                const targetSeq = EPars.constructFullSequence(
                    ublk.sequence,
                    ublk.targetOligo,
                    ublk.targetOligos,
                    ublk.targetOligoOrder,
                    ublk.oligoMode
                );
                const targetStruct = ublk.targetPairs;
                const satisfiedStruct = ublk.targetPairs.getSatisfiedPairs(targetSeq);
                // We only want to check unconstrained bases that are in a pair in the target structure
                const customConstraints = constraints.map(
                    (constrained, idx) => !constrained && targetStruct.isPaired(idx)
                );
                if (!EPars.arePairsSame(targetStruct, satisfiedStruct, customConstraints)) return false;
            }
        }
        return true;
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
                    this._poses[0].setOligo(
                        this.getCurrentUndoBlock().targetOligo,
                        this.getCurrentUndoBlock().oligoMode,
                        this.getCurrentUndoBlock().oligoName,
                        this.getCurrentUndoBlock().oligoLabel
                    );
                    this._poses[0].secstruct = this.getCurrentUndoBlock().getPairs(
                        EPars.DEFAULT_TEMPERATURE, pseudoknots
                    );
                    this._poses[0].structConstraints = (
                        this._targetConditions?.[this._curTargetIndex]?.['structure_constraints']
                    );
                    continue;
                }
                this._poses[ii].setOligos(this.getCurrentUndoBlock(ii).targetOligos,
                    this.getCurrentUndoBlock(ii).oligoOrder,
                    this.getCurrentUndoBlock(ii).oligosPaired);
                this._poses[ii].setOligo(
                    this.getCurrentUndoBlock(ii).targetOligo,
                    this.getCurrentUndoBlock(ii).oligoMode,
                    this.getCurrentUndoBlock(ii).oligoName,
                    this.getCurrentUndoBlock(ii).oligoLabel
                );
                this._poses[ii].secstruct = this.getCurrentUndoBlock(ii).getPairs(
                    EPars.DEFAULT_TEMPERATURE, pseudoknots
                );
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
                    this._poses[0].setOligo(
                        this.getCurrentUndoBlock().targetOligo,
                        this.getCurrentUndoBlock().oligoMode,
                        this.getCurrentUndoBlock().oligoName,
                        this.getCurrentUndoBlock().oligoLabel
                    );
                    this._poses[0].secstruct = this.getCurrentUndoBlock().targetPairs;
                    this._poses[0].structConstraints = (
                        this._targetConditions?.[this._curTargetIndex]?.['structure_constraints']
                    );
                    this._targetOligos[0] = this.getCurrentUndoBlock(0).targetOligos;
                    this._targetOligosOrder[0] = this.getCurrentUndoBlock(0).targetOligoOrder;
                    this._targetOligo[0] = this.getCurrentUndoBlock(0).targetOligo;
                    this._oligoMode[0] = this.getCurrentUndoBlock(0).oligoMode;
                    this._oligoName[0] = this.getCurrentUndoBlock(0).oligoName;
                    this._oligoLabel[0] = this.getCurrentUndoBlock(0).oligoLabel;
                    this._targetPairs[0] = this.getCurrentUndoBlock(0).targetPairs;
                    continue;
                }
                this._targetOligos[ii] = this.getCurrentUndoBlock(ii).targetOligos;
                this._targetOligosOrder[ii] = this.getCurrentUndoBlock(ii).targetOligoOrder;
                this._targetOligo[ii] = this.getCurrentUndoBlock(ii).targetOligo;
                this._oligoMode[ii] = this.getCurrentUndoBlock(ii).oligoMode;
                this._oligoName[ii] = this.getCurrentUndoBlock(ii).oligoName;
                this._oligoLabel[ii] = this.getCurrentUndoBlock(ii).oligoLabel;
                this._targetPairs[ii] = this.getCurrentUndoBlock(ii).targetPairs;
                this._poses[ii].setOligos(this._targetOligos[ii], this._targetOligosOrder[ii]);
                this._poses[ii].setOligo(
                    this._targetOligo[ii],
                    this._oligoMode[ii],
                    this._oligoName[ii],
                    this._oligoLabel[ii]
                );
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

        for (const poseField of this._poseFields) {
            poseField.updateDeltaEnergyGui();
        }

        if (this._pose3D) this._pose3D.sequence.value = this.getCurrentUndoBlock().sequence;

        if (this._shouldMarkMutations) {
            const puzzleInitSeq = this._puzzle.getBeginningSequence();
            const currentSeq = this.getCurrentUndoBlock().sequence;
            for (const pose of this._poses) {
                pose.clearLayerTracking(MUTATION_MARKER_LAYER);
            }
            for (let i = 0; i < puzzleInitSeq.length; i++) {
                if (currentSeq.nt(i) !== puzzleInitSeq.nt(i)) {
                    for (const pose of this._poses) {
                        pose.addBaseMark(i, MUTATION_MARKER_LAYER);
                    }
                }
            }
        }

        const numAU: number = undoBlock.getParam(UndoBlockParam.AU, EPars.DEFAULT_TEMPERATURE, pseudoknots) as number;
        const numGU: number = undoBlock.getParam(UndoBlockParam.GU, EPars.DEFAULT_TEMPERATURE, pseudoknots) as number;
        const numGC: number = undoBlock.getParam(UndoBlockParam.GC, EPars.DEFAULT_TEMPERATURE, pseudoknots) as number;
        this._toolbar.palette.setPairCounts(numAU, numGU, numGC);

        if (!this._isFrozen) {
            this._toolbar.undoButton.enabled = !(this._stackLevel < 1);
            this._toolbar.redoButton.enabled = !(this._stackLevel + 1 > this._stackSize - 1);
        }

        const constraintsSatisfied: boolean = this.checkConstraints();
        for (let ii = 0; ii < this._poses.length; ii++) {
            this.getCurrentUndoBlock(ii).stable = constraintsSatisfied;
        }

        // Update open dialogs
        this.updateSpecBox();
        this.updateCopySequenceDialog();
        this.updateCopyStructureDialog();

        if (
            (constraintsSatisfied && this._rscript.done)
            || (this._puzzle.alreadySolved && this._puzzle.rscript === '')
        ) {
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

    /**
     * Check a pose for pending "magic glue" operations. If it's in a state where the magic
     * glue can be applied, figure out how the target structure should be modified and apply it
     *
     * @param targetIndex The pose index to check for potential target updates
     */
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

    /**
     * After a pose edit operation has been initiated from a given pose, update all
     * other pose with the changes made to that pose (eg, mutations)
     *
     * @param targetIndex The index of the pose which was originally modified
     */
    private syncUpdatesFromPose(targetIndex: number): void {
        const lastShiftedIndex: number = this._poses[targetIndex].lastShiftedIndex;
        const lastShiftedCommand: number = this._poses[targetIndex].lastShiftedCommand;
        for (let ii = 0; ii < this._poses.length; ii++) {
            // Before syncing any other data, handle shifting first since that would add or remove bases
            if (lastShiftedIndex > 0 && lastShiftedCommand >= 0) {
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
            }

            // In all cases, update these properties from the pose that was originally updated
            this._poses[ii].sequence = this._poses[targetIndex].sequence;
            this._poses[ii].puzzleLocks = this._poses[targetIndex].puzzleLocks;
            this._poses[ii].librarySelections = this._poses[targetIndex].librarySelections;
        }
    }

    /**
     * Handler that responds to a given pose (ie, for a particular target) has been updated
     * (edited). Responsible for syncing the change across poses, refolding, creating a new
     * undo block, etc.
     *
     * If this._forceSync is true, completes syncronously. If false, resolves once all operations
     * are complete.
     *
     * @param targetIndex The index of the pose which a change was made in
     */
    protected async poseEditByTarget(targetIndex: number) {
        this.savePosesMarkersContexts();

        // Reorder oligos and reorganize structure constraints as needed
        this.establishTargetPairs(targetIndex);
        // Ditto but for base shifts
        this.syncUpdatesFromPose(targetIndex);

        if (this._isFrozen) {
            return;
        }

        const LOCK_NAME = 'ExecFold';
        this.pushUILock(LOCK_NAME);

        const execfoldCB = (fd: FoldData[] | null) => {
            this.hideAsyncText();
            this.popUILock(LOCK_NAME);

            if (fd != null) {
                this._stackLevel++;
                this._stackSize = this._stackLevel + 1;
                this._seqStacks[this._stackLevel] = [];

                for (let ii = 0; ii < this._poses.length; ii++) {
                    this._seqStacks[this._stackLevel][ii] = new UndoBlock(new Sequence([]), this._folder?.name ?? '');
                    this._seqStacks[this._stackLevel][ii].fromJSON(fd[ii], this._puzzle.targetConditions[ii]);
                }

                this.savePosesMarkersContexts();
                this.moveUndoStack();
                this.updateScore();
                this.transformPosesMarkers();

                return;
            }

            return this.poseEditByTargetDoFold(targetIndex);
        };

        // JAR: We're now uploading data across multiple engines from the submitter for post-hoc analysis and solution
        // loading, and we don't have a good way of dealing with that, so we're going to avoid just loading the
        // solution cache, at least for now. If you attempt to add this later, don't forget that:
        // 1) we didn't used to record the folding engine used and 2) we wouldn't want to load the target structure
        // of the solutin that had its fold cached
        // NOTE: If we do re-enable this, we should change it to add an async PoseOp to opQueue so that
        // we ensure we avoid race conditions - namely if we have an initial solution, we need to ensure
        // the folding is done before we execute the operations to set the solution's custom target structure.
        /*
        const sol: Solution | null = SolutionManager.instance.getSolutionBySequence(
            this._poses[targetIndex].getSequenceString()
        );
        if (sol != null && this._puzzle.hasTargetType('multistrand')) {
            this.showAsyncText('retrieving...');
            return sol.queryFoldData().then((result) => execfoldCB(result));
        } else {
            return execfoldCB(null);
        }
        */

        return execfoldCB(null);
    }

    /**
     * Runs folding operations after a state update, followed by a UI update.
     *
     * If this._forceSync is true, completes syncronously. If false, operations are pushed to this._opQueue,
     * such that every update/game tick we try to complete some work and update a status indicator
     * (yielding the event loop occasionally when possible to limit UI freezing), and resolves once complete.
     *
     * @param targetIndex The index of the pose which a change was made in
     */
    private poseEditByTargetDoFold(targetIndex: number) {
        this.showAsyncText('folding...');
        this.pushUILock(PoseEditMode.FOLDING_LOCK);

        if (this.forceSync) {
            for (let ii = 0; ii < this._targetPairs.length; ii++) {
                this.poseEditByTargetFoldTarget(ii, true);
                if (this._constraintBar.requiresDotPlot) {
                    const undoBlock = this._seqStacks[this._stackLevel][ii];
                    undoBlock.updateMeltingPointAndDotPlot({
                        sync: true,
                        pseudoknots: (
                            undoBlock.targetConditions !== undefined
                            && undoBlock.targetConditions['type'] === 'pseudoknot'
                        ),
                        skipMelt: true
                    });
                }
            }
            this.poseEditByTargetEpilog(targetIndex);
            return Promise.resolve();
        } else {
            for (let ii = 0; ii < this._targetPairs.length; ii++) {
                this._opQueue.push(new PoseOp(ii + 1, () => this.poseEditByTargetFoldTarget(ii, false)));
                if (this._constraintBar.requiresDotPlot) {
                    this._opQueue.push(new PoseOp(ii + 1, async () => {
                        const undoBlock = this._seqStacks[this._stackLevel][ii];
                        await undoBlock.updateMeltingPointAndDotPlot({
                            sync: false,
                            pseudoknots: (
                                undoBlock.targetConditions !== undefined
                                && undoBlock.targetConditions['type'] === 'pseudoknot'
                            ),
                            skipMelt: true
                        });
                    }));
                }
            }

            this._opQueue.push(
                new PoseOp(this._targetPairs.length + 1, () => this.poseEditByTargetEpilog(targetIndex))
            );

            return new Promise<void>((resolve) => {
                this._opQueue.push(new PoseOp(null, resolve));
            });
        }
    }

    /**
     * Performs folding operations for a given target/state and pushes a new UndoBlock with the result.
     *
     * @param ii The index of the target/(switch) state to fold
     * @param sync Whether we have to run folding syncronously or not. If true, we can't use
     * asyncronous folders. If false, we `await` the fold result.
     */
    private poseEditByTargetFoldTarget(ii: number, sync: true): void
    private async poseEditByTargetFoldTarget(ii: number, sync: false): Promise<void>
    private async poseEditByTargetFoldTarget(ii: number, sync: boolean): Promise<void> {
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
        if (tc === undefined || (tc && tc['type'] === 'single')) {
            if (sync) {
                if (!this._folder.isSync()) {
                    throw new Error('Cannot call asynchronous folder synchronously');
                }
                bestPairs = this._folder.foldSequence(this._puzzle.transformSequence(seq, ii), null, forceStruct);
            } else {
                bestPairs = await this._folder.foldSequence(this._puzzle.transformSequence(seq, ii), null, forceStruct);
            }
        } else if (tc['type'] === 'pseudoknot') {
            if (sync) {
                if (!this._folder.isSync()) {
                    throw new Error('Cannot call asynchronous folder synchronously');
                }
                bestPairs = this._folder.foldSequence(
                    this._puzzle.transformSequence(seq, ii),
                    null, forceStruct,
                    true
                );
            } else {
                bestPairs = await this._folder.foldSequence(
                    this._puzzle.transformSequence(seq, ii),
                    null, forceStruct,
                    true
                );
            }
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
                if (sync) {
                    if (!this._folder.isSync()) {
                        throw new Error('Cannot call asynchronous folder synchronously');
                    }
                    bestPairs = this._folder.foldSequence(fullSeq, null, forceStruct);
                } else {
                    bestPairs = await this._folder.foldSequence(fullSeq, null, forceStruct);
                }
            } else {
                const fullSeq = seq.concat(Sequence.fromSequenceString(tc['oligo_sequence'] as string));
                if (sync) {
                    if (!this._folder.isSync()) {
                        throw new Error('Cannot call asynchronous folder synchronously');
                    }
                    bestPairs = this._folder.foldSequence(fullSeq, null, forceStruct);
                } else {
                    bestPairs = await this._folder.foldSequence(fullSeq, null, forceStruct);
                }
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
                temp: EPars.DEFAULT_TEMPERATURE
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
                    () => this.poseEditByTargetFoldTarget(ii + this._targetPairs.length, false)
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
        undoBlock.setPairs(bestPairs, EPars.DEFAULT_TEMPERATURE, pseudoknots);
        undoBlock.targetOligos = this._targetOligos[ii];
        undoBlock.targetOligo = this._targetOligo[ii];
        undoBlock.oligoOrder = oligoOrder;
        undoBlock.oligosPaired = oligosPaired;
        undoBlock.targetPairs = this._targetPairs[ii];
        undoBlock.targetOligoOrder = this._targetOligosOrder[ii];
        undoBlock.puzzleLocks = this._poses[ii].puzzleLocks;
        undoBlock.targetConditions = this._targetConditions[ii];
        undoBlock.setBasics(EPars.DEFAULT_TEMPERATURE, pseudoknots);
        undoBlock.librarySelections = this._poses[ii].librarySelections;
        this._seqStacks[this._stackLevel][ii] = undoBlock;
    }

    /**
     * Perform all UI and additional state updates necessary after folding completes.
     *
     * @param targetIndex The index of the pose that was originally updated
     */
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

        let lastBestPairs: SecStruct = this._seqStacks[this._stackLevel][targetIndex].getPairs(
            EPars.DEFAULT_TEMPERATURE, pseudoknots
        );
        const bestPairs: SecStruct = lastBestPairs;

        if (this._stackLevel > 0) {
            lastBestPairs = this._seqStacks[this._stackLevel - 1][targetIndex].getPairs(
                EPars.DEFAULT_TEMPERATURE, pseudoknots
            );
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

        // JAR: Going forward, we want to use the cached data (target structure, predicted structure, etc)
        // of the *submitter* for post-hoc analysis, so I'm going to disable uploading a cache on
        // loading of an uncached solution. We might consider bringing this (or something like it)
        // back at a future date if we eventually handle that issue.
        /*
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
        */
    }

    protected getCurrentUndoBlock(targetIndex: number = -1): UndoBlock {
        if (targetIndex < 0) {
            return this._seqStacks[this._stackLevel][this._curTargetIndex];
        } else {
            return this._seqStacks[this._stackLevel][targetIndex];
        }
    }

    protected getCurrentUndoBlocks(): UndoBlock[] {
        return this._seqStacks[this._stackLevel];
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
            this._oligoLabel[ii] = this._seqStacks[this._stackLevel][ii].oligoLabel;
            this._targetOligos[ii] = this._seqStacks[this._stackLevel][ii].targetOligos;
            this._targetOligosOrder[ii] = this._seqStacks[this._stackLevel][ii].targetOligoOrder;
        }
    }

    private moveUndoStackForward(): void {
        if (this._stackLevel + 1 > this._stackSize - 1) {
            return;
        }
        this.savePosesMarkersContexts();

        this._stackLevel++;
        this.moveUndoStack();

        this.updateScore();
        this.transformPosesMarkers();
    }

    private moveUndoStackBackward(): void {
        if (this._stackLevel < 1) {
            return;
        }
        this.savePosesMarkersContexts();

        this._stackLevel--;
        this.moveUndoStack();

        this.updateScore();
        this.transformPosesMarkers();
    }

    private moveUndoStackToLastStable(): void {
        this.savePosesMarkersContexts();

        const stackLevel: number = this._stackLevel;
        while (this._stackLevel >= 1) {
            if (this.getCurrentUndoBlock(0).stable) {
                this.moveUndoStack();

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
            e.letterMode = value;
        });
    }

    public get toolbar(): Toolbar {
        return this._toolbar;
    }

    public get modeBar() {
        return this._modeBar;
    }

    public get naturalButton(): ToolbarButton {
        return this._naturalButton;
    }

    public get targetButton(): ToolbarButton {
        return this._targetButton;
    }

    public get stateToggle(): StateToggle | null {
        return this._stateToggle;
    }

    public get folderSwitcher(): FolderSwitcher {
        return this._folderSwitcher;
    }

    public get helpBar(): HelpBar {
        return this._helpBar;
    }

    private readonly _puzzle: Puzzle;
    private readonly _params: PoseEditParams;
    private readonly _scriptInterface = new ExternalInterfaceCtx();
    private readonly _autosaveData: SaveStoreItem | null;
    private _savedInputs: SubmitPoseDetails;

    private _constraintsLayer: Container;

    private _background: Background;

    private _helpBar: HelpBar;

    protected get _folder(): Folder {
        return this._folderSwitcher.selectedFolder.value;
    }

    // / Asynch folding
    private _opQueue: PoseOp[] = [];
    private _asynchText: Text;
    // / Undo stack
    private _stackLevel: number;
    private _stackSize: number;
    private _alreadyCleared: boolean = false;
    private _paused: boolean;
    private _startSolvingTime: number;
    protected _curTargetIndex: number = 0;
    private _shouldMarkMutations: boolean = false;

    private _seqStacks: UndoBlock[][];
    protected _targetPairs: SecStruct[] = [];
    protected _targetConditions: (TargetConditions | undefined)[] = [];
    private _targetOligo: (RNABase[] | undefined)[] = [];
    private _oligoMode: (number | undefined)[] = [];
    private _oligoName: (string | undefined)[] = [];
    private _oligoLabel: (string | undefined)[] = [];
    private _targetOligos: (Oligo[] | undefined)[] = [];
    private _targetOligosOrder: (number[] | undefined)[] = [];

    private _modeBar: ModeBar;
    private _folderSwitcher: FolderSwitcher;
    private _markerSwitcher: MarkerSwitcher;
    private _naturalButton: ToolbarButton;
    private _targetButton: ToolbarButton;
    private _stateToggle: StateToggle | null = null;

    private _isFrozen: boolean = false;
    private _targetName: Text;

    private _hintBoxRef: GameObjectRef = GameObjectRef.NULL;

    private _constraintBar: ConstraintBar;

    private _exitButton: GameButton;

    private _uiHighlight: SpriteObject;

    private _homeButton: GameButton;
    private _ropPresets: (() => void)[] = [];

    private _isPlaying: boolean = false;
    private _curSolutionIdx: number;
    private _solutionNameText: Text;

    // Dialogs
    private _specBox: SpecBoxDialog | null = null;

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

import * as log from 'loglevel';
import {
    Container, DisplayObject, Point, Sprite, Text, Rectangle
} from 'pixi.js';
import EPars from 'eterna/EPars';
import Eterna from 'eterna/Eterna';
import UndoBlock, {UndoBlockParam} from 'eterna/UndoBlock';
import Solution from 'eterna/puzzle/Solution';
import Puzzle, {PuzzleType, PoseState, BoostersData} from 'eterna/puzzle/Puzzle';
import Background from 'eterna/vfx/Background';
import Toolbar, {ToolbarType} from 'eterna/ui/Toolbar';
import SpecBox from 'eterna/ui/SpecBox';
import GameButton from 'eterna/ui/GameButton';
import Bitmaps from 'eterna/resources/Bitmaps';
import {
    KeyCode, SpriteObject, DisplayUtil, HAlign, VAlign, Flashbang, KeyboardEventType, Assert,
    GameObjectRef, SerialTask, AlphaTask, Easing, SelfDestructTask, ContainerObject
} from 'flashbang';
import ActionBar from 'eterna/ui/ActionBar';
import Fonts from 'eterna/util/Fonts';
import PasteSequenceDialog from 'eterna/ui/PasteSequenceDialog';
import EternaViewOptionsDialog, {EternaViewOptionsMode} from 'eterna/ui/EternaViewOptionsDialog';
import FolderManager from 'eterna/folding/FolderManager';
import Folder from 'eterna/folding/Folder';
import {PaletteTargetType, GetPaletteTargetBaseType} from 'eterna/ui/NucleotidePalette';
import GamePanel from 'eterna/ui/GamePanel';
import HTMLTextObject from 'eterna/ui/HTMLTextObject';
import PoseField from 'eterna/pose2D/PoseField';
import Pose2D, {Oligo} from 'eterna/pose2D/Pose2D';
import PuzzleEditOp from 'eterna/pose2D/PuzzleEditOp';
import BitmapManager from 'eterna/resources/BitmapManager';
import ConstraintBar from 'eterna/constraints/ConstraintBar';
import ConstraintBox from 'eterna/constraints/ConstraintBox';
import int from 'eterna/util/int';
import PoseOp from 'eterna/pose2D/PoseOp';
import RNAScript from 'eterna/rscript/RNAScript';
import SolutionManager from 'eterna/puzzle/SolutionManager';
import ExternalInterface, {ExternalInterfaceCtx} from 'eterna/util/ExternalInterface';
import ContextMenu from 'eterna/ui/ContextMenu';
import SpecBoxDialog from 'eterna/ui/SpecBoxDialog';
import BubbleSweep from 'eterna/vfx/BubbleSweep';
import Sounds from 'eterna/resources/Sounds';
import EternaURL from 'eterna/net/EternaURL';
import PuzzleManager from 'eterna/puzzle/PuzzleManager';
import URLButton from 'eterna/ui/URLButton';
import FoldUtil from 'eterna/folding/FoldUtil';
import ShapeConstraint, {AntiShapeConstraint} from 'eterna/constraints/constraints/ShapeConstraint';
import {HighlightType} from 'eterna/pose2D/HighlightBox';
import Utility from 'eterna/util/Utility';
import HintsPanel from 'eterna/ui/HintsPanel';
import HelpBar from 'eterna/ui/HelpBar';
import HelpScreen from 'eterna/ui/help/HelpScreen';
import NucleotideFinder from 'eterna/ui/NucleotideFinder';
import NucleotideRangeSelector from 'eterna/ui/NucleotideRangeSelector';
import {PuzzleEditPoseData} from '../PuzzleEdit/PuzzleEditMode';
import CopyTextDialogMode from '../CopyTextDialogMode';
import GameMode from '../GameMode';
import SubmittingDialog from './SubmittingDialog';
import SubmitPoseDialog from './SubmitPoseDialog';
import SubmitPoseDetails from './SubmitPoseDetails';
import MissionIntroMode from './MissionIntroMode';
import MissionClearedPanel from './MissionClearedPanel';

type InteractionEvent = PIXI.interaction.InteractionEvent;

export enum PuzzleState {
    SETUP = -1,
    COUNTDOWN = 0,
    GAME = 1,
    CLEARED = 2,
}

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

export interface OligoDef {
    sequence: string;
    malus: number;
    name: string;
    bind?: boolean;
    concentration?: string;
    label?: string;
}

export default class PoseEditMode extends GameMode {
    constructor(puzzle: Puzzle, params: PoseEditParams, autosaveData: any[] = null) {
        super();
        this._puzzle = puzzle;
        this._params = params;
        this._autosaveData = autosaveData;

        if (this._params.rscript != null) {
            puzzle.rscript = this._params.rscript;
        }
    }

    public get puzzleID(): number { return this._puzzle.nodeID; }

    public get isOpaque(): boolean { return true; }

    protected setup(): void {
        super.setup();

        this._background = new Background();
        this.addObject(this._background, this.bgLayer);

        let toolbarType = this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL ? ToolbarType.LAB : ToolbarType.PUZZLE;
        this._toolbar = new Toolbar(toolbarType, {
            states: this._puzzle.getSecstructs().length,
            boosters: this._puzzle.boosters
        });
        this.addObject(this._toolbar, this.uiLayer);

        this._helpBar = new HelpBar({
            onHintClicked: this._puzzle.hint
                ? () => this.onHintClicked()
                : undefined,
            onHelpClicked: () => this.onHelpClicked()
        });
        this.addObject(this._helpBar, this.uiLayer);

        // Chat
        this._chatButton = new GameButton()
            .up(Bitmaps.ImgChat)
            .over(Bitmaps.ImgChat)
            .down(Bitmaps.ImgChat)
            .tooltip('Chat');
        this.addObject(this._chatButton, this.container);
        this.regs.add(this._chatButton.clicked.connect(() => {
            Eterna.settings.showChat.value = !Eterna.settings.showChat.value;
        }));

        this._toolbar.undoButton.clicked.connect(() => this.moveUndoStackBackward());
        this._toolbar.redoButton.clicked.connect(() => this.moveUndoStackForward());
        this._toolbar.zoomOutButton.clicked.connect(() => {
            for (let poseField of this._poseFields) {
                poseField.zoomOut();
            }
        });
        this._toolbar.zoomInButton.clicked.connect(() => {
            for (let poseField of this._poseFields) {
                poseField.zoomIn();
            }
        });
        this._toolbar.submitButton.clicked.connect(() => this.submitCurrentPose());
        this._toolbar.viewSolutionsButton.clicked.connect(() => {
            this.pushUILock();
            Eterna.app.switchToDesignBrowser(this._puzzle)
                .then(() => this.popUILock())
                .catch((e) => {
                    log.error(e);
                    this.popUILock();
                });
        });
        this._toolbar.resetButton.clicked.connect(() => this.showResetPrompt());
        this._toolbar.naturalButton.clicked.connect(() => this.togglePoseState());
        this._toolbar.targetButton.clicked.connect(() => this.togglePoseState());
        this._toolbar.specButton.clicked.connect(() => this.showSpec());
        this._toolbar.copyButton.clicked.connect(() => this.showCopySequenceDialog());
        this._toolbar.pasteButton.clicked.connect(() => this.showPasteSequenceDialog());
        this._toolbar.viewOptionsButton.clicked.connect(() => this.showViewOptionsDialog());
        this._toolbar.screenshotButton.clicked.connect(() => this.postScreenshot(this.createScreenshot()));

        this._toolbar.pipButton.clicked.connect(() => this.togglePip());

        this._toolbar.stateToggle.stateChanged.connect((targetIdx) => this.changeTarget(targetIdx));

        this._toolbar.freezeButton.clicked.connect(() => this.toggleFreeze());
        this._toolbar.palette.targetClicked.connect((targetType) => this.onPaletteTargetSelected(targetType));
        this._toolbar.pairSwapButton.clicked.connect(() => this.onSwapClicked());

        this._toolbar.nucleotideFindButton.clicked.connect(() => {
            this.showDialog(new NucleotideFinder()).closed.then((result) => {
                if (result != null) {
                    if (this._isPipMode) {
                        this._poses.forEach((p) => p.focusNucleotide(result.nucleotideIndex));
                    } else {
                        this._poses[this._curTargetIndex].focusNucleotide(result.nucleotideIndex);
                    }
                }
            });
        });

        this._toolbar.nucleotideRangeButton.clicked.connect(() => {
            const initialRange = this._nucleotideRangeToShow
                ?? (() => {
                    if (this._isPipMode) {
                        return [
                            1,
                            Math.min(...this._poses.map((p) => p.fullSequenceLength))
                        ];
                    } else {
                        return [1, this._poses[this._curTargetIndex].fullSequenceLength];
                    }
                })() as [number, number];

            this.showDialog(
                new NucleotideRangeSelector({
                    initialRange,
                    isPartialRange: Boolean(this._nucleotideRangeToShow)
                })
            )
                .closed
                .then((result) => {
                    if (result === null) {
                        return;
                    }

                    if (result.clearRange) {
                        this._nucleotideRangeToShow = null;
                    } else {
                        this._nucleotideRangeToShow = [result.startIndex, result.endIndex];
                    }

                    if (this._isPipMode) {
                        this._poses.forEach((p) => p.showNucleotideRange(this._nucleotideRangeToShow));
                    } else {
                        this._poses[this._curTargetIndex].showNucleotideRange(this._nucleotideRangeToShow);
                    }
                });
        });

        // Add our docked SpecBox at the bottom of uiLayer
        this._dockedSpecBox = new SpecBox(true);
        this._dockedSpecBox.display.position = new Point(15, 190);
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

        this._constraintsLayer = new Container();
        this.uiLayer.addChild(this._constraintsLayer);

        this._exitButton = new GameButton().allStates(Bitmaps.ImgNextInside);
        this._exitButton.display.scale = new Point(0.3, 0.3);
        this._exitButton.display.visible = false;
        this.regs.add(this._exitButton.clicked.connect(() => this.exitPuzzle()));

        this._scriptbar = new ActionBar(50);
        this.addObject(this._scriptbar, this.uiLayer);

        this._nidField = Fonts.arial('', 16).color(0xffffff).build();
        this._nidField.width = 100;
        this._nidField.height = 20;

        this._runButton = new GameButton().allStates(Bitmaps.MingFold);

        this._runStatus = Fonts.arial('idle', 16).bold().color(0xC0C0C0).build();
        this._runStatus.width = 200;
        this._runStatus.height = 20;

        this._targetName = Fonts.stdRegular('', 18).build();
        this._targetName.visible = false;
        this.uiLayer.addChild(this._targetName);

        this._homeButton = new GameButton()
            .up(Bitmaps.ImgHome)
            .over(Bitmaps.ImgHome)
            .down(Bitmaps.ImgHome);
        this._homeButton.display.position = new Point(18, 10);
        this._homeButton.clicked.connect(() => {
            window.location.href = EternaURL.createURL({page: 'lab_bench'});
        });
        this.addObject(this._homeButton, this.uiLayer);

        const homeArrow = new Sprite(BitmapManager.getBitmap(Bitmaps.ImgHomeArrow));
        homeArrow.position = new Point(45, 14);
        this.container.addChild(homeArrow);

        // Async text shows above our UI lock, and right below all dialogs
        this._asynchText = Fonts.arial('folding...', 12).bold().color(0xffffff).build();
        this._asynchText.position = new Point(16, 200);
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

    private updateUILayout(): void {
        DisplayUtil.positionRelativeToStage(
            this._toolbar.display, HAlign.CENTER, VAlign.BOTTOM,
            HAlign.CENTER, VAlign.BOTTOM, 20, -20
        );

        this._toolbar.onResized();

        DisplayUtil.positionRelativeToStage(
            this._helpBar.display, HAlign.RIGHT, VAlign.TOP,
            HAlign.RIGHT, VAlign.TOP, 0, 0
        );

        DisplayUtil.positionRelativeToStage(
            this._chatButton.display, HAlign.RIGHT, VAlign.BOTTOM,
            HAlign.RIGHT, VAlign.BOTTOM, -15, -15
        );

        DisplayUtil.positionRelativeToStage(
            this._solutionNameText, HAlign.CENTER, VAlign.TOP,
            HAlign.CENTER, VAlign.TOP, 0, 8
        );

        this._exitButton.display.position = new Point(Flashbang.stageWidth - 85, Flashbang.stageHeight - 60);
        this._undockSpecBoxButton.display.position = new Point(Flashbang.stageWidth - 22, 5);

        this._scriptbar.display.position = new Point(
            Flashbang.stageWidth - 20 - this._scriptbar.width,
            Flashbang.stageHeight - 129
        );

        this._constraintBar.layout(false, this._isPipMode ? this._targetConditions.length : 1);

        this._dockedSpecBox.setSize(Flashbang.stageWidth, Flashbang.stageHeight - 340);
        let s: number = this._dockedSpecBox.plotSize;
        this._dockedSpecBox.setSize(s + 55, s * 2 + 51);
    }

    public get toolbar(): Toolbar {
        return this._toolbar;
    }

    public get constraintsLayer(): Container {
        return this._constraintsLayer;
    }

    private showPasteSequenceDialog(): void {
        let customNumbering = this._poses[0].customNumbering;
        this.showDialog(new PasteSequenceDialog(customNumbering)).closed.then((sequence) => {
            if (sequence !== null) {
                for (let pose of this._poses) {
                    pose.pasteSequence(sequence);
                }
            }
        });
    }

    private showViewOptionsDialog(): void {
        let mode = this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL
            ? EternaViewOptionsMode.LAB
            : EternaViewOptionsMode.PUZZLE;
        this.showDialog(new EternaViewOptionsDialog(mode));
    }

    private showCopySequenceDialog(): void {
        let sequenceString = EPars.sequenceToString(this._poses[0].sequence);
        if (this._poses[0].customNumbering != null) sequenceString += ` ${Utility.arrayToRangeString(this._poses[0].customNumbering)}`;
        this.modeStack.pushMode(new CopyTextDialogMode(sequenceString, 'Current Sequence'));
    }

    public setPuzzleState(newstate: PuzzleState): void {
        this._puzState = newstate;
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
        for (let pose of this._poses) {
            pose.displayScoreTexts = display;
        }
    }

    public ropSetDisplayScoreTexts(display: boolean): void {
        this._ropPresets.push(() => this.setDisplayScoreTexts(display));
    }

    public setShowNumbering(show: boolean): void {
        for (let pose of this._poses) {
            pose.showNumbering = show;
        }
    }

    public ropSetShowNumbering(show: boolean): void {
        this._ropPresets.push(() => this.setShowNumbering(show));
    }

    public setShowRope(show: boolean): void {
        for (let pose of this._poses) {
            pose.showRope = show;
        }
    }

    public setShowTotalEnergy(show: boolean): void {
        for (let pose of this._poses) {
            pose.showTotalEnergy = show;
        }
    }

    public ropSetShowTotalEnergy(show: boolean): void {
        this._ropPresets.push(() => this.setShowTotalEnergy(show));
    }

    public selectFolder(folderName: string): boolean {
        if (this._folder.name === folderName) return true;
        let folder: Folder = FolderManager.instance.getFolder(folderName);
        if (this._puzzle.hasTargetType('multistrand') && !folder.canMultifold) {
            return false;
        }

        this._folder = folder;
        this.onFolderUpdated();
        return true;
    }

    public onPaletteTargetSelected(type: PaletteTargetType): void {
        let baseType: number = GetPaletteTargetBaseType(type);
        this.setPosesColor(baseType);
    }

    public onSwapClicked(): void {
        this.setPosesColor(EPars.RNABASE_PAIR);
    }

    public onHintClicked(): void {
        if (this._hintBoxRef.isLive) {
            this._hintBoxRef.destroyObject();
        } else {
            const {panel, positionUpdater} = HintsPanel.create(this._puzzle.hint);
            this._hintBoxRef = this.addObject(panel, this.container);
            panel.regs.add(this.resized.connect(positionUpdater));
        }
    }

    public publicStartCountdown(): void {
        this.startCountdown();
    }

    private onHelpClicked() {
        const toolBar = this.toolbar;
        const getBounds = (elem: ContainerObject) => new Rectangle(
            // worldTransform seems unreliable. TODO investigate.
            elem.container.x + toolBar.container.x + toolBar.position.x,
            elem.container.y + toolBar.container.y + toolBar.position.y,
            elem.container.width,
            elem.container.height
        );

        const switchStateButton = Boolean(this.toolbar.stateToggle.container.parent)
            && this.toolbar.stateToggle.display.visible;
        this.modeStack.pushMode(new HelpScreen({
            toolTips: {
                hints: this._puzzle.hint
                    ? [
                        () => new Rectangle(
                            this._helpBar.container.x,
                            this._helpBar.container.y,
                            this._helpBar.container.width,
                            this._helpBar.container.height
                        ),
                        -32
                    ]
                    : undefined,

                modeSwitch: this.toolbar.naturalButton.display.visible
                    ? [() => getBounds(this.toolbar.naturalButton), this.toolbar.naturalButton.container.width / 2]
                    : undefined,

                swapPairs: this.toolbar.pairSwapButton.display.visible
                    ? [() => getBounds(this.toolbar.pairSwapButton), 0]
                    : undefined,

                pip: this.toolbar.pipButton.container.parent
                    ? [() => getBounds(this.toolbar.pipButton), 0]
                    : undefined,

                switchState: switchStateButton
                    ? [
                        () => new Rectangle(
                            this.toolbar.stateToggle.container.x + this.toolbar.container.x,
                            this.toolbar.stateToggle.container.y + this.toolbar.container.y,
                            this.toolbar.stateToggle.container.width,
                            this.toolbar.stateToggle.container.height
                        ),
                        0
                    ]
                    : undefined,

                submit: this.toolbar.submitButton.container.parent
                    ? [() => getBounds(this.toolbar.submitButton), 0]
                    : undefined,

                menu: [() => getBounds(this.toolbar.actionMenu), 0],

                palette: this.toolbar.palette.container.visible
                    ? [() => getBounds(this.toolbar.palette), 0]
                    : undefined,

                zoom: [() => getBounds(this.toolbar.zoomInButton), this.toolbar.zoomInButton.container.width / 2],

                undo: this.toolbar.undoButton.display.visible
                    ? [() => getBounds(this.toolbar.undoButton), this.toolbar.undoButton.container.width / 2]
                    : undefined
            }
        }));
    }

    private showSolution(solution: Solution): void {
        this.clearUndoStack();
        this.pushUILock();

        const setSolution = (foldData: any[]) => {
            this.hideAsyncText();
            this.popUILock();

            if (foldData != null) {
                this._stackLevel++;
                this._stackSize = this._stackLevel + 1;
                this._seqStacks[this._stackLevel] = [];

                for (let ii = 0; ii < this._poses.length; ii++) {
                    let undoBlock: UndoBlock = new UndoBlock([]);
                    undoBlock.fromJSON(foldData[ii]);
                    this._seqStacks[this._stackLevel][ii] = undoBlock;
                }

                this.savePosesMarkersContexts();
                this.moveUndoStack();
                this.updateScore();
                this.transformPosesMarkers();
            } else {
                const sequence = EPars.stringToSequence(solution.sequence);
                for (let pose of this._poses) {
                    pose.pasteSequence(sequence);
                }
            }
            this.clearMoveTracking(solution.sequence);
            this.setAncestorId(solution.nodeID);

            this.updateSolutionNameText(solution);
            this._curSolution = solution;
        };

        if (this._puzzle.hasTargetType('multistrand')) {
            this.showAsyncText('retrieving...');
            solution.queryFoldData().then((result) => setSolution(result));
        } else {
            setSolution(null);
        }
    }

    private updateSolutionNameText(solution: Solution): void {
        this._solutionNameText.text = `${solution.title} (${solution.playerName})`;
        this._solutionNameText.visible = true;
        DisplayUtil.positionRelativeToStage(
            this._solutionNameText, HAlign.CENTER, VAlign.TOP,
            HAlign.CENTER, VAlign.TOP, 0, 8
        );
    }

    private setPuzzle(): void {
        let poseFields: PoseField[] = [];

        let targetSecstructs: string[] = this._puzzle.getSecstructs();
        let targetConditions: any[] = this._puzzle.targetConditions;

        // TSC: this crashes, and doesn't seem to accomplish anything
        // let before_reset: number[] = null;
        // if (is_reset) {
        //     before_reset = this._puzzle.transform_sequence(this.get_current_undo_block(0).get_sequence(), 0);
        // }

        let bindAddbaseCB = (pose: Pose2D, kk: number) => {
            pose.addBaseCallback = ((parenthesis: string, mode: PuzzleEditOp, index: number) => {
                pose.baseShift(parenthesis, mode, index);
                this.poseEditByTarget(kk);
            });
        };

        let bindPoseEdit = (pose: Pose2D, index: number) => {
            pose.poseEditCallback = (() => {
                this.poseEditByTarget(index);
            });
        };
        let bindTrackMoves = (pose: Pose2D, index: number) => {
            pose.trackMovesCallback = ((count: number, moves: any[]) => {
                this._moveCount += count;
                if (moves) {
                    this._moves.push(moves.slice());
                }
            });
        };

        let bindMousedownEvent = (pose: Pose2D, index: number) => {
            pose.startMousedownCallback = ((e: InteractionEvent, closestDist: number, closestIndex: number) => {
                for (let ii = 0; ii < poseFields.length; ++ii) {
                    let poseField: PoseField = poseFields[ii];
                    let poseToNotify: Pose2D = poseField.pose;
                    if (index === ii) {
                        poseToNotify.onPoseMouseDown(e, closestIndex);
                    } else {
                        poseToNotify.onPoseMouseDownPropagate(e, closestIndex);
                    }
                }
            });
        };

        for (let ii = 0; ii < targetConditions.length; ii++) {
            let poseField: PoseField = new PoseField(true);
            this.addObject(poseField, this.poseLayer);
            let pose: Pose2D = poseField.pose;
            bindAddbaseCB(pose, ii);
            bindPoseEdit(pose, ii);
            bindTrackMoves(pose, ii);
            bindMousedownEvent(pose, ii);
            poseFields.push(poseField);
        }

        this.setPoseFields(poseFields);

        this._isDatabrowserMode = false;
        // if (this.root.loaderInfo.parameters.databrowser
        //     && this.root.loaderInfo.parameters.databrowser === "true") {
        //     this._is_databrowser_mode = true;
        // }

        for (let ii = 0; ii < targetSecstructs.length; ii++) {
            this._targetConditions.push(targetConditions[ii]);
            this._targetOligos.push(null);
            this._targetOligosOrder.push(null);
            this._targetOligo.push(null);
            this._oligoMode.push(null);
            this._oligoName.push(null);
            if (targetConditions[ii] && targetConditions[ii]['oligo_sequence']) {
                this._targetOligo[ii] = EPars.stringToSequence(targetConditions[ii]['oligo_sequence']);
                this._oligoMode[ii] = targetConditions[ii]['fold_mode'] == null
                    ? Pose2D.OLIGO_MODE_DIMER
                    : Number(targetConditions[ii]['fold_mode']);
                this._oligoName[ii] = targetConditions[ii]['oligo_name'];
            }
            if (targetConditions[ii] && targetConditions[ii]['oligos']) {
                let odefs: OligoDef[] = targetConditions[ii]['oligos'];
                let ndefs: Oligo[] = [];
                for (let jj = 0; jj < odefs.length; jj++) {
                    ndefs.push({
                        sequence: EPars.stringToSequence(odefs[jj].sequence),
                        malus: odefs[jj].malus,
                        name: odefs[jj]['name']
                    });
                }
                this._targetOligos[ii] = ndefs;
            }
        }

        this._exitButton.display.visible = false;
        this.addObject(this._exitButton, this.uiLayer);

        let puzzleTitle = new HTMLTextObject(this._puzzle.getName(true))
            .font(Fonts.STDFONT_BOLD)
            .fontSize(14)
            .bold()
            .selectable(false)
            .color(0xC0DCE7);
        puzzleTitle.hideWhenModeInactive();
        this.addObject(puzzleTitle, this.uiLayer);
        puzzleTitle.display.position = new Point(57, 8);

        this._solutionNameText = Fonts.arial('', 14).bold().color(0xc0c0c0).build();
        this.uiLayer.addChild(this._solutionNameText);

        this._constraintsLayer.visible = true;

        if (!this._puzzle.isPalleteAllowed) {
            for (let pose of this._poses) {
                pose.currentColor = -1;
            }
        } else {
            this._toolbar.palette.clickTarget(PaletteTargetType.A);
        }

        this._constraintBar = new ConstraintBar(this._puzzle.constraints);
        this.addObject(this._constraintBar, this._constraintsLayer);
        this._constraintBar.sequenceHighlights.connect((highlightInfos) => {
            for (let [poseIdx, pose] of this._poses.entries()) {
                pose.clearRestrictedHighlight();
                pose.clearUnstableHighlight();
                pose.clearUserDefinedHighlight();
                let poseState = this._isPipMode ? poseIdx : this._curTargetIndex;
                for (let highlightInfo of highlightInfos) {
                    if (highlightInfo && (highlightInfo.stateIndex == null || poseState === highlightInfo.stateIndex)) {
                        let currBlock = this.getCurrentUndoBlock(poseState);
                        let naturalMap = currBlock.reorderedOligosIndexMap(currBlock.oligoOrder);
                        let ranges = (this._poseState === PoseState.NATIVE && naturalMap != null)
                            ? highlightInfo.ranges.map((index) => naturalMap.indexOf(index)) : highlightInfo.ranges;

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
        });

        let pairs: number[] = EPars.parenthesisToPairs(this._puzzle.getSecstruct());

        // / Setup Action bar
        this._scriptbar.clearItems(false);

        // this._scriptbar.visible = false;
        // if (this.root.loaderInfo.parameters.scriptbar
        //     && this.root.loaderInfo.parameters.scriptbar === "true") {
        //     this._scriptbar.visible = true;
        //     this._scriptbar.add_item(this._nid_field, false, false);
        //     this._scriptbar.add_item(this._run_button, false, false);
        //     this._scriptbar.add_item(this._run_status);
        //
        //     if (ExternalInterface.available) {
        //         this._scriptbar.set_disabled(false);
        //         this._run_button.set_click_callback(this.on_click_run);
        //     } else {
        //         this._scriptbar.enabled = false;
        //         this._run_button.set_click_callback(null);
        //     }
        // }

        let initialFolder: Folder = null;
        if (this._params.initialFolder != null) {
            initialFolder = FolderManager.instance.getFolder(this._params.initialFolder);
            if (initialFolder == null) {
                log.warn(`No such folder '${this._params.initialFolder}'`);
            }
        }

        this._folder = initialFolder || FolderManager.instance.getFolder(this._puzzle.folderName);

        // now that we have made the folder check, we can set _targetPairs. Used to do this
        // above but because NuPACK can handle pseudoknots, we shouldn't
        for (let ii = 0; ii < targetSecstructs.length; ii++) {
            if (this._targetConditions && this._targetConditions[0]
                    && this._targetConditions[0]['type'] === 'pseudoknot') {
                this._targetPairs.push(EPars.parenthesisToPairs(targetSecstructs[ii], true));
                this._poseFields[ii].pose.pseudoknotted = true;
            } else {
                this._targetPairs.push(EPars.parenthesisToPairs(targetSecstructs[ii]));
            }
        }

        this._folderButton = new GameButton()
            .allStates(Bitmaps.ShapeImg)
            .label(this._folder.name, 22)
            .tooltip('Select the folding engine.');
        this._folderButton.display.position = new Point(17, 160);
        this._folderButton.display.scale = new Point(0.5, 0.5);
        this.addObject(this._folderButton, this.uiLayer);
        if (this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL) {
            this._folderButton.clicked.connect(() => this.changeFolder());
            this.regs.add(Eterna.settings.multipleFoldingEngines.connectNotify((multiEngine) => {
                this._folderButton.display.visible = multiEngine;
            }));
        } else {
            this._folderButton.display.visible = false;
        }

        if (this._folder.canScoreStructures) {
            for (let pose of this._poses) {
                pose.scoreFolder = this._folder;
            }
        } else {
            for (let pose of this._poses) {
                pose.scoreFolder = null;
            }
        }

        let initialSequence: number[] = null;
        if (this._params.initSolution != null) {
            initialSequence = EPars.stringToSequence(this._params.initSolution.sequence);
            this._curSolution = this._params.initSolution;
            this.updateSolutionNameText(this._curSolution);
        } else if (this._params.initSequence != null) {
            initialSequence = EPars.stringToSequence(this._params.initSequence);
        }

        for (let ii = 0; ii < this._poses.length; ii++) {
            let seq = initialSequence;
            if (seq == null) {
                seq = this._puzzle.getBeginningSequence(ii);
                if (this._puzzle.puzzleType === PuzzleType.CHALLENGE && !this._params.isReset) {
                    let savedSeq: number[] = this._puzzle.savedSequence;
                    if (savedSeq != null) {
                        if (savedSeq.length === seq.length) {
                            seq = savedSeq;
                        }
                    }
                }
            } else if (this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL && this._puzzle.isUsingTails) {
                seq = Puzzle.probeTail(seq);
            }

            this._poses[ii].sequence = this._puzzle.transformSequence(seq, ii);
            if (this._puzzle.barcodeIndices != null) {
                this._poses[ii].barcodes = this._puzzle.barcodeIndices;
            }
            this._poses[ii].setOligos(this._targetOligos[ii], this._targetOligosOrder[ii]);
            this._poses[ii].setOligo(this._targetOligo[ii], this._oligoMode[ii], this._oligoName[ii]);
            this._poses[ii].pairs = this._targetPairs[ii];
            this._poses[ii].targetPairs = this._targetPairs[ii];
            if (this._targetConditions != null && this._targetConditions[ii] != null) {
                this._poses[ii].structConstraints = this._targetConditions[ii]['structure_constraints'];

                this._poses[ii].customLayout = this._targetConditions[ii]['custom-layout'];
                if (this._poses[ii].customLayout != null
                    && this._poses[ii].customLayout.length !== targetSecstructs[ii].length) {
                    log.warn(
                        'custom-layout field from puzzle objective json does not match target length.'
                        + ' Ignoring custom-layout'
                    );
                    this._poses[ii].customLayout = null;
                }

                this._poses[ii].customNumbering = Utility.numberingJSONToArray(
                    this._targetConditions[ii]['custom-numbering']
                );
                if (this._poses[ii].customNumbering != null) {
                    if (this._poses[ii].customNumbering.length !== targetSecstructs[ii].length) {
                        log.warn(
                            'custom-numbering field from puzzle objective json does not match target length.'
                            + ' Ignoring custom-numbering'
                        );
                        this._poses[ii].customNumbering = null;
                    } else {
                        let x = this._poses[ii].customNumbering;
                        for (let jj = 0; jj < x.length; jj++) {
                            if (x[jj] == null) continue;
                            let kk = x.indexOf(x[jj]);
                            if (kk !== jj) {
                                log.warn(
                                    `custom-numbering field ${String(x[jj])} appears twice.`
                                    + ' Ignoring custom-numbering'
                                );
                                this._poses[ii].customNumbering = null;
                                break;
                            }
                        }
                    }
                }
            }

            this._poses[ii].puzzleLocks = this._puzzle.puzzleLocks;
            this._poses[ii].shiftLimit = this._puzzle.shiftLimit;
        }

        this.clearUndoStack();

        this.setPuzzleState(PuzzleState.SETUP);
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
        this._poseState = this._isDatabrowserMode ? PoseState.NATIVE : this._puzzle.defaultMode;
    }

    public get folder(): Folder {
        return this._folder;
    }

    private buildScriptInterface(): void {
        this._scriptInterface.addCallback('set_script_status', (txt: string): void => {
            this._runStatus.style.fill = 0xC0C0C0;
            this._runStatus.text = txt;
        });

        this._scriptInterface.addCallback('get_sequence_string', (): string => this.getPose(0).getSequenceString());

        this._scriptInterface.addCallback('get_full_sequence', (indx: number): string => {
            if (indx < 0 || indx >= this._poses.length) {
                return null;
            } else {
                return EPars.sequenceToString(this.getPose(indx).fullSequence);
            }
        });

        this._scriptInterface.addCallback('get_locks', (): boolean[] => {
            let pose: Pose2D = this.getPose(0);
            return pose.puzzleLocks.slice(0, pose.sequence.length);
        });

        this._scriptInterface.addCallback('get_targets', (): any[] => {
            let conditions = this._puzzle.targetConditions;
            if (conditions.length === 0) {
                conditions.push(null);
            }
            for (let ii = 0; ii < conditions.length; ii++) {
                if (conditions[ii] == null) {
                    conditions[ii] = {};
                    conditions[ii]['type'] = 'single';
                    conditions[ii]['secstruct'] = this._puzzle.getSecstruct(ii);
                }
            }
            return JSON.parse(JSON.stringify(conditions));
        });

        this._scriptInterface.addCallback('get_native_structure', (indx: number): string => {
            if (indx < 0 || indx >= this._poses.length) return null;
            let nativepairs = this.getCurrentUndoBlock(indx).getPairs();
            return EPars.pairsToParenthesis(nativepairs);
        });

        this._scriptInterface.addCallback('get_full_structure', (indx: number): string => {
            if (indx < 0 || indx >= this._poses.length) {
                return null;
            }

            let nativePairs: number[] = this.getCurrentUndoBlock(indx).getPairs();
            let seqArr: number[] = this.getPose(indx).fullSequence;
            return EPars.pairsToParenthesis(nativePairs, seqArr);
        });

        this._scriptInterface.addCallback('get_free_energy', (indx: number): number => {
            if (indx < 0 || indx >= this._poses.length) {
                return Number.NaN;
            }
            return this.getCurrentUndoBlock(indx).getParam(UndoBlockParam.FE);
        });

        this._scriptInterface.addCallback('check_constraints', (): boolean => this.checkConstraints());

        this._scriptInterface.addCallback('constraint_satisfied', (idx: number): boolean => {
            this.checkConstraints();
            if (idx >= 0 && idx < this.constraintCount) {
                return this._puzzle.constraints[idx].evaluate({
                    undoBlocks: this._seqStacks[this._stackLevel],
                    targetConditions: this._targetConditions,
                    puzzle: this._puzzle
                }).satisfied;
            } else {
                return false;
            }
        });

        this._scriptInterface.addCallback('get_tracked_indices',
            (): number[] => this.getPose(0).trackedIndices.map((mark) => mark.baseIndex));
        this._scriptInterface.addCallback('get_barcode_indices', (): number[] => this._puzzle.barcodeIndices);
        this._scriptInterface.addCallback('is_barcode_available',
            (seq: string): boolean => SolutionManager.instance.checkRedundancyByHairpin(seq));

        this._scriptInterface.addCallback('current_folder', (): string => this._folder.name);

        this._scriptInterface.addCallback('fold', (seq: string, constraint: string = null): string => {
            let seqArr: number[] = EPars.stringToSequence(seq);
            if (this._targetConditions && this._targetConditions[0]
                    && this._targetConditions[0]['type'] === 'pseudoknot') {
                let folded: number[] = this._folder.foldSequence(seqArr, null, constraint, true);
                return EPars.pairsToParenthesis(folded, null, true);
            } else {
                let folded: number[] = this._folder.foldSequence(seqArr, null, constraint);
                return EPars.pairsToParenthesis(folded);
            }
        });

        this._scriptInterface.addCallback('fold_with_binding_site',
            (seq: string, site: number[], bonus: number): string => {
                let seqArr: number[] = EPars.stringToSequence(seq);
                let folded: number[] = this._folder.foldSequenceWithBindingSite(
                    seqArr, null, site, Math.floor(bonus * 100), 2.5
                );
                return EPars.pairsToParenthesis(folded);
            });

        this._scriptInterface.addCallback('energy_of_structure', (seq: string, secstruct: string): number => {
            let seqArr: number[] = EPars.stringToSequence(seq);
            let structArr: number[] = EPars.parenthesisToPairs(secstruct);
            let freeEnergy = 0;
            if (this._targetConditions && this._targetConditions[0]
                    && this._targetConditions[0]['type'] === 'pseudoknot') {
                freeEnergy = this._folder.scoreStructures(seqArr, structArr, true);
            } else {
                freeEnergy = this._folder.scoreStructures(seqArr, structArr);
            }
            return 0.01 * freeEnergy;
        });

        this._scriptInterface.addCallback('pairing_probabilities',
            (seq: string, secstruct: string = null): number[] => {
                let seqArr: number[] = EPars.stringToSequence(seq);
                let folded: number[];
                if (secstruct) {
                    folded = EPars.parenthesisToPairs(secstruct);
                } else {
                    folded = this._folder.foldSequence(seqArr, null, null);
                }
                let pp: number[] = this._folder.getDotPlot(seqArr, folded);
                return pp.slice();
            });

        this._scriptInterface.addCallback('cofold',
            (seq: string, oligo: string, malus: number = 0.0, constraint: string = null): string => {
                let len: number = seq.length;
                let cseq = `${seq}&${oligo}`;
                let seqArr: number[] = EPars.stringToSequence(cseq);
                let folded: number[] = this._folder.cofoldSequence(seqArr, null, Math.floor(malus * 100), constraint);
                return `${EPars.pairsToParenthesis(folded.slice(0, len))
                }&${EPars.pairsToParenthesis(folded.slice(len))}`;
            });

        if (this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL) {
            this._scriptInterface.addCallback(
                'select_folder', (folderName: string): boolean => this.selectFolder(folderName)
            );

            this._scriptInterface.addCallback('load_parameters_from_buffer', (str: string): boolean => {
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
            for (let pose of this._poses) {
                pose.praiseSequence(from, to);
            }
        });

        // Setters
        this._scriptInterface.addCallback('set_sequence_string', (seq: string): boolean => {
            let seqArr: number[] = EPars.stringToSequence(seq);
            if (seqArr.indexOf(EPars.RNABASE_UNDEFINED) >= 0 || seqArr.indexOf(EPars.RNABASE_CUT) >= 0) {
                log.info(`Invalid characters in ${seq}`);
                return false;
            }
            let prevForceSync = this.forceSync;
            this.forceSync = true;
            for (let pose of this._poses) {
                pose.pasteSequence(seqArr);
            }
            this.forceSync = prevForceSync;
            this.moveHistoryAddSequence('paste', seq);
            return true;
        });

        this._scriptInterface.addCallback('set_tracked_indices',
            (marks: (number | { baseIndex: number; colors?: number | number[] })[], colors?: number[]): void => {
                let standardizedMarks: { baseIndex: number; colors?: number | number[] }[];

                if (colors) {
                    log.warn(
                        'Sending a colors argument to set_tracked_indices is deprecated, and will soon not be supported'
                    );
                    if (colors.length !== marks.length) {
                        log.error(
                            'Marks array is not the same length as color array for set_tracked_indices',
                            ' - leaving as black'
                        );
                    } else if (marks.some((mark) => typeof (mark) !== 'number')) {
                        log.error(
                            'Marks array should consist of numbers when the colors argument is present - aborting'
                        );
                        return;
                    } else {
                        standardizedMarks = colors.map((color, i) => ({baseIndex: marks[i] as number, colors: color}));
                    }
                }

                if (!standardizedMarks) {
                    standardizedMarks = marks.map(
                        (mark) => (typeof (mark) === 'number' ? {baseIndex: mark as number} : mark)
                    );
                }

                if (standardizedMarks.some((mark) => typeof (mark.baseIndex) !== 'number')) {
                    log.error(
                        "At least one mark object either doesn't have a `baseIndex` property or has a non-numeric one",
                        '- aborting'
                    );
                    return;
                }

                for (let ii = 0; ii < this.numPoseFields; ii++) {
                    let pose: Pose2D = this.getPose(ii);
                    pose.clearTracking();
                    for (let mark of standardizedMarks) {
                        pose.addBaseMark(mark.baseIndex, mark.colors);
                    }
                }
            });

        this._scriptInterface.addCallback('set_design_title', (designTitle: string): void => {
            log.info('TODO: set_design_title');
            // Application.instance.get_application_gui("Design Name").set_text(design_title);
            // Application.instance.get_application_gui("Design Name").visible = true;
            this.clearUndoStack();
            this.poseEditByTarget(0);
        });
    }

    public onClickRun(): void {
        let nid: string = this._nidField.text;
        if (nid.length === 0) {
            return;
        }

        this._runStatus.style.fill = 0xC0C0C0;
        this._runStatus.text = 'running...';

        const LOCK_NAME = 'RunScript';
        this.pushUILock(LOCK_NAME);

        ExternalInterface.runScriptThroughQueue(nid)
            .then((ret) => {
                log.info(ret);
                if (typeof (ret['cause']) === 'string') {
                    this._runStatus.style.fill = (ret['result'] ? 0x00FF00 : 0xFF0000);
                    this._runStatus.text = ret['cause'];
                }

                this.popUILock(LOCK_NAME);
            })
            .catch(() => this.popUILock(LOCK_NAME));
    }

    public onKeyboardEvent(e: KeyboardEvent): void {
        let handled: boolean = this.keyboardInput.handleKeyboardEvent(e);

        if (!handled && e.type === KeyboardEventType.KEY_DOWN) {
            let key = e.code;
            let ctrl = e.ctrlKey;

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
            } else if (ctrl && key === KeyCode.KeyZ) {
                this.moveUndoStackToLastStable();
                handled = true;
            } else if (this._stackLevel === 0 && key === KeyCode.KeyD && this._params.solutions != null) {
                this.showNextSolution(1);
                handled = true;
            } else if (this._stackLevel === 0 && key === KeyCode.KeyU && this._params.solutions != null) {
                this.showNextSolution(-1);
                handled = true;
            }
        }

        if (handled) {
            e.stopPropagation();
        }
    }

    private showNextSolution(indexOffset: number): void {
        if (this._params.solutions == null || this._params.solutions.length === 0) {
            return;
        }

        const curSolutionIdx = this._params.solutions.indexOf(this._curSolution);
        let nextSolutionIdx = (curSolutionIdx >= 0 ? curSolutionIdx + indexOffset : 0) % this._params.solutions.length;
        if (nextSolutionIdx < 0) {
            nextSolutionIdx = this._params.solutions.length + nextSolutionIdx;
        }

        const solution = this._params.solutions[nextSolutionIdx];
        Assert.notNull(solution);
        this.showSolution(solution);
    }

    /* override */
    public update(dt: number): void {
        // process queued asynchronous operations (folding)
        const startTime = new Date().getTime();
        let elapsed = 0;
        while (this._opQueue.length > 0 && elapsed < 50) { // FIXME: arbitrary
            let op: PoseOp = this._opQueue.shift();
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

    public get constraintCount(): number {
        return this._puzzle.constraints.length;
    }

    public getConstraintBox(i: number): ConstraintBox {
        return this._constraintBar.getConstraintBox(i);
    }

    public getShapeBox(i: number): ConstraintBox {
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
            this._constraintBar.layout(false, this._targetPairs.length);

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

            let minZoom = -1;
            for (let pose of this._poses) {
                minZoom = Math.max(minZoom, pose.computeDefaultZoomLevel());
            }

            for (let pose of this._poses) {
                pose.setZoomLevel(minZoom);
            }
        } else {
            this._toolbar.stateToggle.display.visible = true;
            this._targetName.visible = true;

            this._constraintBar.highlightState(this._curTargetIndex);
            this._constraintBar.layout(false, 1);

            this.changeTarget(this._curTargetIndex);
            this._poses[0].setZoomLevel(this._poses[0].computeDefaultZoomLevel(), true, true);
        }
    }

    /* override */
    protected createContextMenu(): ContextMenu {
        if (this.isDialogOrNotifShowing || this.hasUILock) {
            return null;
        }

        let menu = new ContextMenu();

        menu.addItem('Preferences').clicked.connect(() => this.showViewOptionsDialog());
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
            Eterna.app.switchToDesignBrowser(this._puzzle)
                .then(() => this.popUILock())
                .catch((e) => {
                    log.error(e);
                    this.popUILock();
                });
        }
    }

    private createScreenshot(): ArrayBuffer {
        let visibleState: Map<DisplayObject, boolean> = new Map();
        let pushVisibleState = (disp: DisplayObject) => {
            visibleState.set(disp, disp.visible);
            disp.visible = false;
        };

        pushVisibleState(this.bgLayer);
        pushVisibleState(this.constraintsLayer);
        pushVisibleState(this.uiLayer);
        pushVisibleState(this.dialogLayer);
        pushVisibleState(this.achievementsLayer);

        let explosionFactorVisible: boolean[] = [];
        for (let pose of this._poses) {
            explosionFactorVisible.push(pose.showExplosionFactor);
            pose.showExplosionFactor = false;
        }

        let tempBG = DisplayUtil.fillStageRect(0x061A34);
        this.container.addChildAt(tempBG, 0);

        let info = `Player: ${Eterna.playerName}\n`
            + `Puzzle ID: ${this._puzzle.nodeID}\n`
            + `Puzzle Title: ${this._puzzle.getName()}\n`
            + `Mode: ${this.toolbar.naturalButton.isSelected ? 'NativeMode' : 'TargetMode'}`;
        let infoText = Fonts.arial(info).color(0xffffff).build();
        this.container.addChild(infoText);

        let pngData = DisplayUtil.renderToPNG(this.container);

        tempBG.destroy({children: true});
        infoText.destroy({children: true});

        for (let [disp, wasVisible] of visibleState.entries()) {
            disp.visible = wasVisible;
        }

        for (let ii = 0; ii < this._poses.length; ++ii) {
            this._poses[ii].showExplosionFactor = explosionFactorVisible[ii];
        }

        return pngData;
    }

    private exitPuzzle(): void {
        if (this._submitSolutionRspData == null) {
            throw new Error('exit_puzzle was called before we submitted a solution');
        }
        this.showMissionClearedPanel(this._submitSolutionRspData);
    }

    private showResetPrompt(): void {
        const PROMPT = 'Do you really want to reset?\nResetting will clear your undo stack.';
        this.showConfirmDialog(PROMPT).closed.then((confirmed) => {
            if (confirmed) {
                this.resetAutosaveData();
                this.modeStack.changeMode(new PoseEditMode(this._puzzle, {isReset: true}));
            }
        });
    }

    private changeTarget(targetIndex: number): void {
        this._curTargetIndex = targetIndex;

        this._constraintBar.highlightState(targetIndex);

        if (this._targetConditions && this._targetConditions[this._curTargetIndex]) {
            if (this._targetConditions[this._curTargetIndex]['state_name'] != null) {
                this._targetName.text = this._targetConditions[this._curTargetIndex]['state_name'];
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
        let elems: number[] = null;

        if (this._targetConditions) {
            let maxLen: number = this._poses[targetIndex].sequence.length;
            for (let ii = 0; ii < this._poses.length; ii++) {
                if (ii === targetIndex || this._targetConditions[ii]['force_struct'] == null) {
                    continue;
                }

                if (elems == null) {
                    elems = [];
                }
                let curr = 1;
                let forced: number[] = EPars.parenthesisToForcedArray(this._targetConditions[ii]['force_struct']);
                let jj;
                for (jj = 0; jj < maxLen && jj < forced.length; jj++) {
                    let _stat: number = (forced[jj] === EPars.FORCE_IGNORE ? 1 : 0);
                    if ((curr ^ _stat) !== 0) {
                        elems.push(jj - _stat);
                        curr = _stat;
                    }
                }
                if ((elems.length % 2) === 1) {
                    elems.push(jj - 1);
                }
            }
        }

        return elems;
    }

    private setPoseTarget(poseIndex: number, targetIndex: number): void {
        if (this._targetConditions[targetIndex] != null) {
            this._poses[poseIndex].sequence = this._puzzle.transformSequence(
                this._poses[targetIndex].sequence, targetIndex
            );
            let tcType: string = this._targetConditions[targetIndex]['type'];

            if (tcType === 'multistrand') {
                let odefs: OligoDef[] = this._targetConditions[targetIndex]['oligos'];
                let ndefs: Oligo[] = [];
                for (let ii = 0; ii < odefs.length; ii++) {
                    ndefs.push({
                        sequence: EPars.stringToSequence(odefs[ii].sequence),
                        malus: odefs[ii].malus,
                        name: odefs[ii]['name']
                    });
                }
                this._poses[poseIndex].setOligos(ndefs, this._targetOligosOrder[targetIndex]);
            } else {
                this._poses[poseIndex].setOligos(null);
            }

            if (Puzzle.isOligoType(tcType)) {
                let foldMode: number = this._targetConditions[targetIndex]['fold_mode'] == null
                    ? Pose2D.OLIGO_MODE_DIMER
                    : Number(this._targetConditions[targetIndex]['fold_mode']);
                this._poses[poseIndex].setOligo(
                    EPars.stringToSequence(this._targetConditions[targetIndex]['oligo_sequence']),
                    foldMode,
                    this._targetConditions[targetIndex]['oligo_name']
                );
                this._poses[poseIndex].oligoMalus = this._targetConditions[targetIndex]['malus'];
            } else {
                this._poses[poseIndex].setOligo(null);
            }

            if (Puzzle.isAptamerType(tcType)) {
                this._poses[poseIndex].setMolecularBinding(
                    this._targetConditions[targetIndex]['site'],
                    this._targetConditions[targetIndex]['binding_pairs'],
                    this._targetConditions[targetIndex]['bonus'] / 100.0
                );
            } else {
                this._poses[poseIndex].setMolecularBinding(null, null, null);
            }

            let forcedStruct: number[] = null;
            if (this._targetConditions[targetIndex]['force_struct'] != null) {
                forcedStruct = EPars.parenthesisToForcedArray(this._targetConditions[targetIndex]['force_struct']);
            }
            this._poses[poseIndex].forcedStruct = forcedStruct;
            this._poses[poseIndex].structConstraints = this._targetConditions[targetIndex]['structure_constraints'];
        } else {
            this._poses[poseIndex].setMolecularBinding(null, null, 0);
            this._poses[poseIndex].forcedStruct = null;
            this._poses[poseIndex].structConstraints = null;
            this._poses[poseIndex].setOligos(null);
            this._poses[poseIndex].setOligo(null);
        }
        this._poses[poseIndex].forcedHighlights = this.getForcedHighlights(targetIndex);

        if (this._puzzle.nodeID === 2390140) {
            if (targetIndex === 1) {
                this._poses[poseIndex].auxInfo = null;
            } else {
                this._poses[poseIndex].auxInfo = {cleavingSite: 28};
            }
        }
    }

    private savePosesMarkersContexts(): void {
        for (let pose of this._poses) {
            pose.saveMarkersContext();
        }
    }

    private transformPosesMarkers(): void {
        for (let pose of this._poses) {
            pose.transformMarkers();
        }
    }

    private setToNativeMode(): void {
        this._poseState = PoseState.NATIVE;

        this._toolbar.targetButton.toggled.value = false;
        this._toolbar.naturalButton.toggled.value = true;
        this._toolbar.targetButton.hotkey(KeyCode.Space);
        this._toolbar.naturalButton.hotkey(null);

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
        this._toolbar.targetButton.hotkey(null);

        this.savePosesMarkersContexts();

        if (this._isPipMode) {
            for (let ii = 0; ii < this._poses.length; ii++) {
                this._poses[ii].setOligos(this._targetOligos[ii], this._targetOligosOrder[ii]);
                this._poses[ii].setOligo(this._targetOligo[ii], this._oligoMode[ii], this._oligoName[ii]);
                this._poses[ii].pairs = this._targetPairs[ii];
                if (this._targetConditions != null && this._targetConditions[ii] != null) {
                    this._poses[ii].structConstraints = this._targetConditions[ii]['structure_constraints'];
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
            this._poses[0].pairs = this._targetPairs[this._curTargetIndex];
            if (this._targetConditions != null && this._targetConditions[this._curTargetIndex] != null) {
                let newConstraints = this._targetConditions[this._curTargetIndex]['structure_constraints'];
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
        for (let pose of this._poses) {
            pose.updateHighlightsAndScores();
        }
    }

    private ropPresets(): void {
        while (this._ropPresets.length) {
            let func = this._ropPresets.pop();
            func();
        }
    }

    private onFolderUpdated(): void {
        this._folderButton.label(this._folder.name);

        let scoreFolder: Folder = this._folder.canScoreStructures ? this._folder : null;
        for (let pose of this._poses) {
            pose.scoreFolder = scoreFolder;
        }

        this.onChangeFolder();
    }

    private changeFolder(): void {
        let currF: string = this._folder.name;
        this._folder = FolderManager.instance.getNextFolder(
            currF, (folder: Folder) => !this._puzzle.canUseFolder(folder)
        );
        if (this._folder.name === currF) return;

        this.onFolderUpdated();
    }

    private showSpec(): void {
        this._dockedSpecBox.display.visible = false;

        this.updateCurrentBlockWithDotAndMeltingPlot();
        let puzzleState = this.getCurrentUndoBlock();

        let dialog = this.showDialog(new SpecBoxDialog(puzzleState));
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
            let datablock: UndoBlock = this.getCurrentUndoBlock();
            this._dockedSpecBox.setSpec(datablock);
        }
    }

    private updateCurrentBlockWithDotAndMeltingPlot(index: number = -1): void {
        let datablock: UndoBlock = this.getCurrentUndoBlock(index);
        if (this._folder.canDotPlot && datablock.sequence.length < 500) {
            if (this._targetConditions && this._targetConditions[0]
                && this._targetConditions[0]['type'] === 'pseudoknot') {
                datablock.updateMeltingPointAndDotPlot(this._folder, true);
            } else {
                datablock.updateMeltingPointAndDotPlot(this._folder);
            }
        }
    }

    private submitCurrentPose(): void {
        if (this._puzzle.puzzleType !== PuzzleType.EXPERIMENTAL) {
            // / Always submit the sequence in the first state
            let solToSubmit: UndoBlock = this.getCurrentUndoBlock(0);
            this.submitSolution({title: 'Cleared Solution', comment: 'No comment'}, solToSubmit);
        } else {
            const NOT_SATISFIED_PROMPT = 'Puzzle constraints are not satisfied.\n'
                + 'You can still submit the sequence, but please note that there is a risk of not getting\n'
                + 'synthesized properly';

            if (!this.checkConstraints()) {
                if (this._puzzle.isSoftConstraint || Eterna.DEV_MODE) {
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
        let datablock: UndoBlock = this.getCurrentUndoBlock();
        if (datablock.getParam(UndoBlockParam.DOTPLOT_BITMAP) == null) {
            this.updateCurrentBlockWithDotAndMeltingPlot();
        }

        let initScore: number = datablock.getParam(UndoBlockParam.PROB_SCORE, 37);

        let meltpoint = 107;
        for (let ii = 47; ii < 100; ii += 10) {
            let currentScore: number = datablock.getParam(UndoBlockParam.PROB_SCORE, ii);
            if (currentScore < initScore * 0.5) {
                meltpoint = ii;
                break;
            }
        }

        datablock.setParam(UndoBlockParam.MELTING_POINT, meltpoint, 37);

        this.showDialog(new SubmitPoseDialog()).closed.then((submitDetails) => {
            if (submitDetails != null) {
                // / Always submit the sequence in the first state
                this.updateCurrentBlockWithDotAndMeltingPlot(0);
                let solToSubmit: UndoBlock = this.getCurrentUndoBlock(0);
                this.submitSolution(submitDetails, solToSubmit);
            }
        });
    }

    /** Creates solution-submission data for shipping off to the server */
    private createSubmitData(details: SubmitPoseDetails, undoBlock: UndoBlock): any {
        if (details.title.length === 0) {
            details.title = 'Default title';
        }

        if (details.comment.length === 0) {
            details.comment = 'No comment';
        }

        let postData: any = {};

        if (this._puzzle.puzzleType !== PuzzleType.EXPERIMENTAL) {
            let nextPuzzle: number = this._puzzle.nextPuzzleID;

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

        let elapsed: number = (new Date().getTime() - this._startSolvingTime) / 1000;
        let moveHistory: any = {
            beginFrom: this._startingPoint,
            numMoves: this._moveCount,
            moves: this._moves.slice(),
            elapsed: elapsed.toFixed(0)
        };
        postData['move-history'] = JSON.stringify(moveHistory);

        let newlinereg = new RegExp('/"/g');
        details.comment = details.comment.replace(newlinereg, "'");
        details.title = details.title.replace(newlinereg, "'");

        let seqString: string = EPars.sequenceToString(this._puzzle.transformSequence(undoBlock.sequence, 0));

        postData['title'] = details.title;
        postData['energy'] = undoBlock.getParam(UndoBlockParam.FE) / 100.0;
        postData['puznid'] = this._puzzle.nodeID;
        postData['sequence'] = seqString;
        postData['repetition'] = undoBlock.getParam(UndoBlockParam.REPETITION);
        postData['gu'] = undoBlock.getParam(UndoBlockParam.GU);
        postData['gc'] = undoBlock.getParam(UndoBlockParam.GC);
        postData['ua'] = undoBlock.getParam(UndoBlockParam.AU);
        postData['body'] = details.comment;

        if (this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL) {
            postData['melt'] = undoBlock.getParam(UndoBlockParam.MELTING_POINT);

            if (this._foldTotalTime >= 1000.0) {
                let fd: any[] = [];
                for (let ii = 0; ii < this._poses.length; ii++) {
                    fd.push(this.getCurrentUndoBlock(ii).toJSON());
                }
                postData['fold-data'] = JSON.stringify(fd);
            }
        }

        return postData;
    }

    private async submitSolution(details: SubmitPoseDetails, undoBlock: UndoBlock): Promise<void> {
        this._rscript.finishLevel();

        if (this._puzzle.nodeID < 0) {
            return;
        }

        let submittingRef: GameObjectRef = GameObjectRef.NULL;
        let fxComplete: Promise<void> = null;

        if (this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL) {
            // Show a "Submitting now!" dialog
            submittingRef = this.showDialog(new SubmittingDialog()).ref;
            fxComplete = Promise.resolve();
        } else {
            // Kick off a BubbleSweep animation
            let bubbles = new BubbleSweep(800);
            this.addObject(bubbles, this.bgLayer);
            bubbles.start();

            // Show an explosion animation
            this.disableTools(true);
            this.setPuzzleState(PuzzleState.CLEARED);

            Flashbang.sound.playSound(Sounds.SoundPuzzleClear);
            for (let pose of this._poses) {
                pose.setZoomLevel(0, true, true);
                let p = pose.startExplosion();
                if (fxComplete == null) {
                    fxComplete = p.then(() => {
                        bubbles.decay();
                        bubbles.addObject(new SerialTask(
                            new AlphaTask(0, 5, Easing.easeIn),
                            new SelfDestructTask()
                        ));

                        for (let poseToClear of this._poses) {
                            poseToClear.showTotalEnergy = false;
                            poseToClear.clearExplosion();
                        }

                        this._constraintsLayer.visible = false;
                    });
                }
            }
        }

        // submit our solution to the server
        log.debug('Submitting solution...');
        let submissionPromise = Eterna.client.submitSolution(this.createSubmitData(details, undoBlock));

        // Wait for explosion completion
        await fxComplete;

        // Wait for the submission to the server, and for the mode to be active.
        // 'waitTillActive' is probably not necessary in practice, but if another mode is pushed onto this one
        // during submission, we want to wait till we're the top-most mode before executing more view logic.
        let allResults = await Promise.all([submissionPromise, this.waitTillActive()]);

        // 'allResults' contains the results of our submission, and the "waitTillActive" void promise
        let submissionResponse = allResults[0];

        // show achievements, if we were awarded any
        let cheevs: any = submissionResponse['new_achievements'];
        if (cheevs != null) {
            await this._achievements.awardAchievements(cheevs);
        }

        submittingRef.destroyObject();

        let data: any = submissionResponse['data'];

        if (this._puzzle.puzzleType !== PuzzleType.EXPERIMENTAL) {
            this.showMissionClearedPanel(data);
        }

        const seqString = EPars.sequenceToString(
            this._puzzle.transformSequence(undoBlock.sequence, 0)
        );

        if (data['error'] != null) {
            log.debug(`Got solution submission error: ${data['error']}`);
            if (data['error'].indexOf('barcode') >= 0) {
                let dialog = this.showNotification(data['error'], 'More Information');
                dialog.extraButton.clicked.connect(() => window.open(EternaURL.BARCODE_HELP, '_blank'));
                let hairpin: string = EPars.getBarcodeHairpin(seqString);
                if (hairpin != null) {
                    SolutionManager.instance.addHairpins([hairpin]);
                    this.checkConstraints();
                }
            } else {
                this.showNotification(data['error']);
            }
        } else {
            log.debug('Solution submitted');

            if (data['solution-id'] != null) {
                this.setAncestorId(data['solution-id']);
            }

            if (this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL) {
                if (this._puzzle.useBarcode) {
                    let hairpin: string = EPars.getBarcodeHairpin(seqString);
                    if (hairpin != null) {
                        SolutionManager.instance.addHairpins([hairpin]);
                        this.checkConstraints();
                    }
                }
            }
        }
    }

    private showMissionClearedPanel(submitSolutionRspData: any): void {
        this._submitSolutionRspData = submitSolutionRspData;

        // Hide some UI
        this.disableTools(true);
        this._constraintsLayer.visible = false;
        this._exitButton.display.visible = false;
        this._homeButton.display.visible = false;
        this._helpBar.display.visible = false;
        for (let pose of this._poses) {
            pose.showTotalEnergy = false;
        }
        Eterna.chat.pushHideChat();

        // Show the panel
        let infoText: string = null;
        let moreText: string = null;
        let boostersData = this._puzzle.boosters;
        if (boostersData != null && boostersData.mission_cleared != null) {
            infoText = boostersData.mission_cleared['info'];
            moreText = boostersData.mission_cleared['more'];
        }

        let nextPuzzleData: any = submitSolutionRspData['next-puzzle'];
        let nextPuzzle: Puzzle = null;
        if (nextPuzzleData) {
            try {
                nextPuzzle = PuzzleManager.instance.parsePuzzle(nextPuzzleData);
                log.info(`Loaded next puzzle [id=${nextPuzzle.nodeID}]`);
            } catch (err) {
                log.error('Failed to load next puzzle', err);
            }
        }

        let missionClearedPanel = new MissionClearedPanel(nextPuzzle != null, infoText, moreText);
        missionClearedPanel.display.alpha = 0;
        missionClearedPanel.addObject(new AlphaTask(1, 0.3));
        this.addObject(missionClearedPanel, this.dialogLayer);
        missionClearedPanel.createRankScroll(submitSolutionRspData);

        const keepPlaying = () => {
            if (missionClearedPanel != null) {
                Eterna.chat.popHideChat();

                missionClearedPanel.destroySelf();
                missionClearedPanel = null;

                // Restore UI
                this._constraintsLayer.visible = true;
                this.disableTools(false);

                for (let pose of this._poses) {
                    pose.showTotalEnergy = true;
                }

                this._homeButton.display.visible = true;

                this._exitButton.display.alpha = 0;
                this._exitButton.display.visible = true;
                this._exitButton.addObject(new AlphaTask(1, 0.3));
            }
        };

        if (nextPuzzle != null) {
            missionClearedPanel.nextButton.clicked.connect(() => {
                Eterna.chat.popHideChat();
                this.modeStack.changeMode(new PoseEditMode(nextPuzzle, {}));
            });
        } else {
            missionClearedPanel.nextButton.clicked.connect(() => {
                keepPlaying();
                window.open(EternaURL.getFeedURL(), '_self');
            });
        }

        missionClearedPanel.closeButton.clicked.connect(() => keepPlaying());
    }

    public setPosesColor(paintColor: number): void {
        for (let pose of this._poses) {
            pose.currentColor = paintColor;
        }
    }

    private disableTools(disable: boolean): void {
        this._toolbar.disableTools(disable);
        // this._scriptbar.enabled = !disable;
        // if (this._pic_button) {
        //     this._pic_button.enabled = !disable;
        // }

        this._hintBoxRef.destroyObject();

        this._folderButton.enabled = !disable;

        for (let field of this._poseFields) {
            field.container.interactive = !disable;
            field.container.interactiveChildren = !disable;
        }

        if (disable) {
            for (let pose of this._poses) {
                pose.clearMouse();
            }
        }

        // if (this._view_options_cmi) this._view_options_cmi.enabled = !disable;
        // if (this._view_solutions_cmi) this._view_solutions_cmi.enabled = !disable;
        // if (this._submit_cmi) this._submit_cmi.enabled = !disable;
        // if (this._spec_cmi) this._spec_cmi.enabled = !disable;
        // if (this._reset_cmi) this._reset_cmi.enabled = !disable;
        // if (this._copy_cmi) this._copy_cmi.enabled = !disable;
        // if (this._paste_cmi) this._paste_cmi.enabled = !disable;
        // if (this._beam_cmi) this._beam_cmi.enabled = !disable;
    }

    private startCountdown(): void {
        this._isPlaying = false;

        const constraints = this._puzzle.constraints;
        if (constraints == null || constraints.length === 0 || !this._showMissionScreen) {
            this.startPlaying();
        } else {
            this.setPuzzleState(PuzzleState.COUNTDOWN);

            this._startSolvingTime = new Date().getTime();
            this.startPlaying();
            this.showIntroScreen();
        }
    }

    private showIntroScreen() {
        this.hideAsyncText();

        let missionText = this._puzzle.missionText;
        let boosters: BoostersData = this._puzzle.boosters;
        if (boosters && boosters.mission != null) {
            missionText = boosters.mission['text'];
        }

        let introConstraintBoxes: ConstraintBox[] = this._puzzle.constraints.filter(
            (constraint) => !(constraint instanceof ShapeConstraint || constraint instanceof AntiShapeConstraint)
        ).map(
            (constraint) => {
                let box = new ConstraintBox(true);
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
        );

        this._constraintBar.display.visible = false;

        let customLayout: Array<[number, number]> = null;
        if (this._targetConditions && this._targetConditions[0]) {
            customLayout = this._targetConditions[0]['custom-layout'];
        }
        this.modeStack.pushMode(new MissionIntroMode(
            this._puzzle.getName(true),
            missionText,
            this._targetPairs,
            introConstraintBoxes,
            customLayout
        ));

        let conn = this.entered.connect(() => {
            this._constraintBar.display.visible = true;
            this._constraintBar.layout(true, this._isPipMode ? this._targetPairs.length : 1);
            conn.close();
        });
    }

    private startPlaying(): void {
        this._isPlaying = true;
        this.disableTools(false);

        this.setPuzzleState(PuzzleState.GAME);
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

        let objs: any[] = [];
        let msecs = 0;

        objs.push(msecs);
        objs.push(this._seqStacks[this._stackLevel][0].sequence);
        for (let ii = 0; ii < this._poses.length; ++ii) {
            objs.push(JSON.stringify(this._seqStacks[this._stackLevel][ii].toJSON()));
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
        let poseData: PuzzleEditPoseData[] = [];
        for (let pose of this._poses) {
            poseData.push({
                sequence: EPars.sequenceToString(pose.sequence),
                structure: EPars.pairsToParenthesis(pose.pairs)
            });
        }

        Eterna.app.loadPuzzleEditor(1, poseData)
            .catch((err) => Eterna.onFatalError(err));
    }

    private loadSavedData(): boolean {
        if (this._puzzle.puzzleType === PuzzleType.BASIC) {
            return false;
        }

        // if (this.root.loaderInfo.parameters.autoload
        //     && Number(this.root.loaderInfo.parameters.autoload) === 0) {
        //     return false;
        // }

        let beginningSequence: number[] = this._puzzle.getBeginningSequence();
        let locks: boolean[] = this._puzzle.puzzleLocks;
        let oligoLen = 0;

        if (this._targetConditions[0] && Puzzle.isOligoType(this._targetConditions[0]['type'])) {
            oligoLen = this._targetConditions[0]['oligo_sequence'].length;
            if (Number(this._targetConditions[0]['fold_mode']) === Pose2D.OLIGO_MODE_DIMER) oligoLen++;
        } else if (this._targetConditions[0] && this._targetConditions[0]['type'] === 'multistrand') {
            let oligos: OligoDef[] = this._targetConditions[0]['oligos'];
            for (let ii = 0; ii < oligos.length; ii++) {
                oligoLen += (oligos[ii]['sequence'].length + 1);
            }
        }

        if (
            beginningSequence.length !== locks.length
            || (beginningSequence.length + oligoLen) !== this._targetPairs[0].length
        ) {
            return false;
        }
        this.clearUndoStack();

        let json: any[] = this._autosaveData;
        // no saved data
        if (json == null) {
            // if (this.root.loaderInfo.parameters.inputsequence != null) {
            //     a = EPars.string_to_sequence_array(this.root.loaderInfo.parameters.inputsequence);
            // } else {
            //     return false;
            // }
            return false;
        }

        let a: number[] = json[1];
        for (let ii = 0; ii < this._poses.length; ++ii) {
            if (json[ii + 2] != null) {
                let undoBlock: UndoBlock = new UndoBlock([]);
                try {
                    undoBlock.fromJSON(JSON.parse(json[ii + 2]));
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
                a[ii] = beginningSequence[ii];
            }
        }

        for (let ii = 0; ii < this._poses.length; ii++) {
            this._poses[ii].sequence = this._puzzle.transformSequence(a, ii);
            this._poses[ii].puzzleLocks = locks;
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

    private moveHistoryAddMutations(before: number[], after: number[]): void {
        let muts: any[] = [];
        for (let ii = 0; ii < after.length; ii++) {
            if (after[ii] !== before[ii]) {
                muts.push({pos: ii + 1, base: EPars.sequenceToString([after[ii]])});
            }
        }
        if (muts.length === 0) return;
        this._moveCount++;
        this._moves.push(muts.slice());
    }

    private moveHistoryAddSequence(changeType: string, seq: string): void {
        let muts: any[] = [];
        muts.push({type: changeType, sequence: seq});
        this._moveCount++;
        this._moves.push(muts.slice());
    }

    private setPuzzleEpilog(initSeq: number[], isReset: boolean): void {
        if (isReset) {
            let newSeq: number[] = this._puzzle.transformSequence(this.getCurrentUndoBlock(0).sequence, 0);
            this.moveHistoryAddSequence('reset', EPars.sequenceToString(newSeq));
        } else {
            this._startSolvingTime = new Date().getTime();
            this._startingPoint = EPars.sequenceToString(
                this._puzzle.transformSequence(this.getCurrentUndoBlock(0).sequence, 0)
            );
        }

        if (isReset || this._isDatabrowserMode) {
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

    private checkConstraints(): boolean {
        return this._constraintBar.updateConstraints({
            undoBlocks: this._seqStacks[this._stackLevel],
            targetConditions: this._targetConditions,
            puzzle: this._puzzle
        });
    }

    private updateScore(): void {
        this.saveData();
        // let dn: GameObject = (<GameObject>Application.instance.get_application_gui("Design Name"));
        // if (dn != null) dn.visible = (this._stack_level === 0);

        let undoBlock: UndoBlock = this.getCurrentUndoBlock();
        let nnfe: number[];
        let pseudoknots: boolean = this._targetConditions && this._targetConditions[this._curTargetIndex] != null
            && this._targetConditions[this._curTargetIndex]['type'] === 'pseudoknot';

        if (!this._paused) {
            for (let ii = 0; ii < this._poses.length; ii++) {
                if (ii === 0 && this._poseState === PoseState.NATIVE && !this._isPipMode) {
                    this._poses[0].setOligos(this.getCurrentUndoBlock().targetOligos,
                        this.getCurrentUndoBlock().oligoOrder,
                        this.getCurrentUndoBlock().oligosPaired);
                    this._poses[0].setOligo(this.getCurrentUndoBlock().targetOligo,
                        this.getCurrentUndoBlock().oligoMode,
                        this.getCurrentUndoBlock().oligoName);
                    this._poses[0].pairs = this.getCurrentUndoBlock().getPairs(37, pseudoknots);
                    if (this._targetConditions != null && this._targetConditions[this._curTargetIndex] != null) {
                        let newConstraints = this._targetConditions[this._curTargetIndex]['structure_constraints'];
                        this._poses[0].structConstraints = newConstraints;
                    }
                    continue;
                }
                this._poses[ii].setOligos(this.getCurrentUndoBlock(ii).targetOligos,
                    this.getCurrentUndoBlock(ii).oligoOrder,
                    this.getCurrentUndoBlock(ii).oligosPaired);
                this._poses[ii].setOligo(this.getCurrentUndoBlock(ii).targetOligo,
                    this.getCurrentUndoBlock(ii).oligoMode,
                    this.getCurrentUndoBlock(ii).oligoName);
                this._poses[ii].pairs = this.getCurrentUndoBlock(ii).getPairs(37, pseudoknots);

                if (this._targetConditions != null && this._targetConditions[ii] != null) {
                    this._poses[ii].structConstraints = this._targetConditions[ii]['structure_constraints'];
                }
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
                    this._poses[0].pairs = this.getCurrentUndoBlock().targetPairs;
                    if (this._targetConditions != null && this._targetConditions[this._curTargetIndex] != null) {
                        let newConstraints = this._targetConditions[this._curTargetIndex]['structure_constraints'];
                        this._poses[0].structConstraints = newConstraints;
                    }
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
                this._poses[ii].pairs = this._targetPairs[ii];
                if (this._targetConditions != null && this._targetConditions[ii] != null) {
                    this._poses[ii].structConstraints = this._targetConditions[ii]['structure_constraints'];
                }
            }
        }

        for (let ii = 0; ii < this._poses.length; ii++) {
            let jj: number;

            if (ii === 0 && !this._isPipMode) {
                jj = this._curTargetIndex;
            } else {
                jj = ii;
            }
            if (this._targetConditions == null || this._targetConditions[jj] == null
                || this._targetConditions[jj]['type'] == null) {
                continue;
            }

            if (Puzzle.isAptamerType(this._targetConditions[jj]['type'])) {
                this._poses[ii].setMolecularBinding(
                    this._targetConditions[jj]['site'],
                    this._targetConditions[jj]['binding_pairs'],
                    this._targetConditions[jj]['bonus'] / 100.0
                );
            } else {
                this._poses[ii].setMolecularBinding(null, null, 0);
            }
            if (Puzzle.isOligoType(this._targetConditions[jj]['type'])) {
                this._poses[ii].oligoMalus = this._targetConditions[jj]['malus'];
                nnfe = this.getCurrentUndoBlock(jj).getParam(
                    UndoBlockParam.NNFE_ARRAY, EPars.DEFAULT_TEMPERATURE, pseudoknots
                );
                if (nnfe != null && nnfe[0] === -2) {
                    this._poses[ii].oligoPaired = true;
                    this._poses[ii].duplexCost = nnfe[1] * 0.01;
                } else {
                    this._poses[ii].oligoPaired = false;
                }
            }
            if (this._targetConditions[jj]['type'] === 'multistrand') {
                nnfe = this.getCurrentUndoBlock(jj).getParam(
                    UndoBlockParam.NNFE_ARRAY, EPars.DEFAULT_TEMPERATURE, pseudoknots
                );
                if (nnfe != null && nnfe[0] === -2) {
                    this._poses[ii].duplexCost = nnfe[1] * 0.01;
                }
            }
        }

        let numAU: number = undoBlock.getParam(UndoBlockParam.AU, 37, pseudoknots);
        let numGU: number = undoBlock.getParam(UndoBlockParam.GU, 37, pseudoknots);
        let numGC: number = undoBlock.getParam(UndoBlockParam.GC, 37, pseudoknots);
        this._toolbar.palette.setPairCounts(numAU, numGU, numGC);

        if (!this._isFrozen) {
            if (this._toolbar.undoButton.display.visible) {
                this._toolbar.undoButton.enabled = !(this._stackLevel < 1);
            }
            if (this._toolbar.redoButton.display.visible) {
                this._toolbar.redoButton.enabled = !(this._stackLevel + 1 > this._stackSize - 1);
            }
        }

        let constraintsSatisfied: boolean = this.checkConstraints();
        for (let ii = 0; ii < this._poses.length; ii++) {
            this.getCurrentUndoBlock(ii).stable = constraintsSatisfied;
        }

        // / Update spec thumbnail if it is open
        this.updateDockedSpecBox();

        if (constraintsSatisfied) {
            if (this._puzzle.puzzleType !== PuzzleType.EXPERIMENTAL && this._puzState === PuzzleState.GAME) {
                this.submitCurrentPose();
            }
        }
    }

    private flashConstraintForTarget(targetIndex: number): void {
        this._constraintBar.getShapeBox(targetIndex).flash(0x00FFFF);
    }

    private poseEditByTarget(targetIndex: number): void {
        this.savePosesMarkersContexts();

        let xx: number = this._isPipMode ? targetIndex : this._curTargetIndex;
        let segments: number[] = this._poses[targetIndex].designSegments;
        let idxMap: number[] = this._poses[targetIndex].getOrderMap(this._targetOligosOrder[xx]);
        let structureConstraints: boolean[] = null;

        if (idxMap != null) {
            for (let jj = 0; jj < segments.length; jj++) {
                segments[jj] = idxMap.indexOf(segments[jj]);
            }
        }
        // we want 2 blocks (2x2) && same length && separated by at least 3 bases
        if (segments.length === 4
            && segments[1] - segments[0] === segments[3] - segments[2]
            && (segments[2] - segments[1] > 3
                || EPars.hasCut(this._poses[targetIndex].fullSequence, segments[1], segments[2]))) {
            /*
            - get design_segments
            - if (2 groups) and (all paired/unpaired in _target_pairs) and (all as dontcare)
                set _target_pairs
                clear design
            */
            if (this._targetConditions[xx] != null) {
                structureConstraints = this._targetConditions[xx]['structure_constraints'];
            }

            if (structureConstraints != null) {
                let numUnpaired = 0;
                let numWrong = 0;
                let dontcareOk = true;
                for (let jj = segments[0]; jj <= segments[1] && dontcareOk; jj++) {
                    if (structureConstraints[jj]) {
                        dontcareOk = false;
                        continue;
                    }
                    if (this._targetPairs[xx][jj] < 0) {
                        numUnpaired++;
                    } else if (this._targetPairs[xx][jj] < segments[2] || this._targetPairs[xx][jj] > segments[3]) {
                        numWrong++;
                    }
                }
                for (let jj = segments[2]; jj <= segments[3] && dontcareOk; jj++) {
                    if (structureConstraints[jj]) {
                        dontcareOk = false;
                        continue;
                    }
                    if (this._targetPairs[xx][jj] < 0) {
                        numUnpaired++;
                    } else if (this._targetPairs[xx][jj] < segments[0] || this._targetPairs[xx][jj] > segments[1]) {
                        numWrong++;
                    }
                }
                if (dontcareOk && numWrong === 0) {
                    if (numUnpaired === 0) {
                        for (let jj = segments[0]; jj <= segments[1]; jj++) {
                            this._targetPairs[xx][jj] = -1;
                        }
                        for (let jj = segments[2]; jj <= segments[3]; jj++) {
                            this._targetPairs[xx][jj] = -1;
                        }
                        Flashbang.sound.playSound(Sounds.SoundRY);
                        this.flashConstraintForTarget(xx);
                        this._poses[targetIndex].clearDesignStruct();
                    } else if (numUnpaired === segments[1] - segments[0] + segments[3] - segments[2] + 2) {
                        // breaking pairs is safe, but adding them may not always be
                        if (
                            EPars.validateParenthesis(
                                EPars.pairsToParenthesis(this._targetPairs[xx]).slice(segments[1] + 1, segments[2]),
                                false
                            ) == null
                        ) {
                            for (let jj = segments[0]; jj <= segments[1]; jj++) {
                                this._targetPairs[xx][jj] = segments[3] - (jj - segments[0]);
                            }
                            for (let jj = segments[2]; jj <= segments[3]; jj++) {
                                this._targetPairs[xx][jj] = segments[1] - (jj - segments[2]);
                            }
                            Flashbang.sound.playSound(Sounds.SoundGB);
                            this.flashConstraintForTarget(xx);
                            this._poses[targetIndex].clearDesignStruct();
                            // if the above fails, and we have multi-oligos, there may be a permutation where it works
                        } else if (this._targetOligos[xx] != null && this._targetOligos[xx].length > 1) {
                            let newOrder: number[] = [];
                            for (let jj = 0; jj < this._targetOligos[xx].length; jj++) newOrder.push(jj);
                            let more: boolean;
                            do {
                                segments = this._poses[targetIndex].designSegments;
                                let newMap: number[] = this._poses[targetIndex].getOrderMap(newOrder);
                                let newPairs: number[] = [];
                                if (newMap != null) {
                                    for (let jj = 0; jj < segments.length; jj++) {
                                        segments[jj] = newMap.indexOf(segments[jj]);
                                    }
                                    for (let jj = 0; jj < this._targetPairs[xx].length; jj++) {
                                        let kk: number = idxMap.indexOf(newMap[jj]);
                                        let pp: number = this._targetPairs[xx][kk];
                                        newPairs[jj] = pp < 0 ? pp : newMap.indexOf(idxMap[pp]);
                                    }
                                }
                                if (
                                    EPars.validateParenthesis(
                                        EPars.pairsToParenthesis(newPairs).slice(segments[1] + 1, segments[2]), false
                                    ) == null
                                ) {
                                    // compatible permutation
                                    this._targetPairs[xx] = newPairs;
                                    this._targetOligosOrder[xx] = newOrder;
                                    for (let jj = segments[0]; jj <= segments[1]; jj++) {
                                        this._targetPairs[xx][jj] = segments[3] - (jj - segments[0]);
                                    }
                                    for (let jj = segments[2]; jj <= segments[3]; jj++) {
                                        this._targetPairs[xx][jj] = segments[1] - (jj - segments[2]);
                                    }
                                    Flashbang.sound.playSound(Sounds.SoundGB);
                                    this.flashConstraintForTarget(xx);
                                    this._poses[targetIndex].clearDesignStruct();
                                    more = false;
                                } else {
                                    more = FoldUtil.nextPerm(newOrder);
                                }
                            } while (more);
                        }
                    }
                }
            }
        }

        let lastShiftedIndex: number = this._poses[targetIndex].lastShiftedIndex;
        let lastShiftedCommand: number = this._poses[targetIndex].lastShiftedCommand;
        for (let ii = 0; ii < this._poses.length; ii++) {
            if (lastShiftedIndex > 0 && lastShiftedCommand >= 0) {
                if (ii !== targetIndex) {
                    this._poses[ii].baseShiftWithCommand(lastShiftedCommand, lastShiftedIndex);
                }

                let results: any = this._poses[ii].parseCommandWithPairs(
                    lastShiftedCommand, lastShiftedIndex, this._targetPairs[ii]
                );
                if (results != null) {
                    let parenthesis: string = results[0];
                    let mode: number = results[1];
                    this._targetPairs[ii] = EPars.parenthesisToPairs(parenthesis);
                }

                let antiStructureConstraints: any[] = this._targetConditions[ii]['anti_structure_constraints'];
                if (antiStructureConstraints != null) {
                    if (lastShiftedCommand === EPars.RNABASE_ADD_BASE) {
                        let antiStructureConstraint: boolean = antiStructureConstraints[lastShiftedIndex];
                        antiStructureConstraints.splice(lastShiftedIndex, 0, antiStructureConstraint);
                    } else if (lastShiftedCommand === EPars.RNABASE_DELETE) {
                        antiStructureConstraints.splice(lastShiftedIndex, 1);
                    }
                }

                structureConstraints = this._targetConditions[ii]['structure_constraints'];
                if (structureConstraints != null) {
                    let constraintVal: boolean = structureConstraints[lastShiftedIndex];
                    let newConstraints: any[];

                    if (lastShiftedCommand === EPars.RNABASE_ADD_BASE) {
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
                    this._targetConditions[ii]['structure_constraints'] = newConstraints;
                }

                let antiSecstruct: string = this._targetConditions[ii]['anti_secstruct'];
                if (antiSecstruct != null) {
                    let antiPairs: number[] = EPars.parenthesisToPairs(antiSecstruct);
                    let antiResult: any[] = this._poses[ii].parseCommandWithPairs(
                        lastShiftedCommand, lastShiftedIndex, antiPairs
                    );
                    this._targetConditions[ii]['anti_secstruct'] = antiResult[0];
                }

                if (this._targetConditions[ii]['type'] === 'aptamer') {
                    let bindingSite: number[] = this._targetConditions[ii]['site'].slice(0);
                    let bindingPairs: number[] = [];
                    if (lastShiftedCommand === EPars.RNABASE_ADD_BASE) {
                        for (let ss = 0; ss < bindingSite.length; ss++) {
                            if (bindingSite[ss] >= lastShiftedIndex) {
                                bindingSite[ss]++;
                            }
                        }

                        for (let jj = 0; jj < bindingSite.length; jj++) {
                            bindingPairs.push(this._targetPairs[ii][bindingSite[jj]]);
                        }
                    } else {
                        for (let ss = 0; ss < bindingSite.length; ss++) {
                            if (bindingSite[ss] >= lastShiftedIndex) {
                                bindingSite[ss]--;
                            }
                        }

                        for (let jj = 0; jj < bindingSite.length; jj++) {
                            bindingPairs.push(this._targetPairs[ii][bindingSite[jj]]);
                        }
                    }

                    this._targetConditions[ii]['site'] = bindingSite;
                    this._targetConditions[ii]['binding_pairs'] = bindingPairs;
                }
            }

            this._poses[ii].sequence = this._poses[targetIndex].sequence;
            this._poses[ii].puzzleLocks = this._poses[targetIndex].puzzleLocks;
        }

        this._foldTotalTime = 0;

        if (this._isFrozen) {
            return;
        }

        const LOCK_NAME = 'ExecFold';

        let execfoldCB = (fd: any[]) => {
            this.hideAsyncText();
            this.popUILock(LOCK_NAME);

            if (fd != null) {
                this._stackLevel++;
                this._stackSize = this._stackLevel + 1;
                this._seqStacks[this._stackLevel] = [];

                for (let ii = 0; ii < this._poses.length; ii++) {
                    let undoBlock: UndoBlock = new UndoBlock([]);
                    undoBlock.fromJSON(fd[ii]);
                    this._seqStacks[this._stackLevel][ii] = undoBlock;
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
        let sol: Solution = SolutionManager.instance.getSolutionBySequence(
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
        this._foldStartTime = new Date().getTime();

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
        let bestPairs: number[];
        let oligoOrder: number[] = null;
        let oligosPaired = 0;
        let forceStruct: string = null;
        let foldMode: number;
        let fullSeq: number[];
        let malus: number;
        let bonus: number;
        let sites: number[];

        if (ii === 0) {
            // / Pushing undo block
            this._stackLevel++;
            this._seqStacks[this._stackLevel] = [];
        }
        // a "trick" used by the 'multifold' branch below, in order to
        // re-queue itself without triggering the stack push coded above
        ii %= this._targetPairs.length;

        let seq: number[] = this._poses[ii].sequence;

        let pseudoknots = false;
        if (this._targetConditions && this._targetConditions[ii]
                && this._targetConditions[ii]['type'] === 'pseudoknot') {
            pseudoknots = true;
        }

        if (this._targetConditions[ii]) forceStruct = this._targetConditions[ii]['force_struct'];

        if (this._targetConditions[ii] == null || this._targetConditions[ii]['type'] === 'single') {
            bestPairs = this._folder.foldSequence(this._puzzle.transformSequence(seq, ii), null, forceStruct);
        } else if (this._targetConditions[ii]['type'] === 'pseudoknot') {
            bestPairs = this._folder.foldSequence(this._puzzle.transformSequence(seq, ii), null, forceStruct, true);
        } else if (this._targetConditions[ii]['type'] === 'aptamer') {
            bonus = this._targetConditions[ii]['bonus'];
            sites = this._targetConditions[ii]['site'];
            bestPairs = this._folder.foldSequenceWithBindingSite(
                this._puzzle.transformSequence(seq, ii),
                this._targetPairs[ii],
                sites, Number(bonus),
                this._targetConditions[ii]['fold_version']
            );
        } else if (this._targetConditions[ii]['type'] === 'oligo') {
            foldMode = this._targetConditions[ii]['fold_mode'] == null
                ? Pose2D.OLIGO_MODE_DIMER
                : Number(this._targetConditions[ii]['fold_mode']);
            if (foldMode === Pose2D.OLIGO_MODE_DIMER) {
                log.debug('cofold');
                fullSeq = seq.concat(EPars.stringToSequence(`&${this._targetConditions[ii]['oligo_sequence']}`));
                malus = int(this._targetConditions[ii]['malus'] * 100);
                bestPairs = this._folder.cofoldSequence(fullSeq, null, malus, forceStruct);
            } else if (foldMode === Pose2D.OLIGO_MODE_EXT5P) {
                fullSeq = EPars.stringToSequence(this._targetConditions[ii]['oligo_sequence']).concat(seq);
                bestPairs = this._folder.foldSequence(fullSeq, null, forceStruct);
            } else {
                fullSeq = seq.concat(EPars.stringToSequence(this._targetConditions[ii]['oligo_sequence']));
                bestPairs = this._folder.foldSequence(fullSeq, null, forceStruct);
            }
        } else if (this._targetConditions[ii]['type'] === 'aptamer+oligo') {
            bonus = this._targetConditions[ii]['bonus'];
            sites = this._targetConditions[ii]['site'];
            foldMode = this._targetConditions[ii]['fold_mode'] == null
                ? Pose2D.OLIGO_MODE_DIMER
                : Number(this._targetConditions[ii]['fold_mode']);
            if (foldMode === Pose2D.OLIGO_MODE_DIMER) {
                log.debug('cofold');
                fullSeq = seq.concat(EPars.stringToSequence(`&${this._targetConditions[ii]['oligo_sequence']}`));
                malus = int(this._targetConditions[ii]['malus'] * 100);
                bestPairs = this._folder.cofoldSequenceWithBindingSite(fullSeq, sites, bonus, forceStruct, malus);
            } else if (foldMode === Pose2D.OLIGO_MODE_EXT5P) {
                fullSeq = EPars.stringToSequence(this._targetConditions[ii]['oligo_sequence']).concat(seq);
                bestPairs = this._folder.foldSequenceWithBindingSite(
                    fullSeq, this._targetPairs[ii], sites, Number(bonus), this._targetConditions[ii]['fold_version']
                );
            } else {
                fullSeq = seq.concat(EPars.stringToSequence(this._targetConditions[ii]['oligo_sequence']));
                bestPairs = this._folder.foldSequenceWithBindingSite(
                    fullSeq, this._targetPairs[ii], sites, Number(bonus), this._targetConditions[ii]['fold_version']
                );
            }
        } else if (this._targetConditions[ii]['type'] === 'multistrand') {
            let oligos: any[] = [];
            for (let jj = 0; jj < this._targetConditions[ii]['oligos'].length; jj++) {
                oligos.push({
                    seq: EPars.stringToSequence(this._targetConditions[ii]['oligos'][jj]['sequence']),
                    malus: int(this._targetConditions[ii]['oligos'][jj]['malus'] * 100.0)
                });
            }
            log.debug('multifold');

            let key: any = {
                primitive: 'multifold',
                seq: this._puzzle.transformSequence(seq, ii),
                secondBestPairs: null,
                oligos,
                desiredPairs: null,
                temp: 37
            };
            let mfold: any = this._folder.getCache(key);

            if (mfold == null && !this.forceSync) {
                // multistrand folding can be really slow
                // break it down to each permutation
                let ops: PoseOp[] = this._folder.multifoldUnroll(this._puzzle.transformSequence(seq, ii), null, oligos);
                this._opQueue.unshift(new PoseOp(
                    ii + 1,
                    () => this.poseEditByTargetFoldTarget(ii + this._targetPairs.length)
                ));
                while (ops.length > 0) {
                    let o: PoseOp = ops.pop();
                    o.sn = ii + 1;
                    this._opQueue.unshift(o);
                }
                return;
            } else {
                let best: any = this._folder.multifold(this._puzzle.transformSequence(seq, ii), null, oligos);
                bestPairs = best.pairs.slice();
                oligoOrder = best.order.slice();
                oligosPaired = best.count;
            }
        }

        let undoBlock: UndoBlock = new UndoBlock(this._puzzle.transformSequence(seq, ii));
        undoBlock.setPairs(bestPairs, 37, pseudoknots);
        undoBlock.targetOligos = this._targetOligos[ii];
        undoBlock.targetOligo = this._targetOligo[ii];
        undoBlock.oligoOrder = oligoOrder;
        undoBlock.oligosPaired = oligosPaired;
        undoBlock.targetPairs = this._targetPairs[ii];
        undoBlock.targetOligoOrder = this._targetOligosOrder[ii];
        undoBlock.puzzleLocks = this._poses[ii].puzzleLocks;
        undoBlock.targetConditions = this._targetConditions[ii];
        undoBlock.setBasics(this._folder, 37, pseudoknots);
        this._seqStacks[this._stackLevel][ii] = undoBlock;
    }

    private poseEditByTargetEpilog(targetIndex: number): void {
        this.hideAsyncText();
        this.popUILock(PoseEditMode.FOLDING_LOCK);

        let pseudoknots = false;
        if (this._targetConditions && this._targetConditions[targetIndex]
                && this._targetConditions[targetIndex]['type'] === 'pseudoknot') {
            pseudoknots = true;
        }

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

        let lastBestPairs: number[] = this._seqStacks[this._stackLevel][targetIndex].getPairs(37, pseudoknots);
        let bestPairs: number[] = lastBestPairs;

        if (this._stackLevel > 0) {
            lastBestPairs = this._seqStacks[this._stackLevel - 1][targetIndex].getPairs(37, pseudoknots);
        }

        if (lastBestPairs != null) {
            let isShapeConstrained = this._puzzle.constraints.some(
                (constraint) => constraint instanceof ShapeConstraint
            );

            let pairsDiff: number[] = [];

            for (let ii = 0; ii < bestPairs.length; ii++) {
                if (lastBestPairs[ii] === bestPairs[ii]) {
                    pairsDiff[ii] = 0;
                } else if (bestPairs[ii] < 0 && lastBestPairs[ii] >= 0) {
                    pairsDiff[ii] = -1;
                } else if (bestPairs[ii] > ii) {
                    if (lastBestPairs[ii] >= 0) {
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
                            || (bestPairs[ii] === this._targetPairs[targetIndex][ii])
                        )
                    ) {
                        if (stackStart < 0) {
                            stackStart = ii;
                            lastOtherStack = bestPairs[ii];
                        } else {
                            if (bestPairs[ii] !== lastOtherStack - 1) {
                                this._poses[targetIndex].praiseStack(stackStart, ii - 1);
                                stackStart = ii;
                            }

                            lastOtherStack = bestPairs[ii];
                        }
                    } else if (stackStart >= 0) {
                        this._poses[targetIndex].praiseStack(stackStart, ii - 1);
                        stackStart = -1;
                        lastOtherStack = -1;
                    }
                }
            }
        }

        if (this._foldTotalTime >= 1000.0 && this._puzzle.hasTargetType('multistrand')) {
            let sol: Solution = SolutionManager.instance.getSolutionBySequence(
                this._poses[targetIndex].getSequenceString()
            );
            if (sol != null && !sol.hasFoldData) {
                let fd: any[] = [];
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

        let before: number[] = this._puzzle.transformSequence(this.getCurrentUndoBlock(0).sequence, 0);

        this._stackLevel++;
        this.moveUndoStack();

        let after: number[] = this._puzzle.transformSequence(this.getCurrentUndoBlock(0).sequence, 0);
        this.moveHistoryAddMutations(before, after);

        this.updateScore();
        this.transformPosesMarkers();
    }

    private moveUndoStackBackward(): void {
        if (this._stackLevel < 1) {
            return;
        }
        this.savePosesMarkersContexts();

        let before: number[] = this._puzzle.transformSequence(this.getCurrentUndoBlock(0).sequence, 0);

        this._stackLevel--;
        this.moveUndoStack();

        let after: number[] = this._puzzle.transformSequence(this.getCurrentUndoBlock(0).sequence, 0);
        this.moveHistoryAddMutations(before, after);

        this.updateScore();
        this.transformPosesMarkers();
    }

    private moveUndoStackToLastStable(): void {
        this.savePosesMarkersContexts();
        let before: number[] = this._puzzle.transformSequence(this.getCurrentUndoBlock(0).sequence, 0);

        let stackLevel: number = this._stackLevel;
        while (this._stackLevel >= 1) {
            if (this.getCurrentUndoBlock(0).stable) {
                this.moveUndoStack();

                let after: number[] = this._puzzle.transformSequence(this.getCurrentUndoBlock(0).sequence, 0);
                this.moveHistoryAddMutations(before, after);

                this.updateScore();
                this.transformPosesMarkers();
                return;
            }

            this._stackLevel--;
        }
        this._stackLevel = stackLevel;
    }

    private hideEndCurtain(): void {
        for (let pose of this._poses) {
            pose.showTotalEnergy = true;
            pose.clearExplosion();
        }
        this.disableTools(false);
    }

    private clearUndoStack(): void {
        this._stackLevel = -1;
        this._stackSize = 0;
        this._seqStacks = [];
    }

    private readonly _puzzle: Puzzle;
    private readonly _params: PoseEditParams;
    private readonly _scriptInterface = new ExternalInterfaceCtx();
    private readonly _autosaveData: any[];

    private _constraintsLayer: Container;

    private _background: Background;

    private _toolbar: Toolbar;
    private _helpBar: HelpBar;
    private _chatButton: GameButton;

    protected _folder: Folder;
    // / Asynch folding
    private _opQueue: PoseOp[] = [];
    private _poseEditByTargetCb: () => void = null;
    private _asynchText: Text;
    private _foldStartTime: number;
    private _foldTotalTime: number;
    // / Undo stack
    private _seqStacks: UndoBlock[][];
    private _stackLevel: number;
    private _stackSize: number;
    private _puzState: PuzzleState;
    private _paused: boolean;
    private _startSolvingTime: number;
    private _startingPoint: string;
    private _moveCount: number = 0;
    private _moves: any[] = [];
    protected _curTargetIndex: number = 0;
    private _poseState: PoseState = PoseState.NATIVE;
    protected _targetPairs: number[][] = [];
    protected _targetConditions: any[] = [];
    private _targetOligo: number[][] = [];
    private _oligoMode: number[] = [];
    private _oligoName: string[] = [];
    private _targetOligos: Oligo[][] = [];
    private _targetOligosOrder: number[][] = [];

    private _folderButton: GameButton;
    private _isDatabrowserMode: boolean;
    private _isFrozen: boolean = false;
    private _targetName: Text;

    private _hintBoxRef: GameObjectRef = GameObjectRef.NULL;

    private _constraintBar: ConstraintBar;

    private _dockedSpecBox: SpecBox;
    private _exitButton: GameButton;

    private _uiHighlight: SpriteObject;

    private _homeButton: GameButton;
    private _scriptbar: ActionBar;
    private _undockSpecBoxButton: GameButton;
    private _nidField: Text;
    private _runButton: GameButton;
    private _runStatus: Text;
    private _ropPresets: (() => void)[] = [];

    private _isPlaying: boolean = false;
    private _curSolution: Solution;
    private _solutionNameText: Text;

    // Tutorial Script Extra Functionality
    private _showMissionScreen: boolean = true;
    private _overrideShowConstraints: boolean = true;
    private _ancestorId: number;
    private _rscript: RNAScript;

    // Will be non-null after we submit our solution to the server
    private _submitSolutionRspData: any;

    private _nucleotideRangeToShow: [number, number] | null = null;

    private static readonly FOLDING_LOCK = 'Folding';
}

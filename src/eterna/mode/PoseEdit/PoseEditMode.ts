import * as log from "loglevel";
import {Container, DisplayObject, Point, Sprite, Text} from "pixi.js";
import {HAlign, VAlign} from "../../../flashbang/core/Align";
import {Flashbang} from "../../../flashbang/core/Flashbang";
import {GameObjectRef} from "../../../flashbang/core/GameObjectRef";
import {KeyboardEventType} from "../../../flashbang/input/KeyboardEventType";
import {KeyCode} from "../../../flashbang/input/KeyCode";
import {SpriteObject} from "../../../flashbang/objects/SpriteObject";
import {AlphaTask} from "../../../flashbang/tasks/AlphaTask";
import {SelfDestructTask} from "../../../flashbang/tasks/SelfDestructTask";
import {SerialTask} from "../../../flashbang/tasks/SerialTask";
import {Assert} from "../../../flashbang/util/Assert";
import {DisplayUtil} from "../../../flashbang/util/DisplayUtil";
import {Easing} from "../../../flashbang/util/Easing";
import {EPars} from "../../EPars";
import {Eterna} from "../../Eterna";
import {Folder} from "../../folding/Folder";
import {FolderManager} from "../../folding/FolderManager";
import {FoldUtil} from "../../folding/FoldUtil";
import {EternaURL} from "../../net/EternaURL";
import {Oligo, Pose2D} from "../../pose2D/Pose2D";
import {PoseField} from "../../pose2D/PoseField";
import {PoseOp} from "../../pose2D/PoseOp";
import {PuzzleEditOp} from "../../pose2D/PuzzleEditOp";
import {Constraints, ConstraintType} from "../../puzzle/Constraints";
import {BoostersData, PoseState, Puzzle, PuzzleType} from "../../puzzle/Puzzle";
import {PuzzleManager} from "../../puzzle/PuzzleManager";
import {Solution} from "../../puzzle/Solution";
import {SolutionManager} from "../../puzzle/SolutionManager";
import {BitmapManager} from "../../resources/BitmapManager";
import {Bitmaps} from "../../resources/Bitmaps";
import {Sounds} from "../../resources/Sounds";
import {RNAScript} from "../../rscript/RNAScript";
import {ActionBar} from "../../ui/ActionBar";
import {ConstraintBox, ConstraintBoxType} from "../../ui/ConstraintBox";
import {ContextMenu} from "../../ui/ContextMenu";
import {EternaViewOptionsDialog, EternaViewOptionsMode} from "../../ui/EternaViewOptionsDialog";
import {GameButton} from "../../ui/GameButton";
import {GamePanel} from "../../ui/GamePanel";
import {HTMLTextObject} from "../../ui/HTMLTextObject";
import {GetPaletteTargetBaseType, PaletteTargetType} from "../../ui/NucleotidePalette";
import {PasteSequenceDialog} from "../../ui/PasteSequenceDialog";
import {SpecBox} from "../../ui/SpecBox";
import {SpecBoxDialog} from "../../ui/SpecBoxDialog";
import {URLButton} from "../../ui/URLButton";
import {UndoBlock, UndoBlockParam} from "../../UndoBlock";
import {ExternalInterface, ExternalInterfaceCtx} from "../../util/ExternalInterface";
import {Fonts} from "../../util/Fonts";
import {int} from "../../util/int";
import {Background} from "../../vfx/Background";
import {BubbleSweep} from "../../vfx/BubbleSweep";
import {CopyTextDialogMode} from "../CopyTextDialogMode";
import {GameMode} from "../GameMode";
import {PuzzleEditPoseData} from "../PuzzleEdit/PuzzleEditMode";
import {MissionClearedPanel} from "./MissionClearedPanel";
import {MissionIntroMode} from "./MissionIntroMode";
import {PoseEditToolbar} from "./PoseEditToolbar";
import {SubmitPoseDetails} from "./SubmitPoseDetails";
import {SubmitPoseDialog} from "./SubmitPoseDialog";
import {SubmittingDialog} from "./SubmittingDialog";

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

export class PoseEditMode extends GameMode {
    public constructor(puzzle: Puzzle, params: PoseEditParams, autosaveData: any[] = null) {
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

        this._toolbar = new PoseEditToolbar(this._puzzle, this._scriptInterface);
        this.addObject(this._toolbar, this.uiLayer);

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
                .catch(e => {
                    log.error(e);
                    this.popUILock();
                });
        });
        this._toolbar.retryButton.clicked.connect(() => this.showResetPrompt());
        this._toolbar.nativeButton.clicked.connect(() => this.togglePoseState());
        this._toolbar.targetButton.clicked.connect(() => this.togglePoseState());
        this._toolbar.specButton.clicked.connect(() => this.showSpec());
        this._toolbar.copyButton.clicked.connect(() => this.showCopySequenceDialog());
        this._toolbar.pasteButton.clicked.connect(() =>  this.showPasteSequenceDialog());
        this._toolbar.viewOptionsButton.clicked.connect(() => this.showViewOptionsDialog());
        this._toolbar.screenshotButton.clicked.connect(() => this.postScreenshot(this.createScreenshot()));

        this._toolbar.pipButton.clicked.connect(() => this.togglePip());

        this._toolbar.puzzleStateToggle.stateChanged.connect((targetIdx) => this.changeTarget(targetIdx));

        this._toolbar.freezeButton.clicked.connect(() => this.toggleFreeze());
        this._toolbar.palette.targetClicked.connect((targetType) => this.onPaletteTargetSelected(targetType));
        this._toolbar.pairSwapButton.clicked.connect(() => this.onSwapClicked());
        this._toolbar.hintButton.clicked.connect(() => this.onHintClicked());

        this.regs.add(Eterna.settings.autohideToolbar.connectNotify((value) => {
            this._toolbar.setToolbarAutohide(value);
        }));

        // Add our docked SpecBox at the bottom of uiLayer
        this._dockedSpecBox = new SpecBox(true);
        this._dockedSpecBox.display.position = new Point(15, 190);
        this._dockedSpecBox.setSize(155, 251);
        this._dockedSpecBox.display.visible = false;
        this.addObject(this._dockedSpecBox, this.uiLayer, 0);
        this._dockedSpecBox.shouldMaximize.connect(() => this.showSpec());

        this._undockSpecBoxButton = new GameButton()
            .allStates(Bitmaps.ImgMaximize)
            .tooltip("Re-maximize")
            .hotkey(KeyCode.KeyM);
        this._undockSpecBoxButton.clicked.connect(() => {
            this._dockedSpecBox.display.visible = false;
            this.showSpec();
        });
        this._dockedSpecBox.addObject(this._undockSpecBoxButton, this._dockedSpecBox.container);

        this._uiHighlight = new SpriteObject();
        this.addObject(this._uiHighlight, this.uiLayer);

        this._constraintBoxes = [];
        this._constraintsLayer = new Container();
        this.uiLayer.addChild(this._constraintsLayer);

        this._exitButton = new GameButton().allStates(Bitmaps.ImgNextInside);
        this._exitButton.display.scale = new Point(0.3, 0.3);
        this._exitButton.display.visible = false;
        this.regs.add(this._exitButton.clicked.connect(() => this.exitPuzzle()));

        this._scriptbar = new ActionBar(50);
        this.addObject(this._scriptbar, this.uiLayer);

        this._nidField = Fonts.arial("", 16).color(0xffffff).build();
        this._nidField.width = 100;
        this._nidField.height = 20;

        this._runButton = new GameButton().allStates(Bitmaps.MingFold);

        this._runStatus = Fonts.arial("idle", 16).bold().color(0xC0C0C0).build();
        this._runStatus.width = 200;
        this._runStatus.height = 20;

        this._targetName = Fonts.stdRegular("", 18).build();
        this._targetName.visible = false;
        this.uiLayer.addChild(this._targetName);

        this._homeButton = GameMode.createHomeButton();
        this._homeButton.hideWhenModeInactive();
        this.addObject(this._homeButton, this.uiLayer);

        // Async text shows above our UI lock, and right below all dialogs
        this._asynchText = Fonts.arial("folding...", 12).bold().color(0xffffff).build();
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
        super.onResized();
        this.updateUILayout();
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
            HAlign.CENTER, VAlign.BOTTOM, 20, -20);

        DisplayUtil.positionRelativeToStage(
            this._homeButton.display, HAlign.RIGHT, VAlign.TOP,
            HAlign.RIGHT, VAlign.TOP, 0, 5);

        DisplayUtil.positionRelativeToStage(
            this._solutionNameText, HAlign.CENTER, VAlign.TOP,
            HAlign.CENTER, VAlign.TOP, 0, 8);

        this._exitButton.display.position = new Point(Flashbang.stageWidth - 85, Flashbang.stageHeight - 60);
        this._undockSpecBoxButton.display.position = new Point(Flashbang.stageWidth - 22, 5);

        this._scriptbar.display.position = new Point(
            Flashbang.stageWidth - 20 - this._scriptbar.width,
            Flashbang.stageHeight - 129);

        this.layoutConstraints();

        this._dockedSpecBox.setSize(Flashbang.stageWidth, Flashbang.stageHeight - 340);
        let s: number = this._dockedSpecBox.plotSize;
        this._dockedSpecBox.setSize(s + 55, s * 2 + 51);
    }

    public get toolbar(): PoseEditToolbar {
        return this._toolbar;
    }

    public get constraintsLayer(): Container {
        return this._constraintsLayer;
    }

    private showPasteSequenceDialog(): void {
        this.showDialog(new PasteSequenceDialog()).closed.then(sequence => {
            if (sequence != null) {
                for (let pose of this._poses) {
                    pose.pasteSequence(EPars.stringToSequence(sequence));
                }
            }
        });
    }

    private showViewOptionsDialog(): void {
        let mode = this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL ?
            EternaViewOptionsMode.LAB :
            EternaViewOptionsMode.PUZZLE;
        this.showDialog(new EternaViewOptionsDialog(mode));
    }

    private showCopySequenceDialog(): void {
        let sequenceString = EPars.sequenceToString(this._poses[0].sequence);
        this.modeStack.pushMode(new CopyTextDialogMode(sequenceString, "Current Sequence"));
    }

    public setPuzzleState(newstate: PuzzleState): void {
        this._puzState = newstate;
    }

    public set puzzleDefaultMode(default_mode: PoseState) {
        this._puzzle.defaultMode = default_mode;
    }

    public ropChangeTarget(target_index: number): void {
        this.changeTarget(target_index);
        if (this._toolbar.puzzleStateToggle != null) {
            this._toolbar.puzzleStateToggle.state = target_index;
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

    public setShowTotalEnergy(show: boolean): void {
        for (let pose of this._poses) {
            pose.showTotalEnergy = show;
        }
    }

    public ropSetShowTotalEnergy(show: boolean): void {
        this._ropPresets.push(() => this.setShowTotalEnergy(show));
    }

    public selectFolder(folder_name: string): boolean {
        if (this._folder.name === folder_name) return true;
        let folder: Folder = FolderManager.instance.getFolder(folder_name);
        if (this._puzzle.hasTargetType("multistrand") && !folder.canMultifold) {
            return false;
        }

        this._folder = folder;
        this.onFolderUpdated();
        return true;
    }

    public onPaletteTargetSelected(type: PaletteTargetType): void {
        let baseType: number = GetPaletteTargetBaseType(type);
        this.setPosesColor(baseType);
        this.deselectAllColorings();
    }

    public onSwapClicked(): void {
        this.setPosesColor(EPars.RNABASE_PAIR);
        this.deselectAllColorings();
        this._toolbar.pairSwapButton.toggled.value = true;
    }

    public onHintClicked(): void {
        if (this._hintBoxRef.isLive) {
            this._hintBoxRef.destroyObject();
        } else {
            let hintBox = new GamePanel();
            hintBox.title = "Hint"; // by " + _puzzle.get_coauthor());

            let hintText = new HTMLTextObject(this._puzzle.hint, 400).font(Fonts.ARIAL).color(0xffffff);
            hintText.display.position = new Point(10, 38);
            hintBox.addObject(hintText, hintBox.container);

            this._hintBoxRef = this.addObject(hintBox, this.uiLayer);

            let updatePosition = () => {
                hintBox.display.position = new Point(
                    Flashbang.stageWidth - 440,
                    Flashbang.stageHeight - hintBox.container.height - 90);
            };

            updatePosition();
            hintBox.setSize(420, hintText.height + 46)
            hintBox.regs.add(this.resized.connect(updatePosition));
        }
    }

    public public_start_countdown(): void {
        this.startCountdown();
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
                    let undo_block: UndoBlock = new UndoBlock([]);
                    undo_block.fromJSON(foldData[ii]);
                    this._seqStacks[this._stackLevel][ii] = undo_block;
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

        if (this._puzzle.hasTargetType("multistrand")) {
            this.showAsyncText("retrieving...");
            solution.queryFoldData().then(result => setSolution(result));
        } else {
            setSolution(null);
        }
    }

    private updateSolutionNameText(solution: Solution): void {
        this._solutionNameText.text = `${solution.title} (${solution.playerName})`;
        this._solutionNameText.visible = true;
        DisplayUtil.positionRelativeToStage(
            this._solutionNameText, HAlign.CENTER, VAlign.TOP,
            HAlign.CENTER, VAlign.TOP, 0, 8);
    }

    private setPuzzle(): void {
        let pose_fields: PoseField[] = [];

        let target_secstructs: string[] = this._puzzle.getSecstructs();
        let target_conditions: any[] = this._puzzle.targetConditions;

        // TSC: this crashes, and doesn't seem to accomplish anything
        // let before_reset: number[] = null;
        // if (is_reset) {
        //     before_reset = this._puzzle.transform_sequence(this.get_current_undo_block(0).get_sequence(), 0);
        // }

        let bind_addbase_cb = (pose: Pose2D, kk: number) => {
            pose.addBaseCallback = ((parenthesis: string, mode: PuzzleEditOp, index: number) => {
                pose.baseShift(parenthesis, mode, index);
                this.poseEditByTarget(kk);
            });
        };

        let bind_pose_edit = (pose: Pose2D, index: number) => {
            pose.poseEditCallback = (() => {
                this.poseEditByTarget(index);
            });
        };
        let bind_track_moves = (pose: Pose2D, index: number) => {
            pose.trackMovesCallback = ((count: number, moves: any[]) => {
                this._moveCount += count;
                if (moves) {
                    this._moves.push(moves.slice());
                }
            });
        };

        let bind_mousedown_event = function (pose: Pose2D, index: number): void {
            pose.startMousedownCallback = ((e: InteractionEvent, closest_dist: number, closest_index: number) => {
                for (let ii: number = 0; ii < pose_fields.length; ++ii) {
                    let pose_field: PoseField = pose_fields[ii];
                    let pose: Pose2D = pose_field.pose;
                    if (index === ii) {
                        pose.onPoseMouseDown(e, closest_index);
                    } else {
                        pose.onPoseMouseDownPropagate(e, closest_index);
                    }
                }
            });
        };

        for (let ii = 0; ii < target_conditions.length; ii++) {
            let pose_field: PoseField = new PoseField(true);
            this.addObject(pose_field, this.poseLayer);
            let pose: Pose2D = pose_field.pose;
            bind_addbase_cb(pose, ii);
            bind_pose_edit(pose, ii);
            bind_track_moves(pose, ii);
            bind_mousedown_event(pose, ii);
            pose_fields.push(pose_field);
        }

        this.setPoseFields(pose_fields);

        this._isDatabrowserMode = false;
        // if (this.root.loaderInfo.parameters.databrowser
        //     && this.root.loaderInfo.parameters.databrowser === "true") {
        //     this._is_databrowser_mode = true;
        // }

        for (let ii = 0; ii < target_secstructs.length; ii++) {
            this._targetPairs.push(EPars.parenthesisToPairs(target_secstructs[ii]));
            this._targetConditions.push(target_conditions[ii]);
            this._targetOligos.push(null);
            this._targetOligosOrder.push(null);
            this._targetOligo.push(null);
            this._oligoMode.push(null);
            this._oligoName.push(null);
            if (target_conditions[ii] && target_conditions[ii]['oligo_sequence']) {
                this._targetOligo[ii] = EPars.stringToSequence(target_conditions[ii]['oligo_sequence']);
                this._oligoMode[ii] =
                    target_conditions[ii]["fold_mode"] == null ?
                        Pose2D.OLIGO_MODE_DIMER :
                        Number(target_conditions[ii]["fold_mode"]);
                this._oligoName[ii] = target_conditions[ii]['oligo_name'];
            }
            if (target_conditions[ii] && target_conditions[ii]['oligos']) {
                let odefs: OligoDef[] = target_conditions[ii]['oligos'];
                let ndefs: Oligo[] = [];
                for (let jj: number = 0; jj < odefs.length; jj++) {
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

        let puzzleIcon = new Sprite(BitmapManager.getBitmap(Bitmaps.NovaPuzzleImg));
        puzzleIcon.position = new Point(11, 8);
        this.uiLayer.addChild(puzzleIcon);

        let puzzleTitle = new HTMLTextObject(this._puzzle.getName(true))
            .font(Fonts.ARIAL)
            .fontSize(14)
            .bold()
            .selectable(false)
            .color(0xffffff);
        puzzleTitle.hideWhenModeInactive();
        this.addObject(puzzleTitle, this.uiLayer);
        DisplayUtil.positionRelative(
            puzzleTitle.display, HAlign.LEFT, VAlign.CENTER,
            puzzleIcon, HAlign.RIGHT, VAlign.CENTER, 3, 0);

        this._solutionNameText = Fonts.arial("", 14).bold().color(0xc0c0c0).build();
        this.uiLayer.addChild(this._solutionNameText);

        this._constraintsLayer.visible = true;

        if (!this._puzzle.isPalleteAllowed) {
            for (let pose of this._poses) {
                pose.currentColor = -1;
            }
        } else {
            this._toolbar.palette.clickTarget(PaletteTargetType.A);
        }

        let numConstraints: number = 0;
        let constraints: string[] = [];
        if (this._puzzle.constraints != null) {
            numConstraints = this._puzzle.constraints.length;
            constraints = this._puzzle.constraints;
        }

        this._constraintBoxes = [];
        this._unstableShapeConstraintIdx = -1;

        if (numConstraints > 0) {
            if (numConstraints % 2 !== 0) {
                throw new Error("Wrong constraints length");
            }

            for (let constraintIdx = 0; constraintIdx < numConstraints; constraintIdx += 2) {
                let newbox = new ConstraintBox(ConstraintBoxType.DEFAULT);
                this._constraintBoxes.push(newbox);
                this.addObject(newbox, this._constraintsLayer);

                newbox.pointerDown.connect(() => {
                    this.onConstraintBoxClicked(constraintIdx);
                });
            }

            this._constraintShapeBoxes = [];
            this._constraintShapeBoxes.push(null);

            this._constraintAntishapeBoxes = [];
            this._constraintAntishapeBoxes.push(null);
            if (this._targetPairs.length > 1) {
                for (let pairsIdx = 1; pairsIdx < this._targetPairs.length; pairsIdx++) {
                    this._constraintShapeBoxes[pairsIdx] = null;
                    this._constraintAntishapeBoxes[pairsIdx] = null;
                    for (let constraintIdx = 0; constraintIdx < numConstraints; constraintIdx += 2) {
                        if (constraints[constraintIdx] === ConstraintType.SHAPE) {
                            if (int(constraints[constraintIdx + 1]) === pairsIdx) {
                                let newbox = new ConstraintBox(ConstraintBoxType.DEFAULT);
                                this._constraintShapeBoxes[pairsIdx] = newbox;
                                this.addObject(newbox, this._constraintsLayer);

                                newbox.pointerDown.connect(() => {
                                    this.onConstraintBoxClicked(constraintIdx);
                                });
                            }
                        } else if (constraints[constraintIdx] === ConstraintType.ANTISHAPE) {
                            if (int(constraints[constraintIdx + 1]) === pairsIdx) {
                                let newbox = new ConstraintBox(ConstraintBoxType.DEFAULT);
                                this._constraintAntishapeBoxes[pairsIdx] = newbox;
                                this.addObject(newbox, this._constraintsLayer);

                                newbox.pointerDown.connect(() => {
                                    this.onConstraintBoxClicked(constraintIdx);
                                });
                            }
                        }
                    }
                }
            }
        }

        for (let box of this._constraintBoxes) {
            box.display.visible = false;
        }

        let pairs: number[] = EPars.parenthesisToPairs(this._puzzle.getSecstruct());

        /// Setup Action bar
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

        this._folderButton = new GameButton()
            .allStates(Bitmaps.ShapeImg)
            .label(this._folder.name, 22)
            .tooltip("Select the folding engine.");
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
                    let saved_seq: number[] = this._puzzle.savedSequence;
                    if (saved_seq != null) {
                        if (saved_seq.length === seq.length) {
                            seq = saved_seq;
                        }
                    }
                }
            } else {
                if (this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL && this._puzzle.isUsingTails) {
                    seq = Puzzle.probeTail(seq);
                }
            }

            this._poses[ii].sequence = this._puzzle.transformSequence(seq, ii);
            if (this._puzzle.barcodeIndices != null) {
                this._poses[ii].barcodes = this._puzzle.barcodeIndices;
            }
            this._poses[ii].setOligos(this._targetOligos[ii], this._targetOligosOrder[ii]);
            this._poses[ii].setOligo(this._targetOligo[ii], this._oligoMode[ii], this._oligoName[ii]);
            this._poses[ii].pairs = this._targetPairs[ii];
            if (this._targetConditions != null && this._targetConditions[ii] != null) {
                this._poses[ii].structConstraints = this._targetConditions[ii]['structure_constraints'];
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
        if (!this._params.isReset &&
            this._params.initSolution == null) {

            this.loadSavedData();
        }

        this._poseEditByTargetCb = () => {
            if (this.forceSync) {
                this.setPuzzleEpilog(initialSequence, this._params.isReset);
            } else {
                this._opQueue.push(new PoseOp(
                    this._targetPairs.length,
                    () => this.setPuzzleEpilog(initialSequence, this._params.isReset)));
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
        this._scriptInterface.addCallback("set_script_status", (txt: string): void => {
            this._runStatus.style.fill = 0xC0C0C0;
            this._runStatus.text = txt;
        });

        this._scriptInterface.addCallback("get_sequence_string", (): string => {
            return this.getPose(0).getSequenceString();
        });

        this._scriptInterface.addCallback("get_full_sequence", (indx: number): string => {
            if (indx < 0 || indx >= this._poses.length) {
                return null;
            } else {
                return EPars.sequenceToString(this.getPose(indx).fullSequence);
            }
        });

        this._scriptInterface.addCallback("get_locks", (): boolean[] => {
            let pose: Pose2D = this.getPose(0);
            return pose.puzzleLocks.slice(0, pose.sequence.length);
        });

        this._scriptInterface.addCallback("get_targets", (): any[] => {
            let conditions = this._puzzle.targetConditions;
            if (conditions.length === 0) {
                conditions.push(null);
            }
            for (let ii: number = 0; ii < conditions.length; ii++) {
                if (conditions[ii] == null) {
                    conditions[ii] = {};
                    conditions[ii]['type'] = "single";
                    conditions[ii]['secstruct'] = this._puzzle.getSecstruct(ii);
                }
            }
            return JSON.parse(JSON.stringify(conditions));
        });

        this._scriptInterface.addCallback("get_native_structure", (indx: number): string => {
            if (indx < 0 || indx >= this._poses.length) return null;
            let native_pairs = this.getCurrentUndoBlock(indx).getPairs();
            return EPars.pairsToParenthesis(native_pairs);
        });

        this._scriptInterface.addCallback("get_full_structure", (indx: number): string => {
            if (indx < 0 || indx >= this._poses.length) {
                return null;
            }

            let native_pairs: number[] = this.getCurrentUndoBlock(indx).getPairs();
            let seq_arr: number[] = this.getPose(indx).fullSequence;
            return EPars.pairsToParenthesis(native_pairs, seq_arr);
        });

        this._scriptInterface.addCallback("get_free_energy", (indx: number): number => {
            if (indx < 0 || indx >= this._poses.length) {
                return Number.NaN;
            }
            return this.getCurrentUndoBlock(indx).getParam(UndoBlockParam.FE);
        });

        this._scriptInterface.addCallback("get_constraints", (): any[] => {
            return JSON.parse(JSON.stringify(this._puzzle.constraints));
        });

        this._scriptInterface.addCallback("check_constraints", (): boolean => {
            return this.checkConstraints(false);
        });

        this._scriptInterface.addCallback("constraint_satisfied", (idx: number): boolean => {
            this.checkConstraints(true);
            if (idx >= 0 && idx < this.constraintCount) {
                let o: ConstraintBox = this.getConstraint(idx);
                return o.isSatisfied;
            } else {
                return false;
            }
        });

        this._scriptInterface.addCallback("get_tracked_indices", (): number[] => this.getPose(0).trackedIndices);
        this._scriptInterface.addCallback("get_barcode_indices", (): number[] => this._puzzle.barcodeIndices);
        this._scriptInterface.addCallback("is_barcode_available",
            (seq: string): boolean => SolutionManager.instance.checkRedundancyByHairpin(seq));

        this._scriptInterface.addCallback("current_folder", (): string => this._folder.name);

        this._scriptInterface.addCallback("fold", (seq: string, constraint: string = null): string => {
            let seq_arr: number[] = EPars.stringToSequence(seq);
            let folded: number[] = this._folder.foldSequence(seq_arr, null, constraint);
            return EPars.pairsToParenthesis(folded);
        });

        this._scriptInterface.addCallback("fold_with_binding_site", (seq: string, site: number[], bonus: number): string => {
            let seq_arr: number[] = EPars.stringToSequence(seq);
            let folded: number[] = this._folder.foldSequenceWithBindingSite(seq_arr, null, site, Math.floor(bonus * 100), 2.5);
            return EPars.pairsToParenthesis(folded);
        });

        this._scriptInterface.addCallback("energy_of_structure", (seq: string, secstruct: string): number => {
            let seq_arr: number[] = EPars.stringToSequence(seq);
            let struct_arr: number[] = EPars.parenthesisToPairs(secstruct);
            let free_energy: number = this._folder.scoreStructures(seq_arr, struct_arr);
            return 0.01 * free_energy;
        });

        this._scriptInterface.addCallback("pairing_probabilities", (seq: string, secstruct: string = null): number[] => {
            let seq_arr: number[] = EPars.stringToSequence(seq);
            let folded: number[];
            if (secstruct) {
                folded = EPars.parenthesisToPairs(secstruct);
            } else {
                folded = this._folder.foldSequence(seq_arr, null, null);
            }
            let pp: number[] = this._folder.getDotPlot(seq_arr, folded);
            return pp.slice();
        });

        this._scriptInterface.addCallback("cofold", (seq: string, oligo: string, malus: number = 0., constraint: string = null): string => {
            let len: number = seq.length;
            let cseq: string = seq + "&" + oligo;
            let seq_arr: number[] = EPars.stringToSequence(cseq);
            let folded: number[] = this._folder.cofoldSequence(seq_arr, null, Math.floor(malus * 100), constraint);
            return EPars.pairsToParenthesis(folded.slice(0, len))
                + "&" + EPars.pairsToParenthesis(folded.slice(len));
        });

        if (this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL) {
            this._scriptInterface.addCallback("select_folder", (folder_name: string): boolean => {
                return this.selectFolder(folder_name);
            });

            this._scriptInterface.addCallback("load_parameters_from_buffer", (str: string): boolean => {
                log.info("TODO: load_parameters_from_buffer");
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
        this._scriptInterface.addCallback("sparks_effect", (from: number, to: number): void => {
            // FIXME: check PiP mode and handle accordingly
            for (let pose of this._poses) {
                pose.praiseSequence(from, to);
            }
        });

        // Setters
        this._scriptInterface.addCallback("set_sequence_string", (seq: string): boolean => {
            let seq_arr: number[] = EPars.stringToSequence(seq);
            if (seq_arr.indexOf(EPars.RNABASE_UNDEFINED) >= 0 || seq_arr.indexOf(EPars.RNABASE_CUT) >= 0) {
                log.info("Invalid characters in " + seq);
                return false;
            }
            let prevForceSync = this.forceSync;
            this.forceSync = true;
            for (let pose of this._poses) {
                pose.pasteSequence(seq_arr);
            }
            this.forceSync = prevForceSync;
            this.moveHistoryAddSequence("paste", seq);
            return true;
        });

        this._scriptInterface.addCallback("set_tracked_indices", (marks: number[], colors?: number[]): void => {
            for (let ii: number = 0; ii < this.numPoseFields; ii++) {
                let pose: Pose2D = this.getPose(ii);
                pose.clearTracking();
                let baseColors: number[] = [];
                if (colors) {
                    if (colors.length == marks.length) {
                        baseColors = colors;
                    } else {
                        console.error("Mark array is not the same length as color array for set_tracked_indices - leaving as black");
                    }
                }

                if (baseColors.length == 0) {
                    baseColors = marks.map(idx => 0x000000);
                }

                for (let k: number = 0; k < marks.length; k++) {
                    pose.addBaseMark(marks[k], baseColors[k]);
                }
            }
        });

        this._scriptInterface.addCallback("set_design_title", (design_title: string): void => {
            log.info("TODO: set_design_title");
            // Application.instance.get_application_gui("Design Name").set_text(design_title);
            // Application.instance.get_application_gui("Design Name").visible = true;
            this.clearUndoStack();
            this.poseEditByTarget(0);
        });
    }

    public on_click_run(): void {
        let nid: string = this._nidField.text;
        if (nid.length === 0) {
            return;
        }

        this._runStatus.style.fill = 0xC0C0C0;
        this._runStatus.text = "running...";

        const LOCK_NAME = "RunScript";
        this.pushUILock(LOCK_NAME);

        ExternalInterface.runScript(nid)
            .then(ret => {
                log.info(ret);
                if (typeof(ret['cause']) === "string") {
                    this._runStatus.style.fill = (ret['result'] ? 0x00FF00 : 0xFF0000);
                    this._runStatus.text = ret['cause'];
                }

                this.popUILock(LOCK_NAME);
            })
            .catch(() => this.popUILock(LOCK_NAME));
    }

    public layoutConstraints(): void {
        let min_x: number = this._constraintsOffset + 17;
        let rel_x: number;
        if (this._targetPairs == null) return;
        let n: number = this._targetPairs.length;
        if (n < 2) return;
        for (let ii: number = 1; ii < n; ii++) {
            rel_x = (ii / n) * Flashbang.stageWidth + 17;
            if (rel_x < min_x) rel_x = min_x;
            if (this._constraintShapeBoxes[ii]) {
                this._constraintShapeBoxes[ii].display.position = new Point(rel_x, 35);
                min_x = rel_x + 77;
            }
            if (this._constraintAntishapeBoxes[ii]) {
                this._constraintAntishapeBoxes[ii].display.position = new Point(rel_x + 77, 35);
                min_x = rel_x + 2 * 77;
            }
        }
    }

    public onKeyboardEvent(e: KeyboardEvent): void {
        let handled: boolean = this.keyboardInput.handleKeyboardEvent(e);

        if (!handled && e.type === KeyboardEventType.KEY_DOWN) {
            let key = e.code;
            let ctrl = e.ctrlKey;

            if (!ctrl && key === KeyCode.KeyN) {
                Eterna.settings.showNumbers.value = !Eterna.settings.showNumbers.value;
                handled = true;
            } else if (!ctrl && key === KeyCode.KeyG) {
                Eterna.settings.displayFreeEnergies.value = !Eterna.settings.displayFreeEnergies.value;
                handled = true;
            } else if (!ctrl && key === KeyCode.KeyS) {
                this.showSpec();
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
        if (this._params.solutions == null || this._params.solutions.length == 0) {
            return;
        }

        const curSolutionIdx = this._params.solutions.indexOf(this._curSolution);
        let nextSolutionIdx =
            (curSolutionIdx >= 0 ? curSolutionIdx + indexOffset : 0) % this._params.solutions.length;
        if (nextSolutionIdx < 0) {
            nextSolutionIdx = this._params.solutions.length + nextSolutionIdx;
        }

        const solution = this._params.solutions[nextSolutionIdx];
        Assert.notNull(solution);
        this.showSolution(solution);
    }

    /*override*/
    public update(dt: number): void {
        // process queued asynchronous operations (folding)
        const startTime = new Date().getTime();
        let elapsed: number = 0;
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

    public showMissionScreen(do_show: boolean): void {
        this._showMissionScreen = do_show;
    }

    public showConstraints(do_show: boolean): void {
        this._overrideShowConstraints = do_show;
        if (this._constraintsLayer != null) {
            this._constraintsLayer.visible = this._constraintsLayer.visible && this._overrideShowConstraints;
        }
    }

    public get constraintCount(): number {
        return this._constraintBoxes.length;
    }

    public getConstraint(i: number): ConstraintBox {
        return this._constraintBoxes[this._constraintBoxes.length - i - 1];
    }

    public get_shape_box(i: number): ConstraintBox {
        return this._constraintBoxes[i];
    }

    public setAncestorId(id: number): void {
        this._ancestorId = id;
    }

    /*override*/
    protected onSetPip(pip_mode: boolean): void {
        Eterna.settings.pipEnabled.value = pip_mode;

        if (pip_mode) {
            this._toolbar.puzzleStateToggle.display.visible = false;
            this._targetName.visible = false;

            for (let ii = 0; ii < this._poses.length; ii++) {
                this.setPoseTarget(ii, ii);
            }

            this.displayConstraintBoxes(false, true);

            if (this._poseState === PoseState.NATIVE) {
                this.setToNativeMode();
            } else if (this._poseState === PoseState.TARGET) {
                this.setToTargetMode();
            } else {
                this.setToFrozenMode();
            }

            let min_zoom: number = -1;
            for (let pose of this._poses) {
                min_zoom = Math.max(min_zoom, pose.computeDefaultZoomLevel());
            }

            for (let pose of this._poses) {
                pose.setZoomLevel(min_zoom);
            }

        } else {
            this._toolbar.puzzleStateToggle.display.visible = true;
            this._targetName.visible = true;

            this.changeTarget(this._curTargetIndex);
            this._poses[0].setZoomLevel(this._poses[0].computeDefaultZoomLevel(), true, true);
        }
    }

    /*override*/
    protected createContextMenu(): ContextMenu {
        if (this.isDialogOrNotifShowing || this.hasUILock) {
            return null;
        }

        let menu = new ContextMenu();

        menu.addItem("Preferences").clicked.connect(() => this.showViewOptionsDialog());
        if (this._puzzle.puzzleType == PuzzleType.EXPERIMENTAL) {
            menu.addItem("Design Browser").clicked.connect(() => this.openDesignBrowserForOurPuzzle());
            menu.addItem("Submit").clicked.connect(() => this.submitCurrentPose());
            menu.addItem("Specs").clicked.connect(() => this.showSpec());
        }

        menu.addItem("Reset").clicked.connect(() => this.showResetPrompt());
        menu.addItem("Copy Sequence").clicked.connect(() => this.showCopySequenceDialog());
        menu.addItem("Paste Sequence").clicked.connect(() => this.showPasteSequenceDialog());
        menu.addItem("Beam to PuzzleMaker").clicked.connect(() => this.transferToPuzzlemaker());

        return menu;
    }

    private openDesignBrowserForOurPuzzle(): void {
        if (this._puzzle.puzzleType == PuzzleType.EXPERIMENTAL) {
            this.pushUILock();
            Eterna.app.switchToDesignBrowser(this._puzzle)
                .then(() => this.popUILock())
                .catch(e => {
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

        let info =
            `Player: ${Eterna.playerName}\n` +
            `Puzzle ID: ${this._puzzle.nodeID}\n` +
            `Puzzle Title: ${this._puzzle.getName()}\n` +
            `Mode: ${this.toolbar.nativeButton.isSelected ? "NativeMode" : "TargetMode"}`;
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
            throw new Error("exit_puzzle was called before we submitted a solution");
        }
        this.showMissionClearedPanel(this._submitSolutionRspData);
    }

    private showResetPrompt(): void {
        const PROMPT = "Do you really want to reset?\nResetting will clear your undo stack.";
        this.showConfirmDialog(PROMPT).closed.then(confirmed => {
            if (confirmed) {
                this.resetAutosaveData();
                this._puzzle.temporaryConstraints = null;
                this.modeStack.changeMode(new PoseEditMode(this._puzzle, {isReset: true}));
            }
        });
    }

    private changeTarget(target_index: number): void {
        this._curTargetIndex = target_index;

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

    private getForcedHighlights(target_index: number): number[] {
        let elems: number[] = null;

        if (this._targetConditions) {
            let max_len: number = this._poses[target_index].sequence.length;
            for (let ii: number = 0; ii < this._poses.length; ii++) {
                if (ii === target_index || this._targetConditions[ii]['force_struct'] == null) {
                    continue;
                }

                if (elems == null) {
                    elems = [];
                }
                let curr: number = 1;
                let forced: number[] = EPars.parenthesisToForcedArray(this._targetConditions[ii]['force_struct']);
                let jj;
                for (jj = 0; jj < max_len && jj < forced.length; jj++) {
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

    private setPoseTarget(pose_index: number, target_index: number): void {
        if (this._targetConditions[target_index] != null) {
            this._poses[pose_index].sequence = this._puzzle.transformSequence(this._poses[target_index].sequence, target_index);
            let tc_type: string = this._targetConditions[target_index]['type'];

            if (tc_type === "multistrand") {
                let odefs: OligoDef[] = this._targetConditions[target_index]['oligos'];
                let ndefs: Oligo[] = [];
                for (let ii: number = 0; ii < odefs.length; ii++) {
                    ndefs.push({
                        sequence: EPars.stringToSequence(odefs[ii].sequence),
                        malus: odefs[ii].malus,
                        name: odefs[ii]['name']
                    });
                }
                this._poses[pose_index].setOligos(ndefs, this._targetOligosOrder[target_index]);
            } else {
                this._poses[pose_index].setOligos(null);
            }

            if (Puzzle.isOligoType(tc_type)) {
                let fold_mode: number = this._targetConditions[target_index]["fold_mode"] == null ?
                    Pose2D.OLIGO_MODE_DIMER :
                    Number(this._targetConditions[target_index]["fold_mode"]);
                this._poses[pose_index].setOligo(EPars.stringToSequence(this._targetConditions[target_index]['oligo_sequence']), fold_mode,
                    this._targetConditions[target_index]['oligo_name']);
                this._poses[pose_index].oligoMalus = this._targetConditions[target_index]["malus"];
            } else {
                this._poses[pose_index].setOligo(null);
            }

            if (Puzzle.isAptamerType(tc_type)) {
                this._poses[pose_index].setMolecularBinding(this._targetConditions[target_index]['site'], this._targetConditions[target_index]['binding_pairs'], this._targetConditions[target_index]['bonus'] / 100.0);
            } else {
                this._poses[pose_index].setMolecularBinding(null, null, null);
            }

            let forced_struct: number[] = null;
            if (this._targetConditions[target_index]['force_struct'] != null) {
                forced_struct = EPars.parenthesisToForcedArray(this._targetConditions[target_index]['force_struct']);
            }
            this._poses[pose_index].forcedStruct = forced_struct;
            this._poses[pose_index].structConstraints = this._targetConditions[target_index]['structure_constraints'];

        } else {
            this._poses[pose_index].setMolecularBinding(null, null, 0);
            this._poses[pose_index].forcedStruct = null;
            this._poses[pose_index].structConstraints = null;
            this._poses[pose_index].setOligos(null);
            this._poses[pose_index].setOligo(null);
        }
        this._poses[pose_index].forcedHighlights = this.getForcedHighlights(target_index);

        if (this._puzzle.nodeID === 2390140) {
            if (target_index === 1) {
                this._poses[pose_index].auxInfo(null);
            } else {
                this._poses[pose_index].auxInfo({cleaving_site: 28});
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
        this._toolbar.nativeButton.toggled.value = true;
        this._toolbar.targetButton.hotkey(KeyCode.Space);
        this._toolbar.nativeButton.hotkey(null);

        this.savePosesMarkersContexts();
        this._paused = false;
        this.updateScore();
        this.transformPosesMarkers();
    }

    private setToTargetMode(): void {
        this._poseState = PoseState.TARGET;

        this._toolbar.targetButton.toggled.value = true;
        this._toolbar.nativeButton.toggled.value = false;
        this._toolbar.nativeButton.hotkey(KeyCode.Space);
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
            this._poses[0].setOligos(this._targetOligos[this._curTargetIndex], this._targetOligosOrder[this._curTargetIndex]);
            this._poses[0].setOligo(this._targetOligo[this._curTargetIndex], this._oligoMode[this._curTargetIndex], this._oligoName[this._curTargetIndex]);
            this._poses[0].pairs = this._targetPairs[this._curTargetIndex];
            if (this._targetConditions != null && this._targetConditions[this._curTargetIndex] != null) {
                this._poses[0].structConstraints = this._targetConditions[this._curTargetIndex]['structure_constraints'];
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
            throw new Error("Invalid pose state");
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

    /// This mode is strictly for internal use, not to be used by users
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
        let curr_f: string = this._folder.name;
        this._folder = FolderManager.instance.getNextFolder(curr_f, (folder: Folder) => !this._puzzle.canUseFolder(folder));
        if (this._folder.name === curr_f) return;

        this.onFolderUpdated();
    }

    private showSpec(): void {
        this._dockedSpecBox.display.visible = false;

        this.updateCurrentBlockWithDotAndMeltingPlot();
        let puzzleState = this.getCurrentUndoBlock();

        let dialog = this.showDialog(new SpecBoxDialog(puzzleState));
        dialog.closed.then(showDocked => {
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
        if (this._folder.canDotPlot) {
            datablock.updateMeltingPointAndDotPlot(this._folder);
        }
    }

    private submitCurrentPose(): void {
        if (this._puzzle.puzzleType !== PuzzleType.EXPERIMENTAL) {
            /// Always submit the sequence in the first state
            let sol_to_submit: UndoBlock = this.getCurrentUndoBlock(0);
            this.submitSolution({title: "Cleared Solution", comment: "No comment"}, sol_to_submit);

        } else {
            const NOT_SATISFIED_PROMPT =
                "Puzzle constraints are not satisfied.\n" +
                "You can still submit the sequence, but please note that there is a risk of not getting\n" +
                "synthesized properly";

            if (!this.checkConstraints(false)) {
                if (this._puzzle.isSoftConstraint || Eterna.DEV_MODE) {
                    this.showConfirmDialog(NOT_SATISFIED_PROMPT).closed
                        .then(confirmed => {
                            if (confirmed) {
                                this.promptForExperimentalPuzzleSubmission()
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
        /// Generate dot and melting plot data
        this.updateCurrentBlockWithDotAndMeltingPlot();

        /// Generate dot and melting plot data
        let datablock: UndoBlock = this.getCurrentUndoBlock();
        if (datablock.getParam(UndoBlockParam.DOTPLOT_BITMAP) == null) {
            this.updateCurrentBlockWithDotAndMeltingPlot();
        }

        let init_score: number = datablock.getParam(UndoBlockParam.PROB_SCORE, 37);

        let meltpoint: number = 107;
        for (let ii: number = 47; ii < 100; ii += 10) {
            let current_score: number = datablock.getParam(UndoBlockParam.PROB_SCORE, ii);
            if (current_score < init_score * 0.5) {
                meltpoint = ii;
                break;
            }
        }

        datablock.setParam(UndoBlockParam.MELTING_POINT, meltpoint, 37);

        this.showDialog(new SubmitPoseDialog()).closed.then(submitDetails => {
            if (submitDetails != null) {
                /// Always submit the sequence in the first state
                this.updateCurrentBlockWithDotAndMeltingPlot(0);
                let sol_to_submit: UndoBlock = this.getCurrentUndoBlock(0);
                this.submitSolution(submitDetails, sol_to_submit);
            }
        });
    }

    /** Creates solution-submission data for shipping off to the server */
    private createSubmitData(details: SubmitPoseDetails, undoBlock: UndoBlock): any {
        if (details.title.length === 0) {
            details.title = "Default title";
        }

        if (details.comment.length === 0) {
            details.comment = "No comment";
        }

        let post_data: any = {};

        if (this._puzzle.puzzleType !== PuzzleType.EXPERIMENTAL) {
            let next_puzzle: number = this._puzzle.nextPuzzleID;

            if (next_puzzle > 0) {
                post_data["next-puzzle"] = next_puzzle;
            } else {
                post_data["recommend-puzzle"] = true;
            }

            post_data["pointsrank"] = true;
        } else { // is experimental
            if (this._ancestorId > 0) {
                post_data["ancestor-id"] = this._ancestorId;
            }
        }

        let elapsed: number = (new Date().getTime() - this._startSolvingTime) / 1000;
        let move_history: any = {
            begin_from: this._startingPoint,
            num_moves: this._moveCount,
            moves: this._moves.slice(),
            elapsed: elapsed.toFixed(0)
        };
        post_data["move-history"] = JSON.stringify(move_history);

        let newlinereg: RegExp = new RegExp("/\"/g");
        details.comment = details.comment.replace(newlinereg, "'");
        details.title = details.title.replace(newlinereg, "'");

        let seq_string: string = EPars.sequenceToString(this._puzzle.transformSequence(undoBlock.sequence, 0));

        post_data["title"] = details.title;
        post_data["energy"] = undoBlock.getParam(UndoBlockParam.FE) / 100.0;
        post_data["puznid"] = this._puzzle.nodeID;
        post_data["sequence"] = seq_string;
        post_data["repetition"] = undoBlock.getParam(UndoBlockParam.REPETITION);
        post_data["gu"] = undoBlock.getParam(UndoBlockParam.GU);
        post_data["gc"] = undoBlock.getParam(UndoBlockParam.GC);
        post_data["ua"] = undoBlock.getParam(UndoBlockParam.AU);
        post_data["body"] = details.comment;

        if (this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL) {
            post_data["melt"] = undoBlock.getParam(UndoBlockParam.MELTING_POINT);

            if (this._foldTotalTime >= 1000.0) {
                let fd: any[] = [];
                for (let ii: number = 0; ii < this._poses.length; ii++) {
                    fd.push(this.getCurrentUndoBlock(ii).toJSON());
                }
                post_data["fold-data"] = JSON.stringify(fd);
            }
        }

        return post_data;
    }

    private submitSolution(details: SubmitPoseDetails, undoBlock: UndoBlock): void {
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

            Eterna.sound.playSound(Sounds.SoundPuzzleClear);
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

                        for (let pose of this._poses) {
                            pose.showTotalEnergy = false;
                            pose.clearExplosion();
                        }

                        this._constraintsLayer.visible = false;
                    });
                }
            }
        }

        // submit our solution to the server
        log.debug("Submitting solution...");
        let submissionPromise = Eterna.client.submitSolution(this.createSubmitData(details, undoBlock));

        // Wait for explosion completion
        fxComplete.then(() => {
            // Wait for the submission to the server, and for the mode to be active.
            // 'waitTillActive' is probably not necessary in practice, but if another mode is pushed onto this one
            // during submission, we want to wait till we're the top-most mode before executing more view logic.
            return Promise.all([submissionPromise, this.waitTillActive()]);
        })
        .then(allResults => {
            // 'allResults' contains the results of our submission, and the "waitTillActive" void promise
            let submissionResponse = allResults[0];

            // show achievements, if we were awarded any
            let cheevs: any = submissionResponse['new_achievements'];
            if (cheevs != null) {
                return this._achievements.awardAchievements(cheevs).then(() => submissionResponse);
            } else {
                return Promise.resolve(submissionResponse);
            }
        })
        .then(submissionResponse => {
            submittingRef.destroyObject();

            let data: any = submissionResponse['data'];

            if (this._puzzle.puzzleType !== PuzzleType.EXPERIMENTAL) {
                this.showMissionClearedPanel(data);
            }

            const seqString = EPars.sequenceToString(
                this._puzzle.transformSequence(undoBlock.sequence, 0));

            if (data['error'] != null) {
                log.debug(`Got solution submission error: ${data["error"]}`);
                if (data['error'].indexOf('barcode') >= 0) {
                    let dialog = this.showNotification(data['error'], "More Information");
                    dialog.extraButton.clicked.connect(() => window.open(EternaURL.BARCODE_HELP, "_blank"));
                    let hairpin: string = EPars.getBarcodeHairpin(seqString);
                    if (hairpin != null) {
                        SolutionManager.instance.addHairpins([hairpin]);
                        this.checkConstraints();
                    }
                } else {
                    this.showNotification(data['error']);
                }

            } else {
                log.debug("Solution submitted");

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
        });
    }

    private showMissionClearedPanel(submitSolutionRspData: any): void {
        this._submitSolutionRspData = submitSolutionRspData;

        // Hide some UI
        this.disableTools(true);
        this._constraintsLayer.visible = false;
        this._exitButton.display.visible = false;
        this._homeButton.display.visible = false;
        for (let pose of this._poses) {
            pose.showTotalEnergy = false;
        }
        Eterna.chat.pushHideChat();

        // Show the panel
        let infoText: string = null;
        let moreText: string = null;
        let boostersData = this._puzzle.boosters;
        if (boostersData != null && boostersData.mission_cleared != null) {
            infoText = boostersData.mission_cleared["info"];
            moreText = boostersData.mission_cleared["more"];
        }

        let nextPuzzleData: any = submitSolutionRspData['next-puzzle'];
        let nextPuzzle: Puzzle = null;
        if (nextPuzzleData) {
            try {
                nextPuzzle = PuzzleManager.instance.parsePuzzle(nextPuzzleData);
                log.info(`Loaded next puzzle [id=${nextPuzzle.nodeID}]`);
            } catch (err) {
                log.error(`Failed to load next puzzle`, err);
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
                window.open(EternaURL.getFeedURL(), "_self");
            });
        }

        missionClearedPanel.closeButton.clicked.connect(() => keepPlaying());
    }

    public deselectAllColorings(): void {
        this._toolbar.palette.clearSelection();
        this._toolbar.pairSwapButton.toggled.value = false;
        for (let button of this._toolbar.dynPaintTools) {
            button.toggled.value = false;
        }
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

    private displayConstraintBoxes(animate: boolean, display: boolean): void {
        let num_constraints: number = 0;
        let constraints: string[] = this._puzzle.constraints;

        if (this._puzzle.temporaryConstraints != null) {
            constraints = this._puzzle.temporaryConstraints;
        }

        if (constraints != null) {
            num_constraints = constraints.length;
        }

        let w_walker: number = 17;

        for (let xx = 0; xx < this._targetPairs.length; xx++) {
            if (xx === 0) {
                // scan for non-(ANTI)SHAPE
                for (let ii = 0; ii < num_constraints / 2; ii++) {
                    const box = this._constraintBoxes[ii];
                    if (box.constraintType === ConstraintType.SHAPE || box.constraintType === ConstraintType.ANTISHAPE) {
                        continue;
                    }
                    let cpos = new Point(w_walker, 35);
                    w_walker += 119;
                    box.setLocation(cpos, animate);
                    box.showBigText = false;
                    box.display.visible = display;
                }
                if (w_walker > 17) {
                    w_walker += 25;
                }
            } else if (xx === 1) {
                // save the offset for later use (avoid overlaps in PIP mode)
                this._constraintsOffset = w_walker;
            }

            // scan for SHAPE
            for (let ii = 0; ii < num_constraints / 2; ii++) {
                const box = this._constraintBoxes[ii];
                if (box.constraintType !== ConstraintType.SHAPE || int(constraints[2 * ii + 1]) !== xx) {
                    continue;
                }
                let cpos = new Point(w_walker, 35);
                w_walker += 77;
                box.setLocation(cpos, animate);
                box.showBigText = false;
                box.display.visible = (xx === 0 || !this._isPipMode) ? display : false;
            }

            // scan for ANTISHAPE
            for (let ii = 0; ii < num_constraints / 2; ii++) {
                const box = this._constraintBoxes[ii];
                if (box.constraintType !== ConstraintType.ANTISHAPE || int(constraints[2 * ii + 1]) !== xx) {
                    continue;
                }
                let cpos = new Point(w_walker, 35);
                w_walker += 77;
                box.setLocation(cpos, animate);
                box.showBigText = false;
                box.display.visible = (xx === 0 || !this._isPipMode) ? display : false;
            }
        }

        this.layoutConstraints();
    }

    private startCountdown(): void {
        this._isPlaying = false;

        const constraints: string[] = this._puzzle.curConstraints;
        if (constraints == null || constraints.length === 0 || !this._showMissionScreen) {
            this.startPlaying();

        } else {
            this.setPuzzleState(PuzzleState.COUNTDOWN);

            this._constraintsHead = this._constraintsTop;
            this._constraintsFoot = this._constraintsBottom;

            for (let ii = 0; ii < constraints.length / 2; ii++) {
                let box: ConstraintBox = this._constraintBoxes[ii];
                box.display.visible = true;
                box.showBigText = true;

                box.setLocation(new Point(
                    (Flashbang.stageWidth * 0.3),
                    (Flashbang.stageHeight * 0.4) + (ii * 77)));
            }

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

        // Create constraint boxes and pass them to the MissionIntroMode.
        // The ConstraintBox creation logic is so tied to PoseEditMode that it's just much easier -
        // though uglier - to do things this way.

        let dummyInfo: ConstraintInfo = {
            wrong_pairs: null,
            restricted_local: null,
            max_allowed_adenine: -1,
            max_allowed_cytosine: -1,
            max_allowed_guanine: -1,
        };
        let introConstraintBoxes: ConstraintBox[] = [];
        let constraints = this._puzzle.constraints;
        for (let ii = 0; ii < constraints.length; ii += 2) {
            const type: ConstraintType = constraints[ii] as ConstraintType;
            if (type === ConstraintType.SHAPE || type === ConstraintType.ANTISHAPE) {
                continue;
            }

            const value = constraints[ii + 1];
            const box = new ConstraintBox(ConstraintBoxType.MISSION_SCREEN);
            this.updateConstraint(type, value, ii, box, true, dummyInfo);

            introConstraintBoxes.push(box);
        }

        // Don't show our intro screen till scripts have completed running,
        // so that our introConstraintBoxes are properly populated
        ExternalInterface.waitForScriptCompletion().then(() => {
            this.modeStack.pushMode(new MissionIntroMode(
                this._puzzle.getName(true),
                missionText,
                this._targetPairs,
                introConstraintBoxes));
        });
    }

    private startPlaying(): void {
        this._isPlaying = true;
        this.disableTools(false);

        this.setPuzzleState(PuzzleState.GAME);
        this.displayConstraintBoxes(true, true);
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
        let msecs: number = 0;

        objs.push(msecs);
        objs.push(this._seqStacks[this._stackLevel][0].sequence);
        for (let ii: number = 0; ii < this._poses.length; ++ii) {
            objs.push(JSON.stringify(this._seqStacks[this._stackLevel][ii].toJSON()));
        }

        Eterna.saveManager.save(this.savedDataTokenName, objs);
    }

    public static savedDataTokenName(puzzleID: number): string {
        return "puz_" + puzzleID;
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
            .catch(err => Eterna.onFatalError(err));
    }

    private loadSavedData(): boolean {
        if (this._puzzle.puzzleType === PuzzleType.BASIC) {
            return false;
        }

        // if (this.root.loaderInfo.parameters.autoload
        //     && Number(this.root.loaderInfo.parameters.autoload) === 0) {
        //     return false;
        // }

        let beginning_sequence: number[] = this._puzzle.getBeginningSequence();
        let locks: boolean[] = this._puzzle.puzzleLocks;
        let oligo_len: number = 0;

        if (this._targetConditions[0] && Puzzle.isOligoType(this._targetConditions[0]['type'])) {
            oligo_len = this._targetConditions[0]['oligo_sequence'].length;
            if (Number(this._targetConditions[0]["fold_mode"]) === Pose2D.OLIGO_MODE_DIMER) oligo_len++;
        } else if (this._targetConditions[0] && this._targetConditions[0]['type'] === "multistrand") {
            let oligos: OligoDef[] = this._targetConditions[0]['oligos'];
            for (let ii = 0; ii < oligos.length; ii++) {
                oligo_len += (oligos[ii]['sequence'].length + 1);
            }
        }

        if (beginning_sequence.length !== locks.length || (beginning_sequence.length + oligo_len) !== this._targetPairs[0].length) {
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
                let undo_block: UndoBlock = new UndoBlock([]);
                try {
                    undo_block.fromJSON(JSON.parse(json[ii + 2]));
                } catch (e) {
                    log.error("Error loading saved puzzle data", e);
                    return false;
                }

                /// JEEFIX : Don't override secstruct from autoload without checking whther the puzzle can vary length.
                /// KWSFIX : Only allow when shiftable mode (=> shift_limit = 0)

                if (this._puzzle.shiftLimit === 0 && undo_block.targetPairs.length !== this._targetPairs[ii].length) {
                    return false;
                }

                this._targetPairs[ii] = undo_block.targetPairs;
                this._targetOligosOrder[ii] = undo_block.targetOligoOrder;

                this.setPosesWithUndoBlock(ii, undo_block);
            }
        }

        if ((a.length + oligo_len) !== this._targetPairs[0].length) {
            return false;
        }

        for (let ii = 0; ii < this._targetPairs[0].length; ii++) {
            if (locks[ii]) {
                a[ii] = beginning_sequence[ii];
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

    private set_default_visibilities(): void {
        this._exitButton.display.visible = false;

        this._showMissionScreen = true;
        this.showConstraints(true);

        this._toolbar.palette.resetOverrides();
        this._toolbar.palette.changeDefaultMode();
    }

    private moveHistoryAddMutations(before: number[], after: number[]): void {
        let muts: any[] = [];
        for (let ii: number = 0; ii < after.length; ii++) {
            if (after[ii] !== before[ii]) {
                muts.push({pos: ii + 1, base: EPars.sequenceToString([after[ii]])});
            }
        }
        if (muts.length === 0) return;
        this._moveCount++;
        this._moves.push(muts.slice());
    }

    private moveHistoryAddSequence(change_type: string, seq: string): void {
        let muts: any[] = [];
        muts.push({"type": change_type, "sequence": seq});
        this._moveCount++;
        this._moves.push(muts.slice());
    }

    private setPuzzleEpilog(init_seq: number[], is_reset: boolean): void {
        if (is_reset) {
            let new_seq: number[] = this._puzzle.transformSequence(this.getCurrentUndoBlock(0).sequence, 0);
            this.moveHistoryAddSequence("reset", EPars.sequenceToString(new_seq));
        } else {
            this._startSolvingTime = new Date().getTime();
            this._startingPoint = EPars.sequenceToString(this._puzzle.transformSequence(this.getCurrentUndoBlock(0).sequence, 0));
        }

        if (is_reset || this._isDatabrowserMode) {
            this.startPlaying();
        } else if (init_seq == null) {
            this.startCountdown();
        } else {
            /// Given init sequence (solution) in the lab, don't show mission animation - go straight to game
            if (this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL) {
                this.startPlaying();
            } else {
                this.startCountdown();
            }
        }

        this.setPip(Eterna.settings.pipEnabled.value);

        this.ropPresets();
    }

    private updateConstraint(type: ConstraintType, value: string, constraintIdx: number, box: ConstraintBox, render: boolean, outInfo: ConstraintInfo): ConstraintStatus {
        let isSatisfied = true;
        let isPending = false;

        const undoBlock: UndoBlock = this.getCurrentUndoBlock();
        const sequence = undoBlock.sequence;

        if (type === ConstraintType.GU) {
            const count: number = undoBlock.getParam(UndoBlockParam.GU);
            isSatisfied = (count >= Number(value));
            if (render) {
                box.setContent(ConstraintType.GU, value, isSatisfied, count);
            }
        } else if (type === ConstraintType.AU) {
            const count: number = undoBlock.getParam(UndoBlockParam.AU);
            isSatisfied = (count >= Number(value));
            if (render) {
                box.setContent(ConstraintType.AU, value, isSatisfied, count)
            }
        } else if (type === ConstraintType.GC) {
            const count: number = undoBlock.getParam(UndoBlockParam.GC);
            isSatisfied = (count <= Number(value));
            if (render) {
                box.setContent(ConstraintType.GC, value, isSatisfied, count);
            }
        } else if (type === ConstraintType.MUTATION) {
            const sequence_diff: number = EPars.sequenceDiff(this._puzzle.getSubsequenceWithoutBarcode(sequence), this._puzzle.getSubsequenceWithoutBarcode(this._puzzle.getBeginningSequence()));
            isSatisfied = sequence_diff <= Number(value);
            if (render) {
                box.setContent(ConstraintType.MUTATION, value, isSatisfied, sequence_diff);
            }

        } else if (type === ConstraintType.SHAPE) {
            const target_index = Number(value);
            const ublk: UndoBlock = this.getCurrentUndoBlock(target_index);
            let native_pairs = ublk.getPairs();
            let structure_constraints: any[] = null;
            if (this._targetConditions != null && this._targetConditions[target_index] != null) {
                structure_constraints = this._targetConditions[target_index]['structure_constraints'];

                if (ublk.oligoOrder != null) {
                    let np_map: number[] = ublk.getOrderMap(ublk.oligoOrder);
                    let tp_map: number[] = ublk.getOrderMap(ublk.targetOligoOrder);
                    if (np_map != null) {
                        let new_pairs: number[] = [];
                        let new_sc: number[] = [];
                        for (let jj = 0; jj < native_pairs.length; jj++) {
                            let kk: number = tp_map.indexOf(jj);
                            new_sc[jj] = structure_constraints[kk];
                            let pp: number = native_pairs[np_map[kk]];
                            new_pairs[jj] = pp < 0 ? pp : tp_map[np_map.indexOf(pp)];
                        }
                        native_pairs = new_pairs;
                        structure_constraints = new_sc;
                    }
                }
            }

            isSatisfied = EPars.arePairsSame(native_pairs, this._targetPairs[target_index], structure_constraints);

            let input_index: number = undefined;
            if (this._targetPairs.length > 1) {
                input_index = target_index;
            }

            if (render) {
                box.setContent(ConstraintType.SHAPE, {
                    target: this._targetPairs[target_index],
                    index: input_index,
                    native: native_pairs,
                    structure_constraints: structure_constraints
                }, isSatisfied, 0);
                box.flagged = this._unstableShapeConstraintIdx === constraintIdx;
                if (this._unstableShapeConstraintIdx === constraintIdx) {
                    outInfo.wrong_pairs = box.getWrongPairs(native_pairs, this._targetPairs[target_index], structure_constraints, isSatisfied);
                }
            }

            if (target_index > 0) {
                if (this._constraintShapeBoxes != null) {
                    if (this._constraintShapeBoxes[target_index] != null) {
                        this._constraintShapeBoxes[target_index].setContent(ConstraintType.SHAPE, {
                            target: this._targetPairs[target_index],
                            index: input_index,
                            native: native_pairs,
                            structure_constraints: structure_constraints
                        }, isSatisfied, 0);
                        this._constraintShapeBoxes[target_index].flagged = this._unstableShapeConstraintIdx === constraintIdx;
                        this._constraintShapeBoxes[target_index].display.visible = this._isPipMode;
                    }
                }
            }

        } else if (type === ConstraintType.ANTISHAPE) {
            let target_index = Number(value);
            let native_pairs = this.getCurrentUndoBlock(target_index).getPairs();
            if (this._targetConditions == null) {
                throw new Error("Target object not available for ANTISHAPE constraint");
            }

            if (this._targetConditions[target_index] == null) {
                throw new Error("Target condition not available for ANTISHAPE constraint");
            }

            let anti_structure_string: string = this._targetConditions[target_index]['anti_secstruct'];

            if (anti_structure_string == null) {
                throw new Error("Target structure not available for ANTISHAPE constraint");
            }

            let anti_structure_constraints: any[] = this._targetConditions[target_index]['anti_structure_constraints'];
            let anti_pairs: number[] = EPars.parenthesisToPairs(anti_structure_string);
            isSatisfied = !EPars.arePairsSame(native_pairs, anti_pairs, anti_structure_constraints);

            let input_index: number = undefined;
            if (this._targetPairs.length > 1) {
                input_index = target_index;
            }

            if (render) {
                box.setContent(ConstraintType.ANTISHAPE, {
                    target: anti_pairs,
                    native: native_pairs,
                    index: input_index,
                    structure_constraints: anti_structure_constraints
                }, isSatisfied, 0);
                box.flagged = this._unstableShapeConstraintIdx === constraintIdx;

                if (this._unstableShapeConstraintIdx === constraintIdx) {
                    outInfo.wrong_pairs = box.getWrongPairs(native_pairs, anti_pairs, anti_structure_constraints, isSatisfied);
                }
            }

            if (target_index > 0) {
                if (this._constraintAntishapeBoxes != null) {
                    if (this._constraintAntishapeBoxes[target_index] != null) {
                        this._constraintAntishapeBoxes[target_index].setContent(ConstraintType.ANTISHAPE, {
                            target: anti_pairs,
                            native: native_pairs,
                            index: input_index,
                            structure_constraints: anti_structure_constraints
                        }, isSatisfied, 0);
                        this._constraintAntishapeBoxes[target_index].flagged = this._unstableShapeConstraintIdx === constraintIdx;

                        this._constraintAntishapeBoxes[target_index].display.visible = this._isPipMode;
                    }
                }
            }

        } else if (type === ConstraintType.BINDINGS) {
            const target_index = Number(value);
            const undoblk: UndoBlock = this.getCurrentUndoBlock(target_index);

            if (this._targetConditions == null) {
                throw new Error("Target object not available for BINDINGS constraint");
            }

            if (this._targetConditions[target_index] == null) {
                throw new Error("Target condition not available for BINDINGS constraint");
            }

            const oligos: OligoDef[] = this._targetConditions[target_index]['oligos'];
            if (oligos == null) {
                throw new Error("Target condition not available for BINDINGS constraint");
            }

            let o_names: string[] = [];
            let bind: boolean[] = [];
            let label: string[] = [];
            let bmap: boolean[] = [];
            let offsets: number[] = [];
            let ofs: number = sequence.length;
            let o: number[] = undoblk.oligoOrder;
            let count: number = undoblk.oligosPaired;
            for (let jj = 0; jj < o.length; jj++) {
                bmap[o[jj]] = (jj < count);
                offsets[o[jj]] = ofs + 1;
                ofs += oligos[o[jj]]['sequence'].length + 1;
            }

            isSatisfied = true;
            for (let jj = 0; jj < oligos.length; jj++) {
                if (oligos[jj]['bind'] == null) continue;
                let o_name: string = oligos[jj]['name'];
                if (o_name == null) o_name = "Oligo " + (jj + 1).toString();
                o_names.push(o_name);
                let expected: boolean = Boolean(oligos[jj]['bind']);
                bind.push(expected);
                let lbl: string = oligos[jj]['label'] != null ? String(oligos[jj]['label']) : String.fromCharCode(65 + jj);
                label.push(lbl);

                if (bmap[jj] !== expected) {
                    isSatisfied = false;
                    if (outInfo.restricted_local == null) {
                        outInfo.restricted_local = [];
                    }
                    if (outInfo.restricted_local[target_index] == null) {
                        outInfo.restricted_local[target_index] = [];
                    }
                    outInfo.restricted_local[target_index].push(offsets[jj]);
                    outInfo.restricted_local[target_index].push(offsets[jj] + oligos[jj]['sequence'].length - 1);
                }
            }

            if (render) {
                box.setContent(ConstraintType.BINDINGS, {
                    index: target_index,
                    bind: bind,
                    label: label,
                    oligo_name: o_names
                }, isSatisfied, 0);
            }

        } else if (type === ConstraintType.G) {
            const count: number = Constraints.count(sequence, EPars.RNABASE_GUANINE);
            isSatisfied = (count >= Number(value));
            if (render) {
                box.setContent(ConstraintType.G, value, isSatisfied, count);
            }

        } else if (type === ConstraintType.GMAX) {
            const count = Constraints.count(sequence, EPars.RNABASE_GUANINE);
            isSatisfied = (count <= Number(value));
            if (render) {
                box.setContent(ConstraintType.GMAX, value, isSatisfied, count);
            }

        } else if (type === ConstraintType.A) {
            const count: number = Constraints.count(sequence, EPars.RNABASE_ADENINE);
            isSatisfied = (count >= Number(value));
            if (render) {
                box.setContent(ConstraintType.A, value, isSatisfied, count);
            }

        } else if (type === ConstraintType.AMAX) {
            const count = Constraints.count(sequence, EPars.RNABASE_ADENINE);
            isSatisfied = (count <= Number(value));
            if (render) {
                box.setContent(ConstraintType.AMAX, value, isSatisfied, count);
            }

        } else if (type === ConstraintType.U) {
            const count: number = Constraints.count(sequence, EPars.RNABASE_URACIL);
            isSatisfied = (count >= Number(value));
            if (render) {
                box.setContent(ConstraintType.U, value, isSatisfied, count);
            }

        } else if (type === ConstraintType.UMAX) {
            const count = Constraints.count(sequence, EPars.RNABASE_URACIL);
            isSatisfied = (count <= Number(value));
            if (render) {
                box.setContent(ConstraintType.UMAX, value, isSatisfied, count);
            }

        } else if (type === ConstraintType.C) {
            const count: number = Constraints.count(sequence, EPars.RNABASE_CYTOSINE);
            isSatisfied = (count >= Number(value));
            if (render) {
                box.setContent(ConstraintType.C, value, isSatisfied, count);
            }

        } else if (type === ConstraintType.CMAX) {
            const count = Constraints.count(sequence, EPars.RNABASE_CYTOSINE);
            isSatisfied = (count <= Number(value));
            if (render) {
                box.setContent(ConstraintType.CMAX, value, isSatisfied, count);
            }

        } else if (type === ConstraintType.PAIRS) {
            let num_gu: number = undoBlock.getParam(UndoBlockParam.GU);
            let num_gc: number = undoBlock.getParam(UndoBlockParam.GC);
            let num_ua: number = undoBlock.getParam(UndoBlockParam.AU);
            isSatisfied = (num_gc + num_gu + num_ua >= Number(value));

            if (render) {
                box.setContent(ConstraintType.PAIRS, value, isSatisfied, num_gc + num_gu + num_ua);
            }

        } else if (type === ConstraintType.STACK) {
            const stack_len: number = undoBlock.getParam(UndoBlockParam.STACK);
            isSatisfied = (stack_len >= Number(value));

            if (render) {
                box.setContent(ConstraintType.STACK, value, isSatisfied, stack_len);
            }
        } else if (type === ConstraintType.CONSECUTIVE_G) {
            let consecutive_g_count: number = EPars.countConsecutive(sequence, EPars.RNABASE_GUANINE);
            isSatisfied = (consecutive_g_count < Number(value));

            if (render) {
                box.setContent(ConstraintType.CONSECUTIVE_G, value, isSatisfied, consecutive_g_count);
            }

            outInfo.max_allowed_guanine = Number(value);

        } else if (type === ConstraintType.CONSECUTIVE_C) {
            let consecutive_c_count: number = EPars.countConsecutive(sequence, EPars.RNABASE_CYTOSINE);
            isSatisfied = (consecutive_c_count < Number(value));

            if (render) {
                box.setContent(ConstraintType.CONSECUTIVE_C, value, isSatisfied, consecutive_c_count);
            }

            outInfo.max_allowed_cytosine = Number(value);

        } else if (type === ConstraintType.CONSECUTIVE_A) {
            let consecutive_a_count: number = EPars.countConsecutive(sequence, EPars.RNABASE_ADENINE);
            isSatisfied = (consecutive_a_count < Number(value));

            if (render) {
                box.setContent(ConstraintType.CONSECUTIVE_A, value, isSatisfied, consecutive_a_count);
            }

            outInfo.max_allowed_adenine = Number(value);

        } else if (type === ConstraintType.LAB_REQUIREMENTS) {
            let locks: boolean[] = undoBlock.puzzleLocks;
            let consecutive_g_count: number = EPars.countConsecutive(sequence, EPars.RNABASE_GUANINE, locks);
            let consecutive_c_count: number = EPars.countConsecutive(sequence, EPars.RNABASE_CYTOSINE, locks);
            let consecutive_a_count: number = EPars.countConsecutive(sequence, EPars.RNABASE_ADENINE, locks);
            outInfo.max_allowed_guanine = 4;
            outInfo.max_allowed_cytosine = 4;
            outInfo.max_allowed_adenine = 5;
            isSatisfied = (consecutive_g_count < outInfo.max_allowed_guanine);
            isSatisfied = isSatisfied && (consecutive_c_count < outInfo.max_allowed_cytosine);
            isSatisfied = isSatisfied && (consecutive_a_count < outInfo.max_allowed_adenine);

            if (render) {
                box.setContent(ConstraintType.LAB_REQUIREMENTS, {
                    "g_count": consecutive_g_count, "g_max": outInfo.max_allowed_guanine,
                    "c_count": consecutive_c_count, "c_max": outInfo.max_allowed_cytosine,
                    "a_count": consecutive_a_count, "a_max": outInfo.max_allowed_adenine
                }, isSatisfied, 0);
            }

        } else if (type === ConstraintType.BARCODE) {
            isSatisfied = !SolutionManager.instance.checkRedundancyByHairpin(EPars.sequenceToString(sequence));
            if (render) {
                box.setContent(ConstraintType.BARCODE, 0, isSatisfied, 0);
            }

        } else if (type === ConstraintType.OLIGO_BOUND) {
            let target_index = Number(value);
            let nnfe: number[] = this.getCurrentUndoBlock(target_index).getParam(UndoBlockParam.NNFE_ARRAY, EPars.DEFAULT_TEMPERATURE);
            isSatisfied = (nnfe != null && nnfe[0] === -2);

            if (this._targetConditions == null) {
                throw new Error("Target object not available for BINDINGS constraint");
            }

            if (this._targetConditions[target_index] == null) {
                throw new Error("Target condition not available for BINDINGS constraint");
            }

            let o_names: string[] = [];
            let o_name: string = this._targetConditions[target_index]['oligo_name'];

            // TSC: not sure what this value should be. It's not guaranteed to be initialized in the original Flash code
            let jj = 0;
            if (o_name == null) o_name = "Oligo " + (jj + 1).toString();
            o_names.push(o_name);

            let bind: boolean[] = [];
            bind.push(true);

            let label: string[] = [];
            let lbl: string = this._targetConditions[target_index]['oligo_label'];
            if (lbl == null) lbl = String.fromCharCode(65 + jj);
            label.push(lbl);

            if (render) {
                box.setContent(ConstraintType.BINDINGS, {
                    index: target_index,
                    bind: bind,
                    label: label,
                    oligo_name: o_names
                }, isSatisfied, 0);
            }

        } else if (type === ConstraintType.OLIGO_UNBOUND) {
            let target_index = Number(value);
            let nnfe: number[] = this.getCurrentUndoBlock(target_index).getParam(UndoBlockParam.NNFE_ARRAY, EPars.DEFAULT_TEMPERATURE);
            isSatisfied = (nnfe == null || nnfe[0] !== -2);

            if (this._targetConditions == null) {
                throw new Error("Target object not available for BINDINGS constraint");
            }

            if (this._targetConditions[target_index] == null) {
                throw new Error("Target condition not available for BINDINGS constraint");
            }

            // TSC: not sure what this value should be. It's not guaranteed to be initialized in the original Flash code
            let jj = 0;

            let o_names: string[] = [];
            let o_name: string = this._targetConditions[target_index]['oligo_name'];
            if (o_name == null) o_name = "Oligo " + (jj + 1).toString();
            o_names.push(o_name);

            let bind: boolean[] = [];
            bind.push(false);

            let label: string[] = [];
            let lbl: string = this._targetConditions[target_index]['oligo_label'];
            if (lbl == null) lbl = String.fromCharCode(65 + jj);
            label.push(lbl);

            if (render) {
                box.setContent(ConstraintType.BINDINGS, {
                    index: target_index,
                    bind: bind,
                    label: label,
                    oligo_name: o_names
                }, isSatisfied, 0);
            }

        } else if (type === ConstraintType.SCRIPT) {
            isSatisfied = false;

            const scriptID = value;
            const scriptCompleted = ExternalInterface.runScriptMaybeSynchronously(scriptID,
                { params: { puzzleInfo: this._puzzle.toJSON() } },
                scriptResult => {
                    let goal = "";
                    let name = "...";
                    let resultValue = "";
                    let index = null;
                    let dataPNG = "";
                    if (scriptResult && scriptResult.cause) {
                        if (scriptResult.cause.satisfied) isSatisfied = scriptResult.cause.satisfied;
                        if (scriptResult.cause.goal != null) goal = scriptResult.cause.goal;
                        if (scriptResult.cause.name != null) name = scriptResult.cause.name;
                        if (scriptResult.cause.value != null) resultValue = scriptResult.cause.value;
                        if (scriptResult.cause.index != null) {
                            index = (scriptResult.cause.index + 1).toString();
                            let ll: number = this._isPipMode ?
                                scriptResult.cause.index :
                                (scriptResult.cause.index === this._curTargetIndex ? 0 : -1);
                            if (ll >= 0) {
                                if (scriptResult.cause.highlight != null) {
                                    this._poses[ll].highlightUserDefinedSequence(scriptResult.cause.highlight);
                                } else {
                                    this._poses[ll].clearUserDefinedHighlight();
                                }
                            }
                        }

                        if (scriptResult.cause.icon_b64) {
                            dataPNG = scriptResult.cause.icon_b64;
                        }
                    }

                    if (render) {
                        box.setContent(ConstraintType.SCRIPT, {
                            "nid": scriptID,
                            "goal": goal,
                            "name": name,
                            "value": resultValue,
                            "index": index,
                            "data_png": dataPNG
                        }, isSatisfied, 0);
                    }
                }
            );

            if (!scriptCompleted) {
                log.warn(`Constraint script wasn't able to run synchronously [scriptID=${scriptID}]`);
                isSatisfied = false;
                isPending = true;
            }
        }

        if (isPending) {
            return ConstraintStatus.PENDING;
        } else if (isSatisfied) {
            return ConstraintStatus.SATISFIED;
        } else {
            return ConstraintStatus.UNSATISFIED;
        }
    }

    private checkConstraints(render: boolean = true): boolean {
        const constraints: string[] = this._puzzle.curConstraints;
        if (constraints == null || constraints.length === 0) {
            return false;
        }

        let constraintsInfo: ConstraintInfo = {
            wrong_pairs: null,
            restricted_local: null,
            max_allowed_adenine: -1,
            max_allowed_cytosine: -1,
            max_allowed_guanine: -1,
        };

        let allAreSatisfied = true;
        let allWereSatisfied = true;
        let hasPendingConstraints = false;

        let playConstraintSatisfiedSFX = false;
        let playConstraintUnsatisfiedSFX = false;

        for (let ii = 0; ii < constraints.length; ii += 2) {
            const type: ConstraintType = constraints[ii] as ConstraintType;
            const value = constraints[ii + 1];
            const box: ConstraintBox = this._constraintBoxes[ii / 2];

            const wasSatisfied: boolean = box.isSatisfied;
            const status = this.updateConstraint(type, value, ii, box, render, constraintsInfo);

            allAreSatisfied = allAreSatisfied && status === ConstraintStatus.SATISFIED;
            allWereSatisfied = allWereSatisfied && wasSatisfied;
            hasPendingConstraints = hasPendingConstraints || status === ConstraintStatus.PENDING;

            if (type === ConstraintType.SHAPE || type === ConstraintType.ANTISHAPE) {
                const target_index = Number(value);
                if (!this._isPipMode) {
                    box.display.alpha = (target_index === this._curTargetIndex) ? 1.0 : 0.3;
                } else {
                    box.display.alpha = 1.0;
                }

                if (this._isPipMode && target_index > 0) {
                    box.display.visible = false;
                } else if (this._puzState === PuzzleState.GAME || this._puzState === PuzzleState.CLEARED) {
                    box.display.visible = true;
                }
            }

            if (render) {
                if (status === ConstraintStatus.SATISFIED && !wasSatisfied) {
                    playConstraintSatisfiedSFX = true;
                    box.flare(true);
                } else if (status === ConstraintStatus.UNSATISFIED && wasSatisfied) {
                    playConstraintUnsatisfiedSFX = true;
                    box.flare(false);
                }
            }
        }

        let unstable: number[] = [];
        if (constraintsInfo.wrong_pairs) {
            let curr: number = 0;
            let jj: number;
            for (jj = 0; jj < constraintsInfo.wrong_pairs.length; jj++) {
                let stat: number = (constraintsInfo.wrong_pairs[jj] === 1 ? 1 : 0);
                if ((curr ^ stat) !== 0) {
                    unstable.push(jj - curr);
                    curr = stat;
                }
            }
            if ((unstable.length % 2) === 1) {
                unstable.push(jj - 1);
            }
        }

        const undo_block: UndoBlock = this.getCurrentUndoBlock();
        const sequence: number[] = undo_block.sequence;
        const locks: boolean[] = undo_block.puzzleLocks;

        const restricted_guanine = EPars.getRestrictedConsecutive(sequence, EPars.RNABASE_GUANINE, constraintsInfo.max_allowed_guanine - 1, locks);
        const restricted_cytosine = EPars.getRestrictedConsecutive(sequence, EPars.RNABASE_CYTOSINE, constraintsInfo.max_allowed_cytosine - 1, locks);
        const restricted_adenine = EPars.getRestrictedConsecutive(sequence, EPars.RNABASE_ADENINE, constraintsInfo.max_allowed_adenine - 1, locks);

        const restricted_global: number[] = restricted_guanine.concat(restricted_cytosine).concat(restricted_adenine);

        for (let ii = 0; ii < this._poses.length; ii++) {
            let jj = this._isPipMode ? ii : (ii === 0 ? this._curTargetIndex : ii);
            let restricted: number[];
            if (constraintsInfo.restricted_local && constraintsInfo.restricted_local[jj]) {
                restricted = restricted_global.concat(constraintsInfo.restricted_local[jj]);
            } else {
                restricted = restricted_global;
            }
            this._poses[ii].highlightRestrictedSequence(restricted);
            this._poses[ii].highlightUnstableSequence(unstable);
        }

        if (allAreSatisfied && !allWereSatisfied && !hasPendingConstraints) {
            if (this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL) {
                Eterna.sound.playSound(Sounds.SoundAllConditions);
            } else if (this._puzState !== PuzzleState.GAME) {
                Eterna.sound.playSound(Sounds.SoundCondition);
            }
        } else if (playConstraintSatisfiedSFX) {
            Eterna.sound.playSound(Sounds.SoundCondition);
        } else if (playConstraintUnsatisfiedSFX) {
            Eterna.sound.playSound(Sounds.SoundDecondition);
        }

        return allAreSatisfied;
    }

    private updateScore(): void {
        this.saveData();
        // let dn: GameObject = (<GameObject>Application.instance.get_application_gui("Design Name"));
        // if (dn != null) dn.visible = (this._stack_level === 0);

        let undo_block: UndoBlock = this.getCurrentUndoBlock();
        let sequence: number[] = undo_block.sequence;
        let best_pairs: number[] = undo_block.getPairs(EPars.DEFAULT_TEMPERATURE);
        let nnfe: number[];

        if (!this._paused) {
            for (let ii = 0; ii < this._poses.length; ii++) {
                if (ii === 0 && this._poseState === PoseState.NATIVE && !this._isPipMode) {
                    this._poses[0].setOligos(this.getCurrentUndoBlock().targetOligos,
                        this.getCurrentUndoBlock().oligoOrder,
                        this.getCurrentUndoBlock().oligosPaired);
                    this._poses[0].setOligo(this.getCurrentUndoBlock().targetOligo,
                        this.getCurrentUndoBlock().oligoMode,
                        this.getCurrentUndoBlock().oligoName);
                    this._poses[0].pairs = this.getCurrentUndoBlock().getPairs();
                    if (this._targetConditions != null && this._targetConditions[this._curTargetIndex] != null) {
                        this._poses[0].structConstraints = this._targetConditions[this._curTargetIndex]['structure_constraints'];
                    }
                    continue;
                }
                this._poses[ii].setOligos(this.getCurrentUndoBlock(ii).targetOligos,
                    this.getCurrentUndoBlock(ii).oligoOrder,
                    this.getCurrentUndoBlock(ii).oligosPaired);
                this._poses[ii].setOligo(this.getCurrentUndoBlock(ii).targetOligo,
                    this.getCurrentUndoBlock(ii).oligoMode,
                    this.getCurrentUndoBlock(ii).oligoName);
                this._poses[ii].pairs = this.getCurrentUndoBlock(ii).getPairs();
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
                        this._poses[0].structConstraints = this._targetConditions[this._curTargetIndex]['structure_constraints'];
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
                this._poses[ii].setMolecularBinding(this._targetConditions[jj]['site'], this._targetConditions[jj]['binding_pairs'], this._targetConditions[jj]['bonus'] / 100.0);
            } else {
                this._poses[ii].setMolecularBinding(null, null, 0);
            }
            if (Puzzle.isOligoType(this._targetConditions[jj]['type'])) {
                this._poses[ii].oligoMalus = this._targetConditions[jj]["malus"];
                nnfe = this.getCurrentUndoBlock(jj).getParam(UndoBlockParam.NNFE_ARRAY, EPars.DEFAULT_TEMPERATURE);
                if (nnfe != null && nnfe[0] === -2) {
                    this._poses[ii].oligoPaired = true;
                    this._poses[ii].duplexCost = nnfe[1] * 0.01;
                } else {
                    this._poses[ii].oligoPaired = false;
                }
            }
            if (this._targetConditions[jj]['type'] === "multistrand") {
                nnfe = this.getCurrentUndoBlock(jj).getParam(UndoBlockParam.NNFE_ARRAY, EPars.DEFAULT_TEMPERATURE);
                if (nnfe != null && nnfe[0] === -2) {
                    this._poses[ii].duplexCost = nnfe[1] * 0.01;
                }
            }
        }

        let num_AU: number = undo_block.getParam(UndoBlockParam.AU);
        let num_GU: number = undo_block.getParam(UndoBlockParam.GU);
        let num_GC: number = undo_block.getParam(UndoBlockParam.GC);
        this._toolbar.palette.setPairCounts(num_AU, num_GU, num_GC);

        if (!this._isFrozen) {
            if (this._toolbar.undoButton.display.visible) {
                this._toolbar.undoButton.enabled = !(this._stackLevel < 1);
            }
            if (this._toolbar.redoButton.display.visible) {
                this._toolbar.redoButton.enabled = !(this._stackLevel + 1 > this._stackSize - 1);
            }
        }

        let was_satisfied: boolean = true;
        for (let ii = 0; ii < this._puzzle.constraints.length; ii += 2) {
            was_satisfied = was_satisfied && this._constraintBoxes[ii / 2].isSatisfied;
        }

        let constraints_satisfied: boolean = this.checkConstraints();
        for (let ii = 0; ii < this._poses.length; ii++) {
            this.getCurrentUndoBlock(ii).stable = constraints_satisfied;
        }

        /// Update spec thumbnail if it is open
        this.updateDockedSpecBox();

        let isThereTempConstraints: boolean = (this._puzzle.temporaryConstraints != null);

        if (constraints_satisfied && !isThereTempConstraints) {
            if (this._puzzle.puzzleType !== PuzzleType.EXPERIMENTAL && this._puzState === PuzzleState.GAME) {
                this.submitCurrentPose();
            }
        }
    }

    private flashConstraintForTarget(target_index: number): void {
        let box: ConstraintBox = null;
        if (target_index === 0 || !this._isPipMode) {
            let constraints: string[] = this._puzzle.constraints;
            for (let ii: number = 0; ii < constraints.length; ii += 2) {
                if (constraints[ii] === ConstraintType.SHAPE && Number(constraints[ii + 1]) === target_index) {
                    box = this._constraintBoxes[ii / 2];
                    break;
                }
            }
        } else {
            box = this._constraintShapeBoxes[target_index];
        }

        if (box != null) {
            box.flash(0x00FFFF);
        }
    }

    private poseEditByTarget(target_index: number): void {
        this.savePosesMarkersContexts();

        let xx: number = this._isPipMode ? target_index : this._curTargetIndex;
        let segments: number[] = this._poses[target_index].designSegments;
        let idx_map: number[] = this._poses[target_index].getOrderMap(this._targetOligosOrder[xx]);
        let structure_constraints: boolean[] = null;

        if (idx_map != null) {
            for (let jj = 0; jj < segments.length; jj++) {
                segments[jj] = idx_map.indexOf(segments[jj]);
            }
        }
        // we want 2 blocks (2x2) && same length && separated by at least 3 bases
        if (segments.length === 4
            && segments[1] - segments[0] === segments[3] - segments[2]
            && (segments[2] - segments[1] > 3
                || EPars.hasCut(this._poses[target_index].fullSequence, segments[1], segments[2]))) {
            /*
			- get design_segments
			- if (2 groups) and (all paired/unpaired in _target_pairs) and (all as dontcare)
				set _target_pairs
				clear design
			*/
            if (this._targetConditions[xx] != null) {
                structure_constraints = this._targetConditions[xx]['structure_constraints'];
            }

            if (structure_constraints != null) {
                let num_unpaired: number = 0;
                let num_wrong: number = 0;
                let dontcare_ok: boolean = true;
                for (let jj = segments[0]; jj <= segments[1] && dontcare_ok; jj++) {
                    if (structure_constraints[jj]) {
                        dontcare_ok = false;
                        continue;
                    }
                    if (this._targetPairs[xx][jj] < 0) {
                        num_unpaired++;
                    } else if (this._targetPairs[xx][jj] < segments[2] || this._targetPairs[xx][jj] > segments[3]) {
                        num_wrong++;
                    }
                }
                for (let jj = segments[2]; jj <= segments[3] && dontcare_ok; jj++) {
                    if (structure_constraints[jj]) {
                        dontcare_ok = false;
                        continue;
                    }
                    if (this._targetPairs[xx][jj] < 0) {
                        num_unpaired++;
                    } else if (this._targetPairs[xx][jj] < segments[0] || this._targetPairs[xx][jj] > segments[1]) {
                        num_wrong++;
                    }
                }
                if (dontcare_ok && num_wrong === 0) {
                    if (num_unpaired === 0) {
                        for (let jj = segments[0]; jj <= segments[1]; jj++) {
                            this._targetPairs[xx][jj] = -1;
                        }
                        for (let jj = segments[2]; jj <= segments[3]; jj++) {
                            this._targetPairs[xx][jj] = -1;
                        }
                        Eterna.sound.playSound(Sounds.SoundRY);
                        this.flashConstraintForTarget(xx);
                        this._poses[target_index].clearDesignStruct();
                    } else if (num_unpaired === segments[1] - segments[0] + segments[3] - segments[2] + 2) {
                        // breaking pairs is safe, but adding them may not always be
                        if (EPars.validateParenthesis(EPars.pairsToParenthesis(this._targetPairs[xx]).slice(segments[1] + 1, segments[2]), false) == null) {
                            for (let jj = segments[0]; jj <= segments[1]; jj++) this._targetPairs[xx][jj] = segments[3] - (jj - segments[0]);
                            for (let jj = segments[2]; jj <= segments[3]; jj++) this._targetPairs[xx][jj] = segments[1] - (jj - segments[2]);
                            Eterna.sound.playSound(Sounds.SoundGB);
                            this.flashConstraintForTarget(xx);
                            this._poses[target_index].clearDesignStruct();
                            // if the above fails, and we have multi-oligos, there may be a permutation where it works
                        } else if (this._targetOligos[xx] != null && this._targetOligos[xx].length > 1) {
                            let new_order: number[] = [];
                            for (let jj = 0; jj < this._targetOligos[xx].length; jj++) new_order.push(jj);
                            let more: boolean;
                            do {
                                segments = this._poses[target_index].designSegments;
                                let new_map: number[] = this._poses[target_index].getOrderMap(new_order);
                                let new_pairs: number[] = [];
                                if (new_map != null) {
                                    for (let jj = 0; jj < segments.length; jj++) {
                                        segments[jj] = new_map.indexOf(segments[jj]);
                                    }
                                    for (let jj = 0; jj < this._targetPairs[xx].length; jj++) {
                                        let kk: number = idx_map.indexOf(new_map[jj]);
                                        let pp: number = this._targetPairs[xx][kk];
                                        new_pairs[jj] = pp < 0 ? pp : new_map.indexOf(idx_map[pp]);
                                    }
                                }
                                if (EPars.validateParenthesis(EPars.pairsToParenthesis(new_pairs).slice(segments[1] + 1, segments[2]), false) == null) {
                                    // compatible permutation
                                    this._targetPairs[xx] = new_pairs;
                                    this._targetOligosOrder[xx] = new_order;
                                    for (let jj = segments[0]; jj <= segments[1]; jj++) {
                                        this._targetPairs[xx][jj] = segments[3] - (jj - segments[0]);
                                    }
                                    for (let jj = segments[2]; jj <= segments[3]; jj++) {
                                        this._targetPairs[xx][jj] = segments[1] - (jj - segments[2]);
                                    }
                                    Eterna.sound.playSound(Sounds.SoundGB);
                                    this.flashConstraintForTarget(xx);
                                    this._poses[target_index].clearDesignStruct();
                                    more = false;
                                } else {
                                    more = FoldUtil.nextPerm(new_order);
                                }
                            } while (more);
                        }
                    }
                }
            }
        }

        let last_shifted_index: number = this._poses[target_index].lastShiftedIndex;
        let last_shifted_command: number = this._poses[target_index].lastShiftedCommand;
        for (let ii: number = 0; ii < this._poses.length; ii++) {
            if (last_shifted_index > 0 && last_shifted_command >= 0) {
                if (ii !== target_index) {
                    this._poses[ii].baseShiftWithCommand(last_shifted_command, last_shifted_index);
                }

                let results: any = this._poses[ii].parseCommandWithPairs(last_shifted_command, last_shifted_index, this._targetPairs[ii]);
                if (results != null) {
                    let parenthesis: string = results[0];
                    let mode: number = results[1];
                    this._targetPairs[ii] = EPars.parenthesisToPairs(parenthesis);
                }

                let anti_structure_constraints: any[] = this._targetConditions[ii]['anti_structure_constraints'];
                if (anti_structure_constraints != null) {
                    if (last_shifted_command === EPars.RNABASE_ADD_BASE) {
                        let anti_structure_constraint: boolean = anti_structure_constraints[last_shifted_index];
                        anti_structure_constraints.splice(last_shifted_index, 0, anti_structure_constraint);
                    } else if (last_shifted_command === EPars.RNABASE_DELETE) {
                        anti_structure_constraints.splice(last_shifted_index, 1);
                    }
                }

                structure_constraints = this._targetConditions[ii]['structure_constraints'];
                if (structure_constraints != null) {
                    let constraint_val: boolean = structure_constraints[last_shifted_index];
                    let new_constraints: any[];

                    if (last_shifted_command === EPars.RNABASE_ADD_BASE) {
                        new_constraints = structure_constraints.slice(0, last_shifted_index);
                        new_constraints.push(constraint_val);
                        new_constraints = new_constraints.concat(structure_constraints.slice(last_shifted_index, structure_constraints.length));
                    } else {
                        new_constraints = structure_constraints.slice(0, last_shifted_index);
                        new_constraints = new_constraints.concat(structure_constraints.slice(last_shifted_index + 1, structure_constraints.length));
                    }
                    this._targetConditions[ii]['structure_constraints'] = new_constraints;
                }

                let anti_secstruct: string = this._targetConditions[ii]['anti_secstruct'];
                if (anti_secstruct != null) {
                    let anti_pairs: number[] = EPars.parenthesisToPairs(anti_secstruct);
                    let antiResult: any[] = this._poses[ii].parseCommandWithPairs(last_shifted_command, last_shifted_index, anti_pairs);
                    this._targetConditions[ii]['anti_secstruct'] = antiResult[0];
                }

                if (this._targetConditions[ii]['type'] === "aptamer") {
                    let binding_site: number[] = this._targetConditions[ii]['site'].slice(0);
                    let binding_pairs: number[] = [];
                    if (last_shifted_command === EPars.RNABASE_ADD_BASE) {
                        for (let ss: number = 0; ss < binding_site.length; ss++) {
                            if (binding_site[ss] >= last_shifted_index) {
                                binding_site[ss]++;
                            }
                        }

                        for (let jj = 0; jj < binding_site.length; jj++) {
                            binding_pairs.push(this._targetPairs[ii][binding_site[jj]]);
                        }
                    } else {
                        for (let ss = 0; ss < binding_site.length; ss++) {
                            if (binding_site[ss] >= last_shifted_index) {
                                binding_site[ss]--;
                            }
                        }

                        for (let jj = 0; jj < binding_site.length; jj++) {
                            binding_pairs.push(this._targetPairs[ii][binding_site[jj]]);
                        }
                    }

                    this._targetConditions[ii]['site'] = binding_site;
                    this._targetConditions[ii]['binding_pairs'] = binding_pairs;
                }
            }

            this._poses[ii].sequence = this._poses[target_index].sequence;
            this._poses[ii].puzzleLocks = this._poses[target_index].puzzleLocks;
        }

        this._foldTotalTime = 0;

        if (this._isFrozen) {
            return;
        }

        const LOCK_NAME = "ExecFold";

        let execfold_cb = (fd: any[]) => {
            this.hideAsyncText();
            this.popUILock(LOCK_NAME);

            if (fd != null) {
                this._stackLevel++;
                this._stackSize = this._stackLevel + 1;
                this._seqStacks[this._stackLevel] = [];

                for (let ii = 0; ii < this._poses.length; ii++) {
                    let undo_block: UndoBlock = new UndoBlock([]);
                    undo_block.fromJSON(fd[ii]);
                    this._seqStacks[this._stackLevel][ii] = undo_block;
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

            this.poseEditByTargetDoFold(target_index);
        };

        this.pushUILock(LOCK_NAME);
        let sol: Solution = SolutionManager.instance.getSolutionBySequence(this._poses[target_index].getSequenceString());
        if (sol != null && this._puzzle.hasTargetType("multistrand")) {
            this.showAsyncText("retrieving...");
            sol.queryFoldData().then((result) => execfold_cb(result));
        } else {
            execfold_cb(null);
        }
    }

    private poseEditByTargetDoFold(target_index: number): void {
        this._foldStartTime = new Date().getTime();

        this.showAsyncText("folding...");
        this.pushUILock(PoseEditMode.FOLDING_LOCK);

        if (this.forceSync) {
            for (let ii: number = 0; ii < this._targetPairs.length; ii++) {
                this.poseEditByTargetFoldTarget(ii);
            }
            this.poseEditByTargetEpilog(target_index);

        } else {
            for (let ii = 0; ii < this._targetPairs.length; ii++) {
                this._opQueue.push(new PoseOp(ii + 1, () => this.poseEditByTargetFoldTarget(ii)));
            }

            this._opQueue.push(new PoseOp(this._targetPairs.length + 1, () => this.poseEditByTargetEpilog(target_index)));

        }

        if (this._poseEditByTargetCb != null) {
            this._poseEditByTargetCb();
        }
    }

    private poseEditByTargetFoldTarget(ii: number): void {
        let best_pairs: number[];
        let oligo_order: number[] = null;
        let oligos_paired: number = 0;
        let force_struct: string = null;
        let fold_mode: number;
        let full_seq: number[];
        let malus: number;
        let bonus: number;
        let sites: number[];

        if (ii === 0) {
            /// Pushing undo block
            this._stackLevel++;
            this._seqStacks[this._stackLevel] = [];
        }
        // a "trick" used by the 'multifold' branch below, in order to
        // re-queue itself without triggering the stack push coded above
        ii = ii % this._targetPairs.length;

        let seq: number[] = this._poses[ii].sequence;

        if (this._targetConditions[ii]) force_struct = this._targetConditions[ii]['force_struct'];

        if (this._targetConditions[ii] == null || this._targetConditions[ii]['type'] === "single") {
            best_pairs = this._folder.foldSequence(this._puzzle.transformSequence(seq, ii), null, force_struct);

        } else if (this._targetConditions[ii]['type'] === "aptamer") {
            bonus = this._targetConditions[ii]['bonus'];
            sites = this._targetConditions[ii]['site'];
            best_pairs = this._folder.foldSequenceWithBindingSite(this._puzzle.transformSequence(seq, ii), this._targetPairs[ii], sites, Number(bonus), this._targetConditions[ii]['fold_version']);

        } else if (this._targetConditions[ii]['type'] === "oligo") {
            fold_mode = this._targetConditions[ii]["fold_mode"] == null ?
                Pose2D.OLIGO_MODE_DIMER :
                Number(this._targetConditions[ii]["fold_mode"]);
            if (fold_mode === Pose2D.OLIGO_MODE_DIMER) {
                log.debug("cofold");
                full_seq = seq.concat(EPars.stringToSequence("&" + this._targetConditions[ii]['oligo_sequence']));
                malus = int(this._targetConditions[ii]["malus"] * 100);
                best_pairs = this._folder.cofoldSequence(full_seq, null, malus, force_struct);
            } else if (fold_mode === Pose2D.OLIGO_MODE_EXT5P) {
                full_seq = EPars.stringToSequence(this._targetConditions[ii]['oligo_sequence']).concat(seq);
                best_pairs = this._folder.foldSequence(full_seq, null, force_struct);
            } else {
                full_seq = seq.concat(EPars.stringToSequence(this._targetConditions[ii]['oligo_sequence']));
                best_pairs = this._folder.foldSequence(full_seq, null, force_struct);
            }

        } else if (this._targetConditions[ii]['type'] === "aptamer+oligo") {
            bonus = this._targetConditions[ii]['bonus'];
            sites = this._targetConditions[ii]['site'];
            fold_mode = this._targetConditions[ii]["fold_mode"] == null ?
                Pose2D.OLIGO_MODE_DIMER :
                Number(this._targetConditions[ii]["fold_mode"]);
            if (fold_mode === Pose2D.OLIGO_MODE_DIMER) {
                log.debug("cofold");
                full_seq = seq.concat(EPars.stringToSequence("&" + this._targetConditions[ii]['oligo_sequence']));
                malus = int(this._targetConditions[ii]["malus"] * 100);
                best_pairs = this._folder.cofoldSequenceWithBindingSite(full_seq, sites, bonus, force_struct, malus);
            } else if (fold_mode === Pose2D.OLIGO_MODE_EXT5P) {
                full_seq = EPars.stringToSequence(this._targetConditions[ii]['oligo_sequence']).concat(seq);
                best_pairs = this._folder.foldSequenceWithBindingSite(full_seq, this._targetPairs[ii], sites, Number(bonus), this._targetConditions[ii]['fold_version']);
            } else {
                full_seq = seq.concat(EPars.stringToSequence(this._targetConditions[ii]['oligo_sequence']));
                best_pairs = this._folder.foldSequenceWithBindingSite(full_seq, this._targetPairs[ii], sites, Number(bonus), this._targetConditions[ii]['fold_version']);
            }

        } else if (this._targetConditions[ii]['type'] === "multistrand") {
            let oligos: any[] = [];
            for (let jj: number = 0; jj < this._targetConditions[ii]['oligos'].length; jj++) {
                oligos.push({
                    seq: EPars.stringToSequence(this._targetConditions[ii]['oligos'][jj]['sequence']),
                    malus: int(this._targetConditions[ii]['oligos'][jj]["malus"] * 100.0)
                });
            }
            log.debug("multifold");

            let key: any = {
                primitive: "multifold",
                seq: this._puzzle.transformSequence(seq, ii),
                second_best_pairs: null,
                oligos: oligos,
                desired_pairs: null,
                temp: 37
            };
            let mfold: any = this._folder.getCache(key);

            if (mfold == null && !this.forceSync) {
                // multistrand folding can be really slow
                // break it down to each permutation
                let ops: PoseOp[] = this._folder.multifoldUnroll(this._puzzle.transformSequence(seq, ii), null, oligos);
                this._opQueue.unshift(new PoseOp(
                    ii + 1,
                    () => this.poseEditByTargetFoldTarget(ii + this._targetPairs.length)));
                while (ops.length > 0) {
                    let o: PoseOp = ops.pop();
                    o.sn = ii + 1;
                    this._opQueue.unshift(o);
                }
                return;

            } else {
                let best: any = this._folder.multifold(this._puzzle.transformSequence(seq, ii), null, oligos);
                best_pairs = best.pairs.slice();
                oligo_order = best.order.slice();
                oligos_paired = best.count;
            }
        }

        let undo_block: UndoBlock = new UndoBlock(this._puzzle.transformSequence(seq, ii));
        undo_block.setPairs(best_pairs);
        undo_block.targetOligos = this._targetOligos[ii];
        undo_block.targetOligo = this._targetOligo[ii];
        undo_block.oligoOrder = oligo_order;
        undo_block.oligosPaired = oligos_paired;
        undo_block.targetPairs = this._targetPairs[ii];
        undo_block.targetOligoOrder = this._targetOligosOrder[ii];
        undo_block.puzzleLocks = this._poses[ii].puzzleLocks;
        undo_block.targetConditions = this._targetConditions[ii];
        undo_block.setBasics(this._folder);
        this._seqStacks[this._stackLevel][ii] = undo_block;
    }

    private poseEditByTargetEpilog(target_index: number): void {
        this.hideAsyncText();
        this.popUILock(PoseEditMode.FOLDING_LOCK);

        // this._fold_total_time = new Date().getTime() - this._fold_start_time;
        // if (!this._tools_container.contains(this._freeze_button) && this._fold_total_time >= 1000.0) { // FIXME: a bit arbitrary...
        //     this._tools_container.addObject(this._freeze_button);
        //     this.layout_bars();
        // }

        this._stackSize = this._stackLevel + 1;
        this.updateScore();
        this.transformPosesMarkers();

        /// JEEFIX

        let last_best_pairs: number[] = null;
        let best_pairs: number[] = last_best_pairs = this._seqStacks[this._stackLevel][target_index].getPairs();
        if (this._stackLevel > 0) {
            last_best_pairs = this._seqStacks[this._stackLevel - 1][target_index].getPairs();
        }

        if (last_best_pairs != null) {
            let is_shape_constrained: boolean = false;
            let constraints: string[] = this._puzzle.constraints;

            if (this._puzzle.temporaryConstraints != null) {
                constraints = this._puzzle.temporaryConstraints;
            }

            if (constraints != null) {
                for (let ii = 0; ii < constraints.length; ii += 2) {
                    if (constraints[ii] === ConstraintType.SHAPE) {
                        is_shape_constrained = true;
                    }
                }
            }

            let pairs_diff: number[] = [];

            for (let ii = 0; ii < best_pairs.length; ii++) {
                if (last_best_pairs[ii] === best_pairs[ii]) {
                    pairs_diff[ii] = 0;
                } else if (best_pairs[ii] < 0 && last_best_pairs[ii] >= 0) {
                    pairs_diff[ii] = -1;
                } else if (best_pairs[ii] > ii) {
                    if (last_best_pairs[ii] >= 0) {
                        pairs_diff[ii] = 1;
                    } else {
                        pairs_diff[ii] = 2;
                    }
                } else {
                    pairs_diff[ii] = 0;
                }
            }

            if (!this._poses[target_index].useSimpleGraphics) {
                let stack_start: number = -1;
                let last_other_stack: number = -1;
                for (let ii = 0; ii < best_pairs.length; ii++) {
                    if (pairs_diff[ii] > 0 && ((!is_shape_constrained && this._poseState === PoseState.NATIVE) || (best_pairs[ii] === this._targetPairs[target_index][ii]))) {
                        if (stack_start < 0) {
                            stack_start = ii;
                            last_other_stack = best_pairs[ii];
                        } else {
                            if (best_pairs[ii] !== last_other_stack - 1) {
                                this._poses[target_index].praiseStack(stack_start, ii - 1);
                                stack_start = ii;
                            }

                            last_other_stack = best_pairs[ii];
                        }
                    } else {
                        if (stack_start >= 0) {
                            this._poses[target_index].praiseStack(stack_start, ii - 1);
                            stack_start = -1;
                            last_other_stack = -1;
                        }

                    }
                }
            }
        }

        if (this._foldTotalTime >= 1000.0 && this._puzzle.hasTargetType("multistrand")) {
            let sol: Solution = SolutionManager.instance.getSolutionBySequence(this._poses[target_index].getSequenceString());
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

    protected getCurrentUndoBlock(target_index: number = -1): UndoBlock {
        if (target_index < 0) {
            return this._seqStacks[this._stackLevel][this._curTargetIndex];
        } else {
            return this._seqStacks[this._stackLevel][target_index];
        }
    }

    private setPosesWithUndoBlock(ii: number, undo_block: UndoBlock): void {
        this._poses[ii].sequence = this._puzzle.transformSequence(undo_block.sequence, ii);
        this._poses[ii].puzzleLocks = undo_block.puzzleLocks;
    }

    private moveUndoStack(): void {
        for (let ii: number = 0; ii < this._poses.length; ii++) {
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

        let stack_level: number = this._stackLevel;
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
        this._stackLevel = stack_level;
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

    /**
     * When a structure constraint box is clicked, we hilite the bases that are misfolding.
     * The _unstableShapeConstraintIdx indicates which constraint's misfolded bases should be hilited.
     */
    private onConstraintBoxClicked(idx: number): void {
        if (this._puzzle.curConstraints[idx] == ConstraintType.SHAPE || this._puzzle.curConstraints[idx] == ConstraintType.ANTISHAPE) {
            this._unstableShapeConstraintIdx = (this._unstableShapeConstraintIdx == idx ? -1 : idx);
            this.checkConstraints();
        }
    }

    private readonly _puzzle: Puzzle;
    private readonly _params: PoseEditParams;
    private readonly _scriptInterface = new ExternalInterfaceCtx();
    private readonly _autosaveData: any[];

    private _constraintsLayer: Container;

    private _background: Background;

    private _toolbar: PoseEditToolbar;

    protected  _folder: Folder;
    /// Asynch folding
    private _opQueue: PoseOp[] = [];
    private _poseEditByTargetCb: () => void = null;
    private _asynchText: Text;
    private _foldStartTime: number;
    private _foldTotalTime: number;
    /// Undo stack
    private _seqStacks: UndoBlock[][];
    private _stackLevel: number;
    private _stackSize: number;
    private _puzState: PuzzleState;
    private _paused: boolean;
    private _startSolvingTime: number;
    private _startingPoint: string;
    private _moveCount: number = 0;
    private _moves: any[] = [];
    private _curTargetIndex: number = 0;
    private _poseState: PoseState = PoseState.NATIVE;
    protected _targetPairs: number[][] = [];
    private _targetConditions: any[] = [];
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

    /// constraints && scoring display
    private _constraintBoxes: ConstraintBox[];
    private _constraintShapeBoxes: ConstraintBox[];
    private _constraintAntishapeBoxes: ConstraintBox[];
    private _unstableShapeConstraintIdx: number;
    private _constraintsOffset: number;

    private _dockedSpecBox: SpecBox;
    private _exitButton: GameButton;

    private _constraintsHead: number = 0;
    private _constraintsFoot: number = 0;
    private _constraintsTop: number = 0;
    private _constraintsBottom: number = 0;
    private _uiHighlight: SpriteObject;

    private _homeButton: URLButton;
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

    private static readonly FOLDING_LOCK = "Folding";
}

interface ConstraintInfo {
    wrong_pairs: number[];
    restricted_local: number[][];
    max_allowed_guanine: number;
    max_allowed_cytosine: number;
    max_allowed_adenine: number;
}

interface OligoDef {
    sequence: string;
    malus: number;
    name: string;
    bind?: boolean;
    concentration?: string;
    label?: string;
}

enum ConstraintStatus {
    SATISFIED = "satisfied", UNSATISFIED = "unsatisfied", PENDING = "pending"
}

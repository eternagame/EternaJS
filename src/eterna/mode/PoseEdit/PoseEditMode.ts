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
import {CopySequenceDialog} from "../../ui/CopySequenceDialog";
import {EternaViewOptionsDialog, EternaViewOptionsMode} from "../../ui/EternaViewOptionsDialog";
import {GameButton} from "../../ui/GameButton";
import {GamePanel} from "../../ui/GamePanel";
import {HTMLTextObject} from "../../ui/HTMLTextObject";
import {GetPaletteTargetBaseType, PaletteTargetType} from "../../ui/NucleotidePalette";
import {SpecBox} from "../../ui/SpecBox";
import {SpecBoxDialog} from "../../ui/SpecBoxDialog";
import {UndoBlock, UndoBlockParam} from "../../UndoBlock";
import {ExternalInterface} from "../../util/ExternalInterface";
import {Fonts} from "../../util/Fonts";
import {UDim} from "../../util/UDim";
import {Background} from "../../vfx/Background";
import {BubbleSweep} from "../../vfx/BubbleSweep";
import {GameMode} from "../GameMode";
import {MissionClearedPanel} from "./MissionClearedPanel";
import {MissionIntroMode} from "./MissionIntroMode";
import {PasteSequenceDialog} from "../../ui/PasteSequenceDialog";
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

export class PoseEditMode extends GameMode {
    public constructor(puz: Puzzle, initSeq?: number[], isReset?: boolean, initialFolder?: Folder) {
        super();
        this._puzzle = puz;
        this._initSeq = initSeq;
        this._isReset = isReset;
        this._initialFolder = initialFolder;
    }

    protected setup(): void {
        super.setup();

        this._background = new Background();
        this.addObject(this._background, this.bgLayer);

        this._toolbar = new PoseEditToolbar(this._puzzle);
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
            log.debug("TODO: viewSolutions");
            // Application.instance.transit_game_mode(Eterna.GAMESTATE_DESIGN_BROWSER, [this.puzzle.get_node_id()]);
        });
        this._toolbar.retryButton.clicked.connect(() => this.askRetry());
        this._toolbar.nativeButton.clicked.connect(() => this.togglePosestate());
        this._toolbar.targetButton.clicked.connect(() => this.togglePosestate());
        this._toolbar.specButton.clicked.connect(() => this.showSpec());
        this._toolbar.pasteButton.clicked.connect(() =>  this.showPasteSequenceDialog());
        this._toolbar.viewOptionsButton.clicked.connect(() => {
            let mode = this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL ?
                EternaViewOptionsMode.LAB :
                EternaViewOptionsMode.PUZZLE;
            this.showDialog(new EternaViewOptionsDialog(mode));
        });
        this._toolbar.screenshotButton.clicked.connect(() => this.postScreenshot(this.createScreenshot()));

        this._toolbar.copyButton.clicked.connect(() => {
            let sequenceString = EPars.sequence_array_to_string(this._poses[0].sequence);
            this.showDialog(new CopySequenceDialog(sequenceString));
        });

        this._toolbar.pipButton.clicked.connect(() => this.togglePip());

        this._toolbar.puzzleStateToggle.stateChanged.connect((targetIdx) => this.changeTarget(targetIdx));

        this._toolbar.freezeButton.clicked.connect(() => this.toggleFreeze());
        this._toolbar.palette.targetClicked.connect((targetType) => this.onPaletteTargetSelected(targetType));
        this._toolbar.pairSwapButton.clicked.connect(() => this.onSwapClicked());
        this._toolbar.hintButton.clicked.connect(() => this.onHintClicked());

        this.regs.add(Eterna.settings.autohideToolbar.connectNotify((value) => {
            this._toolbar.setToolbarAutohide(value);
        }));

        this._dockedSpecBox = new SpecBox(true);
        this._dockedSpecBox.display.position = new Point(15, 190);
        this._dockedSpecBox.set_size(155, 251);
        this._dockedSpecBox.display.visible = false;
        this.addObject(this._dockedSpecBox, this.uiLayer);

        this._xButton = new GameButton()
            .allStates(Bitmaps.ImgMaximize)
            .tooltip("Re-maximize")
            .hotkey(KeyCode.KeyM);
        this._xButton.clicked.connect(() => {
            this._dockedSpecBox.display.visible = false;
            this.showSpec();
        });
        this._dockedSpecBox.addObject(this._xButton, this._dockedSpecBox.container);

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

        this._targetName = Fonts.std_regular("", 18).build();
        this._targetName.visible = false;
        this.uiLayer.addChild(this._targetName);

        this._asynchText = Fonts.arial("folding...", 12).build();
        this._asynchText.position = new Point(16, 200);

        this.setPuzzle();

        this.updateLayout();
    }

    public onResized(): void {
        this.updateLayout();
        super.onResized();
    }

    private updateLayout(): void {
        DisplayUtil.positionRelativeToStage(
            this._toolbar.display, HAlign.CENTER, VAlign.BOTTOM,
            HAlign.CENTER, VAlign.BOTTOM, 20, -20);

        this._exitButton.display.position = new Point(Flashbang.stageWidth - 85, Flashbang.stageHeight - 60);
        this._xButton.display.position = new Point(Flashbang.stageWidth - 22, 5);

        this.layoutBars();
        this.layoutConstraints();

        this._dockedSpecBox.set_size(Flashbang.stageWidth, Flashbang.stageHeight - 340);
        let s: number = this._dockedSpecBox.getPlotSize();
        this._dockedSpecBox.set_size(s + 55, s * 2 + 51);
    }

    public get toolbar(): PoseEditToolbar {
        return this._toolbar;
    }

    public get constraintsLayer(): Container {
        return this._constraintsLayer;
    }

    protected showPasteSequenceDialog(): void {
        this.showDialog(new PasteSequenceDialog()).closed.then(sequence => {
            if (sequence != null) {
                for (let pose of this._poses) {
                    pose.pasteSequence(EPars.string_to_sequence_array(sequence));
                }
            }
        });
    }

    public set_next_design_cb(cb: () => void): void {
        this._next_design_cb = cb;
    }

    public set_prev_design_cb(cb: () => void): void {
        this._prev_design_cb = cb;
    }

    public setPuzzleState(newstate: PuzzleState): void {
        this._puzState = newstate;
    }

    public set_puzzle_default_mode(default_mode: PoseState): void {
        this._puzzle.defaultMode = default_mode;
    }

    public rop_change_target(target_index: number): void {
        this.changeTarget(target_index);
        if (this._toolbar.puzzleStateToggle != null) {
            this._toolbar.puzzleStateToggle.set_state(target_index);
        }
    }

    public ropSetToNativeMode(): void {
        this.setToNativeMode();
    }

    public rop_set_to_target_mode(): void {
        this.setToTargetMode();
    }

    public setDisplayScoreTexts(display: boolean): void {
        for (let pose of this._poses) {
            pose.displayScoreTexts = display;
        }
    }

    public ropSetDisplayScoreTexts(dis: boolean): void {
        let that: PoseEditMode = this;
        let pre = () => {
            that.setDisplayScoreTexts(dis);
        };
        this._ropPresets.push(pre);
    }

    public setShowNumbering(show: boolean): void {
        for (let pose of this._poses) {
            pose.showNumbering = show;
        }
    }

    public ropSetShowNumbering(show: boolean): void {
        let pre = () => {
            this.setShowNumbering(show);
        };
        this._ropPresets.push(pre);
    }

    public setShowTotalEnergy(show: boolean): void {
        for (let pose of this._poses) {
            pose.showTotalEnergy = show;
        }
    }

    public ropSetShowTotalEnergy(show: boolean): void {
        let that: PoseEditMode = this;
        let pre = () => {
            that.setShowTotalEnergy(show);
        };
        this._ropPresets.push(pre);
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

            let hintText = Fonts.arial(this._puzzle.hint, 14).color(0xffffff).wordWrap(true, 400).build();
            hintText.position = new Point(10, 38);
            hintBox.container.addChild(hintText);
            hintBox.setSize(420, hintText.height + 46);

            this._hintBoxRef = this.addObject(hintBox, this.uiLayer);

            let updatePosition = () => {
                hintBox.display.position = new Point(
                    Flashbang.stageWidth - 440,
                    Flashbang.stageHeight - hintBox.container.height - 90);
            };

            updatePosition();
            hintBox.regs.add(this.resized.connect(updatePosition));
        }
    }

    public public_start_countdown(): void {
        this.startCountdown();
    }

    public restart_from(seq: string): void {
        this.clearUndoStack();

        let restart_cb = (fd: any[]) => {
            // Application.instance.get_modal_container().removeObject(this._asynch_text);
            // Application.instance.remove_lock("FOLDING");
            // Application.instance.set_blocker_opacity(0.35);

            if (fd != null) {
                this._stackLevel++;
                this._stackSize = this._stackLevel + 1;
                this._seqStacks[this._stackLevel] = [];

                for (let ii = 0; ii < this._poses.length; ii++) {
                    let undo_block: UndoBlock = new UndoBlock([]);
                    undo_block.fromJson(fd[ii]);
                    this._seqStacks[this._stackLevel][ii] = undo_block;
                }

                this.savePosesMarkersContexts();
                this.moveUndoStack();
                this.updateScore();
                this.transformPosesMarkers();

            } else {
                let seq_arr: number[] = EPars.string_to_sequence_array(seq);
                for (let pose of this._poses) {
                    pose.pasteSequence(seq_arr);
                }
            }
            this.clearMoveTracking(seq);
        };

        let sol: Solution = SolutionManager.instance.getSolutionBySequence(seq);
        if (sol != null && this._puzzle.hasTargetType("multistrand")) {
            this._asynchText.text = "retrieving...";
            // Application.instance.set_blocker_opacity(0.2);
            // Application.instance.add_lock("FOLDING");
            // Application.instance.get_modal_container().addObject(this._asynch_text);

            sol.queryFoldData().then((result) => restart_cb(result));
        } else {
            restart_cb(null);
        }
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
            this._targetPairs.push(EPars.parenthesis_to_pair_array(target_secstructs[ii]));
            this._targetConditions.push(target_conditions[ii]);
            this._targetOligos.push(null);
            this._targetOligosOrder.push(null);
            this._targetOligo.push(null);
            this._oligoMode.push(null);
            this._oligoName.push(null);
            if (target_conditions[ii] && target_conditions[ii]['oligo_sequence']) {
                this._targetOligo[ii] = EPars.string_to_sequence_array(target_conditions[ii]['oligo_sequence']);
                this._oligoMode[ii] = target_conditions[ii]['fold_mode'] == null ? Pose2D.OLIGO_MODE_DIMER : target_conditions[ii]['fold_mode'];
                this._oligoName[ii] = target_conditions[ii]['oligo_name'];
            }
            if (target_conditions[ii] && target_conditions[ii]['oligos']) {
                let odefs: OligoDef[] = target_conditions[ii]['oligos'];
                let ndefs: Oligo[] = [];
                for (let jj: number = 0; jj < odefs.length; jj++) {
                    ndefs.push({
                        sequence: EPars.string_to_sequence_array(odefs[jj].sequence),
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

        let puzzleTitle = new HTMLTextObject(this._puzzle.getPuzzleName(true))
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

        this._constraintsLayer.visible = true;

        if (!this._puzzle.isPalleteAllowed) {
            for (let pose of this._poses) {
                pose.currentColor = -1;
            }
        } else {
            this._toolbar.palette.clickTarget(PaletteTargetType.A);
        }

        let num_constraints: number = 0;
        let constraints: string[] = [];
        if (this._puzzle.constraints != null) {
            num_constraints = this._puzzle.constraints.length;
            constraints = this._puzzle.constraints;
        }

        this._constraintBoxes = [];
        this._unstableIndex = -1;

        if (num_constraints > 0) {
            if (num_constraints % 2 !== 0) {
                throw new Error("Wrong constraints length");
            }

            for (let ii = 0; ii < num_constraints / 2; ii++) {
                let newbox: ConstraintBox = new ConstraintBox(ConstraintBoxType.DEFAULT);
                this._constraintBoxes.push(newbox);
                this.addObject(newbox, this._constraintsLayer);
            }

            this._constraintShapeBoxes = [];
            this._constraintShapeBoxes.push(null);

            this._constraintAntishapeBoxes = [];
            this._constraintAntishapeBoxes.push(null);
            if (this._targetPairs.length > 1) {
                for (let ii = 1; ii < this._targetPairs.length; ii++) {
                    this._constraintShapeBoxes[ii] = null;
                    this._constraintAntishapeBoxes[ii] = null;
                    for (let jj = 0; jj < num_constraints; jj += 2) {
                        if (constraints[jj] === ConstraintType.SHAPE) {
                            if (Number(constraints[jj + 1]) === ii) {
                                let newbox = new ConstraintBox(ConstraintBoxType.DEFAULT);
                                this._constraintShapeBoxes[ii] = newbox;
                                this.addObject(newbox, this._constraintsLayer);
                            }
                        } else if (constraints[jj] === ConstraintType.ANTISHAPE) {
                            if (Number(constraints[jj + 1]) === ii) {
                                let newbox = new ConstraintBox(ConstraintBoxType.DEFAULT);
                                this._constraintAntishapeBoxes[ii] = newbox;
                                this.addObject(newbox, this._constraintsLayer);
                            }
                        }
                    }
                }
            }
        }

        for (let box of this._constraintBoxes) {
            box.display.visible = false;
        }

        let pairs: number[] = EPars.parenthesis_to_pair_array(this._puzzle.getSecstruct());

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

        this.layoutBars();
        this.layoutConstraints();

        this._folder = this._initialFolder != null ?
            this._initialFolder :
            FolderManager.instance.getFolder(this._puzzle.folderName);

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

        for (let ii = 0; ii < this._poses.length; ii++) {
            let seq: number[] = this._initSeq;

            if (seq == null) {
                seq = this._puzzle.getBeginningSequence(ii);
                if (this._puzzle.puzzleType === PuzzleType.CHALLENGE && !this._isReset) {
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

        let autoloaded: boolean = false;

        if (!this._isReset) {
            this.loadSavedData();
            // re-register script APIs
            this._scriptHooks = false;
            this._setterHooks = false;
        }

        this._poseEditByTargetCb = () => {
            if (this._forceSynch) {
                this.setPuzzleEpilog(this._initSeq, this._isReset);
            } else {
                this._opQueue.push(new PoseOp(
                    this._targetPairs.length,
                    () => this.setPuzzleEpilog(this._initSeq, this._isReset)));
            }
            this._poseEditByTargetCb = null;
        };

        if (!autoloaded) {
            this.poseEditByTarget(0);
        }

        // Setup RScript and execute the ROPPRE ops
        this._rscript = new RNAScript(this._puzzle, this);
        this._rscript.tick();

        // RScript can set our initial poseState
        this._poseState = this._isDatabrowserMode ? PoseState.NATIVE : this._puzzle.defaultMode;
    }

    public get folder(): Folder {
        return this._folder;
    }

    public registerScriptCallbacks(): void {
        if (this._scriptHooks) {
            return;
        }
        this._scriptHooks = true;

        let puz: Puzzle = this._puzzle;
        let folder: Folder = this._folder;

        ExternalInterface.addCallback("get_sequence_string", (): string => {
            return this.getPose(0).getSequenceString();
        });

        ExternalInterface.addCallback("get_full_sequence", (indx: number): string => {
            if (indx < 0 || indx >= this._poses.length) {
                return null;
            } else {
                return EPars.sequence_array_to_string(this.getPose(indx).fullSequence);
            }
        });

        ExternalInterface.addCallback("get_locks", (): boolean[] => {
            let pose: Pose2D = this.getPose(0);
            return pose.puzzleLocks.slice(0, pose.sequence.length);
        });

        ExternalInterface.addCallback("get_targets", (): any[] => {
            let conditions = puz.targetConditions;
            if (conditions.length === 0) {
                conditions.push(null);
            }
            for (let ii: number = 0; ii < conditions.length; ii++) {
                if (conditions[ii] == null) {
                    conditions[ii] = {};
                    conditions[ii]['type'] = "single";
                    conditions[ii]['secstruct'] = puz.getSecstruct(ii);
                }
            }
            return JSON.parse(JSON.stringify(conditions));
        });

        ExternalInterface.addCallback("get_native_structure", (indx: number): string => {
            if (indx < 0 || indx >= this._poses.length) return null;
            let native_pairs = this.getCurrentUndoBlock(indx).get_pairs();
            return EPars.pairs_array_to_parenthesis(native_pairs);
        });

        ExternalInterface.addCallback("get_full_structure", (indx: number): string => {
            if (indx < 0 || indx >= this._poses.length) {
                return null;
            }

            let native_pairs: number[] = this.getCurrentUndoBlock(indx).get_pairs();
            let seq_arr: number[] = this.getPose(indx).fullSequence;
            return EPars.pairs_array_to_parenthesis(native_pairs, seq_arr);
        });

        ExternalInterface.addCallback("get_free_energy", (indx: number): number => {
            if (indx < 0 || indx >= this._poses.length) {
                return Number.NaN;
            }
            return this.getCurrentUndoBlock(indx).get_param(UndoBlockParam.FE);
        });

        ExternalInterface.addCallback("get_constraints", (): any[] => {
            return JSON.parse(JSON.stringify(puz.constraints));
        });

        ExternalInterface.addCallback("check_constraints", (): boolean => {
            return this.checkConstraints(false);
        });

        ExternalInterface.addCallback("constraint_satisfied", (idx: number): boolean => {
            this.checkConstraints(true);
            if (idx >= 0 && idx < this.constraintCount) {
                let o: ConstraintBox = this.getConstraint(idx);
                return o.isSatisfied;
            } else {
                return false;
            }
        });

        ExternalInterface.addCallback("get_tracked_indices", (): number[] => this.getPose(0).trackedIndices);
        ExternalInterface.addCallback("get_barcode_indices", (): number[] => puz.barcodeIndices);
        ExternalInterface.addCallback("is_barcode_available",
            (seq: string): boolean => SolutionManager.instance.checkRedundancyByHairpin(seq));

        ExternalInterface.addCallback("current_folder", (): string => this._folder.name);

        ExternalInterface.addCallback("fold", (seq: string, constraint: string = null): string => {
            let seq_arr: number[] = EPars.string_to_sequence_array(seq);
            let folded: number[] = folder.foldSequence(seq_arr, null, constraint);
            return EPars.pairs_array_to_parenthesis(folded);
        });

        ExternalInterface.addCallback("fold_with_binding_site", (seq: string, site: number[], bonus: number): string => {
            let seq_arr: number[] = EPars.string_to_sequence_array(seq);
            let folded: number[] = folder.foldSequenceWithBindingSite(seq_arr, null, site, Math.floor(bonus * 100), 2.5);
            return EPars.pairs_array_to_parenthesis(folded);
        });

        ExternalInterface.addCallback("energy_of_structure", (seq: string, secstruct: string): number => {
            let seq_arr: number[] = EPars.string_to_sequence_array(seq);
            let struct_arr: number[] = EPars.parenthesis_to_pair_array(secstruct);
            let free_energy: number = folder.scoreStructures(seq_arr, struct_arr);
            return 0.01 * free_energy;
        });

        ExternalInterface.addCallback("pairing_probabilities", (seq: string, secstruct: string = null): number[] => {
            let seq_arr: number[] = EPars.string_to_sequence_array(seq);
            let folded: number[];
            if (secstruct) {
                folded = EPars.parenthesis_to_pair_array(secstruct);
            } else {
                folded = folder.foldSequence(seq_arr, null, null);
            }
            let pp: number[] = folder.getDotPlot(seq_arr, folded);
            return pp.slice();
        });

        ExternalInterface.addCallback("cofold", (seq: string, oligo: string, malus: number = 0., constraint: string = null): string => {
            let len: number = seq.length;
            let cseq: string = seq + "&" + oligo;
            let seq_arr: number[] = EPars.string_to_sequence_array(cseq);
            let folded: number[] = folder.cofoldSequence(seq_arr, null, Math.floor(malus * 100), constraint);
            return EPars.pairs_array_to_parenthesis(folded.slice(0, len))
                + "&" + EPars.pairs_array_to_parenthesis(folded.slice(len));
        });

        if (this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL) {
            ExternalInterface.addCallback("select_folder", (folder_name: string): boolean => {
                let ok: boolean = this.selectFolder(folder_name);
                folder = this.folder;
                return ok;
            });

            ExternalInterface.addCallback("load_parameters_from_buffer", (str: string): boolean => {
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
        ExternalInterface.addCallback("sparks_effect", (from: number, to: number): void => {
            // FIXME: check PiP mode and handle accordingly
            for (let ii: number = 0; ii < this.numPoseFields; ii++) {
                let pose: Pose2D = this.getPose(ii);
                pose.praiseSequence(from, to);
            }
        });
    }

    public registerSetterCallbacks(): void {
        if (this._setterHooks) {
            return;
        }
        this._setterHooks = true;

        ExternalInterface.addCallback("set_sequence_string", (seq: string): boolean => {
            let seq_arr: number[] = EPars.string_to_sequence_array(seq);
            if (seq_arr.indexOf(EPars.RNABASE_UNDEFINED) >= 0 || seq_arr.indexOf(EPars.RNABASE_CUT) >= 0) {
                log.info("Invalid characters in " + seq);
                return false;
            }
            let force_sync: boolean = this._forceSynch;
            this._forceSynch = true;
            for (let ii: number = 0; ii < this.numPoseFields; ii++) {
                let pose: Pose2D = this.getPose(ii);
                pose.pasteSequence(seq_arr);
            }
            this._forceSynch = force_sync;
            this.moveHistoryAddSequence("paste", seq);
            return true;
        });

        ExternalInterface.addCallback("set_tracked_indices", (marks: number[]): void => {
            for (let ii: number = 0; ii < this.numPoseFields; ii++) {
                let pose: Pose2D = this.getPose(ii);
                pose.clearTracking();
                for (let mark of marks) {
                    pose.addBlackMark(mark);
                }
            }
        });

        ExternalInterface.addCallback("set_design_title", (design_title: string): void => {
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

        this.pushUILock();

        // register callbacks
        this.registerScriptCallbacks();
        this.registerSetterCallbacks();

        ExternalInterface.addCallback("set_script_status", (txt: string): void => {
            this._runStatus.style.fill = 0xC0C0C0;
            this._runStatus.text = txt;
        });

        ExternalInterface.addCallback("end_" + nid, (ret: any): void => {
            log.info("end_" + nid + "() called");
            log.info(ret);
            if (typeof(ret['cause']) === "string") {
                this._runStatus.style.fill = (ret['result'] ? 0x00FF00 : 0xFF0000);
                this._runStatus.text = ret['cause'];
                // restore
                // FIXME: other clean-ups? should unregister callbacks?
            } else {
                // leave the script running asynchronously
            }

            this.popUILock();
        });

        // run
        log.info("running script " + nid);
        ExternalInterface.call("ScriptInterface.evaluate_script_with_nid", nid, {}, null);
        log.info("launched");
    }

    public rop_layout_bars(): void {
        this.layoutBars();
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
            } else if (this._stackLevel === 0 && key === KeyCode.KeyD && this._next_design_cb != null) {
                this._next_design_cb();
                handled = true;
            } else if (this._stackLevel === 0 && key === KeyCode.KeyU && this._prev_design_cb != null) {
                this._prev_design_cb();
                handled = true;
            }
        }

        if (handled) {
            e.stopPropagation();
        }
    }

    /*override*/
    public set_multi_engines(multi: boolean): void {
        if (multi) {
            this._folderButton.label(this._puzzle.folderName);
            this._folderButton.display.visible = true;
        } else {
            this._folderButton.display.visible = false;
        }
    }

    /*override*/
    public set_toolbar_autohide(auto: boolean): void {
        this._toolbar.setToolbarAutohide(auto);
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
                this._asynchText.text =
                    "folding " + op.sn +
                    " of " + this._targetPairs.length +
                    " (" + this._opQueue.length + ")";
            }

            elapsed = new Date().getTime() - startTime;
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
    protected enter(): void {
        log.debug("TODO: enter()");
        // if (this._puzzle.get_puzzle_type() !== PuzzleType.EXPERIMENTAL) {
        //     Application.instance.get_application_gui("View options").set_advanced(0);
        // }
        // //let _this:PoseEditMode = this;
        // //_menuitem = Application.instance.get_application_gui("Menu").add_sub_item_cb("Beam to puzzlemaker", "Puzzle", function () :void {
        // //	_this.transferToPuzzlemaker();
        // //});
        //
        // // Context menus
        //
        // let my_menu: ContextMenu = new ContextMenu();
        // my_menu.hideBuiltInItems();
        //
        // this._view_options_cmi = new ContextMenuItem("Preferences");
        // my_menu.customItems.push(this._view_options_cmi);
        // this._view_options_cmi.addEventListener(ContextMenuEvent.MENU_ITEM_SELECT, this.onCtxMenuItem);
        //
        // if (this._puzzle.get_puzzle_type() === PuzzleType.EXPERIMENTAL) {
        //     this._view_solutions_cmi = new ContextMenuItem("Design browser");
        //     my_menu.customItems.push(this._view_solutions_cmi);
        //     this._view_solutions_cmi.addEventListener(ContextMenuEvent.MENU_ITEM_SELECT, this.onCtxMenuItem);
        //
        //     this._submit_cmi = new ContextMenuItem("Submit");
        //     my_menu.customItems.push(this._submit_cmi);
        //     this._submit_cmi.addEventListener(ContextMenuEvent.MENU_ITEM_SELECT, this.onCtxMenuItem);
        //
        //     this._spec_cmi = new ContextMenuItem("Specs");
        //     my_menu.customItems.push(this._spec_cmi);
        //     this._spec_cmi.addEventListener(ContextMenuEvent.MENU_ITEM_SELECT, this.onCtxMenuItem);
        // }
        //
        // this._reset_cmi = new ContextMenuItem("Reset");
        // my_menu.customItems.push(this._reset_cmi);
        // this._reset_cmi.addEventListener(ContextMenuEvent.MENU_ITEM_SELECT, this.onCtxMenuItem);
        //
        // this._copy_cmi = new ContextMenuItem("Copy sequence");
        // my_menu.customItems.push(this._copy_cmi);
        // this._copy_cmi.addEventListener(ContextMenuEvent.MENU_ITEM_SELECT, this.onCtxMenuItem);
        //
        // this._paste_cmi = new ContextMenuItem("Paste sequence");
        // my_menu.customItems.push(this._paste_cmi);
        // this._paste_cmi.addEventListener(ContextMenuEvent.MENU_ITEM_SELECT, this.onCtxMenuItem);
        //
        // this._beam_cmi = new ContextMenuItem("Beam to puzzlemaker");
        // my_menu.customItems.push(this._beam_cmi);
        // this._beam_cmi.addEventListener(ContextMenuEvent.MENU_ITEM_SELECT, this.onCtxMenuItem);
        //
        // this.contextMenu = my_menu;

        super.enter();
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

        let tempBG = DisplayUtil.fillStageRect(0x061A34);
        this.container.addChildAt(tempBG, 0);

        let info =
            `Player: ${Eterna.player_name}\n` +
            `Puzzle ID: ${this._puzzle.nodeID}\n` +
            `Puzzle Title: ${this._puzzle.getPuzzleName()}\n` +
            `Mode: ${this.toolbar.nativeButton.isSelected ? "NativeMode" : "TargetMode"}`;
        let infoText = Fonts.arial(info).color(0xffffff).build();
        this.container.addChild(infoText);

        let pngData = DisplayUtil.renderToPNG(this.container);

        tempBG.destroy({children: true});
        infoText.destroy({children: true});

        for (let [disp, wasVisible] of visibleState.entries()) {
            disp.visible = wasVisible;
        }

        return pngData;
    }

    private exitPuzzle(): void {
        if (this._submitSolutionRspData == null) {
            throw new Error("exit_puzzle was called before we submitted a solution");
        }
        this.showMissionClearedPanel(this._submitSolutionRspData);
    }

    private askRetry(): void {
        const PROMPT = "Do you really want to reset?\nResetting will clear your undo stack.";
        this.showConfirmDialog(PROMPT).closed.then(confirmed => {
            if (confirmed) {
                this.resetAutosaveData();
                this._puzzle.temporaryConstraints = null;
                this.modeStack.changeMode(new PoseEditMode(this._puzzle, null, false));
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
                let forced: number[] = EPars.parenthesis_to_forced_array(this._targetConditions[ii]['force_struct']);
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
                        sequence: EPars.string_to_sequence_array(odefs[ii].sequence),
                        malus: odefs[ii].malus,
                        name: odefs[ii]['name']
                    });
                }
                this._poses[pose_index].setOligos(ndefs, this._targetOligosOrder[target_index]);
            } else {
                this._poses[pose_index].setOligos(null);
            }

            if (Puzzle.isOligoType(tc_type)) {
                let fold_mode: number = this._targetConditions[target_index]['fold_mode'] == null ? Pose2D.OLIGO_MODE_DIMER : this._targetConditions[target_index]['fold_mode'];
                this._poses[pose_index].setOligo(EPars.string_to_sequence_array(this._targetConditions[target_index]['oligo_sequence']), fold_mode,
                    this._targetConditions[target_index]['oligo_name']);
                this._poses[pose_index].oligoMalus = this._targetConditions[target_index]['malus'];
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
                forced_struct = EPars.parenthesis_to_forced_array(this._targetConditions[target_index]['force_struct']);
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

    private togglePosestate(): void {
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

        this._background.freeze_background(this._isFrozen);
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
            // force a score-node update
            pose.displayScoreTexts = pose.displayScoreTexts;
        }
    }

    private ropPresets(): void {
        while (this._ropPresets.length) {
            let pre = this._ropPresets.pop();
            pre();
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
        this._folder = FolderManager.instance.getNextFolder(curr_f, (folder: Folder): boolean => {
            return this._puzzle.hasTargetType("multistrand") && !folder.canMultifold;
        });
        if (this._folder.name === curr_f) return;

        this.onFolderUpdated();
    }

    private showSpec(): void {
        this.updateCurrentBlockWithDotAndMeltingPlot();
        let datablock: UndoBlock = this.getCurrentUndoBlock();

        let dialog = this.showDialog(new SpecBoxDialog(datablock));
        dialog.closed.then(showDocked => {
            if (showDocked) {
                this._dockedSpecBox.set_spec(datablock);
                this._dockedSpecBox.display.visible = true;
            }
        });
    }

    private updateDockedSpecBox(): void {
        if (this._dockedSpecBox.display.visible) {
            this.updateCurrentBlockWithDotAndMeltingPlot();
            let datablock: UndoBlock = this.getCurrentUndoBlock();
            this._dockedSpecBox.set_spec(datablock);
        }
    }

    private navigate_to_puzzle(): void {
        log.debug("TODO: navigate_to_puzzle");
        // let req: URLRequest = new URLRequest;
        // req.url = "/puzzle/";
        // if (this._puzzle.get_puzzle_type() === PuzzleType.BASIC) {
        //     req.url += "Basic/";
        // } else if (this._puzzle.get_puzzle_type() === PuzzleType.EXPERIMENTAL) {
        //     req.url += "Experimental/";
        // } else {
        //     req.url += "Challenge/";
        // }
        //
        // req.url += this._puzzle.get_node_id().toString();
        //
        // this.navigateToURL(req, "_self");
    }

    private navigate_to_challenges(): void {
        log.debug("TODO: navigate_to_challenges");
        // let req: URLRequest = new URLRequest;
        // req.url = "/htmls/challenges.html?pagedata=Challenges_easiest";
        // this.navigateToURL(req, "_self");
    }

    private updateCurrentBlockWithDotAndMeltingPlot(index: number = -1): void {
        let datablock: UndoBlock = this.getCurrentUndoBlock(index);
        if (this._folder.canDotPlot) {
            datablock.set_meltingpoint_and_dotplot(this._folder);
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
                if (this._puzzle.isSoftConstraint || Eterna.is_dev_mode) {
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
        if (datablock.get_param(UndoBlockParam.DOTPLOT_BITMAP) == null) {
            this.updateCurrentBlockWithDotAndMeltingPlot();
        }

        let init_score: number = datablock.get_param(UndoBlockParam.PROB_SCORE, 37);

        let meltpoint: number = 107;
        for (let ii: number = 47; ii < 100; ii += 10) {
            let current_score: number = datablock.get_param(UndoBlockParam.PROB_SCORE, ii);
            if (current_score < init_score * 0.5) {
                meltpoint = ii;
                break;
            }
        }

        datablock.set_param(UndoBlockParam.MELTING_POINT, meltpoint, 37);

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

        let seq_string: string = EPars.sequence_array_to_string(this._puzzle.transformSequence(undoBlock.get_sequence(), 0));

        post_data["title"] = details.title;
        post_data["energy"] = undoBlock.get_param(UndoBlockParam.FE) / 100.0;
        post_data["puznid"] = this._puzzle.nodeID;
        post_data["sequence"] = seq_string;
        post_data["repetition"] = undoBlock.get_param(UndoBlockParam.REPETITION);
        post_data["gu"] = undoBlock.get_param(UndoBlockParam.GU);
        post_data["gc"] = undoBlock.get_param(UndoBlockParam.GC);
        post_data["ua"] = undoBlock.get_param(UndoBlockParam.AU);
        post_data["body"] = details.comment;

        if (this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL) {
            post_data["melt"] = undoBlock.get_param(UndoBlockParam.MELTING_POINT);

            if (this._foldTotalTime >= 1000.0) {
                let fd: any[] = [];
                for (let ii: number = 0; ii < this._poses.length; ii++) {
                    fd.push(this.getCurrentUndoBlock(ii).toJson());
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

        // Show a "Submitting now!" dialog
        let submittingRef: GameObjectRef = GameObjectRef.NULL;
        if (this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL) {
            submittingRef = this.showDialog(new SubmittingDialog()).ref;
        }

        // Kick off a BubbleSweep animation
        let bubbles = new BubbleSweep(800);
        this.addObject(bubbles, this.bgLayer);
        bubbles.start_sweep();

        // Show an explosion animation
        this.disableTools(true);
        this.setPuzzleState(PuzzleState.CLEARED);

        Eterna.sound.playSound(Sounds.SoundPuzzleClear);
        let explosionCompletePromise: Promise<void> = null;
        for (let pose of this._poses) {
            pose.setZoomLevel(0, true, true);
            let p = pose.startExplosion();
            if (explosionCompletePromise == null) {
                explosionCompletePromise = p;
            }
        }

        // submit our solution to the server
        log.debug("Submitting solution...");
        let submissionPromise = Eterna.client.submitSolution(this.createSubmitData(details, undoBlock));

        // Wait for explosion completion
        explosionCompletePromise.then(() => {
            bubbles.decay_sweep();
            bubbles.addObject(new SerialTask(
                new AlphaTask(0, 5, Easing.easeIn),
                new SelfDestructTask()
            ));

            this.setShowMenu(false);
            for (let pose of this._poses) {
                pose.showTotalEnergy = false;
                pose.clearExplosion();
            }

            this._constraintsLayer.visible = false;

        }).then(() => {
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

            this.showMissionClearedPanel(data);

            const seqString = EPars.sequence_array_to_string(
                this._puzzle.transformSequence(undoBlock.get_sequence(), 0));

            if (data['error'] != null) {
                if (data['error'].indexOf('barcode') >= 0) {
                    let dialog = this.showNotification(data['error'], "More Information");
                    dialog.extraButton.clicked.connect(() => window.open(EternaURL.BARCODE_HELP, "_blank"));
                    let hairpin: string = EPars.get_barcode_hairpin(seqString);
                    if (hairpin != null) {
                        SolutionManager.instance.addHairpins([hairpin]);
                        this.checkConstraints();
                    }
                } else {
                    this.showNotification(data['error']);
                }

            } else {
                if (data['solution-id'] != null) {
                    this.setAncestorId(data['solution-id']);
                }

                if (this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL) {
                    if (this._puzzle.useBarcode) {
                        let hairpin: string = EPars.get_barcode_hairpin(seqString);
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

        this.disableTools(true);
        this._constraintsLayer.visible = false;
        this._exitButton.display.visible = false;

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
            nextPuzzle = PuzzleManager.instance.parsePuzzle(nextPuzzleData);
            log.info(`Loaded next puzzle [id=${nextPuzzle.nodeID}]`);
        }

        let missionClearedPanel = new MissionClearedPanel(nextPuzzle != null, infoText, moreText);
        missionClearedPanel.display.alpha = 0;
        missionClearedPanel.addObject(new AlphaTask(1, 0.3));
        this.addObject(missionClearedPanel, this.dialogLayer);
        missionClearedPanel.createRankScroll(submitSolutionRspData);

        const keepPlaying = () => {
            if (missionClearedPanel != null) {
                missionClearedPanel.destroySelf();
                missionClearedPanel = null;

                this._constraintsLayer.visible = true;
                this.disableTools(false);

                this._exitButton.display.alpha = 0;
                this._exitButton.display.visible = true;
                this._exitButton.addObject(new AlphaTask(1, 0.3));
            }
        };

        if (nextPuzzle != null) {
            missionClearedPanel.nextButton.clicked.connect(() => {
                this.modeStack.changeMode(new PoseEditMode(nextPuzzle));
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
                if (box.constraintType !== ConstraintType.SHAPE || Number(constraints[2 * ii + 1]) !== xx) {
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
                if (box.constraintType !== ConstraintType.ANTISHAPE || Number(constraints[2 * ii + 1]) !== xx) {
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
            this.startPlaying(false);
            return;
        }

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
        this.startPlaying(true);

        this.showIntroScreen();
    }

    private showIntroScreen() {
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

        let introMode = new MissionIntroMode(
            this._puzzle.getPuzzleName(true),
            missionText,
            this._targetPairs,
            introConstraintBoxes);

        this.modeStack.pushMode(introMode);
    }

    private startPlaying(animate_constraints: boolean): void {
        this._isPlaying = true;
        this.disableTools(false);

        this.setPuzzleState(PuzzleState.GAME);
        this.displayConstraintBoxes(true, true);
    }

    private resetAutosaveData(): void {
        Eterna.settings.removeObject(this.savedDataTokenName);
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
        objs.push(this._seqStacks[this._stackLevel][0].get_sequence());
        for (let ii: number = 0; ii < this._poses.length; ++ii) {
            objs.push(JSON.stringify(this._seqStacks[this._stackLevel][ii].toJson()));
        }

        Eterna.settings.saveObject(this.savedDataTokenName, objs);
    }

    private get savedDataTokenName(): string {
        return "puz_" + this._puzzle.nodeID;
    }

    private transferToPuzzlemaker(): void {
        log.debug("TODO: transfer_to_puzzlemaker");
        // let cookie: string = "puzedit_" + this._poses.length + "_" + Eterna.player_id;
        // let objs: any[] = [];
        // for (let ii: number = 0; ii < this._poses.length; ++ii) {
        //     let obj: any = {};
        //     let pose: Pose2D = this._poses[ii];
        //     obj['sequence'] = EPars.sequence_array_to_string(pose.get_sequence());
        //     obj['structure'] = EPars.pairs_array_to_parenthesis(pose.get_pairs());
        //     objs.push(obj);
        // }
        // AutosaveManager.saveObjects(objs, cookie);
        //
        // Application.instance.transit_game_mode(Eterna.GAMESTATE_PUZZLE_MAKER, [this._poses.length]);
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
            if (this._targetConditions[0]['fold_mode'] === Pose2D.OLIGO_MODE_DIMER) oligo_len++;
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

        let json: any[] = Eterna.settings.loadObject(this.savedDataTokenName);
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
                    undo_block.fromJson(JSON.parse(json[ii + 2]));
                } catch (e) {
                    log.error("Error loading saved puzzle data", e);
                    return false;
                }

                /// JEEFIX : Don't override secstruct from autoload without checking whther the puzzle can vary length.
                /// KWSFIX : Only allow when shiftable mode (=> shift_limit = 0)

                if (this._puzzle.shiftLimit === 0 && undo_block.get_target_pairs().length !== this._targetPairs[ii].length) {
                    return false;
                }

                this._targetPairs[ii] = undo_block.get_target_pairs();
                this._targetOligosOrder[ii] = undo_block.get_target_oligo_order();

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
                muts.push({pos: ii + 1, base: EPars.sequence_array_to_string([after[ii]])});
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
            let new_seq: number[] = this._puzzle.transformSequence(this.getCurrentUndoBlock(0).get_sequence(), 0);
            this.moveHistoryAddSequence("reset", EPars.sequence_array_to_string(new_seq));
        } else {
            this._startSolvingTime = new Date().getTime();
            this._startingPoint = EPars.sequence_array_to_string(this._puzzle.transformSequence(this.getCurrentUndoBlock(0).get_sequence(), 0));
        }

        if (this._isDatabrowserMode) {
            this.registerScriptCallbacks();
            this.registerSetterCallbacks();
        }

        if (is_reset || this._isDatabrowserMode) {
            this.startPlaying(false);
        } else if (init_seq == null) {
            this.startCountdown();
        } else {
            /// Given init sequence (solution) in the lab, don't show mission animation - go straight to game
            if (this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL) {
                this.startPlaying(false);
            } else {
                this.startCountdown();
            }
        }

        this.setPip(Eterna.settings.pipEnabled.value);

        this.ropPresets();
    }

    private updateConstraint(type: ConstraintType, value: string, ii: number, box: ConstraintBox, render: boolean, outInfo: ConstraintInfo): boolean {
        let isSatisfied: boolean = true;

        const undoBlock: UndoBlock = this.getCurrentUndoBlock();
        const sequence = undoBlock.get_sequence();

        if (type === ConstraintType.GU) {
            const count: number = undoBlock.get_param(UndoBlockParam.GU);
            isSatisfied = (count >= Number(value));
            if (render) {
                box.setContent(ConstraintType.GU, value, isSatisfied, count);
            }
        } else if (type === ConstraintType.AU) {
            const count: number = undoBlock.get_param(UndoBlockParam.AU);
            isSatisfied = (count >= Number(value));
            if (render) {
                box.setContent(ConstraintType.AU, value, isSatisfied, count)
            }
        } else if (type === ConstraintType.GC) {
            const count: number = undoBlock.get_param(UndoBlockParam.GC);
            isSatisfied = (count <= Number(value));
            if (render) {
                box.setContent(ConstraintType.GC, value, isSatisfied, count);
            }
        } else if (type === ConstraintType.MUTATION) {
            const sequence_diff: number = EPars.sequence_diff(this._puzzle.getSubsequenceWithoutBarcode(sequence), this._puzzle.getSubsequenceWithoutBarcode(this._puzzle.getBeginningSequence()));
            isSatisfied = sequence_diff <= Number(value);
            if (render) {
                box.setContent(ConstraintType.MUTATION, value, isSatisfied, sequence_diff);
            }

        } else if (type === ConstraintType.SHAPE) {
            const target_index = Number(value);
            const ublk: UndoBlock = this.getCurrentUndoBlock(target_index);
            let native_pairs = ublk.get_pairs();
            let structure_constraints: any[] = null;
            if (this._targetConditions != null && this._targetConditions[target_index] != null) {
                structure_constraints = this._targetConditions[target_index]['structure_constraints'];

                if (ublk.get_oligo_order() != null) {
                    let np_map: number[] = ublk.get_order_map(ublk.get_oligo_order());
                    let tp_map: number[] = ublk.get_order_map(ublk.get_target_oligo_order());
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

            isSatisfied = EPars.are_pairs_same(native_pairs, this._targetPairs[target_index], structure_constraints);

            let input_index = 0;
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
                box.flagged = this._unstableIndex === ii;
                // if (!box.hasEventListener(MouseEvent.MOUSE_DOWN)) {
                //     set_callback(this, box, ii);
                // }

                if (this._unstableIndex === ii) {
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
                        this._constraintShapeBoxes[target_index].flagged = this._unstableIndex === ii;
                        // if (!this._constraint_shape_boxes[target_index].hasEventListener(MouseEvent.MOUSE_DOWN)) {
                        //     set_callback(this, this._constraint_shape_boxes[target_index], ii);
                        // }

                        this._constraintShapeBoxes[target_index].display.visible = this._isPipMode;
                    }
                }
            }

        } else if (type === ConstraintType.ANTISHAPE) {
            let target_index = Number(value);
            let native_pairs = this.getCurrentUndoBlock(target_index).get_pairs();
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
            let anti_pairs: number[] = EPars.parenthesis_to_pair_array(anti_structure_string);
            isSatisfied = !EPars.are_pairs_same(native_pairs, anti_pairs, anti_structure_constraints);

            let input_index = 0;
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
                box.flagged = this._unstableIndex === ii;
                // if (!box.hasEventListener(MouseEvent.MOUSE_DOWN)) {
                //     set_callback(this, box, ii);
                // }

                if (this._unstableIndex === ii) {
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
                        this._constraintAntishapeBoxes[target_index].flagged = this._unstableIndex === ii;
                        // if (!this._constraint_antishape_boxes[target_index].hasEventListener(MouseEvent.MOUSE_DOWN)) {
                        //     set_callback(this, this._constraint_antishape_boxes[target_index], ii);
                        // }

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
            let o: number[] = undoblk.get_oligo_order();
            let count: number = undoblk.get_oligos_paired();
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
            let num_gu: number = undoBlock.get_param(UndoBlockParam.GU);
            let num_gc: number = undoBlock.get_param(UndoBlockParam.GC);
            let num_ua: number = undoBlock.get_param(UndoBlockParam.AU);
            isSatisfied = (num_gc + num_gu + num_ua >= Number(value));

            if (render) {
                box.setContent(ConstraintType.PAIRS, value, isSatisfied, num_gc + num_gu + num_ua);
            }

        } else if (type === ConstraintType.STACK) {
            const stack_len: number = undoBlock.get_param(UndoBlockParam.STACK);
            isSatisfied = (stack_len >= Number(value));

            if (render) {
                box.setContent(ConstraintType.STACK, value, isSatisfied, stack_len);
            }
        } else if (type === ConstraintType.CONSECUTIVE_G) {
            let consecutive_g_count: number = EPars.count_consecutive(sequence, EPars.RNABASE_GUANINE);
            isSatisfied = (consecutive_g_count < Number(value));

            if (render) {
                box.setContent(ConstraintType.CONSECUTIVE_G, value, isSatisfied, consecutive_g_count);
            }

            outInfo.max_allowed_guanine = Number(value);

        } else if (type === ConstraintType.CONSECUTIVE_C) {
            let consecutive_c_count: number = EPars.count_consecutive(sequence, EPars.RNABASE_CYTOSINE);
            isSatisfied = (consecutive_c_count < Number(value));

            if (render) {
                box.setContent(ConstraintType.CONSECUTIVE_C, value, isSatisfied, consecutive_c_count);
            }

            outInfo.max_allowed_cytosine = Number(value);

        } else if (type === ConstraintType.CONSECUTIVE_A) {
            let consecutive_a_count: number = EPars.count_consecutive(sequence, EPars.RNABASE_ADENINE);
            isSatisfied = (consecutive_a_count < Number(value));

            if (render) {
                box.setContent(ConstraintType.CONSECUTIVE_A, value, isSatisfied, consecutive_a_count);
            }

            outInfo.max_allowed_adenine = Number(value);

        } else if (type === ConstraintType.LAB_REQUIREMENTS) {
            let locks: boolean[] = undoBlock.get_puzzle_locks();
            let consecutive_g_count: number = EPars.count_consecutive(sequence, EPars.RNABASE_GUANINE, locks);
            let consecutive_c_count: number = EPars.count_consecutive(sequence, EPars.RNABASE_CYTOSINE, locks);
            let consecutive_a_count: number = EPars.count_consecutive(sequence, EPars.RNABASE_ADENINE, locks);
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
            isSatisfied = !SolutionManager.instance.checkRedundancyByHairpin(EPars.sequence_array_to_string(sequence));
            if (render) {
                box.setContent(ConstraintType.BARCODE, 0, isSatisfied, 0);
            }

        } else if (type === ConstraintType.OLIGO_BOUND) {
            let target_index = Number(value);
            let nnfe: number[] = this.getCurrentUndoBlock(target_index).get_param(UndoBlockParam.NNFE_ARRAY, EPars.DEFAULT_TEMPERATURE);
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
            let nnfe: number[] = this.getCurrentUndoBlock(target_index).get_param(UndoBlockParam.NNFE_ARRAY, EPars.DEFAULT_TEMPERATURE);
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
            let nid: string = value;
            this.registerScriptCallbacks();

            ExternalInterface.addCallback("end_" + nid, (ret: any): void => {
                let goal: string = "";
                let name: string = "...";
                let value: string = "";
                let index: string = null;
                let data_png: string = "";
                let satisfied: boolean = false;
                log.info("end_" + nid + "() called");
                if (ret && ret.cause) {
                    if (ret.cause.satisfied) satisfied = ret.cause.satisfied;
                    if (ret.cause.goal != null) goal = ret.cause.goal;
                    if (ret.cause.name != null) name = ret.cause.name;
                    if (ret.cause.value != null) value = ret.cause.value;
                    if (ret.cause.index != null) {
                        index = (ret.cause.index + 1).toString();
                        let ll: number = this._isPipMode ?
                            ret.cause.index :
                            (ret.cause.index === this._curTargetIndex ? 0 : -1);
                        if (ll >= 0) {
                            if (ret.cause.highlight != null) {
                                this._poses[ll].highlightUserDefinedSequence(ret.cause.highlight);
                            } else {
                                this._poses[ll].clearUserDefinedHighlight();
                            }
                        }
                    }

                    if (ret.cause.icon_b64) {
                        data_png = ret.cause.icon_b64;
                    }
                }

                if (render) {
                    this._constraintBoxes[ii / 2].setContent(ConstraintType.SCRIPT, {
                        "nid": nid,
                        "goal": goal,
                        "name": name,
                        "value": value,
                        "index": index,
                        "data_png": data_png
                    }, satisfied, 0);
                }

                isSatisfied = satisfied;
            });

            // run
            isSatisfied = false;
            log.info("running script " + nid);
            ExternalInterface.call("ScriptInterface.evaluate_script_with_nid", nid, {}, null, true);
            log.info("launched");
        }

        return isSatisfied;
    }

    private checkConstraints(render: boolean = true): boolean {
        const constraints: string[] = this._puzzle.curConstraints;
        if (constraints == null || constraints.length === 0) {
            return false;
        }

        // let set_callback = function (pose: PoseEditMode, cb: ConstraintBox, kk: number): void {
        //     cb.addEventListener(MouseEvent.MOUSE_DOWN, function (e: any): void {
        //         pose._unstable_index = (pose._unstable_index === kk) ? -1 : kk;
        //         pose.checkConstraints();
        //     });
        // };

        let constraintsInfo: ConstraintInfo = {
            wrong_pairs: null,
            restricted_local: null,
            max_allowed_adenine: -1,
            max_allowed_cytosine: -1,
            max_allowed_guanine: -1,
        };

        let allAreSatisfied: boolean = true;
        let allWereSatisfied: boolean = true;

        let play_condition_music: boolean = false;
        let play_decondition_music: boolean = false;

        for (let ii = 0; ii < constraints.length; ii += 2) {
            const type: ConstraintType = constraints[ii] as ConstraintType;
            const value = constraints[ii + 1];
            const box: ConstraintBox = this._constraintBoxes[ii / 2];

            const wasSatisfied: boolean = box.isSatisfied;
            const isSatisfied: boolean = this.updateConstraint(type, value, ii, box, render, constraintsInfo);

            allAreSatisfied = allAreSatisfied && isSatisfied;
            allWereSatisfied = allWereSatisfied && wasSatisfied;

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
                if (isSatisfied && !wasSatisfied) {
                    play_condition_music = true;
                    box.flare(isSatisfied);
                } else if (!isSatisfied && wasSatisfied) {
                    play_decondition_music = true;
                    box.flare(isSatisfied);
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
        const sequence: number[] = undo_block.get_sequence();
        const locks: boolean[] = undo_block.get_puzzle_locks();

        const restricted_guanine = EPars.get_restricted_consecutive(sequence, EPars.RNABASE_GUANINE, constraintsInfo.max_allowed_guanine - 1, locks);
        const restricted_cytosine = EPars.get_restricted_consecutive(sequence, EPars.RNABASE_CYTOSINE, constraintsInfo.max_allowed_cytosine - 1, locks);
        const restricted_adenine = EPars.get_restricted_consecutive(sequence, EPars.RNABASE_ADENINE, constraintsInfo.max_allowed_adenine - 1, locks);

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

        if (allAreSatisfied && !allWereSatisfied) {
            if (this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL) {
                Eterna.sound.playSound(Sounds.SoundAllConditions);
            } else if (this._puzState !== PuzzleState.GAME) {
                Eterna.sound.playSound(Sounds.SoundCondition);
            }
        } else if (play_condition_music) {
            Eterna.sound.playSound(Sounds.SoundCondition);
        } else if (play_decondition_music) {
            Eterna.sound.playSound(Sounds.SoundDecondition);
        }

        return allAreSatisfied;
    }

    private updateScore(): void {
        this.saveData();
        // let dn: GameObject = (<GameObject>Application.instance.get_application_gui("Design Name"));
        // if (dn != null) dn.visible = (this._stack_level === 0);

        let undo_block: UndoBlock = this.getCurrentUndoBlock();
        let sequence: number[] = undo_block.get_sequence();
        let best_pairs: number[] = undo_block.get_pairs(EPars.DEFAULT_TEMPERATURE);
        let nnfe: number[];

        if (!this._paused) {
            for (let ii = 0; ii < this._poses.length; ii++) {
                if (ii === 0 && this._poseState === PoseState.NATIVE && !this._isPipMode) {
                    this._poses[0].setOligos(this.getCurrentUndoBlock().get_target_oligos(),
                        this.getCurrentUndoBlock().get_oligo_order(),
                        this.getCurrentUndoBlock().get_oligos_paired());
                    this._poses[0].setOligo(this.getCurrentUndoBlock().get_target_oligo(),
                        this.getCurrentUndoBlock().get_oligo_mode(),
                        this.getCurrentUndoBlock().get_oligo_name());
                    this._poses[0].pairs = this.getCurrentUndoBlock().get_pairs();
                    if (this._targetConditions != null && this._targetConditions[this._curTargetIndex] != null) {
                        this._poses[0].structConstraints = this._targetConditions[this._curTargetIndex]['structure_constraints'];
                    }
                    continue;
                }
                this._poses[ii].setOligos(this.getCurrentUndoBlock(ii).get_target_oligos(),
                    this.getCurrentUndoBlock(ii).get_oligo_order(),
                    this.getCurrentUndoBlock(ii).get_oligos_paired());
                this._poses[ii].setOligo(this.getCurrentUndoBlock(ii).get_target_oligo(),
                    this.getCurrentUndoBlock(ii).get_oligo_mode(),
                    this.getCurrentUndoBlock(ii).get_oligo_name());
                this._poses[ii].pairs = this.getCurrentUndoBlock(ii).get_pairs();
                if (this._targetConditions != null && this._targetConditions[ii] != null) {
                    this._poses[ii].structConstraints = this._targetConditions[ii]['structure_constraints'];
                }
            }

        } else {
            for (let ii = 0; ii < this._poses.length; ++ii) {
                if (ii === 0 && this._poseState === PoseState.TARGET && !this._isPipMode) {
                    this._poses[0].setOligos(this.getCurrentUndoBlock().get_target_oligos(),
                        this.getCurrentUndoBlock().get_target_oligo_order(),
                        this.getCurrentUndoBlock().get_oligos_paired());
                    this._poses[0].setOligo(this.getCurrentUndoBlock().get_target_oligo(),
                        this.getCurrentUndoBlock().get_oligo_mode(),
                        this.getCurrentUndoBlock().get_oligo_name());
                    this._poses[0].pairs = this.getCurrentUndoBlock().get_target_pairs();
                    if (this._targetConditions != null && this._targetConditions[this._curTargetIndex] != null) {
                        this._poses[0].structConstraints = this._targetConditions[this._curTargetIndex]['structure_constraints'];
                    }
                    this._targetOligos[0] = this.getCurrentUndoBlock(0).get_target_oligos();
                    this._targetOligosOrder[0] = this.getCurrentUndoBlock(0).get_target_oligo_order();
                    this._targetOligo[0] = this.getCurrentUndoBlock(0).get_target_oligo();
                    this._oligoMode[0] = this.getCurrentUndoBlock(0).get_oligo_mode();
                    this._oligoName[0] = this.getCurrentUndoBlock(0).get_oligo_name();
                    this._targetPairs[0] = this.getCurrentUndoBlock(0).get_target_pairs();
                    continue;
                }
                this._targetOligos[ii] = this.getCurrentUndoBlock(ii).get_target_oligos();
                this._targetOligosOrder[ii] = this.getCurrentUndoBlock(ii).get_target_oligo_order();
                this._targetOligo[ii] = this.getCurrentUndoBlock(ii).get_target_oligo();
                this._oligoMode[ii] = this.getCurrentUndoBlock(ii).get_oligo_mode();
                this._oligoName[ii] = this.getCurrentUndoBlock(ii).get_oligo_name();
                this._targetPairs[ii] = this.getCurrentUndoBlock(ii).get_target_pairs();
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
                this._poses[ii].oligoMalus = this._targetConditions[jj]['malus'];
                nnfe = this.getCurrentUndoBlock(jj).get_param(UndoBlockParam.NNFE_ARRAY, EPars.DEFAULT_TEMPERATURE);
                if (nnfe != null && nnfe[0] === -2) {
                    this._poses[ii].oligoPaired = true;
                    this._poses[ii].duplexCost = nnfe[1] * 0.01;
                } else {
                    this._poses[ii].oligoPaired = false;
                }
            }
            if (this._targetConditions[jj]['type'] === "multistrand") {
                nnfe = this.getCurrentUndoBlock(jj).get_param(UndoBlockParam.NNFE_ARRAY, EPars.DEFAULT_TEMPERATURE);
                if (nnfe != null && nnfe[0] === -2) {
                    this._poses[ii].duplexCost = nnfe[1] * 0.01;
                }
            }
        }

        let num_AU: number = undo_block.get_param(UndoBlockParam.AU);
        let num_GU: number = undo_block.get_param(UndoBlockParam.GU);
        let num_GC: number = undo_block.get_param(UndoBlockParam.GC);
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
            this.getCurrentUndoBlock(ii).set_stable(constraints_satisfied);
        }

        /// Update spec thumbnail if it is open
        this.updateDockedSpecBox();

        let isThereTempConstraints: boolean = (this._puzzle.temporaryConstraints != null);

        if (constraints_satisfied && !isThereTempConstraints) {
            if (this._puzzle.puzzleType !== PuzzleType.EXPERIMENTAL && this._puzState === PuzzleState.GAME) {
                this.submitCurrentPose();
            }
        }

        //when constaints are satisfied, trigger publish hint animation
        if (constraints_satisfied && !was_satisfied && this._puzzle.puzzleType === PuzzleType.EXPERIMENTAL) {
            log.debug("TODO: submit_button.respond()")
            // this._submit_button.respond(150, 160);
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
                || EPars.has_cut(this._poses[target_index].fullSequence, segments[1], segments[2]))) {
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
                        if (EPars.validate_parenthesis(EPars.pairs_array_to_parenthesis(this._targetPairs[xx]).slice(segments[1] + 1, segments[2]), false) == null) {
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
                                if (EPars.validate_parenthesis(EPars.pairs_array_to_parenthesis(new_pairs).slice(segments[1] + 1, segments[2]), false) == null) {
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
                    this._targetPairs[ii] = EPars.parenthesis_to_pair_array(parenthesis);
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
                    let anti_pairs: number[] = EPars.parenthesis_to_pair_array(anti_secstruct);
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

        let execfold_cb = (fd: any[]) => {
            // Application.instance.get_modal_container().removeObject(this._asynch_text);
            // Application.instance.remove_lock("FOLDING");
            // Application.instance.set_blocker_opacity(0.35);

            if (fd != null) {
                this._stackLevel++;
                this._stackSize = this._stackLevel + 1;
                this._seqStacks[this._stackLevel] = [];

                for (let ii = 0; ii < this._poses.length; ii++) {
                    let undo_block: UndoBlock = new UndoBlock([]);
                    undo_block.fromJson(fd[ii]);
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

        let sol: Solution = SolutionManager.instance.getSolutionBySequence(this._poses[target_index].getSequenceString());
        if (sol != null && this._puzzle.hasTargetType("multistrand")) {
            this._asynchText.text = "retrieving...";
            // Application.instance.set_blocker_opacity(0.2);
            // Application.instance.add_lock("FOLDING");
            // Application.instance.get_modal_container().addObject(this._asynch_text);

            sol.queryFoldData().then((result) => execfold_cb(result));
        } else {
            execfold_cb(null);
        }
    }

    private poseEditByTargetDoFold(target_index: number): void {
        this._foldStartTime = new Date().getTime();

        this._asynchText.text = "folding...";

        // Application.instance.set_blocker_opacity(0.2);
        // Application.instance.add_lock("FOLDING");
        // Application.instance.get_modal_container().addObject(this._asynch_text);

        if (this._forceSynch) {
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
            log.debug("folding");
            best_pairs = this._folder.foldSequence(this._puzzle.transformSequence(seq, ii), null, force_struct);

        } else if (this._targetConditions[ii]['type'] === "aptamer") {
            bonus = this._targetConditions[ii]['bonus'];
            sites = this._targetConditions[ii]['site'];
            best_pairs = this._folder.foldSequenceWithBindingSite(this._puzzle.transformSequence(seq, ii), this._targetPairs[ii], sites, Number(bonus), this._targetConditions[ii]['fold_version']);

        } else if (this._targetConditions[ii]['type'] === "oligo") {
            fold_mode = this._targetConditions[ii]['fold_mode'] == null ? Pose2D.OLIGO_MODE_DIMER : this._targetConditions[ii]['fold_mode'];
            if (fold_mode === Pose2D.OLIGO_MODE_DIMER) {
                log.debug("cofold");
                full_seq = seq.concat(EPars.string_to_sequence_array("&" + this._targetConditions[ii]['oligo_sequence']));
                malus = Number(this._targetConditions[ii]['malus'] * 100);
                best_pairs = this._folder.cofoldSequence(full_seq, null, malus, force_struct);
            } else if (fold_mode === Pose2D.OLIGO_MODE_EXT5P) {
                full_seq = EPars.string_to_sequence_array(this._targetConditions[ii]['oligo_sequence']).concat(seq);
                best_pairs = this._folder.foldSequence(full_seq, null, force_struct);
            } else {
                full_seq = seq.concat(EPars.string_to_sequence_array(this._targetConditions[ii]['oligo_sequence']));
                best_pairs = this._folder.foldSequence(full_seq, null, force_struct);
            }

        } else if (this._targetConditions[ii]['type'] === "aptamer+oligo") {
            bonus = this._targetConditions[ii]['bonus'];
            sites = this._targetConditions[ii]['site'];
            fold_mode = this._targetConditions[ii]['fold_mode'] == null ? Pose2D.OLIGO_MODE_DIMER : this._targetConditions[ii]['fold_mode'];
            if (fold_mode === Pose2D.OLIGO_MODE_DIMER) {
                log.debug("cofold");
                full_seq = seq.concat(EPars.string_to_sequence_array("&" + this._targetConditions[ii]['oligo_sequence']));
                malus = Number(this._targetConditions[ii]['malus'] * 100);
                best_pairs = this._folder.cofoldSequenceWithBindingSite(full_seq, sites, bonus, force_struct, malus);
            } else if (fold_mode === Pose2D.OLIGO_MODE_EXT5P) {
                full_seq = EPars.string_to_sequence_array(this._targetConditions[ii]['oligo_sequence']).concat(seq);
                best_pairs = this._folder.foldSequenceWithBindingSite(full_seq, this._targetPairs[ii], sites, Number(bonus), this._targetConditions[ii]['fold_version']);
            } else {
                full_seq = seq.concat(EPars.string_to_sequence_array(this._targetConditions[ii]['oligo_sequence']));
                best_pairs = this._folder.foldSequenceWithBindingSite(full_seq, this._targetPairs[ii], sites, Number(bonus), this._targetConditions[ii]['fold_version']);
            }

        } else if (this._targetConditions[ii]['type'] === "multistrand") {
            let oligos: any[] = [];
            for (let jj: number = 0; jj < this._targetConditions[ii]['oligos'].length; jj++) {
                oligos.push({
                    seq: EPars.string_to_sequence_array(this._targetConditions[ii]['oligos'][jj]['sequence']),
                    malus: Number(this._targetConditions[ii]['oligos'][jj]['malus'] * 100.0)
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

            if (mfold == null && this._forceSynch === false) {
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
        undo_block.set_pairs(best_pairs);
        undo_block.set_target_oligos(this._targetOligos[ii]);
        undo_block.set_target_oligo(this._targetOligo[ii]);
        undo_block.set_oligo_order(oligo_order);
        undo_block.set_oligos_paired(oligos_paired);
        undo_block.set_target_pairs(this._targetPairs[ii]);
        undo_block.set_target_oligo_order(this._targetOligosOrder[ii]);
        undo_block.set_puzzle_locks(this._poses[ii].puzzleLocks);
        undo_block.set_target_conditions(this._targetConditions[ii]);
        undo_block.set_basics(this._folder);
        this._seqStacks[this._stackLevel][ii] = undo_block;
    }

    private poseEditByTargetEpilog(target_index: number): void {
        // Application.instance.get_modal_container().removeObject(this._asynch_text);
        // Application.instance.remove_lock("FOLDING");
        // Application.instance.set_blocker_opacity(0.35);

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
        let best_pairs: number[] = last_best_pairs = this._seqStacks[this._stackLevel][target_index].get_pairs();
        if (this._stackLevel > 0) {
            last_best_pairs = this._seqStacks[this._stackLevel - 1][target_index].get_pairs();
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

            if (!this._poses[target_index].useLowPerformance) {
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
                    fd.push(this.getCurrentUndoBlock(ii).toJson());
                }
                sol.foldData = fd;

                Eterna.client.updateSolutionFoldData(sol.nodeID, fd).then((datastring: string) => {
                    log.debug(datastring);
                });
            }
        }
    }

    private getCurrentUndoBlock(target_index: number = -1): UndoBlock {
        if (target_index < 0) {
            return this._seqStacks[this._stackLevel][this._curTargetIndex];
        } else {
            return this._seqStacks[this._stackLevel][target_index];
        }
    }

    private setPosesWithUndoBlock(ii: number, undo_block: UndoBlock): void {
        this._poses[ii].sequence = this._puzzle.transformSequence(undo_block.get_sequence(), ii);
        this._poses[ii].puzzleLocks = undo_block.get_puzzle_locks();
    }

    private moveUndoStack(): void {
        for (let ii: number = 0; ii < this._poses.length; ii++) {
            this.setPosesWithUndoBlock(ii, this._seqStacks[this._stackLevel][ii]);
            this._targetPairs[ii] = this._seqStacks[this._stackLevel][ii].get_target_pairs();
            this._targetConditions[ii] = this._seqStacks[this._stackLevel][ii].get_target_conditions();
            this._targetOligo[ii] = this._seqStacks[this._stackLevel][ii].get_target_oligo();
            this._oligoMode[ii] = this._seqStacks[this._stackLevel][ii].get_oligo_mode();
            this._oligoName[ii] = this._seqStacks[this._stackLevel][ii].get_oligo_name();
            this._targetOligos[ii] = this._seqStacks[this._stackLevel][ii].get_target_oligos();
            this._targetOligosOrder[ii] = this._seqStacks[this._stackLevel][ii].get_target_oligo_order();
        }
    }

    private moveUndoStackForward(): void {
        if (this._stackLevel + 1 > this._stackSize - 1) {
            return;
        }
        this.savePosesMarkersContexts();

        let before: number[] = this._puzzle.transformSequence(this.getCurrentUndoBlock(0).get_sequence(), 0);

        this._stackLevel++;
        this.moveUndoStack();

        let after: number[] = this._puzzle.transformSequence(this.getCurrentUndoBlock(0).get_sequence(), 0);
        this.moveHistoryAddMutations(before, after);

        this.updateScore();
        this.transformPosesMarkers();
    }

    private moveUndoStackBackward(): void {
        if (this._stackLevel < 1) {
            return;
        }
        this.savePosesMarkersContexts();

        let before: number[] = this._puzzle.transformSequence(this.getCurrentUndoBlock(0).get_sequence(), 0);

        this._stackLevel--;
        this.moveUndoStack();

        let after: number[] = this._puzzle.transformSequence(this.getCurrentUndoBlock(0).get_sequence(), 0);
        this.moveHistoryAddMutations(before, after);

        this.updateScore();
        this.transformPosesMarkers();
    }

    private moveUndoStackToLastStable(): void {
        this.savePosesMarkersContexts();
        let before: number[] = this._puzzle.transformSequence(this.getCurrentUndoBlock(0).get_sequence(), 0);

        let stack_level: number = this._stackLevel;
        while (this._stackLevel >= 1) {

            if (this.getCurrentUndoBlock(0).get_stable()) {
                this.moveUndoStack();

                let after: number[] = this._puzzle.transformSequence(this.getCurrentUndoBlock(0).get_sequence(), 0);
                this.moveHistoryAddMutations(before, after);

                this.updateScore();
                this.transformPosesMarkers();
                return;
            }

            this._stackLevel--;
        }
        this._stackLevel = stack_level;
    }

    private setShowMenu(show_menu: boolean): void {
        log.debug("TODO: set_show_menu");
        // let m: GameObject = (<GameObject>Application.instance.get_application_gui("Menu"));
        // if (m) m.visible = show_menu;
    }

    private hide_end_curtain(): void {
        for (let pose of this._poses) {
            pose.showTotalEnergy = true;
            pose.clearExplosion();
        }
        // this._mission_cleared.set_animator(new GameAnimatorFader(1, 0, 0.3, true));
        this.disableTools(false);
        this.setShowMenu(true);
    }

    private clearUndoStack(): void {
        this._stackLevel = -1;
        this._stackSize = 0;
        this._seqStacks = [];
    }

    private layoutBars(): void {
        this._scriptbar.display.position = new Point(
            Flashbang.stageWidth - 20 - this._scriptbar.width,
            Flashbang.stageHeight - 129);
    }

    // private on_ctx_menu_item(event: ContextMenuEvent): void {
    //     if (event.target === this._view_options_cmi) {
    //         Application.instance.get_application_gui("View options").open_view_options();
    //     } else if (event.target === this._view_solutions_cmi) {
    //         Application.instance.transit_game_mode(Eterna.GAMESTATE_DESIGN_BROWSER, [this._puzzle.get_node_id()]);
    //     } else if (event.target === this._submit_cmi) {
    //         this.submit_current_pose();
    //     } else if (event.target === this._spec_cmi) {
    //         this.show_spec();
    //     } else if (event.target === this._reset_cmi) {
    //         this.ask_retry();
    //     } else if (event.target === this._copy_cmi) {
    //         Application.instance.copy_to_clipboard(EPars.sequence_array_to_string(this._poses[0].get_sequence()), "Copied the current sequence to the clipboard");
    //     } else if (event.target === this._paste_cmi) {
    //          this.showPasteSequenceDialog();
    //     } else if (event.target === this._beam_cmi) {
    //         let _this: PoseEditMode = this;
    //         _this.transfer_to_puzzlemaker();
    //     }
    // }

    private readonly _puzzle: Puzzle;
    private readonly _initSeq: number[];
    private readonly _isReset: boolean;
    private readonly _initialFolder: Folder;

    private _constraintsLayer: Container;

    private _background: Background;

    private _toolbar: PoseEditToolbar;

    private _folder: Folder;
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
    private _targetPairs: number[][] = [];
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
    private _unstableIndex: number;
    private _constraintsOffset: number;

    private _dockedSpecBox: SpecBox;
    /// Exit button
    private _exitButton: GameButton;

    private _constraintsHead: number = 0;
    private _constraintsFoot: number = 0;
    private _constraintsTop: number = 0;
    private _constraintsBottom: number = 0;
    private _uiHighlight: SpriteObject;

    private _menuitem: GameButton = null;
    /// Context menu items
    // private _view_options_cmi: ContextMenuItem = null;
    // private _view_solutions_cmi: ContextMenuItem = null;
    // private _submit_cmi: ContextMenuItem = null;
    // private _spec_cmi: ContextMenuItem = null;
    // private _reset_cmi: ContextMenuItem = null;
    // private _copy_cmi: ContextMenuItem = null;
    // private _paste_cmi: ContextMenuItem = null;
    // private _beam_cmi: ContextMenuItem = null;
    /// Scripts
    private _scriptbar: ActionBar;
    private _xButton: GameButton;
    private _nidField: Text;
    private _runButton: GameButton;
    private _runStatus: Text;
    private _scriptHooks: boolean = false;
    private _setterHooks: boolean = false;
    /// ROP presets
    private _ropPresets: (() => void)[] = [];
    // Design browser hooks
    private _next_design_cb: () => void = null;
    private _prev_design_cb: () => void = null;
    private _isPlaying: boolean = false;
    // Tutorial Script Extra Functionality
    private _showMissionScreen: boolean = true;
    private _overrideShowConstraints: boolean = true;
    private _ancestorId: number;
    private _rscript: RNAScript;

    // Will be non-null after we submit our solution to the server
    private _submitSolutionRspData: any;
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


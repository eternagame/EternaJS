import * as log from "loglevel";
import {Container, Point, Sprite, Text} from "pixi.js";
import {Align} from "../../../flashbang/core/Align";
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
import {AchievementManager} from "../../achievements/AchievementManager";
import {EPars} from "../../EPars";
import {Eterna} from "../../Eterna";
import {Folder} from "../../folding/Folder";
import {FolderManager} from "../../folding/FolderManager";
import {FoldUtil} from "../../folding/FoldUtil";
import {EternaURL} from "../../net/EternaURL";
import {Oligo, Pose2D} from "../../pose2D/Pose2D";
import {PoseField} from "../../pose2D/PoseField";
import {PoseOp} from "../../pose2D/PoseOp";
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
import {CopySequenceDialog} from "./CopySequenceDialog";
import {MissionClearedPanel} from "./MissionClearedPanel";
import {MissionIntroMode} from "./MissionIntroMode";
import {PasteSequenceDialog} from "./PasteSequenceDialog";
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
    public constructor(puz: Puzzle, init_seq?: number[], is_reset?: boolean) {
        super();
        this._puzzle = puz;
        this._initSeq = init_seq;
        this._isReset = is_reset;
    }

    protected setup(): void {
        super.setup();

        this._background = new Background();
        this.addObject(this._background, this._bgLayer);

        this._is_screenshot_supported = true;

        this._toolbar = new PoseEditToolbar(this._puzzle);
        this.addObject(this._toolbar, this._uiLayer);
        DisplayUtil.positionRelativeToStage(
            this._toolbar.display, Align.CENTER, Align.BOTTOM,
            Align.CENTER, Align.BOTTOM, 20, -20);

        this._toolbar.undo_button.clicked.connect(() => this.move_undo_stack_backward());
        this._toolbar.redo_button.clicked.connect(() => this.move_undo_stack_forward());
        this._toolbar.zoom_out_button.clicked.connect(() => {
            for (let poseField of this._pose_fields) {
                poseField.zoom_out();
            }
        });
        this._toolbar.zoom_in_button.clicked.connect(() => {
            for (let poseField of this._pose_fields) {
                poseField.zoom_in();
            }
        });
        this._toolbar.submit_button.clicked.connect(() => this.submit_current_pose());
        this._toolbar.view_solutions_button.clicked.connect(() => {
            log.debug("TODO: viewSolutions");
            // Application.instance.transit_game_mode(Eterna.GAMESTATE_DESIGN_BROWSER, [this.puzzle.get_node_id()]);
        });
        this._toolbar.retry_button.clicked.connect(() => this.ask_retry());
        this._toolbar.native_button.clicked.connect(() => this.toggle_posestate());
        this._toolbar.target_button.clicked.connect(() => this.toggle_posestate());
        this._toolbar.spec_button.clicked.connect(() => this.show_spec());
        this._toolbar.paste_button.clicked.connect(() =>  this.showPasteSequenceDialog());
        this._toolbar.view_options_button.clicked.connect(() => {
            let mode = this._puzzle.get_puzzle_type() === PuzzleType.EXPERIMENTAL ?
                EternaViewOptionsMode.LAB :
                EternaViewOptionsMode.PUZZLE;
            this.showDialog(new EternaViewOptionsDialog(mode));
        });

        this._toolbar.copy_button.clicked.connect(() => {
            let sequenceString = EPars.sequence_array_to_string(this._poses[0].get_sequence());
            this.showDialog(new CopySequenceDialog(sequenceString));
        });

        this._toolbar.pip_button.clicked.connect(() => {
            this.toggle_pip();
        });

        this._toolbar.puzzleStateToggle.stateChanged.connect((targetIdx) => this.change_target(targetIdx));

        this._toolbar.freeze_button.clicked.connect(() => this.toggle_freeze());
        this._toolbar.palette.targetClicked.connect((targetType) => this.onPaletteTargetSelected(targetType));
        this._toolbar.pair_swap_button.clicked.connect(() => this.on_click_P());
        this._toolbar.hint_button.clicked.connect(() => this.on_click_hint());

        this.regs.add(Eterna.settings.autohideToolbar.connectNotify((value) => {
            this._toolbar.set_toolbar_autohide(value);
        }));

        this._docked_spec_box = new SpecBox(true);
        this._docked_spec_box.display.position = new Point(15, 190);
        this._docked_spec_box.set_size(155, 251);
        this._docked_spec_box.display.visible = false;
        this.addObject(this._docked_spec_box, this._uiLayer);

        let x_button: GameButton = new GameButton()
            .allStates(Bitmaps.ImgMaximize)
            .tooltip("Re-maximize")
            .hotkey(KeyCode.KeyM);
        x_button.display.position = new Point(Flashbang.stageWidth - 22, 5);
        x_button.clicked.connect(() => {
            this._docked_spec_box.display.visible = false;
            this.show_spec();
        });
        this._docked_spec_box.addObject(x_button, this._docked_spec_box.container);

        this._ui_highlight = new SpriteObject();
        this.addObject(this._ui_highlight, this._uiLayer);

        this._constraint_boxes = [];
        this._constraintsLayer = new Container();
        this._uiLayer.addChild(this._constraintsLayer);

        this._exit_button = new GameButton().allStates(Bitmaps.ImgNextInside);
        this._exit_button.display.scale = new Point(0.3, 0.3);
        this._exit_button.display.position = new Point(Flashbang.stageWidth - 85, Flashbang.stageHeight - 60);
        this._exit_button.display.visible = false;
        this.regs.add(this._exit_button.clicked.connect(() => this.exit_puzzle()));

        this._scriptbar = new ActionBar(50);
        this.addObject(this._scriptbar, this._uiLayer);

        this._nid_field = Fonts.arial("", 16).color(0xffffff).build();
        this._nid_field.width = 100;
        this._nid_field.height = 20;

        this._run_button = new GameButton().allStates(Bitmaps.MingFold);

        this._run_status = Fonts.arial("idle", 16).bold().color(0xC0C0C0).build();
        this._run_status.width = 200;
        this._run_status.height = 20;

        this._target_name = Fonts.std_regular("", 18).build();
        this._target_name.visible = false;
        this._uiLayer.addChild(this._target_name);

        // _force_synch = false;

        this._asynch_text = Fonts.arial("folding...", 12).build();
        this._asynch_text.position = new Point(16, 200);

        this.set_puzzle();
    }

    public get toolbar(): PoseEditToolbar {
        return this._toolbar;
    }

    public get constraintsLayer(): Container {
        return this._constraintsLayer;
    }

    protected showPasteSequenceDialog(): void {
        this.showDialog(new PasteSequenceDialog()).closed.connect((sequence) => {
            if (sequence != null) {
                for (let pose of this._poses) {
                    pose.paste_sequence(EPars.string_to_sequence_array(sequence));
                }
            }
        });
    }

    /*override*/
    // public enter_mode(): void {
    //     if (this._is_screenshot_supported) {
    //         if (this._pic_button == null) {
    //             let chatbox_camera: BitmapData = BitmapManager.get_bitmap(BitmapManager.ImgScreenshot);
    //             this._pic_button = new GameButton(14, chatbox_camera);
    //             this._pic_button.set_text("Screenshot");
    //             this._pic_button.scale_icon_to_text();
    //             this._pic_button.set_disabled(this._is_pic_disabled);
    //         }
    //         this._pic_button.visible = true;
    //         this._pic_button.set_click_callback(this.take_picture);
    //         this._pic_button.set_tooltip("Take a screenshot");
    //
    //         this._ll_menu.add_sub_menu_button(0, this._pic_button, true);
    //     }
    //     this.on_enter();
    // }

    public set_next_design_cb(cb: () => void): void {
        this._next_design_cb = cb;
    }

    public set_prev_design_cb(cb: () => void): void {
        this._prev_design_cb = cb;
    }

    public set_puzzle_state(newstate: PuzzleState): void {
        this._puz_state = newstate;
    }

    public set_puzzle_default_mode(default_mode: PoseState): void {
        this._puzzle.set_default_mode(default_mode);
    }

    public rop_change_target(target_index: number): void {
        this.change_target(target_index);
        if (this._toolbar.puzzleStateToggle != null) {
            this._toolbar.puzzleStateToggle.set_state(target_index);
        }
    }

    public rop_set_to_native_mode(): void {
        this.set_to_native_mode();
    }

    public rop_set_to_target_mode(): void {
        this.set_to_target_mode();
    }

    public set_display_score_texts(dis: boolean): void {
        for (let ii: number = 0; ii < this._poses.length; ii++) {
            this._poses[ii].set_display_score_texts(dis);
        }
    }

    public rop_set_display_score_texts(dis: boolean): void {
        let that: PoseEditMode = this;
        let pre = () => {
            that.set_display_score_texts(dis);
        };
        this._rop_presets.push(pre);
    }

    public set_show_numbering(show: boolean): void {
        for (let ii: number = 0; ii < this._poses.length; ii++) {
            this._poses[ii].set_show_numbering(show);
        }
    }

    public rop_set_show_numbering(show: boolean): void {
        let that: PoseEditMode = this;
        let pre = () => {
            that.set_show_numbering(show);
        };
        this._rop_presets.push(pre);
    }

    public set_show_total_energy(show: boolean): void {
        for (let ii: number = 0; ii < this._poses.length; ii++) {
            this._poses[ii].set_show_total_energy(show);
        }
    }

    public rop_set_show_total_energy(show: boolean): void {
        let that: PoseEditMode = this;
        let pre = () => {
            that.set_show_total_energy(show);
        };
        this._rop_presets.push(pre);
    }

    public select_folder(folder_name: string): boolean {
        if (this._folder.get_folder_name() === folder_name) return true;
        let folder: Folder = FolderManager.instance.get_folder(folder_name);
        if (this._puzzle.has_target_type("multistrand") && !folder.can_multifold()) {
            return false;
        }

        this._folder = folder;
        this.folder_updated();
        return true;
    }

    public onPaletteTargetSelected(type: PaletteTargetType): void {
        let baseType: number = GetPaletteTargetBaseType(type);
        this.set_poses_color(baseType);
        this.deselect_all_colorings();
    }

    public on_click_P(): void {
        this.set_poses_color(EPars.RNABASE_PAIR);
        this.deselect_all_colorings();
        this._toolbar.pair_swap_button.toggled.value = true;
    }

    public on_click_hint(): void {
        if (this._hintBoxRef.isLive) {
            this._hintBoxRef.destroyObject();
        } else {
            let hintBox = new GamePanel();
            hintBox.set_panel_title("Hint"); // by " + _puzzle.get_coauthor());

            let hintText = Fonts.arial(this._puzzle.get_hint(), 14).color(0xffffff).wordWrap(true, 400).build();
            hintText.position = new Point(10, 38);
            hintBox.container.addChild(hintText);
            hintBox.set_size(420, hintText.height + 46);

            this._hintBoxRef = this.addObject(hintBox, this._uiLayer);
            hintBox.display.position = new Point(
                Flashbang.stageWidth - 440,
                Flashbang.stageHeight - hintBox.container.height - 90);
        }
    }

    public public_start_countdown(): void {
        this.start_countdown();
    }

    public restart_from(seq: string): void {
        this.clear_undo_stack();

        let restart_cb = (fd: any[]) => {
            // Application.instance.get_modal_container().removeObject(this._asynch_text);
            // Application.instance.remove_lock("FOLDING");
            // Application.instance.set_blocker_opacity(0.35);

            if (fd != null) {
                this._stack_level++;
                this._stack_size = this._stack_level + 1;
                this._seq_stacks[this._stack_level] = [];

                for (let ii = 0; ii < this._poses.length; ii++) {
                    let undo_block: UndoBlock = new UndoBlock([]);
                    undo_block.fromJson(fd[ii]);
                    this._seq_stacks[this._stack_level][ii] = undo_block;
                }

                this.save_poses_markers_contexts();
                this.move_undo_stack();
                this.update_score();
                this.transform_poses_markers();

            } else {
                let seq_arr: number[] = EPars.string_to_sequence_array(seq);
                for (let pose of this._poses) {
                    pose.paste_sequence(seq_arr);
                }
            }
            this.clear_move_tracking(seq);
        };

        let sol: Solution = SolutionManager.instance.get_solution_by_sequence(seq);
        if (sol != null && this._puzzle.has_target_type("multistrand")) {
            this._asynch_text.text = "retrieving...";
            // Application.instance.set_blocker_opacity(0.2);
            // Application.instance.add_lock("FOLDING");
            // Application.instance.get_modal_container().addObject(this._asynch_text);

            sol.query_fold_data().then((result) => restart_cb(result));
        } else {
            restart_cb(null);
        }
    }

    private set_puzzle(): void {
        let pose_fields: PoseField[] = [];

        let target_secstructs: string[] = this._puzzle.get_secstructs();
        let target_conditions: any[] = this._puzzle.get_target_conditions();

        // TSC: this crashes, and doesn't seem to accomplish anything
        // let before_reset: number[] = null;
        // if (is_reset) {
        //     before_reset = this._puzzle.transform_sequence(this.get_current_undo_block(0).get_sequence(), 0);
        // }

        let bind_addbase_cb = (pose: Pose2D, kk: number) => {
            pose.set_add_base_callback((parenthesis: string, mode: number, index: number) => {
                pose.base_shift(parenthesis, mode, index);
                this.pose_edit_by_target(kk);
            });
        };

        let bind_pose_edit = (pose: Pose2D, index: number) => {
            pose.set_pose_edit_callback(() => {
                this.pose_edit_by_target(index);
            });
        };
        let bind_track_moves = (pose: Pose2D, index: number) => {
            pose.set_track_moves_callback((count: number, moves: any[]) => {
                this._move_count += count;
                if (moves) {
                    this._moves.push(moves.slice());
                }
            });
        };

        let bind_mousedown_event = function (pose: Pose2D, index: number): void {
            pose.set_start_mousedown_callback((e: InteractionEvent, closest_dist: number, closest_index: number) => {
                for (let ii: number = 0; ii < pose_fields.length; ++ii) {
                    let pose_field: PoseField = pose_fields[ii];
                    let pose: Pose2D = pose_field.get_pose();
                    if (index === ii) {
                        pose.on_pose_mouse_down(e, closest_index);
                    } else {
                        pose.on_pose_mouse_down_propagate(e, closest_index);
                    }
                }
            });
        };

        for (let ii = 0; ii < target_conditions.length; ii++) {
            let pose_field: PoseField = new PoseField(true);
            let pose: Pose2D = pose_field.get_pose();
            bind_addbase_cb(pose, ii);
            bind_pose_edit(pose, ii);
            bind_track_moves(pose, ii);
            bind_mousedown_event(pose, ii);
            pose_fields.push(pose_field);
        }

        this.set_pose_fields(pose_fields);

        this._is_databrowser_mode = false;
        // if (this.root.loaderInfo.parameters.databrowser
        //     && this.root.loaderInfo.parameters.databrowser === "true") {
        //     this._is_databrowser_mode = true;
        // }

        for (let ii = 0; ii < target_secstructs.length; ii++) {
            this._target_pairs.push(EPars.parenthesis_to_pair_array(target_secstructs[ii]));
            this._target_conditions.push(target_conditions[ii]);
            this._target_oligos.push(null);
            this._target_oligos_order.push(null);
            this._target_oligo.push(null);
            this._oligo_mode.push(null);
            this._oligo_name.push(null);
            if (target_conditions[ii] && target_conditions[ii]['oligo_sequence']) {
                this._target_oligo[ii] = EPars.string_to_sequence_array(target_conditions[ii]['oligo_sequence']);
                this._oligo_mode[ii] = target_conditions[ii]['fold_mode'] == null ? Pose2D.OLIGO_MODE_DIMER : target_conditions[ii]['fold_mode'];
                this._oligo_name[ii] = target_conditions[ii]['oligo_name'];
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
                this._target_oligos[ii] = ndefs;
            }
        }

        this._exit_button.display.visible = false;
        this.addObject(this._exit_button, this.modeSprite);

        let puzzleIcon = new Sprite(BitmapManager.get_bitmap(Bitmaps.NovaPuzzleImg));
        puzzleIcon.position = new Point(11, 8);
        this.modeSprite.addChild(puzzleIcon);

        let puzzleTitle = new HTMLTextObject(this._puzzle.get_puzzle_name(true))
            .font(Fonts.ARIAL)
            .fontSize(14)
            .bold()
            .selectable(false)
            .color(0xffffff);
        puzzleTitle.hideWhenModeInactive();
        this.addObject(puzzleTitle, this.modeSprite);
        DisplayUtil.positionRelative(
            puzzleTitle.display, Align.LEFT, Align.CENTER,
            puzzleIcon, Align.RIGHT, Align.CENTER, 3, 0);

        this._constraintsLayer.visible = true;

        if (!this._puzzle.is_pallete_allowed()) {
            for (let pose of this._poses) {
                pose.set_current_color(-1);
            }
        } else {
            this._toolbar.palette.clickTarget(PaletteTargetType.A);
        }

        let num_constraints: number = 0;
        let constraints: string[] = [];
        if (this._puzzle.get_constraints() != null) {
            num_constraints = this._puzzle.get_constraints().length;
            constraints = this._puzzle.get_constraints();
        }

        this._constraint_boxes = [];
        this._unstable_index = -1;

        if (num_constraints > 0) {
            if (num_constraints % 2 !== 0) {
                throw new Error("Wrong constraints length");
            }

            for (let ii = 0; ii < num_constraints / 2; ii++) {
                let newbox: ConstraintBox = new ConstraintBox(ConstraintBoxType.DEFAULT);
                this._constraint_boxes.push(newbox);
                this.addObject(newbox, this._constraintsLayer);
            }

            this._constraint_shape_boxes = [];
            this._constraint_shape_boxes.push(null);

            this._constraint_antishape_boxes = [];
            this._constraint_antishape_boxes.push(null);
            if (this._target_pairs.length > 1) {
                for (let ii = 1; ii < this._target_pairs.length; ii++) {
                    this._constraint_shape_boxes[ii] = null;
                    this._constraint_antishape_boxes[ii] = null;
                    for (let jj = 0; jj < num_constraints; jj += 2) {
                        if (constraints[jj] === ConstraintType.SHAPE) {
                            if (Number(constraints[jj + 1]) === ii) {
                                let newbox = new ConstraintBox(ConstraintBoxType.DEFAULT);
                                this._constraint_shape_boxes[ii] = newbox;
                                this.addObject(newbox, this._constraintsLayer);
                            }
                        } else if (constraints[jj] === ConstraintType.ANTISHAPE) {
                            if (Number(constraints[jj + 1]) === ii) {
                                let newbox = new ConstraintBox(ConstraintBoxType.DEFAULT);
                                this._constraint_antishape_boxes[ii] = newbox;
                                this.addObject(newbox, this._constraintsLayer);
                            }
                        }
                    }
                }
            }
        }

        for (let box of this._constraint_boxes) {
            box.display.visible = false;
        }

        let pairs: number[] = EPars.parenthesis_to_pair_array(this._puzzle.get_secstruct());

        /// Setup Action bar
        this._scriptbar.clear_items(false);

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

        this.layout_bars();
        this.layout_constraints();

        this._folder = FolderManager.instance.get_folder(this._puzzle.get_folder());

        this._folder_button = new GameButton()
            .allStates(Bitmaps.ShapeImg)
            .label(this._folder.get_folder_name(), 22)
            .tooltip("Select the folding engine.");
        this._folder_button.display.position = new Point(17, 160);
        this._folder_button.display.scale = new Point(0.5, 0.5);
        this.addObject(this._folder_button, this._uiLayer);
        if (this._puzzle.get_puzzle_type() === PuzzleType.EXPERIMENTAL) {
            this._folder_button.clicked.connect(() => this.change_folder());
            this.regs.add(Eterna.settings.multipleFoldingEngines.connectNotify((multiEngine) => {
                this._folder_button.display.visible = multiEngine;
            }));
        } else {
            this._folder_button.display.visible = false;
        }

        if (this._folder.can_score_structures()) {
            for (let pose of this._poses) {
                pose.set_score_visualization(this._folder);
            }
        } else {
            for (let pose of this._poses) {
                pose.set_score_visualization(null);
            }
        }

        for (let ii = 0; ii < this._poses.length; ii++) {
            let seq: number[] = this._initSeq;

            if (seq == null) {
                seq = this._puzzle.get_beginning_sequence(ii);
                if (this._puzzle.get_puzzle_type() === PuzzleType.CHALLENGE && !this._isReset) {
                    let saved_seq: number[] = this._puzzle.get_saved_sequence();
                    if (saved_seq != null) {
                        if (saved_seq.length === seq.length) {
                            seq = saved_seq;
                        }
                    }
                }
            } else {
                if (this._puzzle.get_puzzle_type() === PuzzleType.EXPERIMENTAL && this._puzzle.is_using_tails()) {
                    seq = Puzzle.probe_tail(seq);
                }
            }

            this._poses[ii].set_sequence(this._puzzle.transform_sequence(seq, ii));
            if (this._puzzle.get_barcode_indices() != null) {
                this._poses[ii].set_barcodes(this._puzzle.get_barcode_indices());
            }
            this._poses[ii].set_oligos(this._target_oligos[ii], this._target_oligos_order[ii]);
            this._poses[ii].set_oligo(this._target_oligo[ii], this._oligo_mode[ii], this._oligo_name[ii]);
            this._poses[ii].set_pairs(this._target_pairs[ii]);
            if (this._target_conditions != null && this._target_conditions[ii] != null) {
                this._poses[ii].set_struct_constraints(this._target_conditions[ii]['structure_constraints']);
            }

            this._poses[ii].set_puzzle_locks(this._puzzle.get_puzzle_locks());
            this._poses[ii].set_shift_limit(this._puzzle.get_shift_limit());
        }

        this.clear_undo_stack();

        /// Setup Puzzle events
        // this._puzzle_events.set_events(TutorialManager.get_events(this._puzzle.get_node_id()), this.get_ui_pos, this.run_action);

        this.set_puzzle_state(PuzzleState.SETUP);
        this.disable_tools(true);

        // reset lineage for experimental targets
        this.set_ancestor_id(0);

        let autoloaded: boolean = false;

        if (!this._isReset) {
            this.autoload_data(); //Does nothing if no data saved, no need to load timer
            // re-register script APIs
            this._script_hooks = false;
            this._setter_hooks = false;
        }

        this._pose_edit_by_target_cb = () => {
            if (this._force_synch) {
                this.set_puzzle_epilog(this._initSeq, this._isReset);
            } else {
                this._op_queue.push(new PoseOp(
                    this._target_pairs.length,
                    () => this.set_puzzle_epilog(this._initSeq, this._isReset)));
            }
            this._pose_edit_by_target_cb = null;
        };

        if (!autoloaded) {
            this.pose_edit_by_target(0);
        }

        // Setup RScript and execute the ROPPRE ops
        this._rscript = new RNAScript(this._puzzle, this);
        this._rscript.Tick();

        // RScript can set our initial poseState
        this._pose_state = this._is_databrowser_mode ? PoseState.NATIVE : this._puzzle.default_mode();
    }

    public get_folder(): Folder {
        return this._folder;
    }

    public register_script_callbacks(): void {
        if (this._script_hooks) {
            return;
        }
        this._script_hooks = true;

        let puz: Puzzle = this._puzzle;
        let folder: Folder = this._folder;

        ExternalInterface.addCallback("get_sequence_string", (): string => {
            // this.trace_js("get_sequence_string() called");
            return this.get_pose(0).get_sequence_string();
        });

        ExternalInterface.addCallback("get_full_sequence", (indx: number): string => {
            // this.trace_js("get_full_sequence() called");
            if (indx < 0 || indx >= this._poses.length) {
                return null;
            } else {
                return EPars.sequence_array_to_string(this.get_pose(indx).get_full_sequence());
            }
        });

        ExternalInterface.addCallback("get_locks", (): boolean[] => {
            // this.trace_js("get_locks() called");
            let pose: Pose2D = this.get_pose(0);
            return pose.get_puzzle_locks().slice(0, pose.get_sequence().length);
        });

        ExternalInterface.addCallback("get_targets", (): any[] => {
            // this.trace_js("get_targets() called");
            let conditions: any[] = puz.get_target_conditions();
            if (conditions.length === 0) conditions.push(null);
            for (let ii: number = 0; ii < conditions.length; ii++) {
                if (conditions[ii] == null) {
                    conditions[ii] = {};
                    conditions[ii]['type'] = "single";
                    conditions[ii]['secstruct'] = puz.get_secstruct(ii);
                }
            }
            return JSON.parse(JSON.stringify(conditions));
        });

        ExternalInterface.addCallback("get_native_structure", (indx: number): string => {
            if (indx < 0 || indx >= this._poses.length) return null;
            let native_pairs: any[] = this.get_current_undo_block(indx).get_pairs();
            return EPars.pairs_array_to_parenthesis(native_pairs);
        });

        ExternalInterface.addCallback("get_full_structure", (indx: number): string => {
            if (indx < 0 || indx >= this._poses.length) {
                return null;
            }

            let native_pairs: number[] = this.get_current_undo_block(indx).get_pairs();
            let seq_arr: number[] = this.get_pose(indx).get_full_sequence();
            return EPars.pairs_array_to_parenthesis(native_pairs, seq_arr);
        });

        ExternalInterface.addCallback("get_free_energy", (indx: number): number => {
            if (indx < 0 || indx >= this._poses.length) {
                return Number.NaN;
            }
            return this.get_current_undo_block(indx).get_param(UndoBlockParam.FE);
        });

        ExternalInterface.addCallback("get_constraints", (): any[] => {
            // this.trace_js("get_constraints() called");
            return JSON.parse(JSON.stringify(puz.get_constraints()));
        });

        ExternalInterface.addCallback("check_constraints", (): boolean => {
            // this.trace_js("check_constraints() called");
            return this.checkConstraints(false);
        });

        ExternalInterface.addCallback("constraint_satisfied", (idx: number): boolean => {
            // this.trace_js("constraint_satisfied() called");
            this.checkConstraints(true);
            if (idx >= 0 && idx < this.get_constraint_count()) {
                let o: ConstraintBox = this.get_constraint(idx);
                return o.is_satisfied();
            } else {
                return false;
            }
        });

        ExternalInterface.addCallback("get_tracked_indices", (): number[] => {
            // this.trace_js("get_tracked_indices() called");
            return this.get_pose(0).get_tracked_indices();
        });

        ExternalInterface.addCallback("get_barcode_indices", (): number[] => {
            // this.trace_js("get_barcode_indices() called");
            return puz.get_barcode_indices();
        });

        ExternalInterface.addCallback("is_barcode_available", (seq: string): boolean => {
            // this.trace_js("is_barcode_available() called");
            return SolutionManager.instance.check_redundancy_by_hairpin(seq);
        });

        ExternalInterface.addCallback("current_folder", (): string => {
            // this.trace_js("current_folder() called");
            return this._folder.get_folder_name();
        });

        ExternalInterface.addCallback("fold", (seq: string, constraint: string = null): string => {
            // this.trace_js("fold() called");
            let seq_arr: number[] = EPars.string_to_sequence_array(seq);
            let folded: number[] = folder.fold_sequence(seq_arr, null, constraint);
            return EPars.pairs_array_to_parenthesis(folded);
        });

        ExternalInterface.addCallback("fold_with_binding_site", (seq: string, site: any[], bonus: number): string => {
            // this.trace_js("fold_with_binding_site() called");
            let seq_arr: number[] = EPars.string_to_sequence_array(seq);
            let folded: number[] = folder.fold_sequence_with_binding_site(seq_arr, null, site, Math.floor(bonus * 100), 2.5);
            return EPars.pairs_array_to_parenthesis(folded);
        });

        ExternalInterface.addCallback("energy_of_structure", (seq: string, secstruct: string): number => {
            // this.trace_js("energy_of_structure() called");
            let seq_arr: number[] = EPars.string_to_sequence_array(seq);
            let struct_arr: number[] = EPars.parenthesis_to_pair_array(secstruct);
            let free_energy: number = folder.score_structures(seq_arr, struct_arr);
            return 0.01 * free_energy;
        });

        ExternalInterface.addCallback("pairing_probabilities", (seq: string, secstruct: string = null): number[] => {
            // this.trace_js("pairing_probabilities() called");
            let seq_arr: number[] = EPars.string_to_sequence_array(seq);
            let folded: number[];
            if (secstruct) {
                folded = EPars.parenthesis_to_pair_array(secstruct);
            } else {
                folded = folder.fold_sequence(seq_arr, null, null);
            }
            let pp: number[] = folder.get_dot_plot(seq_arr, folded);
            return pp.slice();
        });

        ExternalInterface.addCallback("cofold", (seq: string, oligo: string, malus: number = 0., constraint: string = null): string => {
            // this.trace_js("cofold() called");
            let len: number = seq.length;
            let cseq: string = seq + "&" + oligo;
            let seq_arr: number[] = EPars.string_to_sequence_array(cseq);
            let folded: number[] = folder.cofold_sequence(seq_arr, null, Math.floor(malus * 100), constraint);
            return EPars.pairs_array_to_parenthesis(folded.slice(0, len))
                + "&" + EPars.pairs_array_to_parenthesis(folded.slice(len));
        });

        if (this._puzzle.get_puzzle_type() === PuzzleType.EXPERIMENTAL) {
            ExternalInterface.addCallback("select_folder", (folder_name: string): boolean => {
                // this.trace_js("select_folder() called");
                let ok: boolean = this.select_folder(folder_name);
                folder = this.get_folder();
                return ok;
            });

            ExternalInterface.addCallback("load_parameters_from_buffer", (str: string): boolean => {
                log.info("TODO: load_parameters_from_buffer");
                return false;
                // // this.trace_js("load_parameters_from_buffer() called");
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
            // this.trace_js("sparks_effect() called");
            // FIXME: check PiP mode and handle accordingly
            for (let ii: number = 0; ii < this.number_of_pose_fields(); ii++) {
                let pose: Pose2D = this.get_pose(ii);
                pose.praise_sequence(from, to);
            }
        });
    }

    public register_setter_callbacks(): void {
        if (this._setter_hooks) {
            return;
        }
        this._setter_hooks = true;

        ExternalInterface.addCallback("set_sequence_string", (seq: string): boolean => {
            // this.trace_js("set_sequence_string() called");
            let seq_arr: number[] = EPars.string_to_sequence_array(seq);
            if (seq_arr.indexOf(EPars.RNABASE_UNDEFINED) >= 0 || seq_arr.indexOf(EPars.RNABASE_CUT) >= 0) {
                log.info("Invalid characters in " + seq);
                return false;
            }
            let force_sync: boolean = this._force_synch;
            this._force_synch = true;
            for (let ii: number = 0; ii < this.number_of_pose_fields(); ii++) {
                let pose: Pose2D = this.get_pose(ii);
                pose.paste_sequence(seq_arr);
            }
            this._force_synch = force_sync;
            this.move_history_add_sequence("paste", seq);
            return true;
        });

        ExternalInterface.addCallback("set_tracked_indices", (marks: number[]): void => {
            // this.trace_js("set_tracked_indices() called");
            for (let ii: number = 0; ii < this.number_of_pose_fields(); ii++) {
                let pose: Pose2D = this.get_pose(ii);
                pose.clear_tracking();
                for (let mark of marks) {
                    pose.black_mark(mark);
                }
            }
        });

        ExternalInterface.addCallback("set_design_title", (design_title: string): void => {
            log.info("TODO: set_design_title");
            // this.trace_js("set_design_title() called");
            // Application.instance.get_application_gui("Design Name").set_text(design_title);
            // Application.instance.get_application_gui("Design Name").visible = true;
            this.clear_undo_stack();
            this.pose_edit_by_target(0);
        });
    }

    public on_click_run(): void {
        let nid: string = this._nid_field.text;
        if (nid.length === 0) {
            return;
        }

        this._run_status.style.fill = 0xC0C0C0;
        this._run_status.text = "running...";

        // Application.instance.add_lock("LOCK_SCRIPT");

        // register callbacks
        this.register_script_callbacks();
        this.register_setter_callbacks();

        ExternalInterface.addCallback("set_script_status", (txt: string): void => {
            // this.trace_js("set_script_status() called");
            this._run_status.style.fill = 0xC0C0C0;
            this._run_status.text = txt;
        });

        ExternalInterface.addCallback("end_" + nid, (ret: any): void => {
            log.info("end_" + nid + "() called");
            log.info(ret);
            if (typeof(ret['cause']) === "string") {
                this._run_status.style.fill = (ret['result'] ? 0x00FF00 : 0xFF0000);
                this._run_status.text = ret['cause'];
                // restore
                // FIXME: other clean-ups? should unregister callbacks?
                // Application.instance.remove_lock("LOCK_SCRIPT");
            } else {
                // leave the script running asynchronously
            }
        });

        // run
        log.info("running script " + nid);
        ExternalInterface.call("ScriptInterface.evaluate_script_with_nid", nid, {}, null);
        log.info("launched");
    }

    public rop_layout_bars(): void {
        this.layout_bars();
    }

    public layout_constraints(): void {
        let min_x: number = this._constraints_offset + 17;
        let rel_x: number;
        if (this._target_pairs == null) return;
        let n: number = this._target_pairs.length;
        if (n < 2) return;
        for (let ii: number = 1; ii < n; ii++) {
            rel_x = (ii / n) * Flashbang.stageWidth + 17;
            if (rel_x < min_x) rel_x = min_x;
            if (this._constraint_shape_boxes[ii]) {
                this._constraint_shape_boxes[ii].display.position = new Point(rel_x, 35);
                min_x = rel_x + 77;
            }
            if (this._constraint_antishape_boxes[ii]) {
                this._constraint_antishape_boxes[ii].display.position = new Point(rel_x + 77, 35);
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
                this.show_spec();
                handled = true;
            } else if (ctrl && key === KeyCode.KeyZ) {
                this.move_undo_stack_to_last_stable();
                handled = true;
            } else if (this._stack_level === 0 && key === KeyCode.KeyD && this._next_design_cb != null) {
                this._next_design_cb();
                handled = true;
            } else if (this._stack_level === 0 && key === KeyCode.KeyU && this._prev_design_cb != null) {
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
            this._folder_button.label(this._puzzle.get_folder());
            this._folder_button.display.visible = true;
        } else {
            this._folder_button.display.visible = false;
        }
    }

    /*override*/
    public set_toolbar_autohide(auto: boolean): void {
        this._toolbar.set_toolbar_autohide(auto);
    }

    /*override*/
    public update(dt: number): void {
        // process queued asynchronous operations (folding)
        const startTime = new Date().getTime();
        let elapsed: number = 0;
        while (this._op_queue.length > 0 && elapsed < 50) { // FIXME: arbitrary
            let op: PoseOp = this._op_queue.shift();
            op.fn();
            if (op.sn) {
                this._asynch_text.text =
                    "folding " + op.sn +
                    " of " + this._target_pairs.length +
                    " (" + this._op_queue.length + ")";
            }

            elapsed = new Date().getTime() - startTime;
        }

        this._rscript.Tick();

        super.update(dt);
    }

    public is_playing(): boolean {
        return this._is_playing;
    }

    public set_show_mission_screen(do_show: boolean): void {
        this._show_mission_screen = do_show;
    }

    public set_show_constraints(do_show: boolean): void {
        this._override_show_constraints = do_show;
        if (this._constraintsLayer != null) {
            this._constraintsLayer.visible = this._constraintsLayer.visible && this._override_show_constraints;
        }
    }

    public get_constraint_count(): number {
        return this._constraint_boxes.length;
    }

    public get_constraint(i: number): ConstraintBox {
        return this._constraint_boxes[this._constraint_boxes.length - i - 1];
    }

    public get_shape_box(i: number): ConstraintBox {
        return this._constraint_boxes[i];
    }

    // public get_switch_bar(): ToggleBar {
    //     return this._toggle_bar;
    // }

    public set_ancestor_id(id: number): void {
        this._ancestor_id = id;
    }

    /*override*/
    protected on_set_pip(pip_mode: boolean): void {
        Eterna.settings.pipEnabled.value = pip_mode;

        if (pip_mode) {
            this._toolbar.puzzleStateToggle.display.visible = false;
            this._target_name.visible = false;

            for (let ii = 0; ii < this._poses.length; ii++) {
                this.set_pose_target(ii, ii);
            }

            this.display_constraint_boxes(false, true);

            if (this._pose_state === PoseState.NATIVE) {
                this.set_to_native_mode();
            } else if (this._pose_state === PoseState.TARGET) {
                this.set_to_target_mode();
            } else {
                this.set_to_frozen_mode();
            }

            let min_zoom: number = -1;
            for (let pose of this._poses) {
                min_zoom = Math.max(min_zoom, pose.compute_default_zoom_level());
            }

            for (let pose of this._poses) {
                pose.set_zoom_level(min_zoom);
            }

        } else {
            this._toolbar.puzzleStateToggle.display.visible = true;
            this._target_name.visible = true;

            this.change_target(this._current_target_index);
            this._poses[0].set_zoom_level(this._poses[0].compute_default_zoom_level(), true, true);
        }
    }

    /*override*/
    protected on_resize(): void {
        this.layout_bars();
        this.layout_constraints();

        this._docked_spec_box.set_size(Flashbang.stageWidth, Flashbang.stageHeight - 340);
        let s: number = this._docked_spec_box.getPlotSize();
        this._docked_spec_box.set_size(s + 55, s * 2 + 51);
    }

    /*override*/
    protected enter(): void {
        log.debug("TODO: enter()");
        // if (this._puzzle.get_puzzle_type() !== PuzzleType.EXPERIMENTAL) {
        //     Application.instance.get_application_gui("View options").set_advanced(0);
        // }
        // //let _this:PoseEditMode = this;
        // //_menuitem = Application.instance.get_application_gui("Menu").add_sub_item_cb("Beam to puzzlemaker", "Puzzle", function () :void {
        // //	_this.transfer_to_puzzlemaker();
        // //});
        //
        // // Context menus
        //
        // let my_menu: ContextMenu = new ContextMenu();
        // my_menu.hideBuiltInItems();
        //
        // this._view_options_cmi = new ContextMenuItem("Preferences");
        // my_menu.customItems.push(this._view_options_cmi);
        // this._view_options_cmi.addEventListener(ContextMenuEvent.MENU_ITEM_SELECT, this.on_ctx_menu_item);
        //
        // if (this._puzzle.get_puzzle_type() === PuzzleType.EXPERIMENTAL) {
        //     this._view_solutions_cmi = new ContextMenuItem("Design browser");
        //     my_menu.customItems.push(this._view_solutions_cmi);
        //     this._view_solutions_cmi.addEventListener(ContextMenuEvent.MENU_ITEM_SELECT, this.on_ctx_menu_item);
        //
        //     this._submit_cmi = new ContextMenuItem("Submit");
        //     my_menu.customItems.push(this._submit_cmi);
        //     this._submit_cmi.addEventListener(ContextMenuEvent.MENU_ITEM_SELECT, this.on_ctx_menu_item);
        //
        //     this._spec_cmi = new ContextMenuItem("Specs");
        //     my_menu.customItems.push(this._spec_cmi);
        //     this._spec_cmi.addEventListener(ContextMenuEvent.MENU_ITEM_SELECT, this.on_ctx_menu_item);
        // }
        //
        // this._reset_cmi = new ContextMenuItem("Reset");
        // my_menu.customItems.push(this._reset_cmi);
        // this._reset_cmi.addEventListener(ContextMenuEvent.MENU_ITEM_SELECT, this.on_ctx_menu_item);
        //
        // this._copy_cmi = new ContextMenuItem("Copy sequence");
        // my_menu.customItems.push(this._copy_cmi);
        // this._copy_cmi.addEventListener(ContextMenuEvent.MENU_ITEM_SELECT, this.on_ctx_menu_item);
        //
        // this._paste_cmi = new ContextMenuItem("Paste sequence");
        // my_menu.customItems.push(this._paste_cmi);
        // this._paste_cmi.addEventListener(ContextMenuEvent.MENU_ITEM_SELECT, this.on_ctx_menu_item);
        //
        // this._beam_cmi = new ContextMenuItem("Beam to puzzlemaker");
        // my_menu.customItems.push(this._beam_cmi);
        // this._beam_cmi.addEventListener(ContextMenuEvent.MENU_ITEM_SELECT, this.on_ctx_menu_item);
        //
        // this.contextMenu = my_menu;

        super.enter();
    }

    /*override*/
    // protected on_leave(): void {
    //     Application.instance.get_application_gui("Design Name").visible = false;
    //     if (this._menuitem) Application.instance.get_application_gui("Menu").remove_sub_item("eterna.Puzzle", this._menuitem);
    // }

    /*override*/
    // protected get_screenshot(): BitmapData {
    //     let w: number = 0;
    //     let h: number = 0;
    //     let imgs: any[] = [];
    //     let ii: number;
    //     let img: BitmapData;
    //
    //     if (this._is_pip_mode) {
    //         for (ii = 0; ii < this._poses.length; ii++) {
    //             img = this._poses[ii].get_canvas();
    //             w += img.width;
    //             h = Math.max(img.height, h);
    //             imgs.push(img);
    //         }
    //     } else {
    //         img = this._poses[0].get_canvas();
    //         w += img.width;
    //         h = Math.max(img.height, h);
    //         imgs.push(img);
    //     }
    //
    //     let bd: BitmapData = new BitmapData(w, h, false, 0x061A34);
    //
    //     let hub: Text = new Text(Fonts.arial(12, false));
    //     hub.set_pos(new UDim(1, 0, 3, -3));
    //     let puzzle_id: number = this._puzzle.get_node_id();
    //     hub.set_text("Player: " + Application.instance.get_player_name() + "\n" +
    //         "Puzzle ID: " + puzzle_id + "\n" +
    //         "Puzzle Title: " + this._puzzle.get_puzzle_name() + "\n" +
    //         "Mode: " + (this._native_button.get_selected() === true ? "NativeMode" : "TargetMode"));
    //
    //     let w_walker: number = 0;
    //     for (ii = 0; ii < imgs.length; ii++) {
    //         img = imgs[ii];
    //         let mat: Matrix = new Matrix();
    //         mat.translate(w_walker, 0);
    //         w_walker += img.width;
    //         bd.draw(img, mat, null, "add", null, false);
    //     }
    //
    //     bd.draw(hub);
    //
    //     return bd;
    // }

    private on_click_addbase(): void {
        for (let pose of this._poses) {
            pose.set_current_color(EPars.RNABASE_ADD_BASE);
        }
        this.deselect_all_colorings();
    }

    private on_click_addpair(): void {
        for (let pose of this._poses) {
            pose.set_current_color(EPars.RNABASE_ADD_PAIR);
        }

        this.deselect_all_colorings();
    }

    private on_click_delete(): void {
        for (let pose of this._poses) {
            pose.set_current_color(EPars.RNABASE_DELETE);
        }

        this.deselect_all_colorings();
    }

    private on_click_lock(): void {
        for (let pose of this._poses) {
            pose.set_current_color(EPars.RNABASE_LOCK);
        }

        this.deselect_all_colorings();
    }

    private on_click_binding_site(): void {
        for (let pose of this._poses) {
            pose.set_current_color(EPars.RNABASE_BINDING_SITE);
        }

        this.deselect_all_colorings();
    }

    private exit_puzzle(): void {
        if (this._submitSolutionRspData == null) {
            throw new Error("exit_puzzle was called before we submitted a solution");
        }
        this.showMissionClearedPanel(this._submitSolutionRspData);
    }

    private ask_retry(): void {
        const PROMPT: string = "Do you really want to reset?\nResetting will clear your undo stack.";
        this.showConfirmDialog(PROMPT).closed.connect((confirmed) => {
            if (confirmed) {
                this.retry();
            }
        });
    }

    private retry(): void {
        // Application.instance.get_application_gui("Design Name").set_text("");
        this.reset_autosave_data();
        this._puzzle.set_temporary_constraints(null);
        this.modeStack.changeMode(new PoseEditMode(this._puzzle, null, false));
    }

    private change_target(target_index: number): void {
        this._current_target_index = target_index;

        if (this._target_conditions && this._target_conditions[this._current_target_index]) {
            if (this._target_conditions[this._current_target_index]['state_name'] != null) {
                this._target_name.text = this._target_conditions[this._current_target_index]['state_name'];
            }
        }

        if (this._pose_state === PoseState.NATIVE) {
            this.set_to_native_mode();
        } else {
            this.set_pose_target(0, this._current_target_index);
            this.set_to_target_mode();
        }
    }

    private get_forced_highlights(target_index: number): number[] {
        let elems: number[] = null;

        if (this._target_conditions) {
            let max_len: number = this._poses[target_index].get_sequence().length;
            for (let ii: number = 0; ii < this._poses.length; ii++) {
                if (ii === target_index || this._target_conditions[ii]['force_struct'] == null) {
                    continue;
                }

                if (elems == null) {
                    elems = [];
                }
                let curr: number = 1;
                let forced: number[] = EPars.parenthesis_to_forced_array(this._target_conditions[ii]['force_struct']);
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

    private set_pose_target(pose_index: number, target_index: number): void {
        if (this._target_conditions[target_index] != null) {
            this._poses[pose_index].set_sequence(this._puzzle.transform_sequence(this._poses[target_index].get_sequence(), target_index));
            let tc_type: string = this._target_conditions[target_index]['type'];

            if (tc_type === "multistrand") {
                let odefs: OligoDef[] = this._target_conditions[target_index]['oligos'];
                let ndefs: Oligo[] = [];
                for (let ii: number = 0; ii < odefs.length; ii++) {
                    ndefs.push({
                        sequence: EPars.string_to_sequence_array(odefs[ii].sequence),
                        malus: odefs[ii].malus,
                        name: odefs[ii]['name']
                    });
                }
                this._poses[pose_index].set_oligos(ndefs, this._target_oligos_order[target_index]);
            } else {
                this._poses[pose_index].set_oligos(null);
            }

            if (Puzzle.is_oligo_type(tc_type)) {
                let fold_mode: number = this._target_conditions[target_index]['fold_mode'] == null ? Pose2D.OLIGO_MODE_DIMER : this._target_conditions[target_index]['fold_mode'];
                this._poses[pose_index].set_oligo(EPars.string_to_sequence_array(this._target_conditions[target_index]['oligo_sequence']), fold_mode,
                    this._target_conditions[target_index]['oligo_name']);
                this._poses[pose_index].set_oligo_malus(this._target_conditions[target_index]['malus']);
            } else {
                this._poses[pose_index].set_oligo(null);
            }

            if (Puzzle.is_aptamer_type(tc_type)) {
                this._poses[pose_index].set_molecular_binding(this._target_conditions[target_index]['site'], this._target_conditions[target_index]['binding_pairs'], this._target_conditions[target_index]['bonus'] / 100.0);
            } else {
                this._poses[pose_index].set_molecular_binding(null, null, null);
            }

            let forced_struct: number[] = null;
            if (this._target_conditions[target_index]['force_struct'] != null) {
                forced_struct = EPars.parenthesis_to_forced_array(this._target_conditions[target_index]['force_struct']);
            }
            this._poses[pose_index].set_forced_struct(forced_struct);

            this._poses[pose_index].set_struct_constraints(this._target_conditions[target_index]['structure_constraints']);

        } else {
            this._poses[pose_index].set_molecular_binding(null, null, 0);
            this._poses[pose_index].set_forced_struct(null);
            this._poses[pose_index].set_struct_constraints(null);
            this._poses[pose_index].set_oligos(null);
            this._poses[pose_index].set_oligo(null);
        }
        this._poses[pose_index].set_forced_highlights(this.get_forced_highlights(target_index));

        if (this._puzzle.get_node_id() === 2390140) {
            if (target_index === 1) {
                this._poses[pose_index].set_aux_info(null);
            } else {
                this._poses[pose_index].set_aux_info({cleaving_site: 28});
            }
        }
    }

    private save_poses_markers_contexts(): void {
        for (let pose of this._poses) {
            pose.save_markers_context();
        }
    }

    private transform_poses_markers(): void {
        for (let pose of this._poses) {
            pose.transform_markers();
        }
    }

    private set_to_native_mode(trigger_modechange_event: boolean = true): void {
        this._pose_state = PoseState.NATIVE;

        this._toolbar.target_button.toggled.value = false;
        this._toolbar.native_button.toggled.value = true;
        this._toolbar.target_button.hotkey(KeyCode.Space);
        this._toolbar.native_button.hotkey(null);

        this.save_poses_markers_contexts();
        this._paused = false;
        this.update_score();
        this.transform_poses_markers();
    }

    private set_to_target_mode(trigger_modechange_event: boolean = true): void {
        this._pose_state = PoseState.TARGET;

        this._toolbar.target_button.toggled.value = true;
        this._toolbar.native_button.toggled.value = false;
        this._toolbar.native_button.hotkey(KeyCode.Space);
        this._toolbar.target_button.hotkey(null);

        this.save_poses_markers_contexts();

        if (this._is_pip_mode) {
            for (let ii = 0; ii < this._poses.length; ii++) {
                this._poses[ii].set_oligos(this._target_oligos[ii], this._target_oligos_order[ii]);
                this._poses[ii].set_oligo(this._target_oligo[ii], this._oligo_mode[ii], this._oligo_name[ii]);
                this._poses[ii].set_pairs(this._target_pairs[ii]);
                if (this._target_conditions != null && this._target_conditions[ii] != null) {
                    this._poses[ii].set_struct_constraints(this._target_conditions[ii]['structure_constraints']);
                }
            }
        } else {
            this._poses[0].set_oligos(this._target_oligos[this._current_target_index], this._target_oligos_order[this._current_target_index]);
            this._poses[0].set_oligo(this._target_oligo[this._current_target_index], this._oligo_mode[this._current_target_index], this._oligo_name[this._current_target_index]);
            this._poses[0].set_pairs(this._target_pairs[this._current_target_index]);
            if (this._target_conditions != null && this._target_conditions[this._current_target_index] != null) {
                this._poses[0].set_struct_constraints(this._target_conditions[this._current_target_index]['structure_constraints']);
            }
        }

        this._paused = true;
        this.update_score();
        this.transform_poses_markers();
    }

    private toggle_posestate(): void {
        if (this._pose_state === PoseState.TARGET) {
            this.set_to_native_mode();
        } else if (this._pose_state === PoseState.NATIVE) {
            this.set_to_target_mode();
        } else {
            throw new Error("Invalid pose state");
        }
    }

    private toggle_freeze(): void {
        this._is_frozen = !this._is_frozen;

        this._constraintsLayer.alpha = (this._is_frozen ? 0.25 : 1.0);
        this.set_show_total_energy(!this._is_frozen);

        this._toolbar.undo_button.enabled = !this._is_frozen;
        this._toolbar.redo_button.enabled = !this._is_frozen;
        this._toolbar.freeze_button.toggled.value = this._is_frozen;

        if (!this._is_frozen) { // we just "thawed", update
            this.pose_edit_by_target(this._current_target_index);
        }

        this._background.freeze_background(this._is_frozen);
    }

    /// This mode is strictly for internal use, not to be used by users
    private set_to_frozen_mode(): void {
        this._pose_state = PoseState.FROZEN;
        this._paused = true;
        this.update_score();
    }

    private on_change_folder(): void {
        this.clear_undo_stack();
        this.pose_edit_by_target(0);
        for (let pose of this._poses) {
            pose.set_display_score_texts(pose.is_displaying_score_texts());
        }
    }

    private rop_presets(): void {
        while (this._rop_presets.length) {
            let pre = this._rop_presets.pop();
            pre();
        }
    }

    private folder_updated(): void {
        this._folder_button.label(this._folder.get_folder_name());

        if (this._folder.can_score_structures()) {
            for (let pose of this._poses) {
                pose.set_score_visualization(this._folder);
            }
        } else {
            for (let pose of this._poses) {
                pose.set_score_visualization(null);
            }
        }

        this.on_change_folder();
    }

    private change_folder(): void {
        let curr_f: string = this._folder.get_folder_name();
        this._folder = FolderManager.instance.get_next_folder(curr_f, (folder: Folder): boolean => {
            return this._puzzle.has_target_type("multistrand") && !folder.can_multifold();
        });
        if (this._folder.get_folder_name() === curr_f) return;

        this.folder_updated();
    }

    private show_spec(): void {
        this.update_current_block_with_dot_and_melting_plot();
        let datablock: UndoBlock = this.get_current_undo_block();

        let dialog = this.showDialog(new SpecBoxDialog(datablock));
        dialog.closed.connect((showDocked) => {
            if (showDocked) {
                this._docked_spec_box.set_spec(datablock);
                this._docked_spec_box.display.visible = true;
            }
        });
    }

    private update_docked_spec_box(): void {
        if (this._docked_spec_box.display.visible) {
            this.update_current_block_with_dot_and_melting_plot();
            let datablock: UndoBlock = this.get_current_undo_block();
            this._docked_spec_box.set_spec(datablock);
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

    private update_current_block_with_dot_and_melting_plot(index: number = -1): void {
        let datablock: UndoBlock = this.get_current_undo_block(index);
        if (this._folder.can_dot_plot()) {
            datablock.set_meltingpoint_and_dotplot(this._folder);
        }
    }

    private submit_current_pose(): void {
        if (this._puzzle.get_puzzle_type() !== PuzzleType.EXPERIMENTAL) {
            /// Always submit the sequence in the first state
            let sol_to_submit: UndoBlock = this.get_current_undo_block(0);
            this.submit_solution({title: "Cleared Solution", comment: "No comment"}, sol_to_submit);

        } else {
            const NOT_SATISFIED_PROMPT =
                "Puzzle constraints are not satisfied.\n" +
                "You can still submit the sequence, but please note that there is a risk of not getting\n" +
                "synthesized properly";

            if (!this.checkConstraints(false)) {
                if (this._puzzle.is_soft_constraint() || Eterna.is_dev_mode) {
                    this.showConfirmDialog(NOT_SATISFIED_PROMPT).promise
                        .then(() => this.promptForExperimentalPuzzleSubmission());

                } else {
                    this.showNotificationDialog("You didn't satisfy all requirements!");
                }
            } else {
                this.promptForExperimentalPuzzleSubmission();
            }
        }
    }

    private promptForExperimentalPuzzleSubmission(): void {
        /// Generate dot and melting plot data
        this.update_current_block_with_dot_and_melting_plot();

        /// Generate dot and melting plot data
        let datablock: UndoBlock = this.get_current_undo_block();
        if (datablock.get_param(UndoBlockParam.DOTPLOT_BITMAP) == null) {
            this.update_current_block_with_dot_and_melting_plot();
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

        this.showDialog(new SubmitPoseDialog()).promise.then((submitDetails) => {
            /// Always submit the sequence in the first state
            this.update_current_block_with_dot_and_melting_plot(0);
            let sol_to_submit: UndoBlock = this.get_current_undo_block(0);
            this.submit_solution(submitDetails, sol_to_submit);
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

        if (this._puzzle.get_puzzle_type() !== PuzzleType.EXPERIMENTAL) {
            let next_puzzle: number = this._puzzle.get_next_puzzle();

            if (next_puzzle > 0) {
                post_data["next-puzzle"] = next_puzzle;
            } else {
                post_data["recommend-puzzle"] = true;
            }

            post_data["pointsrank"] = true;
        } else { // is experimental
            if (this._ancestor_id > 0) {
                post_data["ancestor-id"] = this._ancestor_id;
            }
        }

        let elapsed: number = (new Date().getTime() - this._start_solving_time) / 1000;
        let move_history: any = {
            begin_from: this._starting_point,
            num_moves: this._move_count,
            moves: this._moves.slice(),
            elapsed: elapsed.toFixed(0)
        };
        post_data["move-history"] = JSON.stringify(move_history);

        let newlinereg: RegExp = new RegExp("/\"/g");
        details.comment = details.comment.replace(newlinereg, "'");
        details.title = details.title.replace(newlinereg, "'");

        let seq_string: string = EPars.sequence_array_to_string(this._puzzle.transform_sequence(undoBlock.get_sequence(), 0));

        post_data["title"] = details.title;
        post_data["energy"] = undoBlock.get_param(UndoBlockParam.FE) / 100.0;
        post_data["puznid"] = this._puzzle.get_node_id();
        post_data["sequence"] = seq_string;
        post_data["repetition"] = undoBlock.get_param(UndoBlockParam.REPETITION);
        post_data["gu"] = undoBlock.get_param(UndoBlockParam.GU);
        post_data["gc"] = undoBlock.get_param(UndoBlockParam.GC);
        post_data["ua"] = undoBlock.get_param(UndoBlockParam.AU);
        post_data["body"] = details.comment;

        if (this._puzzle.get_puzzle_type() === PuzzleType.EXPERIMENTAL) {
            post_data["melt"] = undoBlock.get_param(UndoBlockParam.MELTING_POINT);

            if (this._fold_total_time >= 1000.0) {
                let fd: any[] = [];
                for (let ii: number = 0; ii < this._poses.length; ii++) {
                    fd.push(this.get_current_undo_block(ii).toJson());
                }
                post_data["fold-data"] = JSON.stringify(fd);
            }
        }

        return post_data;
    }

    private submit_solution(details: SubmitPoseDetails, undoBlock: UndoBlock): void {
        this._rscript.FinishLevel();

        if (this._puzzle.get_node_id() < 0) {
            return;
        }

        // Show a "Submitting now!" dialog
        let submittingRef: GameObjectRef = GameObjectRef.NULL;
        if (this._puzzle.get_puzzle_type() === PuzzleType.EXPERIMENTAL) {
            submittingRef = this.showDialog(new SubmittingDialog()).ref;
        }

        // Kick off a BubbleSweep animation
        let bubbles = new BubbleSweep(800);
        this.addObject(bubbles, this._bgLayer);
        bubbles.start_sweep();

        // Show an explosion animation
        this.disable_tools(true);
        this.set_puzzle_state(PuzzleState.CLEARED);

        Eterna.sound.play_se(Sounds.SoundPuzzleClear);
        let explosionCompletePromise: Promise<void> = null;
        for (let pose of this._poses) {
            pose.set_zoom_level(0, true, true);
            let p = pose.start_explosion();
            if (explosionCompletePromise == null) {
                explosionCompletePromise = p;
            }
        }

        // submit our solution to the server
        log.debug("Submitting solution...");
        let submissionPromise = Eterna.client.submit_solution(this.createSubmitData(details, undoBlock));

        // Wait for explosion completion
        explosionCompletePromise.then(() => {
            bubbles.decay_sweep();
            bubbles.addObject(new SerialTask(
                new AlphaTask(0, 5, Easing.easeIn),
                new SelfDestructTask()
            ));

            this.set_show_menu(false);
            for (let pose of this._poses) {
                pose.set_show_total_energy(false);
                pose.clear_explosion();
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
                return AchievementManager.award_achievement(cheevs).then(() => submissionResponse);
            } else {
                return Promise.resolve(submissionResponse);
            }
        })
        .then(submissionResponse => {
            submittingRef.destroyObject();

            let data: any = submissionResponse['data'];

            this.showMissionClearedPanel(data);

            const seqString = EPars.sequence_array_to_string(
                this._puzzle.transform_sequence(undoBlock.get_sequence(), 0));

            if (data['error'] != null) {
                if (data['error'].indexOf('barcode') >= 0) {
                    let dialog = this.showNotificationDialog(data['error'], "More Information");
                    dialog.extraButton.clicked.connect(() => window.open(EternaURL.BARCODE_HELP, "_blank"));
                    let hairpin: string = EPars.get_barcode_hairpin(seqString);
                    if (hairpin != null) {
                        SolutionManager.instance.add_hairpins([hairpin]);
                        this.checkConstraints();
                    }
                } else {
                    this.showNotificationDialog(data['error']);
                }

            } else {
                if (data['solution-id'] != null) {
                    this.set_ancestor_id(data['solution-id']);
                }

                if (this._puzzle.get_puzzle_type() === PuzzleType.EXPERIMENTAL) {
                    if (this._puzzle.get_use_barcode()) {
                        let hairpin: string = EPars.get_barcode_hairpin(seqString);
                        if (hairpin != null) {
                            SolutionManager.instance.add_hairpins([hairpin]);
                            this.checkConstraints();
                        }
                    }
                }
            }
        });
    }

    private showMissionClearedPanel(submitSolutionRspData: any): void {
        this._submitSolutionRspData = submitSolutionRspData;

        this.disable_tools(true);
        this._constraintsLayer.visible = false;
        this._exit_button.display.visible = false;

        let infoText: string = null;
        let moreText: string = null;
        let boostersData = this._puzzle.get_boosters();
        if (boostersData != null && boostersData.mission_cleared != null) {
            infoText = boostersData.mission_cleared["info"];
            moreText = boostersData.mission_cleared["more"];
        }

        let nextPuzzleData: any = submitSolutionRspData['next-puzzle'];
        let nextPuzzle: Puzzle = null;
        if (nextPuzzleData) {
            nextPuzzle = PuzzleManager.instance.parse_puzzle(nextPuzzleData);
            log.info(`Loaded next puzzle [id=${nextPuzzle.get_node_id()}]`);
        }

        let missionClearedPanel = new MissionClearedPanel(nextPuzzle != null, infoText, moreText);
        missionClearedPanel.display.alpha = 0;
        missionClearedPanel.addObject(new AlphaTask(1, 0.3));
        this.addObject(missionClearedPanel, this._dialogLayer);
        missionClearedPanel.createRankScroll(submitSolutionRspData);

        const keepPlaying = () => {
            if (missionClearedPanel != null) {
                missionClearedPanel.destroySelf();
                missionClearedPanel = null;

                this._constraintsLayer.visible = true;
                this.disable_tools(false);

                this._exit_button.display.alpha = 0;
                this._exit_button.display.visible = true;
                this._exit_button.addObject(new AlphaTask(1, 0.3));
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

    public deselect_all_colorings(): void {
        this._toolbar.palette.clear_selection();
        this._toolbar.pair_swap_button.toggled.value = false;
        for (let k: number = 0; k < this._toolbar.dyn_paint_tools.length; k++) {
            this._toolbar.dyn_paint_tools[k].toggled.value = false;
        }
    }

    public set_poses_color(paint_color: number): void {
        for (let pose of this._poses) {
            pose.set_current_color(paint_color);
        }
    }

    private disable_tools(disable: boolean): void {
        this._toolbar.disable_tools(disable);
        // this._scriptbar.enabled = !disable;
        // if (this._pic_button) {
        //     this._pic_button.enabled = !disable;
        // }
        this._is_pic_disabled = disable;

        this._hintBoxRef.destroyObject();

        this._folder_button.enabled = !disable;

        for (let ii = 0; ii < this._pose_fields.length; ii++) {
            // this._pose_fields[ii].mouseEnabled = !disable;
            // this._pose_fields[ii].mouseChildren = !disable;
        }

        if (disable) {
            for (let pose of this._poses) {
                pose.clear_mouse();
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

    private display_constraint_boxes(animate: boolean, display: boolean): void {
        let num_constraints: number = 0;
        let constraints: string[] = this._puzzle.get_constraints();

        if (this._puzzle.get_temporary_constraints() != null) {
            constraints = this._puzzle.get_temporary_constraints();
        }

        if (constraints != null) {
            num_constraints = constraints.length;
        }

        let w_walker: number = 17;

        for (let xx = 0; xx < this._target_pairs.length; xx++) {
            if (xx === 0) {
                // scan for non-(ANTI)SHAPE
                for (let ii = 0; ii < num_constraints / 2; ii++) {
                    const box = this._constraint_boxes[ii];
                    if (box.constraintType === ConstraintType.SHAPE || box.constraintType === ConstraintType.ANTISHAPE) {
                        continue;
                    }
                    let cpos = new Point(w_walker, 35);
                    w_walker += 119;
                    box.setLocation(cpos, animate);
                    box.show_big_text(false);
                    box.display.visible = display;
                }
                if (w_walker > 17) {
                    w_walker += 25;
                }
            } else if (xx === 1) {
                // save the offset for later use (avoid overlaps in PIP mode)
                this._constraints_offset = w_walker;
            }

            // scan for SHAPE
            for (let ii = 0; ii < num_constraints / 2; ii++) {
                const box = this._constraint_boxes[ii];
                if (box.constraintType !== ConstraintType.SHAPE || Number(constraints[2 * ii + 1]) !== xx) {
                    continue;
                }
                let cpos = new Point(w_walker, 35);
                w_walker += 77;
                box.setLocation(cpos, animate);
                box.show_big_text(false);
                box.display.visible = (xx === 0 || !this._is_pip_mode) ? display : false;
            }

            // scan for ANTISHAPE
            for (let ii = 0; ii < num_constraints / 2; ii++) {
                const box = this._constraint_boxes[ii];
                if (box.constraintType !== ConstraintType.ANTISHAPE || Number(constraints[2 * ii + 1]) !== xx) {
                    continue;
                }
                let cpos = new Point(w_walker, 35);
                w_walker += 77;
                box.setLocation(cpos, animate);
                box.show_big_text(false);
                box.display.visible = (xx === 0 || !this._is_pip_mode) ? display : false;
            }
        }

        this.layout_constraints();
    }

    private start_countdown(): void {
        this._is_playing = false;

        const constraints: string[] = this._puzzle.curConstraints;
        if (constraints == null || constraints.length === 0 || !this._show_mission_screen) {
            this.start_playing(false);
            return;
        }

        this.set_puzzle_state(PuzzleState.COUNTDOWN);

        this._constraints_head = this._constraints_top;
        this._constraints_foot = this._constraints_bottom;

        for (let ii = 0; ii < constraints.length / 2; ii++) {
            let box: ConstraintBox = this._constraint_boxes[ii];
            box.display.visible = true;
            box.show_big_text(true);

            box.setLocation(new Point(
                (Flashbang.stageWidth * 0.3),
                (Flashbang.stageHeight * 0.4) + (ii * 77)));
        }

        this._start_solving_time = new Date().getTime();
        this.start_playing(true);

        this.showIntroScreen();
    }

    private showIntroScreen() {
        let missionText = this._puzzle.get_mission_text();
        let boosters: BoostersData = this._puzzle.get_boosters();
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
        let constraints = this._puzzle.get_constraints();
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
            this._puzzle.get_puzzle_name(true),
            missionText,
            this._target_pairs,
            introConstraintBoxes);

        this.modeStack.pushMode(introMode);
    }

    private start_playing(animate_constraints: boolean): void {
        this._is_playing = true;
        this.disable_tools(false);

        this.set_puzzle_state(PuzzleState.GAME);
        this.display_constraint_boxes(true, true);
    }

    private reset_autosave_data(): void {
        Eterna.settings.removeObject(this.savedDataTokenName);
    }

    private autosave_data(e: Event): void {
        if (this._puzzle.get_puzzle_type() === PuzzleType.BASIC) {
            return;
        }

        if (this._stack_level < 1) {
            return;
        }

        let objs: any[] = [];
        let msecs: number = 0;

        objs.push(msecs);
        objs.push(this._seq_stacks[this._stack_level][0].get_sequence());
        for (let ii: number = 0; ii < this._poses.length; ++ii) {
            objs.push(JSON.stringify(this._seq_stacks[this._stack_level][ii].toJson()));
        }

        Eterna.settings.saveObject(this.savedDataTokenName, objs);
    }

    private get savedDataTokenName(): string {
        return "puz_" + this._puzzle.get_node_id();
    }

    private transfer_to_puzzlemaker(): void {
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

    private autoload_data(): boolean {
        if (this._puzzle.get_puzzle_type() === PuzzleType.BASIC) {
            return false;
        }

        // if (this.root.loaderInfo.parameters.autoload
        //     && Number(this.root.loaderInfo.parameters.autoload) === 0) {
        //     return false;
        // }

        let beginning_sequence: number[] = this._puzzle.get_beginning_sequence();
        let locks: boolean[] = this._puzzle.get_puzzle_locks();
        let oligo_len: number = 0;

        if (this._target_conditions[0] && Puzzle.is_oligo_type(this._target_conditions[0]['type'])) {
            oligo_len = this._target_conditions[0]['oligo_sequence'].length;
            if (this._target_conditions[0]['fold_mode'] === Pose2D.OLIGO_MODE_DIMER) oligo_len++;
        } else if (this._target_conditions[0] && this._target_conditions[0]['type'] === "multistrand") {
            let oligos: OligoDef[] = this._target_conditions[0]['oligos'];
            for (let ii = 0; ii < oligos.length; ii++) {
                oligo_len += (oligos[ii]['sequence'].length + 1);
            }
        }

        if (beginning_sequence.length !== locks.length || (beginning_sequence.length + oligo_len) !== this._target_pairs[0].length) {
            return false;
        }
        this.clear_undo_stack();

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

                if (this._puzzle.get_shift_limit() === 0 && undo_block.get_target_pairs().length !== this._target_pairs[ii].length) {
                    return false;
                }

                this._target_pairs[ii] = undo_block.get_target_pairs();
                this._target_oligos_order[ii] = undo_block.get_target_oligo_order();

                this.set_poses_with_undo_block(ii, undo_block);
            }
        }

        if ((a.length + oligo_len) !== this._target_pairs[0].length) {
            return false;
        }

        for (let ii = 0; ii < this._target_pairs[0].length; ii++) {
            if (locks[ii]) {
                a[ii] = beginning_sequence[ii];
            }
        }

        for (let ii = 0; ii < this._poses.length; ii++) {
            this._poses[ii].set_sequence(this._puzzle.transform_sequence(a, ii));
            this._poses[ii].set_puzzle_locks(locks);
        }
        this.pose_edit_by_target(0);
        return true;
    }

    private clear_move_tracking(seq: string): void {
        // move-tracking
        this._starting_point = seq;
        this._move_count = 0;
        this._moves = [];
    }

    private set_default_visibilities(): void {
        this._exit_button.display.visible = false;

        this._show_mission_screen = true;
        this.set_show_constraints(true);

        this._toolbar.palette.reset_overrides();
        this._toolbar.palette.change_default_mode();
    }

    private move_history_add_mutations(before: number[], after: number[]): void {
        let muts: any[] = [];
        for (let ii: number = 0; ii < after.length; ii++) {
            if (after[ii] !== before[ii]) {
                muts.push({pos: ii + 1, base: EPars.sequence_array_to_string([after[ii]])});
            }
        }
        if (muts.length === 0) return;
        this._move_count++;
        this._moves.push(muts.slice());
    }

    private move_history_add_sequence(change_type: string, seq: string): void {
        let muts: any[] = [];
        muts.push({"type": change_type, "sequence": seq});
        this._move_count++;
        this._moves.push(muts.slice());
    }

    private set_puzzle_epilog(init_seq: number[], is_reset: boolean): void {

        if (is_reset) {
            let new_seq: number[] = this._puzzle.transform_sequence(this.get_current_undo_block(0).get_sequence(), 0);
            this.move_history_add_sequence("reset", EPars.sequence_array_to_string(new_seq));
        } else {
            this._start_solving_time = new Date().getTime();
            this._starting_point = EPars.sequence_array_to_string(this._puzzle.transform_sequence(this.get_current_undo_block(0).get_sequence(), 0));
        }

        if (this._is_databrowser_mode) {
            this.register_script_callbacks();
            this.register_setter_callbacks();
        }

        if (is_reset || this._is_databrowser_mode) {
            this.start_playing(false);
        } else if (init_seq == null) {
            this.start_countdown();
        } else {
            /// Given init sequence (solution) in the lab, don't show mission animation - go straight to game
            if (this._puzzle.get_puzzle_type() === PuzzleType.EXPERIMENTAL) {
                this.start_playing(false);
            } else {
                this.start_countdown();
            }
        }

        this.set_pip(Eterna.settings.pipEnabled.value);

        this.rop_presets();

        /// Run update initially to prevent delay in starting animation
        // this.update_children_objects(new Date().getTime(), true);
    }

    private highlight_ui(ui_name: string): void {
        log.debug("TODO: highight_ui");
        // let pos: UDim;
        // let w: number;
        // let h: number;
        //
        // if (ui_name === "GU_PAIR") {
        //     pos = this._palette.get_pos();
        //     pos.translate(this._palette.ug_box.x, this._palette.ug_box.y);
        //     w = this._palette.ug_box.width;
        //     h = this._palette.ug_box.height;
        //
        // } else if (ui_name === "GC_PAIR") {
        //     pos = this._palette.get_pos();
        //     pos.translate(this._palette.gc_box.x, this._palette.gc_box.y);
        //     w = this._palette.gc_box.width;
        //     h = this._palette.gc_box.height;
        //
        // } else if (ui_name === "UA_PAIR") {
        //     pos = this._palette.get_pos();
        //     pos.translate(this._palette.au_box.x, this._palette.au_box.y);
        //     w = this._palette.au_box.width;
        //     h = this._palette.au_box.height;
        //
        // } else if (ui_name === "G") {
        //     pos = this._palette.get_pos();
        //     pos.translate(this._palette.g_box.x, this._palette.g_box.y);
        //     w = this._palette.g_box.width;
        //     h = this._palette.g_box.height;
        //
        // } else {
        //     throw new Error("Unrecognized ui name " + ui_name);
        //     return;
        // }
        //
        // this._ui_highlight.alpha = 0;
        // this._ui_highlight.visible = true;
        // this._ui_highlight.set_pos(pos);
        //
        // this._ui_highlight.graphics.clear();
        // this._ui_highlight.graphics.lineStyle(5, 0xFFFFFF);
        // this._ui_highlight.graphics.drawRect(-5, -5, w + 10, h + 10);
        //
        // this._ui_highlight.set_animator(new GameAnimatorFader(0, 1, 0.5, false, true));
    }

    private draw_arrow(ui_name: string): void {
        log.debug("TODO: draw_arrow");
        // let pos: UDim;
        //
        // if (ui_name === "GU_PAIR") {
        //     pos = this._palette.get_pos();
        //     pos.translate(this._palette.ug_box.x, this._palette.ug_box.y);
        //
        // } else if (ui_name === "GC_PAIR") {
        //
        //     pos = this._palette.get_pos();
        //     pos.translate(this._palette.gc_box.x, this._palette.gc_box.y);
        //
        // } else if (ui_name === "UA_PAIR") {
        //
        //     pos = this._palette.get_pos();
        //     pos.translate(this._palette.au_box.x, this._palette.au_box.y);
        //
        // } else if (ui_name === "G") {
        //
        //     pos = this._palette.get_pos();
        //     pos.translate(this._palette.g_box.x, this._palette.g_box.y);
        //
        // } else if (ui_name === "MODES_NATIVE") {
        //
        //     pos = this._native_button.get_pos();
        //
        // } else if (ui_name === "MODES_TARGET") {
        //
        //     pos = this._target_button.get_pos();
        //
        // } else if (ui_name === "MODES_SECOND") {
        //     // FIXME: what is MODES_SECOND ???
        //     pos = this._native_button.get_pos();
        //
        // } else if (ui_name === "MODES_PIP") {
        //
        //     pos = this._pip_button.get_pos();
        //
        // } else {
        //     throw new Error("Unrecognized ui name " + ui_name);
        //     return;
        // }
        //
        // this._ui_highlight.alpha = 0;
        // this._ui_highlight.visible = true;
        // pos.translate(0, -100);
        // this._ui_highlight.set_pos(pos);
        //
        // this._ui_highlight.graphics.clear();
        // this._ui_highlight.graphics.lineStyle(1, 0x999999);
        // this._ui_highlight.graphics.beginFill(0xFF0000);
        //
        // let style: ArrowStyle = new ArrowStyle();
        // style.shaftThickness = 15;
        // style.headWidth = 40;
        // style.headLength = 40;
        // style.shaftPosition = 0;
        // style.edgeControlPosition = 1;
        // style.edgeControlSize = 0;
        //
        // GraphicsUtil.drawArrow(this._ui_highlight.graphics, new Point(0, 0), new Point(0, 100), style);
        //
        // this._ui_highlight.set_animator(new GameAnimatorFader(0, 1, 0.5, false, true));
    }

    private clear_ui_highlight(): void {
        log.debug("TODO: clear_ui_highlight");
        // this._ui_highlight.set_animator(null);
        // this._ui_highlight.visible = false;
    }

    private get_ui_pos(pos: any[]): UDim {
        log.debug("TODO: get_ui_pos");
        return new UDim(0.5, 0.5, 0, 0);
        // if (pos[0] === UIPos.CENTER) {
        //     return new UDim(0.5, 0.5, 0, 0);
        // } else if (pos[0] === UIPos.BASE) {
        //     let p: Point = this._poses[0].get_base_xy(pos[1]);
        //     return new UDim(0, 0, p.x, p.y);
        // } else if (pos[0] === UIPos.UDIM) {
        //     return new UDim(pos[1], pos[2], pos[3], pos[4]);
        // } else if (pos[0] === UIPos.PALLETE) {
        //     return this._palette.get_pos();
        // } else if (pos[0] === UIPos.MODES) {
        //     return this._native_button.get_pos();
        // } else if (pos[0] === UIPos.MODES_NATIVE) {
        //     return this._native_button.get_pos();
        // } else if (pos[0] === UIPos.MODES_TARGET) {
        //     return this._target_button.get_pos();
        // } else if (pos[0] === UIPos.UNDO_BUTTON) {
        //     return this._undo_button.get_pos();
        // } else if (pos[0] === UIPos.ZOOM_IN_BUTTON) {
        //     return this._zoom_in_button.get_pos();
        // } else if (pos[0] === UIPos.ZOOM_OUT_BUTTON) {
        //     return this._zoom_out_button.get_pos();
        // } else if (pos[0] === UIPos.CONSTRAINT) {
        //     let box: ConstraintBox = this._constraint_boxes[Number(pos[1])];
        //     let udim: UDim = box.get_pos();
        //     udim.translate(0, 50);
        //     return udim;
        // }
        //
        // throw new Error("Unrecognized position string " + pos[0]);
    }

    private run_action(action: any[]): void {
        log.debug("TODO: run_action");
        // if (action[0] === "NO") {
        //     return;
        // }
        //
        // let ii: number = 0;
        // let sequence: any[];
        // let target: number;
        // let lock: any[];
        //
        // if (action[0] === "START_COUNTDOWN") {
        //     this.clear_undo_stack();
        //     this.pose_edit_by_target(0);
        //     this.start_countdown();
        // } else if (action[0] === "CLEAR_UNDO_STACK") {
        //     this.clear_undo_stack();
        //     this.pose_edit_by_target(0);
        // } else if (action[0] === "START_COUNTDOWN_DIRTY") {
        //     this.start_countdown();
        // } else if (action[0] === "MUTATE") {
        //
        //     sequence = this._poses[0].get_sequence();
        //     for (ii = 1; ii < action.length; ii += 2) {
        //
        //         let s: number;
        //
        //         if (action[ii + 1] === "A") {
        //             s = EPars.RNABASE_ADENINE;
        //         } else if (action[ii + 1] === "G") {
        //             s = EPars.RNABASE_GUANINE;
        //         } else if (action[ii + 1] === "U") {
        //             s = EPars.RNABASE_URACIL;
        //         } else {
        //             s = EPars.RNABASE_CYTOSINE;
        //         }
        //
        //         sequence[Number(action[ii])] = s;
        //     }
        //
        //     for (ii = 0; ii < this._poses.length; ii++) {
        //         this._poses[ii].set_sequence(this._puzzle.transform_sequence(sequence, ii));
        //     }
        //     this.pose_edit_by_target(0);
        //     this.update_score();
        //
        // } else if (action[0] === "CHANGEMODE") {
        //     if (action[1] === "NATIVE") {
        //         this.set_to_native_mode();
        //     } else if (action[1] === "TARGET") {
        //         this.set_to_target_mode();
        //     } else if (action[1] === "FROZEN") {
        //         this.set_to_frozen_mode();
        //     } else if (action[1] === "PIP") {
        //         this.set_pip(true);
        //     } else if (action[1] === "NPIP") {
        //         this.set_pip(false);
        //     } else {
        //         throw new Error("Unrecognized error " + action[1]);
        //     }
        //
        // } else if (action[0] === "ZOOM") {
        //     for (ii = 0; ii < this._pose_fields.length; ii++) {
        //         this._pose_fields[ii].set_zoom(Number(action[1]));
        //     }
        // } else if (action[0] === "ZOOM_OUT") {
        //     for (ii = 0; ii < this._pose_fields.length; ii++) {
        //         this._pose_fields[ii].zoom_out();
        //     }
        // } else if (action[0] === "ZOOM_IN") {
        //     for (ii = 0; ii < this._pose_fields.length; ii++) {
        //         this._pose_fields[ii].zoom_in();
        //     }
        // } else if (action[0] === "ALLOW_MOVING") {
        //     for (ii = 0; ii < this._pose_fields.length; ii++) {
        //         this._pose_fields[ii].mouseEnabled = true;
        //         this._pose_fields[ii].mouseChildren = true;
        //     }
        // } else if (action[0] === "HIGHLIGHT_STACK") {
        //     this._poses[0].highlight_stack(action);
        // } else if (action[0] === "HIGHLIGHT_STACK_PIP") {
        //     target = action[1];
        //     action.splice(1, 1);
        //     this._poses[target].highlight_stack(action);
        // } else if (action[0] === "HIGHLIGHT_LOOP") {
        //     this._poses[0].highlight_loop(action);
        // } else if (action[0] === "HIGHLIGHT_LOOP_PIP") {
        //     target = action[1];
        //     action.splice(1, 1);
        //     this._poses[target].highlight_loop(action);
        // } else if (action[0] === "CLEAR_HIGHLIGHT") {
        //     this._poses[0].clear_highlight();
        // } else if (action[0] === "CLEAR_HIGHLIGHT_PIP") {
        //     this._poses[action[1]].clear_highlight();
        // } else if (action[0] === "NAVIGATE_TO_CHALLENGES") {
        //     this.navigate_to_challenges();
        // } else if (action[0] === "UI_HIGHLIGHT") {
        //     this.highlight_ui(action[1]);
        // } else if (action[0] === "DRAW_ARROW") {
        //     this.draw_arrow(action[1]);
        // } else if (action[0] === "CLEAR_UI_HIGHLIGHT") {
        //     this.clear_ui_highlight();
        // } else if (action[0] === "SHOW_CHALLENGE") {
        //     // Defunct - redirect to setup end screen
        // } else if (action[0] === "RESET_TEMP_CONSTRAINTS") {
        //     let constraints_arr: any[] = [];
        //
        //     for (ii = 1; ii < action.length; ii += 2) {
        //         constraints_arr.push(action[ii]);
        //         constraints_arr.push(action[ii + 1]);
        //     }
        //
        //     this._puzzle.set_temporary_constraints(constraints_arr);
        //     this.check_constraints();
        //
        // } else if (action[0] === "CLEAR_TEMP_CONSTRAINTS") {
        //     this._puzzle.set_temporary_constraints(null);
        //     this.check_constraints();
        // } else if (action[0] === "DISABLE_TOOLS") {
        //     this.disable_tools(true);
        // } else if (action[0] === "ENABLE_TOOLS") {
        //     this.disable_tools(false);
        // } else if (action[0] === "DISABLE_PALLETE") {
        //     this._palette.enabled = false;
        //     for (ii = 0; ii < this._poses.length; ii++) {
        //         this._poses[ii].set_current_color(-1);
        //     }
        // } else if (action[0] === "ENABLE_PALLETE") {
        //     this._palette.set_disabled(false);
        //     this._palette.click_a();
        // } else if (action[0] === "ENABLE_MODES") {
        //     this._native_button.set_disabled(false);
        //     this._target_button.set_disabled(false);
        // } else if (action[0] === "DISABLE_MODES") {
        //     this._native_button.enabled = false;
        //     this._target_button.enabled = false;
        // } else if (action[0] === "CENTER_POSE") {
        //     for (ii = 0; ii < this._poses.length; ii++) {
        //         this._poses[0].set_zoom_level(0, true, true);
        //     }
        // } else if (action[0] === "ENABLE_PIP") {
        //     this._pip_button.set_disabled(false);
        // } else if (action[0] === "DISABLE_PIP") {
        //     this._pip_button.enabled = false;
        // } else if (action[0] === "WAIT") {
        //     if (action[1] === "TRUE") {
        //         this._waiting_for_input = true;
        //     } else {
        //         this._waiting_for_input = false;
        //     }
        // } else if (action[0] === "STAMP") {
        //     if (action[1] === "GREAT") {
        //         this._game_stamp.set_bitmap(BitmapManager.get_bitmap(BitmapManager.GreatImg));
        //     }
        //
        //     this._game_stamp.alpha = 0;
        //     this._game_stamp.visible = true;
        //     this._game_stamp.set_pos(new UDim(0.5, 0.5, -this._game_stamp.width / 2, -this._game_stamp.height / 2));
        //     this._game_stamp.set_animator(new GameAnimatorZFly(0.4, 0.35, 0, 3, 0.3));
        // } else if (action[0] === "ADD_LOCK") {
        //
        //     sequence = this._poses[0].get_sequence();
        //     lock = [];
        //
        //     for (ii = 0; ii < sequence.length; ii++) {
        //         lock.push(false);
        //     }
        //
        //     for (ii = 1; ii < action.length; ii++) {
        //         lock[Number(action[ii])] = true;
        //     }
        //
        //     for (ii = 0; ii < this._poses.length; ii++) {
        //         this._poses[ii].set_puzzle_locks(lock);
        //     }
        // } else if (action[0] === "REMOVE_LOCK") {
        //     sequence = this._poses[0].get_sequence();
        //     lock = [];
        //
        //     for (ii = 0; ii < sequence.length; ii++) {
        //         lock.push(false);
        //     }
        //
        //     for (ii = 0; ii < this._poses.length; ii++) {
        //         this._poses[ii].set_puzzle_locks(lock);
        //     }
        // } else {
        //     throw new Error("Unrecognized action " + action);
        // }
    }

    private updateConstraint(type: ConstraintType, value: string, ii: number, box: ConstraintBox, render: boolean, outInfo: ConstraintInfo): boolean {
        let isSatisfied: boolean = true;

        const undoBlock: UndoBlock = this.get_current_undo_block();
        const sequence = undoBlock.get_sequence();

        if (type === ConstraintType.GU) {
            const count: number = undoBlock.get_param(UndoBlockParam.GU);
            isSatisfied = (count >= Number(value));
            if (render) {
                box.set_content(ConstraintType.GU, value, isSatisfied, count);
            }
        } else if (type === ConstraintType.AU) {
            const count: number = undoBlock.get_param(UndoBlockParam.AU);
            isSatisfied = (count >= Number(value));
            if (render) {
                box.set_content(ConstraintType.AU, value, isSatisfied, count)
            }
        } else if (type === ConstraintType.GC) {
            const count: number = undoBlock.get_param(UndoBlockParam.GC);
            isSatisfied = (count <= Number(value));
            if (render) {
                box.set_content(ConstraintType.GC, value, isSatisfied, count);
            }
        } else if (type === ConstraintType.MUTATION) {
            const sequence_diff: number = EPars.sequence_diff(this._puzzle.get_subsequence_without_barcode(sequence), this._puzzle.get_subsequence_without_barcode(this._puzzle.get_beginning_sequence()));
            isSatisfied = sequence_diff <= Number(value);
            if (render) {
                box.set_content(ConstraintType.MUTATION, value, isSatisfied, sequence_diff);
            }

        } else if (type === ConstraintType.SHAPE) {
            const target_index = Number(value);
            const ublk: UndoBlock = this.get_current_undo_block(target_index);
            let native_pairs = ublk.get_pairs();
            let structure_constraints: any[] = null;
            if (this._target_conditions != null && this._target_conditions[target_index] != null) {
                structure_constraints = this._target_conditions[target_index]['structure_constraints'];

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

            isSatisfied = EPars.are_pairs_same(native_pairs, this._target_pairs[target_index], structure_constraints);

            let input_index = 0;
            if (this._target_pairs.length > 1) {
                input_index = target_index;
            }

            if (render) {
                box.set_content(ConstraintType.SHAPE, {
                    target: this._target_pairs[target_index],
                    index: input_index,
                    native: native_pairs,
                    structure_constraints: structure_constraints
                }, isSatisfied, 0);
                box.set_flagged(this._unstable_index === ii);
                // if (!box.hasEventListener(MouseEvent.MOUSE_DOWN)) {
                //     set_callback(this, box, ii);
                // }

                if (this._unstable_index === ii) {
                    outInfo.wrong_pairs = box.get_wrong_pairs(native_pairs, this._target_pairs[target_index], structure_constraints, isSatisfied);
                }
            }

            if (target_index > 0) {
                if (this._constraint_shape_boxes != null) {
                    if (this._constraint_shape_boxes[target_index] != null) {
                        this._constraint_shape_boxes[target_index].set_content(ConstraintType.SHAPE, {
                            target: this._target_pairs[target_index],
                            index: input_index,
                            native: native_pairs,
                            structure_constraints: structure_constraints
                        }, isSatisfied, 0);
                        this._constraint_shape_boxes[target_index].set_flagged(this._unstable_index === ii);
                        // if (!this._constraint_shape_boxes[target_index].hasEventListener(MouseEvent.MOUSE_DOWN)) {
                        //     set_callback(this, this._constraint_shape_boxes[target_index], ii);
                        // }

                        this._constraint_shape_boxes[target_index].display.visible = this._is_pip_mode;
                    }
                }
            }

        } else if (type === ConstraintType.ANTISHAPE) {
            let target_index = Number(value);
            let native_pairs = this.get_current_undo_block(target_index).get_pairs();
            if (this._target_conditions == null) {
                throw new Error("Target object not available for ANTISHAPE constraint");
            }

            if (this._target_conditions[target_index] == null) {
                throw new Error("Target condition not available for ANTISHAPE constraint");
            }

            let anti_structure_string: string = this._target_conditions[target_index]['anti_secstruct'];

            if (anti_structure_string == null) {
                throw new Error("Target structure not available for ANTISHAPE constraint");
            }

            let anti_structure_constraints: any[] = this._target_conditions[target_index]['anti_structure_constraints'];
            let anti_pairs: any[] = EPars.parenthesis_to_pair_array(anti_structure_string);
            isSatisfied = !EPars.are_pairs_same(native_pairs, anti_pairs, anti_structure_constraints);

            let input_index = 0;
            if (this._target_pairs.length > 1) {
                input_index = target_index;
            }

            if (render) {
                box.set_content(ConstraintType.ANTISHAPE, {
                    target: anti_pairs,
                    native: native_pairs,
                    index: input_index,
                    structure_constraints: anti_structure_constraints
                }, isSatisfied, 0);
                box.set_flagged(this._unstable_index === ii);
                // if (!box.hasEventListener(MouseEvent.MOUSE_DOWN)) {
                //     set_callback(this, box, ii);
                // }

                if (this._unstable_index === ii) {
                    outInfo.wrong_pairs = box.get_wrong_pairs(native_pairs, anti_pairs, anti_structure_constraints, isSatisfied);
                }
            }

            if (target_index > 0) {
                if (this._constraint_antishape_boxes != null) {
                    if (this._constraint_antishape_boxes[target_index] != null) {
                        this._constraint_antishape_boxes[target_index].set_content(ConstraintType.ANTISHAPE, {
                            target: anti_pairs,
                            native: native_pairs,
                            index: input_index,
                            structure_constraints: anti_structure_constraints
                        }, isSatisfied, 0);
                        this._constraint_antishape_boxes[target_index].set_flagged(this._unstable_index === ii);
                        // if (!this._constraint_antishape_boxes[target_index].hasEventListener(MouseEvent.MOUSE_DOWN)) {
                        //     set_callback(this, this._constraint_antishape_boxes[target_index], ii);
                        // }

                        this._constraint_antishape_boxes[target_index].display.visible = this._is_pip_mode;
                    }
                }
            }

        } else if (type === ConstraintType.BINDINGS) {
            const target_index = Number(value);
            const undoblk: UndoBlock = this.get_current_undo_block(target_index);

            if (this._target_conditions == null) {
                throw new Error("Target object not available for BINDINGS constraint");
            }

            if (this._target_conditions[target_index] == null) {
                throw new Error("Target condition not available for BINDINGS constraint");
            }

            const oligos: OligoDef[] = this._target_conditions[target_index]['oligos'];
            if (oligos == null) {
                throw new Error("Target condition not available for BINDINGS constraint");
            }

            let o_names: string[] = [];
            let bind: boolean[] = [];
            let label: string[] = [];
            let bmap: boolean[] = [];
            let offsets: any[] = [];
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
                box.set_content(ConstraintType.BINDINGS, {
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
                box.set_content(ConstraintType.G, value, isSatisfied, count);
            }

        } else if (type === ConstraintType.GMAX) {
            const count = Constraints.count(sequence, EPars.RNABASE_GUANINE);
            isSatisfied = (count <= Number(value));
            if (render) {
                box.set_content(ConstraintType.GMAX, value, isSatisfied, count);
            }

        } else if (type === ConstraintType.A) {
            const count: number = Constraints.count(sequence, EPars.RNABASE_ADENINE);
            isSatisfied = (count >= Number(value));
            if (render) {
                box.set_content(ConstraintType.A, value, isSatisfied, count);
            }

        } else if (type === ConstraintType.AMAX) {
            const count = Constraints.count(sequence, EPars.RNABASE_ADENINE);
            isSatisfied = (count <= Number(value));
            if (render) {
                box.set_content(ConstraintType.AMAX, value, isSatisfied, count);
            }

        } else if (type === ConstraintType.U) {
            const count: number = Constraints.count(sequence, EPars.RNABASE_URACIL);
            isSatisfied = (count >= Number(value));
            if (render) {
                box.set_content(ConstraintType.U, value, isSatisfied, count);
            }

        } else if (type === ConstraintType.UMAX) {
            const count = Constraints.count(sequence, EPars.RNABASE_URACIL);
            isSatisfied = (count <= Number(value));
            if (render) {
                box.set_content(ConstraintType.UMAX, value, isSatisfied, count);
            }

        } else if (type === ConstraintType.C) {
            const count: number = Constraints.count(sequence, EPars.RNABASE_CYTOSINE);
            isSatisfied = (count >= Number(value));
            if (render) {
                box.set_content(ConstraintType.C, value, isSatisfied, count);
            }

        } else if (type === ConstraintType.CMAX) {
            const count = Constraints.count(sequence, EPars.RNABASE_CYTOSINE);
            isSatisfied = (count <= Number(value));
            if (render) {
                box.set_content(ConstraintType.CMAX, value, isSatisfied, count);
            }

        } else if (type === ConstraintType.PAIRS) {
            let num_gu: number = undoBlock.get_param(UndoBlockParam.GU);
            let num_gc: number = undoBlock.get_param(UndoBlockParam.GC);
            let num_ua: number = undoBlock.get_param(UndoBlockParam.AU);
            isSatisfied = (num_gc + num_gu + num_ua >= Number(value));

            if (render) {
                box.set_content(ConstraintType.PAIRS, value, isSatisfied, num_gc + num_gu + num_ua);
            }

        } else if (type === ConstraintType.STACK) {
            const stack_len: number = undoBlock.get_param(UndoBlockParam.STACK);
            isSatisfied = (stack_len >= Number(value));

            if (render) {
                box.set_content(ConstraintType.STACK, value, isSatisfied, stack_len);
            }
        } else if (type === ConstraintType.CONSECUTIVE_G) {
            let consecutive_g_count: number = EPars.count_consecutive(sequence, EPars.RNABASE_GUANINE);
            isSatisfied = (consecutive_g_count < Number(value));

            if (render) {
                box.set_content(ConstraintType.CONSECUTIVE_G, value, isSatisfied, consecutive_g_count);
            }

            outInfo.max_allowed_guanine = Number(value);

        } else if (type === ConstraintType.CONSECUTIVE_C) {
            let consecutive_c_count: number = EPars.count_consecutive(sequence, EPars.RNABASE_CYTOSINE);
            isSatisfied = (consecutive_c_count < Number(value));

            if (render) {
                box.set_content(ConstraintType.CONSECUTIVE_C, value, isSatisfied, consecutive_c_count);
            }

            outInfo.max_allowed_cytosine = Number(value);

        } else if (type === ConstraintType.CONSECUTIVE_A) {
            let consecutive_a_count: number = EPars.count_consecutive(sequence, EPars.RNABASE_ADENINE);
            isSatisfied = (consecutive_a_count < Number(value));

            if (render) {
                box.set_content(ConstraintType.CONSECUTIVE_A, value, isSatisfied, consecutive_a_count);
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
                box.set_content(ConstraintType.LAB_REQUIREMENTS, {
                    "g_count": consecutive_g_count, "g_max": outInfo.max_allowed_guanine,
                    "c_count": consecutive_c_count, "c_max": outInfo.max_allowed_cytosine,
                    "a_count": consecutive_a_count, "a_max": outInfo.max_allowed_adenine
                }, isSatisfied, 0);
            }

        } else if (type === ConstraintType.BARCODE) {
            isSatisfied = !SolutionManager.instance.check_redundancy_by_hairpin(EPars.sequence_array_to_string(sequence));
            if (render) {
                box.set_content(ConstraintType.BARCODE, 0, isSatisfied, 0);
            }

        } else if (type === ConstraintType.OLIGO_BOUND) {
            let target_index = Number(value);
            let nnfe: number[] = this.get_current_undo_block(target_index).get_param(UndoBlockParam.NNFE_ARRAY, EPars.DEFAULT_TEMPERATURE);
            isSatisfied = (nnfe != null && nnfe[0] === -2);

            if (this._target_conditions == null) {
                throw new Error("Target object not available for BINDINGS constraint");
            }

            if (this._target_conditions[target_index] == null) {
                throw new Error("Target condition not available for BINDINGS constraint");
            }

            let o_names: string[] = [];
            let o_name: string = this._target_conditions[target_index]['oligo_name'];

            // TSC: not sure what this value should be. It's not guaranteed to be initialized in the original Flash code
            let jj = 0;
            if (o_name == null) o_name = "Oligo " + (jj + 1).toString();
            o_names.push(o_name);

            let bind: boolean[] = [];
            bind.push(true);

            let label: string[] = [];
            let lbl: string = this._target_conditions[target_index]['oligo_label'];
            if (lbl == null) lbl = String.fromCharCode(65 + jj);
            label.push(lbl);

            if (render) {
                box.set_content(ConstraintType.BINDINGS, {
                    index: target_index,
                    bind: bind,
                    label: label,
                    oligo_name: o_names
                }, isSatisfied, 0);
            }

        } else if (type === ConstraintType.OLIGO_UNBOUND) {
            let target_index = Number(value);
            let nnfe: number[] = this.get_current_undo_block(target_index).get_param(UndoBlockParam.NNFE_ARRAY, EPars.DEFAULT_TEMPERATURE);
            isSatisfied = (nnfe == null || nnfe[0] !== -2);

            if (this._target_conditions == null) {
                throw new Error("Target object not available for BINDINGS constraint");
            }

            if (this._target_conditions[target_index] == null) {
                throw new Error("Target condition not available for BINDINGS constraint");
            }

            // TSC: not sure what this value should be. It's not guaranteed to be initialized in the original Flash code
            let jj = 0;

            let o_names: string[] = [];
            let o_name: string = this._target_conditions[target_index]['oligo_name'];
            if (o_name == null) o_name = "Oligo " + (jj + 1).toString();
            o_names.push(o_name);

            let bind: boolean[] = [];
            bind.push(false);

            let label: string[] = [];
            let lbl: string = this._target_conditions[target_index]['oligo_label'];
            if (lbl == null) lbl = String.fromCharCode(65 + jj);
            label.push(lbl);

            if (render) {
                box.set_content(ConstraintType.BINDINGS, {
                    index: target_index,
                    bind: bind,
                    label: label,
                    oligo_name: o_names
                }, isSatisfied, 0);
            }

        } else if (type === ConstraintType.SCRIPT) {
            let nid: string = value;
            this.register_script_callbacks();

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
                        let ll: number = this._is_pip_mode ?
                            ret.cause.index :
                            (ret.cause.index === this._current_target_index ? 0 : -1);
                        if (ll >= 0) {
                            if (ret.cause.highlight != null) {
                                this._poses[ll].highlight_user_defined_sequence(ret.cause.highlight);
                            } else {
                                this._poses[ll].clear_user_defined_highlight();
                            }
                        }
                    }

                    if (ret.cause.icon_b64) {
                        data_png = ret.cause.icon_b64;
                    }
                }

                if (render) {
                    this._constraint_boxes[ii / 2].set_content(ConstraintType.SCRIPT, {
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
            const box: ConstraintBox = this._constraint_boxes[ii / 2];

            const wasSatisfied: boolean = box.is_satisfied();
            const isSatisfied: boolean = this.updateConstraint(type, value, ii, box, render, constraintsInfo);

            allAreSatisfied = allAreSatisfied && isSatisfied;
            allWereSatisfied = allWereSatisfied && wasSatisfied;

            if (type === ConstraintType.SHAPE || type === ConstraintType.ANTISHAPE) {
                const target_index = Number(value);
                if (!this._is_pip_mode) {
                    box.display.alpha = (target_index === this._current_target_index) ? 1.0 : 0.3;
                } else {
                    box.display.alpha = 1.0;
                }

                if (this._is_pip_mode && target_index > 0) {
                    box.display.visible = false;
                } else if (this._puz_state === PuzzleState.GAME || this._puz_state === PuzzleState.CLEARED) {
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

        const undo_block: UndoBlock = this.get_current_undo_block();
        const sequence: number[] = undo_block.get_sequence();
        const locks: boolean[] = undo_block.get_puzzle_locks();

        const restricted_guanine = EPars.get_restricted_consecutive(sequence, EPars.RNABASE_GUANINE, constraintsInfo.max_allowed_guanine - 1, locks);
        const restricted_cytosine = EPars.get_restricted_consecutive(sequence, EPars.RNABASE_CYTOSINE, constraintsInfo.max_allowed_cytosine - 1, locks);
        const restricted_adenine = EPars.get_restricted_consecutive(sequence, EPars.RNABASE_ADENINE, constraintsInfo.max_allowed_adenine - 1, locks);

        const restricted_global: number[] = restricted_guanine.concat(restricted_cytosine).concat(restricted_adenine);

        for (let ii = 0; ii < this._poses.length; ii++) {
            let jj = this._is_pip_mode ? ii : (ii === 0 ? this._current_target_index : ii);
            let restricted: number[];
            if (constraintsInfo.restricted_local && constraintsInfo.restricted_local[jj]) {
                restricted = restricted_global.concat(constraintsInfo.restricted_local[jj]);
            } else {
                restricted = restricted_global;
            }
            this._poses[ii].highlight_restricted_sequence(restricted);
            this._poses[ii].highlight_unstable_sequence(unstable);
        }

        if (allAreSatisfied && !allWereSatisfied) {
            if (this._puzzle.get_puzzle_type() === PuzzleType.EXPERIMENTAL) {
                Eterna.sound.play_se(Sounds.SoundAllConditions);
            } else if (this._puz_state !== PuzzleState.GAME) {
                Eterna.sound.play_se(Sounds.SoundCondition);
            }
        } else if (play_condition_music) {
            Eterna.sound.play_se(Sounds.SoundCondition);
        } else if (play_decondition_music) {
            Eterna.sound.play_se(Sounds.SoundDecondition);
        }

        return allAreSatisfied;
    }

    private update_score(): void {
        this.autosave_data(null);
        // let dn: GameObject = (<GameObject>Application.instance.get_application_gui("Design Name"));
        // if (dn != null) dn.visible = (this._stack_level === 0);

        let undo_block: UndoBlock = this.get_current_undo_block();
        let sequence: number[] = undo_block.get_sequence();
        let best_pairs: number[] = undo_block.get_pairs(EPars.DEFAULT_TEMPERATURE);
        let nnfe: number[];

        if (!this._paused) {
            for (let ii = 0; ii < this._poses.length; ii++) {
                if (ii === 0 && this._pose_state === PoseState.NATIVE && !this._is_pip_mode) {
                    this._poses[0].set_oligos(this.get_current_undo_block().get_target_oligos(),
                        this.get_current_undo_block().get_oligo_order(),
                        this.get_current_undo_block().get_oligos_paired());
                    this._poses[0].set_oligo(this.get_current_undo_block().get_target_oligo(),
                        this.get_current_undo_block().get_oligo_mode(),
                        this.get_current_undo_block().get_oligo_name());
                    this._poses[0].set_pairs(this.get_current_undo_block().get_pairs());
                    if (this._target_conditions != null && this._target_conditions[this._current_target_index] != null) {
                        this._poses[0].set_struct_constraints(this._target_conditions[this._current_target_index]['structure_constraints']);
                    }
                    continue;
                }
                this._poses[ii].set_oligos(this.get_current_undo_block(ii).get_target_oligos(),
                    this.get_current_undo_block(ii).get_oligo_order(),
                    this.get_current_undo_block(ii).get_oligos_paired());
                this._poses[ii].set_oligo(this.get_current_undo_block(ii).get_target_oligo(),
                    this.get_current_undo_block(ii).get_oligo_mode(),
                    this.get_current_undo_block(ii).get_oligo_name());
                this._poses[ii].set_pairs(this.get_current_undo_block(ii).get_pairs());
                if (this._target_conditions != null && this._target_conditions[ii] != null) {
                    this._poses[ii].set_struct_constraints(this._target_conditions[ii]['structure_constraints']);
                }
            }

        } else {
            for (let ii = 0; ii < this._poses.length; ++ii) {
                if (ii === 0 && this._pose_state === PoseState.TARGET && !this._is_pip_mode) {
                    this._poses[0].set_oligos(this.get_current_undo_block().get_target_oligos(),
                        this.get_current_undo_block().get_target_oligo_order(),
                        this.get_current_undo_block().get_oligos_paired());
                    this._poses[0].set_oligo(this.get_current_undo_block().get_target_oligo(),
                        this.get_current_undo_block().get_oligo_mode(),
                        this.get_current_undo_block().get_oligo_name());
                    this._poses[0].set_pairs(this.get_current_undo_block().get_target_pairs());
                    if (this._target_conditions != null && this._target_conditions[this._current_target_index] != null) {
                        this._poses[0].set_struct_constraints(this._target_conditions[this._current_target_index]['structure_constraints']);
                    }
                    this._target_oligos[0] = this.get_current_undo_block(0).get_target_oligos();
                    this._target_oligos_order[0] = this.get_current_undo_block(0).get_target_oligo_order();
                    this._target_oligo[0] = this.get_current_undo_block(0).get_target_oligo();
                    this._oligo_mode[0] = this.get_current_undo_block(0).get_oligo_mode();
                    this._oligo_name[0] = this.get_current_undo_block(0).get_oligo_name();
                    this._target_pairs[0] = this.get_current_undo_block(0).get_target_pairs();
                    continue;
                }
                this._target_oligos[ii] = this.get_current_undo_block(ii).get_target_oligos();
                this._target_oligos_order[ii] = this.get_current_undo_block(ii).get_target_oligo_order();
                this._target_oligo[ii] = this.get_current_undo_block(ii).get_target_oligo();
                this._oligo_mode[ii] = this.get_current_undo_block(ii).get_oligo_mode();
                this._oligo_name[ii] = this.get_current_undo_block(ii).get_oligo_name();
                this._target_pairs[ii] = this.get_current_undo_block(ii).get_target_pairs();
                this._poses[ii].set_oligos(this._target_oligos[ii], this._target_oligos_order[ii]);
                this._poses[ii].set_oligo(this._target_oligo[ii], this._oligo_mode[ii], this._oligo_name[ii]);
                this._poses[ii].set_pairs(this._target_pairs[ii]);
                if (this._target_conditions != null && this._target_conditions[ii] != null) {
                    this._poses[ii].set_struct_constraints(this._target_conditions[ii]['structure_constraints']);
                }
            }

        }

        for (let ii = 0; ii < this._poses.length; ii++) {
            let jj: number;

            if (ii === 0 && !this._is_pip_mode) {
                jj = this._current_target_index;
            } else {
                jj = ii;
            }
            if (this._target_conditions == null || this._target_conditions[jj] == null
                || this._target_conditions[jj]['type'] == null) {
                continue;
            }

            if (Puzzle.is_aptamer_type(this._target_conditions[jj]['type'])) {
                this._poses[ii].set_molecular_binding(this._target_conditions[jj]['site'], this._target_conditions[jj]['binding_pairs'], this._target_conditions[jj]['bonus'] / 100.0);
            } else {
                this._poses[ii].set_molecular_binding(null, null, 0);
            }
            if (Puzzle.is_oligo_type(this._target_conditions[jj]['type'])) {
                this._poses[ii].set_oligo_malus(this._target_conditions[jj]['malus']);
                nnfe = this.get_current_undo_block(jj).get_param(UndoBlockParam.NNFE_ARRAY, EPars.DEFAULT_TEMPERATURE);
                if (nnfe != null && nnfe[0] === -2) {
                    this._poses[ii].set_oligo_paired(true);
                    this._poses[ii].set_duplex_cost(nnfe[1] * 0.01);
                } else {
                    this._poses[ii].set_oligo_paired(false);
                }
            }
            if (this._target_conditions[jj]['type'] === "multistrand") {
                nnfe = this.get_current_undo_block(jj).get_param(UndoBlockParam.NNFE_ARRAY, EPars.DEFAULT_TEMPERATURE);
                if (nnfe != null && nnfe[0] === -2) {
                    this._poses[ii].set_duplex_cost(nnfe[1] * 0.01);
                }
            }
        }

        let num_AU: number = undo_block.get_param(UndoBlockParam.AU);
        let num_GU: number = undo_block.get_param(UndoBlockParam.GU);
        let num_GC: number = undo_block.get_param(UndoBlockParam.GC);
        this._toolbar.palette.set_pair_counts(num_AU, num_GU, num_GC);

        if (!this._is_frozen) {
            if (this._toolbar.undo_button.display.visible) {
                this._toolbar.undo_button.enabled = !(this._stack_level < 1);
            }
            if (this._toolbar.redo_button.display.visible) {
                this._toolbar.redo_button.enabled = !(this._stack_level + 1 > this._stack_size - 1);
            }
        }

        let was_satisfied: boolean = true;
        for (let ii = 0; ii < this._puzzle.get_constraints().length; ii += 2) {
            was_satisfied = was_satisfied && this._constraint_boxes[ii / 2].is_satisfied();
        }

        let constraints_satisfied: boolean = this.checkConstraints();
        for (let ii = 0; ii < this._poses.length; ii++) {
            this.get_current_undo_block(ii).set_stable(constraints_satisfied);
        }

        /// Update spec thumbnail if it is open
        this.update_docked_spec_box();

        let is_there_temp_constraints: boolean = (this._puzzle.get_temporary_constraints() != null);

        if (constraints_satisfied && !is_there_temp_constraints) {
            if (this._puzzle.get_puzzle_type() !== PuzzleType.EXPERIMENTAL && this._puz_state === PuzzleState.GAME) {
                this.submit_current_pose();
            }
        }

        //when constaints are satisfied, trigger publish hint animation
        if (constraints_satisfied && !was_satisfied && this._puzzle.get_puzzle_type() === PuzzleType.EXPERIMENTAL) {
            log.debug("TODO: submit_button.respond()")
            // this._submit_button.respond(150, 160);
        }

    }

    private flash_constraint_for_target(target_index: number): void {
        let box: ConstraintBox = null;
        if (target_index === 0 || !this._is_pip_mode) {
            let constraints: string[] = this._puzzle.get_constraints();
            for (let ii: number = 0; ii < constraints.length; ii += 2) {
                if (constraints[ii] === ConstraintType.SHAPE && Number(constraints[ii + 1]) === target_index) {
                    box = this._constraint_boxes[ii / 2];
                    break;
                }
            }
        } else {
            box = this._constraint_shape_boxes[target_index];
        }

        if (box != null) {
            box.flash(0x00FFFF);
        }
    }

    private pose_edit_by_target(target_index: number): void {
        this.save_poses_markers_contexts();

        let xx: number = this._is_pip_mode ? target_index : this._current_target_index;
        let segments: number[] = this._poses[target_index].get_design_segments();
        let idx_map: number[] = this._poses[target_index].get_order_map(this._target_oligos_order[xx]);
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
                || EPars.has_cut(this._poses[target_index].get_full_sequence(), segments[1], segments[2]))) {
            /*
			- get design_segments
			- if (2 groups) and (all paired/unpaired in _target_pairs) and (all as dontcare)
				set _target_pairs
				clear design
			*/
            if (this._target_conditions[xx] != null) {
                structure_constraints = this._target_conditions[xx]['structure_constraints'];
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
                    if (this._target_pairs[xx][jj] < 0) {
                        num_unpaired++;
                    } else if (this._target_pairs[xx][jj] < segments[2] || this._target_pairs[xx][jj] > segments[3]) {
                        num_wrong++;
                    }
                }
                for (let jj = segments[2]; jj <= segments[3] && dontcare_ok; jj++) {
                    if (structure_constraints[jj]) {
                        dontcare_ok = false;
                        continue;
                    }
                    if (this._target_pairs[xx][jj] < 0) {
                        num_unpaired++;
                    } else if (this._target_pairs[xx][jj] < segments[0] || this._target_pairs[xx][jj] > segments[1]) {
                        num_wrong++;
                    }
                }
                if (dontcare_ok && num_wrong === 0) {
                    if (num_unpaired === 0) {
                        for (let jj = segments[0]; jj <= segments[1]; jj++) {
                            this._target_pairs[xx][jj] = -1;
                        }
                        for (let jj = segments[2]; jj <= segments[3]; jj++) {
                            this._target_pairs[xx][jj] = -1;
                        }
                        Eterna.sound.play_se(Sounds.SoundRY);
                        this.flash_constraint_for_target(xx);
                        this._poses[target_index].clear_design_struct();
                    } else if (num_unpaired === segments[1] - segments[0] + segments[3] - segments[2] + 2) {
                        // breaking pairs is safe, but adding them may not always be
                        if (EPars.validate_parenthesis(EPars.pairs_array_to_parenthesis(this._target_pairs[xx]).slice(segments[1] + 1, segments[2]), false) == null) {
                            for (let jj = segments[0]; jj <= segments[1]; jj++) this._target_pairs[xx][jj] = segments[3] - (jj - segments[0]);
                            for (let jj = segments[2]; jj <= segments[3]; jj++) this._target_pairs[xx][jj] = segments[1] - (jj - segments[2]);
                            Eterna.sound.play_se(Sounds.SoundGB);
                            this.flash_constraint_for_target(xx);
                            this._poses[target_index].clear_design_struct();
                            // if the above fails, and we have multi-oligos, there may be a permutation where it works
                        } else if (this._target_oligos[xx] != null && this._target_oligos[xx].length > 1) {
                            let new_order: number[] = [];
                            for (let jj = 0; jj < this._target_oligos[xx].length; jj++) new_order.push(jj);
                            let more: boolean;
                            do {
                                segments = this._poses[target_index].get_design_segments();
                                let new_map: number[] = this._poses[target_index].get_order_map(new_order);
                                let new_pairs: number[] = [];
                                if (new_map != null) {
                                    for (let jj = 0; jj < segments.length; jj++) {
                                        segments[jj] = new_map.indexOf(segments[jj]);
                                    }
                                    for (let jj = 0; jj < this._target_pairs[xx].length; jj++) {
                                        let kk: number = idx_map.indexOf(new_map[jj]);
                                        let pp: number = this._target_pairs[xx][kk];
                                        new_pairs[jj] = pp < 0 ? pp : new_map.indexOf(idx_map[pp]);
                                    }
                                }
                                if (EPars.validate_parenthesis(EPars.pairs_array_to_parenthesis(new_pairs).slice(segments[1] + 1, segments[2]), false) == null) {
                                    // compatible permutation
                                    this._target_pairs[xx] = new_pairs;
                                    this._target_oligos_order[xx] = new_order;
                                    for (let jj = segments[0]; jj <= segments[1]; jj++) {
                                        this._target_pairs[xx][jj] = segments[3] - (jj - segments[0]);
                                    }
                                    for (let jj = segments[2]; jj <= segments[3]; jj++) {
                                        this._target_pairs[xx][jj] = segments[1] - (jj - segments[2]);
                                    }
                                    Eterna.sound.play_se(Sounds.SoundGB);
                                    this.flash_constraint_for_target(xx);
                                    this._poses[target_index].clear_design_struct();
                                    more = false;
                                } else {
                                    more = FoldUtil.next_perm(new_order);
                                }
                            } while (more);
                        }
                    }
                }
            }
        }

        let last_shifted_index: number = this._poses[target_index].get_last_shifted_index();
        let last_shifted_command: number = this._poses[target_index].get_last_shifted_command();
        for (let ii: number = 0; ii < this._poses.length; ii++) {
            if (last_shifted_index > 0 && last_shifted_command >= 0) {
                if (ii !== target_index) {
                    this._poses[ii].base_shift_with_command(last_shifted_command, last_shifted_index);
                }

                let results: any = this._poses[ii].parse_command_with_pairs(last_shifted_command, last_shifted_index, this._target_pairs[ii]);
                if (results != null) {
                    let parenthesis: string = results[0];
                    let mode: number = results[1];
                    this._target_pairs[ii] = EPars.parenthesis_to_pair_array(parenthesis);
                }

                let anti_structure_constraints: any[] = this._target_conditions[ii]['anti_structure_constraints'];
                if (anti_structure_constraints != null) {
                    if (last_shifted_command === EPars.RNABASE_ADD_BASE) {
                        let anti_structure_constraint: boolean = anti_structure_constraints[last_shifted_index];
                        anti_structure_constraints.splice(last_shifted_index, 0, anti_structure_constraint);
                    } else if (last_shifted_command === EPars.RNABASE_DELETE) {
                        anti_structure_constraints.splice(last_shifted_index, 1);
                    }
                }

                structure_constraints = this._target_conditions[ii]['structure_constraints'];
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
                    this._target_conditions[ii]['structure_constraints'] = new_constraints;
                }

                let anti_secstruct: string = this._target_conditions[ii]['anti_secstruct'];
                if (anti_secstruct != null) {
                    let anti_pairs: number[] = EPars.parenthesis_to_pair_array(anti_secstruct);
                    let antiResult: any[] = this._poses[ii].parse_command_with_pairs(last_shifted_command, last_shifted_index, anti_pairs);
                    this._target_conditions[ii]['anti_secstruct'] = antiResult[0];
                }

                if (this._target_conditions[ii]['type'] === "aptamer") {
                    let binding_site: number[] = this._target_conditions[ii]['site'].slice(0);
                    let binding_pairs: number[] = [];
                    if (last_shifted_command === EPars.RNABASE_ADD_BASE) {
                        for (let ss: number = 0; ss < binding_site.length; ss++) {
                            if (binding_site[ss] >= last_shifted_index) {
                                binding_site[ss]++;
                            }
                        }

                        for (let jj = 0; jj < binding_site.length; jj++) {
                            binding_pairs.push(this._target_pairs[ii][binding_site[jj]]);
                        }
                    } else {
                        for (let ss = 0; ss < binding_site.length; ss++) {
                            if (binding_site[ss] >= last_shifted_index) {
                                binding_site[ss]--;
                            }
                        }

                        for (let jj = 0; jj < binding_site.length; jj++) {
                            binding_pairs.push(this._target_pairs[ii][binding_site[jj]]);
                        }
                    }

                    this._target_conditions[ii]['site'] = binding_site;
                    this._target_conditions[ii]['binding_pairs'] = binding_pairs;
                }
            }

            this._poses[ii].set_sequence(this._poses[target_index].get_sequence());
            this._poses[ii].set_puzzle_locks(this._poses[target_index].get_puzzle_locks());
        }

        this._fold_total_time = 0;

        if (this._is_frozen) {
            return;
        }

        let execfold_cb = (fd: any[]) => {
            // Application.instance.get_modal_container().removeObject(this._asynch_text);
            // Application.instance.remove_lock("FOLDING");
            // Application.instance.set_blocker_opacity(0.35);

            if (fd != null) {
                this._stack_level++;
                this._stack_size = this._stack_level + 1;
                this._seq_stacks[this._stack_level] = [];

                for (let ii = 0; ii < this._poses.length; ii++) {
                    let undo_block: UndoBlock = new UndoBlock([]);
                    undo_block.fromJson(fd[ii]);
                    this._seq_stacks[this._stack_level][ii] = undo_block;
                }

                this.save_poses_markers_contexts();
                this.move_undo_stack();
                this.update_score();
                this.transform_poses_markers();

                if (this._pose_edit_by_target_cb != null) {
                    this._pose_edit_by_target_cb();
                }
                return;
            }

            this.pose_edit_by_target_do_fold(target_index);
        };

        let sol: Solution = SolutionManager.instance.get_solution_by_sequence(this._poses[target_index].get_sequence_string());
        if (sol != null && this._puzzle.has_target_type("multistrand")) {
            this._asynch_text.text = "retrieving...";
            // Application.instance.set_blocker_opacity(0.2);
            // Application.instance.add_lock("FOLDING");
            // Application.instance.get_modal_container().addObject(this._asynch_text);

            sol.query_fold_data().then((result) => execfold_cb(result));
        } else {
            execfold_cb(null);
        }
    }

    private pose_edit_by_target_do_fold(target_index: number): void {
        this._fold_start_time = new Date().getTime();

        this._asynch_text.text = "folding...";

        // Application.instance.set_blocker_opacity(0.2);
        // Application.instance.add_lock("FOLDING");
        // Application.instance.get_modal_container().addObject(this._asynch_text);

        if (this._force_synch) {
            for (let ii: number = 0; ii < this._target_pairs.length; ii++) {
                this.pose_edit_by_target_fold_target(ii);
            }
            this.pose_edit_by_target_epilog(target_index);

        } else {
            for (let ii = 0; ii < this._target_pairs.length; ii++) {
                this._op_queue.push(new PoseOp(ii + 1, () => this.pose_edit_by_target_fold_target(ii)));
            }

            this._op_queue.push(new PoseOp(this._target_pairs.length + 1, () => this.pose_edit_by_target_epilog(target_index)));

        }

        if (this._pose_edit_by_target_cb != null) {
            this._pose_edit_by_target_cb();
        }
    }

    private pose_edit_by_target_fold_target(ii: number): void {
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
            this._stack_level++;
            this._seq_stacks[this._stack_level] = [];
        }
        // a "trick" used by the 'multifold' branch below, in order to
        // re-queue itself without triggering the stack push coded above
        ii = ii % this._target_pairs.length;

        let seq: number[] = this._poses[ii].get_sequence();

        if (this._target_conditions[ii]) force_struct = this._target_conditions[ii]['force_struct'];

        if (this._target_conditions[ii] == null || this._target_conditions[ii]['type'] === "single") {
            log.debug("folding");
            best_pairs = this._folder.fold_sequence(this._puzzle.transform_sequence(seq, ii), null, force_struct);

        } else if (this._target_conditions[ii]['type'] === "aptamer") {
            bonus = this._target_conditions[ii]['bonus'];
            sites = this._target_conditions[ii]['site'];
            best_pairs = this._folder.fold_sequence_with_binding_site(this._puzzle.transform_sequence(seq, ii), this._target_pairs[ii], sites, Number(bonus), this._target_conditions[ii]['fold_version']);

        } else if (this._target_conditions[ii]['type'] === "oligo") {
            fold_mode = this._target_conditions[ii]['fold_mode'] == null ? Pose2D.OLIGO_MODE_DIMER : this._target_conditions[ii]['fold_mode'];
            if (fold_mode === Pose2D.OLIGO_MODE_DIMER) {
                log.debug("cofold");
                full_seq = seq.concat(EPars.string_to_sequence_array("&" + this._target_conditions[ii]['oligo_sequence']));
                malus = Number(this._target_conditions[ii]['malus'] * 100);
                best_pairs = this._folder.cofold_sequence(full_seq, null, malus, force_struct);
            } else if (fold_mode === Pose2D.OLIGO_MODE_EXT5P) {
                full_seq = EPars.string_to_sequence_array(this._target_conditions[ii]['oligo_sequence']).concat(seq);
                best_pairs = this._folder.fold_sequence(full_seq, null, force_struct);
            } else {
                full_seq = seq.concat(EPars.string_to_sequence_array(this._target_conditions[ii]['oligo_sequence']));
                best_pairs = this._folder.fold_sequence(full_seq, null, force_struct);
            }

        } else if (this._target_conditions[ii]['type'] === "aptamer+oligo") {
            bonus = this._target_conditions[ii]['bonus'];
            sites = this._target_conditions[ii]['site'];
            fold_mode = this._target_conditions[ii]['fold_mode'] == null ? Pose2D.OLIGO_MODE_DIMER : this._target_conditions[ii]['fold_mode'];
            if (fold_mode === Pose2D.OLIGO_MODE_DIMER) {
                log.debug("cofold");
                full_seq = seq.concat(EPars.string_to_sequence_array("&" + this._target_conditions[ii]['oligo_sequence']));
                malus = Number(this._target_conditions[ii]['malus'] * 100);
                best_pairs = this._folder.cofold_sequence_with_binding_site(full_seq, sites, bonus, force_struct, malus);
            } else if (fold_mode === Pose2D.OLIGO_MODE_EXT5P) {
                full_seq = EPars.string_to_sequence_array(this._target_conditions[ii]['oligo_sequence']).concat(seq);
                best_pairs = this._folder.fold_sequence_with_binding_site(full_seq, this._target_pairs[ii], sites, Number(bonus), this._target_conditions[ii]['fold_version']);
            } else {
                full_seq = seq.concat(EPars.string_to_sequence_array(this._target_conditions[ii]['oligo_sequence']));
                best_pairs = this._folder.fold_sequence_with_binding_site(full_seq, this._target_pairs[ii], sites, Number(bonus), this._target_conditions[ii]['fold_version']);
            }

        } else if (this._target_conditions[ii]['type'] === "multistrand") {
            let oligos: any[] = [];
            for (let jj: number = 0; jj < this._target_conditions[ii]['oligos'].length; jj++) {
                oligos.push({
                    seq: EPars.string_to_sequence_array(this._target_conditions[ii]['oligos'][jj]['sequence']),
                    malus: Number(this._target_conditions[ii]['oligos'][jj]['malus'] * 100.0)
                });
            }
            log.debug("multifold");

            let key: any = {
                primitive: "multifold",
                seq: this._puzzle.transform_sequence(seq, ii),
                second_best_pairs: null,
                oligos: oligos,
                desired_pairs: null,
                temp: 37
            };
            let mfold: any = this._folder.get_cache(key);

            if (mfold == null && this._force_synch === false) {
                // multistrand folding can be really slow
                // break it down to each permutation
                let ops: PoseOp[] = this._folder.multifold_unroll(this._puzzle.transform_sequence(seq, ii), null, oligos);
                this._op_queue.unshift(new PoseOp(
                    ii + 1,
                    () => this.pose_edit_by_target_fold_target(ii + this._target_pairs.length)));
                while (ops.length > 0) {
                    let o: PoseOp = ops.pop();
                    o.sn = ii + 1;
                    this._op_queue.unshift(o);
                }
                return;

            } else {
                let best: any = this._folder.multifold(this._puzzle.transform_sequence(seq, ii), null, oligos);
                best_pairs = best.pairs.slice();
                oligo_order = best.order.slice();
                oligos_paired = best.count;
            }
        }

        let undo_block: UndoBlock = new UndoBlock(this._puzzle.transform_sequence(seq, ii));
        undo_block.set_pairs(best_pairs);
        undo_block.set_target_oligos(this._target_oligos[ii]);
        undo_block.set_target_oligo(this._target_oligo[ii]);
        undo_block.set_oligo_order(oligo_order);
        undo_block.set_oligos_paired(oligos_paired);
        undo_block.set_target_pairs(this._target_pairs[ii]);
        undo_block.set_target_oligo_order(this._target_oligos_order[ii]);
        undo_block.set_puzzle_locks(this._poses[ii].get_puzzle_locks());
        undo_block.set_target_conditions(this._target_conditions[ii]);
        undo_block.set_basics(this._folder);
        this._seq_stacks[this._stack_level][ii] = undo_block;
    }

    private pose_edit_by_target_epilog(target_index: number): void {
        // Application.instance.get_modal_container().removeObject(this._asynch_text);
        // Application.instance.remove_lock("FOLDING");
        // Application.instance.set_blocker_opacity(0.35);

        // this._fold_total_time = new Date().getTime() - this._fold_start_time;
        // if (!this._tools_container.contains(this._freeze_button) && this._fold_total_time >= 1000.0) { // FIXME: a bit arbitrary...
        //     this._tools_container.addObject(this._freeze_button);
        //     this.layout_bars();
        // }

        this._stack_size = this._stack_level + 1;
        this.update_score();
        this.transform_poses_markers();

        /// JEEFIX

        let last_best_pairs: number[] = null;
        let best_pairs: number[] = last_best_pairs = this._seq_stacks[this._stack_level][target_index].get_pairs();
        if (this._stack_level > 0) {
            last_best_pairs = this._seq_stacks[this._stack_level - 1][target_index].get_pairs();
        }

        if (last_best_pairs != null) {
            let is_shape_constrained: boolean = false;
            let constraints: string[] = this._puzzle.get_constraints();

            if (this._puzzle.get_temporary_constraints() != null) {
                constraints = this._puzzle.get_temporary_constraints();
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

            if (!this._poses[target_index].is_using_low_performance()) {
                let stack_start: number = -1;
                let last_other_stack: number = -1;
                for (let ii = 0; ii < best_pairs.length; ii++) {
                    if (pairs_diff[ii] > 0 && ((!is_shape_constrained && this._pose_state === PoseState.NATIVE) || (best_pairs[ii] === this._target_pairs[target_index][ii]))) {
                        if (stack_start < 0) {
                            stack_start = ii;
                            last_other_stack = best_pairs[ii];
                        } else {
                            if (best_pairs[ii] !== last_other_stack - 1) {
                                this._poses[target_index].praise_stack(stack_start, ii - 1);
                                stack_start = ii;
                            }

                            last_other_stack = best_pairs[ii];
                        }
                    } else {
                        if (stack_start >= 0) {
                            this._poses[target_index].praise_stack(stack_start, ii - 1);
                            stack_start = -1;
                            last_other_stack = -1;
                        }

                    }
                }
            }
        }

        if (this._fold_total_time >= 1000.0 && this._puzzle.has_target_type("multistrand")) {
            let sol: Solution = SolutionManager.instance.get_solution_by_sequence(this._poses[target_index].get_sequence_string());
            if (sol != null && !sol.has_fold_data()) {
                let fd: any[] = [];
                for (let ii = 0; ii < this._poses.length; ii++) {
                    fd.push(this.get_current_undo_block(ii).toJson());
                }
                sol.set_fold_data(fd);

                Eterna.client.update_solution_fold_data(sol.get_node_id(), fd).then((datastring: string) => {
                    log.debug(datastring);
                });
            }
        }
    }

    private get_current_undo_block(target_index: number = -1): UndoBlock {
        if (target_index < 0) {
            return this._seq_stacks[this._stack_level][this._current_target_index];
        } else {
            return this._seq_stacks[this._stack_level][target_index];
        }
    }

    private set_poses_with_undo_block(ii: number, undo_block: UndoBlock): void {
        this._poses[ii].set_sequence(this._puzzle.transform_sequence(undo_block.get_sequence(), ii));
        this._poses[ii].set_puzzle_locks(undo_block.get_puzzle_locks());
    }

    private move_undo_stack(): void {
        for (let ii: number = 0; ii < this._poses.length; ii++) {
            this.set_poses_with_undo_block(ii, this._seq_stacks[this._stack_level][ii]);
            this._target_pairs[ii] = this._seq_stacks[this._stack_level][ii].get_target_pairs();
            this._target_conditions[ii] = this._seq_stacks[this._stack_level][ii].get_target_conditions();
            this._target_oligo[ii] = this._seq_stacks[this._stack_level][ii].get_target_oligo();
            this._oligo_mode[ii] = this._seq_stacks[this._stack_level][ii].get_oligo_mode();
            this._oligo_name[ii] = this._seq_stacks[this._stack_level][ii].get_oligo_name();
            this._target_oligos[ii] = this._seq_stacks[this._stack_level][ii].get_target_oligos();
            this._target_oligos_order[ii] = this._seq_stacks[this._stack_level][ii].get_target_oligo_order();
        }
    }

    private move_undo_stack_forward(): void {
        if (this._stack_level + 1 > this._stack_size - 1) {
            return;
        }
        this.save_poses_markers_contexts();

        let before: number[] = this._puzzle.transform_sequence(this.get_current_undo_block(0).get_sequence(), 0);

        this._stack_level++;
        this.move_undo_stack();

        let after: number[] = this._puzzle.transform_sequence(this.get_current_undo_block(0).get_sequence(), 0);
        this.move_history_add_mutations(before, after);

        this.update_score();
        this.transform_poses_markers();
    }

    private move_undo_stack_backward(): void {
        if (this._stack_level < 1) {
            return;
        }
        this.save_poses_markers_contexts();

        let before: number[] = this._puzzle.transform_sequence(this.get_current_undo_block(0).get_sequence(), 0);

        this._stack_level--;
        this.move_undo_stack();

        let after: number[] = this._puzzle.transform_sequence(this.get_current_undo_block(0).get_sequence(), 0);
        this.move_history_add_mutations(before, after);

        this.update_score();
        this.transform_poses_markers();
    }

    private move_undo_stack_to_last_stable(): void {
        this.save_poses_markers_contexts();
        let before: number[] = this._puzzle.transform_sequence(this.get_current_undo_block(0).get_sequence(), 0);

        let stack_level: number = this._stack_level;
        while (this._stack_level >= 1) {

            if (this.get_current_undo_block(0).get_stable()) {
                this.move_undo_stack();

                let after: number[] = this._puzzle.transform_sequence(this.get_current_undo_block(0).get_sequence(), 0);
                this.move_history_add_mutations(before, after);

                this.update_score();
                this.transform_poses_markers();
                return;
            }

            this._stack_level--;
        }
        this._stack_level = stack_level;
    }

    /*
		Prompt feed when celebrating about cleared puzzle
	*/
    private facebook_prompt_feed(): void {
        // let req: URLRequest = new URLRequest;
        //
        // req.url = Application.instance.get_url_base()
        //     + "/content/facebook-connect?flag=" + Achievements.FLAG_PUZZLE
        //     + "&puzzle=" + this._puzzle.get_puzzle_name()
        //     + "&reward=" + this._puzzle.get_reward()
        //     + "&node_id=" + this._puzzle.get_node_id();
        //
        // this.navigateToURL(req, "facebook");
    }

    private static go_to_strategy_guide(): void {
        window.open(EternaURL.STRATEGY_GUIDE, "_blank");
    }

    private set_show_menu(show_menu: boolean): void {
        log.debug("TODO: set_show_menu");
        // let m: GameObject = (<GameObject>Application.instance.get_application_gui("Menu"));
        // if (m) m.visible = show_menu;
    }

    private hide_end_curtain(): void {
        for (let pose of this._poses) {
            pose.set_show_total_energy(true);
            pose.clear_explosion();
        }
        // this._mission_cleared.set_animator(new GameAnimatorFader(1, 0, 0.3, true));
        this.disable_tools(false);
        this.set_show_menu(true);
    }

    private clear_undo_stack(): void {
        this._stack_level = -1;
        this._stack_size = 0;
        this._seq_stacks = [];
    }

    private layout_bars(): void {
        this._scriptbar.display.position = new Point(
            Flashbang.stageWidth - 20 - this._scriptbar.get_bar_width(),
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

    private _constraintsLayer: Container;

    private _background: Background;

    private _toolbar: PoseEditToolbar;

    private _folder: Folder;
    /// Asynch folding
    private _op_queue: PoseOp[] = [];
    private _pose_edit_by_target_cb: () => void = null;
    private _asynch_text: Text;
    private _fold_start_time: number;
    private _fold_total_time: number;
    /// Undo stack
    private _seq_stacks: UndoBlock[][];
    private _stack_level: number;
    private _stack_size: number;
    private _puz_state: PuzzleState;
    private _waiting_for_input: boolean = false;
    private _paused: boolean;
    private _start_solving_time: number;
    private _starting_point: string;
    private _move_count: number = 0;
    private _moves: any[] = [];
    private _current_target_index: number = 0;
    private _pose_state: PoseState = PoseState.NATIVE;
    private _target_pairs: number[][] = [];
    private _target_conditions: any[] = [];
    private _target_oligo: any[] = [];
    private _oligo_mode: any[] = [];
    private _oligo_name: any[] = [];
    private _target_oligos: any[] = [];
    private _target_oligos_order: any[] = [];

    private _folder_button: GameButton;
    private _is_databrowser_mode: boolean;
    /// Modes
    private _is_frozen: boolean = false;
    // Nova-syle switches
    private _target_name: Text;

    private _hintBoxRef: GameObjectRef = GameObjectRef.NULL;

    /// constraints && scoring display
    private _constraint_boxes: ConstraintBox[];
    private _constraint_shape_boxes: ConstraintBox[];
    private _constraint_antishape_boxes: ConstraintBox[];
    private _unstable_index: number;
    private _constraints_offset: number;

    private _docked_spec_box: SpecBox;
    /// Exit button
    private _exit_button: GameButton;

    private _constraints_head: number = 0;
    private _constraints_foot: number = 0;
    private _constraints_top: number = 0;
    private _constraints_bottom: number = 0;
    /// UI highlight box
    private _ui_highlight: SpriteObject;
    /// Game Stamp
    // private _game_stamp: Texture;
    /// Additional menu item
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
    private _nid_field: Text;
    private _run_button: GameButton;
    private _run_status: Text;
    private _script_hooks: boolean = false;
    private _setter_hooks: boolean = false;
    /// ROP presets
    private _rop_presets: (() => void)[] = [];
    private _is_pic_disabled: boolean = false;
    // Design browser hooks
    private _next_design_cb: () => void = null;
    private _prev_design_cb: () => void = null;
    private _is_playing: boolean = false;
    // Tutorial Script Extra Functionality
    private _show_mission_screen: boolean = true;
    private _override_show_constraints: boolean = true;
    private _ancestor_id: number;
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


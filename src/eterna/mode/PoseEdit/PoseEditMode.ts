import * as log from "loglevel";
import {Point, Text} from "pixi.js";
import {Flashbang} from "../../../flashbang/core/Flashbang";
import {GameObject} from "../../../flashbang/core/GameObject";
import {KeyCode} from "../../../flashbang/input/KeyCode";
import {ContainerObject} from "../../../flashbang/objects/ContainerObject";
import {SpriteObject} from "../../../flashbang/objects/SpriteObject";
import {AlphaTask} from "../../../flashbang/tasks/AlphaTask";
import {Assert} from "../../../flashbang/util/Assert";
import {Application} from "../../Application";
import {EPars} from "../../EPars";
import {Eterna} from "../../Eterna";
import {Folder} from "../../folding/Folder";
import {FolderManager} from "../../folding/FolderManager";
import {FoldUtil} from "../../folding/FoldUtil";
import {Pose2D} from "../../pose2D/Pose2D";
import {PoseField} from "../../pose2D/PoseField";
import {Puzzle} from "../../puzzle/Puzzle";
import {Solution} from "../../puzzle/Solution";
import {SolutionManager} from "../../puzzle/SolutionManager";
import {ActionBar} from "../../ui/ActionBar";
import {EternaViewOptionsDialog, EternaViewOptionsMode} from "../../ui/EternaViewOptionsDialog";
import {GameButton} from "../../ui/GameButton";
import {GamePanel} from "../../ui/GamePanel";
import {GetPaletteTargetBaseType, PaletteTargetType} from "../../ui/NucleotidePalette";
import {SpecBox} from "../../ui/SpecBox";
import {UndoBlock, UndoBlockParam} from "../../UndoBlock";
import {AutosaveManager} from "../../util/AutosaveManager";
import {BitmapManager} from "../../util/BitmapManager";
import {Fonts} from "../../util/Fonts";
import {SoundManager} from "../../util/SoundManager";
import {UDim} from "../../util/UDim";
import {Background} from "../../vfx/Background";
import {BubbleSweep} from "../../vfx/BubbleSweep";
import {GameMode} from "../GameMode";
import {PoseEditToolbar} from "./PoseEditToolbar";
import {PuzzleEvent} from "./PuzzleEvent";

type InteractionEvent = PIXI.interaction.InteractionEvent;

export enum PuzzleState {
    SETUP = -1,
    COUNTDOWN = 0,
    GAME = 1,
    CLEARED = 2,
}

export enum PoseState {
    NATIVE = 0,
    FROZEN = 1,
    TARGET = 2,
    PIP = 3,
    NONPIP = 4,
    SECOND = 5,
}

export class PoseEditMode extends GameMode {
    public constructor(puz: Puzzle, init_seq?: number[], is_reset?: boolean) {
        super();
        this._puzzle = puz;
        this._initSeq = init_seq;
        this._isReset = is_reset;
    }

    protected setup(): void {
        this._background = new Background();
        this.addObject(this._background, this.modeSprite);

        super.setup();

        // this._mission_container = Application.instance.get_front_object_container();
        // if (this._mission_container == null) this._mission_container = this;

        this._is_screenshot_supported = true;

        this._toolbar = new PoseEditToolbar(this._puzzle);
        this.addObject(this._toolbar, this._uiLayer);
        this._toolbar.display.position = new Point(
            (Flashbang.stageWidth - this._toolbar.container.width) * 0.5,
            Flashbang.stageHeight - 20);

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
        this._toolbar.paste_button.clicked.connect(() => {
            log.debug("TODO: paste_button_clicked");
            // Application.instance.add_lock("PASTESEQUENCE");
            // this._paste_field.set_hotkeys(KeyCode.KEY_NONE, "", KeyCode.KEY_ESC, "Esc");
            // Application.instance.get_modal_container().addObject(this._paste_field);
        });
        this._toolbar.view_options_button.clicked.connect(() => {
            let mode = this._puzzle.get_puzzle_type() == "Experimental" ?
                EternaViewOptionsMode.LAB :
                EternaViewOptionsMode.PUZZLE;
            this.showDialog(new EternaViewOptionsDialog(mode));
        });

        this._toolbar.copy_button.clicked.connect(() => {
            Application.instance.copy_to_clipboard(EPars.sequence_array_to_string(this._poses[0].get_sequence()), "Copied the current sequence to the clipboard");
        });

        this._toolbar.pip_button.clicked.connect(() => {
            this.toggle_pip();
            if (this._puzzle.get_puzzle_type() == "SwitchBasic" && this._waiting_for_input) {
                let state_dict: Map<any, any> = new Map();
                state_dict.set(PuzzleEvent.PUZEVENT_MODE_CHANGE, PoseState.PIP);
                this._puzzle_events.process_events(state_dict);
            }
        });

        this._toolbar.freeze_button.clicked.connect(() => this.toggle_freeze());
        this._toolbar.palette.targetClicked.connect((targetType) => this.onPaletteTargetSelected(targetType));
        this._toolbar.pair_swap_button.clicked.connect(() => this.on_click_P());
        this._toolbar.hint_button.clicked.connect(() => this.on_click_hint());
        this._toolbar.spec_button.clicked.connect(() => this.show_spec());

        this.regs.add(Eterna.settings.autohideToolbar.connectNotify((value) => {
            this._toolbar.set_toolbar_autohide(value);
        }));

        // this._paste_field = new InputField;
        // this._paste_field.add_field("Sequence", 200);
        // this._paste_field.set_title("Write down a sequence");
        // this._paste_field.set_callbacks((dic: Map<any, any>) => {
        //         let sequence: string = dic["Sequence"];
        //         let char: string = "";
        //         for (ii = 0; ii < sequence.length; ii++) {
        //             char = sequence.substr(ii, 1);
        //             if (char != "A" && char != "U" && char != "G" && char != "C") {
        //                 Application.instance.setup_msg_box("You can only use characters A,U,G and C");
        //                 return;
        //             }
        //         }
        //         for (ii = 0; ii < this._poses.length; ii++) {
        //             this._poses[ii].paste_sequence(EPars.string_to_sequence_array(sequence));
        //         }
        //         this.move_history_add_sequence("paste", sequence);
        //         this._paste_field.clear_fields();
        //         Application.instance.remove_lock("PASTESEQUENCE");
        //         Application.instance.get_modal_container().removeObject(this._paste_field);
        //     },
        //     () => {
        //         this._paste_field.clear_fields();
        //         Application.instance.remove_lock("PASTESEQUENCE");
        //         Application.instance.get_modal_container().removeObject(this._paste_field);
        //     });
        // this._paste_field.set_pos(new UDim(0.5, 0.5, -150, -100));


        // let opt: GameObject = (<GameObject>Application.instance.get_application_gui("View options"));
        // if (opt != null) {
        //     this._toolbar.viewOptionsClicked.connect(opt.open_view_options);
        // }

        this._hint_box = new GamePanel();
        this._hint_box.display.visible = false;
        this.addObject(this._hint_box, this._uiLayer);

        this._hint_text = Fonts.arial("", 14).build();
        this._hint_box.container.addChild(this._hint_text);

        this._spec_box = new SpecBox();
        this._spec_box.display.position = new Point(Flashbang.stageWidth * 0.15, Flashbang.stageHeight * 0.15);
        this._spec_box.set_size(Flashbang.stageWidth * 0.7, Flashbang.stageHeight * 0.7);

        this._docked_spec_box = new SpecBox(true);
        this._docked_spec_box.display.position = new Point(15, 190);
        this._docked_spec_box.set_size(155, 251);
        this._docked_spec_box.display.visible = false;
        this.addObject(this._docked_spec_box, this._uiLayer);

        let x_button: GameButton = new GameButton()
            .allStates(BitmapManager.ImgMaximize)
            .tooltip("Re-maximize")
            .hotkey(KeyCode.KeyM);
        x_button.display.position = new Point(Flashbang.stageWidth - 22, 5);
        x_button.clicked.connect(() => {
            this._docked_spec_box.display.visible = false;
            this.show_spec();
        });
        this._docked_spec_box.addObject(x_button, this._docked_spec_box.container);

        this._folder_button = new GameButton()
            .allStates(BitmapManager.ShapeImg)
            .label("-", 22)
            .tooltip("Select the folding engine.");
        this._folder_button.display.position = new Point(17, 160);
        this._folder_button.display.scale = new Point(0.5, 0.5);
        // this._folder_button.set_size(new UDim(0, 0, 111, 40));
        this._folder_button.clicked.connect(() => this.change_folder());

        // this._submit_field = new InputField;
        // this._submit_field.set_title("Submit your design");
        // this._submit_field.add_field("Title", 200);
        // this._submit_field.add_field("Comment", 200, true);
        // this._submit_field.set_callbacks(this.on_submit, this.on_cancel_submit);
        // this._submit_field.set_pos(new UDim(0.5, 0.5, -150, -100));

        this._ui_highlight = new SpriteObject();
        this.addObject(this._ui_highlight, this._uiLayer);

        this._bubble_curtain = new BubbleSweep(800);
        this._bubble_curtain.display.visible = false;
        this.addObject(this._bubble_curtain, this.modeSprite);

        // this._mission_cleared = new MissionCleared();
        // this._mission_cleared.visible = false;
        // this.addObject(this._mission_cleared);

        this._submitting_text = Fonts.arial("Submitting...", 20).bold().build();
        this._submitting_text.position = new Point(
            (Flashbang.stageWidth - this._submitting_text.width) * 0.5,
            (Flashbang.stageHeight - this._submitting_text.height) * 0.5);

        // this._constraint_boxes = [];
        this._constraints_container = new ContainerObject();
        /// Constraints should be on top of curtain
        this.addObject(this._constraints_container, this._uiLayer);

        /// Puzzle event must be at the top
        this._puzzle_events = new PuzzleEvent();
        this.addObject(this._puzzle_events, this._uiLayer);
        // Application.instance.get_front_object_container().addObject(this._puzzle_events);

        // this._game_stamp = new GameBitmap(null);
        // this._game_stamp.visible = false;
        // this.addObject(this._game_stamp);

        this._exit_button = new GameButton().up(BitmapManager.ImgNextInside);
        this._exit_button.display.scale = new Point(0.3, 0.3);
        this._exit_button.display.position = new Point(Flashbang.stageWidth - 85, Flashbang.stageHeight - 60);
        this._exit_button.display.visible = false;
        this.regs.add(this._exit_button.clicked.connect(() => this.exit_puzzle()));

        this._scriptbar = new ActionBar(50);
        this.addObject(this._scriptbar, this._uiLayer);

        this._nid_field = Fonts.arial("", 16).color(0xffffff).build();
        this._nid_field.width = 100;
        this._nid_field.height = 20;

        this._run_button = new GameButton().allStates(BitmapManager.MingFold);

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

        if (this._puzzle.get_puzzle_type() == "Basic" || this._puzzle.get_puzzle_type() == "Challenge") {
            let state_dict: Map<any, any> = new Map();
            state_dict.set(PuzzleEvent.PUZEVENT_TRANSIT_TO, newstate);
            this._puzzle_events.process_events(state_dict);
        }
    }

    public set_puzzle_default_mode(default_mode: string): void {
        this._puzzle.set_default_mode(default_mode);
    }

    public rop_change_target(target_index: number): void {
        this.change_target(target_index);
        if (this._toolbar.toggle_bar != null) {
            this._toolbar.toggle_bar.set_state(target_index);
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
        let pre: Function = () => {
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
        let pre: Function = () => {
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
        let pre: Function = () => {
            that.set_show_total_energy(show);
        };
        this._rop_presets.push(pre);
    }

    public select_folder(folder_name: string): boolean {
        if (this._folder.get_folder_name() == folder_name) return true;
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
        if (this._puzzle.get_puzzle_type() == "Basic") {
            let states: Map<any, any> = new Map();
            states.set(PuzzleEvent.PUZEVENT_SET_PALLETE, baseType);
            this._puzzle_events.process_events(states);
        }

        this.set_poses_color(baseType);
        this.deselect_all_colorings();
    }

    public on_click_P(): void {
        this.set_poses_color(EPars.RNABASE_PAIR);
        this.deselect_all_colorings();
        this._toolbar.pair_swap_button.toggled.value = true;
    }

    public on_click_hint(): void {
        if (this._hint_box.display.visible) {
            this._hint_box.display.visible = false;
        } else {
            this._hint_box.set_panel_title("Hint"); // by " + _puzzle.get_coauthor());
            this._hint_text.text = this._puzzle.get_hint();
            // this._hint_text.set_autosize(false, false, 400);
            this._hint_text.position = new Point(10, 38);
            let h: number = this._hint_text.height;
            this._hint_box.set_size(420, h + 46);
            this._hint_box.display.position = new Point(Flashbang.stageWidth - 440, Flashbang.stageHeight - 140 - h);
            this._hint_box.display.visible = true;
        }
    }

    public public_start_countdown(): void {
        this.start_countdown();
    }

    public restart_from(seq: string): void {
        this.clear_undo_stack();

        let restart_cb: Function = (fd: any[]) => {
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
                for (let ii = 0; ii < this._poses.length; ii++) {
                    this._poses[ii].paste_sequence(seq_arr);
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

        let bind_addbase_cb: Function = (pose: Pose2D, kk: number) => {
            pose.set_add_base_callback((parenthesis: string, mode: number, index: number) => {
                pose.base_shift(parenthesis, mode, index);
                this.pose_edit_by_target(kk);
            });
        };

        let bind_pose_edit: Function = (pose: Pose2D, index: number) => {
            pose.set_pose_edit_callback(() => {
                this.pose_edit_by_target(index);
            });
        };
        let bind_track_moves: Function = (pose: Pose2D, index: number) => {
            pose.set_track_moves_callback((count: number, moves: any[]) => {
                this._move_count += count;
                if (moves) {
                    this._moves.push(moves.slice());
                }
            });
        };

        let bind_mousedown_event: Function = function (pose: Pose2D, index: number): void {
            pose.set_start_mousedown_callback((e: InteractionEvent, closest_dist: number, closest_index: number) => {
                for (let ii: number = 0; ii < pose_fields.length; ++ii) {
                    let pose_field: PoseField = pose_fields[ii];
                    let pose: Pose2D = pose_field.get_pose();
                    if (index == ii) {
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
        //     && this.root.loaderInfo.parameters.databrowser == "true") {
        //     this._is_databrowser_mode = true;
        // }

        let default_mode: string = this._puzzle.default_mode();

        if (this._is_databrowser_mode) {
            this._pose_state = (PoseState.NATIVE);
        } else if (default_mode == "TARGET") {
            this._pose_state = (PoseState.TARGET);
        } else if (default_mode == "FROZEN") {
            this._pose_state = (PoseState.FROZEN);
        } else {
            this._pose_state = (PoseState.NATIVE);
        }

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
                let odefs: any[] = target_conditions[ii]['oligos'];
                let ndefs: any[] = [];
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

        /// Set puzzle title
        // let title_gui: GameObject = Application.instance.get_application_gui("Puzzle Title");
        // if (title_gui != null) {
        //     title_gui.set_text(puz.get_puzzle_name(true));
        // }

        // this._mission_cleared.visible = false;
        // this._mission_cleared.reset();

        this._constraints_container.display.visible = true;

        if (!this._puzzle.is_pallete_allowed()) {
            for (let ii = 0; ii < this._poses.length; ii++) {
                this._poses[ii].set_current_color(-1);
            }
        } else {
            this._toolbar.palette.clickTarget(PaletteTargetType.A);
        }

        let num_constraints: number = 0;
        let constraints: any[] = [];
        if (this._puzzle.get_constraints() != null) {
            num_constraints = this._puzzle.get_constraints().length;
            constraints = this._puzzle.get_constraints();
        }

        this._constraints_container.removeAllObjects();
        // this._constraint_boxes = [];
        this._unstable_index = -1;

        // if (num_constraints > 0) {
        //     if (num_constraints % 2 != 0) {
        //         throw new Error("Wrong constraints length");
        //     }
        //
        //     if (this._constraint_boxes.length < num_constraints / 2) {
        //         let orig_boxes: number = this._constraint_boxes.length;
        //         for (let ii = orig_boxes; ii < num_constraints / 2; ii++) {
        //             let newbox: ConstraintBox = new ConstraintBox;
        //             this._constraint_boxes.push(newbox);
        //             this._constraints_container.addObject(newbox);
        //         }
        //     }
        //
        //     this._constraint_shape_boxes = [];
        //     this._constraint_shape_boxes.push(null);
        //
        //     this._constraint_antishape_boxes = [];
        //     this._constraint_antishape_boxes.push(null);
        //     if (this._target_pairs.length > 1) {
        //         for (let ii = 1; ii < this._target_pairs.length; ii++) {
        //             this._constraint_shape_boxes[ii] = null;
        //             this._constraint_antishape_boxes[ii] = null;
        //             for (let jj = 0; jj < num_constraints; jj += 2) {
        //                 if (constraints[jj] == "SHAPE") {
        //                     if (Number(constraints[jj + 1]) == ii) {
        //                         newbox = new ConstraintBox();
        //                         this._constraint_shape_boxes[ii] = newbox;
        //                         this._constraints_container.addObject(newbox);
        //                     }
        //                 } else if (constraints[jj] == "ANTISHAPE") {
        //                     if (Number(constraints[jj + 1]) == ii) {
        //                         newbox = new ConstraintBox();
        //                         this._constraint_antishape_boxes[ii] = newbox;
        //                         this._constraints_container.addObject(newbox);
        //                     }
        //                 }
        //             }
        //         }
        //     }
        // }
        //
        // for (let ii = 0; ii < this._constraint_boxes.length; ii++) {
        //     ConstraintBox(this._constraint_boxes[ii]).visible = false;
        // }

        let pairs: number[] = EPars.parenthesis_to_pair_array(this._puzzle.get_secstruct());

        /// Setup Action bar
        this._scriptbar.clear_items(false);

        // this._scriptbar.visible = false;
        // if (this.root.loaderInfo.parameters.scriptbar
        //     && this.root.loaderInfo.parameters.scriptbar == "true") {
        //     this._scriptbar.visible = true;
        //     this._scriptbar.add_item(this._nid_field, false, false);
        //     this._scriptbar.add_item(this._run_button, false, false);
        //     this._scriptbar.add_item(this._run_status);
        //
        //     if (ExternalInterface.available) {
        //         this._scriptbar.set_disabled(false);
        //         this._run_button.set_click_callback(this.on_click_run);
        //     } else {
        //         this._scriptbar.set_disabled(true);
        //         this._run_button.set_click_callback(null);
        //     }
        // }

        this._yt_id = null;

        // this._mission_screen = new MissionScreen(
        //     puz.get_puzzle_name(true),
        //     missionDescriptionOverride || puz.get_mission_text(),
        //     this._target_pairs,
        //     this.on_click_start_curtain);
        //
        // this._mission_screen.visible = false;
        // this._mission_container.addObject(this._mission_screen);

        this.layout_bars();
        this.layout_constraints();

        this._folder = FolderManager.instance.get_folder(this._puzzle.get_folder());

        if (this._folder.can_score_structures()) {
            for (let ii = 0; ii < this._poses.length; ii++) {
                this._poses[ii].set_score_visualization(this._folder);
            }
        } else {
            for (let ii = 0; ii < this._poses.length; ii++) {
                this._poses[ii].set_score_visualization(null);
            }
        }

        for (let ii = 0; ii < this._poses.length; ii++) {
            let seq: number[] = this._initSeq;

            if (seq == null) {
                seq = this._puzzle.get_beginning_sequence(ii);
                if (this._puzzle.get_puzzle_type() == "Challenge" && !this._isReset) {
                    let saved_seq: number[] = this._puzzle.get_saved_sequence();
                    if (saved_seq != null) {
                        if (saved_seq.length == seq.length) {
                            seq = saved_seq;
                        }
                    }
                }
            } else {
                if (this._puzzle.get_puzzle_type() == "Experimental" && this._puzzle.is_using_tails()) {
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

        /// Clear bubble curtain
        this._bubble_curtain.stop_sweep();

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
                this._op_queue.push(new AsyncOp(
                    this._target_pairs.length,
                    () => this.set_puzzle_epilog(this._initSeq, this._isReset)));
            }
            this._pose_edit_by_target_cb = null;
        };

        if (!autoloaded) {
            this.pose_edit_by_target(0);
        }
    }

    public get_folder(): Folder {
        return this._folder;
    }

    /*override*/
    // public register_script_callbacks(): void {
    //     if (this._script_hooks) return;
    //     this._script_hooks = true;
    //
    //     let that: PoseEditMode = this;
    //     let puz: Puzzle = this._puzzle;
    //     let folder: Folder = this._folder;
    //
    //     ExternalInterface.addCallback("get_sequence_string", function (): string {
    //         // that.trace_js("get_sequence_string() called");
    //         return that.get_pose(0).get_sequence_string();
    //     });
    //     ExternalInterface.addCallback("get_full_sequence", function (indx: number): string {
    //         // that.trace_js("get_full_sequence() called");
    //         if (indx < 0 || indx >= that._poses.length) return null;
    //         return EPars.sequence_array_to_string(that.get_pose(indx).get_full_sequence());
    //     });
    //     ExternalInterface.addCallback("get_locks", function (): any[] {
    //         // that.trace_js("get_locks() called");
    //         let pose: Pose2D = that.get_pose(0);
    //         let locks: any[] = pose.get_puzzle_locks().slice(0, pose.get_sequence().length);
    //         return locks;
    //     });
    //     ExternalInterface.addCallback("get_targets", function (): any[] {
    //         // that.trace_js("get_targets() called");
    //         let conditions: any[] = puz.get_target_conditions();
    //         if (conditions.length == 0) conditions.push(null);
    //         for (let ii: number = 0; ii < conditions.length; ii++) {
    //             if (conditions[ii] == null) {
    //                 conditions[ii] = {};
    //                 conditions[ii]['type'] = "single";
    //                 conditions[ii]['secstruct'] = puz.get_secstruct(ii);
    //             }
    //         }
    //         return JSON.parse(JSON.stringify(conditions));
    //     });
    //     ExternalInterface.addCallback("get_native_structure", function (indx: number): string {
    //         if (indx < 0 || indx >= that._poses.length) return null;
    //         let native_pairs: any[] = that.get_current_undo_block(indx).get_pairs();
    //         return EPars.pairs_array_to_parenthesis(native_pairs);
    //     });
    //     ExternalInterface.addCallback("get_full_structure", function (indx: number): string {
    //         if (indx < 0 || indx >= that._poses.length) return null;
    //         let native_pairs: any[] = that.get_current_undo_block(indx).get_pairs();
    //         let seq_arr: any[] = that.get_pose(indx).get_full_sequence();
    //         return EPars.pairs_array_to_parenthesis(native_pairs, seq_arr);
    //     });
    //     ExternalInterface.addCallback("get_free_energy", function (indx: number): number {
    //         if (indx < 0 || indx >= that._poses.length) return Number.NaN;
    //         return that.get_current_undo_block(indx).get_param(UndoBlockParam.FE);
    //     });
    //     ExternalInterface.addCallback("get_constraints", function (): any[] {
    //         // that.trace_js("get_constraints() called");
    //         return JSON.parse(JSON.stringify(puz.get_constraints()));
    //     });
    //     ExternalInterface.addCallback("check_constraints", function (): boolean {
    //         // that.trace_js("check_constraints() called");
    //         return that.check_constraints(false);
    //     });
    //     ExternalInterface.addCallback("constraint_satisfied", function (indx: number): boolean {
    //         // that.trace_js("constraint_satisfied() called");
    //         that.check_constraints(true);
    //         if (indx < that.get_constraint_count()) {
    //             let o: Object = that.get_constraint(indx);
    //             return o.is_satisfied();
    //         } else {
    //             return false;
    //         }
    //     });
    //     ExternalInterface.addCallback("get_tracked_indices", function (): any[] {
    //         // that.trace_js("get_tracked_indices() called");
    //         return that.get_pose(0).get_tracked_indices();
    //     });
    //     ExternalInterface.addCallback("get_barcode_indices", function (): any[] {
    //         // that.trace_js("get_barcode_indices() called");
    //         return puz.get_barcode_indices();
    //     });
    //     ExternalInterface.addCallback("is_barcode_available", function (seq: string): boolean {
    //         // that.trace_js("is_barcode_available() called");
    //         return SolutionManager.instance.check_redundancy_by_hairpin(seq);
    //     });
    //     ExternalInterface.addCallback("current_folder", function (): string {
    //         // that.trace_js("current_folder() called");
    //         return that._folder.get_folder_name();
    //     });
    //
    //     ExternalInterface.addCallback("fold", function (seq: string, constraint: string = null): string {
    //         // that.trace_js("fold() called");
    //         let seq_arr: any[] = EPars.string_to_sequence_array(seq);
    //         let folded: any[] = folder.fold_sequence(seq_arr, null, constraint);
    //         return EPars.pairs_array_to_parenthesis(folded);
    //     });
    //     ExternalInterface.addCallback("fold_with_binding_site", function (seq: string, site: any[], bonus: number): string {
    //         // that.trace_js("fold_with_binding_site() called");
    //         let seq_arr: any[] = EPars.string_to_sequence_array(seq);
    //         let folded: any[] = folder.fold_sequence_with_binding_site(seq_arr, null, site, Number(bonus * 100.), 2.5);
    //         return EPars.pairs_array_to_parenthesis(folded);
    //     });
    //     ExternalInterface.addCallback("energy_of_structure", function (seq: string, secstruct: string): number {
    //         // that.trace_js("energy_of_structure() called");
    //         let seq_arr: any[] = EPars.string_to_sequence_array(seq);
    //         let struct_arr: any[] = EPars.parenthesis_to_pair_array(secstruct);
    //         let free_energy: number = folder.score_structures(seq_arr, struct_arr);
    //         return 0.01 * free_energy;
    //     });
    //     ExternalInterface.addCallback("pairing_probabilities", function (seq: string, secstruct: string = null): any[] {
    //         // that.trace_js("pairing_probabilities() called");
    //         let seq_arr: any[] = EPars.string_to_sequence_array(seq);
    //         let folded: any[];
    //         if (secstruct) {
    //             folded = EPars.parenthesis_to_pair_array(secstruct);
    //         } else {
    //             folded = folder.fold_sequence(seq_arr, null, null);
    //         }
    //         let pp: any[] = folder.get_dot_plot(seq_arr, folded);
    //         return pp.slice();
    //     });
    //     ExternalInterface.addCallback("cofold", function (seq: string, oligo: string, malus: number = 0., constraint: string = null): string {
    //         // that.trace_js("cofold() called");
    //         let len: number = seq.length;
    //         let cseq: string = seq + "&" + oligo;
    //         let seq_arr: any[] = EPars.string_to_sequence_array(cseq);
    //         let folded: any[] = folder.cofold_sequence(seq_arr, null, Number(malus * 100.), constraint);
    //         return EPars.pairs_array_to_parenthesis(folded.slice(0, len))
    //             + "&" + EPars.pairs_array_to_parenthesis(folded.slice(len));
    //     });
    //     if (this._puzzle.get_puzzle_type() == "Experimental") {
    //         ExternalInterface.addCallback("select_folder", function (folder_name: string): boolean {
    //             // that.trace_js("select_folder() called");
    //             let ok: boolean = that.select_folder(folder_name);
    //             folder = that.get_folder();
    //             return ok;
    //         });
    //         ExternalInterface.addCallback("load_parameters_from_buffer", function (str: string): boolean {
    //             // that.trace_js("load_parameters_from_buffer() called");
    //             let buf: ByteArray = new ByteArray;
    //             buf.writeUTFBytes(str);
    //             let res: boolean = folder.load_parameters_from_buffer(buf);
    //             if (res) this.on_change_folder();
    //             return res;
    //         });
    //     }
    //
    //     // Miscellanous
    //     ExternalInterface.addCallback("sparks_effect", function (from: number, to: number): void {
    //         // that.trace_js("sparks_effect() called");
    //         // FIXME: check PiP mode and handle accordingly
    //         for (let ii: number = 0; ii < that.number_of_pose_fields(); ii++) {
    //             let pose: Pose2D = that.get_pose(ii);
    //             pose.praise_sequence(from, to);
    //         }
    //     });
    // }

    // /*override*/
    // public register_setter_callbacks(): void {
    //     if (this._setter_hooks) return;
    //     this._setter_hooks = true;
    //
    //     let that: PoseEditMode = this;
    //
    //     ExternalInterface.addCallback("set_sequence_string", function (seq: string): boolean {
    //         // that.trace_js("set_sequence_string() called");
    //         let seq_arr: any[] = EPars.string_to_sequence_array(seq);
    //         if (seq_arr.indexOf(EPars.RNABASE_UNDEFINED) >= 0 || seq_arr.indexOf(EPars.RNABASE_CUT) >= 0) {
    //             that.trace_js("Invalid characters in " + seq);
    //             return false;
    //         }
    //         let force_sync: boolean = this._force_synch;
    //         this._force_synch = true;
    //         for (let ii: number = 0; ii < that.number_of_pose_fields(); ii++) {
    //             let pose: Pose2D = that.get_pose(ii);
    //             pose.paste_sequence(seq_arr);
    //         }
    //         this._force_synch = force_sync;
    //         that.move_history_add_sequence("paste", seq);
    //         return true;
    //     });
    //     ExternalInterface.addCallback("set_tracked_indices", function (marks: any[]): void {
    //         // that.trace_js("set_tracked_indices() called");
    //         for (let ii: number = 0; ii < that.number_of_pose_fields(); ii++) {
    //             let pose: Pose2D = that.get_pose(ii);
    //             pose.clear_tracking();
    //             for (let k: number = 0; k < marks.length; k++) {
    //                 pose.black_mark(marks[k]);
    //             }
    //         }
    //     });
    //     ExternalInterface.addCallback("set_design_title", function (design_title: string): void {
    //         // that.trace_js("set_design_title() called");
    //         Application.instance.get_application_gui("Design Name").set_text(design_title);
    //         Application.instance.get_application_gui("Design Name").visible = true;
    //         this.clear_undo_stack();
    //         this.pose_edit_by_target(0);
    //     });
    // }

    public on_click_run(): void {
        let that: PoseEditMode = this;
        let puz: Puzzle = this._puzzle;
        let folder: Folder = this._folder;

        let nid: string = this._nid_field.text;
        if (nid.length == 0) {
            return;
        }

        this._run_status.style.fill = 0xC0C0C0;
        this._run_status.text = "running...";

        Application.instance.add_lock("LOCK_SCRIPT");

        // register callbacks
        this.register_script_callbacks();
        this.register_setter_callbacks();

        // ExternalInterface.addCallback("set_script_status", function (txt: string): void {
        //     // that.trace_js("set_script_status() called");
        //     this._run_status.set_text_color(0xC0C0C0);
        //     this._run_status.set_text(txt);
        // });
        //
        // let set_end_callback: Function = function (pose: PoseEditMode, sid: string): void {
        //     ExternalInterface.addCallback("_end" + sid, function (ret: Object): void {
        //         pose.trace_js("_end" + sid + "() called");
        //         pose.trace_js(ret);
        //         if (ret['cause'] instanceof String) {
        //             this._run_status.set_text_color(ret['result'] ? 0x00FF00 : 0xFF0000);
        //             this._run_status.set_text(ret['cause']);
        //             // restore
        //             // FIXME: other clean-ups? should unregister callbacks?
        //             Application.instance.remove_lock("LOCK_SCRIPT");
        //         } else {
        //             // leave the script running asynchronously
        //         }
        //     });
        // };
        // set_end_callback(this, nid);

        // run
        log.info("running script " + nid);
        // ExternalInterface.call("ScriptInterface.evaluate_script_with_nid", nid, {}, null);
        log.info("launched");
        // this.trace_js("launched");
    }

    public rop_layout_bars(): void {
        this.layout_bars();
    }

    public layout_constraints(): void {
        log.debug("TODO: layout_constraints");
        // let min_x: number = this._constraints_offset + 17;
        // let rel_x: number;
        // if (this._target_pairs == null) return;
        // let n: number = this._target_pairs.length;
        // if (n < 2) return;
        // for (let ii: number = 1; ii < n; ii++) {
        //     rel_x = (ii / n) * Flashbang.stageWidth + 17;
        //     if (rel_x < min_x) rel_x = min_x;
        //     if (this._constraint_shape_boxes[ii]) {
        //         this._constraint_shape_boxes[ii].set_pos(new UDim(0, 0, rel_x, 35));
        //         min_x = rel_x + 77;
        //     }
        //     if (this._constraint_antishape_boxes[ii]) {
        //         this._constraint_antishape_boxes[ii].set_pos(new UDim(0, 0, rel_x + 77, 35));
        //         min_x = rel_x + 2 * 77;
        //     }
        // }
    }

    public onKeyboardEvent(e: KeyboardEvent): void {
        let key = e.key;
        let ctrl = e.ctrlKey;
        let handled: boolean = false;

        if (!ctrl && key == KeyCode.KeyN) {
            // Application.instance.get_application_gui("View options").toggle_numbering();
            handled = true;
        } else if (!ctrl && key == KeyCode.KeyG) {
            // Application.instance.get_application_gui("View options").toggle_energy_display();
            handled = true;
        } else if (!ctrl && key == KeyCode.KeyS) {
            this.show_spec();
            handled = true;
        } else if (ctrl && key == KeyCode.KeyZ) {
            this.move_undo_stack_to_last_stable();
            handled = true;
        } else if (this._stack_level == 0 && key == KeyCode.KeyD && this._next_design_cb != null) {
            this._next_design_cb();
            handled = true;
        } else if (this._stack_level == 0 && key == KeyCode.KeyU && this._prev_design_cb != null) {
            this._prev_design_cb();
            handled = true;
        }

        if (handled) {
            e.stopPropagation();
        }
    }

    /*override*/
    public set_multi_engines(multi: boolean): void {
        if (multi) {
            this._folder_button.label(this._puzzle.get_folder()); // set the actual one
            this.addObject(this._folder_button, this.modeSprite);
        } else {
            this._folder_button.destroySelf();
            this._folder_button = null;
        }
    }

    /*override*/
    public set_toolbar_autohide(auto: boolean): void {
        this._toolbar.set_toolbar_autohide(auto);
    }

    /*override*/
    public update(dt: number): void {
        // process queued asynchronous operations (folding)

        let startTime: number = new Date().getTime();
        let elapsed: number = 0;
        while (this._op_queue.length > 0 && elapsed < 50) { // FIXME: arbitrary
            let op: AsyncOp = this._op_queue.shift();
            op.fn();
            if (op.sn) {
                this._asynch_text.text =
                    "folding " + op.sn +
                    " of " + this._target_pairs.length +
                    " (" + this._op_queue.length + ")";
            }

            elapsed = new Date().getTime() - startTime;
        }

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
        if (this._constraints_container != null) {
            this._constraints_container.display.visible = this._constraints_container.display.visible && this._override_show_constraints;
        }
    }

    // public get_constraint_count(): number {
    //     return this._constraint_boxes.length;
    // }
    //
    // public get_constraint_container(): GameObject {
    //     return this._constraints_container;
    // }
    //
    // public get_constraint(i: number): GameObject {
    //     return ConstraintBox(this._constraint_boxes[this._constraint_boxes.length - i - 1]);
    // }
    //
    // public get_shape_box(i: number): GameObject {
    //     return ConstraintBox(this._constraint_boxes[i]);
    // }
    //
    // public get_switch_bar(): ToggleBar {
    //     return this._toggle_bar;
    // }

    public set_ancestor_id(id: number): void {
        this._ancestor_id = id;
    }

    /*override*/
    protected on_set_pip(pip_mode: boolean): void {
        AutosaveManager.saveObjects([pip_mode], "PIP-pref-" + Application.instance.get_player_id());

        if (pip_mode) {
            this._toolbar.toggle_bar.display.visible = false;
            this._target_name.visible = false;

            for (let ii = 0; ii < this._poses.length; ii++) {
                this.set_pose_target(ii, ii);
            }

            this.display_constraint_boxes(false, true);

            if (this._pose_state == PoseState.NATIVE) {
                this.set_to_native_mode();
            } else if (this._pose_state == PoseState.TARGET) {
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
            this._toolbar.toggle_bar.display.visible = true;
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
        // if (this._puzzle.get_puzzle_type() != "Experimental") {
        //     Application.instance.get_application_gui("View options").set_advanced(0);
        // }
        // //let _this:PoseEditMode = this;
        // this.register_ui_for_rscript();
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
        // if (this._puzzle.get_puzzle_type() == "Experimental") {
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
    //         "Mode: " + (this._native_button.get_selected() == true ? "NativeMode" : "TargetMode"));
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

    private register_ui_for_rscript(): void {
        log.debug("TODO: register_ui_for_rscript");
        // this._target_button.register_ui_for_rscript("TOGGLETARGET");
        // this._native_button.register_ui_for_rscript("TOGGLENATURAL");
        // this._zoom_in_button.register_ui_for_rscript("ZOOMIN");
        // this._zoom_out_button.register_ui_for_rscript("ZOOMOUT");
        // this._retry_button.register_ui_for_rscript("RESET");
        // this._undo_button.register_ui_for_rscript("UNDO");
        // this._redo_button.register_ui_for_rscript("REDO");
        // this._pair_swap_button.register_ui_for_rscript("SWAP");
        // this._hint_button.register_ui_for_rscript("HINT");
        // this._pip_button.register_ui_for_rscript("PIP");
        // this._freeze_button.register_ui_for_rscript("FREEZE");
        // if (this._toggle_bar != null) {
        //     this._toggle_bar.register_ui_for_rscript("SWITCH");
        // }
    }

    private on_click_addbase(): void {
        for (let ii: number = 0; ii < this._poses.length; ++ii) {
            this._poses[ii].set_current_color(EPars.RNABASE_ADD_BASE);
        }
        this.deselect_all_colorings();
    }

    private on_click_addpair(): void {
        for (let ii: number = 0; ii < this._poses.length; ii++) {
            this._poses[ii].set_current_color(EPars.RNABASE_ADD_PAIR);
        }

        this.deselect_all_colorings();
    }

    private on_click_delete(): void {
        for (let ii: number = 0; ii < this._poses.length; ++ii) {
            this._poses[ii].set_current_color(EPars.RNABASE_DELETE);
        }

        this.deselect_all_colorings();
    }

    private on_click_lock(): void {
        for (let ii: number = 0; ii < this._poses.length; ii++) {
            this._poses[ii].set_current_color(EPars.RNABASE_LOCK);
        }

        this.deselect_all_colorings();
    }

    private on_click_binding_site(): void {
        for (let ii: number = 0; ii < this._poses.length; ii++) {
            this._poses[ii].set_current_color(EPars.RNABASE_BINDING_SITE);
        }

        this.deselect_all_colorings();
    }

    private keep_playing(): void {
        this.hide_end_curtain();
        this._exit_button.display.alpha = 0;
        this._exit_button.display.visible = true;
        this._exit_button.addObject(new AlphaTask(1, 0.3));

        this._constraints_container.display.visible = true;
    }

    private exit_puzzle(): void {
        this.show_end_curtain();
        this._exit_button.display.visible = false;
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
        if (this._puzzle.get_puzzle_type() == "SwitchBasic" && this._waiting_for_input) {
            let state_dict: Map<any, any> = new Map();
            if (target_index == 1) {
                state_dict.set(PuzzleEvent.PUZEVENT_MODE_CHANGE, PoseState.SECOND);
            }
            this._puzzle_events.process_events(state_dict);
        }

        this._current_target_index = target_index;

        if (this._target_conditions && this._target_conditions[this._current_target_index]) {
            if (this._target_conditions[this._current_target_index]['state_name'] != null) {
                this._target_name.text = this._target_conditions[this._current_target_index]['state_name'];
            }
        }

        if (this._pose_state == PoseState.NATIVE) {
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
                if (ii == target_index || this._target_conditions[ii]['force_struct'] == null) {
                    continue;
                }

                if (elems == null) {
                    elems = [];
                }
                let curr: number = 1;
                let forced: number[] = EPars.parenthesis_to_forced_array(this._target_conditions[ii]['force_struct']);
                let jj;
                for (jj = 0; jj < max_len && jj < forced.length; jj++) {
                    let _stat: number = (forced[jj] == EPars.FORCE_IGNORE ? 1 : 0);
                    if ((curr ^ _stat) != 0) {
                        elems.push(jj - _stat);
                        curr = _stat;
                    }
                }
                if ((elems.length % 2) == 1) {
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

            if (tc_type == "multistrand") {
                let odefs: any[] = this._target_conditions[target_index]['oligos'];
                let ndefs: any[] = [];
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

        if (this._puzzle.get_node_id() == 2390140) {
            if (target_index == 1) {
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

        if (this._puzzle.get_puzzle_type() == "Basic" && this._waiting_for_input && trigger_modechange_event) {
            let state_dict: Map<any, any> = new Map();
            state_dict.set(PuzzleEvent.PUZEVENT_MODE_CHANGE, PoseState.NATIVE);
            this._puzzle_events.process_events(state_dict);
        }

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

        if (this._puzzle.get_puzzle_type() == "Basic" && this._waiting_for_input && trigger_modechange_event) {
            let state_dict: Map<any, any> = new Map();
            state_dict.set(PuzzleEvent.PUZEVENT_MODE_CHANGE, PoseState.TARGET);
            this._puzzle_events.process_events(state_dict);
        }

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
        if (this._pose_state == PoseState.TARGET) {
            this.set_to_native_mode();
        } else if (this._pose_state == PoseState.NATIVE) {
            this.set_to_target_mode();
        } else {
            throw new Error("Invalid pose state");
        }
    }

    private toggle_freeze(): void {
        this._is_frozen = !this._is_frozen;

        this._constraints_container.display.alpha = (this._is_frozen ? 0.25 : 1.0);
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
        for (let ii: number = 0; ii < this._poses.length; ii++) {
            this._poses[ii].set_display_score_texts(this._poses[ii].is_displaying_score_texts());
        }
    }

    private rop_presets(): void {
        while (this._rop_presets.length) {
            let pre: Function = this._rop_presets.pop();
            pre();
        }
    }

    private folder_updated(): void {
        this._folder_button.label(this._folder.get_folder_name());

        if (this._folder.can_score_structures()) {
            for (let ii = 0; ii < this._poses.length; ii++) {
                this._poses[ii].set_score_visualization(this._folder);
            }
        } else {
            for (let ii = 0; ii < this._poses.length; ii++) {
                this._poses[ii].set_score_visualization(null);
            }
        }

        this.on_change_folder();
    }

    private change_folder(): void {
        let curr_f: string = this._folder.get_folder_name();
        this._folder = FolderManager.instance.get_next_folder(curr_f, (folder: Folder): boolean => {
            return this._puzzle.has_target_type("multistrand") && !folder.can_multifold();
        });
        if (this._folder.get_folder_name() == curr_f) return;

        this.folder_updated();
    }

    private show_spec(): void {
        this.update_current_block_with_dot_and_melting_plot();
        let datablock: UndoBlock = this.get_current_undo_block();
        this._spec_box.set_spec(datablock);

        let cancel_button: GameButton = new GameButton().label("Ok", 12);
        cancel_button.display.position = new Point(
            this._spec_box.get_panel_width() -cancel_button.container.width - 20,
            this._spec_box.get_panel_height() -cancel_button.container.height - 20);
        this._spec_box.addObject(cancel_button, this._spec_box.container);

        cancel_button.clicked.connect(() => {
            Application.instance.get_modal_container().removeObject(this._spec_box);
            Application.instance.remove_lock("SPEC");
            this._toolbar.spec_button.hotkey(KeyCode.KeyS);
        });
        this._toolbar.spec_button.hotkey(null);
        cancel_button.hotkey(KeyCode.KeyS);
        cancel_button.tooltip("");

        let add_thumbnail_button: GameButton = new GameButton()
            .label("Minimize Window", 12)
            .tooltip("Minimize")
            .hotkey(KeyCode.KeyM);
        add_thumbnail_button.display.position = new Point(
            this._spec_box.get_panel_width() - cancel_button.container.width - 20 - add_thumbnail_button.container.width - 20,
            this._spec_box.get_panel_height() -add_thumbnail_button.container.height - 20);
        this._spec_box.addObject(add_thumbnail_button);

        add_thumbnail_button.clicked.connect(() => {
            this._docked_spec_box.set_spec(datablock);
            this._docked_spec_box.display.visible = true;

            Application.instance.get_modal_container().removeObject(this._spec_box);
            Application.instance.remove_lock("SPEC");
        });

        Application.instance.add_lock("SPEC");
        Application.instance.get_modal_container().addObject(this._spec_box);
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
        // if (this._puzzle.get_puzzle_type() == "Basic") {
        //     req.url += "Basic/";
        // } else if (this._puzzle.get_puzzle_type() == "Experimental") {
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
        if (this._folder.can_dot_plot() == false) {
            return;
        }

        datablock.set_meltingpoint_and_dotplot(this._folder);
    }

    private submit_current_pose(): void {
        log.debug("TODO: submit_current_pose");
        // if (this._puzzle.get_puzzle_type() == "Experimental") {
        //     if (!this.check_constraints(false) && (!Application.instance.is_dev_mode())) {
        //         if (this._puzzle.is_soft_constraint()) {
        //             Application.instance.setup_yesno("Puzzle constraints are not satisfied.\nYou can still submit the sequence, but please note that there is a risk of not getting\nsynthesized properly",
        //                 () => {
        //                     /// Generate dot and melting plot data
        //                     this.update_current_block_with_dot_and_melting_plot();
        //
        //                     /// Generate dot and melting plot data
        //                     let datablock: UndoBlock = this.get_current_undo_block();
        //                     if (datablock.get_param(UndoBlockParam.DOTPLOT_BITMAP) == null) {
        //                         this.update_current_block_with_dot_and_melting_plot();
        //                     }
        //
        //                     let init_score: number = datablock.get_param(UndoBlockParam.PROB_SCORE, 37);
        //
        //                     let meltpoint: number = 107;
        //                     for (let ii: number = 47; ii < 100; ii += 10) {
        //                         let current_score: number = datablock.get_param(UndoBlockParam.PROB_SCORE, ii);
        //                         if (current_score < init_score * 0.5) {
        //                             meltpoint = ii;
        //                             break;
        //                         }
        //                     }
        //
        //                     datablock.set_param(UndoBlockParam.MELTING_POINT, meltpoint, 37);
        //
        //                     Application.instance.add_lock("LOCK_SUBMIT");
        //                     Application.instance.get_modal_container().addObject(this._submit_field);
        //                 }, () => {
        //                 });
        //         } else {
        //             Application.instance.setup_msg_box("You didn't satisfy all requirements!");
        //         }
        //         return;
        //     }
        //
        //     /// Generate dot and melting plot data
        //     this.update_current_block_with_dot_and_melting_plot();
        //
        //     /// Generate dot and melting plot data
        //     let datablock: UndoBlock = this.get_current_undo_block();
        //     if (datablock.get_param(UndoBlockParam.DOTPLOT_BITMAP) == null) {
        //         this.update_current_block_with_dot_and_melting_plot();
        //     }
        //
        //     let init_score: number = datablock.get_param(UndoBlockParam.PROB_SCORE, 37);
        //
        //     let meltpoint: number = 107;
        //     for (let ii: number = 47; ii < 100; ii += 10) {
        //         let current_score: number = datablock.get_param(UndoBlockParam.PROB_SCORE, ii);
        //         if (current_score < init_score * 0.5) {
        //             meltpoint = ii;
        //             break;
        //         }
        //     }
        //
        //     datablock.set_param(UndoBlockParam.MELTING_POINT, meltpoint, 37);
        //
        //     Application.instance.add_lock("LOCK_SUBMIT");
        //     Application.instance.get_modal_container().addObject(this._submit_field);
        //
        // } else {
        //     this.done_playing(true);
        //     /// Always submit the sequence in the first state
        //     let sol_to_submit: UndoBlock = this.get_current_undo_block(0);
        //
        //     let dict: Map<any, any> = new Map();
        //     dict["Title"] = "Cleared Solution";
        //     dict["Comment"] = "No comment";
        //     this.submit_solution(dict, sol_to_submit);
        // }
    }

    private submit_solution(dict: Map<any, any>, undoblock: UndoBlock): void {
        log.debug("TODO: submit_solution");
    //     Eterna(Application.instance).CompleteLevel();
    //
    //     if (this._puzzle.get_node_id() < 0) {
    //         return;
    //     }
    //
    //     if (dict["Title"].length == 0) {
    //         dict["Title"] = "Default title";
    //     }
    //
    //     if (dict["Comment"].length == 0) {
    //         dict["Comment"] = "No comment";
    //     }
    //
    //     let post_data: Object = {};
    //
    //     if (this._puzzle.get_puzzle_type() != "Experimental") {
    //         let next_puzzle: number = this._puzzle.get_next_puzzle();
    //
    //         if (next_puzzle > 0)
    //             post_data["next-puzzle"] = next_puzzle;
    //         else
    //             post_data["recommend-puzzle"] = true;
    //
    //         post_data["pointsrank"] = true;
    //     } else { // is experimental
    //         if (this._ancestor_id > 0) {
    //             post_data["ancestor-id"] = this._ancestor_id;
    //         }
    //     }
    //
    //     let elapsed: number = (new Date().getTime() - this._start_solving_time) / 1000.;
    //     let move_history: Object = {
    //         begin_from: this._starting_point,
    //         num_moves: this._move_count,
    //         moves: this._moves.slice(),
    //         elapsed: elapsed.toFixed(0)
    //     };
    //     post_data["move-history"] = JSON.stringify(move_history);
    //
    //     let newlinereg: RegExp = new RegExp("/\"/g");
    //     dict["Comment"] = dict["Comment"].replace(newlinereg, "'");
    //     dict["Title"] = dict["Title"].replace(newlinereg, "'");
    //
    //     let seq_string: string = EPars.sequence_array_to_string(this._puzzle.transform_sequence(undoblock.get_sequence(), 0));
    //
    //     post_data["title"] = (dict["Title"]);
    //     post_data["energy"] = (undoblock.get_param(UndoBlockParam.FE) / 100.0);
    //     post_data["puznid"] = (this._puzzle.get_node_id());
    //     post_data["sequence"] = (seq_string);
    //     post_data["repetition"] = (undoblock.get_param(UndoBlockParam.REPETITION));
    //     post_data["gu"] = (undoblock.get_param(UndoBlockParam.GU));
    //     post_data["gc"] = (undoblock.get_param(UndoBlockParam.GC));
    //     post_data["ua"] = (undoblock.get_param(UndoBlockParam.AU));
    //     post_data["body"] = (dict["Comment"]);
    //
    //     if (this._puzzle.get_puzzle_type() == "Experimental") {
    //         post_data["melt"] = (undoblock.get_param(UndoBlockParam.MELTING_POINT));
    //
    //         if (this._fold_total_time >= 1000.0) {
    //             let fd: any[] = [];
    //             for (let ii: number = 0; ii < this._poses.length; ii++) {
    //                 fd.push(this.get_current_undo_block(ii).toJson());
    //             }
    //             post_data["fold-data"] = JSON.stringify(fd);
    //         }
    //     }
    //
    //     GameClient.instance.submit_solution(post_data, function (datastring: string): void {
    //         let res: any = JSON.parse(datastring);
    //         let data: any = res['data'];
    //         this._submitting_text.set_animator(null);
    //         Application.instance.get_modal_container().removeObject(this._submitting_text);
    //
    //         if (data['error'] != null) {
    //             if (data['error'].indexOf('barcode') >= 0) {
    //                 Application.instance.setup_msg_box(data['error'], true, "<A HREF='/web/lab/manual/#barcode' TARGET='_blank'>More Information</A>", null);
    //                 let hairpin: string = EPars.get_barcode_hairpin(seq_string);
    //                 if (hairpin != null) {
    //                     SolutionManager.instance.add_hairpins([hairpin]);
    //                     this.check_constraints();
    //                 }
    //             } else {
    //                 Application.instance.setup_msg_box(data['error']);
    //             }
    //             Application.instance.remove_lock("LOCK_SUBMIT");
    //             return;
    //         }
    //
    //         if (data['solution-id'] != null) {
    //             this.set_ancestor_id(data['solution-id']);
    //         }
    //
    //         let after_achievements: Function = () => {
    //             let ii: number;
    //             let pl: PlayerRank;
    //             let player: PlayerRank;
    //             let playername: string;
    //
    //             if (this._puzzle.get_puzzle_type() == "Experimental") {
    //                 if (this._puzzle.get_use_barcode()) {
    //                     let hairpin: string = EPars.get_barcode_hairpin(seq_string);
    //                     if (hairpin != null) {
    //                         SolutionManager.instance.add_hairpins([hairpin]);
    //                         this.check_constraints();
    //                     }
    //                 }
    //                 Application.instance.remove_lock("LOCK_SUBMIT");
    //                 this._submitting_text.set_animator(null);
    //             } else {
    //                 let puzzledata: Object = data['next-puzzle'];
    //                 let puzzle: Puzzle = null;
    //                 if (puzzledata) {
    //                     puzzle = PuzzleManager.instance.parse_puzzle(puzzledata);
    //                 }
    //
    //                 this.update_next_puzzle_widget(puzzle);
    //                 this.trigger_ending();
    //
    //                 let pointsrank_before: any = data['pointsrank-before'];
    //                 let pointsrank_after: any = data['pointsrank-after'];
    //
    //                 if (pointsrank_before && pointsrank_after) {
    //                     let ranks: any[] = [];
    //                     let rank_before: number = pointsrank_before['eterna.rank'];
    //                     let rank_after: number = pointsrank_after['eterna.rank'];
    //                     let points_before: number = pointsrank_before['points'];
    //                     let points_after: number = pointsrank_after['points'];
    //                     let richer_before: any[] = pointsrank_before['richer'];
    //                     let poorer_before: any[] = pointsrank_before['poorer'];
    //                     let richer_after: any[] = pointsrank_after['richer'];
    //                     let poorer_after: any[] = pointsrank_after['poorer'];
    //
    //                     /// Don't even need to move
    //                     if (points_before >= points_after || rank_before <= rank_after) {
    //
    //                         for (ii = 0; ii < richer_after.length; ii++) {
    //                             pl = new PlayerRank(richer_after[ii]['name'], richer_after[ii]['points']);
    //                             pl.set_rank(richer_after[ii]['eterna.rank']);
    //                             ranks.push(pl);
    //                         }
    //
    //                         for (ii = 0; ii < poorer_after.length; ii++) {
    //                             pl = new PlayerRank(poorer_after[ii]['name'], poorer_after[ii]['points']);
    //                             pl.set_rank(poorer_after[ii]['eterna.rank']);
    //                             ranks.push(pl);
    //                         }
    //
    //                         playername = Application.instance.get_player_name();
    //                         if (playername == null)
    //                             playername = "You";
    //
    //                         player = new PlayerRank(playername, points_before);
    //                         player.set_rank(rank_after);
    //
    //                         this._mission_cleared.create_rankscroll(ranks, player, points_after, rank_after);
    //
    //                     } else {
    //                         let last_after_entry_uid: number = -1;
    //                         for (ii = 0; ii < richer_after.length; ii++) {
    //                             pl = new PlayerRank(richer_after[ii]['name'], richer_after[ii]['points']);
    //                             pl.set_rank(richer_after[ii]['eterna.rank']);
    //                             ranks.push(pl);
    //                             last_after_entry_uid = richer_after[ii]['uid'];
    //                         }
    //
    //                         for (ii = 0; ii < poorer_after.length; ii++) {
    //                             pl = new PlayerRank(poorer_after[ii]['name'], poorer_after[ii]['points']);
    //                             pl.set_rank(poorer_after[ii]['eterna.rank']);
    //                             ranks.push(pl);
    //                             last_after_entry_uid = poorer_after[ii]['uid'];
    //                         }
    //
    //                         let common_entry: boolean = false;
    //                         let common_index: number = 0;
    //                         for (ii = 0; ii < richer_before.length; ii++) {
    //                             if (richer_before[ii]['uid'] == last_after_entry_uid) {
    //                                 common_entry = true;
    //                                 common_index = ii;
    //                                 break;
    //                             }
    //                         }
    //
    //                         if (!common_entry) {
    //                             for (ii = 0; ii < poorer_before.length; ii++) {
    //                                 if (poorer_before[ii]['uid'] == last_after_entry_uid) {
    //                                     common_entry = true;
    //                                     common_index = -ii;
    //                                     break;
    //                                 }
    //                             }
    //                         }
    //
    //                         if (!common_entry || common_index >= 0) {
    //                             for (ii = common_index; ii < richer_before.length; ii++) {
    //                                 pl = new PlayerRank(richer_before[ii]['name'], richer_before[ii]['points']);
    //                                 pl.set_rank(richer_before[ii]['eterna.rank']);
    //                                 ranks.push(pl);
    //                             }
    //                         }
    //
    //                         if (!common_entry || common_index >= 0) {
    //                             common_index = 0;
    //                         }
    //
    //                         for (ii = -common_index; ii < poorer_before.length; ii++) {
    //                             pl = new PlayerRank(poorer_before[ii]['name'], poorer_before[ii]['points']);
    //                             pl.set_rank(poorer_before[ii]['eterna.rank']);
    //                             ranks.push(pl);
    //                         }
    //
    //                         playername = Application.instance.get_player_name();
    //                         if (playername == null)
    //                             playername = "You";
    //
    //                         player = new PlayerRank(playername, points_before);
    //                         player.set_rank(rank_before);
    //                         this._mission_cleared.create_rankscroll(ranks, player, points_after, rank_after);
    //                     }
    //                 }
    //             }
    //         };
    //
    //         /* for debugging purposes, please don't remove
    // 	let achievements:Object = {
    // 		"Nucleotide Mixer": {
    // 			"past": "Earned a Nucleotide Mixer",
    // 			"image": "https://s3.amazonaws.com/eterna/badges/ten_tools_1.png",
    // 			"level": 1,
    // 			"desc": "Clear 10 puzzles!"
    // 		}
    // 	};
    // 	*/
    //         let cheevs: Object = res['new_achievements'];
    //         if (cheevs != null) {
    //             AchievementManager.award_achievement(cheevs, after_achievements);
    //         } else {
    //             after_achievements();
    //         }
    //
    //     });
    //
    //     Application.instance.get_modal_container().removeObject(this._submit_field);
    //     if (this._puzzle.get_puzzle_type() == "Experimental") {
    //         this._submitting_text.set_animator(new GameAnimatorFader(1, 0, 0.3, false, true));
    //         Application.instance.get_modal_container().addObject(this._submitting_text);
    //     }
    }

    private on_submit(dict: Map<any, any>): void {
        log.debug("TODO: on_submit");
        // /// Always submit the sequence in the first state
        // this.update_current_block_with_dot_and_melting_plot(0);
        // let sol_to_submit: UndoBlock = this.get_current_undo_block(0);
        // Application.instance.get_modal_container().removeObject(this._submit_field);
        // this.submit_solution(this._submit_field.get_dictionary(), sol_to_submit);
    }

    private on_cancel_submit(): void {
        log.debug("TODO: on_cancel_submit");
        // Application.instance.remove_lock("LOCK_SUBMIT");
        // Application.instance.get_modal_container().removeObject(this._submit_field);
    }

    private deselect_all_colorings(): void {
        this._toolbar.palette.clear_selection();
        this._toolbar.pair_swap_button.toggled.value = false;
        for (let k: number = 0; k < this._toolbar.dyn_paint_tools.length; k++) {
            this._toolbar.dyn_paint_tools[k].toggled.value = false;
        }
    }

    private set_poses_color(paint_color: number): void {
        for (let ii: number = 0; ii < this._poses.length; ii++) {
            this._poses[ii].set_current_color(paint_color);
        }
    }

    private disable_tools(disable: boolean): void {
        this._toolbar.disable_tools(disable);
        // this._scriptbar.enabled = !disable;
        // if (this._pic_button) {
        //     this._pic_button.enabled = !disable;
        // }
        this._is_pic_disabled = disable;

        if (this._hint_box.display.visible) {
            this._hint_box.display.visible = false;
        }

        this._folder_button.enabled = !disable;

        for (let ii = 0; ii < this._pose_fields.length; ii++) {
            // this._pose_fields[ii].mouseEnabled = !disable;
            // this._pose_fields[ii].mouseChildren = !disable;
        }

        if (disable) {
            for (let ii = 0; ii < this._poses.length; ii++) {
                this._poses[ii].clear_mouse();
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
        log.debug("TODO: display_constraint_boxes");
    //     let num_constraints: number = 0;
    //     let constraints: any[] = this._puzzle.get_constraints();
    //
    //     if (this._puzzle.get_temporary_constraints() != null)
    //         constraints = this._puzzle.get_temporary_constraints();
    //
    //     if (constraints != null)
    //         num_constraints = constraints.length;
    //
    //     let ii: number;
    //     let xx: number;
    //     let w_walker: number = 17;
    //
    //     for (xx = 0; xx < this._target_pairs.length; xx++) {
    //         let cpos: UDim;
    //         if (xx == 0) {
    //             // scan for non-(ANTI)SHAPE
    //             for (ii = 0; ii < num_constraints / 2; ii++) {
    //                 if (ConstraintBox(this._constraint_boxes[ii]).GetKeyword().substr(-5) == "SHAPE")
    //                     continue;
    //                 cpos = new UDim(0, 0, w_walker, 35);
    //                 w_walker += 119;
    //                 if (animate) {
    //                     ConstraintBox(this._constraint_boxes[ii]).set_animator(new GameAnimatorMover(cpos, 0.5, false));
    //                 } else {
    //                     ConstraintBox(this._constraint_boxes[ii]).set_pos(cpos);
    //                 }
    //                 ConstraintBox(this._constraint_boxes[ii]).show_big_text(false);
    //                 ConstraintBox(this._constraint_boxes[ii]).visible = display;
    //             }
    //             if (w_walker > 17) w_walker += 25;
    //         } else if (xx == 1) {
    //             // save the offset for later use (avoid overlaps in PIP mode)
    //             this._constraints_offset = w_walker;
    //         }
    //
    //         // scan for SHAPE
    //         for (ii = 0; ii < num_constraints / 2; ii++) {
    //             if (ConstraintBox(this._constraint_boxes[ii]).GetKeyword() != "SHAPE" || Number(constraints[2 * ii + 1]) != xx)
    //                 continue;
    //             cpos = new UDim(0, 0, w_walker, 35);
    //             w_walker += 77;
    //             if (animate) {
    //                 ConstraintBox(this._constraint_boxes[ii]).set_animator(new GameAnimatorMover(cpos, 0.5, false));
    //             } else {
    //                 ConstraintBox(this._constraint_boxes[ii]).set_pos(cpos);
    //             }
    //             ConstraintBox(this._constraint_boxes[ii]).show_big_text(false);
    //             ConstraintBox(this._constraint_boxes[ii]).visible = (xx == 0 || !this._is_pip_mode) ? display : false;
    //         }
    //
    //         // scan for ANTISHAPE
    //         for (ii = 0; ii < num_constraints / 2; ii++) {
    //             if (ConstraintBox(this._constraint_boxes[ii]).GetKeyword() != "ANTISHAPE" || Number(constraints[2 * ii + 1]) != xx)
    //                 continue;
    //             cpos = new UDim(0, 0, w_walker, 35);
    //             w_walker += 77;
    //             if (animate) {
    //                 ConstraintBox(this._constraint_boxes[ii]).set_animator(new GameAnimatorMover(cpos, 0.5, false));
    //             } else {
    //                 ConstraintBox(this._constraint_boxes[ii]).set_pos(cpos);
    //             }
    //             ConstraintBox(this._constraint_boxes[ii]).show_big_text(false);
    //             ConstraintBox(this._constraint_boxes[ii]).visible = (xx == 0 || !this._is_pip_mode) ? display : false;
    //         }
    //     }
    //
    //     this.layout_constraints();
    }

    private start_countdown(): void {
        if (this._puzzle_events.is_event_running()) {
            return;
        }

        this._is_playing = false;

        let constraints: string[] = this._puzzle.get_constraints();

        if (this._puzzle.get_temporary_constraints() != null) {
            constraints = this._puzzle.get_temporary_constraints();
        }

        if (constraints == null || constraints.length == 0 || !this._show_mission_screen) {
            this.start_playing(false);
            return;
        }

        this.set_puzzle_state(PuzzleState.COUNTDOWN);
        this.set_start_curtain(true);

        // let num_constraints: number = constraints.length;
        // for (let ii = 0; ii < num_constraints / 2; ii++) {
        //     let box: ConstraintBox = this._constraint_boxes[ii];
        //     box.visible = true;
        //     box.show_big_text(true);
        //     box.set_pos(new UDim(1, 0.4, 0, ii * 77));
        //     box.set_animator(new GameAnimatorMover(new UDim(0.3, 0.4, 0, ii * 77), 0.5 + 0.25 * ii, false, true));
        // }
        //
        // for (let ii = 0; ii < num_constraints / 2; ++ii) {
        //     this._constraints_container.removeObject(ConstraintBox(this._constraint_boxes[ii]));
        // }
        // this._mission_screen.set_constraints(this._constraint_boxes);
    }

    private on_click_start_curtain(): void {
        // let offset: number = this._constraints_head - this._constraints_top;
        // let constraints: string[] = this._puzzle.get_constraints();
        // let num_constraints: number = constraints.length;
        //
        // this._mission_screen.transfer_constraints();
        // this._constraints_head = this._constraints_top;
        // this._constraints_foot = this._constraints_bottom;
        // this._constraints_container.mask = null;
        // this._constraints_container.set_pos(new UDim(0, 0, 0, 0));
        // for (let ii: number = 0; ii < num_constraints / 2; ii++) {
        //     let cpos: UDim = ConstraintBox(this._constraint_boxes[ii]).get_pos();
        //     ConstraintBox(this._constraint_boxes[ii]).set_pos(new UDim(0.3, 0.4, cpos.get_x(0), cpos.get_y(0) + offset));
        //     ConstraintBox(this._constraint_boxes[ii]).remove_all_animators();
        //     this._constraints_container.addObject(ConstraintBox(this._constraint_boxes[ii]));
        // }

        this._start_solving_time = new Date().getTime();
        this.start_playing(true);
    }

    private start_playing(animate_constraints: boolean): void {
        this._is_playing = true;
        this.disable_tools(false);

        this.set_puzzle_state(PuzzleState.GAME);

        // if (this._mission_screen.visible) {
        //     this.set_start_curtain(false);
        // }

        this.display_constraint_boxes(true, true);

        // this._mission_cleared.reset();
    }

    private reset_autosave_data(): void {
        let token: string = "_puz" + this._puzzle.get_node_id() + "_" + Application.instance.get_player_id();
        AutosaveManager.saveObjects(null, token);
    }

    private autosave_data(e: Event): void {
        if (this._puzzle.get_puzzle_type() == "Basic") {
            return;
        }

        if (this._stack_level < 1) {
            return;
        }

        let token: string = "_puz" + this._puzzle.get_node_id() + "_" + Application.instance.get_player_id();
        let objs: any[] = [];
        let msecs: number = 0;

        objs.push(msecs);
        objs.push(this._seq_stacks[this._stack_level][0].get_sequence());
        for (let ii: number = 0; ii < this._poses.length; ++ii) {
            objs.push(JSON.stringify(this._seq_stacks[this._stack_level][ii].toJson()));
        }

        AutosaveManager.saveObjects(objs, token);
    }

    private transfer_to_puzzlemaker(): void {
        log.debug("TODO: transfer_to_puzzlemaker");
        // let cookie: string = "_puzedit" + this._poses.length + "_" + Application.instance.get_player_id();
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
        if (this._puzzle.get_puzzle_type() == "Basic") {
            return false;
        }

        // if (this.root.loaderInfo.parameters.autoload
        //     && Number(this.root.loaderInfo.parameters.autoload) == 0) {
        //     return false;
        // }

        let beginning_sequence: number[] = this._puzzle.get_beginning_sequence();
        let locks: boolean[] = this._puzzle.get_puzzle_locks();
        let oligo_len: number = 0;

        if (this._target_conditions[0] && Puzzle.is_oligo_type(this._target_conditions[0]['type'])) {
            oligo_len = this._target_conditions[0]['oligo_sequence'].length;
            if (this._target_conditions[0]['fold_mode'] == Pose2D.OLIGO_MODE_DIMER) oligo_len++;
        } else if (this._target_conditions[0] && this._target_conditions[0]['type'] == "multistrand") {
            let oligos: any[] = this._target_conditions[0]['oligos'];
            for (let ii = 0; ii < oligos.length; ii++) {
                oligo_len += (oligos[ii]['sequence'].length + 1);
            }
        }
        let token: string = "_puz" + this._puzzle.get_node_id() + "_" + Application.instance.get_player_id();

        if (beginning_sequence.length != locks.length || (beginning_sequence.length + oligo_len) != this._target_pairs[0].length) {
            return false;
        }
        this.clear_undo_stack();
        let msecs: number = 0;
        let a: any[];
        let objs: any[] = AutosaveManager.loadObjects(token);
        // no saved data
        if (objs == null) {
            // if (this.root.loaderInfo.parameters.inputsequence != null) {
            //     a = EPars.string_to_sequence_array(this.root.loaderInfo.parameters.inputsequence);
            // } else {
            //     return false;
            // }
            return false;
        } else {
            a = objs[1];
            msecs = objs[0];
            for (let ii = 0; ii < this._poses.length; ++ii) {
                if (objs[ii + 2] != null) {
                    let undo_block: UndoBlock = new UndoBlock([]);
                    undo_block.fromJson(JSON.parse(objs[ii + 2]));

                    /// JEEFIX : Don't override secstruct from autoload without checking whther the puzzle can vary length.
                    /// KWSFIX : Only allow when shiftable mode (=> shift_limit = 0)

                    if (this._puzzle.get_shift_limit() == 0 && undo_block.get_target_pairs().length != this._target_pairs[ii].length) {
                        return false;
                    }

                    this._target_pairs[ii] = undo_block.get_target_pairs();
                    this._target_oligos_order[ii] = undo_block.get_target_oligo_order();

                    this.set_poses_with_undo_block(ii, undo_block);
                }
            }
        }

        if ((a.length + oligo_len) != this._target_pairs[0].length) {
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

    private done_playing(cleared: boolean): void {
        if (this._puz_state == PuzzleState.CLEARED) {
            return;
        }

        this.disable_tools(true);
        this.set_puzzle_state(PuzzleState.CLEARED);

        if (cleared) {
            for (let ii: number = 0; ii < this._poses.length; ii++) {
                this._poses[ii].set_zoom_level(0, true, true);
                this._poses[ii].start_explosion(this.show_end_curtain);
            }
            this._bubble_curtain.start_sweep();

            SoundManager.instance.play_bg(SoundManager.SoundPuzzleClear, 0);
        } else {
            this.show_end_curtain();
        }
    }

    private set_default_visibilities(): void {
        this._exit_button.display.visible = false;

        this._show_mission_screen = true;
        this.set_show_constraints(true);

        this._toolbar.palette.reset_overrides();
        this._toolbar.palette.change_default_mode();
    }

    private update_next_puzzle_widget(puzzle: Puzzle): void {
        log.debug("TODO: update_next_puzzle_widget");
        // if (puzzle == null) {
        //     this._mission_cleared.set_callbacks(null, this.keep_playing);
        //     return;
        // }
        //
        // let pairs: any[] = EPars.parenthesis_to_pair_array(puzzle.get_secstruct());
        // let seq: any[] = [];
        //
        // for (let i: number = 0; i < pairs.length; i++) {
        //     seq.push(EPars.RNABASE_ADENINE);
        // }
        //
        // this._mission_cleared.set_callbacks(() => {
        //     // if tutorial script ran, we need to reset visibilities for the next puzzle
        //     this.set_default_visibilities();
        //
        //     this._move_count = 0;
        //     this._moves = [];
        //
        //     Application.instance.StopRScript();
        //     Application.instance.InitializeRScript(puzzle);
        //     this.set_puzzle(puzzle, null);
        //     Application.instance.StartRScript();
        // }, this.keep_playing);
    }

    private move_history_add_mutations(before: any[], after: any[]): void {
        let muts: any[] = [];
        for (let ii: number = 0; ii < after.length; ii++) {
            if (after[ii] != before[ii]) {
                muts.push({pos: ii + 1, base: EPars.sequence_array_to_string([after[ii]])});
            }
        }
        if (muts.length == 0) return;
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
            if (this._puzzle.get_puzzle_type() == "Experimental") {
                this.start_playing(false);
            } else {
                this.start_countdown();
            }
        }

        let pref: any[] = AutosaveManager.loadObjects("PIP-pref-" + Application.instance.get_player_id());
        if (pref == null) {
            this.set_pip(false);
        } else {
            this.set_pip(pref[0]);
        }

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
        // if (ui_name == "GU_PAIR") {
        //     pos = this._palette.get_pos();
        //     pos.translate(this._palette.ug_box.x, this._palette.ug_box.y);
        //     w = this._palette.ug_box.width;
        //     h = this._palette.ug_box.height;
        //
        // } else if (ui_name == "GC_PAIR") {
        //     pos = this._palette.get_pos();
        //     pos.translate(this._palette.gc_box.x, this._palette.gc_box.y);
        //     w = this._palette.gc_box.width;
        //     h = this._palette.gc_box.height;
        //
        // } else if (ui_name == "UA_PAIR") {
        //     pos = this._palette.get_pos();
        //     pos.translate(this._palette.au_box.x, this._palette.au_box.y);
        //     w = this._palette.au_box.width;
        //     h = this._palette.au_box.height;
        //
        // } else if (ui_name == "G") {
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
        // if (ui_name == "GU_PAIR") {
        //     pos = this._palette.get_pos();
        //     pos.translate(this._palette.ug_box.x, this._palette.ug_box.y);
        //
        // } else if (ui_name == "GC_PAIR") {
        //
        //     pos = this._palette.get_pos();
        //     pos.translate(this._palette.gc_box.x, this._palette.gc_box.y);
        //
        // } else if (ui_name == "UA_PAIR") {
        //
        //     pos = this._palette.get_pos();
        //     pos.translate(this._palette.au_box.x, this._palette.au_box.y);
        //
        // } else if (ui_name == "G") {
        //
        //     pos = this._palette.get_pos();
        //     pos.translate(this._palette.g_box.x, this._palette.g_box.y);
        //
        // } else if (ui_name == "MODES_NATIVE") {
        //
        //     pos = this._native_button.get_pos();
        //
        // } else if (ui_name == "MODES_TARGET") {
        //
        //     pos = this._target_button.get_pos();
        //
        // } else if (ui_name == "MODES_SECOND") {
        //     // FIXME: what is MODES_SECOND ???
        //     pos = this._native_button.get_pos();
        //
        // } else if (ui_name == "MODES_PIP") {
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
        // if (pos[0] == UIPos.CENTER) {
        //     return new UDim(0.5, 0.5, 0, 0);
        // } else if (pos[0] == UIPos.BASE) {
        //     let p: Point = this._poses[0].get_base_xy(pos[1]);
        //     return new UDim(0, 0, p.x, p.y);
        // } else if (pos[0] == UIPos.UDIM) {
        //     return new UDim(pos[1], pos[2], pos[3], pos[4]);
        // } else if (pos[0] == UIPos.PALLETE) {
        //     return this._palette.get_pos();
        // } else if (pos[0] == UIPos.MODES) {
        //     return this._native_button.get_pos();
        // } else if (pos[0] == UIPos.MODES_NATIVE) {
        //     return this._native_button.get_pos();
        // } else if (pos[0] == UIPos.MODES_TARGET) {
        //     return this._target_button.get_pos();
        // } else if (pos[0] == UIPos.UNDO_BUTTON) {
        //     return this._undo_button.get_pos();
        // } else if (pos[0] == UIPos.ZOOM_IN_BUTTON) {
        //     return this._zoom_in_button.get_pos();
        // } else if (pos[0] == UIPos.ZOOM_OUT_BUTTON) {
        //     return this._zoom_out_button.get_pos();
        // } else if (pos[0] == UIPos.CONSTRAINT) {
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
        // if (action[0] == "NO") {
        //     return;
        // }
        //
        // let ii: number = 0;
        // let sequence: any[];
        // let target: number;
        // let lock: any[];
        //
        // if (action[0] == "START_COUNTDOWN") {
        //     this.clear_undo_stack();
        //     this.pose_edit_by_target(0);
        //     this.start_countdown();
        // } else if (action[0] == "CLEAR_UNDO_STACK") {
        //     this.clear_undo_stack();
        //     this.pose_edit_by_target(0);
        // } else if (action[0] == "START_COUNTDOWN_DIRTY") {
        //     this.start_countdown();
        // } else if (action[0] == "MUTATE") {
        //
        //     sequence = this._poses[0].get_sequence();
        //     for (ii = 1; ii < action.length; ii += 2) {
        //
        //         let s: number;
        //
        //         if (action[ii + 1] == "A") {
        //             s = EPars.RNABASE_ADENINE;
        //         } else if (action[ii + 1] == "G") {
        //             s = EPars.RNABASE_GUANINE;
        //         } else if (action[ii + 1] == "U") {
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
        // } else if (action[0] == "CHANGEMODE") {
        //     if (action[1] == "NATIVE") {
        //         this.set_to_native_mode();
        //     } else if (action[1] == "TARGET") {
        //         this.set_to_target_mode();
        //     } else if (action[1] == "FROZEN") {
        //         this.set_to_frozen_mode();
        //     } else if (action[1] == "PIP") {
        //         this.set_pip(true);
        //     } else if (action[1] == "NPIP") {
        //         this.set_pip(false);
        //     } else {
        //         throw new Error("Unrecognized error " + action[1]);
        //     }
        //
        // } else if (action[0] == "ZOOM") {
        //     for (ii = 0; ii < this._pose_fields.length; ii++) {
        //         this._pose_fields[ii].set_zoom(Number(action[1]));
        //     }
        // } else if (action[0] == "ZOOM_OUT") {
        //     for (ii = 0; ii < this._pose_fields.length; ii++) {
        //         this._pose_fields[ii].zoom_out();
        //     }
        // } else if (action[0] == "ZOOM_IN") {
        //     for (ii = 0; ii < this._pose_fields.length; ii++) {
        //         this._pose_fields[ii].zoom_in();
        //     }
        // } else if (action[0] == "ALLOW_MOVING") {
        //     for (ii = 0; ii < this._pose_fields.length; ii++) {
        //         this._pose_fields[ii].mouseEnabled = true;
        //         this._pose_fields[ii].mouseChildren = true;
        //     }
        // } else if (action[0] == "HIGHLIGHT_STACK") {
        //     this._poses[0].highlight_stack(action);
        // } else if (action[0] == "HIGHLIGHT_STACK_PIP") {
        //     target = action[1];
        //     action.splice(1, 1);
        //     this._poses[target].highlight_stack(action);
        // } else if (action[0] == "HIGHLIGHT_LOOP") {
        //     this._poses[0].highlight_loop(action);
        // } else if (action[0] == "HIGHLIGHT_LOOP_PIP") {
        //     target = action[1];
        //     action.splice(1, 1);
        //     this._poses[target].highlight_loop(action);
        // } else if (action[0] == "CLEAR_HIGHLIGHT") {
        //     this._poses[0].clear_highlight();
        // } else if (action[0] == "CLEAR_HIGHLIGHT_PIP") {
        //     this._poses[action[1]].clear_highlight();
        // } else if (action[0] == "NAVIGATE_TO_CHALLENGES") {
        //     this.navigate_to_challenges();
        // } else if (action[0] == "UI_HIGHLIGHT") {
        //     this.highlight_ui(action[1]);
        // } else if (action[0] == "DRAW_ARROW") {
        //     this.draw_arrow(action[1]);
        // } else if (action[0] == "CLEAR_UI_HIGHLIGHT") {
        //     this.clear_ui_highlight();
        // } else if (action[0] == "SHOW_CHALLENGE") {
        //     // Defunct - redirect to setup end screen
        // } else if (action[0] == "RESET_TEMP_CONSTRAINTS") {
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
        // } else if (action[0] == "CLEAR_TEMP_CONSTRAINTS") {
        //     this._puzzle.set_temporary_constraints(null);
        //     this.check_constraints();
        // } else if (action[0] == "DISABLE_TOOLS") {
        //     this.disable_tools(true);
        // } else if (action[0] == "ENABLE_TOOLS") {
        //     this.disable_tools(false);
        // } else if (action[0] == "DISABLE_PALLETE") {
        //     this._palette.set_disabled(true);
        //     for (ii = 0; ii < this._poses.length; ii++) {
        //         this._poses[ii].set_current_color(-1);
        //     }
        // } else if (action[0] == "ENABLE_PALLETE") {
        //     this._palette.set_disabled(false);
        //     this._palette.click_a();
        // } else if (action[0] == "ENABLE_MODES") {
        //     this._native_button.set_disabled(false);
        //     this._target_button.set_disabled(false);
        // } else if (action[0] == "DISABLE_MODES") {
        //     this._native_button.set_disabled(true);
        //     this._target_button.set_disabled(true);
        // } else if (action[0] == "CENTER_POSE") {
        //     for (ii = 0; ii < this._poses.length; ii++) {
        //         this._poses[0].set_zoom_level(0, true, true);
        //     }
        // } else if (action[0] == "ENABLE_PIP") {
        //     this._pip_button.set_disabled(false);
        // } else if (action[0] == "DISABLE_PIP") {
        //     this._pip_button.set_disabled(true);
        // } else if (action[0] == "WAIT") {
        //     if (action[1] == "TRUE") {
        //         this._waiting_for_input = true;
        //     } else {
        //         this._waiting_for_input = false;
        //     }
        // } else if (action[0] == "STAMP") {
        //     if (action[1] == "GREAT") {
        //         this._game_stamp.set_bitmap(BitmapManager.get_bitmap(BitmapManager.GreatImg));
        //     }
        //
        //     this._game_stamp.alpha = 0;
        //     this._game_stamp.visible = true;
        //     this._game_stamp.set_pos(new UDim(0.5, 0.5, -this._game_stamp.width / 2, -this._game_stamp.height / 2));
        //     this._game_stamp.set_animator(new GameAnimatorZFly(0.4, 0.35, 0, 3, 0.3));
        // } else if (action[0] == "ADD_LOCK") {
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
        // } else if (action[0] == "REMOVE_LOCK") {
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

    private check_constraints(render: boolean = true): boolean {
        log.debug("TODO: check_constraints");
        return true;
        // let check_res: boolean = true;
        // let old_check_res: boolean = true;
        // let undo_block: UndoBlock = this.get_current_undo_block();
        // let constraints: string[] = this._puzzle.get_constraints();
        //
        // let play_condition_music: boolean = false;
        // let play_decondition_music: boolean = false;
        //
        // let restricted_global: any[];
        // let restricted_local: any[];
        // let restricted_guanine: any[];
        // let restricted_cytosine: any[];
        // let restricted_adenine: any[];
        // let max_allowed_guanine: number = -1;
        // let max_allowed_cytosine: number = -1;
        // let max_allowed_adenine: number = -1;
        //
        // let wrong_pairs: any[] = null;
        //
        // if (this._puzzle.get_temporary_constraints() != null) {
        //     constraints = this._puzzle.get_temporary_constraints();
        // }
        //
        // if (constraints == null || constraints.length == 0) {
        //     return false;
        // }
        //
        // let sequence: any[] = undo_block.get_sequence();
        // let locks: any[] = undo_block.get_puzzle_locks();
        // let num_gu: number = undo_block.get_param(UndoBlockParam.GU);
        // let num_gc: number = undo_block.get_param(UndoBlockParam.GC);
        // let num_ua: number = undo_block.get_param(UndoBlockParam.AU);
        // let stack_len: number = undo_block.get_param(UndoBlockParam.STACK);
        //
        // let set_callback: Function = function (pose: PoseEditMode, cb: ConstraintBox, kk: number): void {
        //     cb.addEventListener(MouseEvent.MOUSE_DOWN, function (e: any): void {
        //         pose._unstable_index = (pose._unstable_index == kk) ? -1 : kk;
        //         pose.check_constraints();
        //     });
        // };
        //
        // let target_index: number;
        // let input_index: number;
        // let native_pairs: any[];
        //
        // for (let ii = 0; ii < constraints.length; ii += 2) {
        //     let res: boolean = true;
        //     let box: ConstraintBox = this._constraint_boxes[ii / 2];
        //     let old_res: boolean = box.is_satisfied();
        //     if (constraints[ii] == "GU") {
        //         res = (num_gu >= Number(constraints[ii + 1]));
        //         if (render) {
        //             box.set_content("GU", constraints[ii + 1], res, num_gu);
        //         }
        //     } else if (constraints[ii] == "AU") {
        //         res = (num_ua >= Number(constraints[ii + 1]));
        //         if (render) {
        //             box.set_content("AU", constraints[ii + 1], res, num_ua)
        //         }
        //     } else if (constraints[ii] == "GC") {
        //         res = (num_gc <= Number(constraints[ii + 1]));
        //
        //         if (render) {
        //             box.set_content("GC", constraints[ii + 1], res, num_gc);
        //         }
        //     } else if (constraints[ii] == "MUTATION") {
        //         let sequence_diff: number = EPars.sequence_diff(this._puzzle.get_subsequence_without_barcode(sequence), this._puzzle.get_subsequence_without_barcode(this._puzzle.get_beginning_sequence()));
        //         res = sequence_diff <= Number(constraints[ii + 1]);
        //
        //         if (render) {
        //             box.set_content("MUTATION", constraints[ii + 1], res, sequence_diff);
        //         }
        //
        //     } else if (constraints[ii] == "SHAPE") {
        //         target_index = Number(constraints[ii + 1]);
        //         let ublk: UndoBlock = this.get_current_undo_block(target_index);
        //         native_pairs = ublk.get_pairs();
        //         let structure_constraints: any[] = null;
        //         if (this._target_conditions != null && this._target_conditions[target_index] != null) {
        //             structure_constraints = this._target_conditions[target_index]['structure_constraints'];
        //
        //             if (ublk.get_oligo_order() != null) {
        //                 let np_map: any[] = ublk.get_order_map(ublk.get_oligo_order());
        //                 let tp_map: any[] = ublk.get_order_map(ublk.get_target_oligo_order());
        //                 if (np_map != null) {
        //                     let new_pairs: any[] = [];
        //                     let new_sc: any[] = [];
        //                     for (let jj = 0; jj < native_pairs.length; jj++) {
        //                         let kk: number = tp_map.indexOf(jj);
        //                         new_sc[jj] = structure_constraints[kk];
        //                         let pp: number = native_pairs[np_map[kk]];
        //                         new_pairs[jj] = pp < 0 ? pp : tp_map[np_map.indexOf(pp)];
        //                     }
        //                     native_pairs = new_pairs;
        //                     structure_constraints = new_sc;
        //                 }
        //             }
        //         }
        //
        //         res = EPars.are_pairs_same(native_pairs, this._target_pairs[target_index], structure_constraints);
        //
        //         input_index = 0;
        //         if (this._target_pairs.length > 1) {
        //             input_index = target_index;
        //         }
        //
        //         if (render) {
        //             box.set_content("SHAPE", {
        //                 target: this._target_pairs[target_index],
        //                 index: input_index,
        //                 native: native_pairs,
        //                 structure_constraints: structure_constraints
        //             }, res, 0);
        //             box.set_flagged(this._unstable_index == ii);
        //             if (!box.hasEventListener(MouseEvent.MOUSE_DOWN)) {
        //                 set_callback(this, box, ii);
        //             }
        //
        //             if (this._unstable_index == ii) {
        //                 wrong_pairs = box.get_wrong_pairs(native_pairs, this._target_pairs[target_index], structure_constraints, res);
        //             }
        //         }
        //
        //         if (target_index > 0) {
        //             if (this._constraint_shape_boxes != null) {
        //                 if (this._constraint_shape_boxes[target_index] != null) {
        //                     this._constraint_shape_boxes[target_index].set_content("SHAPE", {
        //                         target: this._target_pairs[target_index],
        //                         index: input_index,
        //                         native: native_pairs,
        //                         structure_constraints: structure_constraints
        //                     }, res, 0);
        //                     this._constraint_shape_boxes[target_index].set_flagged(this._unstable_index == ii);
        //                     if (!this._constraint_shape_boxes[target_index].hasEventListener(MouseEvent.MOUSE_DOWN)) {
        //                         set_callback(this, this._constraint_shape_boxes[target_index], ii);
        //                     }
        //
        //                     if (this._is_pip_mode) {
        //                         this._constraint_shape_boxes[target_index].visible = true;
        //                     } else {
        //                         this._constraint_shape_boxes[target_index].visible = false;
        //                     }
        //                 }
        //             }
        //         }
        //
        //         if (!this._is_pip_mode) {
        //             if (target_index == this._current_target_index) {
        //                 box.alpha = 1.0;
        //             } else {
        //                 box.alpha = 0.3;
        //             }
        //         } else {
        //             box.alpha = 1.0;
        //         }
        //
        //         if (this._is_pip_mode && target_index > 0) {
        //             box.visible = false;
        //         } else {
        //             if (this._puz_state == PuzzleState.GAME || this._puz_state == PuzzleState.CLEARED) {
        //                 box.visible = true;
        //             }
        //         }
        //
        //     } else if (constraints[ii] == "ANTISHAPE") {
        //         target_index = Number(constraints[ii + 1]);
        //         native_pairs = this.get_current_undo_block(target_index).get_pairs();
        //         if (this._target_conditions == null) {
        //             Application.instance.throw_error("Target object not available for ANTISHAPE constraint");
        //             continue;
        //         }
        //
        //         if (this._target_conditions[target_index] == null) {
        //             Application.instance.throw_error("Target condition not available for ANTISHAPE constraint");
        //             continue;
        //         }
        //
        //         let anti_structure_string: string = this._target_conditions[target_index]['anti_secstruct'];
        //
        //         if (anti_structure_string == null) {
        //             Application.instance.throw_error("Target structure not available for ANTISHAPE constraint");
        //             continue;
        //         }
        //
        //         let anti_structure_constraints: any[] = this._target_conditions[target_index]['anti_structure_constraints'];
        //         let anti_pairs: any[] = EPars.parenthesis_to_pair_array(anti_structure_string);
        //         res = !EPars.are_pairs_same(native_pairs, anti_pairs, anti_structure_constraints);
        //
        //         input_index = 0;
        //         if (this._target_pairs.length > 1) {
        //             input_index = target_index;
        //         }
        //
        //         if (render) {
        //             box.set_content("ANTISHAPE", {
        //                 target: anti_pairs,
        //                 native: native_pairs,
        //                 index: input_index,
        //                 structure_constraints: anti_structure_constraints
        //             }, res, 0);
        //             box.set_flagged(this._unstable_index == ii);
        //             if (!box.hasEventListener(MouseEvent.MOUSE_DOWN)) {
        //                 set_callback(this, box, ii);
        //             }
        //
        //             if (this._unstable_index == ii) {
        //                 wrong_pairs = box.get_wrong_pairs(native_pairs, anti_pairs, anti_structure_constraints, res);
        //             }
        //         }
        //
        //         if (target_index > 0) {
        //             if (this._constraint_antishape_boxes != null) {
        //                 if (this._constraint_antishape_boxes[target_index] != null) {
        //                     this._constraint_antishape_boxes[target_index].set_content("ANTISHAPE", {
        //                         target: anti_pairs,
        //                         native: native_pairs,
        //                         index: input_index,
        //                         structure_constraints: anti_structure_constraints
        //                     }, res, 0);
        //                     this._constraint_antishape_boxes[target_index].set_flagged(this._unstable_index == ii);
        //                     if (!this._constraint_antishape_boxes[target_index].hasEventListener(MouseEvent.MOUSE_DOWN)) {
        //                         set_callback(this, this._constraint_antishape_boxes[target_index], ii);
        //                     }
        //
        //                     if (this._is_pip_mode) {
        //                         this._constraint_antishape_boxes[target_index].visible = true;
        //                     } else {
        //                         this._constraint_antishape_boxes[target_index].visible = false;
        //                     }
        //
        //                 }
        //             }
        //         }
        //
        //         if (!this._is_pip_mode) {
        //             if (target_index == this._current_target_index) {
        //                 box.alpha = 1.0;
        //             } else {
        //                 box.alpha = 0.3;
        //             }
        //         } else {
        //             box.alpha = 1.0;
        //         }
        //
        //         if (this._is_pip_mode && target_index > 0) {
        //             box.visible = false;
        //         } else {
        //             if (this._puz_state == PuzzleState.GAME || this._puz_state == PuzzleState.CLEARED) {
        //                 box.visible = true;
        //             }
        //         }
        //
        //     } else if (constraints[ii] == "BINDINGS") {
        //         target_index = Number(constraints[ii + 1]);
        //         let undoblk: UndoBlock = this.get_current_undo_block(target_index);
        //
        //         if (this._target_conditions == null) {
        //             Application.instance.throw_error("Target object not available for BINDINGS constraint");
        //             continue;
        //         }
        //
        //         if (this._target_conditions[target_index] == null) {
        //             Application.instance.throw_error("Target condition not available for BINDINGS constraint");
        //             continue;
        //         }
        //
        //         let oligos: any[] = this._target_conditions[target_index]['oligos'];
        //         if (oligos == null) {
        //             Application.instance.throw_error("Target condition not available for BINDINGS constraint");
        //             continue;
        //         }
        //
        //         let o_names: any[] = [];
        //         let bind: any[] = [];
        //         let label: any[] = [];
        //         let jj: number;
        //         let bmap: any[] = [];
        //         let offsets: any[] = [];
        //         let ofs: number = sequence.length;
        //         let o: any[] = undoblk.get_oligo_order();
        //         let count: number = undoblk.get_oligos_paired();
        //         for (jj = 0; jj < o.length; jj++) {
        //             bmap[o[jj]] = (jj < count);
        //             offsets[o[jj]] = ofs + 1;
        //             ofs += oligos[o[jj]]['sequence'].length + 1;
        //         }
        //
        //         res = true;
        //         for (jj = 0; jj < oligos.length; jj++) {
        //             if (oligos[jj]['bind'] == null) continue;
        //             let o_name: string = oligos[jj]['name'];
        //             if (o_name == null) o_name = "Oligo " + (jj + 1).toString();
        //             o_names.push(o_name);
        //             let expected: boolean = Boolean(oligos[jj]['bind']);
        //             bind.push(expected);
        //             let lbl: string = oligos[jj]['label'] != null ? String(oligos[jj]['label']) : String.fromCharCode(65 + jj);
        //             label.push(lbl);
        //
        //             if (bmap[jj] != expected) {
        //                 res = false;
        //                 if (restricted_local == null) restricted_local = [];
        //                 if (restricted_local[target_index] == null) restricted_local[target_index] = [];
        //                 restricted_local[target_index].push(offsets[jj]);
        //                 restricted_local[target_index].push(offsets[jj] + oligos[jj]['sequence'].length - 1);
        //             }
        //         }
        //
        //         if (render) {
        //             box.set_content("BINDINGS", {
        //                 index: target_index,
        //                 bind: bind,
        //                 label: label,
        //                 oligo_name: o_names
        //             }, res, 0);
        //         }
        //
        //     } else if (constraints[ii] == "G") {
        //         let g_count: number = 0;
        //
        //         for (let jj = 0; jj < sequence.length; jj++) {
        //             if (sequence[jj] == EPars.RNABASE_GUANINE) {
        //                 g_count++;
        //             }
        //         }
        //
        //         res = (g_count >= Number(constraints[ii + 1]));
        //
        //         if (render) {
        //             box.set_content("G", constraints[ii + 1], res, g_count);
        //         }
        //
        //     } else if (constraints[ii] == "GMAX") {
        //         let g_count = 0;
        //
        //         for (let jj = 0; jj < sequence.length; jj++) {
        //             if (sequence[jj] == EPars.RNABASE_GUANINE) {
        //                 g_count++;
        //             }
        //         }
        //
        //         res = (g_count <= Number(constraints[ii + 1]));
        //
        //         if (render) {
        //             box.set_content("GMAX", constraints[ii + 1], res, g_count);
        //         }
        //
        //     } else if (constraints[ii] == "A") {
        //         let a_count: number = 0;
        //
        //         for (let jj = 0; jj < sequence.length; jj++) {
        //             if (sequence[jj] == EPars.RNABASE_ADENINE) {
        //                 a_count++;
        //             }
        //         }
        //
        //         res = (a_count >= Number(constraints[ii + 1]));
        //
        //         if (render) {
        //             box.set_content("A", constraints[ii + 1], res, a_count);
        //         }
        //
        //     } else if (constraints[ii] == "AMAX") {
        //         let a_count = 0;
        //
        //         for (let jj = 0; jj < sequence.length; jj++) {
        //             if (sequence[jj] == EPars.RNABASE_ADENINE) {
        //                 a_count++;
        //             }
        //         }
        //
        //         res = (a_count <= Number(constraints[ii + 1]));
        //
        //         if (render) {
        //             box.set_content("AMAX", constraints[ii + 1], res, a_count);
        //         }
        //
        //     } else if (constraints[ii] == "U") {
        //         let u_count: number = 0;
        //
        //         for (let jj = 0; jj < sequence.length; jj++) {
        //             if (sequence[jj] == EPars.RNABASE_URACIL) {
        //                 u_count++;
        //             }
        //         }
        //
        //         res = (u_count >= Number(constraints[ii + 1]));
        //
        //         if (render) {
        //             box.set_content("U", constraints[ii + 1], res, u_count);
        //         }
        //
        //     } else if (constraints[ii] == "UMAX") {
        //         let u_count = 0;
        //
        //         for (let jj = 0; jj < sequence.length; jj++) {
        //             if (sequence[jj] == EPars.RNABASE_URACIL) {
        //                 u_count++;
        //             }
        //         }
        //
        //         res = (u_count <= Number(constraints[ii + 1]));
        //
        //         if (render) {
        //             box.set_content("UMAX", constraints[ii + 1], res, u_count);
        //         }
        //
        //     } else if (constraints[ii] == "C") {
        //         let c_count: number = 0;
        //
        //         for (let jj = 0; jj < sequence.length; jj++) {
        //             if (sequence[jj] == EPars.RNABASE_CYTOSINE) {
        //                 c_count++;
        //             }
        //         }
        //
        //         res = (c_count >= Number(constraints[ii + 1]));
        //
        //         if (render) {
        //             box.set_content("C", constraints[ii + 1], res, c_count);
        //         }
        //
        //     } else if (constraints[ii] == "CMAX") {
        //         let c_count = 0;
        //
        //         for (let jj = 0; jj < sequence.length; jj++) {
        //             if (sequence[jj] == EPars.RNABASE_CYTOSINE) {
        //                 c_count++;
        //             }
        //         }
        //
        //         res = (c_count <= Number(constraints[ii + 1]));
        //
        //         if (render) {
        //             box.set_content("CMAX", constraints[ii + 1], res, c_count);
        //         }
        //
        //     } else if (constraints[ii] == "PAIRS") {
        //         res = (num_gc + num_gu + num_ua >= Number(constraints[ii + 1]));
        //         box.set_content("PAIRS", constraints[ii + 1], res, num_gc + num_gu + num_ua);
        //     } else if (constraints[ii] == "STACK") {
        //         res = (stack_len >= Number(constraints[ii + 1]));
        //
        //         if (render) {
        //             box.set_content("STACK", constraints[ii + 1], res, stack_len);
        //         }
        //     } else if (constraints[ii] == "CONSECUTIVE_G") {
        //         let consecutive_g_count: number = EPars.count_consecutive(sequence, EPars.RNABASE_GUANINE);
        //         res = (consecutive_g_count < Number(constraints[ii + 1]));
        //
        //         if (render) {
        //             box.set_content("CONSECUTIVE_G", constraints[ii + 1], res, consecutive_g_count);
        //         }
        //
        //         max_allowed_guanine = Number(constraints[ii + 1]);
        //
        //     } else if (constraints[ii] == "CONSECUTIVE_C") {
        //         let consecutive_c_count: number = EPars.count_consecutive(sequence, EPars.RNABASE_CYTOSINE);
        //         res = (consecutive_c_count < Number(constraints[ii + 1]));
        //
        //         if (render) {
        //             box.set_content("CONSECUTIVE_C", constraints[ii + 1], res, consecutive_c_count);
        //         }
        //
        //         max_allowed_cytosine = Number(constraints[ii + 1]);
        //     } else if (constraints[ii] == "CONSECUTIVE_A") {
        //         let consecutive_a_count: number = EPars.count_consecutive(sequence, EPars.RNABASE_ADENINE);
        //         res = (consecutive_a_count < Number(constraints[ii + 1]));
        //
        //         if (render) {
        //             box.set_content("CONSECUTIVE_A", constraints[ii + 1], res, consecutive_a_count);
        //         }
        //
        //         max_allowed_adenine = Number(constraints[ii + 1]);
        //     } else if (constraints[ii] == "LAB_REQUIREMENTS") {
        //         consecutive_g_count = EPars.count_consecutive(sequence, EPars.RNABASE_GUANINE, locks);
        //         consecutive_c_count = EPars.count_consecutive(sequence, EPars.RNABASE_CYTOSINE, locks);
        //         consecutive_a_count = EPars.count_consecutive(sequence, EPars.RNABASE_ADENINE, locks);
        //         max_allowed_guanine = 4;
        //         max_allowed_cytosine = 4;
        //         max_allowed_adenine = 5;
        //         res = (consecutive_g_count < max_allowed_guanine);
        //         res && this. = (consecutive_c_count < max_allowed_cytosine);
        //         res && this. = (consecutive_a_count < max_allowed_adenine);
        //
        //         if (render) {
        //             box.set_content("LAB_REQUIREMENTS", {
        //                 "g_count": consecutive_g_count, "g_max": max_allowed_guanine,
        //                 "c_count": consecutive_c_count, "c_max": max_allowed_cytosine,
        //                 "a_count": consecutive_a_count, "a_max": max_allowed_adenine
        //             }, res, 0);
        //         }
        //
        //     } else if (constraints[ii] == "BARCODE") {
        //         res = !SolutionManager.instance.check_redundancy_by_hairpin(EPars.sequence_array_to_string(sequence));
        //         if (render) {
        //             box.set_content("BARCODE", 0, res, 0);
        //         }
        //
        //     } else if (constraints[ii] == "OLIGO_BOUND") {
        //         target_index = Number(constraints[ii + 1]);
        //         let nnfe: any[] = this.get_current_undo_block(target_index).get_param(UndoBlockParam.NNFE_ARRAY, EPars.DEFAULT_TEMPERATURE);
        //         res = (nnfe != null && nnfe[0] == -2);
        //
        //         if (this._target_conditions == null) {
        //             Application.instance.throw_error("Target object not available for BINDINGS constraint");
        //             continue;
        //         }
        //
        //         if (this._target_conditions[target_index] == null) {
        //             Application.instance.throw_error("Target condition not available for BINDINGS constraint");
        //             continue;
        //         }
        //
        //         o_names = [];
        //         o_name = this._target_conditions[target_index]['oligo_name'];
        //         if (o_name == null) o_name = "Oligo " + (jj + 1).toString();
        //         o_names.push(o_name);
        //
        //         bind = [];
        //         bind.push(true);
        //
        //         label = [];
        //         lbl = this._target_conditions[target_index]['oligo_label'];
        //         if (lbl == null) lbl = String.fromCharCode(65 + jj);
        //         label.push(lbl);
        //
        //         if (render) {
        //             box.set_content("BINDINGS", {
        //                 index: target_index,
        //                 bind: bind,
        //                 label: label,
        //                 oligo_name: o_names
        //             }, res, 0);
        //         }
        //
        //     } else if (constraints[ii] == "OLIGO_UNBOUND") {
        //         target_index = Number(constraints[ii + 1]);
        //         nnfe = this.get_current_undo_block(target_index).get_param(UndoBlockParam.NNFE_ARRAY, EPars.DEFAULT_TEMPERATURE);
        //         res = (nnfe == null || nnfe[0] != -2);
        //
        //         if (this._target_conditions == null) {
        //             Application.instance.throw_error("Target object not available for BINDINGS constraint");
        //             continue;
        //         }
        //
        //         if (this._target_conditions[target_index] == null) {
        //             Application.instance.throw_error("Target condition not available for BINDINGS constraint");
        //             continue;
        //         }
        //
        //         o_names = [];
        //         o_name = this._target_conditions[target_index]['oligo_name'];
        //         if (o_name == null) o_name = "Oligo " + (jj + 1).toString();
        //         o_names.push(o_name);
        //
        //         bind = [];
        //         bind.push(false);
        //
        //         label = [];
        //         lbl = this._target_conditions[target_index]['oligo_label'];
        //         if (lbl == null) lbl = String.fromCharCode(65 + jj);
        //         label.push(lbl);
        //
        //         if (render) {
        //             box.set_content("BINDINGS", {
        //                 index: target_index,
        //                 bind: bind,
        //                 label: label,
        //                 oligo_name: o_names
        //             }, res, 0);
        //         }
        //
        //     } else if (constraints[ii] == "SCRIPT") {
        //         let nid: string = constraints[ii + 1];
        //
        //         if (ExternalInterface.available) {
        //
        //             let set_end_callback: Function = function (pose: PoseEditMode, sid: string, jj: number): void {
        //                 ExternalInterface.addCallback("_end" + sid, function (ret: Object): void {
        //                     let goal: string = "";
        //                     let name: string = "...";
        //                     let value: string = "";
        //                     let index: string = null;
        //                     let data_png: string = "";
        //                     let satisfied: boolean = false;
        //                     pose.trace_js("_end" + sid + "() called");
        //                     //pose.trace_js(ret);
        //                     if (ret && ret.cause) {
        //                         if (ret.cause.satisfied) satisfied = ret.cause.satisfied;
        //                         if (ret.cause.goal != null) goal = ret.cause.goal;
        //                         if (ret.cause.name != null) name = ret.cause.name;
        //                         if (ret.cause.value != null) value = ret.cause.value;
        //                         if (ret.cause.index != null) {
        //                             index = (ret.cause.index + 1).toString();
        //                             let ll: number = this._is_pip_mode ? ret.cause.index : (ret.cause.index == this._current_target_index ? 0 : -1);
        //                             if (ll >= 0) {
        //                                 if (ret.cause.highlight != null) {
        //                                     Pose2D(this._poses[ll]).highlight_user_defined_sequence(ret.cause.highlight);
        //                                 } else {
        //                                     Pose2D(this._poses[ll]).clear_user_defined_highlight();
        //                                 }
        //                             }
        //                         }
        //                         if (ret.cause.icon_b64) data_png = ret.cause.icon_b64;
        //                     }
        //
        //                     if (render) {
        //                         ConstraintBox(this._constraint_boxes[jj]).set_content("SCRIPT", {
        //                             "nid": sid,
        //                             "goal": goal,
        //                             "name": name,
        //                             "value": value,
        //                             "index": index,
        //                             "data_png": data_png
        //                         }, satisfied, 0);
        //                     }
        //
        //                     res = satisfied;
        //                 });
        //             };
        //
        //             this.register_script_callbacks();
        //             set_end_callback(this, nid, ii / 2);
        //
        //             // run
        //             res = false;
        //             this.trace_js("running script " + nid);
        //             ExternalInterface.call("ScriptInterface.evaluate_script_with_nid", nid, {}, null, true);
        //             this.trace_js("launched");
        //         } else {
        //
        //             if (render) {
        //                 box.set_content("SCRIPT", {"nid": nid, "goal": "", "name": "..."}, res, 0);
        //             }
        //         }
        //     }
        //
        //     if (render) {
        //         if (old_res != res && res) {
        //             play_condition_music = true;
        //             box.flare(res);
        //         } else if (old_res != res && old_res) {
        //             play_decondition_music = true;
        //             box.flare(res);
        //         }
        //     }
        //
        //     check_res = check_res && res;
        //     old_check_res && this. = old_res;
        // }
        //
        // restricted_guanine = EPars.get_restricted_consecutive(sequence, EPars.RNABASE_GUANINE, max_allowed_guanine - 1, locks);
        // restricted_cytosine = EPars.get_restricted_consecutive(sequence, EPars.RNABASE_CYTOSINE, max_allowed_cytosine - 1, locks);
        // restricted_adenine = EPars.get_restricted_consecutive(sequence, EPars.RNABASE_ADENINE, max_allowed_adenine - 1, locks);
        //
        // restricted_global = restricted_guanine.concat(restricted_cytosine).concat(restricted_adenine);
        //
        // let unstable: any[] = [];
        // if (wrong_pairs) {
        //     let curr: number = 0;
        //     for (let jj = 0; jj < wrong_pairs.length; jj++) {
        //         let stat: number = (wrong_pairs[jj] == 1 ? 1 : 0);
        //         if ((curr ^ stat) != 0) {
        //             unstable.push(jj - curr);
        //             curr = stat;
        //         }
        //     }
        //     if ((unstable.length % 2) == 1) {
        //         unstable.push(jj - 1);
        //     }
        // }
        //
        // for (let ii = 0; ii < this._poses.length; ii++) {
        //     let jj = this._is_pip_mode ? ii : (ii == 0 ? this._current_target_index : ii);
        //     let restricted: any[];
        //     if (restricted_local && restricted_local[jj]) {
        //         restricted = restricted_global.concat(restricted_local[jj]);
        //     } else {
        //         restricted = restricted_global;
        //     }
        //     this._poses[ii].highlight_restricted_sequence(restricted);
        //     this._poses[ii].highlight_unstable_sequence(unstable);
        // }
        //
        // if (check_res && !old_check_res) {
        //     if (this._puzzle.get_puzzle_type() == "Experimental") {
        //         SoundManager.instance.play_se(SoundManager.SoundAllConditions);
        //     } else if (this._puz_state != PuzzleState.GAME) {
        //         SoundManager.instance.play_se(SoundManager.SoundCondition);
        //     }
        // } else if (play_condition_music) {
        //     SoundManager.instance.play_se(SoundManager.SoundCondition);
        // } else if (play_decondition_music) {
        //     SoundManager.instance.play_se(SoundManager.SoundDecondition);
        // }
        //
        // return check_res;
    }

    private update_score(): void {
        this.autosave_data(null);
        // let dn: GameObject = (<GameObject>Application.instance.get_application_gui("Design Name"));
        // if (dn != null) dn.visible = (this._stack_level == 0);

        let undo_block: UndoBlock = this.get_current_undo_block();
        let sequence: number[] = undo_block.get_sequence();
        let best_pairs: number[] = undo_block.get_pairs(EPars.DEFAULT_TEMPERATURE);
        let nnfe: number[];

        if (!this._paused) {
            for (let ii = 0; ii < this._poses.length; ii++) {
                if (ii == 0 && this._pose_state == PoseState.NATIVE && !this._is_pip_mode) {
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
                if (ii == 0 && this._pose_state == PoseState.TARGET && !this._is_pip_mode) {
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

            if (ii == 0 && !this._is_pip_mode) {
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
                if (nnfe != null && nnfe[0] == -2) {
                    this._poses[ii].set_oligo_paired(true);
                    this._poses[ii].set_duplex_cost(nnfe[1] * 0.01);
                } else {
                    this._poses[ii].set_oligo_paired(false);
                }
            }
            if (this._target_conditions[jj]['type'] == "multistrand") {
                nnfe = this.get_current_undo_block(jj).get_param(UndoBlockParam.NNFE_ARRAY, EPars.DEFAULT_TEMPERATURE);
                if (nnfe != null && nnfe[0] == -2) {
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
        // for (let ii = 0; ii < this._puzzle.get_constraints().length; ii += 2) {
        //     was_satisfied = was_satisfied && this._constraint_boxes[ii / 2].is_satisfied();
        // }

        let constraints_satisfied: boolean = this.check_constraints();
        for (let ii = 0; ii < this._poses.length; ii++) {
            this.get_current_undo_block(ii).set_stable(constraints_satisfied);
        }

        /// Update spec thumbnail if it is open
        this.update_docked_spec_box();

        let is_there_temp_constraints: boolean = (this._puzzle.get_temporary_constraints() != null);

        let state_dict: Map<any, any> = new Map();
        if (constraints_satisfied && is_there_temp_constraints) {
            state_dict.set(PuzzleEvent.PUZEVENT_TEMP_CLEARED, true);
        }

        this._puzzle_events.process_events(state_dict);

        if (constraints_satisfied && !is_there_temp_constraints) {
            if (this._puzzle.get_puzzle_type() != "Experimental" && this._puz_state == PuzzleState.GAME) {
                this.submit_current_pose();
            }
        }

        //when constaints are satisfied, trigger publish hint animation
        if (constraints_satisfied && !was_satisfied && this._puzzle.get_puzzle_type() == "Experimental") {
            log.debug("TODO: submit_button.respond()")
            // this._submit_button.respond(150, 160);
        }

    }

    private flash_constraint_for_target(target_index: number): void {
        log.debug("TODO: flash_constraint_for_target");
        // let box: ConstraintBox = null;
        // if (target_index == 0 || !this._is_pip_mode) {
        //     let constraints: any[] = this._puzzle.get_constraints();
        //     for (let ii: number = 0; ii < constraints.length; ii += 2) {
        //         if (constraints[ii] == "SHAPE" && Number(constraints[ii + 1]) == target_index) {
        //             box = this._constraint_boxes[ii / 2];
        //             break;
        //         }
        //     }
        // } else {
        //     box = this._constraint_shape_boxes[target_index];
        // }
        // if (box != null) box.flash(0x00FFFF); // (0xC080FF);
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
        if (segments.length == 4
            && segments[1] - segments[0] == segments[3] - segments[2]
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
                if (dontcare_ok && num_wrong == 0) {
                    if (num_unpaired == 0) {
                        for (let jj = segments[0]; jj <= segments[1]; jj++) {
                            this._target_pairs[xx][jj] = -1;
                        }
                        for (let jj = segments[2]; jj <= segments[3]; jj++) {
                            this._target_pairs[xx][jj] = -1;
                        }
                        SoundManager.instance.play_se(SoundManager.SoundRY);
                        this.flash_constraint_for_target(xx);
                        this._poses[target_index].clear_design_struct();
                    } else if (num_unpaired == segments[1] - segments[0] + segments[3] - segments[2] + 2) {
                        // breaking pairs is safe, but adding them may not always be
                        if (EPars.validate_parenthesis(EPars.pairs_array_to_parenthesis(this._target_pairs[xx]).slice(segments[1] + 1, segments[2]), false) == null) {
                            for (let jj = segments[0]; jj <= segments[1]; jj++) this._target_pairs[xx][jj] = segments[3] - (jj - segments[0]);
                            for (let jj = segments[2]; jj <= segments[3]; jj++) this._target_pairs[xx][jj] = segments[1] - (jj - segments[2]);
                            SoundManager.instance.play_se(SoundManager.SoundGB);
                            this.flash_constraint_for_target(xx);
                            this._poses[target_index].clear_design_struct();
                            // if the above fails, and we have multi-oligos, there may be a permutation where it works
                        } else if (this._target_oligos[xx] != null && this._target_oligos[xx].length > 1) {
                            let new_order: number[] = [];
                            for (let jj = 0; jj < this._target_oligos[xx].length; jj++) new_order.push(jj);
                            let more: boolean;
                            do {
                                segments = this._poses[target_index].get_design_segments();
                                let new_map: any[] = this._poses[target_index].get_order_map(new_order);
                                let new_pairs: any[] = [];
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
                                    SoundManager.instance.play_se(SoundManager.SoundGB);
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
                if (ii != target_index) {
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
                    if (last_shifted_command == EPars.RNABASE_ADD_BASE) {
                        let anti_structure_constraint: boolean = anti_structure_constraints[last_shifted_index];
                        anti_structure_constraints.splice(last_shifted_index, 0, anti_structure_constraint);
                    } else if (last_shifted_command == EPars.RNABASE_DELETE) {
                        anti_structure_constraints.splice(last_shifted_index, 1);
                    }
                }

                structure_constraints = this._target_conditions[ii]['structure_constraints'];
                if (structure_constraints != null) {
                    let constraint_val: boolean = structure_constraints[last_shifted_index];
                    let new_constraints: any[];

                    if (last_shifted_command == EPars.RNABASE_ADD_BASE) {
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

                if (this._target_conditions[ii]['type'] == "aptamer") {
                    let binding_site: any[] = this._target_conditions[ii]['site'].slice(0);
                    let binding_pairs: any[] = [];
                    if (last_shifted_command == EPars.RNABASE_ADD_BASE) {
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

        let execfold_cb: Function = (fd: any[]) => {
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
                this._op_queue.push(new AsyncOp(ii + 1, () => this.pose_edit_by_target_fold_target(ii)));
            }

            this._op_queue.push(new AsyncOp(this._target_pairs.length + 1, () => this.pose_edit_by_target_epilog(target_index)));

        }

        if (this._pose_edit_by_target_cb != null) {
            this._pose_edit_by_target_cb();
        }
    }

    private pose_edit_by_target_fold_target(ii: number): void {
        let best_pairs: any[];
        let oligo_order: any[] = null;
        let oligos_paired: number = 0;
        let force_struct: string = null;
        let fold_mode: number;
        let full_seq: any[];
        let malus: number;
        let bonus: number;
        let sites: any[];

        if (ii == 0) {
            /// Pushing undo block
            this._stack_level++;
            this._seq_stacks[this._stack_level] = [];
        }
        // a "trick" used by the 'multifold' branch below, in order to
        // re-queue itself without triggering the stack push coded above
        ii = ii % this._target_pairs.length;

        let seq: number[] = this._poses[ii].get_sequence();

        if (this._target_conditions[ii]) force_struct = this._target_conditions[ii]['force_struct'];

        if (this._target_conditions[ii] == null || this._target_conditions[ii]['type'] == "single") {
            log.debug("folding");
            best_pairs = this._folder.fold_sequence(this._puzzle.transform_sequence(seq, ii), null, force_struct);

        } else if (this._target_conditions[ii]['type'] == "aptamer") {
            bonus = this._target_conditions[ii]['bonus'];
            sites = this._target_conditions[ii]['site'];
            best_pairs = this._folder.fold_sequence_with_binding_site(this._puzzle.transform_sequence(seq, ii), this._target_pairs[ii], sites, Number(bonus), this._target_conditions[ii]['fold_version']);

        } else if (this._target_conditions[ii]['type'] == "oligo") {
            fold_mode = this._target_conditions[ii]['fold_mode'] == null ? Pose2D.OLIGO_MODE_DIMER : this._target_conditions[ii]['fold_mode'];
            if (fold_mode == Pose2D.OLIGO_MODE_DIMER) {
                log.debug("cofold");
                full_seq = seq.concat(EPars.string_to_sequence_array("&" + this._target_conditions[ii]['oligo_sequence']));
                malus = Number(this._target_conditions[ii]['malus'] * 100);
                best_pairs = this._folder.cofold_sequence(full_seq, null, malus, force_struct);
            } else if (fold_mode == Pose2D.OLIGO_MODE_EXT5P) {
                full_seq = EPars.string_to_sequence_array(this._target_conditions[ii]['oligo_sequence']).concat(seq);
                best_pairs = this._folder.fold_sequence(full_seq, null, force_struct);
            } else {
                full_seq = seq.concat(EPars.string_to_sequence_array(this._target_conditions[ii]['oligo_sequence']));
                best_pairs = this._folder.fold_sequence(full_seq, null, force_struct);
            }

        } else if (this._target_conditions[ii]['type'] == "aptamer+oligo") {
            bonus = this._target_conditions[ii]['bonus'];
            sites = this._target_conditions[ii]['site'];
            fold_mode = this._target_conditions[ii]['fold_mode'] == null ? Pose2D.OLIGO_MODE_DIMER : this._target_conditions[ii]['fold_mode'];
            if (fold_mode == Pose2D.OLIGO_MODE_DIMER) {
                log.debug("cofold");
                full_seq = seq.concat(EPars.string_to_sequence_array("&" + this._target_conditions[ii]['oligo_sequence']));
                malus = Number(this._target_conditions[ii]['malus'] * 100);
                best_pairs = this._folder.cofold_sequence_with_binding_site(full_seq, sites, bonus, force_struct, malus);
            } else if (fold_mode == Pose2D.OLIGO_MODE_EXT5P) {
                full_seq = EPars.string_to_sequence_array(this._target_conditions[ii]['oligo_sequence']).concat(seq);
                best_pairs = this._folder.fold_sequence_with_binding_site(full_seq, this._target_pairs[ii], sites, Number(bonus), this._target_conditions[ii]['fold_version']);
            } else {
                full_seq = seq.concat(EPars.string_to_sequence_array(this._target_conditions[ii]['oligo_sequence']));
                best_pairs = this._folder.fold_sequence_with_binding_site(full_seq, this._target_pairs[ii], sites, Number(bonus), this._target_conditions[ii]['fold_version']);
            }

        } else if (this._target_conditions[ii]['type'] == "multistrand") {
            let oligos: any[] = [];
            for (let jj: number = 0; jj < this._target_conditions[ii]['oligos'].length; jj++) {
                oligos.push({
                    seq: EPars.string_to_sequence_array(this._target_conditions[ii]['oligos'][jj]['sequence']),
                    malus: Number(this._target_conditions[ii]['oligos'][jj]['malus'] * 100.0)
                });
            }
            log.debug("multifold");

            let key: Object = {
                primitive: "multifold",
                seq: this._puzzle.transform_sequence(seq, ii),
                second_best_pairs: null,
                oligos: oligos,
                desired_pairs: null,
                temp: 37
            };
            let mfold: Object = this._folder.get_cache(key);

            if (mfold == null && this._force_synch == false) {
                // multistrand folding can be really slow
                // break it down to each permutation
                let ops: any[] = this._folder.multifold_unroll(this._puzzle.transform_sequence(seq, ii), null, oligos);
                Assert.isTrue(false, "Tim, double check the output of multifold_unroll");
                this._op_queue.unshift(new AsyncOp(
                    ii + 1,
                    () => this.pose_edit_by_target_fold_target(ii + this._target_pairs.length)));
                while (ops.length > 0) {
                    let o: AsyncOp = ops.pop();
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
                    if (constraints[ii] == "SHAPE") {
                        is_shape_constrained = true;
                    }
                }
            }

            let pairs_diff: number[] = [];

            for (let ii = 0; ii < best_pairs.length; ii++) {
                if (last_best_pairs[ii] == best_pairs[ii]) {
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
                    if (pairs_diff[ii] > 0 && ((!is_shape_constrained && this._pose_state == PoseState.NATIVE) || (best_pairs[ii] == this._target_pairs[target_index][ii]))) {
                        if (stack_start < 0) {
                            stack_start = ii;
                            last_other_stack = best_pairs[ii];
                        } else {
                            if (best_pairs[ii] != last_other_stack - 1) {
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

        // FIXME: reinstantiating this horror, which I just discovered
        //        is related to the old Tutorial 5.
        //        Remove the code after the new tutorials are launched.
        // JEEFIX : WHAT THE HELL IS THIS?!
        // Need to change later
        let seq: number[] = this._poses[0].get_sequence();
        if (seq[4] == 3 && seq[9] != 3) {
            let state_dict: Map<any, any> = new Map();
            state_dict.set(PuzzleEvent.PUZEVENT_ON_POSE_CHANGE, true);
            this._puzzle_events.process_events(state_dict);
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

        let before: any[] = this._puzzle.transform_sequence(this.get_current_undo_block(0).get_sequence(), 0);

        this._stack_level++;
        this.move_undo_stack();

        let after: any[] = this._puzzle.transform_sequence(this.get_current_undo_block(0).get_sequence(), 0);
        this.move_history_add_mutations(before, after);

        this.update_score();
        this.transform_poses_markers();
    }

    private move_undo_stack_backward(): void {
        if (this._stack_level < 1) {
            return;
        }
        this.save_poses_markers_contexts();

        let before: any[] = this._puzzle.transform_sequence(this.get_current_undo_block(0).get_sequence(), 0);

        this._stack_level--;
        this.move_undo_stack();

        let after: any[] = this._puzzle.transform_sequence(this.get_current_undo_block(0).get_sequence(), 0);
        this.move_history_add_mutations(before, after);

        this.update_score();
        this.transform_poses_markers();
    }

    private move_undo_stack_to_last_stable(): void {
        this.save_poses_markers_contexts();
        let before: any[] = this._puzzle.transform_sequence(this.get_current_undo_block(0).get_sequence(), 0);

        let stack_level: number = this._stack_level;
        while (this._stack_level >= 1) {

            if (this.get_current_undo_block(0).get_stable()) {
                this.move_undo_stack();

                let after: any[] = this._puzzle.transform_sequence(this.get_current_undo_block(0).get_sequence(), 0);
                this.move_history_add_mutations(before, after);

                this.update_score();
                this.transform_poses_markers();
                return;
            }

            this._stack_level--;
        }
        this._stack_level = stack_level;
    }

    private set_start_curtain(show_curtain: boolean): void {
        log.debug("TODO: set_start_curtain");
        // // Make sure the mission screen is ON TOP.
        // if (this._mission_container.contains(this._mission_screen)) {
        //     this._mission_container.removeObject(this._mission_screen);
        // }
        // this._mission_container.addObject(this._mission_screen);
        // this._constraints_container.mouseEnabled = !show_curtain;
        // this._constraints_container.mouseChildren = !show_curtain;
        // this._mission_screen.visible = show_curtain;

        if (show_curtain) {
            this.on_click_start_curtain();
        }
    }

    private setup_end_curtain(cleared: boolean): void {
    }

    /*
		Prompt feed when celebrating about cleared puzzle
	*/
    private facebook_prompt_feed(): void {
        log.debug("TODO: facebook_prompt_feed");
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

    private go_to_strategy_guide(): void {
        log.debug("TODO: go_to_strategy_guide");
        // let req: URLRequest = new URLRequest;
        // req.url = "http://getsatisfaction.com/eternagame/topics/the_strategy_guide_to_solve_eterna_puzzles";
        //
        // this.navigateToURL(req, "Strategy Guide");
    }

    private set_show_menu(show_menu: boolean): void {
        log.debug("TODO: set_show_menu");
        // let m: GameObject = (<GameObject>Application.instance.get_application_gui("Menu"));
        // if (m) m.visible = show_menu;
    }

    private show_end_curtain(): void {
        this.set_show_menu(false);
        this.disable_tools(true);
        this._bubble_curtain.decay_sweep();
        for (let pose of this._poses) {
            pose.set_show_total_energy(false);
            pose.clear_explosion();
        }

        // this.removeObject(this._mission_cleared);
        // this._mission_cleared.alpha = 0;
        // this._mission_cleared.visible = true;
        // this.addObject(this._mission_cleared);
        // this._mission_cleared.set_youtube_video(this._yt_id);
        // this._mission_cleared.set_animator(new GameAnimatorFader(0, 1, 0.3, false));
        //
        // this._constraints_container.visible = false;
    }

    private hide_end_curtain(): void {
        for (let pose of this._poses) {
            pose.set_show_total_energy(true);
            pose.clear_explosion();
        }
        this._bubble_curtain.stop_sweep();
        // this._mission_cleared.set_animator(new GameAnimatorFader(1, 0, 0.3, true));
        this.disable_tools(false);
        this.set_show_menu(true);
    }

    private trigger_ending(): void {
        // let state_dict: Map<any, any> = new Map();
        // this._puzzle_events.process_events(state_dict);
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
    //     if (event.target == this._view_options_cmi) {
    //         Application.instance.get_application_gui("View options").open_view_options();
    //     } else if (event.target == this._view_solutions_cmi) {
    //         Application.instance.transit_game_mode(Eterna.GAMESTATE_DESIGN_BROWSER, [this._puzzle.get_node_id()]);
    //     } else if (event.target == this._submit_cmi) {
    //         this.submit_current_pose();
    //     } else if (event.target == this._spec_cmi) {
    //         this.show_spec();
    //     } else if (event.target == this._reset_cmi) {
    //         this.ask_retry();
    //     } else if (event.target == this._copy_cmi) {
    //         Application.instance.copy_to_clipboard(EPars.sequence_array_to_string(this._poses[0].get_sequence()), "Copied the current sequence to the clipboard");
    //     } else if (event.target == this._paste_cmi) {
    //         Application.instance.add_lock("PASTESEQUENCE");
    //         this._paste_field.set_hotkeys(KeyCode.KEY_NONE, "", KeyCode.KEY_ESC, "Esc");
    //         Application.instance.get_modal_container().addObject(this._paste_field);
    //     } else if (event.target == this._beam_cmi) {
    //         let _this: PoseEditMode = this;
    //         _this.transfer_to_puzzlemaker();
    //     }
    // }

    private readonly _puzzle: Puzzle;
    private readonly _initSeq: number[];
    private readonly _isReset: boolean;

    private _background: Background;

    private _toolbar: PoseEditToolbar;

    private _folder: Folder;	/// ViennaRNA folder
    /// Asynch folding
    private _op_queue: AsyncOp[] = [];
    private _pose_edit_by_target_cb: Function = null;
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
    private _target_pairs: any[] = [];
    private _target_conditions: any[] = [];
    private _target_oligo: any[] = [];
    private _oligo_mode: any[] = [];
    private _oligo_name: any[] = [];
    private _target_oligos: any[] = [];
    private _target_oligos_order: any[] = [];
    /// Lab related
    // private _submit_field: InputField;
    private _folder_button: GameButton;
    private _is_databrowser_mode: boolean;
    /// Modes
    private _is_frozen: boolean = false;
    // Nova-syle switches
    private _target_name: Text;

    private _hint_box: GamePanel;
    private _hint_text: Text;

    /// Palette
    /// Paste sequence widget
    // private _paste_field: InputField;
    /// constraints && scoring display
    private _constraints_container: ContainerObject;
    // private _constraint_boxes: ConstraintBox[];
    // private _constraint_shape_boxes: ConstraintBox[];
    // private _constraint_antishape_boxes: ConstraintBox[];
    private _unstable_index: number;
    private _constraints_offset: number;
    /// Spec related
    private _spec_box: SpecBox;
    private _docked_spec_box: SpecBox;
    /// Exit button
    private _exit_button: GameButton;
    /// Puzzle Event
    private _puzzle_events: PuzzleEvent;
    private _constraints_head: number = 0;
    private _constraints_foot: number = 0;
    private _constraints_top: number = 0;
    private _constraints_bottom: number = 0;
    private _bubble_curtain: BubbleSweep;
    /// Text indicating solution submission
    private _submitting_text: Text;
    /// UI highlight box
    private _ui_highlight: SpriteObject;
    /// Game Stamp
    // private _game_stamp: Texture;
    // Mission Screens
    private _mission_container: GameObject;
    // private _mission_cleared: MissionCleared;
    private _yt_id: string;
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
    private _rop_presets: any[] = [];
    private _is_pic_disabled: boolean = false;
    // Design browser hooks
    private _next_design_cb: () => void = null;
    private _prev_design_cb: () => void = null;
    private _is_playing: boolean = false;
    // Tutorial Script Extra Functionality
    private _show_mission_screen: boolean = true;
    private _override_show_constraints: boolean = true;
    private _ancestor_id: number;
}

class AsyncOp {
    public sn?: number;
    public fn: () => void;

    public constructor(sn: number | null, fn: () => void) {
        this.sn = sn;
        this.fn = fn;
    }
}




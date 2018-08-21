import * as log from "loglevel";
import {Point, Text} from "pixi.js";
import {Flashbang} from "../../../flashbang/core/Flashbang";
import {EPars} from "../../EPars";
import {Folder} from "../../folding/Folder";
import {FolderManager} from "../../folding/FolderManager";
import {Vienna} from "../../folding/Vienna";
import {Pose2D} from "../../pose2D/Pose2D";
import {PoseField} from "../../pose2D/PoseField";
import {PuzzleEditOp} from "../../pose2D/PuzzleEditOp";
import {ConstraintType} from "../../puzzle/Constraints";
import {ConstraintBox} from "../../ui/ConstraintBox";
import {GameButton} from "../../ui/GameButton";
import {GetPaletteTargetBaseType, NucleotidePalette, PaletteTargetType} from "../../ui/NucleotidePalette";
import {TextInputPanel} from "../../ui/TextInputPanel";
import {UndoBlock, UndoBlockParam} from "../../UndoBlock";
import {ExternalInterface} from "../../util/ExternalInterface";
import {GameMode} from "../GameMode";
import {PuzzleEditToolbar} from "./PuzzleEditToolbar";
import {StructureInput} from "./StructureInput";

type InteractionEvent = PIXI.interaction.InteractionEvent;

export class PuzzleEditMode extends GameMode {
    constructor(embedded: boolean, numTargets: number = -1) {
        super();
        this._embedded = embedded;
    }

    protected setup(): void {
        super.setup();

        this._folder = FolderManager.instance.get_folder(Vienna.NAME);

        let toolbar = new PuzzleEditToolbar(this._embedded);
        this.addObject(toolbar, this.modeSprite);

        toolbar.native_button.clicked.connect(() => this.set_to_native_mode());
        toolbar.target_button.clicked.connect(() => this.set_to_target_mode());
        toolbar.undo_button.clicked.connect(() => this.move_undo_stack_backward());
        toolbar.redo_button.clicked.connect(() => this.move_undo_stack_forward());

        toolbar.zoom_out_button.clicked.connect(() => {
            for (let poseField of this._pose_fields) {
                poseField.zoom_out();
            }
        });

        toolbar.zoom_in_button.clicked.connect(() => {
            for (let poseField of this._pose_fields) {
                poseField.zoom_in();
            }
        });

        toolbar.copy_button.clicked.connect(() => {
            //     Application.instance.copy_to_clipboard(EPars.sequence_array_to_string(this._poses[0].get_sequence()),
            //         "Copied the current sequence to the clipboard");
        });

        toolbar.view_options_button.clicked.connect(() => {
            // TODO
            // EternaViewOption(Application.instance.get_application_gui("View options")).open_view_options
        });

        toolbar.paste_button.clicked.connect(() => {
            // TODO
        });

        this.init_paste_field();

        toolbar.reset_button.clicked.connect(() => this.ask_retry());
        toolbar.submit_button.clicked.connect(() => this.on_submit_puzzle());

        // this._folder_button = new GameButton(22, BitmapManager.get_bitmap(BitmapManager.ShapeImg));
        // this._folder_button.set_text(this._folder.get_folder_name());
        // this._folder_button.set_click_callback(this.change_folder);
        // this._folder_button.scaleX = 0.5;
        // this._folder_button.scaleY = 0.5;
        // this._folder_button.set_tooltip("Select the folding engine.");
        // this._folder_button.set_pos(new UDim(0, 0, 17, 160));
        // this._folder_button.set_size(new UDim(0, 0, 111, 40));
        // this.add_object(this._folder_button);

        toolbar.palette.targetClicked.connect(type => this.onPaletteTargetSelected(type));
        toolbar.pair_swap_button.clicked.connect(() => this.on_click_P());

        // this._submitting_text = new GameText(Fonts.arial(20, true));
        // this._submitting_text.set_text("Submitting...");
        // this._submitting_text.set_pos(new UDim(0.5, 0.5, -(this._submitting_text.text_width() / 2), -(this._submitting_text.text_height() / 2)));
        //
        // this._addbase_button = new GameButton(22, BitmapManager.get_bitmap(BitmapManager.ImgAddBase));
        // this._addbase_button.set_states(BitmapManager.get_bitmap(BitmapManager.ImgAddBase),
        //     BitmapManager.get_bitmap(BitmapManager.ImgAddBaseOver),
        //     null,
        //     BitmapManager.get_bitmap(BitmapManager.ImgAddBaseSelect),
        //     null);
        // this._addbase_button.set_click_callback(this.on_click_addbase);
        // this._addbase_button.set_hotkey(KeyCode.KEY_6, false, "6");
        // this._addbase_button.set_tooltip("Add a single base.");
        // this.add_object(this._addbase_button);
        //
        // this._addpair_button = new GameButton(22, BitmapManager.get_bitmap(BitmapManager.ImgAddPair));
        // this._addpair_button.set_states(BitmapManager.get_bitmap(BitmapManager.ImgAddPair),
        //     BitmapManager.get_bitmap(BitmapManager.ImgAddPairOver),
        //     null,
        //     BitmapManager.get_bitmap(BitmapManager.ImgAddPairSelect),
        //     null);
        // this._addpair_button.set_click_callback(this.on_click_addpair);
        // this._addpair_button.set_hotkey(KeyCode.KEY_7, false, "7");
        // this._addpair_button.set_tooltip("Add a pair.");
        // this.add_object(this._addpair_button);
        //
        // this._delete_button = new GameButton(22, BitmapManager.get_bitmap(BitmapManager.ImgErase));
        // this._delete_button.set_states(BitmapManager.get_bitmap(BitmapManager.ImgErase),
        //     BitmapManager.get_bitmap(BitmapManager.ImgEraseOver),
        //     null,
        //     BitmapManager.get_bitmap(BitmapManager.ImgEraseSelect),
        //     null);
        // this._delete_button.set_click_callback(this.on_click_delete);
        // this._delete_button.set_hotkey(KeyCode.KEY_8, false, "8");
        // this._delete_button.set_tooltip("Delete a base or a pair.");
        // this.add_object(this._delete_button);
        //
        // this._site_button = new GameButton(22, BitmapManager.get_bitmap(BitmapManager.ImgMolecule));
        // this._site_button.set_states(BitmapManager.get_bitmap(BitmapManager.ImgMolecule),
        //     BitmapManager.get_bitmap(BitmapManager.ImgMoleculeOver),
        //     null,
        //     BitmapManager.get_bitmap(BitmapManager.ImgMoleculeSelect),
        //     null);
        // this._site_button.set_click_callback(this.on_click_binding_site);
        // // _site_button.set_hotkey(KeyCode.KEY_0,false, "0");
        // this._site_button.set_tooltip("Create or remove a molecular binding site.");
        // this.add_object(this._site_button);
        //
        // this._lock_button = new GameButton(22, BitmapManager.get_bitmap(BitmapManager.ImgLock));
        // this._lock_button.set_states(BitmapManager.get_bitmap(BitmapManager.ImgLock),
        //     BitmapManager.get_bitmap(BitmapManager.ImgLockOver),
        //     null,
        //     BitmapManager.get_bitmap(BitmapManager.ImgLockSelect),
        //     null);
        // this._lock_button.set_click_callback(this.on_click_lock);
        // this._lock_button.set_hotkey(KeyCode.KEY_9, false, "9");
        // this._lock_button.set_tooltip("Lock or unlock a base.");
        // this.add_object(this._lock_button);
        //
        if (this._embedded) {
            ExternalInterface.addCallback("get_secstruct", this.get_secstruct);
            ExternalInterface.addCallback("get_sequence", this.get_sequence);
            ExternalInterface.addCallback("get_locks", this.get_locks);
            ExternalInterface.addCallback("get_thumbnail", this.get_thumbnail);
            ExternalInterface.addCallback("get_shift_limit", this.get_shift_limit);
        }

        this.initialize(this._numTargets);
    }

    public get_cookie_token(): string {
        return this._cookie_token;
    }

    public set_cookie_token(num_targets: number): void {
        log.info("TODO: set_cookie_token");
        // this._cookie_token = "puzedit_" + num_targets + "_" + Application.instance.get_player_id();
    }

    public autoload_data(): any[] {
        return [];
        // let objs: any[] = AutosaveManager.instance.loadObjects(this.get_cookie_token());
        // return objs;
    }

    public autosave_data(e: Event): void {
        log.info("TODO: autosave_data");
        // let objs: any[] = [];
        // for (let ii: number = 0; ii < this._poses.length; ++ii) {
        //     let obj: any[] = [];
        //     let pose: Pose2D = this._poses[ii];
        //     obj['sequence'] = EPars.sequence_array_to_string(pose.get_sequence());
        //     obj['structure'] = EPars.pairs_array_to_parenthesis(pose.get_molecular_structure());
        //     objs.push(obj);
        // }
        // AutosaveManager.instance.saveObjects(objs, this.get_cookie_token());
    }

    public reset_autosave_data(): void {
        log.info("TODO: reset_autosave_data");
        // AutosaveManager.instance.saveObjects(null, this.get_cookie_token());
    }

    public set_folder(engine_name: string): void {
        let newFolder: Folder = FolderManager.instance.get_folder(engine_name);
        if (newFolder) {
            this._folder = newFolder;
        }
    }

    private initialize(num_targets: number = 1): void {
        log.info("TODO: initialize");
        // this._submit_field = new TextInputPanel;
        // this._submit_field.set_title("Publish your puzzle");
        // this._submit_field.add_field("Title", 200);
        // if (num_targets == 1) {
        //     this._submit_field.add_field("Min G-U pairs required", 200);
        //     this._submit_field.add_field("Max G-C pairs allowed", 200);
        //     this._submit_field.add_field("Min A-U pairs required", 200);
        // }
        // this._submit_field.add_field("Description", 200, true);
        // this._submit_field.set_callbacks(this.submit_puzzle, this.on_cancel_submit);
        // this._submit_field.set_pos(new UDim(0.5, 0.5, -150, -100));
        //
        this.clear_undo_stack();

        let pose_fields: PoseField[] = [];
        this._sec_ins = [];

        let set_cb = (kk: number): void  => {
            this._poses[kk].set_add_base_callback((parenthesis: string, op: PuzzleEditOp, index: number): void => {
                let secInput: StructureInput = this._sec_ins[kk];
                secInput.set_secstruct(parenthesis);
                secInput.set_pose(op, index);
                //Pose2D(_poses[kk]).base_shift(parenthesis, mode, index);
            });
        };

        let pose_edit_setter = (index: number, pose_to_set: Pose2D): void => {
            pose_to_set.set_pose_edit_callback(() => {
                this.pose_edit_by_target(index);
            });
        };

        let bind_mousedown_event = (pose: Pose2D, index: number): void => {
            pose.set_start_mousedown_callback((e: InteractionEvent, closest_dist: number, closest_index: number): void => {
                for (let ii: number = 0; ii < num_targets; ++ii) {
                    let pose_field: PoseField = pose_fields[ii];
                    let pose: Pose2D = pose_field.get_pose();
                    if (ii == index) {
                        pose.on_pose_mouse_down(e, closest_index);
                    } else {
                        pose.on_pose_mouse_down_propagate(e, closest_index);
                    }
                }
            });
        };

        this.set_cookie_token(num_targets);
        let states: any[] = this.autoload_data();
        for (let ii = 0; ii < num_targets; ii++) {
            let default_structure: string = ".....((((((((....)))))))).....";
            let default_pairs: number[] = EPars.parenthesis_to_pair_array(default_structure);
            let default_sequence: string = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

            if (states != null && states[ii] != null && states[ii]['sequence'] != null && states[ii]['structure'] != null && states[ii]['structure'] != "") {
                default_structure = states[ii]['structure'];
                default_sequence = states[ii]['sequence'];
                default_pairs = EPars.parenthesis_to_pair_array(default_structure);
            }
            let pose_field: PoseField = new PoseField(true);
            this.addObject(pose_field, this.poseLayer);
            let pose: Pose2D = pose_field.get_pose();
            pose.set_score_visualization(this._folder);
            pose.set_molecular_structure(default_pairs);
            pose.set_molecular_binding_bonus(-4.86);
            pose.set_sequence(EPars.string_to_sequence_array(default_sequence));
            pose_fields.push(pose_field);

            let sec_in: StructureInput = new StructureInput(pose);
            pose_field.addObject(sec_in, pose_field.container);
            if (!this._embedded) {
                sec_in.set_size(700 / num_targets, 50);
                sec_in.display.position = new Point(
                    (Flashbang.stageWidth - sec_in.get_panel_width()) * 0.5,
                    -127
                );
            } else {
                sec_in.set_size(500 / num_targets, 50);
                sec_in.display.position = new Point(
                    (Flashbang.stageWidth - sec_in.get_panel_width()) * 0.5,
                    -200
                );
            }

            sec_in.set_secstruct(default_structure);
            this._sec_ins.push(sec_in);

            let constraint_box = new ConstraintBox();
            constraint_box.display.position = new Point(17, 35);
            pose_field.addObject(constraint_box, pose_field.container);
            if (this._embedded) {
                constraint_box.display.visible = false;
            }

            this._constraint_boxes.push(constraint_box);
        }

        this.set_pose_fields(pose_fields);
        this.pose_edit_by_target(0);

        for (let ii = 0; ii < num_targets; ii++) {
            set_cb(ii);
            pose_edit_setter(ii, this._poses[ii]);

            if (this._embedded) {
                this._poses[ii].set_zoom_level(2, true, true);
            }

            bind_mousedown_event(this._poses[ii], ii);
        }

        this.set_to_target_mode();
        this.onPaletteTargetSelected(PaletteTargetType.A);
        this.set_pip(true);

        // this.update_children_objects(new Date().getTime(), true);
    }

    public get_secstruct(): string {
        return this._sec_ins[0].get_secstruct();
    }

    public get_sequence(): string {
        return EPars.sequence_array_to_string(this._poses[0].get_sequence());
    }

    public get_locks(): string {
        let locks: boolean[] = this.get_current_lock(0);
        let len: number = this._poses[0].get_sequence().length;
        let lock_string: string = "";
        for (let ii: number = 0; ii < len; ii++) {
            if (locks[ii]) {
                lock_string += "x";
            } else {
                lock_string += "o";
            }
        }

        return lock_string;
    }

    public get_shift_limit(): string {
        return "";
    }

    public get_thumbnail(): string {
        log.info("TODO: get_thumbnail");
        return null;
        // let timestamp: number = new Date().getTime();
        // let filename: string = "/sites/default/files/chat_screens/scr" +
        //     Application.instance.get_player_id() + "_" + new Date().getTime() + ".png";
        //
        // let urlname: string = filename;
        // filename = "/persistent/drupal/html" + filename;
        //
        // let img: BitmapData = PoseThumbnail.createFramedBitmap(this._poses[0].get_sequence(), this._poses[0].get_pairs(), 6, PoseThumbnail.THUMBNAIL_WHITE);
        // let imageBytes: ByteArray = PNGEncoder.encode(img);
        // let imageString: string = Base64.encodeByteArray(imageBytes);
        //
        // return imageString;
    }

    /*override*/
    public set_multi_engines(multi: boolean): void {
        log.info("TODO: set_multi_engines");
        // if (multi) {
        //     this._folder_button.set_text(this._folder.get_folder_name()); // set the actual one
        //     this.add_object(this._folder_button);
        // } else {
        //     this.remove_object(this._folder_button);
        // }
    }

    /*override*/
    protected on_enter(): void {
        // EternaViewOption(Application.instance.get_application_gui("View options")).set_advanced(1);
        // this.on_resize();
    }

    /*override*/
    protected on_resize(): void {
        this.layout_bars();
    }

    /*override*/
    protected get_screenshot(): ArrayBuffer {
        log.info("TODO: get_screenshot");
        return null;
        // let img_width: number = 0;
        // let img_height: number = 0;
        // let imgs: any[] = [];
        // let img: BitmapData;
        //
        // for (let field of this._pose_fields) {
        //     img = field.get_pose().get_canvas();
        //     img_width += img.width;
        //     img_height = Math.max(img_height, img.height);
        //     imgs.push(img);
        // }
        //
        // let bd: BitmapData = new BitmapData(img_width, img_height, false, 0x061A34);
        //
        // let hub: GameText = new GameText(Fonts.arial(12, false));
        // hub.set_pos(new UDim(1, 0, 3, -3));
        // hub.set_text("Player: " + Application.instance.get_player_name() + "\n" + "Player Puzzle Designer");
        //
        // img_width = 0;
        //
        // for (let ii: number = 0; ii < this._poses.length; ii++) {
        //     img = imgs[ii];
        //     let trans_mat: Matrix = new Matrix();
        //     trans_mat.translate(img_width, 0);
        //     bd.draw(img, trans_mat);
        //     img_width += img.width;
        //
        // }
        // bd.draw(hub);
        //
        // return bd;
    }

    private init_paste_field(): void {
        log.info("TODO: init_paste_field");
        // this._paste_field = new TextInputPanel;
        // this._paste_field.add_field("Sequence", 200);
        // this._paste_field.set_title("Write down a sequence");
        // this._paste_field.set_callbacks(
        //     function (dic: Map<any, any>): void {
        //         let sequence: string = dic["Sequence"];
        //         let char: string = "";
        //         let ii: number;
        //
        //         for (ii = 0; ii < sequence.length; ii++) {
        //             char = sequence.substr(ii, 1);
        //             if (char != "A" && char != "U" && char != "G" && char != "C") {
        //                 Application.instance.setup_msg_box("You can only use characters A,U,G and C");
        //                 return;
        //             }
        //         }
        //
        //         for (ii = 0; ii < this._poses.length; ii++) {
        //             this._poses[ii].paste_sequence(EPars.string_to_sequence_array(sequence));
        //         }
        //
        //         this._paste_field.clear_fields();
        //         Application.instance.remove_lock("PASTESEQUENCE");
        //         Application.instance.get_modal_container().remove_object(this._paste_field);
        //     },
        //     function (): void {
        //         this._paste_field.clear_fields();
        //         Application.instance.remove_lock("PASTESEQUENCE");
        //         Application.instance.get_modal_container().remove_object(this._paste_field);
        //     }
        // );
        // this._paste_field.set_pos(new UDim(0.5, 0.5, -150, -100));
    }

    private ask_retry(): void {
        log.info("TODO: ask_retry");
        // Application.instance.setup_yesno("Do you really want to reset?", this.retry, null);
    }

    private retry(): void {
        for (let pose of this._poses) {
            let sequence = pose.get_sequence();
            for (let ii: number = 0; ii < sequence.length; ii++) {
                if (!pose.is_locked(ii)) {
                    sequence[ii] = EPars.RNABASE_ADENINE;
                }
            }

            pose.set_puzzle_locks(null);
            pose.set_sequence(sequence);
            pose.set_molecular_binding_site(null);
        }
        this.pose_edit_by_target(0);
    }

    private on_submit_puzzle(): void {
        log.info("TODO: on_submit_puzzle");
        // let first_secstruct: string = this._sec_ins[0].get_secstruct();
        //
        // for (let ii: number = 0; ii < this._poses.length; ii++) {
        //     let secstruct: string = this._sec_ins[ii].get_secstruct();
        //
        //     let length_limit: number = 400;
        //     if (Eterna.is_dev_mode) {
        //         length_limit = -1;
        //     }
        //
        //     let error: string = EPars.validate_parenthesis(secstruct, false, length_limit);
        //
        //     if (error != null) {
        //         Application.instance.setup_msg_box(error);
        //         return;
        //     }
        //
        //     if (secstruct.length != first_secstruct.length) {
        //         Application.instance.setup_msg_box("Structure lengths don't match");
        //         return;
        //     }
        //
        //     if (!EPars.are_pairs_same(this.get_current_target_pairs(ii), this.get_current_undo_block(ii).get_pairs(EPars.DEFAULT_TEMPERATURE)) && !Eterna.is_dev_mode) {
        //         Application.instance.setup_msg_box("You should first solve your puzzle before submitting it!");
        //         return;
        //     }
        //
        //     if (this._poses[ii].check_overlap() && !Eterna.is_dev_mode) {
        //         Application.instance.setup_msg_box("Some bases overlapped too much!");
        //         return;
        //     }
        // }
        //
        // Application.instance.setup_yesno("You can only submit 3 puzzles per 24 hours.\nAre you sure you want to submit?", this.show_submit_field, null);
    }

    private show_submit_field(): void {
        log.info("TODO: show_submit_field");
        // Application.instance.add_lock("LOCK_SUBMIT");
        // Application.instance.get_modal_container().add_object(this._submit_field);
        // Application.instance.get_modal_container().setChildIndex(this._submit_field, 0);
    }

    private on_cancel_submit(): void {
        log.info("TODO: on_cancel_submit");
        // Application.instance.get_modal_container().remove_object(this._submit_field);
        // Application.instance.remove_lock("LOCK_SUBMIT");
    }

    private submit_puzzle(dict: Map<any, any>): void {
        log.info("TODO: submit_puzzle");
        // let app: Application;
        //
        // if (dict["Title"] == null || dict["Title"].length == 0) {
        //     this._submit_field.visible = false;
        //     app = Application.instance;
        //     app.setup_msg_box("You must enter a title for your puzzle", false, "Ok", function (): void {
        //         app.close_msg_box();
        //         this._submit_field.visible = true;
        //     });
        //     return;
        // }
        //
        // if (dict["Description"] == null || dict["Description"].length == 0) {
        //     this._submit_field.visible = false;
        //     app = Application.instance;
        //     app.setup_msg_box("You must write a description of your puzzle", false, "Ok", function (): void {
        //         app.close_msg_box();
        //         this._submit_field.visible = true;
        //     });
        //     return;
        // }
        //
        // let constraints: string = "";
        // for (let ii = 0; ii < this._poses.length; ii++) {
        //     if (ii > 0) {
        //         constraints += ",";
        //     }
        //     constraints += "SHAPE," + ii;
        // }
        //
        // let len: number = this._poses[0].get_sequence().length;
        //
        // let locks = this.get_current_lock(0);
        // let lock_string: string = "";
        // for (let ii = 0; ii < len; ii++) {
        //     if (locks[ii]) {
        //         lock_string += "x";
        //     } else {
        //         lock_string += "o";
        //     }
        // }
        //
        // let sequence: string = EPars.sequence_array_to_string(this._poses[0].get_sequence());
        // let beginning_sequence: string = "";
        // for (let ii = 0; ii < len; ii++) {
        //     if (locks[ii]) {
        //         beginning_sequence += sequence.substr(ii, 1);
        //     } else {
        //         beginning_sequence += "A";
        //     }
        // }
        //
        // let secstruct: string = EPars.pairs_array_to_parenthesis(this.get_current_target_pairs(0));
        // let imgdata: BitmapData = PoseThumbnail.createFramedBitmap(this._poses[0].get_sequence(), this._poses[0].get_pairs(), 4, PoseThumbnail.THUMBNAIL_WHITE);
        // let mid_imageBytes: ByteArray = PNGEncoder.encode(imgdata);
        // let mid_image_string: string = Base64.encodeByteArray(mid_imageBytes);
        //
        // imgdata = PoseThumbnail.createFramedBitmap(this._poses[0].get_sequence(), this._poses[0].get_pairs(), 2, PoseThumbnail.THUMBNAIL_WHITE);
        // let big_imageBytes: ByteArray = PNGEncoder.encode(imgdata);
        // let big_image_string: string = Base64.encodeByteArray(big_imageBytes);
        //
        // if (this._poses.length == 1) {
        //     let undoblock: UndoBlock = this.get_current_undo_block(0);
        //     let num_AU: number = undoblock.get_param(UndoBlock.PARAM_AU, EPars.DEFAULT_TEMPERATURE);
        //     let num_GU: number = undoblock.get_param(UndoBlock.PARAM_GU, EPars.DEFAULT_TEMPERATURE);
        //     let num_GC: number = undoblock.get_param(UndoBlock.PARAM_GC, EPars.DEFAULT_TEMPERATURE);
        //
        //     let num_gus: string = dict["Min G-U pairs required"];
        //     let num_gcs: string = dict["Max G-C pairs allowed"];
        //     let num_aus: string = dict["Min A-U pairs required"];
        //
        //     let num_pairs: number = EPars.num_pairs(this.get_current_target_pairs(0));
        //
        //     if (num_gus != null && num_gus.length > 0) {
        //         let gus: number = Number(num_gus);
        //         let max_GU: number = (num_AU + num_GU + num_GC) / 3;
        //
        //         if (gus < 0 || gus > num_GU || gus > max_GU) {
        //             this._submit_field.visible = false;
        //             app = Application.instance;
        //             app.setup_msg_box("Number of G-U pairs should be either blank or\nan integer between 0 and " + num_GU + " (number of GUs in your current solution)" +
        //                 " and at most " + max_GU + " (a third of total number of pairs)", false, "Ok", function (): void {
        //                 app.close_msg_box();
        //                 this._submit_field.visible = true;
        //             });
        //             return;
        //         }
        //
        //         if (gus > 0) {
        //             constraints += ",GU," + gus.toString();
        //         }
        //     }
        //
        //     if (num_gcs != null && num_gcs.length > 0) {
        //         let gcs: number = Number(num_gcs);
        //
        //         if (gcs < num_GC) {
        //             this._submit_field.visible = false;
        //             app = Application.instance;
        //             app.setup_msg_box("Number of G-C pairs should be either blank or\nat least " + num_GC + " (number GCs in your current solution)", false, "Ok", function (): void {
        //                 app.close_msg_box();
        //                 this._submit_field.visible = true;
        //             });
        //             return;
        //         }
        //
        //         if (gcs <= num_pairs) {
        //             constraints += ",GC," + gcs.toString();
        //         }
        //     }
        //
        //     if (num_aus != null && num_aus.length > 0) {
        //         let aus: number = Number(num_aus);
        //
        //         if (aus < 0 || aus > num_AU) {
        //             this._submit_field.visible = false;
        //             app = Application.instance;
        //             app.setup_msg_box("Number of A-U pairs should be either blank or\nan integer between 0 and " + num_AU + " (number of AUs in your current solution)", false, "Ok", function (): void {
        //                 app.close_msg_box();
        //                 this._submit_field.visible = true;
        //             });
        //             return;
        //         }
        //
        //         if (aus > 0) {
        //             constraints += ",AU," + aus.toString();
        //         }
        //     }
        // }
        //
        // let objectives: any[] = [];
        // for (let ii = 0; ii < this._poses.length; ii++) {
        //     let objective: Object = {};
        //     let binding_site: any[] = this.get_current_binding_site(ii);
        //     let binding_bases: any[] = [];
        //     for (let bb: number = 0; bb < binding_site.length; bb++) {
        //         if (binding_site[bb]) {
        //             binding_bases.push(bb);
        //         }
        //     }
        //
        //     objective['secstruct'] = this._sec_ins[ii].get_secstruct();
        //
        //     if (binding_bases.length > 0) {
        //         objective['type'] = "aptamer";
        //         objective['site'] = binding_bases;
        //         objective['concentration'] = 10000;
        //         objective['fold_version'] = 2.0;
        //     } else {
        //         objective['type'] = "single";
        //     }
        //
        //     objectives.push(objective);
        //
        // }
        // // trace(com.adobe.serialization.json.JSON.encode(objectives));
        //
        // let post_params: Object = {};
        //
        // post_params["folder"] = this._folder.get_folder_name();
        // let params_title: string;
        // if (this._folder.get_folder_name() == Vienna2.NAME) {
        //     params_title = "[VRNA_2]";
        // } else if (this._folder.get_folder_name() == NuPACK.NAME) {
        //     params_title = "[NuPACK]";
        // } else {
        //     params_title = "";
        // }
        // if (this._poses.length > 1) {
        //     params_title += "[switch2.5][" + this._poses.length + " states] " + dict["Title"];
        // } else {
        //     params_title += dict["Title"];
        // }
        // post_params["title"] = params_title;
        // post_params["secstruct"] = secstruct;
        // post_params["constraints"] = constraints;
        // post_params["body"] = dict["Description"];
        // post_params["midimgdata"] = mid_image_string;
        // post_params["bigimgdata"] = big_image_string;
        // post_params["lock"] = lock_string;
        // post_params["begin_sequence"] = beginning_sequence;
        // post_params["objectives"] = this.com.adobe.serialization.json.JSON.encode(objectives);
        //
        // Application.instance.get_modal_container().remove_object(this._submit_field);
        // this._submitting_text.set_animator(new GameAnimatorFader(1, 0, 0.3, false, true));
        // Application.instance.get_modal_container().add_object(this._submitting_text);
        //
        // Eterna.client.submit_puzzle(post_params, function (datastring: string): void {
        //     let data: any = this.com.adobe.serialization.json.JSON.decode(datastring);
        //     data = data['data'];
        //     Application.instance.remove_lock("LOCK_SUBMIT");
        //     Application.instance.get_modal_container().remove_object(this._submitting_text);
        //     this._submitting_text.set_animator(null);
        //
        //     if (data['success']) {
        //         Application.instance.setup_msg_box("Your puzzle has been successfully published.\nIt will show up in player puzzle pages within 5 minutes.");
        //     } else {
        //         Application.instance.setup_msg_box("Puzzle submission failed : " + data['error']);
        //     }
        // });
    }

    private set_to_native_mode(): void {
        log.info("TODO: set_to_native_mode");
        // this._target_button.set_selected(false);
        // this._native_button.set_selected(true);
        //
        // this._target_button.set_hotkey(KeyCode.KEY_SPACE, false, "space");
        // this._native_button.set_hotkey(KeyCode.KEY_NONE, false, "");
        //
        // this._paused = false;
        // this.update_score();
    }

    private set_to_target_mode(): void {
        log.info("TODO: set_to_target_mode");
        // this._target_button.set_selected(true);
        // this._native_button.set_selected(false);
        //
        // this._native_button.set_hotkey(KeyCode.KEY_SPACE, false, "space");
        // this._target_button.set_hotkey(KeyCode.KEY_NONE, false, "");
        //
        // for (let ii: number = 0; ii < this._poses.length; ii++) {
        //     this._poses[ii].set_pairs(EPars.parenthesis_to_pair_array(this._sec_ins[ii].get_secstruct()));
        // }
        // this._paused = true;
        //
        // this.update_score();
    }

    private on_change_folder(): void {
        this.clear_undo_stack();
        this.pose_edit_by_target(0);
        for (let pose of this._poses) {
            pose.set_display_score_texts(pose.is_displaying_score_texts());
        }
    }

    private change_folder(): void {
        log.info("TODO: change_folder");
        // let curr_f: string = this._folder.get_folder_name();
        // this._folder = FolderManager.instance.get_next_folder(curr_f, (): boolean => false);
        // if (this._folder.get_folder_name() == curr_f) {
        //     return;
        // }
        //
        // this._folder_button.set_text(this._folder.get_folder_name());
        //
        // for (let pose of this._poses) {
        //     pose.set_score_visualization(this._folder);
        // }
        //
        // this.on_change_folder();
    }

    private clear_undo_stack(): void {
        this._stack_level = -1;
        this._stack_size = 0;
        this._seq_stack = [];
        this._target_pairs_stack = [];
        this._lock_stack = [];
        this._binding_site_stack = [];
    }

    private get_current_undo_block(index: number): UndoBlock {
        return this._seq_stack[this._stack_level][index];
    }

    private get_current_target_pairs(index: number): number[] {
        return this._target_pairs_stack[this._stack_level][index];
    }

    private get_current_lock(index: number): boolean[] {
        return this._lock_stack[this._stack_level][index];
    }

    private get_current_binding_site(index: number): boolean[] {
        return this._binding_site_stack[this._stack_level][index];
    }

    private move_undo_stack_forward(): void {
        if (this._stack_level + 1 > this._stack_size - 1) {
            return;
        }

        this._stack_level++;

        for (let ii: number = 0; ii < this._poses.length; ii++) {
            this._poses[ii].set_sequence(this._seq_stack[this._stack_level][ii].get_sequence());
            this._poses[ii].set_puzzle_locks(this._lock_stack[this._stack_level][ii]);
            this._poses[ii].set_molecular_structure(this._target_pairs_stack[this._stack_level][ii]);
            this._poses[ii].set_molecular_binding_site(this._binding_site_stack[this._stack_level][ii]);
            let target_string: string = EPars.pairs_array_to_parenthesis(this._target_pairs_stack[this._stack_level][ii]);
            this._sec_ins[ii].set_secstruct(target_string);
        }

        this.update_score();
    }

    private move_undo_stack_backward(): void {
        if (this._stack_level < 1) {
            return;
        }

        this._stack_level--;
        for (let ii: number = 0; ii < this._poses.length; ii++) {
            this._poses[ii].set_sequence(this._seq_stack[this._stack_level][ii].get_sequence());
            this._poses[ii].set_puzzle_locks(this._lock_stack[this._stack_level][ii]);
            this._poses[ii].set_molecular_structure(this._target_pairs_stack[this._stack_level][ii]);
            this._poses[ii].set_molecular_binding_site(this._binding_site_stack[this._stack_level][ii]);
            let target_string: string = EPars.pairs_array_to_parenthesis(this._target_pairs_stack[this._stack_level][ii]);
            this._sec_ins[ii].set_secstruct(target_string);
        }
        this.update_score();
    }

    private update_score(): void {
        this.autosave_data(null);

        for (let ii: number = 0; ii < this._poses.length; ii++) {
            let undoblock: UndoBlock = this.get_current_undo_block(ii);
            let target_pairs = this.get_current_target_pairs(ii);
            let best_pairs = undoblock.get_pairs(EPars.DEFAULT_TEMPERATURE);
            let sequence = this._poses[ii].get_sequence();
            if (sequence.length != target_pairs.length) {
                throw new Error("sequence and design pairs lengths don't match");
            }

            if (this._paused) {
                this._poses[ii].set_pairs(target_pairs);
            } else {
                this._poses[ii].set_pairs(best_pairs);
            }

            this._constraint_boxes[ii].set_content(ConstraintType.SHAPE, {
                target: target_pairs,
                native: best_pairs
            }, EPars.are_pairs_same(best_pairs, target_pairs), 0);
            this._constraint_boxes[ii].display.scale.x = 1;
            this._constraint_boxes[ii].display.scale.y = 1;
        }

        let undoblock: UndoBlock = this.get_current_undo_block(this._poses.length - 1);
        let num_AU: number = undoblock.get_param(UndoBlockParam.AU);
        let num_GU: number = undoblock.get_param(UndoBlockParam.GU);
        let num_GC: number = undoblock.get_param(UndoBlockParam.GC);

        this._palette.set_pair_counts(num_AU, num_GU, num_GC);
    }

    private layout_bars(): void {
        log.info("TODO: layout_bars");
        // // Adjust positions of NOVA-Port UI
        // let right_x_idx: number = 0;
        // let left_x_idx: number = 0;
        //
        // if (this._palette) {
        //     this._palette.set_pos(new UDim(0.5, 1, -this._palette.width / 2, -21 - this._palette.height));
        //     right_x_idx = this._palette.width / 2;
        //     left_x_idx = this._palette.width / -2;
        // }
        //
        // if (this._pair_swap_button && this.contains(this._pair_swap_button)) {
        //     this._pair_swap_button.set_pos(new UDim(0.5, 1, right_x_idx + 4, -21 - this._pair_swap_button.height));
        //     right_x_idx += (4 + this._pair_swap_button.width);
        // }
        //
        // right_x_idx += 20;
        // if (this._undo_button && this.contains(this._undo_button)) {
        //     this._undo_button.set_pos(new UDim(0.5, 1, right_x_idx + 4, -21 - this._undo_button.height));
        //     right_x_idx += (4 + this._undo_button.width);
        // }
        // if (this._redo_button && this.contains(this._redo_button)) {
        //     this._redo_button.set_pos(new UDim(0.5, 1, right_x_idx + 1, -21 - this._redo_button.height));
        //     right_x_idx += (1 + this._redo_button.width);
        // }
        //
        // if (this._copy_button && this.contains(this._copy_button)) {
        //     this._copy_button.set_pos(new UDim(0.5, 1, right_x_idx + 4, -21 - this._copy_button.height));
        //     right_x_idx += (4 + this._copy_button.width);
        // }
        //
        // if (this._paste_button && this.contains(this._paste_button)) {
        //     this._paste_button.set_pos(new UDim(0.5, 1, right_x_idx + 4, -21 - this._paste_button.height));
        //     right_x_idx += (4 + this._paste_button.width);
        // }
        //
        // if (this._reset_button && this.contains(this._reset_button)) {
        //     this._reset_button.set_pos(new UDim(0.5, 1, right_x_idx + 4, -21 - this._reset_button.height));
        //     right_x_idx += (4 + this._reset_button.width);
        // }
        //
        // if (this._submit_button && this.contains(this._submit_button)) {
        //     this._submit_button.set_pos(new UDim(0.5, 1, right_x_idx + 4, -21 - this._submit_button.height));
        //     right_x_idx += (4 + this._submit_button.width);
        // }
        //
        // left_x_idx -= 20;
        // if (this._target_button) {
        //     this._target_button.set_pos(new UDim(0.5, 1, left_x_idx - 4 - this._target_button.width, -21 - this._target_button.height));
        //     left_x_idx -= (4 + this._target_button.width);
        // }
        // if (this._native_button) {
        //     this._native_button.set_pos(new UDim(0.5, 1, left_x_idx - 1 - this._native_button.width, -21 - this._native_button.height));
        //     left_x_idx -= (1 + this._native_button.width);
        // }
        //
        // if (this._zoom_out_button && this.contains(this._zoom_out_button)) {
        //     this._zoom_out_button.set_pos(new UDim(0.5, 1, left_x_idx - 4 - this._zoom_out_button.width, -21 - this._zoom_out_button.height));
        //     left_x_idx -= (4 + this._zoom_out_button.width);
        // }
        // if (this._zoom_in_button && this.contains(this._zoom_in_button)) {
        //     this._zoom_in_button.set_pos(new UDim(0.5, 1, left_x_idx - 1 - this._zoom_in_button.width, -21 - this._zoom_in_button.height));
        //     left_x_idx -= (1 + this._zoom_in_button.width);
        // }
        //
        // if (this._view_options_button && this.contains(this._view_options_button)) {
        //     this._view_options_button.set_pos(new UDim(0.5, 1, left_x_idx - 4 - this._view_options_button.width, -21 - this._view_options_button.height));
        //     left_x_idx -= (4 + this._view_options_button.width);
        // }
        //
        // if (this._pic_button && this.contains(this._pic_button)) {
        //     this._pic_button.set_pos(new UDim(0.5, 1, left_x_idx - 4 - this._pic_button.width, -21 - this._pic_button.height));
        //     left_x_idx -= (4 + this._pic_button.width);
        // }
        //
        // // editing tools
        // if (this._delete_button) {
        //     this._delete_button.set_pos(new UDim(0.75, 1, -this._delete_button.width / 2, -132 - this._delete_button.height));
        //     right_x_idx = this._delete_button.width / 2;
        //     left_x_idx = this._delete_button.width / -2;
        // }
        //
        // if (this._lock_button && this.contains(this._lock_button)) {
        //     this._lock_button.set_pos(new UDim(0.75, 1, right_x_idx + 4, -132 - this._lock_button.height));
        //     right_x_idx += (4 + this._lock_button.width);
        // }
        //
        // if (this._site_button && this.contains(this._site_button)) {
        //     this._site_button.set_pos(new UDim(0.75, 1, right_x_idx + 4, -132 - this._site_button.height));
        //     right_x_idx += (4 + this._site_button.width);
        // }
        //
        // if (this._addpair_button) {
        //     this._addpair_button.set_pos(new UDim(0.75, 1, left_x_idx - 4 - this._addpair_button.width, -132 - this._addpair_button.height));
        //     left_x_idx -= (4 + this._addpair_button.width);
        // }
        //
        // if (this._addbase_button) {
        //     this._addbase_button.set_pos(new UDim(0.75, 1, left_x_idx - 4 - this._addbase_button.width, -132 - this._addbase_button.height));
        //     left_x_idx -= (4 + this._addbase_button.width);
        // }
    }

    private deselect_all_colorings(): void {
        log.info("TODO: deselect_all_colorings");
        // this._palette.clear_selection();
        // this._pair_swap_button.set_selected(false);
        // this._addbase_button.set_selected(false);
        // this._addpair_button.set_selected(false);
        // this._delete_button.set_selected(false);
        // this._lock_button.set_selected(false);
        // this._site_button.set_selected(false);
    }

    private onPaletteTargetSelected(type: PaletteTargetType): void {
        let baseType: number = GetPaletteTargetBaseType(type);
        for (let pose of this._poses) {
            pose.set_current_color(baseType);
        }
        this.deselect_all_colorings();
    }

    private on_click_P(): void {
        for (let ii: number = 0; ii < this._poses.length; ii++) {
            this._poses[ii].set_current_color(EPars.RNABASE_PAIR);
        }

        this.deselect_all_colorings();
        // this._pair_swap_button.set_selected(true);
    }

    private on_click_addbase(): void {
        for (let ii: number = 0; ii < this._poses.length; ii++) {
            this._poses[ii].set_current_color(EPars.RNABASE_ADD_BASE);
        }

        this.deselect_all_colorings();
        // this._addbase_button.set_selected(true);
    }

    private on_click_addpair(): void {
        for (let ii: number = 0; ii < this._poses.length; ii++) {
            this._poses[ii].set_current_color(EPars.RNABASE_ADD_PAIR);
        }

        this.deselect_all_colorings();
        // this._addpair_button.set_selected(true);
    }

    private on_click_delete(): void {
        for (let ii: number = 0; ii < this._poses.length; ii++) {
            this._poses[ii].set_current_color(EPars.RNABASE_DELETE);
        }

        this.deselect_all_colorings();
        // this._delete_button.set_selected(true);
    }

    private on_click_lock(): void {
        for (let ii: number = 0; ii < this._poses.length; ii++) {
            this._poses[ii].set_current_color(EPars.RNABASE_LOCK);
        }

        this.deselect_all_colorings();
        // this._lock_button.set_selected(true);
    }

    private on_click_binding_site(): void {
        for (let ii: number = 0; ii < this._poses.length; ii++) {
            this._poses[ii].set_current_color(EPars.RNABASE_BINDING_SITE);
        }

        this.deselect_all_colorings();
        // this._site_button.set_selected(true);
    }

    private on_click_AU(): void {
        for (let ii: number = 0; ii < this._poses.length; ii++) {
            this._poses[ii].set_current_color(EPars.RNABASE_AU_PAIR);
        }

        this.deselect_all_colorings();
    }

    private on_click_GC(): void {
        for (let ii: number = 0; ii < this._poses.length; ii++) {
            this._poses[ii].set_current_color(EPars.RNABASE_GC_PAIR);
        }

        this.deselect_all_colorings();
    }

    private on_click_GU(): void {
        for (let ii: number = 0; ii < this._poses.length; ii++) {
            this._poses[ii].set_current_color(EPars.RNABASE_GU_PAIR);
        }

        this.deselect_all_colorings();
    }

    private pose_edit_by_target(index: number): void {
        let no_change: boolean = true;
        let current_undo_blocks: UndoBlock[] = [];
        let current_target_pairs: number[][] = [];
        let current_lock: boolean[][] = [];
        let current_binding_sites: boolean[][] = [];

        let force_sequence = this._poses[index].get_sequence();
        let force_lock = this._poses[index].get_puzzle_locks();

        let different_structures: boolean = false;
        for (let ii = 0; ii < this._poses.length; ii++) {
            if (ii != index) {
                if (this._poses[ii].get_sequence().length == force_sequence.length) {
                    this._poses[ii].set_sequence(force_sequence);
                    this._poses[ii].set_puzzle_locks(force_lock);
                } else {
                    different_structures = true;
                }
            }
        }

        if (different_structures) {
            let lengths: string = "[";
            for (let ii = 0; ii < this._poses.length; ii++) {
                if (ii > 0) {
                    lengths += ",";
                }
                lengths += this._poses[ii].get_sequence().length.toString();
            }
            lengths += "]";

            for (let ii = 0; ii < this._poses.length; ii++) {
                this._sec_ins[ii].set_warning("Structure lengths don't match " + lengths + ".\nSequences won't be synced.");
            }
        } else {
            for (let ii = 0; ii < this._poses.length; ii++) {
                this._sec_ins[ii].set_warning("");
            }
        }

        for (let ii = 0; ii < this._poses.length; ii++) {
            let last_best_pairs: number[] = null;

            let target_pairs: number[] = EPars.parenthesis_to_pair_array(this._sec_ins[ii].get_secstruct());
            let seq = this._poses[ii].get_sequence();
            let lock = this._poses[ii].get_puzzle_locks();
            let binding_site = this._poses[ii].get_molecular_binding_site();

            if (this._stack_level >= 0) {
                last_best_pairs = this._seq_stack[this._stack_level][ii].get_pairs(EPars.DEFAULT_TEMPERATURE);

                if (this._sec_ins[ii].get_secstruct() != EPars.pairs_array_to_parenthesis(this._target_pairs_stack[this._stack_level][ii])) {
                    no_change = false;
                }
                if (EPars.sequence_array_to_string(seq) != EPars.sequence_array_to_string(this._seq_stack[this._stack_level][ii].get_sequence())) {
                    no_change = false;
                }

                let last_lock: boolean[] = this._lock_stack[this._stack_level][ii];
                if (last_lock.length != lock.length) {
                    no_change = false;
                } else {
                    for (let ll = 0; ll < lock.length; ll++) {
                        if (lock[ll] != last_lock[ll]) {
                            no_change = false;
                            break;
                        }
                    }
                }

                let last_binding_site: boolean[] = this._binding_site_stack[this._stack_level][ii];
                if (last_binding_site == null && binding_site != null) {
                    no_change = false;
                } else if (last_binding_site != null && binding_site == null) {
                    no_change = false;
                } else if (last_binding_site != null && binding_site != null) {

                    if (last_binding_site.length != binding_site.length) {
                        no_change = false;
                    } else {
                        for (let ll = 0; ll < binding_site.length; ll++) {
                            if (binding_site[ll] != last_binding_site[ll]) {
                                no_change = false;
                                break;
                            }
                        }
                    }
                }
            }

            let is_there_molecule: boolean = false;
            if (binding_site != null) {
                for (let bb = 0; bb < binding_site.length; bb++) {
                    if (binding_site[bb]) {
                        is_there_molecule = true;
                    }
                }
            }

            let best_pairs: number[];
            if (!is_there_molecule) {
                best_pairs = this._folder.fold_sequence(seq, null, null, EPars.DEFAULT_TEMPERATURE);
            } else {
                let bonus: number = -486;
                let site: number[] = [];
                for (let bb = 0; bb < binding_site.length; bb++) {
                    if (binding_site[bb]) {
                        site.push(bb);
                    }
                }

                best_pairs = this._folder.fold_sequence_with_binding_site(seq, target_pairs, site, Number(bonus), 2.0);
            }

            let undo_block: UndoBlock = new UndoBlock(seq);
            undo_block.set_pairs(best_pairs);
            undo_block.set_basics(this._folder);
            current_undo_blocks.push(undo_block);
            current_lock.push(lock);
            current_binding_sites.push(binding_site);
            current_target_pairs.push(target_pairs);
        }
        if (no_change && this._stack_level >= 0) {
            return;
        }

        /// Pushing undo block
        this._stack_level++;
        this._seq_stack[this._stack_level] = current_undo_blocks;
        this._target_pairs_stack[this._stack_level] = current_target_pairs;
        this._lock_stack[this._stack_level] = current_lock;
        this._binding_site_stack[this._stack_level] = current_binding_sites;
        this._stack_size = this._stack_level + 1;

        let num_locks: number[] = [];
        for (let ii = 0; ii < current_lock.length; ii++) {
            let lock_count: number = 0;
            for (let jj: number = 0; jj < current_lock[ii].length; jj++) {
                if (current_lock[ii][jj]) {
                    lock_count++;
                }
            }
            num_locks.push(lock_count);
        }

        this.update_score();
    }

    private readonly _embedded: boolean;
    private readonly _numTargets: number;

    private _paste_button: GameButton;
    private _submit_field: TextInputPanel;
    private _sec_ins: StructureInput[];
    private _folder: Folder;
    private _submitting_text: Text;
    private _seq_stack: UndoBlock[][];
    private _target_pairs_stack: number[][][];
    private _lock_stack: boolean[][][];
    private _binding_site_stack: boolean[][][];
    private _stack_level: number;
    private _stack_size: number;
    private _paused: boolean;
    /// Modes
    private _native_button: GameButton;
    private _target_button: GameButton;
    /// Palette
    private _palette: NucleotidePalette;
    private _pair_swap_button: GameButton;
    ///
    private _undo_button: GameButton;
    private _redo_button: GameButton;
    private _zoom_in_button: GameButton;
    private _zoom_out_button: GameButton;
    private _copy_button: GameButton;
    private _view_options_button: GameButton;
    private _reset_button: GameButton;
    private _submit_button: GameButton;
    private _folder_button: GameButton;
    private _paste_field: TextInputPanel;
    /// Edit tools
    private _addbase_button: GameButton;
    private _addpair_button: GameButton;
    private _delete_button: GameButton;
    private _lock_button: GameButton;
    private _site_button: GameButton;
    private _constraint_boxes: ConstraintBox[] = [];
    private _cookie_token: string;

}

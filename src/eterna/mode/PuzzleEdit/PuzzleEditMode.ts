import {DisplayObject, Point} from "pixi.js";
import {HAlign, VAlign} from "../../../flashbang/core/Align";
import {KeyCode} from "../../../flashbang/input/KeyCode";
import {Base64} from "../../../flashbang/util/Base64";
import {DisplayUtil} from "../../../flashbang/util/DisplayUtil";
import {EPars} from "../../EPars";
import {Eterna} from "../../Eterna";
import {Folder} from "../../folding/Folder";
import {FolderManager} from "../../folding/FolderManager";
import {NuPACK} from "../../folding/NuPACK";
import {Vienna} from "../../folding/Vienna";
import {Vienna2} from "../../folding/Vienna2";
import {Pose2D} from "../../pose2D/Pose2D";
import {PoseField} from "../../pose2D/PoseField";
import {PuzzleEditOp} from "../../pose2D/PuzzleEditOp";
import {ConstraintType} from "../../puzzle/Constraints";
import {Bitmaps} from "../../resources/Bitmaps";
import {AsyncProcessDialog} from "../../ui/AsyncProcessDialog";
import {ConstraintBox} from "../../ui/ConstraintBox";
import {CopySequenceDialog} from "../../ui/CopySequenceDialog";
import {DialogCanceledError} from "../../ui/Dialog";
import {EternaViewOptionsDialog, EternaViewOptionsMode} from "../../ui/EternaViewOptionsDialog";
import {GameButton} from "../../ui/GameButton";
import {GetPaletteTargetBaseType, PaletteTargetType} from "../../ui/NucleotidePalette";
import {PasteSequenceDialog} from "../../ui/PasteSequenceDialog";
import {PoseThumbnail, PoseThumbnailType} from "../../ui/PoseThumbnail";
import {UndoBlock, UndoBlockParam} from "../../UndoBlock";
import {ExternalInterface} from "../../util/ExternalInterface";
import {Fonts} from "../../util/Fonts";
import {Background} from "../../vfx/Background";
import {GameMode} from "../GameMode";
import {PuzzleEditToolbar} from "./PuzzleEditToolbar";
import {StructureInput} from "./StructureInput";
import {SubmitPuzzleDetails, SubmitPuzzleDialog} from "./SubmitPuzzleDialog";

type InteractionEvent = PIXI.interaction.InteractionEvent;

export class PuzzleEditMode extends GameMode {
    constructor(embedded: boolean, numTargets: number = 1) {
        super();
        this._embedded = embedded;
        this._numTargets = Math.max(numTargets, 1);
    }

    protected setup(): void {
        super.setup();

        let background = new Background();
        this.addObject(background, this.bgLayer);

        this._folder = FolderManager.instance.getFolder(Vienna.NAME);

        this._folder_button = new GameButton()
            .allStates(Bitmaps.ShapeImg)
            .label(this._folder.name, 22)
            .tooltip("Select the folding engine");
        this._folder_button.display.scale = new Point(0.5, 0.5);
        this._folder_button.display.position = new Point(17, 160);
        this.addObject(this._folder_button, this.uiLayer);

        this._folder_button.clicked.connect(() => this.change_folder);

        this.regs.add(Eterna.settings.multipleFoldingEngines.connectNotify((value) => {
            this._folder_button.display.visible = value;
        }));

        this._toolbar = new PuzzleEditToolbar(this._embedded);
        this.addObject(this._toolbar, this.uiLayer);

        this._toolbar.addbase_button.clicked.connect(() =>
            this.onEditButtonClicked(this._toolbar.addbase_button, EPars.RNABASE_ADD_BASE));
        this._toolbar.addpair_button.clicked.connect(() =>
            this.onEditButtonClicked(this._toolbar.addpair_button, EPars.RNABASE_ADD_PAIR));
        this._toolbar.delete_button.clicked.connect(() =>
            this.onEditButtonClicked(this._toolbar.delete_button, EPars.RNABASE_DELETE));
        this._toolbar.lock_button.clicked.connect(() =>
            this.onEditButtonClicked(this._toolbar.lock_button, EPars.RNABASE_LOCK));
        this._toolbar.site_button.clicked.connect(() =>
            this.onEditButtonClicked(this._toolbar.site_button, EPars.RNABASE_BINDING_SITE));
        this._toolbar.pair_swap_button.clicked.connect(() =>
            this.onEditButtonClicked(this._toolbar.pair_swap_button, EPars.RNABASE_PAIR));

        this._toolbar.native_button.clicked.connect(() => this.set_to_native_mode());
        this._toolbar.target_button.clicked.connect(() => this.set_to_target_mode());
        this._toolbar.undo_button.clicked.connect(() => this.move_undo_stack_backward());
        this._toolbar.redo_button.clicked.connect(() => this.move_undo_stack_forward());

        this._toolbar.screenshotButton.clicked.connect(() => this.postScreenshot(this.createScreenshot()));

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

        this._toolbar.copy_button.clicked.connect(() => {
            this.showDialog(new CopySequenceDialog(EPars.sequence_array_to_string(this._poses[0].get_sequence())));
        });

        this._toolbar.paste_button.clicked.connect(() => {
            this.showDialog(new PasteSequenceDialog()).closed.then(sequence => {
                if (sequence != null) {
                    for (let pose of this._poses) {
                        pose.paste_sequence(EPars.string_to_sequence_array(sequence));
                    }
                }
            });
        });

        this._toolbar.view_options_button.clicked.connect(() => {
            this.showDialog(new EternaViewOptionsDialog(EternaViewOptionsMode.PUZZLEMAKER));
        });

        this._toolbar.reset_button.clicked.connect(() => this.promptForReset());
        this._toolbar.submit_button.clicked.connect(() => this.on_submit_puzzle());

        this._toolbar.palette.targetClicked.connect(type => this.onPaletteTargetSelected(type));

        if (this._embedded) {
            ExternalInterface.addCallback("get_secstruct", this.get_secstruct);
            ExternalInterface.addCallback("get_sequence", this.get_sequence);
            ExternalInterface.addCallback("get_locks", this.get_locks);
            ExternalInterface.addCallback("get_thumbnail", this.getThumbnailBase64);
            ExternalInterface.addCallback("get_shift_limit", this.get_shift_limit);
        }

        this.initialize();
    }

    private autoload_data(): any[] {
        return Eterna.settings.loadObject(this.savedDataTokenName);
    }

    private autosave_data(): void {
        let objs: any[] = [];
        for (let pose of this._poses) {
            objs.push({
                sequence: EPars.sequence_array_to_string(pose.get_sequence()),
                structure: EPars.pairs_array_to_parenthesis(pose.get_molecular_structure()),
            });
        }

        Eterna.settings.saveObject(this.savedDataTokenName, objs);
    }

    private reset_autosave_data(): void {
        Eterna.settings.removeObject(this.savedDataTokenName);
    }

    private get savedDataTokenName(): string {
        return `puzedit_${this._numTargets}`;
    }

    public set_folder(engine_name: string): void {
        let newFolder: Folder = FolderManager.instance.getFolder(engine_name);
        if (newFolder) {
            this._folder = newFolder;
        }
    }

    private initialize(): void {
        this.clear_undo_stack();

        let pose_fields: PoseField[] = [];
        this._structureInputs = [];

        let set_cb = (kk: number): void  => {
            this._poses[kk].set_add_base_callback((parenthesis: string, op: PuzzleEditOp, index: number): void => {
                let secInput: StructureInput = this._structureInputs[kk];
                secInput.set_secstruct(parenthesis);
                secInput.set_pose(op, index);
            });
        };

        let pose_edit_setter = (index: number, pose_to_set: Pose2D): void => {
            pose_to_set.set_pose_edit_callback(() => {
                this.pose_edit_by_target(index);
            });
        };

        let bind_mousedown_event = (pose: Pose2D, index: number): void => {
            pose.set_start_mousedown_callback((e: InteractionEvent, closest_dist: number, closest_index: number): void => {
                for (let ii: number = 0; ii < this._numTargets; ++ii) {
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

        let states: any[] = this.autoload_data();
        for (let ii = 0; ii < this._numTargets; ii++) {
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

            let structureInput = new StructureInput(pose);
            pose_field.addObject(structureInput, pose_field.container);
            if (!this._embedded) {
                structureInput.set_size(700 / this._numTargets, 50);
            } else {
                structureInput.set_size(500 / this._numTargets, 50);
            }

            structureInput.set_secstruct(default_structure);
            this._structureInputs.push(structureInput);

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

        for (let ii = 0; ii < this._numTargets; ii++) {
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

        this.updateLayout();
    }

    public get_secstruct(): string {
        return this._structureInputs[0].get_secstruct();
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

    public getThumbnailBase64(): string {
        let img = PoseThumbnail.createFramedBitmap(
            this._poses[0].get_sequence(), this._poses[0].get_pairs(), 6, PoseThumbnailType.WHITE);
        return Base64.encodeDisplayObjectPNG(img);
    }

    public onResized(): void {
        this.updateLayout();
        super.onResized();
    }

    private updateLayout(): void {
        DisplayUtil.positionRelativeToStage(
            this._toolbar.display, HAlign.CENTER, VAlign.BOTTOM,
            HAlign.CENTER, VAlign.BOTTOM, 20, -20);

        let toolbarBounds = this._toolbar.display.getBounds(false);

        for (let ii = 0; ii < this._numTargets; ++ii) {
            let structureInput = this._structureInputs[ii];
            let poseField = this._pose_fields[ii];
            if (!this._embedded) {
                structureInput.display.position = new Point(
                    (poseField.width - structureInput.get_panel_width()) * 0.5,
                    toolbarBounds.y - structureInput.get_panel_height() - 7
                );
            } else {
                structureInput.display.position = new Point(
                    (poseField.width - structureInput.get_panel_width()) * 0.5,
                    toolbarBounds.y - structureInput.get_panel_height() - 7
                );
            }
        }
    }

    protected createScreenshot(): ArrayBuffer {
        let visibleState: Map<DisplayObject, boolean> = new Map();
        let pushVisibleState = (disp: DisplayObject) => {
            visibleState.set(disp, disp.visible);
            disp.visible = false;
        };

        pushVisibleState(this.bgLayer);
        pushVisibleState(this.uiLayer);
        pushVisibleState(this.dialogLayer);
        pushVisibleState(this.achievementsLayer);

        for (let structureInput of this._structureInputs) {
            pushVisibleState(structureInput.display);
        }

        for (let constraintBox of this._constraint_boxes) {
            pushVisibleState(constraintBox.display);
        }

        let energyVisible: boolean[] = [];
        let trackedCursorIdx: number[] = [];
        for (let pose of this._poses) {
            energyVisible.push(pose.showTotalEnergy);
            pose.set_show_total_energy(false);

            trackedCursorIdx.push(pose.trackedCursorIdx);
            pose.track_cursor(-1);
        }

        let tempBG = DisplayUtil.fillStageRect(0x061A34);
        this.container.addChildAt(tempBG, 0);

        let info =
            `Player: ${Eterna.player_name}\n` +
            `Player Puzzle Designer`;
        let infoText = Fonts.arial(info, 12).color(0xffffff).build();
        this.container.addChild(infoText);

        let pngData = DisplayUtil.renderToPNG(this.container);

        tempBG.destroy({children: true});
        infoText.destroy({children: true});

        for (let [disp, wasVisible] of visibleState.entries()) {
            disp.visible = wasVisible;
        }

        for (let ii = 0; ii < this._poses.length; ++ii) {
            this._poses[ii].set_show_total_energy(energyVisible[ii]);
            this._poses[ii].track_cursor(trackedCursorIdx[ii]);
        }

        return pngData;
    }

    private promptForReset(): void {
        const PROMPT = "Do you really want to reset?";

        this.showConfirmDialog(PROMPT).closed.then(confirmed => {
            if (confirmed) {
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
        });
    }

    private on_submit_puzzle(): void {
        let first_secstruct: string = this._structureInputs[0].get_secstruct();

        for (let ii: number = 0; ii < this._poses.length; ii++) {
            let secstruct: string = this._structureInputs[ii].get_secstruct();

            let length_limit: number = 400;
            if (Eterna.is_dev_mode) {
                length_limit = -1;
            }

            let error: string = EPars.validate_parenthesis(secstruct, false, length_limit);
            if (error != null) {
                this.showNotification(error);
                return;
            }

            if (secstruct.length != first_secstruct.length) {
                this.showNotification("Structure lengths don't match");
                return;
            }

            if (!EPars.are_pairs_same(this.get_current_target_pairs(ii), this.get_current_undo_block(ii).get_pairs(EPars.DEFAULT_TEMPERATURE)) && !Eterna.is_dev_mode) {
                this.showNotification("You should first solve your puzzle before submitting it!");
                return;
            }

            if (this._poses[ii].check_overlap() && !Eterna.is_dev_mode) {
                this.showNotification("Some bases overlapped too much!");
                return;
            }
        }

        let puzzleState = this.get_current_undo_block(0);
        const PROMPT = "You can only submit 3 puzzles per 24 hours.\nAre you sure you want to submit?";
        this.showConfirmDialog(PROMPT).confirmed
            .then(() => this.showDialog(new SubmitPuzzleDialog(this._poses.length, puzzleState)).confirmed)
            .then(details => this.submit_puzzle(details))
            .catch(err => {
                if (!(err instanceof DialogCanceledError)) {
                    throw err;
                }
            });
    }

    private submit_puzzle(details: SubmitPuzzleDetails): void {
        let constraints: string = "";
        for (let ii = 0; ii < this._poses.length; ii++) {
            if (ii > 0) {
                constraints += ",";
            }
            constraints += "SHAPE," + ii;
        }

        let len: number = this._poses[0].get_sequence().length;

        let locks = this.get_current_lock(0);
        let lock_string: string = "";
        for (let ii = 0; ii < len; ii++) {
            if (locks[ii]) {
                lock_string += "x";
            } else {
                lock_string += "o";
            }
        }

        let sequence: string = EPars.sequence_array_to_string(this._poses[0].get_sequence());
        let beginning_sequence: string = "";
        for (let ii = 0; ii < len; ii++) {
            if (locks[ii]) {
                beginning_sequence += sequence.substr(ii, 1);
            } else {
                beginning_sequence += "A";
            }
        }

        if (this._poses.length == 1) {
            let num_pairs: number = EPars.num_pairs(this.get_current_target_pairs(0));

            if (details.minGU && details.minGU > 0) {
                constraints += ",GU," + details.minGU.toString();
            }

            if (details.maxGC && details.maxGC <= num_pairs) {
                constraints += ",GC," + details.maxGC.toString();
            }

            if (details.minAU && details.minAU > 0) {
                constraints += ",AU," + details.minAU.toString();
            }
        }

        let objectives: any[] = [];
        for (let ii = 0; ii < this._poses.length; ii++) {
            let objective: any = {};
            let binding_site: any[] = this.get_current_binding_site(ii);
            let binding_bases: any[] = [];
            for (let bb: number = 0; bb < binding_site.length; bb++) {
                if (binding_site[bb]) {
                    binding_bases.push(bb);
                }
            }

            objective['secstruct'] = this._structureInputs[ii].get_secstruct();

            if (binding_bases.length > 0) {
                objective['type'] = "aptamer";
                objective['site'] = binding_bases;
                objective['concentration'] = 10000;
                objective['fold_version'] = 2.0;
            } else {
                objective['type'] = "single";
            }

            objectives.push(objective);
        }

        let post_params: any = {};

        post_params["folder"] = this._folder.name;
        let params_title: string;
        if (this._folder.name == Vienna2.NAME) {
            params_title = "[VRNA_2]";
        } else if (this._folder.name == NuPACK.NAME) {
            params_title = "[NuPACK]";
        } else {
            params_title = "";
        }
        if (this._poses.length > 1) {
            params_title += "[switch2.5][" + this._poses.length + " states] " + details.title;
        } else {
            params_title += details.title;
        }

        // Render pose thumbnail images
        let midImageString = Base64.encodeDisplayObjectPNG(PoseThumbnail.createFramedBitmap(
            this._poses[0].get_sequence(), this._poses[0].get_pairs(), 4, PoseThumbnailType.WHITE));

        let bigImageString: string = Base64.encodeDisplayObjectPNG(
            PoseThumbnail.createFramedBitmap(this._poses[0].get_sequence(), this._poses[0].get_pairs(), 2, PoseThumbnailType.WHITE));

        post_params["title"] = params_title;
        post_params["secstruct"] = EPars.pairs_array_to_parenthesis(this.get_current_target_pairs(0));
        post_params["constraints"] = constraints;
        post_params["body"] = details.description;
        post_params["midimgdata"] = midImageString;
        post_params["bigimgdata"] = bigImageString;
        post_params["lock"] = lock_string;
        post_params["begin_sequence"] = beginning_sequence;
        post_params["objectives"] = JSON.stringify(objectives);

        let submitText = this.showDialog(new AsyncProcessDialog("Submitting...")).ref;
        Eterna.client.submit_puzzle(post_params)
            .then(() => {
                submitText.destroyObject();
                this.showNotification(
                    "Your puzzle has been successfully published.\n" +
                    "It will show up in player puzzle pages within 5 minutes.");
            })
            .catch(err => {
                submitText.destroyObject();
                this.showNotification(`Puzzle submission failed: ${err}`);
            });
    }

    private set_to_native_mode(): void {
        this._toolbar.target_button.toggled.value = false;
        this._toolbar.native_button.toggled.value = true;

        this._toolbar.target_button.hotkey(KeyCode.Space);
        this._toolbar.native_button.hotkey(null);

        this._paused = false;
        this.update_score();
    }

    private set_to_target_mode(): void {
        this._toolbar.target_button.toggled.value = true;
        this._toolbar.native_button.toggled.value = false;

        this._toolbar.native_button.hotkey(KeyCode.Space);
        this._toolbar.target_button.hotkey(null);

        for (let ii: number = 0; ii < this._poses.length; ii++) {
            this._poses[ii].set_pairs(EPars.parenthesis_to_pair_array(this._structureInputs[ii].get_secstruct()));
        }
        this._paused = true;

        this.update_score();
    }

    private change_folder(): void {
        let curr_f: string = this._folder.name;
        this._folder = FolderManager.instance.getNextFolder(curr_f, () => false);
        if (this._folder.name == curr_f) {
            return;
        }

        this._folder_button.label(this._folder.name);

        for (let pose of this._poses) {
            pose.set_score_visualization(this._folder);
        }

        this.clear_undo_stack();
        this.pose_edit_by_target(0);
        for (let pose of this._poses) {
            pose.set_display_score_texts(pose.is_displaying_score_texts());
        }
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
            this._structureInputs[ii].set_secstruct(target_string);
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
            this._structureInputs[ii].set_secstruct(target_string);
        }
        this.update_score();
    }

    private update_score(): void {
        this.autosave_data();

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

        this._toolbar.palette.set_pair_counts(num_AU, num_GU, num_GC);
    }

    private onPaletteTargetSelected(type: PaletteTargetType): void {
        this._toolbar.deselect_all_colorings();

        let baseType: number = GetPaletteTargetBaseType(type);
        for (let pose of this._poses) {
            pose.set_current_color(baseType);
        }
    }

    private onEditButtonClicked(button: GameButton, poseColor: number): void {
        for (let pose of this._poses) {
            pose.set_current_color(poseColor);
        }

        this._toolbar.deselect_all_colorings();
        button.toggled.value = true;
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
                this._structureInputs[ii].set_warning("Structure lengths don't match " + lengths + ".\nSequences won't be synced.");
            }
        } else {
            for (let ii = 0; ii < this._poses.length; ii++) {
                this._structureInputs[ii].set_warning("");
            }
        }

        for (let ii = 0; ii < this._poses.length; ii++) {
            let target_pairs: number[] = EPars.parenthesis_to_pair_array(this._structureInputs[ii].get_secstruct());
            let seq = this._poses[ii].get_sequence();
            let lock = this._poses[ii].get_puzzle_locks();
            let binding_site = this._poses[ii].get_molecular_binding_site();

            if (this._stack_level >= 0) {
                if (this._structureInputs[ii].get_secstruct() != EPars.pairs_array_to_parenthesis(this._target_pairs_stack[this._stack_level][ii])) {
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
                        break;
                    }
                }
            }

            let best_pairs: number[];
            if (!is_there_molecule) {
                best_pairs = this._folder.foldSequence(seq, null, null, EPars.DEFAULT_TEMPERATURE);
            } else {
                let bonus: number = -486;
                let site: number[] = [];
                for (let bb = 0; bb < binding_site.length; bb++) {
                    if (binding_site[bb]) {
                        site.push(bb);
                    }
                }

                best_pairs = this._folder.foldSequenceWithBindingSite(seq, target_pairs, site, Number(bonus), 2.0);
            }

            let undo_block = new UndoBlock(seq);
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

        this.update_score();
    }

    private readonly _embedded: boolean;
    private readonly _numTargets: number;

    private _structureInputs: StructureInput[];
    private _folder: Folder;
    private _seq_stack: UndoBlock[][];
    private _target_pairs_stack: number[][][];
    private _lock_stack: boolean[][][];
    private _binding_site_stack: boolean[][][];
    private _stack_level: number;
    private _stack_size: number;
    private _paused: boolean;

    private _toolbar: PuzzleEditToolbar;
    private _folder_button: GameButton;
    private _constraint_boxes: ConstraintBox[] = [];
}

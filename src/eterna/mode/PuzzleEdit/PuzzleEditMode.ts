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

        this._folderButton = new GameButton()
            .allStates(Bitmaps.ShapeImg)
            .label(this._folder.name, 22)
            .tooltip("Select the folding engine");
        this._folderButton.display.scale = new Point(0.5, 0.5);
        this._folderButton.display.position = new Point(17, 160);
        this.addObject(this._folderButton, this.uiLayer);

        this._folderButton.clicked.connect(() => this.changeFolder);

        this.regs.add(Eterna.settings.multipleFoldingEngines.connectNotify((value) => {
            this._folderButton.display.visible = value;
        }));

        this._toolbar = new PuzzleEditToolbar(this._embedded);
        this.addObject(this._toolbar, this.uiLayer);

        this._toolbar.addbaseButton.clicked.connect(() =>
            this.onEditButtonClicked(this._toolbar.addbaseButton, EPars.RNABASE_ADD_BASE));
        this._toolbar.addpairButton.clicked.connect(() =>
            this.onEditButtonClicked(this._toolbar.addpairButton, EPars.RNABASE_ADD_PAIR));
        this._toolbar.deleteButton.clicked.connect(() =>
            this.onEditButtonClicked(this._toolbar.deleteButton, EPars.RNABASE_DELETE));
        this._toolbar.lockButton.clicked.connect(() =>
            this.onEditButtonClicked(this._toolbar.lockButton, EPars.RNABASE_LOCK));
        this._toolbar.siteButton.clicked.connect(() =>
            this.onEditButtonClicked(this._toolbar.siteButton, EPars.RNABASE_BINDING_SITE));
        this._toolbar.pairSwapButton.clicked.connect(() =>
            this.onEditButtonClicked(this._toolbar.pairSwapButton, EPars.RNABASE_PAIR));

        this._toolbar.nativeButton.clicked.connect(() => this.setToNativeMode());
        this._toolbar.targetButton.clicked.connect(() => this.setToTargetMode());
        this._toolbar.undoButton.clicked.connect(() => this.moveUndoStackBackward());
        this._toolbar.redoButton.clicked.connect(() => this.moveUndoStackForward());

        this._toolbar.screenshotButton.clicked.connect(() => this.postScreenshot(this.createScreenshot()));

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

        this._toolbar.copyButton.clicked.connect(() => {
            this.showDialog(new CopySequenceDialog(EPars.sequence_array_to_string(this._poses[0].sequence)));
        });

        this._toolbar.pasteButton.clicked.connect(() => {
            this.showDialog(new PasteSequenceDialog()).closed.then(sequence => {
                if (sequence != null) {
                    for (let pose of this._poses) {
                        pose.pasteSequence(EPars.string_to_sequence_array(sequence));
                    }
                }
            });
        });

        this._toolbar.viewOptionsButton.clicked.connect(() => {
            this.showDialog(new EternaViewOptionsDialog(EternaViewOptionsMode.PUZZLEMAKER));
        });

        this._toolbar.resetButton.clicked.connect(() => this.promptForReset());
        this._toolbar.submitButton.clicked.connect(() => this.onSubmitPuzzle());

        this._toolbar.palette.targetClicked.connect(type => this.onPaletteTargetSelected(type));

        if (this._embedded) {
            ExternalInterface.addCallback("get_secstruct", () => this.structure);
            ExternalInterface.addCallback("get_sequence", () => this.sequence);
            ExternalInterface.addCallback("get_locks", () => this.getLockString());
            ExternalInterface.addCallback("get_thumbnail", () => this.getThumbnailBase64);
            ExternalInterface.addCallback("get_shift_limit", () => this.shiftLimitString);
        }

        this.initialize();
    }

    private loadSavedData(): any[] {
        return Eterna.settings.loadObject(this.savedDataTokenName);
    }

    private saveData(): void {
        let objs: any[] = [];
        for (let pose of this._poses) {
            objs.push({
                sequence: EPars.sequence_array_to_string(pose.sequence),
                structure: EPars.pairs_array_to_parenthesis(pose.molecularStructure),
            });
        }

        Eterna.settings.saveObject(this.savedDataTokenName, objs);
    }

    private resetSavedData(): void {
        Eterna.settings.removeObject(this.savedDataTokenName);
    }

    private get savedDataTokenName(): string {
        return `puzedit_${this._numTargets}`;
    }

    public setFolder(engine_name: string): void {
        let newFolder: Folder = FolderManager.instance.getFolder(engine_name);
        if (newFolder) {
            this._folder = newFolder;
        }
    }

    private initialize(): void {
        this.clearUndoStack();

        let pose_fields: PoseField[] = [];
        this._structureInputs = [];

        let set_cb = (kk: number): void  => {
            this._poses[kk].addBaseCallback = (parenthesis: string, op: PuzzleEditOp, index: number): void => {
                let secInput: StructureInput = this._structureInputs[kk];
                secInput.structureString = parenthesis;
                secInput.setPose(op, index);
            };
        };

        let pose_edit_setter = (index: number, pose_to_set: Pose2D): void => {
            pose_to_set.poseEditCallback = () => this.poseEditByTarget(index);
        };

        let bind_mousedown_event = (pose: Pose2D, index: number): void => {
            pose.startMousedownCallback = (e: InteractionEvent, closest_dist: number, closest_index: number): void => {
                for (let ii: number = 0; ii < this._numTargets; ++ii) {
                    let pose_field: PoseField = pose_fields[ii];
                    let pose: Pose2D = pose_field.pose;
                    if (ii == index) {
                        pose.onPoseMouseDown(e, closest_index);
                    } else {
                        pose.onPoseMouseDownPropagate(e, closest_index);
                    }
                }
            };
        };

        let states: any[] = this.loadSavedData();
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
            let pose: Pose2D = pose_field.pose;
            pose.scoreFolder = this._folder;
            pose.molecularStructure = default_pairs;
            pose.molecularBindingBonus = -4.86;
            pose.sequence = EPars.string_to_sequence_array(default_sequence);
            pose_fields.push(pose_field);

            let structureInput = new StructureInput(pose);
            pose_field.addObject(structureInput, pose_field.container);
            if (!this._embedded) {
                structureInput.setSize(700 / this._numTargets, 50);
            } else {
                structureInput.setSize(500 / this._numTargets, 50);
            }

            structureInput.structureString = default_structure;
            this._structureInputs.push(structureInput);

            let constraint_box = new ConstraintBox();
            constraint_box.display.position = new Point(17, 35);
            pose_field.addObject(constraint_box, pose_field.container);
            if (this._embedded) {
                constraint_box.display.visible = false;
            }

            this._constraintBoxes.push(constraint_box);
        }

        this.setPoseFields(pose_fields);
        this.poseEditByTarget(0);

        for (let ii = 0; ii < this._numTargets; ii++) {
            set_cb(ii);
            pose_edit_setter(ii, this._poses[ii]);

            if (this._embedded) {
                this._poses[ii].setZoomLevel(2, true, true);
            }

            bind_mousedown_event(this._poses[ii], ii);
        }

        this.setToTargetMode();
        this.onPaletteTargetSelected(PaletteTargetType.A);
        this.setPip(true);

        this.updateLayout();
    }

    public get structure(): string {
        return this._structureInputs[0].structureString;
    }

    public get sequence(): string {
        return EPars.sequence_array_to_string(this._poses[0].sequence);
    }

    public getLockString(): string {
        let locks: boolean[] = this.getCurrentLock(0);
        let len: number = this._poses[0].sequence.length;
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

    public get shiftLimitString(): string {
        return "";
    }

    public getThumbnailBase64(): string {
        let img = PoseThumbnail.createFramedBitmap(
            this._poses[0].sequence, this._poses[0].pairs, 6, PoseThumbnailType.WHITE);
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
            let poseField = this._poseFields[ii];
            if (!this._embedded) {
                structureInput.display.position = new Point(
                    (poseField.width - structureInput.width) * 0.5,
                    toolbarBounds.y - structureInput.height - 7
                );
            } else {
                structureInput.display.position = new Point(
                    (poseField.width - structureInput.width) * 0.5,
                    toolbarBounds.y - structureInput.height - 7
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

        for (let constraintBox of this._constraintBoxes) {
            pushVisibleState(constraintBox.display);
        }

        let energyVisible: boolean[] = [];
        let trackedCursorIdx: number[] = [];
        for (let pose of this._poses) {
            energyVisible.push(pose.showTotalEnergy);
            pose.showTotalEnergy = false;

            trackedCursorIdx.push(pose.trackedCursorIdx);
            pose.trackCursor(-1);
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
            this._poses[ii].showTotalEnergy = energyVisible[ii];
            this._poses[ii].trackCursor(trackedCursorIdx[ii]);
        }

        return pngData;
    }

    private promptForReset(): void {
        const PROMPT = "Do you really want to reset?";

        this.showConfirmDialog(PROMPT).closed.then(confirmed => {
            if (confirmed) {
                for (let pose of this._poses) {
                    let sequence = pose.sequence;
                    for (let ii: number = 0; ii < sequence.length; ii++) {
                        if (!pose.isLocked(ii)) {
                            sequence[ii] = EPars.RNABASE_ADENINE;
                        }
                    }

                    pose.puzzleLocks = null;
                    pose.sequence = sequence;
                    pose.molecularBindingSite = null;
                }
                this.poseEditByTarget(0);
            }
        });
    }

    private onSubmitPuzzle(): void {
        let first_secstruct: string = this._structureInputs[0].structureString;

        for (let ii: number = 0; ii < this._poses.length; ii++) {
            let secstruct: string = this._structureInputs[ii].structureString;

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

            if (!EPars.are_pairs_same(this.getCurrentTargetPairs(ii), this.getCurrentUndoBlock(ii).get_pairs(EPars.DEFAULT_TEMPERATURE)) && !Eterna.is_dev_mode) {
                this.showNotification("You should first solve your puzzle before submitting it!");
                return;
            }

            if (this._poses[ii].checkOverlap() && !Eterna.is_dev_mode) {
                this.showNotification("Some bases overlapped too much!");
                return;
            }
        }

        let puzzleState = this.getCurrentUndoBlock(0);
        const PROMPT = "You can only submit 3 puzzles per 24 hours.\nAre you sure you want to submit?";
        this.showConfirmDialog(PROMPT).confirmed
            .then(() => this.showDialog(new SubmitPuzzleDialog(this._poses.length, puzzleState)).confirmed)
            .then(details => this.submitPuzzle(details))
            .catch(err => {
                if (!(err instanceof DialogCanceledError)) {
                    throw err;
                }
            });
    }

    private submitPuzzle(details: SubmitPuzzleDetails): void {
        let constraints: string = "";
        for (let ii = 0; ii < this._poses.length; ii++) {
            if (ii > 0) {
                constraints += ",";
            }
            constraints += "SHAPE," + ii;
        }

        let len: number = this._poses[0].sequence.length;

        let locks = this.getCurrentLock(0);
        let lock_string: string = "";
        for (let ii = 0; ii < len; ii++) {
            if (locks[ii]) {
                lock_string += "x";
            } else {
                lock_string += "o";
            }
        }

        let sequence: string = EPars.sequence_array_to_string(this._poses[0].sequence);
        let beginning_sequence: string = "";
        for (let ii = 0; ii < len; ii++) {
            if (locks[ii]) {
                beginning_sequence += sequence.substr(ii, 1);
            } else {
                beginning_sequence += "A";
            }
        }

        if (this._poses.length == 1) {
            let num_pairs: number = EPars.num_pairs(this.getCurrentTargetPairs(0));

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
            let binding_site: any[] = this.getCurrentBindingSite(ii);
            let binding_bases: any[] = [];
            for (let bb: number = 0; bb < binding_site.length; bb++) {
                if (binding_site[bb]) {
                    binding_bases.push(bb);
                }
            }

            objective['secstruct'] = this._structureInputs[ii].structureString;

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
            this._poses[0].sequence, this._poses[0].pairs, 4, PoseThumbnailType.WHITE));

        let bigImageString: string = Base64.encodeDisplayObjectPNG(
            PoseThumbnail.createFramedBitmap(this._poses[0].sequence, this._poses[0].pairs, 2, PoseThumbnailType.WHITE));

        post_params["title"] = params_title;
        post_params["secstruct"] = EPars.pairs_array_to_parenthesis(this.getCurrentTargetPairs(0));
        post_params["constraints"] = constraints;
        post_params["body"] = details.description;
        post_params["midimgdata"] = midImageString;
        post_params["bigimgdata"] = bigImageString;
        post_params["lock"] = lock_string;
        post_params["begin_sequence"] = beginning_sequence;
        post_params["objectives"] = JSON.stringify(objectives);

        let submitText = this.showDialog(new AsyncProcessDialog("Submitting...")).ref;
        Eterna.client.submitPuzzle(post_params)
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

    private setToNativeMode(): void {
        this._toolbar.targetButton.toggled.value = false;
        this._toolbar.nativeButton.toggled.value = true;

        this._toolbar.targetButton.hotkey(KeyCode.Space);
        this._toolbar.nativeButton.hotkey(null);

        this._paused = false;
        this.updateScore();
    }

    private setToTargetMode(): void {
        this._toolbar.targetButton.toggled.value = true;
        this._toolbar.nativeButton.toggled.value = false;

        this._toolbar.nativeButton.hotkey(KeyCode.Space);
        this._toolbar.targetButton.hotkey(null);

        for (let ii: number = 0; ii < this._poses.length; ii++) {
            this._poses[ii].pairs = EPars.parenthesis_to_pair_array(this._structureInputs[ii].structureString);
        }
        this._paused = true;

        this.updateScore();
    }

    private changeFolder(): void {
        let curr_f: string = this._folder.name;
        this._folder = FolderManager.instance.getNextFolder(curr_f, () => false);
        if (this._folder.name == curr_f) {
            return;
        }

        this._folderButton.label(this._folder.name);

        for (let pose of this._poses) {
            pose.scoreFolder = this._folder;
        }

        this.clearUndoStack();
        this.poseEditByTarget(0);
    }

    private clearUndoStack(): void {
        this._stackLevel = -1;
        this._stackSize = 0;
        this._seqStack = [];
        this._targetPairsStack = [];
        this._lockStack = [];
        this._bindingSiteStack = [];
    }

    private getCurrentUndoBlock(index: number): UndoBlock {
        return this._seqStack[this._stackLevel][index];
    }

    private getCurrentTargetPairs(index: number): number[] {
        return this._targetPairsStack[this._stackLevel][index];
    }

    private getCurrentLock(index: number): boolean[] {
        return this._lockStack[this._stackLevel][index];
    }

    private getCurrentBindingSite(index: number): boolean[] {
        return this._bindingSiteStack[this._stackLevel][index];
    }

    private moveUndoStackForward(): void {
        if (this._stackLevel + 1 > this._stackSize - 1) {
            return;
        }

        this._stackLevel++;

        for (let ii: number = 0; ii < this._poses.length; ii++) {
            this._poses[ii].sequence = this._seqStack[this._stackLevel][ii].get_sequence();
            this._poses[ii].puzzleLocks = this._lockStack[this._stackLevel][ii];
            this._poses[ii].molecularStructure = this._targetPairsStack[this._stackLevel][ii];
            this._poses[ii].molecularBindingSite = this._bindingSiteStack[this._stackLevel][ii];
            this._structureInputs[ii].structureString =
                EPars.pairs_array_to_parenthesis(this._targetPairsStack[this._stackLevel][ii]);
        }

        this.updateScore();
    }

    private moveUndoStackBackward(): void {
        if (this._stackLevel < 1) {
            return;
        }

        this._stackLevel--;
        for (let ii: number = 0; ii < this._poses.length; ii++) {
            this._poses[ii].sequence = this._seqStack[this._stackLevel][ii].get_sequence();
            this._poses[ii].puzzleLocks = this._lockStack[this._stackLevel][ii];
            this._poses[ii].molecularStructure = this._targetPairsStack[this._stackLevel][ii];
            this._poses[ii].molecularBindingSite = this._bindingSiteStack[this._stackLevel][ii];
            this._structureInputs[ii].structureString =
                EPars.pairs_array_to_parenthesis(this._targetPairsStack[this._stackLevel][ii]);
        }
        this.updateScore();
    }

    private updateScore(): void {
        this.saveData();

        for (let ii: number = 0; ii < this._poses.length; ii++) {
            let undoblock: UndoBlock = this.getCurrentUndoBlock(ii);
            let target_pairs = this.getCurrentTargetPairs(ii);
            let best_pairs = undoblock.get_pairs(EPars.DEFAULT_TEMPERATURE);
            let sequence = this._poses[ii].sequence;
            if (sequence.length != target_pairs.length) {
                throw new Error("sequence and design pairs lengths don't match");
            }

            if (this._paused) {
                this._poses[ii].pairs = target_pairs;
            } else {
                this._poses[ii].pairs = best_pairs;
            }

            this._constraintBoxes[ii].setContent(ConstraintType.SHAPE, {
                target: target_pairs,
                native: best_pairs
            }, EPars.are_pairs_same(best_pairs, target_pairs), 0);
            this._constraintBoxes[ii].display.scale.x = 1;
            this._constraintBoxes[ii].display.scale.y = 1;
        }

        let undoblock: UndoBlock = this.getCurrentUndoBlock(this._poses.length - 1);
        let num_AU: number = undoblock.get_param(UndoBlockParam.AU);
        let num_GU: number = undoblock.get_param(UndoBlockParam.GU);
        let num_GC: number = undoblock.get_param(UndoBlockParam.GC);

        this._toolbar.palette.set_pair_counts(num_AU, num_GU, num_GC);
    }

    private onPaletteTargetSelected(type: PaletteTargetType): void {
        this._toolbar.deselectAllColorings();

        let baseType: number = GetPaletteTargetBaseType(type);
        for (let pose of this._poses) {
            pose.currentColor = baseType;
        }
    }

    private onEditButtonClicked(button: GameButton, poseColor: number): void {
        for (let pose of this._poses) {
            pose.currentColor = poseColor;
        }

        this._toolbar.deselectAllColorings();
        button.toggled.value = true;
    }

    private poseEditByTarget(index: number): void {
        let no_change: boolean = true;
        let current_undo_blocks: UndoBlock[] = [];
        let current_target_pairs: number[][] = [];
        let current_lock: boolean[][] = [];
        let current_binding_sites: boolean[][] = [];

        let force_sequence = this._poses[index].sequence;
        let force_lock = this._poses[index].puzzleLocks;

        let different_structures: boolean = false;
        for (let ii = 0; ii < this._poses.length; ii++) {
            if (ii != index) {
                if (this._poses[ii].sequence.length == force_sequence.length) {
                    this._poses[ii].sequence = force_sequence;
                    this._poses[ii].puzzleLocks = force_lock;
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
                lengths += this._poses[ii].sequence.length.toString();
            }
            lengths += "]";

            for (let ii = 0; ii < this._poses.length; ii++) {
                this._structureInputs[ii].setWarning("Structure lengths don't match " + lengths + ".\nSequences won't be synced.");
            }
        } else {
            for (let ii = 0; ii < this._poses.length; ii++) {
                this._structureInputs[ii].setWarning("");
            }
        }

        for (let ii = 0; ii < this._poses.length; ii++) {
            let target_pairs: number[] = EPars.parenthesis_to_pair_array(this._structureInputs[ii].structureString);
            let seq = this._poses[ii].sequence;
            let lock = this._poses[ii].puzzleLocks;
            let binding_site = this._poses[ii].molecularBindingSite;

            if (this._stackLevel >= 0) {
                if (this._structureInputs[ii].structureString != EPars.pairs_array_to_parenthesis(this._targetPairsStack[this._stackLevel][ii])) {
                    no_change = false;
                }
                if (EPars.sequence_array_to_string(seq) != EPars.sequence_array_to_string(this._seqStack[this._stackLevel][ii].get_sequence())) {
                    no_change = false;
                }

                let last_lock: boolean[] = this._lockStack[this._stackLevel][ii];
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

                let last_binding_site: boolean[] = this._bindingSiteStack[this._stackLevel][ii];
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
        if (no_change && this._stackLevel >= 0) {
            return;
        }

        /// Pushing undo block
        this._stackLevel++;
        this._seqStack[this._stackLevel] = current_undo_blocks;
        this._targetPairsStack[this._stackLevel] = current_target_pairs;
        this._lockStack[this._stackLevel] = current_lock;
        this._bindingSiteStack[this._stackLevel] = current_binding_sites;
        this._stackSize = this._stackLevel + 1;

        this.updateScore();
    }

    private readonly _embedded: boolean;
    private readonly _numTargets: number;

    private _structureInputs: StructureInput[];
    private _folder: Folder;
    private _seqStack: UndoBlock[][];
    private _targetPairsStack: number[][][];
    private _lockStack: boolean[][][];
    private _bindingSiteStack: boolean[][][];
    private _stackLevel: number;
    private _stackSize: number;
    private _paused: boolean;

    private _toolbar: PuzzleEditToolbar;
    private _folderButton: GameButton;
    private _constraintBoxes: ConstraintBox[] = [];
}

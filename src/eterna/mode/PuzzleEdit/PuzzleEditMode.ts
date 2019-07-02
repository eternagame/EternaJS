import {DisplayObject, Point} from "pixi.js";
import {HAlign, VAlign} from "flashbang/core";
import {KeyCode} from "flashbang/input";
import {Base64, DisplayUtil} from "flashbang/util";
import EPars from "eterna/EPars";
import Eterna from "eterna/Eterna";
import {
    Folder, FolderManager, LinearFoldC, LinearFoldV, NuPACK, Vienna, Vienna2
} from "eterna/folding";
import {
    Molecule, Pose2D, PoseField, PuzzleEditOp
} from "eterna/pose2D";
import {ConstraintType} from "eterna/puzzle";
import {Bitmaps} from "eterna/resources";
import {
    AsyncProcessDialog, ConstraintBox, DialogCanceledError, EternaViewOptionsDialog, EternaViewOptionsMode,
    GameButton, GetPaletteTargetBaseType, PaletteTargetType, PasteSequenceDialog, PoseThumbnail, PoseThumbnailType,
    URLButton
} from "eterna/ui";
import {default as Toolbar, ToolbarType} from "eterna/ui/Toolbar";
import {default as UndoBlock, UndoBlockParam} from "eterna/UndoBlock";
import {ExternalInterfaceCtx, Fonts} from "eterna/util";
import {Background, BaseGlow} from "eterna/vfx";
import {CopyTextDialogMode, GameMode} from "eterna/mode";
import {
    StructureInput, SubmitPuzzleDialog, SubmitPuzzleDetails
} from ".";

type InteractionEvent = PIXI.interaction.InteractionEvent;

export interface PuzzleEditPoseData {
    sequence: string;
    structure: string;
}

export default class PuzzleEditMode extends GameMode {
    constructor(embedded: boolean, numTargets?: number, poses?: PuzzleEditPoseData[]) {
        super();
        this._embedded = embedded;

        if (poses != null && poses.length > 0) {
            this._initialPoseData = poses;
            this._numTargets = this._initialPoseData.length;
        } else {
            if (!numTargets) {
                numTargets = 1;
            }
            this._numTargets = Math.max(numTargets, 1);
        }
    }

    public get isOpaque(): boolean { return true; }

    protected setup(): void {
        super.setup();

        let background = new Background();
        this.addObject(background, this.bgLayer);

        // Initialize Molecule and BaseGlow textures if they're not already inited.
        // This prevents them from being lazily created when a new molecule is
        // created in the puzzle editor, which can cause a noticeable hitch in framerate
        Molecule.initTextures();
        BaseGlow.initTextures();

        this._folder = FolderManager.instance.getFolder(Vienna.NAME);

        this._folderButton = new GameButton()
            .allStates(Bitmaps.ShapeImg)
            .label(this._folder.name, 22)
            .tooltip("Select the folding engine");
        this._folderButton.display.scale = new Point(0.5, 0.5);
        this._folderButton.display.position = new Point(17, 160);
        this.addObject(this._folderButton, this.uiLayer);

        this._folderButton.clicked.connect(() => this.changeFolder());

        this.regs.add(Eterna.settings.multipleFoldingEngines.connectNotify((value) => {
            this._folderButton.display.visible = value;
        }));

        this._homeButton = GameMode.createHomeButton();
        this._homeButton.hideWhenModeInactive();
        this.addObject(this._homeButton, this.uiLayer);

        let toolbarType = this._embedded ? ToolbarType.PUZZLEMAKER_EMBEDDED : ToolbarType.PUZZLEMAKER;
        this._toolbar = new Toolbar(toolbarType, {states: this._numTargets});
        this.addObject(this._toolbar, this.uiLayer);

        this._toolbar.addbaseButton.clicked.connect(() => this.onEditButtonClicked(EPars.RNABASE_ADD_BASE));
        this._toolbar.addpairButton.clicked.connect(() => this.onEditButtonClicked(EPars.RNABASE_ADD_PAIR));
        this._toolbar.deleteButton.clicked.connect(() => this.onEditButtonClicked(EPars.RNABASE_DELETE));
        this._toolbar.lockButton.clicked.connect(() => this.onEditButtonClicked(EPars.RNABASE_LOCK));
        this._toolbar.moleculeButton.clicked.connect(() => this.onEditButtonClicked(EPars.RNABASE_BINDING_SITE));
        this._toolbar.pairSwapButton.clicked.connect(() => this.onEditButtonClicked(EPars.RNABASE_PAIR));

        this._toolbar.naturalButton.clicked.connect(() => this.setToNativeMode());
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
            this.modeStack.pushMode(new CopyTextDialogMode(
                EPars.sequenceToString(this._poses[0].sequence),
                "Current Sequence"
            ));
        });

        this._toolbar.pasteButton.clicked.connect(() => {
            this.showDialog(new PasteSequenceDialog()).closed.then((sequence) => {
                if (sequence != null) {
                    for (let pose of this._poses) {
                        pose.pasteSequence(EPars.stringToSequence(sequence));
                    }
                }
            });
        });

        this._toolbar.viewOptionsButton.clicked.connect(() => {
            let dialog: EternaViewOptionsDialog = new EternaViewOptionsDialog(EternaViewOptionsMode.PUZZLEMAKER);
            this.showDialog(dialog);
        });

        this._toolbar.resetButton.clicked.connect(() => this.promptForReset());
        this._toolbar.submitButton.clicked.connect(() => this.onSubmitPuzzle());

        this._toolbar.palette.targetClicked.connect(type => this.onPaletteTargetSelected(type));

        if (this._embedded) {
            this._scriptInterface.addCallback("get_secstruct", () => this.structure);
            this._scriptInterface.addCallback("get_sequence", () => this.sequence);
            this._scriptInterface.addCallback("get_locks", () => this.getLockString());
            this._scriptInterface.addCallback("get_thumbnail", () => this.getThumbnailBase64);
            this._scriptInterface.addCallback("get_shift_limit", () => this.shiftLimitString);
        }

        this.clearUndoStack();

        let pose_fields: PoseField[] = [];
        this._structureInputs = [];

        let set_cb = (kk: number): void => {
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
                for (let ii = 0; ii < this._numTargets; ++ii) {
                    let pose_field: PoseField = pose_fields[ii];
                    let {pose} = pose_field;
                    if (ii == index) {
                        pose.onPoseMouseDown(e, closest_index);
                    } else {
                        pose.onPoseMouseDownPropagate(e, closest_index);
                    }
                }
            };
        };

        let initialPoseData = this._initialPoseData;
        for (let ii = 0; ii < this._numTargets; ii++) {
            let defaultStructure = ".....((((((((....)))))))).....";
            let defaultPairs: number[] = EPars.parenthesisToPairs(defaultStructure);
            let defaultSequence = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

            if (initialPoseData != null
                && initialPoseData[ii] != null
                && initialPoseData[ii]["sequence"] != null
                && initialPoseData[ii]["structure"] != null
                && initialPoseData[ii]["structure"] != "") {
                defaultStructure = initialPoseData[ii]["structure"];
                defaultSequence = initialPoseData[ii]["sequence"];
                defaultPairs = EPars.parenthesisToPairs(defaultStructure);
            }

            let poseField: PoseField = new PoseField(true);
            this.addObject(poseField, this.poseLayer);
            let {pose} = poseField;
            pose.scoreFolder = this._folder;
            pose.molecularStructure = defaultPairs;
            pose.molecularBindingBonus = -4.86;
            pose.sequence = EPars.stringToSequence(defaultSequence);
            pose_fields.push(poseField);

            let structureInput = new StructureInput(pose);
            poseField.addObject(structureInput, poseField.container);
            if (!this._embedded) {
                structureInput.setSize(700 / this._numTargets, 50);
            } else {
                structureInput.setSize(500 / this._numTargets, 50);
            }

            structureInput.structureString = defaultStructure;
            this._structureInputs.push(structureInput);

            let constraint_box = new ConstraintBox();
            constraint_box.display.position = new Point(17, 35);
            poseField.addObject(constraint_box, poseField.container);
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

        this.registerScriptInterface(this._scriptInterface);

        this.updateUILayout();
    }

    private saveData(): void {
        let objs: PuzzleEditPoseData[] = [];
        for (let pose of this._poses) {
            objs.push({
                sequence: EPars.sequenceToString(pose.sequence),
                structure: EPars.pairsToParenthesis(pose.molecularStructure)
            });
        }

        Eterna.saveManager.save(this.savedDataTokenName, objs);
    }

    private resetSavedData(): void {
        Eterna.saveManager.remove(this.savedDataTokenName);
    }

    private get savedDataTokenName(): string {
        return PuzzleEditMode.savedDataTokenName(this._numTargets);
    }

    public static savedDataTokenName(numTargets: number): string {
        return `puzedit_${numTargets}`;
    }

    public setFolder(engine_name: string): void {
        let newFolder: Folder = FolderManager.instance.getFolder(engine_name);
        if (newFolder) {
            this._folder = newFolder;
        }
    }

    public get structure(): string {
        return this._structureInputs[0].structureString;
    }

    public get sequence(): string {
        return EPars.sequenceToString(this._poses[0].sequence);
    }

    public getLockString(): string {
        let locks: boolean[] = this.getCurrentLock(0);
        let len: number = this._poses[0].sequence.length;
        let lock_string = "";
        for (let ii = 0; ii < len; ii++) {
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
            this._poses[0].sequence, this._poses[0].pairs, 6, PoseThumbnailType.WHITE
        );
        return Base64.encodeDisplayObjectPNG(img);
    }

    public onResized(): void {
        super.onResized();
        this.updateUILayout();
    }

    private updateUILayout(): void {
        DisplayUtil.positionRelativeToStage(
            this._toolbar.display, HAlign.CENTER, VAlign.BOTTOM,
            HAlign.CENTER, VAlign.BOTTOM, 20, -20
        );

        DisplayUtil.positionRelativeToStage(
            this._homeButton.display, HAlign.RIGHT, VAlign.TOP,
            HAlign.RIGHT, VAlign.TOP, 0, 5
        );

        let toolbarBounds = this._toolbar.display.getBounds();
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
        let explosionFactorVisible: boolean[] = [];
        for (let pose of this._poses) {
            energyVisible.push(pose.showTotalEnergy);
            pose.showTotalEnergy = false;

            trackedCursorIdx.push(pose.trackedCursorIdx);
            pose.trackCursor(-1);

            explosionFactorVisible.push(pose.showExplosionFactor);
            pose.showExplosionFactor = false;
        }

        let tempBG = DisplayUtil.fillStageRect(0x061A34);
        this.container.addChildAt(tempBG, 0);

        let info = `Player: ${Eterna.playerName}\n`
            + "Player Puzzle Designer";
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
            this._poses[ii].showExplosionFactor = explosionFactorVisible[ii];
        }

        return pngData;
    }

    private promptForReset(): void {
        const PROMPT = "Do you really want to reset?";

        this.showConfirmDialog(PROMPT).closed.then((confirmed) => {
            if (confirmed) {
                for (let pose of this._poses) {
                    let {sequence} = pose;
                    for (let ii = 0; ii < sequence.length; ii++) {
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

        for (let ii = 0; ii < this._poses.length; ii++) {
            let secstruct: string = this._structureInputs[ii].structureString;

            let length_limit = 400;
            if (Eterna.DEV_MODE) {
                length_limit = -1;
            }

            let error: string = EPars.validateParenthesis(secstruct, false, length_limit);
            if (error != null) {
                this.showNotification(error);
                return;
            }

            if (secstruct.length != first_secstruct.length) {
                this.showNotification("Structure lengths don't match");
                return;
            }

            if (!EPars.arePairsSame(this.getCurrentTargetPairs(ii), this.getCurrentUndoBlock(ii).getPairs(EPars.DEFAULT_TEMPERATURE)) && !Eterna.DEV_MODE) {
                this.showNotification("You should first solve your puzzle before submitting it!");
                return;
            }

            if (this._poses[ii].checkOverlap() && !Eterna.DEV_MODE) {
                this.showNotification("Some bases overlapped too much!");
                return;
            }
        }

        let puzzleState = this.getCurrentUndoBlock(0);
        const PROMPT = "You can only submit 3 puzzles per 24 hours.\nAre you sure you want to submit?";
        this.showConfirmDialog(PROMPT).confirmed
            .then(() => this.showDialog(new SubmitPuzzleDialog(this._poses.length, puzzleState)).confirmed)
            .then(details => this.submitPuzzle(details))
            .catch((err) => {
                if (!(err instanceof DialogCanceledError)) {
                    throw err;
                }
            });
    }

    private submitPuzzle(details: SubmitPuzzleDetails): void {
        let constraints = "";
        for (let ii = 0; ii < this._poses.length; ii++) {
            if (ii > 0) {
                constraints += ",";
            }
            constraints += `SHAPE,${ii}`;
        }

        let len: number = this._poses[0].sequence.length;

        let locks = this.getCurrentLock(0);
        let lock_string = "";
        for (let ii = 0; ii < len; ii++) {
            if (locks[ii]) {
                lock_string += "x";
            } else {
                lock_string += "o";
            }
        }

        let sequence: string = EPars.sequenceToString(this._poses[0].sequence);
        let beginning_sequence = "";
        for (let ii = 0; ii < len; ii++) {
            if (locks[ii]) {
                beginning_sequence += sequence.substr(ii, 1);
            } else {
                beginning_sequence += "A";
            }
        }

        if (this._poses.length == 1) {
            let num_pairs: number = EPars.numPairs(this.getCurrentTargetPairs(0));

            if (details.minGU != undefined && details.minGU > 0) {
                constraints += `,GU,${details.minGU.toString()}`;
            }

            if (details.maxGC != undefined && details.maxGC <= num_pairs) {
                constraints += `,GC,${details.maxGC.toString()}`;
            }

            if (details.minAU != undefined && details.minAU > 0) {
                constraints += `,AU,${details.minAU.toString()}`;
            }
        }

        let objectives: any[] = [];
        for (let ii = 0; ii < this._poses.length; ii++) {
            let objective: any = {};
            let binding_site: any[] = this.getCurrentBindingSite(ii);
            let binding_bases: any[] = [];
            for (let bb = 0; bb < binding_site.length; bb++) {
                if (binding_site[bb]) {
                    binding_bases.push(bb);
                }
            }

            objective["secstruct"] = this._structureInputs[ii].structureString;

            if (binding_bases.length > 0) {
                objective["type"] = "aptamer";
                objective["site"] = binding_bases;
                objective["concentration"] = 10000;
                objective["fold_version"] = 2.0;
            } else {
                objective["type"] = "single";
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
        } else if (this._folder.name == LinearFoldC.NAME) {
            params_title = "[LFC]";
        } else if (this._folder.name == LinearFoldV.NAME) {
            params_title = "[LFV]";
        } else {
            params_title = "";
        }
        if (this._poses.length > 1) {
            params_title += `[switch2.5][${this._poses.length} states] ${details.title}`;
        } else {
            params_title += details.title;
        }

        // Render pose thumbnail images
        let midImageString = Base64.encodeDisplayObjectPNG(PoseThumbnail.createFramedBitmap(
            this._poses[0].sequence, this._poses[0].pairs, 4, PoseThumbnailType.WHITE
        ));

        let bigImageString: string = Base64.encodeDisplayObjectPNG(
            PoseThumbnail.createFramedBitmap(this._poses[0].sequence, this._poses[0].pairs, 2, PoseThumbnailType.WHITE)
        );

        post_params["title"] = params_title;
        post_params["secstruct"] = EPars.pairsToParenthesis(this.getCurrentTargetPairs(0));
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
                this.showNotification("Your puzzle has been successfully published.\n");
            })
            .catch((err) => {
                submitText.destroyObject();
                this.showNotification(`Puzzle submission failed: ${err}`);
            });
    }

    private setToNativeMode(): void {
        this._toolbar.targetButton.toggled.value = false;
        this._toolbar.naturalButton.toggled.value = true;

        this._toolbar.targetButton.hotkey(KeyCode.Space);
        this._toolbar.naturalButton.hotkey(null);

        this._paused = false;
        this.updateScore();
    }

    private setToTargetMode(): void {
        this._toolbar.targetButton.toggled.value = true;
        this._toolbar.naturalButton.toggled.value = false;

        this._toolbar.naturalButton.hotkey(KeyCode.Space);
        this._toolbar.targetButton.hotkey(null);

        for (let ii = 0; ii < this._poses.length; ii++) {
            this._poses[ii].pairs = EPars.parenthesisToPairs(this._structureInputs[ii].structureString);
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

    protected getCurrentUndoBlock(index: number): UndoBlock {
        return this._seqStack[this._stackLevel][index];
    }

    protected getCurrentTargetPairs(index: number): number[] {
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

        for (let ii = 0; ii < this._poses.length; ii++) {
            this._poses[ii].sequence = this._seqStack[this._stackLevel][ii].sequence;
            this._poses[ii].puzzleLocks = this._lockStack[this._stackLevel][ii];
            this._poses[ii].molecularStructure = this._targetPairsStack[this._stackLevel][ii];
            this._poses[ii].molecularBindingSite = this._bindingSiteStack[this._stackLevel][ii];
            this._structureInputs[ii].structureString = EPars.pairsToParenthesis(this._targetPairsStack[this._stackLevel][ii]);
        }

        this.updateScore();
    }

    private moveUndoStackBackward(): void {
        if (this._stackLevel < 1) {
            return;
        }

        this._stackLevel--;
        for (let ii = 0; ii < this._poses.length; ii++) {
            this._poses[ii].sequence = this._seqStack[this._stackLevel][ii].sequence;
            this._poses[ii].puzzleLocks = this._lockStack[this._stackLevel][ii];
            this._poses[ii].molecularStructure = this._targetPairsStack[this._stackLevel][ii];
            this._poses[ii].molecularBindingSite = this._bindingSiteStack[this._stackLevel][ii];
            this._structureInputs[ii].structureString = EPars.pairsToParenthesis(this._targetPairsStack[this._stackLevel][ii]);
        }
        this.updateScore();
    }

    private updateScore(): void {
        this.saveData();

        for (let ii = 0; ii < this._poses.length; ii++) {
            let undoblock: UndoBlock = this.getCurrentUndoBlock(ii);
            let target_pairs = this.getCurrentTargetPairs(ii);
            let best_pairs = undoblock.getPairs(EPars.DEFAULT_TEMPERATURE);
            let {sequence} = this._poses[ii];
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
            }, EPars.arePairsSame(best_pairs, target_pairs), 0);
            this._constraintBoxes[ii].display.scale.x = 1;
            this._constraintBoxes[ii].display.scale.y = 1;
        }

        let undoblock: UndoBlock = this.getCurrentUndoBlock(this._poses.length - 1);
        let num_AU: number = undoblock.getParam(UndoBlockParam.AU);
        let num_GU: number = undoblock.getParam(UndoBlockParam.GU);
        let num_GC: number = undoblock.getParam(UndoBlockParam.GC);

        this._toolbar.palette.setPairCounts(num_AU, num_GU, num_GC);
    }

    private onPaletteTargetSelected(type: PaletteTargetType): void {
        let baseType: number = GetPaletteTargetBaseType(type);
        for (let pose of this._poses) {
            pose.currentColor = baseType;
        }
    }

    private onEditButtonClicked(poseColor: number): void {
        for (let pose of this._poses) {
            pose.currentColor = poseColor;
        }
    }

    private poseEditByTarget(index: number): void {
        let no_change = true;
        let current_undo_blocks: UndoBlock[] = [];
        let current_target_pairs: number[][] = [];
        let current_lock: boolean[][] = [];
        let current_binding_sites: boolean[][] = [];

        let force_sequence = this._poses[index].sequence;
        let force_lock = this._poses[index].puzzleLocks;

        let different_structures = false;
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
            let lengths = "[";
            for (let ii = 0; ii < this._poses.length; ii++) {
                if (ii > 0) {
                    lengths += ",";
                }
                lengths += this._poses[ii].sequence.length.toString();
            }
            lengths += "]";

            for (let ii = 0; ii < this._poses.length; ii++) {
                this._structureInputs[ii].setWarning(`Structure lengths don't match ${lengths}.\nSequences won't be synced.`);
            }
        } else {
            for (let ii = 0; ii < this._poses.length; ii++) {
                this._structureInputs[ii].setWarning("");
            }
        }

        for (let ii = 0; ii < this._poses.length; ii++) {
            let target_pairs: number[] = EPars.parenthesisToPairs(this._structureInputs[ii].structureString);
            let seq = this._poses[ii].sequence;
            let lock = this._poses[ii].puzzleLocks;
            let binding_site = this._poses[ii].molecularBindingSite;

            if (this._stackLevel >= 0) {
                if (this._structureInputs[ii].structureString != EPars.pairsToParenthesis(this._targetPairsStack[this._stackLevel][ii])) {
                    no_change = false;
                }
                if (EPars.sequenceToString(seq) != EPars.sequenceToString(this._seqStack[this._stackLevel][ii].sequence)) {
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

            let is_there_molecule = false;
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
                let bonus = -486;
                let site: number[] = [];
                for (let bb = 0; bb < binding_site.length; bb++) {
                    if (binding_site[bb]) {
                        site.push(bb);
                    }
                }

                best_pairs = this._folder.foldSequenceWithBindingSite(seq, target_pairs, site, Number(bonus), 2.0);
            }

            let undo_block = new UndoBlock(seq);
            undo_block.setPairs(best_pairs);
            undo_block.setBasics(this._folder);
            current_undo_blocks.push(undo_block);
            current_lock.push(lock);
            current_binding_sites.push(binding_site);
            current_target_pairs.push(target_pairs);
        }
        if (no_change && this._stackLevel >= 0) {
            return;
        }

        // / Pushing undo block
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
    private readonly _initialPoseData: PuzzleEditPoseData[];

    private readonly _scriptInterface: ExternalInterfaceCtx = new ExternalInterfaceCtx();

    private _structureInputs: StructureInput[];
    protected _folder: Folder;
    private _seqStack: UndoBlock[][];
    private _targetPairsStack: number[][][];
    private _lockStack: boolean[][][];
    private _bindingSiteStack: boolean[][][];
    private _stackLevel: number;
    private _stackSize: number;
    private _paused: boolean;

    private _toolbar: Toolbar;
    private _folderButton: GameButton;
    private _homeButton: URLButton;
    private _constraintBoxes: ConstraintBox[] = [];
}

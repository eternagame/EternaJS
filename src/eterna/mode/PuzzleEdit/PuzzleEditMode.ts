import {DisplayObject, Point} from 'pixi.js';
import EPars from 'eterna/EPars';
import Eterna from 'eterna/Eterna';
import UndoBlock, {UndoBlockParam, TargetConditions} from 'eterna/UndoBlock';
import Background from 'eterna/vfx/Background';
import Molecule from 'eterna/pose2D/Molecule';
import BaseGlow from 'eterna/vfx/BaseGlow';
import Toolbar, {ToolbarType} from 'eterna/ui/Toolbar';
import PasteSequenceDialog from 'eterna/ui/PasteSequenceDialog';
import EternaViewOptionsDialog, {EternaViewOptionsMode} from 'eterna/ui/EternaViewOptionsDialog';
import PoseField from 'eterna/pose2D/PoseField';
import PuzzleEditOp from 'eterna/pose2D/PuzzleEditOp';
import Pose2D from 'eterna/pose2D/Pose2D';
import {PaletteTargetType, GetPaletteTargetBaseType} from 'eterna/ui/NucleotidePalette';
import Folder from 'eterna/folding/Folder';
import PoseThumbnail, {PoseThumbnailType} from 'eterna/ui/PoseThumbnail';
import {
    Base64, DisplayUtil, HAlign, VAlign, KeyCode, Assert
} from 'flashbang';
import {DialogCanceledError} from 'eterna/ui/Dialog';
import Vienna2 from 'eterna/folding/Vienna2';
import NuPACK from 'eterna/folding/NuPACK';
import AsyncProcessDialog from 'eterna/ui/AsyncProcessDialog';
import {ExternalInterfaceCtx} from 'eterna/util/ExternalInterface';
import URLButton from 'eterna/ui/URLButton';
import Fonts from 'eterna/util/Fonts';
import LinearFoldV from 'eterna/folding/LinearFoldV';
import LinearFoldC from 'eterna/folding/LinearFoldC';
import LinearFoldE from 'eterna/folding/LinearFoldE';
import EternaFold from 'eterna/folding/Eternafold';
import ConstraintBar from 'eterna/constraints/ConstraintBar';
import Utility from 'eterna/util/Utility';
import ShapeConstraint from 'eterna/constraints/constraints/ShapeConstraint';
import ContraFold from 'eterna/folding/Contrafold';
import {SaveStoreItem} from 'flashbang/settings/SaveGameManager';
import FolderSwitcher from 'eterna/ui/FolderSwitcher';
import GameButton from 'eterna/ui/GameButton';
import Bitmaps from 'eterna/resources/Bitmaps';
import EternaURL from 'eterna/net/EternaURL';
import CopyTextDialogMode from '../CopyTextDialogMode';
import GameMode from '../GameMode';
import SubmitPuzzleDialog, {SubmitPuzzleDetails} from './SubmitPuzzleDialog';
import StructureInput from './StructureInput';

type InteractionEvent = PIXI.interaction.InteractionEvent;

export interface PuzzleEditPoseData {
    sequence: string;
    structure: string;
}

// AMW TODO: we need the "all optional" impl for piece by piece buildup.
// Should be converted to an "all required" type for subsequent processing.
type SubmitPuzzleParams = {
    folder?: string;
    title?: string;
    secstruct?: string;
    constraints?: string;
    body?: string;
    midimgdata?: string;
    bigimgdata?: string;
    lock?: string;
    begin_sequence?: string;
    objectives?: string;
};

export default class PuzzleEditMode extends GameMode {
    constructor(embedded: boolean, numTargets?: number, poses?: SaveStoreItem) {
        super();
        this._embedded = embedded;

        if (poses != null && poses.length > 0) {
            // this is a safe type assertion because only the first two
            // items of SaveStoreItem are nonstring.
            const justPoses: string[] = poses.slice(2) as string[];
            this._initialPoseData = [];
            for (let justPose of justPoses) {
                this._initialPoseData.push(JSON.parse(justPose));
            }
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

        this._folderSwitcher = new FolderSwitcher();
        this._folderSwitcher.selectedFolder.connect((folder) => {
            if (folder.canScoreStructures) {
                for (let pose of this._poses) {
                    pose.scoreFolder = folder;
                }
            } else {
                for (let pose of this._poses) {
                    pose.scoreFolder = null;
                }
            }

            this.clearUndoStack();
            this.poseEditByTarget(0);
        });
        this._folderSwitcher.display.position = new Point(17, 175);
        this.addObject(this._folderSwitcher, this.uiLayer);

        this._homeButton = new GameButton()
            .up(Bitmaps.ImgHome)
            .over(Bitmaps.ImgHome)
            .down(Bitmaps.ImgHome);
        this._homeButton.display.position = new Point(18, 10);
        this._homeButton.clicked.connect(() => {
            if (Eterna.MOBILE_APP) {
                window.frameElement.dispatchEvent(new CustomEvent('navigate', {detail: '/'}));
            } else {
                window.location.href = EternaURL.createURL({page: 'lab_bench'});
            }
        });
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

        Assert.assertIsDefined(this._toolbar.zoomOutButton);
        this._toolbar.zoomOutButton.clicked.connect(() => {
            for (let poseField of this._poseFields) {
                poseField.zoomOut();
            }
        });

        Assert.assertIsDefined(this._toolbar.zoomInButton);
        this._toolbar.zoomInButton.clicked.connect(() => {
            for (let poseField of this._poseFields) {
                poseField.zoomIn();
            }
        });

        this._toolbar.copyButton.clicked.connect(() => {
            Assert.assertIsDefined(this.modeStack);
            this.modeStack.pushMode(new CopyTextDialogMode(
                EPars.sequenceToString(this._poses[0].sequence),
                'Current Sequence'
            ));
        });

        this._toolbar.pasteButton.clicked.connect(() => {
            let customNumbering = this._poses[0].customNumbering;
            this.showDialog(new PasteSequenceDialog(customNumbering)).closed.then((sequence) => {
                if (sequence != null) {
                    for (let pose of this._poses) {
                        pose.pasteSequence(sequence);
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

        this._toolbar.palette.targetClicked.connect((type) => this.onPaletteTargetSelected(type));

        if (this._embedded) {
            this._scriptInterface.addCallback('get_secstruct', () => this.structure);
            this._scriptInterface.addCallback('get_sequence', () => this.sequence);
            this._scriptInterface.addCallback('get_locks', () => this.getLockString());
            this._scriptInterface.addCallback('get_thumbnail', () => this.getThumbnailBase64);
            this._scriptInterface.addCallback('get_shift_limit', () => this.shiftLimitString);
        }

        this.clearUndoStack();

        let poseFields: PoseField[] = [];
        this._structureInputs = [];

        let setCB = (kk: number): void => {
            this._poses[kk].addBaseCallback = (
                parenthesis: string | null, op: PuzzleEditOp | null, index: number
            ): void => {
                Assert.assertIsDefined(parenthesis);
                let secInput: StructureInput = this._structureInputs[kk];
                secInput.structureString = parenthesis;
                secInput.setPose(op, index);
            };
        };

        let poseEditSetter = (index: number, poseToSet: Pose2D): void => {
            poseToSet.poseEditCallback = () => this.poseEditByTarget(index);
        };

        let bindMousedownEvent = (pose: Pose2D, index: number): void => {
            pose.startMousedownCallback = (e: InteractionEvent, closestDist: number, closestIndex: number): void => {
                for (let ii = 0; ii < this._numTargets; ++ii) {
                    let poseField: PoseField = poseFields[ii];
                    let poseToNotify = poseField.pose;
                    if (ii === index) {
                        poseToNotify.onPoseMouseDown(e, closestIndex);
                    } else {
                        poseToNotify.onPoseMouseDownPropagate(e, closestIndex);
                    }
                }
            };
        };

        // We don't appropriately handle these, so for now just force them off
        Eterna.settings.showRope.value = false;
        Eterna.settings.usePuzzlerLayout.value = false;

        let initialPoseData = this._initialPoseData;
        for (let ii = 0; ii < this._numTargets; ii++) {
            let defaultStructure = '.....((((((((....)))))))).....';
            let defaultPairs: number[] = EPars.parenthesisToPairs(defaultStructure);
            let defaultSequence = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

            if (initialPoseData != null
                && initialPoseData[ii] != null
                && initialPoseData[ii]['sequence'] != null
                && initialPoseData[ii]['structure'] != null
                && initialPoseData[ii]['structure'] !== ''
            ) {
                defaultStructure = initialPoseData[ii]['structure'];
                defaultSequence = initialPoseData[ii]['sequence'];
                defaultPairs = EPars.parenthesisToPairs(defaultStructure);
            }

            let poseField: PoseField = new PoseField(true);
            this.addObject(poseField, this.poseLayer);
            let {pose} = poseField;
            pose.scoreFolder = this._folder;
            pose.molecularStructure = defaultPairs;
            pose.molecularBindingBonus = -4.86;
            pose.sequence = EPars.stringToSequence(defaultSequence);
            poseFields.push(poseField);

            let structureInput = new StructureInput(pose);
            poseField.addObject(structureInput, poseField.container);
            if (!this._embedded) {
                structureInput.setSize(700 / this._numTargets, 50);
            } else {
                structureInput.setSize(500 / this._numTargets, 50);
            }

            structureInput.structureString = defaultStructure;
            this._structureInputs.push(structureInput);
        }

        this._constraintBar = new ConstraintBar(Utility.range(this._numTargets).map(
            (stateIndex) => new ShapeConstraint(stateIndex)
        ), this._numTargets);
        this.addObject(this._constraintBar, this.container);
        this._constraintBar.layout();

        this.setPoseFields(poseFields);
        this.poseEditByTarget(0);

        for (let ii = 0; ii < this._numTargets; ii++) {
            setCB(ii);
            poseEditSetter(ii, this._poses[ii]);

            if (this._embedded) {
                this._poses[ii].setZoomLevel(2, true, true);
            }

            bindMousedownEvent(this._poses[ii], ii);
        }

        this.setToTargetMode();
        this.onPaletteTargetSelected(PaletteTargetType.A);
        this.setPip(true);

        this.registerScriptInterface(this._scriptInterface);

        this.updateUILayout();
    }

    private saveData(): void {
        let objs: SaveStoreItem = [0, this._poses[0].sequence];
        for (let pose of this._poses) {
            Assert.assertIsDefined(pose.molecularStructure);
            objs.push(JSON.stringify({
                sequence: EPars.sequenceToString(pose.sequence),
                structure: EPars.pairsToParenthesis(pose.molecularStructure)
            }));
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
        return `puzeditv2_${numTargets}`;
    }

    public get structure(): string {
        return this._structureInputs[0].structureString;
    }

    public get sequence(): string {
        return EPars.sequenceToString(this._poses[0].sequence);
    }

    public getLockString(): string {
        let locks: boolean[] | undefined = this.getCurrentLock(0);
        let len: number = this._poses[0].sequence.length;
        let lockString = '';
        for (let ii = 0; ii < len; ii++) {
            if (locks && locks[ii]) {
                lockString += 'x';
            } else {
                lockString += 'o';
            }
        }

        return lockString;
    }

    public get shiftLimitString(): string {
        return '';
    }

    public getThumbnailBase64(): string {
        let img = PoseThumbnail.createFramedBitmap(
            this._poses[0].sequence, this._poses[0].pairs, 6, PoseThumbnailType.WHITE,
            0, null, false, 0, this._poses[0].customLayout
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
        pushVisibleState(this._constraintBar.display);

        for (let structureInput of this._structureInputs) {
            pushVisibleState(structureInput.display);
        }

        let energyVisible: boolean[] = [];
        let trackedCursorIdx: (number | null)[] = [];
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

        Assert.assertIsDefined(this.container);
        this.container.addChildAt(tempBG, 0);

        let info = `Player: ${Eterna.playerName}\n`
            + 'Player Puzzle Designer';
        let infoText = Fonts.std(info, 12).color(0xffffff).build();
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
        const PROMPT = 'Do you really want to reset?';

        this.showConfirmDialog(PROMPT).closed.then((confirmed) => {
            if (confirmed) {
                for (let pose of this._poses) {
                    let {sequence} = pose;
                    for (let ii = 0; ii < sequence.length; ii++) {
                        if (!pose.isLocked(ii)) {
                            sequence[ii] = EPars.RNABASE_ADENINE;
                        }
                    }

                    pose.puzzleLocks = undefined;
                    pose.sequence = sequence;
                    pose.molecularBindingSite = null;
                }
                this.poseEditByTarget(0);
            }
        });
    }

    private onSubmitPuzzle(): void {
        let firstSecstruct: string = this._structureInputs[0].structureString;

        if (!this._constraintBar.updateConstraints({
            undoBlocks: this._seqStack[this._stackLevel],
            targetConditions: this._targetConditions
        }) && !Eterna.DEV_MODE) {
            this.showNotification('You should first solve your puzzle before submitting it!');
            return;
        }

        for (let ii = 0; ii < this._poses.length; ii++) {
            let secstruct: string = this._structureInputs[ii].structureString;

            let lengthLimit = 400;
            if (Eterna.DEV_MODE) {
                lengthLimit = -1;
            }

            let error: string | null = EPars.validateParenthesis(secstruct, false, lengthLimit);
            if (error != null) {
                this.showNotification(error);
                return;
            }

            if (secstruct.length !== firstSecstruct.length) {
                this.showNotification("Structure lengths don't match");
                return;
            }

            if (this._poses[ii].checkOverlap() && !Eterna.DEV_MODE) {
                this.showNotification('Some bases overlapped too much!');
                return;
            }
        }

        let puzzleState = this.getCurrentUndoBlock(0);
        const PROMPT = 'You can only submit 3 puzzles per 24 hours.\nAre you sure you want to submit?';
        this.showConfirmDialog(PROMPT).confirmed
            .then(() => {
                let dialog = new SubmitPuzzleDialog(this._poses.length, puzzleState, this._savedInputs);
                dialog.saveInput.connect((e) => {
                    this._savedInputs = e;
                });
                return this.showDialog(dialog).confirmed;
            })
            .then((details) => {
                this.submitPuzzle(details);
            })
            .catch((err) => {
                if (!(err instanceof DialogCanceledError)) {
                    throw err;
                }
            });
    }

    private submitPuzzle(details: SubmitPuzzleDetails): void {
        let constraints = this._constraintBar.serializeConstraints();

        if (this._poses.length === 1) {
            let numPairs: number = EPars.numPairs(this.getCurrentTargetPairs(0));

            if (details.minGU !== undefined && details.minGU > 0) {
                constraints += `,GU,${details.minGU.toString()}`;
            }

            if (details.maxGC !== undefined && details.maxGC <= numPairs) {
                constraints += `,GC,${details.maxGC.toString()}`;
            }

            if (details.minAU !== undefined && details.minAU > 0) {
                constraints += `,AU,${details.minAU.toString()}`;
            }
        }

        let len: number = this._poses[0].sequence.length;

        let locks = this.getCurrentLock(0);
        let lockString = '';
        for (let ii = 0; ii < len; ii++) {
            if (locks && locks[ii]) {
                lockString += 'x';
            } else {
                lockString += 'o';
            }
        }

        let sequence: string = EPars.sequenceToString(this._poses[0].sequence);
        let beginningSequence = '';
        for (let ii = 0; ii < len; ii++) {
            if (locks && locks[ii]) {
                beginningSequence += sequence.substr(ii, 1);
            } else {
                beginningSequence += 'A';
            }
        }

        let objectives: TargetConditions[] = [];
        for (let ii = 0; ii < this._poses.length; ii++) {
            let objective: TargetConditions | null = null;
            let bindingSite: boolean[] | null = this.getCurrentBindingSite(ii);
            let bindingBases: number[] = [];
            if (bindingSite !== null) {
                for (let bb = 0; bb < bindingSite.length; bb++) {
                    if (bindingSite[bb]) {
                        bindingBases.push(bb);
                    }
                }
            }

            if (bindingBases.length > 0) {
                objective = {
                    type: 'aptamer',
                    secstruct: this._structureInputs[ii].structureString
                };
                objective['type'] = 'aptamer';
                objective['site'] = bindingBases;
                objective['concentration'] = 10000;
                objective['fold_version'] = 2.0;
            } else {
                objective = {
                    type: 'single',
                    secstruct: this._structureInputs[ii].structureString
                };
            }

            objectives.push(objective);
        }

        let postParams: SubmitPuzzleParams = {};

        postParams['folder'] = this._folder.name;
        let paramsTitle: string;
        if (this._folder.name === Vienna2.NAME) {
            paramsTitle = '[VRNA_2]';
        } else if (this._folder.name === NuPACK.NAME) {
            paramsTitle = '[NuPACK]';
        } else if (this._folder.name === LinearFoldC.NAME) {
            paramsTitle = '[LFC]';
        } else if (this._folder.name === LinearFoldV.NAME) {
            paramsTitle = '[LFV]';
        } else if (this._folder.name === LinearFoldE.NAME) {
            paramsTitle = '[LFE]';
        } else if (this._folder.name === EternaFold.NAME) {
            paramsTitle = '[EFOLD]';
        } else if (this._folder.name === ContraFold.NAME) {
            paramsTitle = '[CONTRA]';
        } else {
            paramsTitle = '';
        }
        if (this._poses.length > 1) {
            paramsTitle += `[switch2.5][${this._poses.length} states] ${details.title}`;
        } else {
            paramsTitle += details.title;
        }

        // Render pose thumbnail images
        let midImageString = Base64.encodeDisplayObjectPNG(PoseThumbnail.createFramedBitmap(
            this._poses[0].sequence, this._poses[0].pairs, 4, PoseThumbnailType.WHITE,
            0, null, false, 0, this._poses[0].customLayout
        ));

        let bigImageString: string = Base64.encodeDisplayObjectPNG(
            PoseThumbnail.createFramedBitmap(this._poses[0].sequence, this._poses[0].pairs, 2, PoseThumbnailType.WHITE,
                0, null, false, 0, this._poses[0].customLayout)
        );

        postParams['title'] = paramsTitle;
        postParams['secstruct'] = EPars.pairsToParenthesis(this.getCurrentTargetPairs(0));
        postParams['constraints'] = constraints;
        postParams['body'] = details.description;
        postParams['midimgdata'] = midImageString;
        postParams['bigimgdata'] = bigImageString;
        postParams['lock'] = lockString;
        postParams['begin_sequence'] = beginningSequence;
        postParams['objectives'] = JSON.stringify(objectives);

        let submitText = this.showDialog(new AsyncProcessDialog('Submitting...')).ref;
        Eterna.client.submitPuzzle(postParams)
            .then(() => {
                submitText.destroyObject();
                this.showNotification('Your puzzle has been successfully published.\n');
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
        this._toolbar.naturalButton.hotkey();

        this._paused = false;
        this.updateScore();
    }

    private setToTargetMode(): void {
        this._toolbar.targetButton.toggled.value = true;
        this._toolbar.naturalButton.toggled.value = false;

        this._toolbar.naturalButton.hotkey(KeyCode.Space);
        this._toolbar.targetButton.hotkey();

        for (let ii = 0; ii < this._poses.length; ii++) {
            this._poses[ii].pairs = EPars.parenthesisToPairs(this._structureInputs[ii].structureString);
        }
        this._paused = true;

        this.updateScore();
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

    private getCurrentLock(index: number): boolean[] | undefined {
        return this._lockStack[this._stackLevel][index];
    }

    private getCurrentBindingSite(index: number): boolean[] | null {
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
            this._structureInputs[ii].structureString = EPars.pairsToParenthesis(
                this._targetPairsStack[this._stackLevel][ii]
            );
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
            this._structureInputs[ii].structureString = EPars.pairsToParenthesis(
                this._targetPairsStack[this._stackLevel][ii]
            );
        }
        this.updateScore();
    }

    private updateScore(): void {
        this.saveData();

        for (let ii = 0; ii < this._poses.length; ii++) {
            let undoblock: UndoBlock = this.getCurrentUndoBlock(ii);
            let targetPairs = this.getCurrentTargetPairs(ii);
            let bestPairs = undoblock.getPairs(EPars.DEFAULT_TEMPERATURE);
            let {sequence} = this._poses[ii];
            if (sequence.length !== targetPairs.length) {
                throw new Error("sequence and design pairs lengths don't match");
            }

            if (this._paused) {
                this._poses[ii].pairs = targetPairs;
            } else {
                this._poses[ii].pairs = bestPairs;
            }

            this._constraintBar.updateConstraints({
                undoBlocks: this._seqStack[this._stackLevel]
            });
        }

        let undoblock: UndoBlock = this.getCurrentUndoBlock(this._poses.length - 1);
        let numAU: number = undoblock.getParam(UndoBlockParam.AU) as number;
        let numGU: number = undoblock.getParam(UndoBlockParam.GU) as number;
        let numGC: number = undoblock.getParam(UndoBlockParam.GC) as number;

        this._toolbar.palette.setPairCounts(numAU, numGU, numGC);
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

    // AMW TODO: PK awareness.
    private poseEditByTarget(index: number): void {
        let noChange = true;
        let currentUndoBlocks: UndoBlock[] = [];
        let currentTargetPairs: number[][] = [];
        let currentLock: (boolean[] | undefined)[] = [];
        let currentBindingSites: (boolean[] | null)[] = [];

        let forceSequence = this._poses[index].sequence;
        let forceLock = this._poses[index].puzzleLocks;

        let differentStructures = false;
        for (let ii = 0; ii < this._poses.length; ii++) {
            if (ii !== index) {
                if (this._poses[ii].sequence.length === forceSequence.length) {
                    this._poses[ii].sequence = forceSequence;
                    this._poses[ii].puzzleLocks = forceLock;
                } else {
                    differentStructures = true;
                }
            }
        }

        if (differentStructures) {
            let lengths = '[';
            for (let ii = 0; ii < this._poses.length; ii++) {
                if (ii > 0) {
                    lengths += ',';
                }
                lengths += this._poses[ii].sequence.length.toString();
            }
            lengths += ']';

            for (let ii = 0; ii < this._poses.length; ii++) {
                this._structureInputs[ii].setWarning(
                    `Structure lengths don't match ${lengths}.\nSequences won't be synced.`
                );
            }
        } else {
            for (let ii = 0; ii < this._poses.length; ii++) {
                this._structureInputs[ii].setWarning('');
            }
        }

        for (let ii = 0; ii < this._poses.length; ii++) {
            let targetPairs: number[] = EPars.parenthesisToPairs(this._structureInputs[ii].structureString);
            let seq = this._poses[ii].sequence;
            let lock: boolean[] | undefined = this._poses[ii].puzzleLocks;
            let bindingSite = this._poses[ii].molecularBindingSite;

            if (this._stackLevel >= 0) {
                if (
                    this._structureInputs[ii].structureString !== EPars.pairsToParenthesis(
                        this._targetPairsStack[this._stackLevel][ii]
                    ) || EPars.sequenceToString(seq) !== EPars.sequenceToString(
                        this._seqStack[this._stackLevel][ii].sequence
                    )
                ) {
                    noChange = false;
                }

                let lastLock: boolean[] | undefined = this._lockStack[this._stackLevel][ii];
                if (lock === null && lastLock !== null) {
                    noChange = false;
                } else if (lock !== null && lastLock === null) {
                    noChange = false;
                } else if (lock === null && lastLock === null) {
                    noChange = true;
                } else {
                    Assert.assertIsDefined(lastLock);
                    Assert.assertIsDefined(lock);
                    if (lastLock.length !== lock.length) {
                        noChange = false;
                    } else {
                        for (let ll = 0; ll < lock.length; ll++) {
                            if (lock[ll] !== lastLock[ll]) {
                                noChange = false;
                                break;
                            }
                        }
                    }
                }

                let lastBindingSite: boolean[] | null = this._bindingSiteStack[this._stackLevel][ii];
                if (lastBindingSite == null && bindingSite != null) {
                    noChange = false;
                } else if (lastBindingSite != null && bindingSite == null) {
                    noChange = false;
                } else if (lastBindingSite != null && bindingSite != null) {
                    if (lastBindingSite.length !== bindingSite.length) {
                        noChange = false;
                    } else {
                        for (let ll = 0; ll < bindingSite.length; ll++) {
                            if (bindingSite[ll] !== lastBindingSite[ll]) {
                                noChange = false;
                                break;
                            }
                        }
                    }
                }
            }

            let isThereMolecule = false;
            if (bindingSite != null) {
                for (let bb = 0; bb < bindingSite.length; bb++) {
                    if (bindingSite[bb]) {
                        isThereMolecule = true;
                        break;
                    }
                }
            }

            let bestPairs: number[] | null = null;
            if (!isThereMolecule) {
                // AMW: assuming no PKs
                bestPairs = this._folder.foldSequence(seq, null, null, false, EPars.DEFAULT_TEMPERATURE);
            } else {
                let bonus = -486;
                let site: number[] = [];
                if (bindingSite !== null) {
                    for (let bb = 0; bb < bindingSite.length; bb++) {
                        if (bindingSite[bb]) {
                            site.push(bb);
                        }
                    }
                }

                bestPairs = this._folder.foldSequenceWithBindingSite(seq, targetPairs, site, Number(bonus), 2.0);
            }
            Assert.assertIsDefined(bestPairs);
            let undoBlock = new UndoBlock(seq, this._folder.name);
            undoBlock.setPairs(bestPairs);
            undoBlock.setBasics();
            undoBlock.targetPairs = targetPairs;
            currentUndoBlocks.push(undoBlock);
            currentLock.push(lock);
            currentBindingSites.push(bindingSite);
            currentTargetPairs.push(targetPairs);
        }
        if (noChange && this._stackLevel >= 0) {
            return;
        }

        // / Pushing undo block
        this._stackLevel++;
        this._seqStack[this._stackLevel] = currentUndoBlocks;
        this._targetPairsStack[this._stackLevel] = currentTargetPairs;
        this._lockStack[this._stackLevel] = currentLock;
        this._bindingSiteStack[this._stackLevel] = currentBindingSites;
        this._stackSize = this._stackLevel + 1;

        this.updateScore();
    }

    private readonly _embedded: boolean;
    private readonly _numTargets: number;
    private readonly _initialPoseData: PuzzleEditPoseData[];

    private readonly _scriptInterface: ExternalInterfaceCtx = new ExternalInterfaceCtx();

    private _structureInputs: StructureInput[];
    protected get _folder(): Folder {
        return this._folderSwitcher.selectedFolder.value;
    }

    private _seqStack: UndoBlock[][];
    private _targetPairsStack: number[][][];
    private _lockStack: (boolean[] | undefined)[][];
    private _bindingSiteStack: (boolean[] | null)[][];
    private _stackLevel: number;
    private _stackSize: number;
    private _paused: boolean;
    private _savedInputs: SubmitPuzzleDetails;

    private _toolbar: Toolbar;
    private _folderSwitcher: FolderSwitcher;
    private _homeButton: GameButton;
    private _constraintBar: ConstraintBar;
}

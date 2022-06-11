import {DisplayObject, InteractionEvent} from 'pixi.js';
import EPars, {RNAPaint, RNABase} from 'eterna/EPars';
import Eterna from 'eterna/Eterna';
import UndoBlock, {UndoBlockParam, TargetConditions} from 'eterna/UndoBlock';
import Background from 'eterna/vfx/Background';
import Molecule from 'eterna/pose2D/Molecule';
import BaseGlow from 'eterna/vfx/BaseGlow';
import Toolbar, {ToolbarType} from 'eterna/ui/Toolbar';
import PasteSequenceDialog from 'eterna/ui/PasteSequenceDialog';
import EternaSettingsDialog, {EternaViewOptionsMode} from 'eterna/ui/EternaSettingsDialog';
import PoseField from 'eterna/pose2D/PoseField';
import PuzzleEditOp from 'eterna/pose2D/PuzzleEditOp';
import Pose2D, {Layout} from 'eterna/pose2D/Pose2D';
import {PaletteTargetType, GetPaletteTargetBaseType} from 'eterna/ui/NucleotidePalette';
import Folder from 'eterna/folding/Folder';
import PoseThumbnail, {PoseThumbnailType} from 'eterna/ui/PoseThumbnail';
import {
    Base64, DisplayUtil, HAlign, VAlign, KeyCode, Assert, KeyboardEventType
} from 'flashbang';
import {DialogCanceledError} from 'eterna/ui/Dialog';
import Vienna2 from 'eterna/folding/Vienna2';
import NuPACK from 'eterna/folding/NuPACK';
import AsyncProcessDialog from 'eterna/ui/AsyncProcessDialog';
import {ExternalInterfaceCtx} from 'eterna/util/ExternalInterface';
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
import SecStruct from 'eterna/rnatypes/SecStruct';
import Sequence from 'eterna/rnatypes/Sequence';
import ContextMenu from 'eterna/ui/ContextMenu';
import AnnotationManager, {
    AnnotationData,
    AnnotationDataBundle,
    AnnotationCategory,
    AnnotationRange
} from 'eterna/AnnotationManager';
import AnnotationDialog from 'eterna/ui/AnnotationDialog';
import CopyTextDialog from 'eterna/ui/CopyTextDialog';
import FileInputObject, {HTMLInputEvent} from 'eterna/ui/FileInputObject';
import Pose3D from 'eterna/pose3D/Pose3D';
import ErrorDialog from 'eterna/ui/ErrorDialog';
import GameMode from '../GameMode';
import SubmitPuzzleDialog, {SubmitPuzzleDetails} from './SubmitPuzzleDialog';
import StructureInput from './StructureInput';

export interface PuzzleEditPoseData {
    sequence: string;
    structure: string;
    annotations: AnnotationDataBundle;
    startingFolder: string;
    site?: number[];
    bindingPairs?: number[];
    bonus?: number;
}

// AMW TODO: we need the "all optional" impl for piece by piece buildup.
// Should be converted to an "all required" type for subsequent processing.
type SubmitPuzzleParams = {
    folder: string;
    title: string;
    secstruct: string;
    constraints?: string;
    body?: string;
    midimgdata: string;
    bigimgdata: string;
    lock: string;
    begin_sequence: string;
    objectives: string;
    'files[3d_structure]'?: File;
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
            for (const justPose of justPoses) {
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

        const background = new Background();
        this.addObject(background, this.bgLayer);

        // Initialize Molecule and BaseGlow textures if they're not already inited.
        // This prevents them from being lazily created when a new molecule is
        // created in the puzzle editor, which can cause a noticeable hitch in framerate
        Molecule.initTextures();
        BaseGlow.initTextures();

        this._folderSwitcher = new FolderSwitcher((folder) => {
            if (this._numTargets > 1 && !folder.canFoldWithBindingSite) return false;
            return true;
        });
        this._folderSwitcher.selectedFolder.connect((folder) => {
            if (folder.canScoreStructures) {
                for (const pose of this._poses) {
                    pose.scoreFolder = folder;
                }
            } else {
                for (const pose of this._poses) {
                    pose.scoreFolder = null;
                }
            }

            this.clearUndoStack();
            this.poseEditByTarget(0);
        });
        this.addObject(this._folderSwitcher, this.uiLayer);

        this._homeButton = new GameButton()
            .up(Bitmaps.ImgHome)
            .over(Bitmaps.ImgHome)
            .down(Bitmaps.ImgHome);
        this._homeButton.display.position.set(18, 10);
        this._homeButton.clicked.connect(() => {
            if (Eterna.MOBILE_APP) {
                if (window.frameElement) window.frameElement.dispatchEvent(new CustomEvent('navigate', {detail: '/'}));
            } else {
                window.location.href = EternaURL.createURL({page: 'home'});
            }
        });
        this.addObject(this._homeButton, this.uiLayer);

        const toolbarType = this._embedded ? ToolbarType.PUZZLEMAKER_EMBEDDED : ToolbarType.PUZZLEMAKER;

        this._annotationManager = new AnnotationManager(toolbarType);
        this._annotationManager.persistentAnnotationDataUpdated.connect(() => this.saveData());
        this._annotationManager.annotationEditRequested.connect((annotation: AnnotationData) => {
            if (annotation.ranges) {
                const dialog = new AnnotationDialog({
                    edit: true,
                    title: true,
                    sequenceLength: this._poses[0].fullSequenceLength,
                    customNumbering: this._poses[0].customNumbering,
                    initialRanges: annotation.ranges,
                    initialLayers: this._annotationManager.allLayers,
                    activeCategory: this._annotationManager.activeCategory,
                    initialAnnotation: annotation
                });
                dialog.onUpdateRanges.connect((ranges: AnnotationRange[] | null) => {
                    if (ranges) {
                        this._poses.forEach((pose) => pose.setAnnotationRanges(ranges));
                    }
                });
                this._annotationManager.persistentAnnotationDataUpdated.connect(() => {
                    dialog.layers = this._annotationManager.allLayers;
                });
                this.showDialog(dialog).closed.then((editedAnnotation: AnnotationData | null) => {
                    if (editedAnnotation) {
                        editedAnnotation.selected = false;
                        this._annotationManager.editAnnotation(editedAnnotation);
                    } else if (annotation) {
                        // We interpret null argument as delete intent when editing
                        this._annotationManager.deleteAnnotation(annotation);
                    }
                });
            }
        });

        this._toolbar = new Toolbar(toolbarType, {
            states: this._numTargets,
            annotationManager: this._annotationManager
        },
        {
            pairSwapButtonHandler: () => this.onEditButtonClicked(RNAPaint.PAIR),
            baseMarkerButtonHandler: () => this.onEditButtonClicked(RNAPaint.BASE_MARK),
            settingsButtonHandler: () => this.showSettingsDialog(),
            updateScriptViews: () => { this._resized.emit(); }
        });
        this.addObject(this._toolbar, this.uiLayer);
        this.addObject(this._toolbar.naturalButton, this.uiLayer);
        this.addObject(this._toolbar.targetButton, this.uiLayer);

        this._toolbar.addBaseButton.clicked.connect(() => this.onEditButtonClicked(RNAPaint.ADD_BASE));
        this._toolbar.addPairButton.clicked.connect(() => this.onEditButtonClicked(RNAPaint.ADD_PAIR));
        this._toolbar.deleteButton.clicked.connect(() => this.onEditButtonClicked(RNAPaint.DELETE));
        this._toolbar.lockButton.clicked.connect(() => this.onEditButtonClicked(RNAPaint.LOCK));
        this._toolbar.moleculeButton.clicked.connect(() => this.onEditButtonClicked(RNAPaint.BINDING_SITE));
        this._toolbar.pairSwapButton.clicked.connect(() => this.onEditButtonClicked(RNAPaint.PAIR));

        this._toolbar.naturalButton.clicked.connect(() => this.setToNativeMode());
        this._toolbar.targetButton.clicked.connect(() => this.setToTargetMode());
        this._toolbar.undoButton.clicked.connect(() => this.moveUndoStackBackward());
        this._toolbar.redoButton.clicked.connect(() => this.moveUndoStackForward());

        this._toolbar.screenshotButton.clicked.connect(() => this.postScreenshot(this.createScreenshot()));

        Assert.assertIsDefined(this._toolbar.zoomOutButton);
        this._toolbar.zoomOutButton.clicked.connect(() => {
            for (const poseField of this._poseFields) {
                poseField.zoomOut();
            }
        });

        Assert.assertIsDefined(this._toolbar.zoomInButton);
        this._toolbar.zoomInButton.clicked.connect(() => {
            for (const poseField of this._poseFields) {
                poseField.zoomIn();
            }
        });

        this._toolbar.copyButton.clicked.connect(() => {
            this.showDialog(new CopyTextDialog(this._poses[0].sequence.sequenceString(), 'Current Sequence'));
        });

        this._toolbar.pasteButton.clicked.connect(() => {
            const customNumbering = this._poses[0].customNumbering;
            this.showDialog(new PasteSequenceDialog(customNumbering)).closed.then((sequence) => {
                if (sequence != null) {
                    for (const pose of this._poses) {
                        pose.pasteSequence(sequence);
                    }
                }
            });
        });

        this._toolbar.resetButton.clicked.connect(() => this.promptForReset());
        this._toolbar.submitButton.clicked.connect(() => this.onSubmitPuzzle());

        this._toolbar.palette.targetClicked.connect((type) => this.onPaletteTargetSelected(type));

        this._toolbar.nucleotideFindButton.clicked.connect(() => this.findNucleotide());
        this._toolbar.nucleotideRangeButton.clicked.connect(() => this.showNucleotideRange());
        this._toolbar.explosionFactorButton.clicked.connect(() => this.changeExplosionFactor());

        this._toolbar.baseMarkerButton.clicked.connect(() => {
            this.onEditButtonClicked(RNAPaint.BASE_MARK);
        });

        this._toolbar.moveButton.clicked.connect(() => {
            this.setPosesLayoutTool(Layout.MOVE);
        });

        this._toolbar.rotateStemButton.clicked.connect(() => {
            this.setPosesLayoutTool(Layout.ROTATE_STEM);
        });

        this._toolbar.flipStemButton.clicked.connect(() => {
            this.setPosesLayoutTool(Layout.FLIP_STEM);
        });

        this._toolbar.snapToGridButton.clicked.connect(() => {
            for (const pose of this._poses) {
                pose.snapToGrid();
            }
        });

        this._toolbar.downloadHKWSButton.clicked.connect(() => {
            this.downloadHKWS();
        });

        this._toolbar.downloadSVGButton.clicked.connect(() => {
            this.downloadSVG();
        });

        this._toolbar.upload3DButton.clicked.connect(() => {
            const uploadButton = new FileInputObject({
                id: '3d-upload-file-input',
                width: 30,
                height: 30,
                acceptedFiletypes: '.cif,.pdb'
            });
            this.addObject(uploadButton);
            uploadButton.activateDialog();
            this.regs?.add(uploadButton.fileSelected.connect((e: HTMLInputEvent) => {
                const files = e.target.files;
                if (files && files[0]) {
                    Pose3D.checkModelFile(files[0], this.getCurrentUndoBlock(0).sequence.length).then(() => {
                        this.addPose3D(files[0]);
                    }).catch((err) => {
                        this.showDialog(new ErrorDialog(err));
                    });
                }
                this.removeObject(uploadButton);
            }));
        });

        if (this._embedded) {
            this._scriptInterface.addCallback('get_secstruct', () => this.structure);
            this._scriptInterface.addCallback('get_sequence', () => this.sequence);
            this._scriptInterface.addCallback('get_locks', () => this.getLockString());
            this._scriptInterface.addCallback('get_thumbnail', () => this.getThumbnailBase64);
            this._scriptInterface.addCallback('get_shift_limit', () => this.shiftLimitString);
        }

        this.clearUndoStack();

        const poseFields: PoseField[] = [];
        this._structureInputs = [];

        const poseEditSetter = (index: number, poseToSet: Pose2D): void => {
            poseToSet.poseEditCallback = () => this.poseEditByTarget(index);
        };

        const bindMousedownEvent = (pose: Pose2D, index: number): void => {
            pose.startMousedownCallback = (e: InteractionEvent, _closestDist: number, closestIndex: number): void => {
                for (let ii = 0; ii < this._numTargets; ++ii) {
                    const poseField: PoseField = poseFields[ii];
                    const poseToNotify = poseField.pose;
                    if (ii === index) {
                        poseToNotify.onPoseMouseDown(e, closestIndex);
                    } else {
                        poseToNotify.onPoseMouseDownPropagate(e, closestIndex);
                    }
                }
            };
            pose.startPickCallback = (closestIndex: number):void => {
                for (let ii = 0; ii < this._numTargets; ++ii) {
                    const poseField: PoseField = poseFields[ii];
                    const poseToNotify = poseField.pose;
                    if (ii === index) {
                        poseToNotify.onVirtualPoseMouseDown(closestIndex);
                    } else {
                        poseToNotify.onVirtualPoseMouseDownPropagate(closestIndex);
                    }
                }
            };
        };

        // We don't appropriately handle these, so for now just force them off
        Eterna.settings.showRope.value = false;
        Eterna.settings.usePuzzlerLayout.value = false;

        const initialPoseData = this._initialPoseData;
        for (let ii = 0; ii < this._numTargets; ii++) {
            let defaultStructure = '.....((((((((....)))))))).....';
            let defaultPairs: SecStruct = SecStruct.fromParens(defaultStructure);
            let defaultSequence = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

            if (initialPoseData != null
                && initialPoseData[ii] != null
                && initialPoseData[ii]['sequence'] != null
                && initialPoseData[ii]['structure'] != null
                && initialPoseData[ii]['structure'] !== ''
            ) {
                defaultStructure = initialPoseData[ii]['structure'];
                defaultSequence = initialPoseData[ii]['sequence'];
                defaultPairs = SecStruct.fromParens(defaultStructure);
            }

            const poseField: PoseField = new PoseField(true, this._annotationManager);
            this.addObject(poseField, this.poseLayer);
            const {pose} = poseField;
            pose.scoreFolder = this._folder;
            pose.molecularStructure = defaultPairs;
            pose.molecularBindingBonus = -4.86;
            pose.sequence = Sequence.fromSequenceString(defaultSequence);

            if (
                initialPoseData != null
                && initialPoseData[ii] != null
                && initialPoseData[ii]['site'] !== undefined
                && initialPoseData[ii]['bonus'] !== undefined
            ) {
                pose.molecularBindingBonus = initialPoseData[ii]['bonus'] as number / 100.0;
                const bindingSite = new Array(initialPoseData[ii]['sequence'].length).fill(false);
                for (const base of initialPoseData[ii]['site'] as number[]) {
                    bindingSite[base] = true;
                }
                pose.molecularBindingSite = bindingSite;
            }
            poseFields.push(poseField);

            const structureInput = new StructureInput(pose);
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

        // Must do this AFTER pose initialization
        if (
            initialPoseData != null
            && initialPoseData[0] != null
            && initialPoseData[0]['startingFolder'] != null
        ) {
            this._folderSwitcher.changeFolder(initialPoseData[0].startingFolder);
        }

        if (
            initialPoseData != null
            && initialPoseData[0] != null
            && initialPoseData[0]['annotations']
        ) {
            const defaultAnnotations = initialPoseData[0]['annotations'];
            this._annotationManager.setPuzzleAnnotations(defaultAnnotations.puzzle);
            this._annotationManager.setSolutionAnnotations(defaultAnnotations.solution);
        }

        this.poseEditByTarget(0);

        const setCB = (kk: number): void => {
            this._poses[kk].addBaseCallback = (
                parenthesis: string | null, op: PuzzleEditOp | null, index: number
            ): void => {
                Assert.assertIsDefined(parenthesis);
                const secInput: StructureInput = this._structureInputs[kk];
                secInput.structureString = parenthesis;
                secInput.setPose(op, index);
            };
        };
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

    public onKeyboardEvent(e: KeyboardEvent): void {
        let handled: boolean = this.keyboardInput.handleKeyboardEvent(e);

        if (!handled && e.type === KeyboardEventType.KEY_DOWN) {
            const key = e.code;
            const ctrl = e.ctrlKey;

            if (ctrl && key === KeyCode.KeyS) {
                this.downloadSVG();
                handled = true;
            } else if (ctrl && key === KeyCode.KeyH) {
                this.downloadHKWS();
                handled = true;
            } else if (key === KeyCode.BracketLeft) {
                const factor = Math.max(0, Math.round((this._poseFields[0].explosionFactor - 0.25) * 1000) / 1000);
                for (const pf of this._poseFields) {
                    pf.explosionFactor = factor;
                }
                handled = true;
            } else if (key === KeyCode.BracketRight) {
                const factor = Math.max(0, Math.round((this._poseFields[0].explosionFactor + 0.25) * 1000) / 1000);
                for (const pf of this._poseFields) {
                    pf.explosionFactor = factor;
                }
                handled = true;
            }
        }

        if (handled) {
            e.stopPropagation();
        }
    }

    private saveData(): void {
        const objs: SaveStoreItem = [0, this._poses[0].sequence.baseArray];
        for (const pose of this._poses) {
            Assert.assertIsDefined(pose.molecularStructure);
            objs.push(JSON.stringify({
                sequence: pose.sequence.sequenceString(),
                structure: pose.molecularStructure.getParenthesis(null, true),
                annotations: this._annotationManager.createAnnotationBundle()
            }));
        }

        Eterna.saveManager.save(this.savedDataTokenName, objs);
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
        return this._poses[0].sequence.sequenceString();
    }

    public getLockString(): string {
        const locks: boolean[] | undefined = this.getCurrentLock(0);
        const len: number = this._poses[0].sequence.length;
        const lockString = locks?.map(
            (l) => (l ? 'x' : 'o')
        ).join('') ?? 'o'.repeat(len);

        return lockString;
    }

    public get shiftLimitString(): string {
        return '';
    }

    public getThumbnailBase64(): string {
        const img = PoseThumbnail.createFramedBitmap(
            this._poses[0].sequence, this._poses[0].secstruct, 6, PoseThumbnailType.WHITE,
            0, null, false, 0, this._poses[0].customLayout
        );
        return Base64.encodeDisplayObjectPNG(img);
    }

    public onResized(): void {
        super.onResized();
        this.updateUILayout();
    }

    private updateUILayout(): void {
        let w = 17;
        const h = 175;
        DisplayUtil.positionRelativeToStage(
            this._toolbar.naturalButton.display, HAlign.LEFT, VAlign.TOP,
            HAlign.LEFT, VAlign.TOP, w, h
        );
        w += this._toolbar.naturalButton.display.width;
        DisplayUtil.positionRelativeToStage(
            this._toolbar.targetButton.display, HAlign.LEFT, VAlign.TOP,
            HAlign.LEFT, VAlign.TOP, w, h
        );

        this._folderSwitcher.display.position.set(17, h + this._toolbar.targetButton.display.height + 20);
        this._toolbar.onResized();

        const toolbarBounds = this._toolbar.display.getBounds();
        for (let ii = 0; ii < this._numTargets; ++ii) {
            const structureInput = this._structureInputs[ii];
            const poseField = this._poseFields[ii];
            if (!this._embedded) {
                structureInput.display.position.set(
                    (poseField.width - structureInput.width) * 0.5,
                    toolbarBounds.y - structureInput.height - 7
                );
            } else {
                structureInput.display.position.set(
                    (poseField.width - structureInput.width) * 0.5,
                    toolbarBounds.y - structureInput.height - 7
                );
            }
        }
    }

    /* override */
    protected createContextMenu(): ContextMenu | null {
        if (this.isDialogOrNotifShowing || this.hasUILock) {
            return null;
        }

        const menu = new ContextMenu({horizontal: false});

        menu.addItem('Preferences').clicked.connect(() => this.showSettingsDialog());
        menu.addItem('Reset').clicked.connect(() => this.promptForReset());
        menu.addItem('Copy Sequence').clicked.connect(() => this.showCopySequenceDialog());
        menu.addItem('Paste Sequence').clicked.connect(() => this.showPasteSequenceDialog());

        return menu;
    }

    protected showSettingsDialog() {
        const dialog: EternaSettingsDialog = new EternaSettingsDialog(EternaViewOptionsMode.PUZZLEMAKER);
        this.showDialog(dialog);
    }

    protected createScreenshot(): ArrayBuffer {
        const visibleState: Map<DisplayObject, boolean> = new Map();
        const pushVisibleState = (disp: DisplayObject) => {
            visibleState.set(disp, disp.visible);
            disp.visible = false;
        };

        pushVisibleState(this.bgLayer);
        pushVisibleState(this.uiLayer);
        pushVisibleState(this.dialogLayer);
        pushVisibleState(this.achievementsLayer);
        pushVisibleState(this._constraintBar.display);

        for (const structureInput of this._structureInputs) {
            pushVisibleState(structureInput.display);
        }

        const energyVisible: boolean[] = [];
        const trackedCursorIdx: (number | null)[] = [];
        for (const poseField of this._poseFields) {
            energyVisible.push(poseField.showTotalEnergy);
            poseField.showTotalEnergy = false;
        }
        for (const pose of this._poses) {
            trackedCursorIdx.push(pose.trackedCursorIdx);
            pose.trackCursor(-1);
        }

        const tempBG = DisplayUtil.fillStageRect(0x061A34);

        Assert.assertIsDefined(this.container);
        this.container.addChildAt(tempBG, 0);

        const info = `Player: ${Eterna.playerName}\n`
            + 'Player Puzzle Designer';
        const infoText = Fonts.std(info, 12).color(0xffffff).build();
        this.container.addChild(infoText);

        const pngData = DisplayUtil.renderToPNG(this.container);

        tempBG.destroy({children: true});
        infoText.destroy({children: true});

        for (const [disp, wasVisible] of visibleState.entries()) {
            disp.visible = wasVisible;
        }

        for (let ii = 0; ii < this._poseFields.length; ++ii) {
            this._poseFields[ii].showTotalEnergy = energyVisible[ii];
        }
        for (let ii = 0; ii < this._poses.length; ++ii) {
            this._poses[ii].trackCursor(trackedCursorIdx[ii]);
        }

        return pngData;
    }

    private promptForReset(): void {
        const PROMPT = 'Do you really want to reset?';

        this.showConfirmDialog(PROMPT).closed.then((confirmed) => {
            if (confirmed) {
                for (const pose of this._poses) {
                    const {sequence} = pose;
                    for (let ii = 0; ii < sequence.length; ii++) {
                        if (!pose.isLocked(ii)) {
                            sequence.setNt(ii, RNABase.ADENINE);
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
        const firstSecstruct: string = this._structureInputs[0].structureString;

        if (!this._constraintBar.updateConstraints({
            undoBlocks: this._seqStack[this._stackLevel],
            targetConditions: this._targetConditions
        }) && !Eterna.DEV_MODE) {
            this.showNotification('You should first solve your puzzle before submitting it!');
            return;
        }

        for (let ii = 0; ii < this._poses.length; ii++) {
            const secstruct: string = this._structureInputs[ii].structureString;

            const lengthLimit = Eterna.DEV_MODE ? -1 : 4000;

            const error: string | null = EPars.validateParenthesis(secstruct, false, lengthLimit);
            if (error != null) {
                this.showNotification(error);
                return;
            }

            if (secstruct.length !== firstSecstruct.length) {
                this.showNotification("Structure lengths don't match");
                return;
            }
        }

        if (this._structureInputs.some(
            (si) => SecStruct.fromParens(si.structureString, true).onlyPseudoknots().nonempty()
        ) && !this._folder.canPseudoknot) {
            this.showNotification('You need to select the NuPACK folder, because '
                + 'your puzzle specification has a pseudoknot.');
            return;
        }

        const puzzleState = this.getCurrentUndoBlock(0);
        const PROMPT = 'You can only submit 3 puzzles per 24 hours.\nAre you sure you want to submit?';
        this.showConfirmDialog(PROMPT).confirmed
            .then(() => {
                const dialog = new SubmitPuzzleDialog(this._poses.length, puzzleState, this._savedInputs);
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

    private folderNameMap(name: string): string {
        if (name === Vienna2.NAME) {
            return '[VRNA_2]';
        } else if (name === NuPACK.NAME) {
            return '[NuPACK]';
        } else if (name === LinearFoldC.NAME) {
            return '[LFC]';
        } else if (name === LinearFoldV.NAME) {
            return '[LFV]';
        } else if (name === LinearFoldE.NAME) {
            return '[LFE]';
        } else if (name === EternaFold.NAME) {
            return '[EFOLD]';
        } else if (name === ContraFold.NAME) {
            return '[CONTRA]';
        } else {
            return '';
        }
    }

    private submitPuzzle(details: SubmitPuzzleDetails): void {
        let constraints = this._constraintBar.serializeConstraints();

        if (this._poses.length === 1) {
            const numPairs: number = this.getCurrentTargetPairs(0).numPairs();

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

        const len: number = this._poses[0].sequence.length;
        const locks = this.getCurrentLock(0);
        const lockString = this.getLockString();

        const sequence: string = this._poses[0].sequence.sequenceString();
        const beginningSequence = locks?.map(
            (l, ii) => (l ? sequence.substr(ii, 1) : 'A')
        ).join('') ?? 'A'.repeat(len);

        const objectives: TargetConditions[] = [];
        for (let ii = 0; ii < this._poses.length; ii++) {
            const bindingSite: boolean[] | null = this.getCurrentBindingSite(ii);
            const bindingBases: number[] = [];
            if (bindingSite !== null) {
                for (let bb = 0; bb < bindingSite.length; bb++) {
                    if (bindingSite[bb]) {
                        bindingBases.push(bb);
                    }
                }
            }

            const pseudoknots: boolean = SecStruct.fromParens(this._structureInputs[ii].structureString, true)
                .onlyPseudoknots().nonempty();

            let objective = this._targetConditions[ii];
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
                    type: pseudoknots ? 'pseudoknot' : 'single',
                    secstruct: this._structureInputs[ii].structureString,
                    'custom-layout': this._poses[ii].customLayout,
                    annotations: this._annotationManager.categoryAnnotationData(AnnotationCategory.PUZZLE)
                };
            }

            objectives.push(objective);
        }

        let paramsTitle: string = this.folderNameMap(this._folder.name);

        if (this._poses.length > 1) {
            paramsTitle += `[switch2.5][${this._poses.length} states] ${details.title}`;
        } else {
            paramsTitle += details.title;
        }

        // Render pose thumbnail images
        const midImageString = Base64.encodeDisplayObjectPNG(PoseThumbnail.createFramedBitmap(
            this._poses[0].sequence, this._poses[0].secstruct, 4, PoseThumbnailType.WHITE,
            0, null, false, 0, this._poses[0].customLayout
        ));

        const bigImageString: string = Base64.encodeDisplayObjectPNG(
            PoseThumbnail.createFramedBitmap(this._poses[0].sequence, this._poses[0].secstruct, 2,
                PoseThumbnailType.WHITE, 0, null, false, 0, this._poses[0].customLayout)
        );

        const postParams: SubmitPuzzleParams = {
            folder: this._folder.name,
            title: paramsTitle,
            secstruct: this.getCurrentTargetPairs(0).getParenthesis(undefined, true),
            constraints,
            body: details.description,
            midimgdata: midImageString,
            bigimgdata: bigImageString,
            lock: lockString,
            // eslint-disable-next-line camelcase
            begin_sequence: beginningSequence,
            objectives: JSON.stringify(objectives)
        };

        if (this._pose3D?.structureFile instanceof File) {
            const blob = this._pose3D?.structureFile.slice();
            postParams['files[3d_structure]'] = new File([blob], this._pose3D?.structureFile.name);
        }

        const submitText = this.showDialog(new AsyncProcessDialog('Submitting...')).ref;
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
            this._poses[ii].secstruct = SecStruct.fromParens(this._structureInputs[ii].structureString, true);
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
        this._customLayoutStack = [];
    }

    protected getCurrentUndoBlock(index: number): UndoBlock {
        return this._seqStack[this._stackLevel][index];
    }

    protected getCurrentTargetPairs(index: number): SecStruct {
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
            this._poses[ii].customLayout = this._customLayoutStack[this._stackLevel][ii] ?? undefined;
            this._structureInputs[ii].structureString = this._targetPairsStack[this._stackLevel][ii]
                .getParenthesis(undefined, true);
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
            this._poses[ii].customLayout = this._customLayoutStack[this._stackLevel][ii] ?? undefined;
            this._structureInputs[ii].structureString = this._targetPairsStack[this._stackLevel][ii]
                .getParenthesis(undefined, true);
        }
        this.updateScore();
    }

    private updateScore(): void {
        this.saveData();

        for (let ii = 0; ii < this._poses.length; ii++) {
            const undoblock: UndoBlock = this.getCurrentUndoBlock(ii);
            const targetPairs = this.getCurrentTargetPairs(ii);
            const bestPairs = undoblock.getPairs(EPars.DEFAULT_TEMPERATURE);
            const {sequence} = this._poses[ii];
            if (sequence.length !== targetPairs.length) {
                throw new Error("sequence and design pairs lengths don't match");
            }

            if (this._paused) {
                this._poses[ii].secstruct = targetPairs;
            } else {
                this._poses[ii].secstruct = bestPairs;
            }

            this._constraintBar.updateConstraints({
                undoBlocks: this._seqStack[this._stackLevel]
            });
        }

        if (this._pose3D) this._pose3D.sequence.value = this.getCurrentUndoBlock(0).sequence;

        const undoblock: UndoBlock = this.getCurrentUndoBlock(this._poses.length - 1);
        const numAU: number = undoblock.getParam(UndoBlockParam.AU) as number;
        const numGU: number = undoblock.getParam(UndoBlockParam.GU) as number;
        const numGC: number = undoblock.getParam(UndoBlockParam.GC) as number;

        this._toolbar.palette.setPairCounts(numAU, numGU, numGC);
    }

    private onPaletteTargetSelected(type: PaletteTargetType): void {
        const baseType: number = GetPaletteTargetBaseType(type);
        for (const pose of this._poses) {
            pose.currentColor = baseType;
        }
    }

    // AMW TODO: called "setPosesColor" in PoseEditMode
    private onEditButtonClicked(poseColor: number): void {
        for (const pose of this._poses) {
            pose.currentColor = poseColor;
        }
    }

    public setPosesLayoutTool(layoutTool: Layout): void {
        for (const pose of this._poses) {
            pose.currentArrangementTool = layoutTool;
        }
    }

    private poseEditByTarget(index: number): void {
        let noChange = true;
        const currentUndoBlocks: UndoBlock[] = [];
        const currentTargetPairs: SecStruct[] = [];
        const currentLock: (boolean[] | undefined)[] = [];
        const currentBindingSites: (boolean[] | null)[] = [];
        const currentCustomLayouts: (([number, number] | [null, null])[] | null)[] = [];

        const forceSequence = this._poses[index].sequence;
        const forceLock = this._poses[index].puzzleLocks;

        let differentStructures = false;
        this._poses.forEach(
            (pose: Pose2D, ii: number) => {
                if (ii !== index) {
                    if (pose.sequence.length === forceSequence.length) {
                        pose.sequence = forceSequence;
                        pose.puzzleLocks = forceLock;
                    } else {
                        differentStructures = true;
                    }
                }
            }
        );

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
            const targetPairs: SecStruct = SecStruct.fromParens(this._structureInputs[ii].structureString, true);
            // The pose needs to be able to use this for visualization editing
            this._poses[ii].targetPairs = targetPairs.slice(0);
            const pseudoknots: boolean = targetPairs.onlyPseudoknots().nonempty();
            const seq = this._poses[ii].sequence;
            const lock: boolean[] | undefined = this._poses[ii].puzzleLocks;
            const bindingSite = this._poses[ii].molecularBindingSite;
            const customLayout = this._poses[ii].customLayout;

            if (this._stackLevel >= 0) {
                if (
                    this._structureInputs[ii].structureString !== (
                        this._targetPairsStack[this._stackLevel][ii].getParenthesis(undefined, true)
                    ) || seq.sequenceString() !== this._seqStack[this._stackLevel][ii].sequence.sequenceString()
                ) {
                    noChange = false;
                }

                const lastLock: boolean[] | undefined = this._lockStack[this._stackLevel][ii];
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

                const lastCustomLayout = this._customLayoutStack[this._stackLevel][ii];
                if (lastCustomLayout == null && customLayout != null) {
                    noChange = false;
                } else if (lastCustomLayout != null && customLayout == null) {
                    noChange = false;
                } else if (lastCustomLayout != null && customLayout != null) {
                    if (lastCustomLayout.length !== customLayout.length) {
                        noChange = false;
                    } else {
                        for (let ll = 0; ll < customLayout.length; ll++) {
                            if (customLayout[ll] !== lastCustomLayout[ll]) {
                                noChange = false;
                                break;
                            }
                        }
                    }
                }

                const lastBindingSite: boolean[] | null = this._bindingSiteStack[this._stackLevel][ii];
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

            const isThereMolecule = bindingSite != null && bindingSite.some((bb) => bb);

            let bestPairs: SecStruct | null = null;
            if (!isThereMolecule) {
                bestPairs = this._folder.foldSequence(seq, null, null, pseudoknots, EPars.DEFAULT_TEMPERATURE);
            } else {
                const bonus = -486;
                const site: number[] = bindingSite
                    ? bindingSite
                        .map((bb, idx) => (bb ? idx : -1))
                        .filter((idx) => idx !== -1)
                    : [];

                bestPairs = this._folder.foldSequenceWithBindingSite(
                    seq, targetPairs, site, Number(bonus), 2.0
                );
            }
            Assert.assertIsDefined(bestPairs);
            const undoBlock = new UndoBlock(seq, this._folder.name);
            undoBlock.setPairs(bestPairs);
            undoBlock.setBasics();
            undoBlock.targetPairs = targetPairs;
            currentUndoBlocks.push(undoBlock);
            currentLock.push(lock);
            currentBindingSites.push(bindingSite);
            currentCustomLayouts.push(customLayout || null);
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
        this._customLayoutStack[this._stackLevel] = currentCustomLayouts;
        this._stackSize = this._stackLevel + 1;

        this.updateScore();
    }

    private readonly _embedded: boolean;
    private readonly _numTargets: number;
    private readonly _initialPoseData: PuzzleEditPoseData[];

    private readonly _scriptInterface: ExternalInterfaceCtx = new ExternalInterfaceCtx();

    private _structureInputs: StructureInput[] = [];
    protected get _folder(): Folder {
        return this._folderSwitcher.selectedFolder.value;
    }

    private _seqStack: UndoBlock[][];
    private _targetPairsStack: SecStruct[][];
    private _lockStack: (boolean[] | undefined)[][];
    private _bindingSiteStack: (boolean[] | null)[][];
    private _customLayoutStack: (([number, number] | [null, null])[] | null)[][];
    private _stackLevel: number;
    private _stackSize: number;
    private _paused: boolean;
    private _savedInputs: SubmitPuzzleDetails;

    private _toolbar: Toolbar;
    private _folderSwitcher: FolderSwitcher;
    private _homeButton: GameButton;
    private _constraintBar: ConstraintBar;

    // Annotations
    private _annotationManager: AnnotationManager;
}

import EPars from "eterna/EPars";
import { Molecule } from "eterna/diagram";
import { BaseGlow } from "eterna/vfx";
import { EternaViewOptionsMode, GetPaletteTargetBaseType } from "eterna/ui";
import PoseEditMode from "../PoseEditMode/PoseEditMode";
import { ToolbarType } from "eterna/ui/Toolbar";
import { Puzzle } from "eterna/puzzle";
import { SecondaryStructure } from "eterna/util/RNA";
import { ShapeConstraint } from "eterna/constraints";

export interface PuzzleMakerPoseData {
    sequence: string;
    structure: string;
}

/**
 * Mode for creating new puzzles
 */
export default class PuzzleMakerMode extends PoseEditMode {
    constructor(embedded: boolean, numTargets: number = 1, initialPoseData?: PuzzleMakerPoseData[]) {
        super();

        this._embedded = embedded;

        this._puzzle = new Puzzle([], []);

        for (let i = 0; i < numTargets; i++) {
            if (
                initialPoseData != null
                && initialPoseData[i] != null
                && initialPoseData[i]["sequence"] != null
                && initialPoseData[i]["structure"] != null
                && initialPoseData[i]["structure"] != ""
            ) {
                // sequence = initialPoseData[i]["sequence"];
                this._puzzle.stateConditions.push({targetStructure: new SecondaryStructure(initialPoseData[i]["structure"])});
            } else {
                // sequence = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
                this._puzzle.stateConditions.push({targetStructure: new SecondaryStructure(".....((((((((....)))))))).....")});
            }
            this._puzzle.constraints.push(new ShapeConstraint(i));
        }
    }

    protected setup(): void {
        super.setup();

        // Initialize Molecule and BaseGlow textures if they're not already inited.
        // This prevents them from being lazily created when a new molecule is
        // created in the puzzle editor, which can cause a noticeable hitch in framerate
        Molecule.initTextures();
        BaseGlow.initTextures();

        /*
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
        */

        this._toolbar.undoButton.clicked.connect(() => this.moveUndoStackBackward());
        this._toolbar.redoButton.clicked.connect(() => this.moveUndoStackForward());
        this._toolbar.naturalButton.clicked.connect(() => this.toggleMode());
        this._toolbar.copyButton.clicked.connect(() => this.showCopySequenceDialog());
        this._toolbar.pasteButton.clicked.connect(() =>  this.showPasteSequenceDialog());
        this._toolbar.resetButton.clicked.connect(() => this.showResetPrompt());
        this._toolbar.palette.targetClicked.connect(type => this.changePaintTool(GetPaletteTargetBaseType(type)));
        this._toolbar.pairSwapButton.clicked.connect(() => this.changePaintTool(EPars.RNABASE_PAIR, this._toolbar.pairSwapButton));

        this._toolbar.addbaseButton.clicked.connect(() => this.changePaintTool(EPars.RNABASE_ADD_BASE, this._toolbar.addbaseButton));
        this._toolbar.addpairButton.clicked.connect(() => this.changePaintTool(EPars.RNABASE_ADD_PAIR, this._toolbar.addpairButton));
        this._toolbar.deleteButton.clicked.connect(() => this.changePaintTool(EPars.RNABASE_DELETE, this._toolbar.deleteButton));
        this._toolbar.lockButton.clicked.connect(() => this.changePaintTool(EPars.RNABASE_LOCK, this._toolbar.lockButton));
        this._toolbar.moleculeButton.clicked.connect(() => this.changePaintTool(EPars.RNABASE_BINDING_SITE, this._toolbar.moleculeButton));

        this._toolbar.submitButton.clicked.connect(() => this.onSubmitPuzzle());

        if (this._embedded) {
            /*
            this._scriptInterface.addCallback("get_secstruct", () => this.structure);
            this._scriptInterface.addCallback("get_sequence", () => this.sequence);
            this._scriptInterface.addCallback("get_locks", () => this.getLockString());
            this._scriptInterface.addCallback("get_thumbnail", () => this.getThumbnailBase64);
            */
        }

        /*for (let pose of this._poses) {
            pose.addBaseCallback = (parenthesis: string) => {
                // TODO
                //this._structureInputs[kk].structureString = parenthesis;
            }

            if (this._embedded) {
                pose.setZoomLevel(2, true, true);
            }
        }*/
    }

    // TODO
    private onSubmitPuzzle(){}

    protected readonly _viewOptionsMode: EternaViewOptionsMode = EternaViewOptionsMode.PUZZLEMAKER;
    protected get _toolbarType() {
        return this._embedded ? ToolbarType.PUZZLEMAKER : ToolbarType.PUZZLEMAKER_EMBEDDED;
    }

    private readonly _embedded: boolean;
}
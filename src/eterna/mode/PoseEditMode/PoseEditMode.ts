import { Container } from "pixi.js";
import EPars from "eterna/EPars";
import { GetPaletteTargetBaseType, GameButton, PaletteTargetType } from "eterna/ui";
import {PoseMode} from "eterna/mode";
import { StateCondition } from "eterna/puzzle/Puzzle";
import DesignPanel from "eterna/diagram/DesignPanel";

/**
 * Base mode for modes which allow for RNA sequence changes
 */
export default abstract class PoseEditMode extends PoseMode {
    public readonly constraintsLayer = new Container();

    protected setup() {
        super.setup();

        this._toolbar.palette.targetClicked.connect((targetType) => this.changePaintTool(GetPaletteTargetBaseType(targetType)));
        this._toolbar.pairSwapButton.clicked.connect(() => this.changePaintTool(EPars.RNABASE_PAIR, this._toolbar.pairSwapButton));
        this._toolbar.naturalButton.clicked.connect(() => this.toggleMode());
        this._toolbar.undoButton.clicked.connect(() => this.moveUndoStackBackward());
        this._toolbar.redoButton.clicked.connect(() => this.moveUndoStackForward());
        this._toolbar.resetButton.clicked.connect(() => this.showResetPrompt());
        this._toolbar.copyButton.clicked.connect(() => this.showCopySequenceDialog());
        this._toolbar.pasteButton.clicked.connect(() =>  this.showPasteSequenceDialog());
        this._toolbar.freezeButton.clicked.connect(() => this.toggleFreeze());
        this._toolbar.palette.clickTarget(PaletteTargetType.A);

        this.uiLayer.addChild(this.constraintsLayer);
        this.constraintsLayer.visible = true;

        for (let constraint of this._puzzle.constraints) {
            this.addObject(constraint.constraintBox);
            constraint.constraintBox.pointerDown.connect(() => {
                // TODO: onConstraintBoxClicked
            });
            constraint.constraintBox.display.visible = false;
        }
    }

    protected createDesignPanel(): DesignPanel {
        return super.createDesignPanel();
        /*let poseField = super.createPose(stateCondition);

        poseField.pose.poseEditCallback = (): void => this.onPoseEdit(stateCondition);

        return poseField;*/
    }

    // TODO
    protected changePaintTool(toolID: number, button?: GameButton) {}
    protected toggleMode() {}
    protected moveUndoStackBackward() {}
    protected moveUndoStackForward() {}
    protected showResetPrompt() {}
    protected showCopySequenceDialog() {}
    protected showPasteSequenceDialog() {}
    protected toggleFreeze() {}
    private onPoseEdit(stateCondition: StateCondition): void {}

    protected _posesEditable = true;
}
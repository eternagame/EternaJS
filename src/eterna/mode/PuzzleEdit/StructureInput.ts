import {Rectangle} from 'pixi.js';
import EPars from 'eterna/EPars';
import Eterna from 'eterna/Eterna';
import {
    KeyCode, DisplayUtil, HAlign, VAlign, Updatable, ContainerObject
} from 'flashbang';
import Pose2D from 'eterna/pose2D/Pose2D';
import TextInputObject from 'eterna/ui/TextInputObject';
import TextBalloon from 'eterna/ui/TextBalloon';
import PuzzleEditOp from 'eterna/pose2D/PuzzleEditOp';
import Fonts from 'eterna/util/Fonts';
import UITheme from 'eterna/ui/UITheme';

function IsArrowKey(keyCode: string): boolean {
    return keyCode === KeyCode.ArrowRight
        || keyCode === KeyCode.ArrowLeft
        || keyCode === KeyCode.ArrowUp
        || keyCode === KeyCode.ArrowDown;
}

export default class StructureInput extends ContainerObject implements Updatable {
    constructor(pose: Pose2D) {
        super();
        this._pose = pose;
    }

    protected added(): void {
        super.added();

        this._textInput = new TextInputObject({fontSize: 20})
            .font(Fonts.STDFONT)
            .disallow(/[^.()]/g)
            .bold();
        this.addObject(this._textInput, this.container);

        this._errorText = new TextBalloon('', 0x0, 0.8);
        this._errorText.display.visible = false;
        this._errorText.display.position.y = -45;
        this.addObject(this._errorText, this.container);

        this.setSize(100, 50);

        this._textInput.valueChanged.connect(() => this.setPose());
        this._textInput.element.onkeydown = (e) => {
            // Prevent arrow key presses from moving the pose around
            if (IsArrowKey(e.code)) {
                e.stopPropagation();
            }
        };

        // Prevent PoseField from adding a drag surface since we're not trying to drag
        this.pointerDown.connect((e) => { e.stopPropagation(); });
    }

    public update(dt: number): void {
        // Update the cursor highlight when our caret position changes
        if (this._prevCaretPostion !== this._textInput.caretPosition) {
            this._prevCaretPostion = this._textInput.caretPosition;
            this._pose.trackCursor(this._textInput.caretPosition);
        }
    }

    public setSize(width: number, height: number): void {
        this._textInput.width = width - 20;
        DisplayUtil.positionRelative(
            this._textInput.display, HAlign.CENTER, VAlign.CENTER,
            this.container, HAlign.CENTER, VAlign.CENTER
        );

        this.display.hitArea = new Rectangle(0, 0, width, height);
    }

    /**
     * Take the actual current input data and use it to update the Pose.
     *
     * @param op an "operation" (either adding or deleting a base or a base pair)
     * @param index where in the structure the operation should take place
     */
    public setPose(op: PuzzleEditOp | null = null, index: number = -1): void {
        let input = this._textInput.text;
        input = input.replace(/[^.()]/g, '');
        // Replace () with (.) -- () is illegal and causes an error
        input = input.replace(/\(\)/g, '(.)');

        let error: string | null = EPars.validateParenthesis(input, false, Eterna.MAX_PUZZLE_EDIT_LENGTH);
        this.setWarning(error || '');
        this._textInput.text = input;

        let {sequence} = this._pose;
        let locks = this._pose.puzzleLocks;
        let bindingSite = this._pose.molecularBindingSite;
        let sequenceBackup = this._pose.sequence;
        let locksBackup = this._pose.puzzleLocks;
        let bindingSiteBackup = this._pose.molecularBindingSite;

        if (sequence.length > input.length) {
            sequence = sequence.slice(0, input.length);
            if (locks) locks = locks.slice(0, input.length);
            if (bindingSite) bindingSite = bindingSite.slice(0, input.length);
        }

        for (let ii: number = sequence.length; ii < input.length; ii++) {
            sequence.push(EPars.RNABASE_ADENINE);
            if (locks) locks.push(false);
            if (bindingSite) bindingSite.push(false);
        }

        if (op === PuzzleEditOp.ADD_BASE) {
            // Add a base
            let afterIndex = sequence.slice(index);
            let afterLockIndex = locks ? locks.slice(index) : null;
            let afterBindingSiteIndex = bindingSite ? bindingSite.slice(index) : null;
            sequence[index] = EPars.RNABASE_ADENINE;
            if (locks) locks[index] = false;
            if (bindingSite) bindingSite[index] = false;

            for (let ii = 0; ii < afterIndex.length - 1; ii++) {
                sequence[ii + index + 1] = afterIndex[ii];
                if (locks && afterLockIndex) locks[ii + index + 1] = afterLockIndex[ii];
                if (bindingSite && afterBindingSiteIndex) bindingSite[ii + index + 1] = afterBindingSiteIndex[ii];
            }
        } else if (op === PuzzleEditOp.ADD_PAIR) {
            // Add a pair
            let pindex: number = (this._pose.pairs)[index];
            if (index > pindex) {
                let temp: number = index;
                index = pindex;
                pindex = temp;
            }
            let afterIndex = sequence.slice(index);
            let afterLockIndex = locks ? locks.slice(index) : null;
            let afterBindingSiteIndex = bindingSite ? bindingSite.slice(index) : null;

            sequence[index] = EPars.RNABASE_ADENINE;
            sequence[pindex + 2] = EPars.RNABASE_ADENINE;
            if (locks) locks[index] = false;
            if (locks) locks[pindex + 2] = false;
            if (bindingSite) bindingSite[index] = false;
            if (bindingSite) bindingSite[pindex + 2] = false;

            for (let ii = 0; ii < afterIndex.length - 2; ii++) {
                if (ii + index > pindex) {
                    sequence[ii + index + 2] = afterIndex[ii];
                    if (locks && afterLockIndex) locks[ii + index + 2] = afterLockIndex[ii];
                    if (bindingSite && afterBindingSiteIndex) bindingSite[ii + index + 2] = afterBindingSiteIndex[ii];
                } else {
                    sequence[ii + index + 1] = afterIndex[ii];
                    if (locks && afterLockIndex) locks[ii + index + 1] = afterLockIndex[ii];
                    if (bindingSite && afterBindingSiteIndex) bindingSite[ii + index + 1] = afterBindingSiteIndex[ii];
                }
            }
        } else if (op === PuzzleEditOp.ADD_CYCLE) {
            // Add a cycle of length 3
            let afterIndex = sequence.slice(index);
            let afterLockIndex = locks ? locks.slice(index) : null;
            let afterBindingSiteIndex = bindingSite ? bindingSite.slice(index) : null;

            sequence[index] = EPars.RNABASE_ADENINE;
            sequence[index + 1] = EPars.RNABASE_ADENINE;
            sequence[index + 2] = EPars.RNABASE_ADENINE;
            sequence[index + 3] = EPars.RNABASE_ADENINE;
            sequence[index + 4] = EPars.RNABASE_ADENINE;

            if (locks) {
                locks[index] = false;
                locks[index + 1] = false;
                locks[index + 2] = false;
                locks[index + 3] = false;
                locks[index + 4] = false;
            }

            if (bindingSite) {
                bindingSite[index] = false;
                bindingSite[index + 1] = false;
                bindingSite[index + 2] = false;
                bindingSite[index + 3] = false;
                bindingSite[index + 4] = false;
            }

            for (let ii = 0; ii < afterIndex.length - 5; ii++) {
                sequence[ii + index + 5] = afterIndex[ii];
                if (locks && afterLockIndex) locks[ii + index + 5] = afterLockIndex[ii];
                if (bindingSite && afterBindingSiteIndex) bindingSite[ii + index + 5] = afterBindingSiteIndex[ii];
            }
        } else if (op === PuzzleEditOp.DELETE_PAIR) {
            // Delete a pair
            let pindex = (this._pose.pairs)[index];
            if (index > pindex) {
                let temp = index;
                index = pindex;
                pindex = temp;
            }
            let afterIndex = sequenceBackup.slice(index + 1);
            let afterLockIndex = locksBackup ? locksBackup.slice(index + 1) : null;
            let afterBindingSiteIndex = bindingSiteBackup ? bindingSiteBackup.slice(index + 1) : null;

            for (let ii = 0; ii < afterIndex.length - 1; ii++) {
                if (ii + index >= pindex - 1) {
                    sequence[ii + index] = afterIndex[ii + 1];
                    if (locks && afterLockIndex) locks[ii + index] = afterLockIndex[ii + 1];
                    if (bindingSite && afterBindingSiteIndex) bindingSite[ii + index] = afterBindingSiteIndex[ii + 1];
                } else {
                    sequence[ii + index] = afterIndex[ii];
                    if (locks && afterLockIndex) locks[ii + index] = afterLockIndex[ii];
                    if (bindingSite && afterBindingSiteIndex) bindingSite[ii + index] = afterBindingSiteIndex[ii];
                }
            }
        } else if (op === PuzzleEditOp.DELETE_BASE) {
            // Delete a base
            let afterIndex = sequenceBackup.slice(index + 1);
            let afterLockIndex = locksBackup ? locksBackup.slice(index + 1) : null;
            let afterBindingSiteIndex = bindingSiteBackup ? bindingSiteBackup.slice(index + 1) : null;

            for (let ii = 0; ii < afterIndex.length; ii++) {
                sequence[ii + index] = afterIndex[ii];
                if (locks && afterLockIndex) locks[ii + index] = afterLockIndex[ii];
                if (bindingSite && afterBindingSiteIndex) bindingSite[ii + index] = afterBindingSiteIndex[ii];
            }
        }
        this._pose.sequence = sequence;
        this._pose.puzzleLocks = locks;
        this._pose.molecularBindingSite = bindingSite;
        this._pose.trackCursor(this._textInput.caretPosition);
        try {
            this._pose.molecularStructure = EPars.parenthesisToPairs(this.structureString);
        } catch (e) {
            // Invalid parenthesis notation error will warn the user per the earlier validateParenthesis call
            // Don't return to poseedit since it'll just break with the malformed structure
            return;
        }
        this._pose.callPoseEditCallback();
    }

    public get structureString(): string {
        let secstruct: string = this._textInput.text;
        return secstruct.replace(/[^.()]/g, '');
    }

    public set structureString(struct: string) {
        this._textInput.text = struct;
        this.setWarning('');
    }

    public setWarning(warning: string): void {
        if (warning && warning.length > 0) {
            this._textInput.borderColor(0xAA0000);
            this._errorText.setText(warning);
            this._errorText.display.visible = true;
        } else {
            this._textInput.borderColor(UITheme.textInput.colors.border);
            this._errorText.setText('');
            this._errorText.display.visible = false;
        }
    }

    public get width() {
        return this._textInput.width;
    }

    public get height() {
        return this._textInput.height;
    }

    private readonly _pose: Pose2D;
    private _textInput: TextInputObject;
    private _prevCaretPostion: number | null = -1;
    private _errorText: TextBalloon;
}

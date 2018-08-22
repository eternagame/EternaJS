import {Point} from "pixi.js";
import {Updatable} from "../../../flashbang/core/Updatable";
import {KeyCode} from "../../../flashbang/input/KeyCode";
import {EPars} from "../../EPars";
import {Pose2D} from "../../pose2D/Pose2D";
import {PuzzleEditOp} from "../../pose2D/PuzzleEditOp";
import {GamePanel} from "../../ui/GamePanel";
import {TextInputObject} from "../../ui/TextInputObject";
import {Fonts} from "../../util/Fonts";

function IsArrowKey(keyCode: string): boolean {
    return keyCode === KeyCode.ArrowRight ||
        keyCode === KeyCode.ArrowLeft ||
        keyCode === KeyCode.ArrowUp ||
        keyCode === KeyCode.ArrowDown;
}

export class StructureInput extends GamePanel implements Updatable {
    public constructor(pose: Pose2D) {
        super();
        this._pose = pose;
    }

    protected added(): void {
        super.added();

        this._width = 100;
        this._height = 50;

        this._textInput = new TextInputObject(20)
            .font(Fonts.ARIAL)
            .disallow(/[^\.\(\)]/g)
            .bold();
        this._textInput.width = this._width - 20;
        this._textInput.display.position = new Point(10, 10);
        this.addObject(this._textInput, this.container);

        this._textInput.valueChanged.connect(() => this.set_pose());
        this._textInput.element.onkeydown = (e) => {
            // Prevent arrow key presses from moving the pose around
            if (IsArrowKey(e.code)) {
                e.stopPropagation();
            }
        };
    }

    public update(dt: number): void {
        // Update the cursor highlight when our caret position changes
        if (this._prevCaretPostion != this._textInput.caretPosition) {
            this._prevCaretPostion = this._textInput.caretPosition;
            this._pose.track_cursor(this._textInput.caretPosition);
        }
    }

    public set_size(width: number, height: number): void {
        super.set_size(width, height);
        this._textInput.width = width - 20;
    }

    public set_pose(op: PuzzleEditOp = null, index: number = -1): void {
        let cur_sec: string = this._textInput.text;
        let length_limit: number = 400;

        let error: string = EPars.validate_parenthesis(cur_sec, false, length_limit);
        if (error != null) {
            this.set_warning(error);
            cur_sec = cur_sec.replace(/[^\.\(\)]/g, "");
            this._textInput.text = cur_sec;
        } else {
            this.set_warning("");
        }

        let sequence = this._pose.get_sequence();
        let locks = this._pose.get_puzzle_locks();
        let binding_site = this._pose.get_molecular_binding_site();
        let sequence_backup = this._pose.get_sequence();
        let locks_backup = this._pose.get_puzzle_locks();
        let binding_site_backup = this._pose.get_molecular_binding_site();

        if (sequence.length > cur_sec.length) {
            sequence = sequence.slice(0, cur_sec.length);
            locks = locks.slice(0, cur_sec.length);
            binding_site = binding_site.slice(0, cur_sec.length);
        }

        for (let ii: number = sequence.length; ii < cur_sec.length; ii++) {
            sequence.push(EPars.RNABASE_ADENINE);
            locks.push(false);
            binding_site.push(false);
        }

        // BASE SHIFTING MODIFIED HERE. Delete comments to apply the changes
        if (op == PuzzleEditOp.ADD_BASE) {
            // Add a base
            let after_index = sequence.slice(index);
            let after_lock_index = locks.slice(index);
            let after_binding_site_index = binding_site.slice(index);
            sequence[index] = EPars.RNABASE_ADENINE;
            locks[index] = false;
            binding_site[index] = false;

            for (let ii = 0; ii < after_index.length - 1; ii++) {
                sequence[ii + index + 1] = after_index[ii];
                locks[ii + index + 1] = after_lock_index[ii];
                binding_site[ii + index + 1] = after_binding_site_index[ii];
            }
        } else if (op == PuzzleEditOp.ADD_PAIR) {
            // Add a pair
            let pindex: number = (this._pose.get_pairs())[index];
            if (index > pindex) {
                let temp: number = index;
                index = pindex;
                pindex = temp;
            }
            let after_index = sequence.slice(index);
            let after_lock_index = locks.slice(index);
            let after_binding_site_index = binding_site.slice(index);

            sequence[index] = EPars.RNABASE_ADENINE;
            sequence[pindex + 2] = EPars.RNABASE_ADENINE;
            locks[index] = false;
            locks[pindex + 2] = false;
            binding_site[index] = false;
            binding_site[pindex + 2] = false;

            for (let ii = 0; ii < after_index.length - 2; ii++) {
                if (ii + index > pindex) {
                    sequence[ii + index + 2] = after_index[ii];
                    locks[ii + index + 2] = after_lock_index[ii];
                    binding_site[ii + index + 2] = after_binding_site_index[ii];
                } else {
                    sequence[ii + index + 1] = after_index[ii];
                    locks[ii + index + 1] = after_lock_index[ii];
                    binding_site[ii + index + 1] = after_binding_site_index[ii];
                }

            }

        } else if (op == PuzzleEditOp.ADD_CYCLE) {
            // Add a cycle of length 3
            let after_index = sequence.slice(index);
            let after_lock_index = locks.slice(index);
            let after_binding_site_index = binding_site.slice(index);

            sequence[index] = EPars.RNABASE_ADENINE;
            sequence[index + 1] = EPars.RNABASE_ADENINE;
            sequence[index + 2] = EPars.RNABASE_ADENINE;
            sequence[index + 3] = EPars.RNABASE_ADENINE;
            sequence[index + 4] = EPars.RNABASE_ADENINE;

            locks[index] = false;
            locks[index + 1] = false;
            locks[index + 2] = false;
            locks[index + 3] = false;
            locks[index + 4] = false;

            binding_site[index] = false;
            binding_site[index + 1] = false;
            binding_site[index + 2] = false;
            binding_site[index + 3] = false;
            binding_site[index + 4] = false;

            for (let ii = 0; ii < after_index.length - 5; ii++) {
                sequence[ii + index + 5] = after_index[ii];
                locks[ii + index + 5] = after_lock_index[ii];
                binding_site[ii + index + 5] = after_binding_site_index[ii];
            }

        } else if (op == PuzzleEditOp.DELETE_PAIR) {
            // Delete a pair
            let pindex = (this._pose.get_pairs())[index];
            if (index > pindex) {
                let temp = index;
                index = pindex;
                pindex = temp;
            }
            let after_index = sequence_backup.slice(index + 1);
            let after_lock_index = locks_backup.slice(index + 1);
            let after_binding_site_index = binding_site_backup.slice(index + 1);

            for (let ii = 0; ii < after_index.length - 1; ii++) {
                if (ii + index >= pindex - 1) {
                    sequence[ii + index] = after_index[ii + 1];
                    locks[ii + index] = after_lock_index[ii + 1];
                    binding_site[ii + index] = after_binding_site_index[ii + 1];
                } else {
                    sequence[ii + index] = after_index[ii];
                    locks[ii + index] = after_lock_index[ii];
                    binding_site[ii + index] = after_binding_site_index[ii];
                }
            }

        } else if (op == PuzzleEditOp.DELETE_BASE) {
            // Delete a base
            let after_index = sequence_backup.slice(index + 1);
            let after_lock_index = locks_backup.slice(index + 1);
            let after_binding_site_index = binding_site_backup.slice(index + 1);

            for (let ii = 0; ii < after_index.length; ii++) {
                sequence[ii + index] = after_index[ii];
                locks[ii + index] = after_lock_index[ii];
                binding_site[ii + index] = after_binding_site_index[ii];
            }
        }
        this._pose.set_sequence(sequence);
        this._pose.set_puzzle_locks(locks);
        this._pose.set_molecular_structure(EPars.parenthesis_to_pair_array(this.get_secstruct()));
        this._pose.set_molecular_binding_site(binding_site);
        this._pose.call_pose_edit_callback();

        this._pose.track_cursor(this._textInput.caretPosition);
    }

    public get_secstruct(): string {
        let secstruct: string = this._textInput.text;
        return secstruct.replace(/[^\.\(\)]/g, "");
    }

    public set_secstruct(struct: string): void {
        this._textInput.text = struct;
        this.set_warning("");
    }

    public set_warning(warning: string): void {
        if (warning && warning.length > 0) {
            this.setup(0, 0.5, 0xAA0000, 0.0, 0);
            // this.set_mouse_over_object(new TextBalloon(warning, 0x0, 0.8), 1.0);
        } else {
            this.setup(0, 0.07, 0xFFFFFF, 0.0, 0);
            // this.set_mouse_over_object(null, 0);
        }
    }

    private readonly _pose: Pose2D;
    private _textInput: TextInputObject;
    private _prevCaretPostion: number = -1;

}

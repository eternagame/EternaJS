import {Flashbang} from "../../../flashbang/core/Flashbang";
import {KeyCode} from "../../../flashbang/input/KeyCode";
import {Dialog} from "../../ui/Dialog";
import {TextInputPanel} from "../../ui/TextInputPanel";

/** Allows the user to copy the current sequence. */
export class CopySequenceDialog extends Dialog<void> {
    public constructor(sequence: string) {
        super();
        this._sequence = sequence;
    }

    protected added(): void {
        super.added();

        let inputPanel = new TextInputPanel();
        inputPanel.set_title("Current sequence");
        let sequenceField = inputPanel.add_field("Sequence", 200);
        sequenceField.text = this._sequence;
        sequenceField.readOnly = true;
        this.addObject(inputPanel, this.container);

        sequenceField.setFocus(true);

        inputPanel.set_hotkeys(KeyCode.Enter, null, KeyCode.Escape, null);

        inputPanel.display.position.x = (Flashbang.stageWidth - inputPanel.get_panel_width()) * 0.5;
        inputPanel.display.position.y = (Flashbang.stageHeight - inputPanel.get_panel_height()) * 0.5;

        inputPanel.cancelClicked.connect(() => this.close(null));
        inputPanel.okClicked.connect(() => this.close(null));
    }

    private readonly _sequence: string;
}

import {Flashbang} from "../../../flashbang/core/Flashbang";
import {KeyCode} from "../../../flashbang/input/KeyCode";
import {Application} from "../../Application";
import {Dialog} from "../../ui/Dialog";
import {TextInputPanel} from "../../ui/TextInputPanel";

/**
 * Prompts the user to paste a sequence.
 * If OK is pressed, the dialog will be closed with the sequence string.
 */
export class PasteSequenceDialog extends Dialog<string> {
    protected added(): void {
        super.added();

        const SEQUENCE: string = "Sequence";

        let inputPanel = new TextInputPanel();
        let sequenceField = inputPanel.add_field(SEQUENCE, 200);
        inputPanel.set_title("Write down a sequence");
        this.addObject(inputPanel, this.container);

        sequenceField.setFocus(true);

        inputPanel.set_hotkeys(KeyCode.Enter, null, KeyCode.Escape, null);

        inputPanel.cancelClicked.connect(() => this.close(null));
        inputPanel.okClicked.connect(values => this.onSequenceEntered(values.get(SEQUENCE)));

        let updateLocation = () => {
            inputPanel.display.position.x = (Flashbang.stageWidth - inputPanel.get_panel_width()) * 0.5;
            inputPanel.display.position.y = (Flashbang.stageHeight - inputPanel.get_panel_height()) * 0.5;
        };
        updateLocation();
        this.regs.add(this.mode.resized.connect(updateLocation));
    }

    private onSequenceEntered(sequence: string): void {
        sequence = sequence.toUpperCase();

        for (let ii = 0; ii < sequence.length; ii++) {
            let char = sequence.substr(ii, 1);
            if (char !== "A" && char !== "U" && char !== "G" && char !== "C") {
                Application.instance.setup_msg_box("You can only use characters A, U, G, and C");
                return;
            }
        }

        this.close(sequence);
    }
}

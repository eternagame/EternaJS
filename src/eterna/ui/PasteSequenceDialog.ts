import {KeyCode, Flashbang} from 'flashbang';
import GameMode from 'eterna/mode/GameMode';
import Dialog from './Dialog';
import TextInputPanel from './TextInputPanel';

/**
 * Prompts the user to paste a sequence.
 * If OK is pressed, the dialog will be closed with the sequence string.
 */
export default class PasteSequenceDialog extends Dialog<string> {
    protected added(): void {
        super.added();

        const SEQUENCE = 'Sequence';

        let inputPanel = new TextInputPanel();
        let sequenceField = inputPanel.addField(SEQUENCE, 200);
        inputPanel.title = 'Write down a sequence';
        this.addObject(inputPanel, this.container);

        sequenceField.setFocus(true);

        inputPanel.setHotkeys(KeyCode.Enter, null, KeyCode.Escape, null);

        inputPanel.cancelClicked.connect(() => this.close(null));
        inputPanel.okClicked.connect((values) => this.onSequenceEntered(values.get(SEQUENCE)));

        let updateLocation = () => {
            inputPanel.display.position.x = (Flashbang.stageWidth - inputPanel.width) * 0.5;
            inputPanel.display.position.y = (Flashbang.stageHeight - inputPanel.height) * 0.5;
        };
        updateLocation();
        this.regs.add(this.mode.resized.connect(updateLocation));
    }

    private onSequenceEntered(sequence: string): void {
        sequence = sequence.toUpperCase();

        for (let ii = 0; ii < sequence.length; ii++) {
            let char = sequence.substr(ii, 1);
            if (char !== 'A' && char !== 'U' && char !== 'G' && char !== 'C') {
                (this.mode as GameMode).showNotification('You can only use characters A, U, G, and C');
                return;
            }
        }

        this.close(sequence);
    }
}

import {KeyCode, Flashbang} from 'flashbang';
import GameMode from 'eterna/mode/GameMode';
import EPars from 'eterna/EPars';
import Dialog from './Dialog';
import TextInputPanel from './TextInputPanel';

/**
 * Prompts the user to paste a sequence.
 * If OK is pressed, the dialog will be closed with array of numbers (ADENOSINE,...)
 *  corresponding to sequence string.
 */
export default class PasteSequenceDialog extends Dialog<number[]> {
    constructor(customNumbering: number[] = null) {
        super();
        this._customNumbering = customNumbering;
    }

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
        sequence = sequence.toUpperCase().replace(/T/g, 'U');
        // make paste entry robust to blanks, and allow index specification after sequence.
        let seq = sequence.split(' ')[0];
        for (const char of seq) {
            if (char !== 'A' && char !== 'U' && char !== 'G' && char !== 'C') {
                (this.mode as GameMode).showNotification('You can only use characters A, C, G, T, and U');
                return;
            }
        }
        let s = EPars.indexedStringToSequence(sequence, this._customNumbering);
        if (s == null && seq.length > 0) {
            (this.mode as GameMode).showNotification(
                'Problem with how you formatted any input numbers after the sequence'
            );
            return;
        }
        this.close(s);
    }

    private readonly _customNumbering: number[];
}

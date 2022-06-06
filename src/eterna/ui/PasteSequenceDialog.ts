import {KeyCode, Assert} from 'flashbang';
import GameMode from 'eterna/mode/GameMode';
import EPars from 'eterna/EPars';
import Sequence from 'eterna/rnatypes/Sequence';
import FlexibleTextInputPanel from './FlexibleTextInputPanel';
import FloatDialog from './FloatDialog';

/**
 * Prompts the user to paste a sequence.
 * If OK is pressed, the dialog will be closed with array of numbers (ADENOSINE,...)
 *  corresponding to sequence string.
 */
export default class PasteSequenceDialog extends FloatDialog<Sequence> {
    constructor(customNumbering?: (number | null)[] | undefined) {
        super('Write down a sequence');
        this._customNumbering = customNumbering;
    }

    protected added(): void {
        super.added();

        const SEQUENCE = 'Sequence';

        const inputPanel = new FlexibleTextInputPanel();
        const sequenceField = inputPanel.addField(SEQUENCE, 200);
        this.addObject(inputPanel, this.contentVLay);

        sequenceField.setFocus(true);

        inputPanel.setHotkeys(KeyCode.Enter, undefined, KeyCode.Escape, undefined);

        inputPanel.cancelClicked.connect(() => this.close(null));
        inputPanel.okClicked.connect((values) => this.onSequenceEntered(values.get(SEQUENCE)));

        this.updateFloatLocation();
    }

    private onSequenceEntered(sequence: string | undefined): void {
        Assert.assertIsDefined(sequence);
        sequence = sequence.toUpperCase().replace(/T/g, 'U');
        // make paste entry robust to blanks, and allow index specification after sequence.
        const seq = sequence.split(' ')[0];
        for (const char of seq) {
            if (char !== 'A' && char !== 'U' && char !== 'G' && char !== 'C') {
                (this.mode as GameMode).showNotification('You can only use characters A, C, G, T, and U');
                return;
            }
        }
        const s = EPars.indexedStringToSequence(sequence, this._customNumbering);
        if (s === undefined && seq.length > 0) {
            (this.mode as GameMode).showNotification(
                'Problem with how you formatted any input numbers after the sequence'
            );
            return;
        }
        this.close(s as Sequence);
    }

    private readonly _customNumbering: (number | null)[] | undefined;
}

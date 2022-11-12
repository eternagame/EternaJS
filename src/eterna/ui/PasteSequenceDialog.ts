import {Assert, VLayoutContainer} from 'flashbang';
import EPars from 'eterna/EPars';
import Sequence from 'eterna/rnatypes/Sequence';
import {Signal} from 'signals';
import {Text} from 'pixi.js';
import Fonts from 'eterna/util/Fonts';
import WindowDialog from './WindowDialog';
import TextInputGrid from './TextInputGrid';
import GameButton from './GameButton';
import TextInputObject from './TextInputObject';

export default class PasteSequenceDialog extends WindowDialog<void> {
    public readonly applyClicked: Signal<Sequence> = new Signal();

    constructor(customNumbering: (number | null)[] | undefined) {
        super({title: 'Paste a sequence'});
        this._customNumbering = customNumbering;
    }

    protected added(): void {
        super.added();

        this._content = new VLayoutContainer(20);
        this._window.content.addChild(this._content);

        this._errorText = Fonts.std()
            .fontSize(14)
            .color(0xff7070)
            .bold()
            .build();
        this._errorText.visible = false;
        this._content.addChild(this._errorText);

        const inputGrid = new TextInputGrid(undefined, this._window.contentHtmlWrapper);
        this._sequenceField = inputGrid.addField('Sequence', 200);
        this.addObject(inputGrid, this._content);

        const applyButton = new GameButton().label('Apply', 14);
        this.addObject(applyButton, this._content);

        applyButton.clicked.connect(() => this.onApply(this._sequenceField.text));
        this._sequenceField.keyPressed.connect((key) => {
            if (key === 'Enter') this.onApply(this._sequenceField.text);
        });

        this._content.layout();
        this._window.layout();
    }

    private onApply(sequence: string | undefined): void {
        const prevText = this._errorText.text;
        const wasVisible = this._errorText.visible;

        Assert.assertIsDefined(sequence);
        sequence = sequence.toUpperCase().replace(/T/g, 'U');
        // make paste entry robust to blanks, and allow index specification after sequence.
        const seq = sequence.split(' ')[0];

        const validSeq = seq.split('').every((char) => char === 'A' || char === 'U' || char === 'G' || char === 'C');
        if (seq.length === 0) {
            this._errorText.text = 'Please enter a sequence';
            this._errorText.visible = true;
        } else if (!validSeq) {
            this._errorText.text = 'You can only use characters A, C, G, T, and U';
            this._errorText.visible = true;
        } else {
            const s = EPars.indexedStringToSequence(sequence, this._customNumbering);
            if (s === undefined) {
                this._errorText.text = 'There was a problem with how you formatted'
                    + 'any input numbers after the sequence';
                this._errorText.visible = true;
            } else {
                this._errorText.visible = false;
                this.applyClicked.emit(s);
            }
        }

        this._sequenceField.setFocus(true);

        if (this._errorText.visible !== wasVisible || prevText !== this._errorText.text) {
            this._content.layout(true);
            this._window.layout();
        }
    }

    private _content: VLayoutContainer;
    private _errorText: Text;
    private _sequenceField: TextInputObject;

    private readonly _customNumbering: (number | null)[] | undefined;
}

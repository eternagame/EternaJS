import Fonts from 'eterna/util/Fonts';
import {HLayoutContainer, VLayoutContainer} from 'flashbang';
import {Text} from 'pixi.js';
import {Signal} from 'signals';
import GameButton from './GameButton';
import TextInputGrid from './TextInputGrid';
import WindowDialog from './WindowDialog';

export default class NucleotideRangeSelector extends WindowDialog<void> {
    public readonly applyClicked: Signal<{
        start: number,
        end: number
    }> = new Signal();

    constructor(fullRange: [number, number], initialRange: [number, number]) {
        super({title: 'Set Visible Nucleotides'});
        this._fullRange = fullRange;
        this._initialRange = initialRange;
    }

    protected added() {
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
        const startField = inputGrid.addField('First Visible Base', 60);
        const endField = inputGrid.addField('Last Visible Base', 60);
        this.addObject(inputGrid, this._content);
        startField.text = `${this._initialRange[0]}`;
        endField.text = `${this._initialRange[1]}`;

        startField.setFocus();

        const buttonLayout = new HLayoutContainer(20);
        this._content.addChild(buttonLayout);
        const applyButton = new GameButton().label('Apply', 14);
        this.addObject(applyButton, buttonLayout);
        const resetButton = new GameButton().label('Reset', 14);
        this.addObject(resetButton, buttonLayout);

        applyButton.clicked.connect(() => this.onApply(startField.text, endField.text));
        startField.keyPressed.connect((key) => {
            if (key === 'Enter') this.onApply(startField.text, endField.text);
        });
        endField.keyPressed.connect((key) => {
            if (key === 'Enter') this.onApply(startField.text, endField.text);
        });
        resetButton.clicked.connect(() => {
            startField.text = `${this._fullRange[0]}`;
            endField.text = `${this._fullRange[1]}`;
            this.onApply(startField.text, endField.text);
        });

        this._content.layout();
        this._window.layout();
    }

    private onApply(start: string, end: string) {
        const startNum = parseInt(start, 10);
        const endNum = parseInt(end, 10);

        const prevText = this._errorText.text;
        const wasVisible = this._errorText.visible;

        if (start === '' || end === '') {
            this._errorText.text = 'Please provide both a start and end number';
            this._errorText.visible = true;
        } else if (Number.isNaN(startNum) || Number.isNaN(endNum)) {
            this._errorText.text = 'Please enter a valid number';
            this._errorText.visible = true;
        } else if (startNum < this._fullRange[0]) {
            this._errorText.text = `Start number must be greater than ${this._fullRange[0]}`;
            this._errorText.visible = true;
        } else if (endNum > this._fullRange[1]) {
            this._errorText.text = `End number must be less than ${this._fullRange[1]}`;
            this._errorText.visible = true;
        } else if (startNum > endNum - 1) {
            this._errorText.text = 'End number must be greater than start number';
            this._errorText.visible = true;
        } else {
            this._errorText.visible = false;
            this.applyClicked.emit({start: startNum, end: endNum});
        }

        if (this._errorText.visible !== wasVisible || prevText !== this._errorText.text) {
            this._content.layout(true);
            this._window.layout();
        }
    }

    private _content: VLayoutContainer;
    private _errorText: Text;

    private _fullRange: [number, number];
    private _initialRange: [number, number];
}

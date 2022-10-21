import Fonts from 'eterna/util/Fonts';
import {VLayoutContainer} from 'flashbang';
import {Text} from 'pixi.js';
import {Signal} from 'signals';
import GameButton from './GameButton';
import TextInputGrid from './TextInputGrid';
import WindowDialog from './WindowDialog';

export default class NucleotideFinder extends WindowDialog<void> {
    public readonly jumpClicked: Signal<number> = new Signal();

    constructor() {
        super({title: 'Jump to Nucleotide'});
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
        const baseField = inputGrid.addField('Base Number', 60);
        this.addObject(inputGrid, this._content);

        baseField.setFocus(true);

        const applyButton = new GameButton().label('Jump', 14);
        this.addObject(applyButton, this._content);

        applyButton.clicked.connect(() => this.onApply(baseField.text));
        baseField.keyPressed.connect((key) => {
            if (key === 'Enter') this.onApply(baseField.text);
        });

        this._content.layout();
        this._window.layout();
    }

    private onApply(base: string) {
        const baseNum = parseInt(base, 10);

        const prevText = this._errorText.text;
        const wasVisible = this._errorText.visible;

        if (base === '') {
            this._errorText.text = 'Please enter a base number';
            this._errorText.visible = true;
        } else if (Number.isNaN(baseNum)) {
            this._errorText.text = 'Please enter a valid number';
            this._errorText.visible = true;
        } else {
            this._errorText.visible = false;
            this.jumpClicked.emit(baseNum);
        }

        if (this._errorText.visible !== wasVisible || prevText !== this._errorText.text) {
            this._content.layout(true);
            this._window.layout();
        }
    }

    private _content: VLayoutContainer;
    private _errorText: Text;
}

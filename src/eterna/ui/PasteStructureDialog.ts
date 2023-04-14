import {HLayoutContainer, VLayoutContainer} from 'flashbang';
import {Signal} from 'signals';
import {Text} from 'pixi.js';
import Fonts from 'eterna/util/Fonts';
import SecStruct from 'eterna/rnatypes/SecStruct';
import EPars from 'eterna/EPars';
import WindowDialog from './WindowDialog';
import TextInputGrid from './TextInputGrid';
import GameButton from './GameButton';
import TextInputObject from './TextInputObject';

interface PasteResult {
    structure: SecStruct;
    startAt: number;
}

export default class PasteStructureDialog extends WindowDialog<void> {
    public readonly applyClicked: Signal<PasteResult> = new Signal();
    public readonly resetClicked: Signal<void> = new Signal();

    constructor(pseudoknots: boolean) {
        super({title: 'Paste a structure'});
        this._pseudoknots = pseudoknots;
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
        this._structureField = inputGrid.addField('Structure', 200);
        this._startAtField = inputGrid.addField('Starting base', 50);
        this.addObject(inputGrid, this._content);

        const buttonLayout = new HLayoutContainer(6);
        this._content.addChild(buttonLayout);
        const resetButton = new GameButton('secondary').label('Reset', 14).tooltip('Reset to Default Structure');
        const applyButton = new GameButton().label('Apply', 14);
        this.addObject(resetButton, buttonLayout);
        this.addObject(applyButton, buttonLayout);

        resetButton.clicked.connect(() => this.resetClicked.emit());
        applyButton.clicked.connect(() => this.onApply(this._structureField.text, this._startAtField.text));
        this.regs.add(this._structureField.keyPressed.connect((key) => {
            if (key === 'Enter') this.onApply(this._structureField.text, this._startAtField.text);
        }));
        this.regs.add(this._startAtField.keyPressed.connect((key) => {
            if (key === 'Enter') this.onApply(this._structureField.text, this._startAtField.text);
        }));

        this._content.layout();
        this._window.layout();
    }

    private onApply(structure: string, startAtStr: string): void {
        const prevText = this._errorText.text;
        const wasVisible = this._errorText.visible;

        const startAt = startAtStr ? parseInt(startAtStr, 10) : 1;

        const validationError = EPars.validateParenthesis(structure, false);
        if (structure.length === 0) {
            this._errorText.text = 'Please enter a structure';
            this._errorText.visible = true;
        } else if (validationError) {
            this._errorText.text = validationError;
            this._errorText.visible = true;
        } else if (Number.isNaN(startAt)) {
            this._errorText.text = 'Please enter a valid number for the starting base';
            this._errorText.visible = true;
        } else {
            let s;
            try {
                s = SecStruct.fromParens(structure, this._pseudoknots);
            } catch (e: unknown) {
                if (e instanceof Error) {
                    this._errorText.text = e.message;
                    this._errorText.visible = true;
                } else throw e;
            }
            if (s) {
                this._errorText.visible = false;
                this.applyClicked.emit({structure: s, startAt});
            }
        }

        this._structureField.setFocus(true);

        if (this._errorText.visible !== wasVisible || prevText !== this._errorText.text) {
            this._content.layout(true);
            this._window.layout();
        }
    }

    private _pseudoknots: boolean;

    private _content: VLayoutContainer;
    private _errorText: Text;
    private _structureField: TextInputObject;
    private _startAtField: TextInputObject;
}

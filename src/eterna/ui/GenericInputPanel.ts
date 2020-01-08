import {Point, Text} from 'pixi.js';
import {Signal, UnitSignal} from 'signals';
import Fonts from 'eterna/util/Fonts';
import GameButton from './GameButton';
import GamePanel from './GamePanel';
import TextInputObject from './TextInputObject';
import DropDown from './DropDown';

type Input = TextInputObject | DropDown;

export default class GenericInputPanel extends GamePanel {
    public readonly cancelClicked: UnitSignal = new UnitSignal();
    public readonly okClicked: Signal<Map<string, string>> = new Signal();

    constructor(inputFontSize: number = 14) {
        super();

        this._fontSize = inputFontSize;

        this.setup(0, 1.0, 0x152843, 0.27, 0xC0DCE7);

        this._okButton = new GameButton().label('Ok', 14);
        this.addObject(this._okButton, this.container);
        this._okButton.clicked.connect(() => {
            this.okClicked.emit(this.getFieldValues());
            this.resetHotkeys();
        });

        this._cancelButton = new GameButton().label('Cancel', 14);
        this.addObject(this._cancelButton, this.container);
        this._cancelButton.clicked.connect(() => {
            this.cancelClicked.emit();
            this.resetHotkeys();
        });
    }

    public set okButtonLabel(text: string) {
        this._okButton.label(text, 14);
    }

    protected added(): void {
        super.added();

        let fieldStart = this._fields.reduce((max, field) => Math.max(max, field.label.width), 0);
        let maxWidth = this._fields.reduce((max, field) => Math.max(max, field.input.width), 0);
        let heightWalker = 0;

        if (this._fields.length > 0) {
            heightWalker = 26 + GenericInputPanel.H_MARGIN;

            for (let field of this._fields) {
                heightWalker += 4;

                field.input.display.x = fieldStart + (GenericInputPanel.W_MARGIN * 2);
                field.input.display.y = heightWalker;

                field.label.x = GenericInputPanel.W_MARGIN;
                field.label.y = heightWalker;

                heightWalker += field.input.height;
            }

            heightWalker += 35;
        }

        let width = (
            GenericInputPanel.W_MARGIN + fieldStart + GenericInputPanel.W_MARGIN + maxWidth + GenericInputPanel.W_MARGIN
        );
        let height = heightWalker + 20 + GenericInputPanel.H_MARGIN;
        this.setSize(width, height);

        this._okButton.display.position = new Point(
            (width * 0.5) - 30 - this._okButton.container.width,
            heightWalker
        );
        this._cancelButton.display.position = new Point((width * 0.5) + 30, heightWalker);
    }

    private _addField<T extends Input>(name: string, input: T): T {
        if (this.isLiveObject) {
            throw new Error('Add all fields before adding object to mode');
        }

        this.addObject(input, this.container);

        let label: Text = Fonts.arial(name, this._fontSize).color(0xC0DCE7).build();
        this.container.addChild(label);

        this._fields.push({input, label, name});
        return input;
    }

    public addTextField(name: string, width: number, multiline: boolean = false): TextInputObject {
        return this._addField(name, new TextInputObject(this._fontSize, width, multiline ? 3 : 1).font(Fonts.ARIAL));
    }

    public addDropDown(name: string, options: string[], defaultOption?: string): DropDown {
        return this._addField(name, new DropDown(this._fontSize, options, defaultOption));
    }

    public setHotkeys(
        okKey: string = null, okText: string = '', cancelKey: string = null, cancelText: string = ''
    ): void {
        this._okButton.hotkey(okKey, false).tooltip(okText);
        this._cancelButton.hotkey(cancelKey, false).tooltip(cancelText);
    }

    public resetHotkeys(): void {
        this.setHotkeys();
    }

    public getFieldValues(): Map<string, string> {
        let dict: Map<string, string> = new Map();
        for (let field of this._fields) {
            dict.set(field.name, field.input.text);
        }

        return dict;
    }

    public clearFields(): void {
        for (let field of this._fields) {
            field.input.text = '';
        }
    }

    private readonly _okButton: GameButton;
    private readonly _cancelButton: GameButton;
    private readonly _fontSize: number = 14;

    private _fields: InputField[] = [];

    private static readonly W_MARGIN = 20;
    private static readonly H_MARGIN = 20;
}

interface InputField {
    input: Input;
    name: string;
    label: Text;
}

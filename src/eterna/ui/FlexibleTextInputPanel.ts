import {Text} from 'pixi.js';
import {Signal, UnitSignal} from 'signals';
import Fonts from 'eterna/util/Fonts';
import GameButton from './GameButton';
import GamePanel from './GamePanel';
import TextInputObject from './TextInputObject';

export default class FlexibleTextInputPanel extends GamePanel {
    public readonly cancelClicked: UnitSignal = new UnitSignal();
    public readonly okClicked: Signal<Map<string, string>> = new Signal();

    constructor(inputFontSize: number = 14) {
        super({});

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

        const fieldStart = Math.max(...this._fields.map((field) => field.label.width));
        const maxWidth = Math.max(...this._fields.map((field) => field.input.width));
        let heightWalker = 0;

        if (this._fields.length > 0) {
            heightWalker = FlexibleTextInputPanel.H_MARGIN;

            for (const field of this._fields) {
                heightWalker += 4;

                field.input.display.x = fieldStart + (FlexibleTextInputPanel.W_MARGIN * 2);
                field.input.display.y = heightWalker;

                field.label.x = FlexibleTextInputPanel.W_MARGIN;
                field.label.y = heightWalker;

                heightWalker += field.input.height;
            }

            heightWalker += FlexibleTextInputPanel.H_MARGIN;
        }

        const tmpwidth = 0;
        const width = (
            fieldStart + maxWidth + FlexibleTextInputPanel.W_MARGIN > tmpwidth
                ? FlexibleTextInputPanel.W_MARGIN + fieldStart + FlexibleTextInputPanel.W_MARGIN
                + maxWidth + FlexibleTextInputPanel.W_MARGIN
                : FlexibleTextInputPanel.W_MARGIN + tmpwidth + FlexibleTextInputPanel.W_MARGIN
        );
        const height = heightWalker + this._okButton.display.height + FlexibleTextInputPanel.H_MARGIN;
        this.setSize(width, height);

        this._okButton.display.position.set(
            (width * 0.5) - 30 - this._okButton.container.width,
            heightWalker
        );
        this._cancelButton.display.position.set((width * 0.5) + 30, heightWalker);
    }

    public addField(name: string, width: number, multiline: boolean = false): TextInputObject {
        if (this.isLiveObject) {
            throw new Error('Add all fields before adding object to mode');
        }

        const input = new TextInputObject({
            fontSize: this._fontSize,
            width,
            rows: multiline ? 3 : 1
        }).font(Fonts.STDFONT);
        this.addObject(input, this.container);

        const label: Text = Fonts.std(name, this._fontSize).color(0xC0DCE7).build();
        this.container.addChild(label);

        this._fields.push({input, label, name});

        return input;
    }

    public setHotkeys(
        okKey?: string, okText: string = '', cancelKey?: string, cancelText: string = ''
    ): void {
        this._okButton.hotkey(okKey, false).tooltip(okText);
        this._cancelButton.hotkey(cancelKey, false).tooltip(cancelText);
    }

    public resetHotkeys(): void {
        this.setHotkeys();
    }

    public getFieldValues(): Map<string, string> {
        const dict: Map<string, string> = new Map();
        for (const field of this._fields) {
            dict.set(field.name, field.input.text);
        }

        return dict;
    }

    public clearFields(): void {
        for (const field of this._fields) {
            field.input.text = '';
        }
    }

    protected readonly _okButton: GameButton;
    protected readonly _cancelButton: GameButton;
    private readonly _fontSize: number = 14;

    private _fields: InputField[] = [];

    private static readonly W_MARGIN = 20;
    private static readonly H_MARGIN = 20;
}

export interface InputField {
    input: TextInputObject;
    name: string;
    label: Text;
}

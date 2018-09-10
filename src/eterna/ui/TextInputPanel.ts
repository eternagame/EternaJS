import {Point, Text} from "pixi.js";
import {Signal} from "../../signals/Signal";
import {UnitSignal} from "../../signals/UnitSignal";
import {Fonts} from "../util/Fonts";
import {GameButton} from "./GameButton";
import {GamePanel} from "./GamePanel";
import {TextInputObject} from "./TextInputObject";

export class TextInputPanel extends GamePanel {
    public readonly cancelClicked: UnitSignal = new UnitSignal();
    public readonly okClicked: Signal<Map<string, string>> = new Signal();

    public constructor(inputFontSize: number = 14) {
        super();

        this._fontSize = inputFontSize;

        this.setup(0, 1.0, 0x152843, 0.27, 0xC0DCE7);

        this._okButton = new GameButton().label("Ok", 14);
        this.addObject(this._okButton, this.container);
        this._okButton.clicked.connect(() => {
            this.okClicked.emit(this.getFieldValues());
            this.resetHotkeys();
        });

        this._cancelButton = new GameButton().label("Cancel", 14);
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

        let fieldStart: number = 0;
        let maxWidth: number = 0;
        let heightWalker: number = 0;

        if (this._fields.length > 0) {
            for (let field of this._fields) {
                fieldStart = Math.max(fieldStart, field.label.width);
                maxWidth = Math.max(maxWidth, field.input.width);
            }

            heightWalker = 26 + TextInputPanel.H_MARGIN;

            for (let field of this._fields) {
                heightWalker += 4;

                field.input.display.x = fieldStart + (TextInputPanel.W_MARGIN * 2);
                field.input.display.y = heightWalker;

                field.label.x = TextInputPanel.W_MARGIN;
                field.label.y = heightWalker;

                heightWalker += field.input.height;
            }

            heightWalker += 35;
        }

        let width = TextInputPanel.W_MARGIN + fieldStart + TextInputPanel.W_MARGIN + maxWidth + TextInputPanel.W_MARGIN;
        let height = heightWalker + 20 + TextInputPanel.H_MARGIN;
        this.setSize(width, height);

        this._okButton.display.position = new Point(
            (width * 0.5) - 30 - this._okButton.container.width,
            heightWalker
        );
        this._cancelButton.display.position = new Point((width * 0.5) + 30, heightWalker);
    }

    public addField(name: string, width: number, multiline: boolean = false): TextInputObject {
        if (this.isLiveObject) {
            throw new Error("Add all fields before adding object to mode");
        }

        let input = new TextInputObject(this._fontSize, width, multiline ? 3 : 1).font(Fonts.ARIAL);
        this.addObject(input, this.container);

        let label: Text = Fonts.arial(name, this._fontSize).color(0xC0DCE7).build();
        this.container.addChild(label);

        this._fields.push({input, label, name});

        return input;
    }

    public setHotkeys(ok_key: string = null, ok_txt: string = "", cancel_key: string = null, cancel_txt: string = ""): void {
        this._okButton.hotkey(ok_key, false).tooltip(ok_txt);
        this._cancelButton.hotkey(cancel_key, false).tooltip(cancel_txt);
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
            field.input.text = "";
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
    input: TextInputObject;
    name: string;
    label: Text;
}

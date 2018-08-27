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

    public constructor() {
        super();

        this.setup(0, 1.0, 0x152843, 0.27, 0xC0DCE7);

        this._okButton = new GameButton().label("Ok", 14);
        this.addObject(this._okButton, this.container);
        this._okButton.clicked.connect(() => {
            this.okClicked.emit(this.get_dictionary());
            this.reset_hotkeys();
        });

        this._cancelButton = new GameButton().label("Cancel", 14);
        this.addObject(this._cancelButton, this.container);
        this._cancelButton.clicked.connect(() => {
            this.cancelClicked.emit();
            this.reset_hotkeys();
        });
    }

    protected added(): void {
        super.added();

        let field_start: number = 0;
        let max_w: number = 0;
        let height_walker: number = 0;

        if (this._fields.length > 0) {
            for (let field of this._fields) {
                field_start = Math.max(field_start, field.label.width);
                max_w = Math.max(max_w, field.input.width);
            }

            const FIELD_H_OFFSET = 28;

            for (let ii = 0; ii < this._fields.length; ii++) {
                let field = this._fields[ii];
                field.input.display.x = field_start + (TextInputPanel.W_MARGIN * 2);
                field.input.display.y = (ii + 1) * FIELD_H_OFFSET + TextInputPanel.H_MARGIN;
                field.label.x = TextInputPanel.W_MARGIN;
                field.label.y = (ii + 1) * FIELD_H_OFFSET + TextInputPanel.H_MARGIN;
            }

            let lastInput = this._fields[this._fields.length - 1].input;
            height_walker = lastInput.display.y + lastInput.height + 35;
        }

        let width = TextInputPanel.W_MARGIN + field_start + TextInputPanel.W_MARGIN + max_w + TextInputPanel.W_MARGIN;
        let height = height_walker + 20 + TextInputPanel.H_MARGIN;
        this.setSize(width, height);

        this._okButton.display.position = new Point(
            (width * 0.5) - 30 - this._okButton.container.width,
            height_walker
        );
        this._cancelButton.display.position = new Point((width * 0.5) + 30, height_walker);
    }

    public set_title(title_txt: string): void {
        this.set_panel_title(title_txt);
    }

    public add_field(name: string, width: number, multiline: boolean = false): TextInputObject {
        if (this.isLiveObject) {
            throw new Error("Add all fields before adding object to mode");
        }

        let input = new TextInputObject(14, width, multiline ? 3 : 1).font(Fonts.ARIAL);
        this.addObject(input, this.container);

        let label: Text = Fonts.arial(name, 14).color(0xC0DCE7).build();
        this.container.addChild(label);

        this._fields.push({input, label, name});

        return input;
    }

    public set_hotkeys(ok_key: string = null, ok_txt: string = "", cancel_key: string = null, cancel_txt: string = ""): void {
        this._okButton.hotkey(ok_key, false).tooltip(ok_txt);
        this._cancelButton.hotkey(cancel_key, false).tooltip(cancel_txt);
    }

    public reset_hotkeys(): void {
        this.set_hotkeys();
    }

    public get_dictionary(): Map<string, string> {
        let dict: Map<string, string> = new Map();
        for (let field of this._fields) {
            dict.set(field.name, field.input.text);
        }

        return dict;
    }

    public clear_fields(): void {
        for (let field of this._fields) {
            field.input.text = "";
        }
    }

    private readonly _okButton: GameButton;
    private readonly _cancelButton: GameButton;
    private _fields: InputField[] = [];

    private static readonly W_MARGIN: number = 20;
    private static readonly H_MARGIN: number = 20;
}

interface InputField {
    input: TextInputObject;
    name: string;
    label: Text;
}

import {Text} from 'pixi.js';
import {ContainerObject} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import TextInputObject from './TextInputObject';

export default class TextInputGrid extends ContainerObject {
    constructor(fontSize: number = 14, domParent?: string | HTMLElement) {
        super();
        this._fontSize = fontSize;
        this._domParent = domParent;
    }

    protected added(): void {
        super.added();

        const fieldStart = Math.max(...this._fields.map((field) => field.label.width));
        let heightWalker = 0;

        if (this._fields.length > 0) {
            heightWalker = 0;

            for (const field of this._fields) {
                heightWalker += 4;

                field.label.x = 0;
                field.label.y = heightWalker + (field.input.height - field.label.height) / 2;

                field.input.display.x = fieldStart + TextInputGrid.W_MARGIN;
                field.input.display.y = heightWalker;

                heightWalker += field.input.height;
            }

            heightWalker += TextInputGrid.H_MARGIN;
        }
    }

    public addField(name: string, width: number, multiline: boolean = false): TextInputObject {
        if (this.isLiveObject) {
            throw new Error('Add all fields before adding object to mode');
        }

        const input = new TextInputObject({
            fontSize: this._fontSize,
            width,
            rows: multiline ? 3 : 1,
            domParent: this._domParent
        }).font(Fonts.STDFONT);
        this.addObject(input, this.container);

        const label = Fonts.std(name, this._fontSize).color(0xC0DCE7).build();
        this.container.addChild(label);

        this._fields.push({input, label, name});

        return input;
    }

    private _fields: InputField[] = [];

    private _fontSize: number;
    private _domParent?: string | HTMLElement;

    private static readonly W_MARGIN = 20;
    private static readonly H_MARGIN = 20;
}

export interface InputField {
    input: TextInputObject;
    name: string;
    label: Text;
}

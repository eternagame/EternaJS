import {DOMObject} from "../../flashbang/objects/DOMObject";
import {Signal} from "../../signals/Signal";
import {Eterna} from "../Eterna";

/** A text input object in the DOM. Floats on top of the PIXI canvas. */
export class TextInputObject extends DOMObject<HTMLInputElement | HTMLTextAreaElement> {
    public readonly valueChanged: Signal<string> = new Signal();

    public constructor(fontSize: number, width: number = 100, rows: number = 1) {
        super(Eterna.OVERLAY_DIV_ID, rows === 1 ? TextInputObject.createTextInput() : TextInputObject.createTextArea(rows));

        this.width = width;
        this._obj.style.fontSize = DOMObject.sizeToString(fontSize);
        this._obj.oninput = () => this.valueChanged.emit(this._obj.value);
    }

    public font(fontFamily: string): TextInputObject {
        this._obj.style.fontFamily = fontFamily;
        this.onSizeChanged();
        return this;
    }

    public fontWeight(weight: string): TextInputObject {
        this._obj.style.fontWeight = weight;
        this.onSizeChanged();
        return this;
    }

    public bold(): TextInputObject {
        return this.fontWeight("bold");
    }

    public set readOnly(value: boolean) {
        this._obj.readOnly = value;
    }

    public setFocus(select: boolean = false): void {
        this._obj.focus();
        if (select) {
            this._obj.setSelectionRange(0, this._obj.value.length);
        }
    }

    public get width(): number {
        return this._obj.getBoundingClientRect().width;
    }

    public set width(value: number) {
        this._obj.style.width = DOMObject.sizeToString(value);
        this.onSizeChanged();
    }

    public get height(): number {
        return this._obj.getBoundingClientRect().height;
    }

    public get text(): string {
        return this._obj.value;
    }

    public set text(value: string) {
        this._obj.value = value;
    }

    public get caretPosition(): number {
        return this._obj.selectionStart;
    }

    private static createTextArea(rows: number): HTMLTextAreaElement {
        let element = document.createElement("textarea");
        element.rows = rows;
        element.title = "";
        element.style.resize = "none";
        element.style.overflow = "scroll";
        return element;
    }

    private static createTextInput(): HTMLInputElement {
        let element = document.createElement("input");
        element.type = "text";
        element.title = "";
        return element;
    }
}

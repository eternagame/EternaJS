import {DOMObject} from "../../flashbang/objects/DOMObject";
import {Signal} from "../../signals/Signal";
import {Eterna} from "../Eterna";

/**
 * A text input object in the DOM. Floats on top of the PIXI canvas.
 */
export class TextInputObject extends DOMObject<HTMLInputElement> {
    public readonly valueChanged: Signal<string> = new Signal();

    public constructor(fontSize: number, width: number = 100) {
        super(Eterna.OVERLAY_DIV_ID, TextInputObject.createTextInput());

        this.width = width;
        this._dummyDisp.height = this._obj.getBoundingClientRect().height;

        this._obj.style.fontSize = DOMObject.sizeToString(fontSize);
        this._obj.oninput = () => this.valueChanged.emit(this._obj.value);
    }

    public get width(): number {
        return this._obj.getBoundingClientRect().width;
    }

    public set width(value: number) {
        this._obj.style.width = DOMObject.sizeToString(value);
        this._dummyDisp.width = value;
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

    protected static createTextInput(): HTMLInputElement {
        let element = document.createElement("input");
        element.type = "text";
        element.title = "";
        return element;
    }
}

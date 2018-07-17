import {DOMObject} from "../../flashbang/objects/DOMObject";
import {Eterna} from "../Eterna";

/** A <p> object in the DOM. Floats on top of the PIXI canvas. */
export class HTMLTextObject extends DOMObject<HTMLParagraphElement> {
    public constructor(htmlText: string, width: number = 100) {
        super(Eterna.OVERLAY_DIV_ID, document.createElement("p"));
        this.width = width;
        this._obj.innerHTML = htmlText;
    }

    public lineHeight(percentOrString: number | string): HTMLTextObject {
        if (typeof(percentOrString) === "number") {
            this._obj.style.lineHeight = `${Math.floor(percentOrString * 100)}%`;
        } else {
            this._obj.style.lineHeight = percentOrString;
        }
        this.onSizeChanged();
        return this;
    }

    public color(color: number): HTMLTextObject {
        this._obj.style.color = `#${color.toString(16)}`;
        this.onSizeChanged();
        return this;
    }

    public font(fontFamily: string): HTMLTextObject {
        this._obj.style.fontFamily = fontFamily;
        this.onSizeChanged();
        return this;
    }

    public fontSize(size: number): HTMLTextObject {
        this._obj.style.fontSize = `${size}pt`;
        this.onSizeChanged();
        return this;
    }

    public hAlign(align: "left" | "center" | "right" | "justify"): HTMLTextObject {
        this._obj.style.textAlign = align;
        this.onSizeChanged();
        return this;
    }

    public get width(): number {
        return this._obj.getBoundingClientRect().width;
    }

    public get height(): number {
        return this._obj.getBoundingClientRect().height;
    }

    public set width(value: number) {
        this._obj.style.width = DOMObject.sizeToString(value);
        this.onSizeChanged();
    }
}

import {DOMObject} from "../../flashbang/objects/DOMObject";
import {Eterna} from "../Eterna";

/** A <p> object in the DOM that contains the given HTML. Floats on top of the PIXI canvas. */
export class HTMLTextObject extends DOMObject<HTMLParagraphElement> {
    public constructor(htmlText: string, width?: number) {
        super(Eterna.OVERLAY_DIV_ID, document.createElement("p"));
        this._obj.innerHTML = htmlText;
        this._obj.style.margin = "0px";
        if (width) {
            this.width = width;
        } else {
            this._obj.style.width = "max-content";
        }
    }

    public lineHeight(percentOrString: number | string): HTMLTextObject {
        let lineHeight: string = (typeof(percentOrString) === "number") ?
            `${Math.floor(percentOrString * 100)}%` :
            percentOrString;
        DOMObject.applyStyleRecursive(this._obj, "line-height", lineHeight);
        this.onSizeChanged();
        return this;
    }

    public color(color: number): HTMLTextObject {
        DOMObject.applyStyleRecursive(this._obj, "color", `#${color.toString(16)}`);
        this.onSizeChanged();
        return this;
    }

    public font(fontFamily: string): HTMLTextObject {
        DOMObject.applyStyleRecursive(this._obj, "font-family", fontFamily);
        this.onSizeChanged();
        return this;
    }

    public fontSize(size: number): HTMLTextObject {
        DOMObject.applyStyleRecursive(this._obj, "font-size", `${size}pt`);
        this.onSizeChanged();
        return this;
    }

    public hAlign(align: "left" | "center" | "right" | "justify"): HTMLTextObject {
        DOMObject.applyStyleRecursive(this._obj, "text-align", align);
        this.onSizeChanged();
        return this;
    }

    public maxWidth(value: number): HTMLTextObject {
        this._obj.style.maxWidth = DOMObject.sizeToString(value);
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

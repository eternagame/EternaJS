import {DOMObject} from "flashbang/objects";
import Eterna from "eterna/Eterna";

/** A <p> object in the DOM that contains the given HTML. Floats on top of the PIXI canvas. */
export default class HTMLTextObject extends DOMObject<HTMLParagraphElement> {
    public constructor(htmlText: string, width?: number) {
        super(Eterna.OVERLAY_DIV_ID, document.createElement("p"));
        this._obj.innerHTML = htmlText;
        this._obj.style.margin = "0px";
        if (width) {
            this.width = width;
        } else {
            // If a width isn't specified, we want the element's width to match its content.
            // I'm using `white-space=pre`, which seems to work across browsers. "width: max-content"
            // works on Firefox, Safari, and Chrome, but Edge doesn't have support for it.
            this._obj.style.whiteSpace = "pre";
            // this._obj.style.cssText +=
            //     "width: max-content;" +
            //     "width: -moz-max-content;";
        }
    }

    public lineHeight(percentOrString: number | string): HTMLTextObject {
        let lineHeight: string = (typeof (percentOrString) === "number")
            ? `${Math.floor(percentOrString * 100)}%`
            : percentOrString;
        DOMObject.applyStyleRecursive(this._obj, {"line-height": lineHeight}, false, HTMLTextObject.STYLE_NODE_NAMES);
        this.onSizeChanged();
        return this;
    }

    public selectable(value: boolean): HTMLTextObject {
        this._obj.style.userSelect = value ? undefined : "none";
        this._obj.style.webkitUserSelect = value ? undefined : "none";
        this._obj.style.msUserSelect = value ? undefined : "none";
        return this;
    }

    public color(color: number): HTMLTextObject {
        DOMObject.applyStyleRecursive(this._obj, {color: `#${color.toString(16)}`}, false, HTMLTextObject.STYLE_NODE_NAMES);
        this.onSizeChanged();
        return this;
    }

    public font(fontFamily: string): HTMLTextObject {
        DOMObject.applyStyleRecursive(this._obj, {"font-family": fontFamily}, false, HTMLTextObject.STYLE_NODE_NAMES);
        this.onSizeChanged();
        return this;
    }

    public fontSize(size: number): HTMLTextObject {
        DOMObject.applyStyleRecursive(this._obj, {"font-size": `${size}px`}, false, HTMLTextObject.STYLE_NODE_NAMES);
        this.onSizeChanged();
        return this;
    }

    public fontWeight(weight: string): HTMLTextObject {
        DOMObject.applyStyleRecursive(this._obj, {"font-weight": weight}, false, HTMLTextObject.STYLE_NODE_NAMES);
        this.onSizeChanged();
        return this;
    }

    public bold(): HTMLTextObject {
        return this.fontWeight("bold");
    }

    public hAlign(align: "left" | "center" | "right" | "justify"): HTMLTextObject {
        DOMObject.applyStyleRecursive(this._obj, {"text-align": align}, false, HTMLTextObject.STYLE_NODE_NAMES);
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

    private static readonly STYLE_NODE_NAMES: string[] = [
        "div", "p", "span", "a"
    ];
}

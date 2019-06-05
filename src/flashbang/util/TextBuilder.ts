import {Text, TextStyle, TextStyleOptions} from "pixi.js";

export default class TextBuilder {
    public constructor(text: string = "") {
        this.text(text);
    }

    /** Creates the Text object */
    public build(): Text {
        let text = new Text(this._text, this.style);
        text.scale.x = this._scale;
        text.scale.y = this._scale;
        return text;
    }

    public computeLineHeight(): number {
        let dummy = this.build();
        dummy.text = "A";
        return dummy.height;
    }

    /** @return the current TextStyle */
    public get style(): TextStyle {
        return new TextStyle(this._style);
    }

    /** The text to display. @default "" */
    public text(val: string): TextBuilder {
        this._text = val;
        return this;
    }

    /** The name of the font to use @default: "Verdana" */
    public font(fontFamily: string): TextBuilder {
        this._style.fontFamily = fontFamily;
        return this;
    }

    /** The size of the font. @default 12 */
    public fontSize(val: number): TextBuilder {
        this._style.fontSize = val;
        return this;
    }

    public fontWeight(val: string): TextBuilder {
        this._style.fontWeight = val;
        return this;
    }

    public bold(value: boolean = true): TextBuilder {
        if (value) {
            this.fontWeight("bold");
        } else if (this._style.fontWeight === "bold") {
            this._style.fontWeight = undefined;
        }
        return this;
    }

    /** The text color @default 0x0 (black) */
    public color(val: number): TextBuilder {
        this._style.fill = val;
        return this;
    }

    /** Horizontal alignment for multiline (wordwrapped) text. @default "center" */
    public hAlign(align: "left" | "center" | "right"): TextBuilder {
        this._style.align = align;
        return this;
    }

    /** Equivalent to <code>hAlign(HAlign.LEFT)</code> */
    public hAlignLeft(): TextBuilder {
        return this.hAlign("left");
    }

    /** Equivalent to <code>hAlign(Align.CENTER)</code> */
    public hAlignCenter(): TextBuilder {
        return this.hAlign("center");
    }

    /** Equivalent to <code>hAlign(HAlign.RIGHT)</code> */
    public hAlignRight(): TextBuilder {
        return this.hAlign("right");
    }

    /** Enables or disables word wrapping. @default false */
    public wordWrap(wrap: boolean, wordWrapWidth: number = 100): TextBuilder {
        this._style.wordWrap = wrap;
        this._style.wordWrapWidth = wordWrapWidth;
        return this;
    }

    /** Manually controls the spacing between lines */
    public leading(value: number): TextBuilder {
        this._style.leading = value;
        return this;
    }

    /** The amount of spacing between letters. Default is 0 */
    public letterSpacing(value: number): TextBuilder {
        this._style.letterSpacing = value;
        return this;
    }

    /** Replaces all current TextStyle settings */
    public setStyle(style: TextStyle): TextBuilder {
        this._style = style;
        return this;
    }

    /**
     * Specifies the scale of the TextField. @default 1.0.
     * Calling this multiple times will multiply the previously-set scale value.
     * (Use `resetScale` to set override any previous scale changes.)
     */
    public scale(val: number): TextBuilder {
        this._scale *= val;
        return this;
    }

    public resetScale(val: number): TextBuilder {
        this._scale = val;
        return this;
    }

    private _style: TextStyleOptions = {};
    private _text: string;
    private _scale: number = 1;
}

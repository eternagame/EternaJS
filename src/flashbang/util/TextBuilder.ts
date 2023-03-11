import {ITextStyle, Text, TextStyle} from 'pixi.js';

// Using the terms used by Google Fonts
export enum FontWeight {
    THIN = '100',
    EXTRALIGHT = '200',
    LIGHT = '300',
    REGULAR = '400',
    MEDIUM = '500',
    SEMIBOLD = '600',
    BOLD = '700',
    EXTRABOLD = '800',
    BLACK = '900'
}

export default class TextBuilder {
    constructor(text = '') {
        this.text(text);
    }

    /** Creates the Text object */
    public build(): Text {
        const text = new Text(this._text, this.style);
        text.scale.x = this._scale;
        text.scale.y = this._scale;
        return text;
    }

    public computeLineHeight(): number {
        const dummy = this.build();
        dummy.text = 'A';
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

    public fontWeight(val: FontWeight): TextBuilder {
        this._style.fontWeight = val;
        return this;
    }

    public bold(value = true): TextBuilder {
        if (value) {
            this.fontWeight(FontWeight.BOLD);
        } else if (this._style.fontWeight === FontWeight.BOLD) {
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
    public hAlign(align: 'left' | 'center' | 'right'): TextBuilder {
        this._style.align = align;
        return this;
    }

    /** Equivalent to <code>hAlign(HAlign.LEFT)</code> */
    public hAlignLeft(): TextBuilder {
        return this.hAlign('left');
    }

    /** Equivalent to <code>hAlign(Align.CENTER)</code> */
    public hAlignCenter(): TextBuilder {
        return this.hAlign('center');
    }

    /** Equivalent to <code>hAlign(HAlign.RIGHT)</code> */
    public hAlignRight(): TextBuilder {
        return this.hAlign('right');
    }

    /** Enables or disables word wrapping. @default false */
    public wordWrap(wrap: boolean, wordWrapWidth = 100): TextBuilder {
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

    public lineHeight(lineHeight: number) {
        this._style.lineHeight = lineHeight;
        return this;
    }

    public dropShadow(dropShadow: boolean = true) {
        this._style.dropShadow = dropShadow;
        return this;
    }

    public shadowFill(color: string | number, alpha?: number) {
        this._style.dropShadowColor = color;
        if (alpha !== undefined) this._style.dropShadowAlpha = alpha;
        return this;
    }

    public shadowPosition(distance: number, angle: number) {
        this._style.dropShadowDistance = distance;
        this._style.dropShadowAngle = angle;
        return this;
    }

    public shadowBlur(blur: number) {
        this._style.dropShadowBlur = blur;
        return this;
    }

    private _style: Partial<ITextStyle> = {};
    private _text: string;
    private _scale = 1;
}

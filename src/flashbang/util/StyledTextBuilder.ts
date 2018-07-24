import * as log from "loglevel";
import {default as MultiStyleText, ExtendedTextStyle, TextStyleSet} from "pixi-multistyle-text";

export class StyledTextBuilder {
    public constructor(defaultStyle?: ExtendedTextStyle) {
        if (defaultStyle !== undefined) {
            this.defaultStyle(defaultStyle);
        }
    }

    public get text(): string {
        return this._text;
    }

    /** Creates a new MultiStyleText */
    public build(): MultiStyleText {
        if (this._styleStack.length > 0) {
            log.warn("Unpopped styles");
        }

        return new MultiStyleText(this._text, this.cloneStyles());
    }

    /** Applies the styled text to an existing MultiSyleText object */
    public apply(textField: MultiStyleText): void {
        if (this._styleStack.length > 0) {
            log.warn("Unpopped styles");
        }

        textField.text = this._text;
        textField.styles = this.cloneStyles();
    }

    public defaultStyle(style: ExtendedTextStyle): StyledTextBuilder {
        return this.addStyle("default", style);
    }

    public addStyle(name: string, style: ExtendedTextStyle): StyledTextBuilder {
        if (this._styles[name] != null) {
            log.warn(`Redefining existing style '${name}'`);
        }
        this._styles[name] = style;
        return this;
    }

    public pushStyle(style: ExtendedTextStyle | string): StyledTextBuilder {
        let styleName: string;
        if (typeof(style) === "string") {
            if (this._styles[style] == null) {
                log.warn(`Unrecognized style '${style}'`);
            }
            // Use a registered style
            styleName = style;
        } else {
            // Create a new anonymous style
            styleName = `_Style${this._anonymousStyleCounter++}`;
            this._styles[styleName] = style;
        }

        this._styleStack.push(styleName);
        this._text += `<${styleName}>`;
        return this;
    }

    public popStyle(): StyledTextBuilder {
        if (this._styleStack.length == 0) {
            log.warn("Unbalanced popStyle");
        } else {
            let lastStyle = this._styleStack.pop();
            this._text += `</${lastStyle}>`;
        }
        return this;
    }

    public append(text: string, style?: ExtendedTextStyle | string): StyledTextBuilder {
        if (style) {
            this.pushStyle(style);
        }
        this._text += text;
        if (style) {
            this.popStyle();
        }
        return this;
    }

    public getStyle(name: string): ExtendedTextStyle {
        return this._styles[name];
    }

    /** True if a style with the given name is registered */
    public hasStyle(name: string): boolean {
        return this._styles[name] != null;
    }

    public clone(): StyledTextBuilder {
        let out: StyledTextBuilder = new StyledTextBuilder();
        out._styleStack = this._styleStack.slice();
        out._text = this._text;
        out._styles = this.cloneStyles();
        return out;
    }

    private cloneStyles(): TextStyleSet {
        let out: TextStyleSet = {};
        for (let key in this._styles) {
            out[key] = this._styles[key];
        }
        return out;
    }

    private _styleStack: string[] = [];
    private _styles: TextStyleSet = {};
    private _text: string = "";

    private _anonymousStyleCounter: number = 0;
}

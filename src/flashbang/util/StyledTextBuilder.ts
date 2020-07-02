import * as log from 'loglevel';
import MultiStyleText, {TextStyleExtended, TextStyleSet} from 'pixi-multistyle-text';
import ColorUtil from './ColorUtil';

export default class StyledTextBuilder {
    constructor(defaultStyle?: TextStyleExtended) {
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
            log.warn('Unpopped styles');
        }

        return new MultiStyleText(this._text, this.cloneStyles());
    }

    /** Applies the styled text to an existing MultiSyleText object */
    public apply(textField: MultiStyleText): void {
        if (this._styleStack.length > 0) {
            log.warn('Unpopped styles');
        }

        textField.text = this._text;
        textField.styles = this.cloneStyles();
    }

    public defaultStyle(style: TextStyleExtended): StyledTextBuilder {
        return this.addStyle('default', style);
    }

    public addStyle(name: string, style: TextStyleExtended): StyledTextBuilder {
        if (this._styles[name] != null) {
            log.warn(`Redefining existing style '${name}'`);
        }
        this._styles[name] = style;
        return this;
    }

    public pushStyle(style: TextStyleExtended | string): StyledTextBuilder {
        let styleName: string;
        if (typeof (style) === 'string') {
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
        if (this._styleStack.length === 0) {
            log.warn('Unbalanced popStyle');
        } else {
            let lastStyle = this._styleStack.pop();
            this._text += `</${lastStyle}>`;
        }
        return this;
    }

    public append(text: string, style?: TextStyleExtended | string): StyledTextBuilder {
        if (style) {
            this.pushStyle(style);
        }
        this._text += text;
        if (style) {
            this.popStyle();
        }
        return this;
    }

    /**
     * Attempts to parse HTML style tags from the given string.
     * In general: don't do this! It's primarily here for compatibility with Eterna's tutorial scripts.
     * Supported tags: <font color = "#xxxxxx">, <b>
     */
    public appendHTMLStyledText(text: string): StyledTextBuilder {
        type CreateStyleCallback = (openTagMatch: RegExpExecArray) => [string, TextStyleExtended];

        const parseHTMLStyle = (
            rawText: string, openTag: RegExp, closeTag: RegExp, createStyle: CreateStyleCallback
        ): string => {
            while (true) {
                let openMatch = openTag.exec(rawText);
                if (openMatch == null) {
                    break;
                }

                const [styleName, style] = createStyle(openMatch);
                if (!this.hasStyle(styleName)) {
                    this.addStyle(styleName, style);
                }

                rawText = `${rawText.slice(0, openMatch.index)}<${styleName}>${rawText.slice(openMatch.index + openMatch[0].length)}`;

                let closeMatch = closeTag.exec(rawText);
                if (closeMatch == null) {
                    break;
                }

                rawText = `${rawText.slice(0, closeMatch.index)}</${styleName}>${rawText.slice(closeMatch.index + closeMatch[0].length)}`;
            }

            return rawText;
        };

        // Parse <font>
        const FONT_OPEN = /<font\s*color\s*=\s*["']#(\w*)["']>/i;
        const FONT_CLOSE = /<\/font>/i;
        text = parseHTMLStyle(text, FONT_OPEN, FONT_CLOSE, (openMatch) => {
            let colorString = openMatch[1];
            let color: number;
            try {
                color = ColorUtil.fromString(`#${colorString}`);
            } catch (e) {
                log.warn(`Error parsing color string '${colorString}': ${e}`);
                color = 0xffffff;
            }

            const styleName = `__color_#${colorString}`;
            return [styleName, {fill: color}];
        });

        // Parse <b>
        const BOLD_OPEN = /<b>/i;
        const BOLD_CLOSE = /<\/b>/i;
        text = parseHTMLStyle(text, BOLD_OPEN, BOLD_CLOSE, () => ['__bold', {fontStyle: 'bold'}]);

        return this.append(text);
    }

    public getStyle(name: string): TextStyleExtended {
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
        for (let [key, value] of Object.entries(this._styles)) {
            out[key] = value;
        }
        return out;
    }

    private _styleStack: string[] = [];
    private _styles: TextStyleSet = {};
    private _text = '';

    private _anonymousStyleCounter = 0;
}

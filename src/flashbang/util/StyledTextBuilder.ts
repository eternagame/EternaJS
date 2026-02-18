import log from 'loglevel';
import {Text, TextStyle, TextStyleOptions} from 'pixi.js';
import ColorUtil from './ColorUtil';

export default class StyledTextBuilder {
    constructor(defaultStyle: TextStyle | TextStyleOptions | null = null) {
        if (defaultStyle) {
            if (defaultStyle instanceof TextStyle) {
                this._style = defaultStyle.clone();
                // Ensures that `_style.tagStyles` is never undefined
                this._style.tagStyles ??= {};
            } else {
                this._style = new TextStyle({...defaultStyle, tagStyles: defaultStyle.tagStyles ?? {}});
            }
        } else {
            this._style = new TextStyle({tagStyles: {}});
        }
    }

    public get text(): string {
        return this._text;
    }

    /** Creates a new Text */
    public build(): Text {
        if (this._styleStack.length > 0) {
            log.warn('Unpopped styles');
        }

        return new Text({text: this._text, style: this.cloneStyle()});
    }

    /** Applies the styled text to an existing Text instance */
    public apply(textField: Text): void {
        if (this._styleStack.length > 0) {
            log.warn('Unpopped styles');
        }

        textField.text = this._text;
        textField.style = this.cloneStyle();
    }

    public defaultStyle(style: TextStyle): this {
        const tagStyles = this._style.tagStyles ?? {};
        const updatedStyle = style.clone();
        updatedStyle.tagStyles = tagStyles;
        this._style = updatedStyle;
        return this;
    }

    public addStyle(name: string, style: TextStyleOptions): this {
        this._style.tagStyles ??= {};
        if (this._style.tagStyles[name]) {
            log.warn(`Redefining existing style '${name}'`);
        }
        this._style.tagStyles[name] = {...this._style.tagStyles[name], ...style};
        return this;
    }

    public pushStyle(style: string | TextStyleOptions): this {
        this._style.tagStyles ??= {};
        let styleName: string;
        if (typeof style === 'string') {
            if (!this._style.tagStyles[style]) {
                log.warn(`Unrecognized style '${style}'`);
            }
            // Use a registered style
            styleName = style;
        } else {
            // Create a new anonymous style
            styleName = `_Style${this._anonymousStyleCounter++}`;
            this._style.tagStyles[styleName] = style;
        }

        this._styleStack.push(styleName);
        this._text += `<${styleName}>`;
        return this;
    }

    public popStyle(): this {
        if (this._styleStack.length === 0) {
            log.warn('Unbalanced popStyle');
        } else {
            const lastStyle = this._styleStack.pop();
            this._text += `</${lastStyle}>`;
        }
        return this;
    }

    public append(text: string, style?: string | TextStyleOptions): this {
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
    public appendHTMLStyledText(text: string): this {
        type CreateStyleCallback = (openTagMatch: RegExpExecArray) => [string, TextStyleOptions];

        const parseHTMLStyle = (
            rawText: string,
            openTag: RegExp,
            closeTag: RegExp,
            createStyle: CreateStyleCallback
        ): string => {
            while (true) {
                const openMatch = openTag.exec(rawText);
                if (openMatch == null) {
                    break;
                }

                const [styleName, style] = createStyle(openMatch);
                if (!this.hasStyle(styleName)) {
                    this.addStyle(styleName, style);
                }

                rawText = `${rawText.slice(0, openMatch.index)}<${styleName}>${rawText.slice(openMatch.index + openMatch[0].length)}`;

                const closeMatch = closeTag.exec(rawText);
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
            const colorString = openMatch[1];
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
        text = parseHTMLStyle(text, BOLD_OPEN, BOLD_CLOSE, () => ['__bold', {fontWeight: 'bold'}]);

        return this.append(text);
    }

    public getStyle(name: string): TextStyleOptions | null {
        return this._style.tagStyles?.[name] ?? null;
    }

    /** True if a style with the given name is registered */
    public hasStyle(name: string): boolean {
        return !!this._style.tagStyles?.[name];
    }

    public clone(): StyledTextBuilder {
        const out: StyledTextBuilder = new StyledTextBuilder();
        out._styleStack = this._styleStack.slice();
        out._text = this._text;
        out._style = this.cloneStyle();
        return out;
    }

    private cloneStyle(): TextStyle {
        return this._style.clone();
    }

    private _styleStack: string[] = [];
    private _style: TextStyle;
    private _text: string = '';

    private _anonymousStyleCounter = 0;
}

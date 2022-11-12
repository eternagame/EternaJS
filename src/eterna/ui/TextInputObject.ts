import {
    Graphics,
    Sprite
} from 'pixi.js';
import {Signal} from 'signals';
import {
    DOMObject,
    DisplayObjectPointerTarget,
    TextBuilder
} from 'flashbang';
import Eterna from 'eterna/Eterna';
import Fonts from 'eterna/util/Fonts';
import {FontWeight} from 'flashbang/util/TextBuilder';
import UITheme from './UITheme';

interface TextInputObjectProps {
    fontSize: number;
    width?: number;
    height?: number;
    rows?: number;
    placeholder?: string;
    bgColor?: number;
    borderColor?: number;
    domParent?: string | HTMLElement;
    characterLimit?: number;
}

/**
 * A text input object in the DOM. Floats on top of the PIXI canvas.
 * When it loses focus, it creates a fake text input display placeholder, and hides the DOM element.
 */
export default class TextInputObject extends DOMObject<HTMLInputElement | HTMLTextAreaElement | HTMLDivElement> {
    public readonly valueChanged: Signal<string> = new Signal();
    public readonly keyPressed = new Signal<string>();

    constructor(props: TextInputObjectProps) {
        super(
            props.domParent ?? Eterna.OVERLAY_DIV_ID, (props.rows ?? 1) === 1
                ? TextInputObject.createTextInput(
                    props.height ?? 30, props.placeholder,
                    props.characterLimit,
                    DOMObject.colorToString(props.bgColor ?? UITheme.textInput.colors.background)
                )
                : TextInputObject.createTextArea(props.rows ?? 1)
        );

        if (props.characterLimit) {
            this._characterLimit = props.characterLimit;
        }

        // Defaults
        this._fontSize = props.fontSize;
        this._rows = props.rows ?? 1;
        this._fontFamily = Fonts.STDFONT;
        this._fontWeight = FontWeight.REGULAR;
        this._bgColor = props.bgColor ?? UITheme.textInput.colors.background;
        this._borderColor = props.borderColor ?? null;
        this._textColor = UITheme.textInput.colors.text;
        this._borderRadius = 5;
        this.width = props.width ?? 100;

        // Don't force a default height when using a text area, as the number of rows will determine that
        if (!props.rows || props.rows === 1 || props.height) {
            this.height = props.height ?? 30;
        }

        if (this._characterLimit) {
            let input: HTMLInputElement | HTMLTextAreaElement | undefined;
            for (const child of this._obj.children) {
                if (child instanceof HTMLInputElement) {
                    input = child as HTMLInputElement;
                } else if (child instanceof HTMLTextAreaElement) {
                    input = child as HTMLTextAreaElement;
                } else if (child instanceof HTMLDivElement) {
                    for (const ele of child.children) {
                        if (ele instanceof SVGElement) {
                            for (const circle of ele.children) {
                                if (
                                    circle.id === TextInputObject._PROGRESS_ARC_ID
                                    && circle instanceof SVGCircleElement
                                ) {
                                    this._progressArc = circle as SVGCircleElement;
                                }
                            }
                        } else if (ele instanceof HTMLSpanElement) {
                            this._characterText = ele as HTMLSpanElement;
                        }
                    }
                }
            }

            if (input) {
                input.oninput = () => this.onInput();
                input.onfocus = () => this.onFocusChanged(true);
                input.onblur = () => this.onFocusChanged(false);
                input.onkeypress = (e) => this.keyPressed.emit(e.key);
                document.addEventListener('keydown', ({key}) => {
                    if (!this._hasFocus) return;
                    if (key === 'Escape') {
                        this.keyPressed.emit('Escape');
                    } else if (key === 'Enter') {
                        this.keyPressed.emit('Enter');
                    }
                });
            }
        } else if (this._obj instanceof HTMLInputElement || this._obj instanceof HTMLTextAreaElement) {
            this._obj.oninput = () => this.onInput();
            this._obj.onfocus = () => this.onFocusChanged(true);
            this._obj.onblur = () => this.onFocusChanged(false);
            this._obj.onkeypress = (e) => this.keyPressed.emit(e.key);
            document.addEventListener('keydown', ({key}) => {
                if (!this._hasFocus) return;
                if (key === 'Escape') {
                    this.keyPressed.emit('Escape');
                } else if (key === 'Enter') {
                    this.keyPressed.emit('Enter');
                }
            });
        }
    }

    protected added(): void {
        super.added();

        // When our fakeTextInput is clicked, show and focus our real textInput
        new DisplayObjectPointerTarget(this._dummyDisp).pointerDown.connect(() => {
            if (this._fakeTextInput != null) {
                setTimeout(() => {
                    this.destroyFakeTextInput();
                    this._obj.style.visibility = 'visible';
                    // On Chrome, it seems there's a bug (?) that causes the input to zoom into focus
                    // based on its actual position and not its transformed position, or... something
                    // At any rate without this when a partially offscreen textbox is shown the entire
                    // page moves.
                    if (this._obj instanceof HTMLInputElement || this._obj instanceof HTMLTextAreaElement) {
                        this._obj.focus({preventScroll: true});
                    } else {
                        let input: HTMLInputElement | HTMLTextAreaElement | undefined;
                        for (const child of this._obj.children) {
                            if (child instanceof HTMLInputElement) {
                                input = child as HTMLInputElement;
                            } else if (child instanceof HTMLTextAreaElement) {
                                input = child as HTMLTextAreaElement;
                            }
                        }
                        if (input) {
                            input.focus({preventScroll: true});
                        }
                    }
                }, 0);
            }
        });

        this._dummyDisp.interactive = false;

        if (this._showFakeTextInputWhenNotFocused) {
            this.onFocusChanged(this._hasFocus);
        }

        this.updateCharacterCounter();
    }

    private onFocusChanged(focused: boolean): void {
        this._hasFocus = focused;
        if (this.isLiveObject && this._showFakeTextInputWhenNotFocused) {
            if (focused) {
                this.destroyFakeTextInput();
            } else {
                this.createFakeTextInput();
            }
        }
    }

    protected updateElementProperties(): void {
        super.updateElementProperties();
        if (this._fakeTextInput != null) {
            this._obj.style.visibility = 'hidden';
        } else {
            this._obj.style.visibility = 'visible';
        }
    }

    protected stylesChanged() {
        if (this._characterLimit) {
            let input: HTMLInputElement | HTMLTextAreaElement | undefined;
            for (const child of this._obj.children) {
                if (child instanceof HTMLInputElement) {
                    input = child as HTMLInputElement;
                } else if (child instanceof HTMLTextAreaElement) {
                    input = child as HTMLTextAreaElement;
                }
            }

            if (input) {
                input.style.fontSize = DOMObject.sizeToString(this._fontSize);
                input.style.fontFamily = this._fontFamily;
                input.style.fontWeight = this._fontWeight;
                input.style.color = DOMObject.colorToString(this._textColor);
                input.style.backgroundColor = DOMObject.colorToString(this._bgColor);
                if (this._borderColor) {
                    input.style.borderColor = DOMObject.colorToString(this._borderColor);
                }
                input.style.borderRadius = this._borderRadius.toString();
            }
        } else if (this._obj instanceof HTMLInputElement || this._obj instanceof HTMLTextAreaElement) {
            this._obj.style.fontSize = DOMObject.sizeToString(this._fontSize);
            this._obj.style.fontFamily = this._fontFamily;
            this._obj.style.fontWeight = this._fontWeight;
            this._obj.style.color = DOMObject.colorToString(this._textColor);
            this._obj.style.backgroundColor = DOMObject.colorToString(this._bgColor);
            if (this._borderColor) {
                this._obj.style.borderColor = DOMObject.colorToString(this._borderColor);
            }
            this._obj.style.borderRadius = this._borderRadius.toString();
        }
        this.onSizeChanged();
    }

    protected onSizeChanged(): void {
        super.onSizeChanged();
        if (this._fakeTextInput != null) {
            // recreate our fake text input when our properties change
            this.createFakeTextInput();
        }
    }

    /**
     * If true, the TextInput DOM element will be hidden when the TextInput doesn't have focus,
     * and a fake text input object will be show in its place. This allows the TextInputObject to play better
     * with WebGL: we can pretend that the object is properly layered in our scene, and use masks and whatnot.
     */
    public showFakeTextInputWhenNotFocused(value: boolean = true): TextInputObject {
        if (this._showFakeTextInputWhenNotFocused !== value) {
            this._showFakeTextInputWhenNotFocused = value;
            this.onFocusChanged(this._hasFocus);
        }
        return this;
    }

    /** Remove all input that matches the given regexp */
    public disallow(regexp: RegExp): TextInputObject {
        this._disallow = regexp;
        return this;
    }

    public font(fontFamily: string): TextInputObject {
        this._fontFamily = fontFamily;
        this.stylesChanged();
        return this;
    }

    public fontWeight(weight: FontWeight): TextInputObject {
        this._fontWeight = weight;
        this.stylesChanged();
        return this;
    }

    public bold(): TextInputObject {
        return this.fontWeight(FontWeight.BOLD);
    }

    public placeholderText(value: string): TextInputObject {
        if (this._characterLimit) {
            let input: HTMLInputElement | HTMLTextAreaElement | undefined;
            for (const child of this._obj.children) {
                if (child instanceof HTMLInputElement) {
                    input = child as HTMLInputElement;
                } else if (child instanceof HTMLTextAreaElement) {
                    input = child as HTMLTextAreaElement;
                }
            }

            if (input) {
                input.placeholder = value;
            }
        } else if (this._obj instanceof HTMLInputElement || this._obj instanceof HTMLTextAreaElement) {
            this._obj.placeholder = value;
        }
        return this;
    }

    public borderColor(value: number): TextInputObject {
        this._borderColor = value;
        this.stylesChanged();
        return this;
    }

    public set readOnly(value: boolean) {
        if (this._characterLimit) {
            let input: HTMLInputElement | HTMLTextAreaElement | undefined;
            for (const child of this._obj.children) {
                if (child instanceof HTMLInputElement) {
                    input = child as HTMLInputElement;
                } else if (child instanceof HTMLTextAreaElement) {
                    input = child as HTMLTextAreaElement;
                }
            }

            if (input) {
                input.readOnly = value;
            }
        } else if (this._obj instanceof HTMLInputElement || this._obj instanceof HTMLTextAreaElement) {
            this._obj.readOnly = value;
        }
    }

    public setFocus(select: boolean = false): void {
        // If the element is invisible before focusing, it won't focus
        this._obj.style.visibility = 'visible';

        if (this._characterLimit) {
            let input: HTMLInputElement | HTMLTextAreaElement | undefined;
            for (const child of this._obj.children) {
                if (child instanceof HTMLInputElement) {
                    input = child as HTMLInputElement;
                } else if (child instanceof HTMLTextAreaElement) {
                    input = child as HTMLTextAreaElement;
                }
            }

            if (input) {
                input.focus();
                if (select) {
                    input.setSelectionRange(0, input.value.length);
                }
            }
        } else if (this._obj instanceof HTMLInputElement || this._obj instanceof HTMLTextAreaElement) {
            this._obj.focus();
            if (select) {
                this._obj.setSelectionRange(0, this._obj.value.length);
            }
        }
    }

    public get width(): number {
        if (this._characterLimit) {
            let input: HTMLInputElement | HTMLTextAreaElement | undefined;
            for (const child of this._obj.children) {
                if (child instanceof HTMLInputElement) {
                    input = child as HTMLInputElement;
                } else if (child instanceof HTMLTextAreaElement) {
                    input = child as HTMLTextAreaElement;
                }
            }

            if (input) {
                return input.getBoundingClientRect().width;
            }
        }

        return this._obj.getBoundingClientRect().width;
    }

    public set width(value: number) {
        if (this._characterLimit) {
            let input: HTMLInputElement | HTMLTextAreaElement | undefined;
            for (const child of this._obj.children) {
                if (child instanceof HTMLInputElement) {
                    input = child as HTMLInputElement;
                } else if (child instanceof HTMLTextAreaElement) {
                    input = child as HTMLTextAreaElement;
                }
            }

            if (input) {
                input.style.width = DOMObject.sizeToString(value);
            }
        } else {
            this._obj.style.width = DOMObject.sizeToString(value);
        }

        this.stylesChanged();
    }

    public get height(): number {
        if (this._characterLimit) {
            let input: HTMLInputElement | HTMLTextAreaElement | undefined;
            for (const child of this._obj.children) {
                if (child instanceof HTMLInputElement) {
                    input = child as HTMLInputElement;
                } else if (child instanceof HTMLTextAreaElement) {
                    input = child as HTMLTextAreaElement;
                }
            }

            if (input) {
                return input.getBoundingClientRect().height;
            }
        }

        return this._obj.getBoundingClientRect().height;
    }

    public set height(value: number) {
        if (this._characterLimit) {
            let input: HTMLInputElement | HTMLTextAreaElement | undefined;
            for (const child of this._obj.children) {
                if (child instanceof HTMLInputElement) {
                    input = child as HTMLInputElement;
                } else if (child instanceof HTMLTextAreaElement) {
                    input = child as HTMLTextAreaElement;
                }
            }

            if (input) {
                input.style.height = DOMObject.sizeToString(value);
            }
        } else {
            this._obj.style.height = DOMObject.sizeToString(value);
        }

        this.stylesChanged();
    }

    public get text(): string {
        if (this._characterLimit) {
            let input: HTMLInputElement | HTMLTextAreaElement | undefined;
            for (const child of this._obj.children) {
                if (child instanceof HTMLInputElement) {
                    input = child as HTMLInputElement;
                } else if (child instanceof HTMLTextAreaElement) {
                    input = child as HTMLTextAreaElement;
                }
            }

            if (input) {
                return input.value;
            }
        } else if (this._obj instanceof HTMLInputElement || this._obj instanceof HTMLTextAreaElement) {
            return this._obj.value;
        }

        return '';
    }

    public set text(value: string) {
        if (this._characterLimit) {
            let input: HTMLInputElement | HTMLTextAreaElement | undefined;
            for (const child of this._obj.children) {
                if (child instanceof HTMLInputElement) {
                    input = child as HTMLInputElement;
                } else if (child instanceof HTMLTextAreaElement) {
                    input = child as HTMLTextAreaElement;
                }
            }

            if (input) {
                input.value = value;
            }
        } else if (this._obj instanceof HTMLInputElement || this._obj instanceof HTMLTextAreaElement) {
            this._obj.value = value;
        }

        if (this._fakeTextInput != null) {
            // Recreate the text input since the text inside changed
            this.createFakeTextInput();
        }
    }

    public get caretPosition(): number | null {
        if (this._characterLimit) {
            let input: HTMLInputElement | HTMLTextAreaElement | undefined;
            for (const child of this._obj.children) {
                if (child instanceof HTMLInputElement) {
                    input = child as HTMLInputElement;
                } else if (child instanceof HTMLTextAreaElement) {
                    input = child as HTMLTextAreaElement;
                }
            }

            if (input) {
                return input.selectionStart === input.selectionEnd ? input.selectionStart : -1;
            }
        } else if (this._obj instanceof HTMLInputElement || this._obj instanceof HTMLTextAreaElement) {
            return this._obj.selectionStart === this._obj.selectionEnd ? this._obj.selectionStart : -1;
        }
        return -1;
    }

    public get tabIndex(): number {
        if (this._characterLimit) {
            let input: HTMLInputElement | HTMLTextAreaElement | undefined;
            for (const child of this._obj.children) {
                if (child instanceof HTMLInputElement) {
                    input = child as HTMLInputElement;
                } else if (child instanceof HTMLTextAreaElement) {
                    input = child as HTMLTextAreaElement;
                }
            }

            if (input) {
                return input.tabIndex;
            }
        }

        return this._obj.tabIndex;
    }

    public set tabIndex(value: number) {
        if (this._characterLimit) {
            let input: HTMLInputElement | HTMLTextAreaElement | undefined;
            for (const child of this._obj.children) {
                if (child instanceof HTMLInputElement) {
                    input = child as HTMLInputElement;
                } else if (child instanceof HTMLTextAreaElement) {
                    input = child as HTMLTextAreaElement;
                }
            }

            if (input) {
                input.tabIndex = value;
            }
        } else {
            this._obj.tabIndex = value;
        }
    }

    public copyToClipboard(): void {
        const wasFocused = document.activeElement === this._obj;
        const wasVisible = this._obj.style.visibility === 'visible';
        this._obj.style.visibility = 'visible';
        this.setFocus(true);
        document.execCommand('copy');
        this.setFocus(wasFocused);
        if (!wasVisible) this._obj.style.visibility = 'hidden';
    }

    private onInput(): void {
        if (this._disallow != null) {
            const curValue = this.text;
            if (this._characterLimit) {
                let input: HTMLInputElement | HTMLTextAreaElement | undefined;
                for (const child of this._obj.children) {
                    if (child instanceof HTMLInputElement) {
                        input = child as HTMLInputElement;
                    } else if (child instanceof HTMLTextAreaElement) {
                        input = child as HTMLTextAreaElement;
                    }
                }

                if (input) {
                    input.value = input.value.replace(this._disallow, '');
                }
            } else if (this._obj instanceof HTMLInputElement || this._obj instanceof HTMLTextAreaElement) {
                this._obj.value = this._obj.value.replace(this._disallow, '');
            }

            if (this.text !== curValue) {
                return;
            }
        }

        this.valueChanged.emit(this.text);
        this.updateCharacterCounter();
    }

    private destroyFakeTextInput(): void {
        if (this._fakeTextInput != null) {
            if (!this._fakeTextInput.destroyed) this._fakeTextInput.destroy({children: true});
            this._fakeTextInput = null;
            this._dummyDisp.interactive = false;
        }
    }

    private createFakeTextInput(): void {
        this.destroyFakeTextInput();

        this._dummyDisp.interactive = true;

        this._fakeTextInput = new Sprite();

        const bg = new Graphics();
        if (this._borderColor) {
            bg.lineStyle(1, this._borderColor);
        }
        bg.beginFill(this._bgColor)
            .drawRoundedRect(0, 0, this.width, this.height, this._borderRadius)
            .endFill();
        this._fakeTextInput.addChild(bg);

        const textMask = new Graphics().beginFill(0x0).drawRect(0, 0, this.width, this.height).endFill();
        this._fakeTextInput.addChild(textMask);

        let displayText = this.text;
        let textColor = this._textColor;
        let input: HTMLInputElement | HTMLTextAreaElement | undefined;
        if (this._characterLimit) {
            for (const child of this._obj.children) {
                if (child instanceof HTMLInputElement) {
                    input = child as HTMLInputElement;
                } else if (child instanceof HTMLTextAreaElement) {
                    input = child as HTMLTextAreaElement;
                }
            }

            if (input) {
                displayText = this.text.length === 0 ? input.placeholder : this.text;
            }
            textColor = this.text.length === 0 ? 0x777777 : this._textColor;
        } else if (this._obj instanceof HTMLInputElement || this._obj instanceof HTMLTextAreaElement) {
            displayText = this.text.length === 0 ? this._obj.placeholder : this.text;
            textColor = this.text.length === 0 ? 0x777777 : this._textColor;
        }

        // If we try to render text that's too long (say, the sequence for the ribosome 23s sequence in
        // the sequence copy dialog), it can wind up causing Pixi to attempt to work with a context that
        // is larger than the maximum supported size in standard WebGL implementations. In particular,
        // this will crash in Firefox.
        //
        // Since we'd be masking out the majority of this text anyways, it's safe to just clip it somewhere around
        // the end of the mask. The font size may not directly correlate to number of pixels, so the * 2 is just
        // to ensure we're cutting it off with plenty of room to spare - I can't immediately imagine a situation
        // where it would be insufficient, and our input width should always be small enough that it will never
        // be too large as to not prevent the WebGL size issue.
        //
        // See for example https://stackoverflow.com/a/12644047/5557208
        const limitedText = displayText.substring(0, (this.width / this._fontSize) * 2);

        const text = new TextBuilder(limitedText)
            .font(this._fontFamily)
            .fontWeight(this._fontWeight)
            .fontSize(this._fontSize)
            .color(textColor)
            .wordWrap(this._rows > 1, this.width - 20)
            .hAlignLeft()
            .build();
        text.mask = textMask;
        if (this._characterLimit) {
            for (const child of this._obj.children) {
                if (child instanceof HTMLInputElement) {
                    input = child as HTMLInputElement;
                } else if (child instanceof HTMLTextAreaElement) {
                    input = child as HTMLTextAreaElement;
                }
            }

            if (input) {
                text.position.set(
                    parseFloat(window.getComputedStyle(input, null).getPropertyValue('padding-left')),
                    this._rows === 1
                        ? (this.height - this._fontSize) / 2
                        : parseFloat(window.getComputedStyle(input, null).getPropertyValue('padding-left'))
                );
            }
        } else if (this._obj instanceof HTMLInputElement || this._obj instanceof HTMLTextAreaElement) {
            text.position.set(
                parseFloat(window.getComputedStyle(this._obj, null).getPropertyValue('padding-left')),
                this._rows === 1
                    ? (this.height - text.height) / 2
                    : parseFloat(window.getComputedStyle(this._obj, null).getPropertyValue('padding-left'))
            );
        }
        this._fakeTextInput.addChild(text);
        this._dummyDisp.addChild(this._fakeTextInput);
    }

    private updateCharacterCounter() {
        if (this._characterLimit) {
            const percent = 100 * (this.text.length / this._characterLimit);
            this._progressArc.setAttribute('stroke', percent > 100 ? '#D73832' : '#4A90E2');
            this._progressArc.setAttribute('style', `stroke-dashoffset: ${TextInputObject.computeRadialProgress(this.height, percent)}; transform: rotate(-90deg); transform-origin: 50% 50%; transition: stroke-dashoffset 0.3s;`);

            const charactersLeft = this._characterLimit - this.text.length;
            if (charactersLeft < TextInputObject._SHOW_CHARACTERS_LEFT_THRESHOLD) {
                this._characterText.innerText = `${charactersLeft}`;
                this._characterText.style.color = percent > 100 ? '#D73832' : '#FFFFFF';
            } else {
                this._characterText.innerText = '';
                this._characterText.style.color = percent > 100 ? '#D73832' : '#FFFFFF';
            }
        }
    }

    private static createTextArea(rows: number): HTMLTextAreaElement {
        const element = document.createElement('textarea');
        element.rows = rows;
        element.title = '';
        element.style.resize = 'none';
        return element;
    }

    private static createTextInput(
        height: number,
        placeholder?: string,
        characterLimit?: number,
        bgColor?: string
    ): HTMLDivElement | HTMLInputElement {
        if (characterLimit) {
            const progressRingHeight = TextInputObject.progressRingHeight(height);
            const container = document.createElement('div');
            container.classList.add('eterna-character-limited-input-container');
            const input = document.createElement('input');
            input.type = 'text';
            input.title = '';
            input.placeholder = placeholder ?? '';
            input.className = 'eterna-input';
            input.style.paddingLeft = `${TextInputObject.textInputPadding(height)}px`;
            input.style.paddingRight = `${2 * TextInputObject.textInputPadding(height) + progressRingHeight}px`;
            container.appendChild(input);
            const radialProgressBarContainer = document.createElement('div');
            radialProgressBarContainer.classList.add('eterna-character-limited-input-radial-progress-bar');
            radialProgressBarContainer.style.top = `${(height - progressRingHeight) / 2}px`;
            radialProgressBarContainer.style.right = `${TextInputObject.textInputPadding(height)}px`;
            container.appendChild(radialProgressBarContainer);
            const radialProgressBar = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            radialProgressBar.setAttribute('height', `${progressRingHeight}`);
            radialProgressBar.setAttribute('width', `${progressRingHeight}`);
            radialProgressBar.style.width = `${progressRingHeight}px`;
            radialProgressBar.style.height = `${progressRingHeight}px`;
            radialProgressBar.style.borderRadius = `${progressRingHeight / 2}px`;
            radialProgressBarContainer.appendChild(radialProgressBar);
            const progressArc = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            progressArc.id = TextInputObject._PROGRESS_ARC_ID;
            progressArc.setAttribute('stroke', '#4A90E2');
            progressArc.setAttribute('fill', 'transparent');
            progressArc.setAttribute('stroke-width', `${TextInputObject.progressRingThickness(height)}`);
            progressArc.setAttribute('stroke-dasharray', `${TextInputObject.progressRingCircumference(height)} ${TextInputObject.progressRingCircumference(height)}`);
            progressArc.setAttribute('r', `${TextInputObject.progressRingRadius(height)}`);
            progressArc.setAttribute('cx', `${progressRingHeight / 2}`);
            progressArc.setAttribute('cy', `${progressRingHeight / 2}`);
            progressArc.setAttribute('style', `stroke-dashoffset: ${TextInputObject.computeRadialProgress(height, 0)}; transform: rotate(-90deg); transform-origin: 50% 50%; transition: stroke-dashoffset 0.3s;`);
            radialProgressBar.appendChild(progressArc);
            const innerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            if (bgColor) {
                innerCircle.setAttribute('fill', bgColor);
            }
            innerCircle.setAttribute('r', `${TextInputObject.progressRingRadius(height) - TextInputObject.progressRingThickness(height) / 2}`);
            innerCircle.setAttribute('cx', `${progressRingHeight / 2}`);
            innerCircle.setAttribute('cy', `${progressRingHeight / 2}`);
            radialProgressBar.appendChild(innerCircle);
            const characterText = document.createElement('span');
            characterText.style.position = 'absolute';
            characterText.style.fontWeight = '400';
            characterText.style.fontFamily = 'Open Sans';
            characterText.style.fontSize = '0.8em';
            characterText.style.color = '#ffffff';
            characterText.innerText = '';
            radialProgressBarContainer.appendChild(characterText);
            return container;
        } else {
            const element = document.createElement('input');
            element.type = 'text';
            element.title = '';
            element.placeholder = placeholder ?? '';
            element.className = 'eterna-input';
            element.style.paddingLeft = '10px';
            return element;
        }
    }

    private static computeRadialProgress(height: number, percent: number): number {
        const circumference = TextInputObject.progressRingRadius(height) * 2 * Math.PI;
        const offset = circumference - (circumference * (Math.min(percent, 100) / 100));
        return offset;
    }

    private static progressRingRadius(height: number): number {
        return (TextInputObject.progressRingHeight(height) - TextInputObject.progressRingThickness(height)) / 2;
    }

    private static progressRingThickness(height: number): number {
        return (3 / 45) * height;
    }

    private static progressRingHeight(height: number): number {
        return Math.max((30 / 45) * height, 13);
    }

    private static textInputPadding(height: number): number {
        return Math.max((10 / 45) * height, 7);
    }

    private static progressRingCircumference(height: number): number {
        return TextInputObject.progressRingRadius(height) * 2 * Math.PI;
    }

    private readonly _fontSize: number;

    protected readonly _extraBoundsSize = 3;

    private _disallow: RegExp;
    private _fontFamily: string;
    private _fontWeight: FontWeight;
    private _rows: number;
    private _textColor: number;
    private _bgColor: number;
    private _borderColor: number | null;
    private _borderRadius: number;
    private _characterLimit: number | null;
    private _hasFocus: boolean = false;
    private _fakeTextInput: Sprite | null;
    private _showFakeTextInputWhenNotFocused: boolean = true;
    private _progressArc: SVGCircleElement;
    private _characterText: HTMLSpanElement;

    private static _PROGRESS_ARC_ID = 'progress-arc';
    private static _SHOW_CHARACTERS_LEFT_THRESHOLD = 10;
}

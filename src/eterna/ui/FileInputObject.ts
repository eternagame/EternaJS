import {
    Graphics,
    Sprite
} from 'pixi.js';
import {Signal, Registration} from 'signals';
import {
    DOMObject,
    DisplayObjectPointerTarget,
    TextBuilder
} from 'flashbang';
import Eterna from 'eterna/Eterna';
import Fonts from 'eterna/util/Fonts';
import {FontWeight} from 'flashbang/util/TextBuilder';
import UITheme from './UITheme';
import Tooltips from './Tooltips';

interface FileInputObjectProps {
    id: string;
    width: number;
    height: number;
    acceptedFiletypes: string;
    fontSize?: number;
    labelText?: string;
    labelIcon?: string;
    bgColor?: number;
    border?: boolean;
    borderColor?: number;
    textColor?: number;
    domParent?: string | HTMLElement;
}

export interface HTMLInputEvent extends Event {
    target: HTMLInputElement & EventTarget;
}

/**
 * A file input object in the DOM. Floats on top of the PIXI canvas.
 * When it loses focus, it creates a fake file input display placeholder, and hides the DOM element.
 */
export default class FileInputObject extends DOMObject<HTMLInputElement | HTMLDivElement> {
    public readonly fileSelected = new Signal<HTMLInputEvent>();

    constructor(props: FileInputObjectProps) {
        super(
            props.domParent ?? Eterna.OVERLAY_DIV_ID,
            FileInputObject.createFileInput(
                props.id,
                props.height ?? 30,
                props.width ?? 100,
                props.acceptedFiletypes,
                props.labelText,
                props.fontSize ?? FileInputObject.DEFAULT_FONT_SIZE,
                props.labelIcon,
                props.bgColor ? DOMObject.colorToString(props.bgColor) : undefined,
                props.border,
                props.borderColor ? DOMObject.colorToString(props.borderColor) : undefined,
                FileInputObject.BORDER_RADIUS,
                DOMObject.colorToString(props.textColor ?? UITheme.fileInput.colors.text)
            )
        );

        // Defaults
        this._fontSize = props.fontSize || FileInputObject.DEFAULT_FONT_SIZE;
        this._fontFamily = Fonts.STDFONT;
        this._fontWeight = FontWeight.REGULAR;
        this._bgColor = props.bgColor ?? undefined;
        this._border = props.border || false;
        this._borderColor = props.borderColor ?? undefined;
        this._textColor = UITheme.fileInput.colors.text ?? FileInputObject.DEFAULT_FONT_SIZE;
        this._borderRadius = FileInputObject.BORDER_RADIUS;
        this.width = props.width ?? 100;
        this.height = props.height ?? 30;
        this._labelText = props.labelText || undefined;
        this._labelIcon = props.labelIcon || undefined;
        this._dummyDisp.cursor = 'pointer';
        this._pointerTarget = new DisplayObjectPointerTarget(this._dummyDisp);

        let input: HTMLInputElement | undefined;
        for (const child of this._obj.children) {
            if (child instanceof HTMLInputElement) {
                input = child as HTMLInputElement;
            } else if (child instanceof HTMLDivElement) {
                for (const ele of child.children) {
                    if (ele instanceof HTMLInputElement) {
                        input = ele as HTMLInputElement;
                    }
                }
            }
        }

        if (input) {
            this._obj.onchange = (e: Event) => {
                const fileInputEvent = e as HTMLInputEvent;
                // We only want to emit signal if we have a file
                // The user could press 'cancel' when the file picker comes up
                if (
                    fileInputEvent.target.files
                    && fileInputEvent.target.files.length > 0
                ) {
                    this.fileSelected.emit(fileInputEvent);
                }
            };
        }
    }

    protected added(): void {
        super.added();

        // When our fakeFileInput is clicked, show, focus and click our real fileInput
        this._pointerTarget.pointerDown.connect(() => {
            this.activateDialog();
        });

        this._dummyDisp.interactive = false;

        this.createFakeFileInput();
        this.setupTooltip();
    }

    public activateDialog() {
        if (this._fakeFileInput != null) {
            // On Chrome, it seems there's a bug (?) that causes the input to zoom into focus
            // based on its actual position and not its transformed position, or... something
            // At any rate without this when a partially offscreen file input is shown the entire
            // page moves.
            if (this._obj instanceof HTMLInputElement) {
                this._obj.focus({preventScroll: true});
                this._obj.click();
            } else {
                let input: HTMLInputElement | undefined;
                for (const child of this._obj.children) {
                    if (child instanceof HTMLInputElement) {
                        input = child as HTMLInputElement;
                    }
                }
                if (input) {
                    input.focus({preventScroll: true});
                    input.click();
                }
            }
        }
    }

    protected updateElementProperties(): void {
        super.updateElementProperties();
        if (this._fakeFileInput != null) {
            this._obj.style.visibility = 'hidden';
        }
    }

    protected stylesChanged() {
        if (this._obj instanceof HTMLInputElement || this._obj instanceof HTMLDivElement) {
            this._obj.style.fontSize = DOMObject.sizeToString(this._fontSize);
            this._obj.style.fontFamily = this._fontFamily;
            this._obj.style.fontWeight = this._fontWeight;
            this._obj.style.color = DOMObject.colorToString(this._textColor);
            if (this._bgColor) {
                this._obj.style.backgroundColor = DOMObject.colorToString(this._bgColor);
            }
            if (this._borderColor) {
                this._obj.style.borderColor = DOMObject.colorToString(this._borderColor);
            }
            this._obj.style.borderRadius = this._borderRadius.toString();
        }
        this.onSizeChanged();
    }

    protected onSizeChanged(): void {
        super.onSizeChanged();
        if (this._fakeFileInput != null) {
            // recreate our fake text input when our properties change
            this.createFakeFileInput();
        }
    }

    public font(fontFamily: string): FileInputObject {
        this._fontFamily = fontFamily;
        this.stylesChanged();
        return this;
    }

    public fontWeight(weight: FontWeight): FileInputObject {
        this._fontWeight = weight;
        this.stylesChanged();
        return this;
    }

    public bold(): FileInputObject {
        return this.fontWeight(FontWeight.BOLD);
    }

    public borderColor(value: number): FileInputObject {
        this._borderColor = value;
        this.stylesChanged();
        return this;
    }

    public get width(): number {
        return this._obj.getBoundingClientRect().width;
    }

    public set width(value: number) {
        this._obj.style.width = DOMObject.sizeToString(value);

        this.stylesChanged();
    }

    public get height(): number {
        return this._obj.getBoundingClientRect().height;
    }

    public set height(value: number) {
        this._obj.style.height = DOMObject.sizeToString(value);
        this.stylesChanged();
    }

    public get labelText(): string | undefined {
        return this._labelText;
    }

    public set labelText(value: string | undefined) {
        this._labelText = value;

        if (this._fakeFileInput != null) {
            // Recreate the file input since the text inside changed
            this.createFakeFileInput();
        }
    }

    public get labelIcon(): string | undefined {
        return this._labelIcon;
    }

    public set labelIcon(value: string | undefined) {
        this._labelIcon = value;

        if (this._fakeFileInput != null) {
            // Recreate the file input since the text inside changed
            this.createFakeFileInput();
        }
    }

    private destroyFakeFileInput(): void {
        if (this._fakeFileInput != null) {
            if (!this._fakeFileInput.destroyed) this._fakeFileInput.destroy({children: true});
            this._fakeFileInput = null;
            this._dummyDisp.interactive = false;
        }
    }

    private createFakeFileInput(): void {
        this.destroyFakeFileInput();

        this._dummyDisp.interactive = true;

        this._fakeFileInput = new Sprite();

        let bg: Graphics;
        if (this._bgColor) {
            bg = new Graphics()
                .lineStyle(this._border ? 1 : 0, this._borderColor)
                .beginFill(this._bgColor)
                .drawRoundedRect(0, 0, this.width, this.height, this._borderRadius)
                .endFill();
        } else {
            bg = new Graphics()
                .lineStyle(this._border ? 1 : 0, this._borderColor)
                .drawRoundedRect(0, 0, this.width, this.height, this._borderRadius);
        }
        this._fakeFileInput.addChild(bg);

        // Icon
        let icon: Sprite | null = null;
        if (this._labelIcon) {
            icon = Sprite.from(this._labelIcon);
            this._fakeFileInput.addChild(icon);
            const labelLength = this.height;
            icon.width = labelLength;
            icon.height = labelLength;
            icon.x = parseFloat(window.getComputedStyle(this._obj, null).getPropertyValue('padding-left'));
            icon.y = (this.height - labelLength) / 2;
        }

        // Text
        if (this._labelText && this._labelText.length > 0) {
            const textColor = this._textColor;
            const labelText = new TextBuilder(this._labelText)
                .font(this._fontFamily)
                .fontWeight(this._fontWeight)
                .fontSize(this._fontSize)
                .color(textColor)
                .hAlignLeft()
                .build();
            const textMask = new Graphics().beginFill(0x0).drawRect(0, 0, this.width, this.height).endFill();
            this._fakeFileInput.addChild(textMask);
            labelText.mask = textMask;
            if (this._obj instanceof HTMLInputElement || this._obj instanceof HTMLDivElement) {
                const x = icon
                    ? parseFloat(window.getComputedStyle(this._obj, null).getPropertyValue('padding-left'))
                    + FileInputObject.LABEL_ICON_PADDING
                    + icon.width
                    : parseFloat(window.getComputedStyle(this._obj, null).getPropertyValue('padding-left'));
                const y = (this.height - labelText.height) / 2;
                labelText.position.set(x, y);
            }
            this._fakeFileInput.addChild(labelText);
        }

        this._dummyDisp.addChild(this._fakeFileInput);
    }

    private static createFileInput(
        id: string,
        height: number,
        width: number,
        acceptedFiletypes: string,
        labelText?: string,
        fontSize?: number,
        labelIcon?: string,
        bgColor?: string,
        border?: boolean,
        borderColor?: string,
        borderRadius?: number,
        textColor?: string
    ): HTMLDivElement | HTMLInputElement {
        const container = document.createElement('div');
        container.style.position = 'relative';
        container.style.height = `${height}px`;
        container.style.width = `${width}px`;
        if (bgColor) {
            container.style.backgroundColor = bgColor;
        }
        if (border) {
            container.style.border = `1px solid ${borderColor ?? '#FFFFFF'}`;
        }
        if (borderRadius) {
            container.style.borderRadius = `${borderRadius}px`;
        }
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = acceptedFiletypes;
        input.setAttribute('name', id);
        input.title = '';
        input.style.width = '0.1px';
        input.style.height = '0.1px';
        input.style.opacity = '0';
        input.style.overflow = 'hidden';
        input.style.position = 'absolute';
        input.style.zIndex = '-1';
        container.appendChild(input);
        let icon: HTMLImageElement | null = null;
        if (labelIcon) {
            icon = document.createElement('img');
            icon.style.height = `${height}`;
            icon.src = labelIcon;
            container.appendChild(icon);
        }
        if (labelText) {
            const label = document.createElement('label');
            label.setAttribute('for', id);
            label.style.display = 'inline-block';
            label.style.position = 'absolute';
            label.style.top = '50%';
            if (icon) {
                label.style.left = `${icon.width}px`;
            }
            label.style.transform = 'translateY(-50%)';
            label.style.fontWeight = '400';
            label.style.fontFamily = 'Open Sans';
            label.style.fontSize = `${fontSize}px`;
            label.style.color = textColor ?? '#FFFFFF';
            label.innerHTML = labelText;
            container.appendChild(label);
        }

        return container;
    }

    public tooltip(text: string): FileInputObject {
        if (this._tooltip !== text) {
            this._tooltip = text;
            if (this.isLiveObject) {
                this.setupTooltip();
            }
        }
        return this;
    }

    private setupTooltip(): void {
        if (this._tooltipReg != null) {
            this._tooltipReg.close();
            this._tooltipReg = null;
        }

        if (this._tooltip != null && this._tooltip !== '' && Tooltips.instance != null) {
            this._tooltipReg = this.regs.add(Tooltips.instance.addTooltip(this._pointerTarget, this._tooltip));
        }
    }

    private readonly _fontSize: number;

    private _fontFamily: string;
    private _fontWeight: FontWeight;
    private _textColor: number;
    private _bgColor: number | undefined;
    private _border: boolean;
    private _borderColor: number | undefined;
    private _borderRadius: number;
    private _labelText: string | undefined;
    private _labelIcon: string | undefined;
    private _fakeFileInput: Sprite | null;
    private _tooltip: string;
    private _tooltipReg: Registration | null;
    private _pointerTarget: DisplayObjectPointerTarget;

    private static readonly DEFAULT_FONT_SIZE: number = 15;
    private static readonly LABEL_ICON_PADDING: number = 0;
    private static readonly BORDER_RADIUS: number = 5;
}

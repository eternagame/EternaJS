import {
    Graphics, InteractionEvent, Text
} from 'pixi.js';
import {DropShadowFilter} from '@pixi/filter-drop-shadow';
import Fonts from 'eterna/util/Fonts';
import {SignalView} from 'signals';
import GraphicsObject from 'flashbang/objects/GraphicsObject';
import BaseGamePanel from './BaseGamePanel';

export enum GamePanelType {
    NORMAL, INVISIBLE
}

interface GamePanelProps {
    type?: GamePanelType;
    alpha?: number;
    color?: number;
    borderAlpha?: number;
    borderColor?: number;
    dropShadow?: boolean;
    borderRadius?: number;
    borderThickness?: number;
    titleFontSize?: number;
    titleUpperCase?: boolean;
    forceTitleBar?: boolean;
}

export default class GamePanel extends BaseGamePanel {
    constructor(props: GamePanelProps) {
        super();

        const type = props.type || GamePanelType.NORMAL;
        const alpha = props.alpha !== undefined ? props.alpha : 1;
        const color = props.color ?? 0x025191;
        const borderAlpha = props.borderAlpha !== undefined ? props.borderAlpha : 0.0;
        const borderColor = props.borderColor !== undefined ? props.borderColor : 0x2892E9;
        const borderRadius = props.borderRadius !== undefined ? props.borderRadius : 5;
        const borderThickness = props.borderThickness !== undefined
            ? props.borderThickness : GamePanel.DEFAULT_BORDER_THICKNESS;
        const dropShadow = props.dropShadow || false;
        const titleFontSize = props.titleFontSize ?? 16;
        const titleUpperCase = props.titleUpperCase ?? true;
        const forceTitleBar = props.forceTitleBar ?? false;

        this.setup(
            type,
            alpha,
            color,
            borderAlpha,
            borderColor,
            borderRadius,
            borderThickness,
            dropShadow,
            titleFontSize,
            titleUpperCase,
            forceTitleBar
        );
    }

    public setup(
        type: GamePanelType,
        alpha: number,
        color: number,
        borderAlpha: number,
        borderColor: number,
        borderRadius: number = 0,
        borderThickness: number = 0,
        dropShadow: boolean = false,
        titleFontSize: number = 16,
        titleUpperCase: boolean = true,
        forceTitleBar: boolean = false
    ): void {
        this._type = type;
        this._alpha = alpha;
        this._color = color;
        this._borderAlpha = borderAlpha;
        this._borderColor = borderColor;
        this._borderRadius = borderRadius;
        this._borderThickness = borderThickness;
        this._dropShadow = dropShadow;
        this._titleFontSize = titleFontSize;
        this._titleUpperCase = titleUpperCase;
        this._forceTitleBar = forceTitleBar;
        this.updateView();
    }

    protected added() {
        // Clicks should not pass through the panel
        this.regs.add(this.pointerDown.connect((e) => {
            e.stopPropagation();
        }));

        this._background = new Graphics();
        if (this._dropShadow) {
            this._background.filters = [new DropShadowFilter()];
        }
        this.container.addChild(this._background);

        this._titleBackground = new GraphicsObject();
        this.addObject(this._titleBackground, this.container);

        this.updateView();
    }

    public setSize(width: number, height: number): void {
        this._width = width;
        this._height = height;

        this.updateView();
    }

    public setBorderThickness(thickness: number = GamePanel.DEFAULT_BORDER_THICKNESS): void {
        this._borderThickness = thickness;
        this.updateView();
    }

    public set color(color: number) {
        this._color = color;
        this.updateView();
    }

    public set alpha(alpha: number) {
        this._alpha = alpha;
        this.updateView();
    }

    public set title(title: string) {
        this._title = title;
        this.updateView();
    }

    public get titleHeight(): number {
        if (this._title != null) return GamePanel.FULL_TITLE_BAR_HEIGHT;
        else if (this._forceTitleBar) return GamePanel.FORCE_TITLE_BAR_HEIGHT;
        return 0;
    }

    public get titleTextWidth(): number {
        return this._titleText ? this._titleText.width : 0;
    }

    public get width(): number {
        return this._width;
    }

    public get height(): number {
        return this._height;
    }

    public get borderRadius(): number {
        return this._borderRadius;
    }

    public get titlePointerDown(): SignalView<InteractionEvent> {
        return this._titleBackground.pointerDown;
    }

    protected updateView(): void {
        if (!this.isLiveObject) return;

        this._background.clear();
        this._titleBackground.display.clear();

        if (this._width <= 0 || this._height <= 0) {
            return;
        }

        if (this._type === GamePanelType.INVISIBLE) {
            this._background.beginFill(0x000000, 0);
            this._background.drawRect(0, 0, this._width, this._height);
            this._background.endFill();
        } else {
            this._background.lineStyle(this._borderThickness, this._borderColor, this._borderAlpha);
            this._background.beginFill(this._color, this._alpha);
            this._background.drawRoundedRect(0, 0, this._width, this._height, this._borderRadius);
            this._background.endFill();

            if (this._title !== null) {
                if (this._titleText == null) {
                    this._titleText = Fonts.std().bold().fontSize(this._titleFontSize).color(0xffffff)
                        .build();
                    this.container.addChild(this._titleText);
                }

                this._titleText.text = this._titleUpperCase ? this._title.toUpperCase() : this._title;
                this._titleText.position.set(
                    (this._width - this._titleText.width) * 0.5,
                    (this.titleHeight - this._titleText.height) * 0.5
                );
            }

            if (this._title !== null || this._forceTitleBar) {
                this._titleBackground.display.beginFill(this._borderColor, this._alpha);
                this._titleBackground.display
                    .moveTo(0, this.titleHeight)
                    .lineTo(0, 5)
                    .arcTo(0, 0, 5, 0, 5)
                    .lineTo(this._width - 5, 0)
                    .arcTo(this._width, 0, this._width, 5, 5)
                    .lineTo(this._width, this.titleHeight);
                this._background.endFill();
            }
        }
    }

    protected _background: Graphics;
    protected _titleBackground: GraphicsObject;

    protected _type: GamePanelType;

    protected _alpha: number = 0;
    protected _color: number = 0;
    protected _borderAlpha: number = 0;
    protected _borderColor: number = 0;
    protected _borderRadius: number = 5;
    protected _borderThickness: number = 0;
    protected _dropShadow: boolean = false;
    protected _titleFontSize: number = 16;
    protected _titleUpperCase: boolean = true;
    protected _forceTitleBar: boolean = false;
    protected _title: string | null = null;
    protected _titleText: Text | null = null;

    protected _width: number = 0;
    protected _height: number = 0;

    private static DEFAULT_BORDER_THICKNESS: number = 1.5;
    private static FORCE_TITLE_BAR_HEIGHT: number = 22;
    private static FULL_TITLE_BAR_HEIGHT: number = 35;
}

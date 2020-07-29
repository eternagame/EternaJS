import {Graphics, Point, Text} from 'pixi.js';
import Fonts from 'eterna/util/Fonts';
import BaseGamePanel from './BaseGamePanel';

export enum FancyGamePanelType {
    NORMAL, INVISIBLE, NEW_NOVA
}

export default class FancyGamePanel extends BaseGamePanel {
    constructor(
        type: FancyGamePanelType = FancyGamePanelType.NORMAL,
        alpha: number = 0.07,
        color: number = 0xffffff,
        outlineColor: number = 0xffffff,
        outlineAlpha: number = 0.2
    ) {
        super();

        this._background = new Graphics();
        this.container.addChild(this._background);

        this._type = type;
        this._alpha = alpha;
        this._outlineColor = outlineColor;
        this._outlineAlpha = outlineAlpha;
        this._color = color;
        this._title = null;
        this._titleText = null;
    }

    protected added(): void {
        super.added();
        this.updateView();
    }

    public setSize(width: number, height: number): void {
        this._width = width;
        this._height = height;
        this.updateView();
    }

    public set title(title: string) {
        this._title = title;
        this.updateView();
    }

    public get titleHeight(): number {
        return this._title == null ? 0 : 25;
    }

    protected updateView(): void {
        this._background.clear();

        if (this._width <= 0 || this._height <= 0 || this._type === FancyGamePanelType.INVISIBLE) {
            return;
        }

        if (this._titleText != null) {
            this._titleText.destroy({children: true});
            this._titleText = null;
        }

        this._background.clear();

        if (this._type === FancyGamePanelType.NEW_NOVA) {
            if (this._title != null) {
                this._background.beginFill(0xC0DCE7, 1.0);
                this._background.drawRoundedRect(-1, -25, this._width + 2, this._height + 26, 8);
                this._background.endFill();

                this._titleText = Fonts.std(this._title, 13).bold().color(0x061F3A).build();
                this._titleText.position = new Point(5, -20);
                this.container.addChild(this._titleText);
            } else {
                // Draw the border by just drawing another round rectangle behind the original
                this._background.beginFill(this._outlineColor, this._outlineAlpha);
                this._background.drawRoundedRect(-1.5, -1.5, this._width + 3, this._height + 3, 8);
                this._background.endFill();
            }
        }

        this._background.beginFill(this._color, this._alpha);
        this._background.drawRoundedRect(0, 0, this._width, this._height, 8);
        this._background.endFill();
    }

    private readonly _background: Graphics;

    private readonly _type: FancyGamePanelType;
    private readonly _outlineColor: number;
    private readonly _outlineAlpha: number;
    private readonly _alpha: number = 0;
    private readonly _color: number = 0;

    private _title: string | null = null;
    private _titleText: Text | null = null;
    private _width: number = 0;
    private _height: number = 0;
}

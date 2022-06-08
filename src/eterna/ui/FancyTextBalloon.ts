import {
    Updatable, DisplayUtil, HAlign, VAlign, Vector2
} from 'flashbang';
import Bitmaps from 'eterna/resources/Bitmaps';
import RScriptArrow from 'eterna/rscript/RScriptArrow';
import TextBalloon from './TextBalloon';
import GameButton from './GameButton';
import FancyGamePanel from './FancyGamePanel';
import BaseGamePanel from './BaseGamePanel';

export default class FancyTextBalloon extends TextBalloon implements Updatable {
    constructor(
        balloonColor: number = 0xFFFFFF, balloonAlpha: number = 0.07,
        showOutline = false, outlineColor = 0xFFFFFF,
        outlineAlpha = 0.70
    ) {
        super(undefined, balloonColor, balloonAlpha);

        this._balloonColor = balloonColor;
        this._balloonAlpha = balloonAlpha;
        this._showOutline = showOutline;
        this._outlineColor = outlineColor;
        this._outlineAlpha = outlineAlpha;
    }

    protected added(): void {
        // We do not call TextBalloon.added()
        this._button.destroySelf();

        this._fancyPanel = this._showOutline
            ? new FancyGamePanel(2, this._balloonAlpha, this._balloonColor, this._outlineColor, this._outlineAlpha)
            : new FancyGamePanel(0, this._balloonAlpha, this._balloonColor);
        this.addObject(this._fancyPanel, this.container, 0);

        this._button = new GameButton()
            .up(Bitmaps.NovaNext)
            .over(Bitmaps.NovaNextOver)
            .down(Bitmaps.NovaNextHit);
        this.addObject(this._button, this.container);
        this._button.display.visible = false;
        this._button.display.width = 60;
        this._button.display.height = 25;

        if (this._initialText != null) {
            this.styledText = this._initialText;
        }

        this.updateView();
    }

    public set fixedWidth(inWidth: number) {
        this._fixedWidth = inWidth;
        this._hasFixedWidth = true;

        if (this.isLiveObject) {
            this.updateView();
        }
    }

    /* override */
    public get width(): number {
        return this._hasFixedWidth ? this._fixedWidth : super.width;
    }

    /* override */
    public get height(): number {
        return super.height + this._button.container.height;
    }

    /* override */
    public set title(title: string) {
        this._fancyPanel.title = title;
        this._hasTitle = title != null;
    }

    public addChildArrow(arrow: RScriptArrow): void {
        this._childrenArrows.push(arrow);
    }

    /* override */
    protected updateView(): void {
        this._fancyPanel.setSize(this.width, this.height);

        const innerWidth = this.width - 2 * TextBalloon.W_MARGIN;
        const outerWidth = this.width;

        if (!this._centered) {
            if (this._text != null) {
                this._text.position.set(TextBalloon.W_MARGIN, TextBalloon.H_MARGIN);
            }

            this._fancyPanel.display.position.set(0, 0);
        } else {
            if (this._text != null) {
                this._text.position.set(-innerWidth / 2, TextBalloon.H_MARGIN);
            }

            this._fancyPanel.display.position.set(-outerWidth * 0.5, 0);
        }

        if (this._button.display.visible) {
            DisplayUtil.positionRelative(
                this._button.display, HAlign.RIGHT, VAlign.BOTTOM,
                this._fancyPanel.container, HAlign.RIGHT, VAlign.BOTTOM,
                -TextBalloon.W_MARGIN, -TextBalloon.H_MARGIN
            );
        }
    }

    public update(_dt: number): void {
        for (const arrow of this._childrenArrows) {
            const xdiff: number = (this.display.x + this.container.width / 2) - arrow.display.x;
            const ydiff: number = this.display.y < arrow.display.y
                ? this.display.y - arrow.display.y + this.container.height
                : this.display.y - arrow.display.y;

            if (xdiff !== 0) {
                arrow.rotation = (Math.atan(ydiff / xdiff) * 180) / Math.PI;
            } else {
                arrow.rotation = 0.0;
            }

            if (ydiff > 0.0 && xdiff < 0.0) {
                arrow.rotation += 180;
            } else if (ydiff < 0.0 && xdiff < 0.0) {
                arrow.rotation += 180;
            }

            if (ydiff < 0.0) { // Above
                arrow.baseLength = Vector2.distance(
                    arrow.display.x, arrow.display.y,
                    this.display.x + this.container.width / 2, this.display.y + this.container.height
                );
            } else { // Below
                arrow.baseLength = Vector2.distance(
                    arrow.display.x, arrow.display.y,
                    this.display.x + this.container.width / 2, this.display.y - 50
                );
            }

            arrow.redrawIfDirty();
        }
    }

    private readonly _balloonColor: number;
    private readonly _balloonAlpha: number;
    private readonly _showOutline: boolean;
    private readonly _outlineColor: number;
    private readonly _outlineAlpha: number;

    private _hasFixedWidth: boolean = false;
    private _fixedWidth: number;
    private _childrenArrows: RScriptArrow[] = [];
    private _fancyPanel: BaseGamePanel;
}

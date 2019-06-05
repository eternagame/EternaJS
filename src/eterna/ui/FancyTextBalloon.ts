import {Point} from "pixi.js";
import {HAlign, VAlign, Updatable} from "flashbang/core";
import {Vector2} from "flashbang/geom";
import {DisplayUtil} from "flashbang/util";
import {Bitmaps} from "eterna/resources";
import {RScriptArrow} from "eterna/rscript";
import {FancyGamePanel, GameButton, TextBalloon} from ".";

export default class FancyTextBalloon extends TextBalloon implements Updatable {
    public constructor(balloonColor: number = 0xFFFFFF, balloonAlpha: number = 0.07,
        showOutline: boolean = false, outlineColor: number = 0xFFFFFF,
        outlineAlpha: number = 0.70) {
        super(null, balloonColor, balloonAlpha);

        this._balloonColor = balloonColor;
        this._balloonAlpha = balloonAlpha;
        this._showOutline = showOutline;
        this._outlineColor = outlineColor;
        this._outlineAlpha = outlineAlpha;
    }

    protected added(): void {
        // We do not call TextBalloon.added()
        this._panel.destroySelf();
        this._button.destroySelf();

        this._panel = this._showOutline
            ? new FancyGamePanel(2, this._balloonAlpha, this._balloonColor, this._outlineColor, this._outlineAlpha)
            : new FancyGamePanel(0, this._balloonAlpha, this._balloonColor);
        this.addObject(this._panel, this.container, 0);

        this._button = new GameButton()
            .up(Bitmaps.NovaNext)
            .over(Bitmaps.NovaNextOver)
            .down(Bitmaps.NovaNextHit);
        this.addObject(this._button, this.container);
        this._button.display.visible = false;

        if (this._initialText != null) {
            this.styledText = this._initialText;
        }

        this.updateView();
    }

    public set fixedWidth(in_width: number) {
        this._fixedWidth = in_width;
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
        this._panel.title = title;
        this._hasTitle = title != null;
    }

    public addChildArrow(arrow: RScriptArrow): void {
        this._childrenArrows.push(arrow);
    }

    /* override */
    protected updateView(): void {
        this._panel.setSize(this.width, this.height);

        let innerWidth = this.width - 2 * TextBalloon.W_MARGIN;
        let outerWidth = this.width;

        if (!this._centered) {
            if (this._text != null) {
                this._text.position = new Point(TextBalloon.W_MARGIN, TextBalloon.H_MARGIN);
            }

            this._panel.display.position = new Point(0, 0);
        } else {
            if (this._text != null) {
                this._text.position = new Point(-innerWidth / 2, TextBalloon.H_MARGIN);
            }

            this._panel.display.position = new Point(-outerWidth * 0.5, 0);
        }

        if (this._button.display.visible) {
            DisplayUtil.positionRelative(
                this._button.display, HAlign.RIGHT, VAlign.BOTTOM,
                this._panel.container, HAlign.RIGHT, VAlign.BOTTOM,
                -TextBalloon.W_MARGIN, -TextBalloon.H_MARGIN
            );
        }
    }

    public update(dt: number): void {
        for (let arrow of this._childrenArrows) {
            let xdiff: number = (this.display.x + this.container.width / 2) - arrow.display.x;
            let ydiff: number = this.display.y - arrow.display.y;
            if (ydiff < 0.0) {
                ydiff += this.container.height;
            }

            if (xdiff !== 0) {
                arrow.rotation = Math.atan(ydiff / xdiff) * 180 / Math.PI;
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
}

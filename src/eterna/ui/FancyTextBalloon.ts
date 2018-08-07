import {Point} from "pixi.js";
import {Align} from "../../flashbang/core/Align";
import {Updatable} from "../../flashbang/core/Updatable";
import {Vector2} from "../../flashbang/geom/Vector2";
import {DisplayUtil} from "../../flashbang/util/DisplayUtil";
import {Bitmaps} from "../resources/Bitmaps";
import {RScriptArrow} from "../rscript/RScriptArrow";
import {FancyGamePanel} from "./FancyGamePanel";
import {GameButton} from "./GameButton";
import {TextBalloon} from "./TextBalloon";

export class FancyTextBalloon extends TextBalloon implements Updatable {
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
            this.set_styled_text(this._initialText);
        }

        this.updateView();
    }

    public set_fixed_width(in_width: number): void {
        this._fixed_width = in_width;
        this._has_fixed_width = true;

        if (this.isLiveObject) {
            this.updateView();
        }
    }

    /* override */
    public balloon_width(): number {
        return this._has_fixed_width ? this._fixed_width : super.balloon_width();
    }

    /* override */
    public balloon_height(): number {
        return super.balloon_height() + this._button.container.height;
    }

    /* override */
    public set_title(title: string): void {
        this._panel.set_panel_title(title);
        this._hasTitle = title != null;
    }

    public add_child_arrow(arrow: RScriptArrow): void {
        this._children_arrows.push(arrow);
    }

    /* override */
    protected updateView(): void {
        this._panel.set_size(this.balloon_width(), this.balloon_height());

        let innerWidth = this.balloon_width() - 2 * TextBalloon.W_MARGIN;
        let outerWidth = this.balloon_width();

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
                this._button.display, Align.RIGHT, Align.BOTTOM,
                this._panel.container, Align.RIGHT, Align.BOTTOM,
                -TextBalloon.W_MARGIN, -TextBalloon.H_MARGIN
            );
        }
    }

    public update(dt: number): void {
        for (let arrow of this._children_arrows) {
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

    private _has_fixed_width: boolean = false;
    private _fixed_width: number;
    private _children_arrows: RScriptArrow[] = [];
}

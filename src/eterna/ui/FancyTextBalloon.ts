import * as log from "loglevel";
import {Point} from "pixi.js";
import {Updatable} from "../../flashbang/core/Updatable";
import {StyledTextBuilder} from "../../flashbang/util/StyledTextBuilder";
import {Bitmaps} from "../resources/Bitmaps";
import {FancyGamePanel} from "./FancyGamePanel";
import {TextBalloon} from "./TextBalloon";
import Graphics = PIXI.Graphics;

export class FancyTextBalloon extends TextBalloon implements Updatable {
    public constructor(text_in: string = "", text_color: number = 0xFFFFFF,
                       balloon_color: number = 0xFFFFFF, balloon_alpha: number = 0.07,
                       show_outline: boolean = false, outline_color: number = 0xFFFFFF,
                       outline_alpha: number = 0.70, text_size: number = 15) {
        super(text_in, balloon_color, balloon_alpha);

        this._show_outline = show_outline;
        this._balloon_color = balloon_color;
        this._balloon_alpha = balloon_alpha;
        this._outline_color = outline_color;
        this._outline_alpha = outline_alpha;

        if (text_in.length > 0) {
            this.set_text(text_in, text_size, text_color);
        }
    }

    protected added(): void {
        super.added();

        // Redo some UI elements
        this._panel.destroySelf();
        this._panel = this._show_outline ?
            new FancyGamePanel(2, this._balloon_alpha, this._balloon_color, this._outline_color, this._outline_alpha) :
            new FancyGamePanel(0, this._balloon_alpha, this._balloon_color);
        this.addObject(this._panel, this.container, 0);

        this._button.up(Bitmaps.NovaNext)
            .over(Bitmaps.NovaNextOver)
            .down(Bitmaps.NovaNextHit);
        this._button.display.visible = false;
    }

    public set_fixed_width(in_width: number): void {
        this._fixed_width = in_width;
        this._has_fixed_width = true;
    }

    /*override*/
    public balloon_width(): number {
        return this._has_fixed_width ? this._fixed_width : super.balloon_width();
    }

    /*override*/
    public balloon_height(): number {
        return super.balloon_height() + this._button.container.height;
    }

    /*override*/
    public set_title(title: string): void {
        this._panel.set_panel_title(title);
        this._hasTitle = title != null;
    }

    public set_fancy_text(text: string, fontsize: number = 15, font_color: number = 0xFFFFFF, font_name: string = null, bold: boolean = false, letter_space: Object = 0): void {
        new StyledTextBuilder({
            fontFamily: font_name,
            fontSize: fontsize,
            fill: font_color,
            fontStyle: bold ? "bold" : undefined
        }).append(text).apply(this._text);

        this.updateView();
    }

    public set_button_text(text: string): void {
        // TODO: Somehow replace the text on the button
    }

    public add_child_arrow(arrow: Graphics): void {
        this._children_arrows.push(arrow);
    }

    /*override*/
    protected updateView(redraw_graphic: boolean = true): void {
        let innerWidth = this.balloon_width() - 2 * TextBalloon.W_MARGIN;
        let outerWidth = this.balloon_width();

        if (!this._centered) {
            this._text.position = new Point(TextBalloon.W_MARGIN, TextBalloon.H_MARGIN);
            if (this._button.display.visible) {
                this._button.display.position = new Point(
                    this._panel.container.width - TextBalloon.W_MARGIN - this._button.container.width,
                    this._panel.container.height - TextBalloon.H_MARGIN - this._button.container.height);
            }
            this._panel.display.position = new Point(0, 0);

        } else {
            this._text.position = new Point(-innerWidth / 2, TextBalloon.H_MARGIN);
            if (this._button.display.visible) {
                this._button.display.position = new Point(
                    -innerWidth / 2 + this._text.width + TextBalloon.W_MARGIN,
                    TextBalloon.H_MARGIN + this._text.height - this._button.container.height);
            }
            this._panel.display.position = new Point(-outerWidth * 0.5, 0);
        }
    }

    public update(dt: number): void {
        if (this._children_arrows.length > 0) {
            log.debug("TODO: FancyTextBalloon.update");
        }

        // for (let arrow of this._children_arrows) {
        //     let xdiff: number = (this.x + this.width / 2) - arrow.x;
        //     let ydiff: number = this.y - arrow.y;
        //     let _length: number = 0.0;
        //     let _degree: number = 0.0;
        //     if (ydiff < 0.0) {
        //         ydiff += this.height;
        //     }
        //
        //     if (xdiff != 0) {
        //         _degree = Math.atan(ydiff / xdiff) * 180 / Math.PI;
        //     } else {
        //         _degree = 0.0;
        //     }
        //
        //     if (ydiff > 0.0 && xdiff < 0.0) {
        //         _degree += 180;
        //     } else if (ydiff < 0.0 && xdiff < 0.0) {
        //         _degree += 180;
        //     }
        //
        //     if (ydiff < 0.0)  // Above
        //     {
        //         _length = Point.distance(new Point(arrow.x, arrow.y),
        //             new Point(this.x + this.width / 2, this.y + this.height));
        //     } else  // Below
        //     {
        //         _length = Point.distance(new Point(arrow.x, arrow.y),
        //             new Point(this.x + this.width / 2, this.y - 50));
        //     }
        //
        //     let dir: Point = new Point(1, 0);
        //
        //     // oh the laziness. LOL.
        //     // Draw Triangle with the tip at endPoint.
        //     let endPoint: Point = arrow.endPoint;
        //
        //     // Draw Triangle with the tip at endPoint.
        //     let trianglePoints: number[] = [];
        //     trianglePoints.push(endPoint.x, endPoint.y);
        //
        //     // Create an equilaterial triangle.
        //     // It should be just a bit wider than the width of the rectangle specified by
        //     // 	_my_width.
        //     let triWidth: number = arrow._my_width + 20; // 20 is a random number. subject to change yolo.
        //     let triHeight: number = triWidth / 2 * Math.sqrt(2);
        //     let perp_dir: Point = new Point(-1 * dir.y, dir.x);
        //     perp_dir.normalize(1);
        //     let basePoint: Point = endPoint.add(new Point(dir.x * triHeight, dir.y * triHeight));
        //     let n1: Point = basePoint.add(new Point(perp_dir.x * triWidth / 2, perp_dir.y * triWidth / 2));
        //     let n2: Point = basePoint.add(new Point(perp_dir.x * triWidth / -2, perp_dir.y * triWidth / -2));
        //     trianglePoints.push(n1.x, n1.y);
        //     trianglePoints.push(n2.x, n2.y);
        //
        //     arrow.clear();
        //     arrow.lineStyle(1, Number("0x" + arrow._outlineColor));
        //     arrow.beginFill(Number("0x" + arrow._fillColor), 1.0);
        //     arrow.drawTriangles(trianglePoints);
        //
        //     // Now draw the rectangle going in the same dir.
        //     let r_start: Point = basePoint.subtract(new Point(perp_dir.x * arrow._my_width / 2, perp_dir.y * arrow._my_width / 2));
        //     arrow.drawRect(r_start.x, r_start.y, _length, arrow._my_width);
        //     arrow.endFill();
        //
        //     arrow.lineStyle(NaN);
        //     arrow.beginFill(Number("0x" + arrow._fillColor), 1.0);
        //     arrow.drawRect(r_start.x - 5, r_start.y + 1, 20, arrow._my_width - 1);
        //     arrow.rotation = _degree;
        //
        //     arrow.endFill();
        // }
    }

    private readonly _show_outline: boolean;
    private readonly _balloon_color: number;
    private readonly _balloon_alpha: number;
    private readonly _outline_color: number;
    private readonly _outline_alpha: number;

    private _has_fixed_width: boolean = false;
    private _fixed_width: number;
    private _children_arrows: Graphics[] = [];
}

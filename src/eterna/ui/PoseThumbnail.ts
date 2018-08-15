import {Container, DisplayObject, Graphics, Sprite, Texture} from "pixi.js";
import {DisplayUtil} from "../../flashbang/util/DisplayUtil";
import {TextureUtil} from "../../flashbang/util/TextureUtil";
import {Constants} from "../Constants";
import {EPars} from "../EPars";
import {ExpPainter} from "../ExpPainter";
import {RNALayout} from "../pose2D/RNALayout";
import {Bitmaps} from "../resources/Bitmaps";

export enum PoseThumbnailType {
    BASE_COLORED = "BASE_COLORED",
    WHITE = "WHITE",
    EXP_COLORED = "EXP_COLORED",
    WRONG_COLORED = "WRONG_COLORED",
}

export class PoseThumbnail {
    public static createFramedBitmap(sequence: number[], pairs: number[], size: number = 1, type: PoseThumbnailType = PoseThumbnailType.BASE_COLORED, exp_start_index: number = 0, wrong_pairs: number[] = null, exp_use_threshold: boolean = false, exp_threshold: number = 0): Texture {
        let disp: DisplayObject = PoseThumbnail.create(sequence, pairs, size, type, exp_start_index, wrong_pairs, exp_use_threshold, exp_threshold);
        return TextureUtil.renderToTexture(disp);
    }

    public static drawToSprite(sprite: Sprite, sequence: number[], pairs: number[], size: number = 1, type: PoseThumbnailType = PoseThumbnailType.BASE_COLORED, exp_start_index: number = 0, wrong_pairs: number[] = null, exp_use_threshold: boolean = false, exp_threshold: number = 0): void {
        sprite.removeChildren();
        let graphics: Graphics = new Graphics();
        PoseThumbnail.create(sequence, pairs, size, type, exp_start_index, wrong_pairs, exp_use_threshold, exp_threshold, graphics);
        sprite.addChild(graphics);
    }

    private static create(sequence: number[], pairs: number[], size: number, type: PoseThumbnailType, exp_start_index: number, wrong_pairs: number[], exp_use_threshold: boolean, exp_threshold: number, canvas: Graphics = null): DisplayObject {
        let frame: DisplayObject;

        if (size === 1) {
            frame = Sprite.fromImage(Bitmaps.SolutionSmallFrame);
        } else if (size === 2) {
            frame = Sprite.fromImage(Bitmaps.SolutionBigFrame);
        } else if (size === 3) {
            frame = DisplayUtil.fillRect(62, 62, 0x0);
        } else if (size === 4) {
            frame = DisplayUtil.fillRect(210, 125, 0x0);
        } else if (size === 5) {
            frame = DisplayUtil.fillRect(124, 124, 0x0);
        } else if (size === 6) {
            frame = DisplayUtil.fillRect(200, 200, 0x0);
        } else if (size === 7) {
            frame = DisplayUtil.fillRect(300, 300, 0x0);
        }

        let frameBounds = frame.getLocalBounds();

        let w: number = frameBounds.width * 0.8;
        let h: number = frameBounds.height * 0.8;

        let bd: Container = new Container();
        bd.addChild(DisplayUtil.fillRect(frameBounds.width, frameBounds.height, 0x0));
        let n: number = pairs.length;

        if (n === 0) {
            return bd;
        }

        let xarray: number[] = new Array(n);
        let yarray: number[] = new Array(n);

        let rna_drawer: RNALayout = new RNALayout(45, 45);
        rna_drawer.setup_tree(pairs);
        rna_drawer.draw_tree();
        rna_drawer.get_coords(xarray, yarray);

        let xmin: number = xarray[0];
        let xmax: number = xarray[0];
        let ymin: number = yarray[0];
        let ymax: number = yarray[0];

        for (let ii: number = 0; ii < n; ii++) {
            if (xarray[ii] < xmin) {
                xmin = xarray[ii];
            }

            if (xarray[ii] > xmax) {
                xmax = xarray[ii];
            }

            if (yarray[ii] < ymin) {
                ymin = yarray[ii];
            }

            if (yarray[ii] > ymax) {
                ymax = yarray[ii];
            }
        }

        let xdiff: number = xmax - xmin;
        let xscale: number = 1;
        if (xdiff > Constants.EPSILON) xscale = (w) / xdiff;

        let ydiff: number = ymax - ymin;
        let yscale: number = 1;
        if (ydiff > Constants.EPSILON) yscale = (h) / ydiff;

        let scale: number = Math.min(xscale, yscale);

        canvas = canvas || new Graphics();
        canvas.clear();
        canvas.lineStyle(0, 0x0, 0);

        let exp_painter: ExpPainter = null;

        if (type === PoseThumbnailType.EXP_COLORED) {
            exp_painter = new ExpPainter(sequence, exp_start_index);
        }

        let small_xmax: number = (xarray[0] - xmin) * scale;
        let small_xmin: number = (xarray[0] - xmin) * scale;
        let small_ymax: number = (yarray[0] - ymin) * scale;
        let small_ymin: number = (yarray[0] - ymin) * scale;

        let xpos: number,
            ypos: number;

        for (let ii = 0; ii < n; ii++) {
            xpos = (xarray[ii] - xmin) * scale;
            ypos = (yarray[ii] - ymin) * scale;

            if (xpos > small_xmax) small_xmax = xpos;
            if (xpos < small_xmin) small_xmin = xpos;

            if (ypos > small_ymax) small_ymax = ypos;
            if (ypos < small_ymin) small_ymin = ypos;
        }

        let x_offset: number = ((w) - (small_xmax - small_xmin)) / 2.0 + frameBounds.width * 0.1;
        let y_offset: number = ((h) - (small_ymax - small_ymin)) / 2.0 + frameBounds.height * 0.1;

        let wrong_xcoords: number[] = [];
        let wrong_ycoords: number[] = [];
        let right_xcoords: number[] = [];
        let right_ycoords: number[] = [];
        let dontcare_xcoords: number[] = [];
        let dontcare_ycoords: number[] = [];

        let color: number = 0;
        for (let ii = 0; ii < n; ii++) {
            color = 0;

            if (type === PoseThumbnailType.WHITE) {
                color = 0xFFFFFF;
            } else if (type === PoseThumbnailType.WRONG_COLORED) {
                if (wrong_pairs[ii] === 1) {
                    if (ii === 0 || (ii > 0 && sequence[ii - 1] === EPars.RNABASE_CUT)) {
                        wrong_xcoords.push((xarray[ii] - xmin) * scale + x_offset);
                        wrong_ycoords.push((yarray[ii] - ymin) * scale + y_offset);

                        wrong_xcoords.push((xarray[ii] - xmin) * scale + x_offset);
                        wrong_ycoords.push((yarray[ii] - ymin) * scale + y_offset);

                        wrong_xcoords.push(((xarray[ii] + xarray[ii + 1]) / 2.0 - xmin) * scale + x_offset);
                        wrong_ycoords.push(((yarray[ii] + yarray[ii + 1]) / 2.0 - ymin) * scale + y_offset);
                    } else if (ii === n - 1 || (ii < n - 1 && sequence[ii + 1] === EPars.RNABASE_CUT)) {
                        wrong_xcoords.push(((xarray[ii] + xarray[ii - 1]) / 2.0 - xmin) * scale + x_offset);
                        wrong_ycoords.push(((yarray[ii] + yarray[ii - 1]) / 2.0 - ymin) * scale + y_offset);

                        wrong_xcoords.push(((xarray[ii] + xarray[ii - 1]) / 2.0 - xmin) * scale + x_offset);
                        wrong_ycoords.push(((yarray[ii] + yarray[ii - 1]) / 2.0 - ymin) * scale + y_offset);

                        wrong_xcoords.push((xarray[ii] - xmin) * scale + x_offset);
                        wrong_ycoords.push((yarray[ii] - ymin) * scale + y_offset);
                    } else {
                        wrong_xcoords.push(((xarray[ii] + xarray[ii - 1]) / 2.0 - xmin) * scale + x_offset);
                        wrong_ycoords.push(((yarray[ii] + yarray[ii - 1]) / 2.0 - ymin) * scale + y_offset);

                        wrong_xcoords.push(((xarray[ii]) - xmin) * scale + x_offset);
                        wrong_ycoords.push(((yarray[ii]) - ymin) * scale + y_offset);

                        wrong_xcoords.push(((xarray[ii] + xarray[ii + 1]) / 2.0 - xmin) * scale + x_offset);
                        wrong_ycoords.push(((yarray[ii] + yarray[ii + 1]) / 2.0 - ymin) * scale + y_offset);
                    }
                } else if (wrong_pairs[ii] === -1) {
                    if (ii === 0 || (ii > 0 && sequence[ii - 1] === EPars.RNABASE_CUT)) {
                        right_xcoords.push((xarray[ii] - xmin) * scale + x_offset);
                        right_ycoords.push((yarray[ii] - ymin) * scale + y_offset);

                        right_xcoords.push((xarray[ii] - xmin) * scale + x_offset);
                        right_ycoords.push((yarray[ii] - ymin) * scale + y_offset);

                        right_xcoords.push(((xarray[ii] + xarray[ii + 1]) / 2.0 - xmin) * scale + x_offset);
                        right_ycoords.push(((yarray[ii] + yarray[ii + 1]) / 2.0 - ymin) * scale + y_offset);
                    } else if (ii === n - 1 || (ii < n - 1 && sequence[ii + 1] === EPars.RNABASE_CUT)) {
                        right_xcoords.push(((xarray[ii] + xarray[ii - 1]) / 2.0 - xmin) * scale + x_offset);
                        right_ycoords.push(((yarray[ii] + yarray[ii - 1]) / 2.0 - ymin) * scale + y_offset);

                        right_xcoords.push(((xarray[ii] + xarray[ii - 1]) / 2.0 - xmin) * scale + x_offset);
                        right_ycoords.push(((yarray[ii] + yarray[ii - 1]) / 2.0 - ymin) * scale + y_offset);

                        right_xcoords.push((xarray[ii] - xmin) * scale + x_offset);
                        right_ycoords.push((yarray[ii] - ymin) * scale + y_offset);
                    } else {
                        right_xcoords.push(((xarray[ii] + xarray[ii - 1]) / 2.0 - xmin) * scale + x_offset);
                        right_ycoords.push(((yarray[ii] + yarray[ii - 1]) / 2.0 - ymin) * scale + y_offset);

                        right_xcoords.push((xarray[ii] - xmin) * scale + x_offset);
                        right_ycoords.push((yarray[ii] - ymin) * scale + y_offset);

                        right_xcoords.push(((xarray[ii] + xarray[ii + 1]) / 2.0 - xmin) * scale + x_offset);
                        right_ycoords.push(((yarray[ii] + yarray[ii + 1]) / 2.0 - ymin) * scale + y_offset);
                    }
                } else if (ii === 0 || (ii > 0 && sequence[ii - 1] === EPars.RNABASE_CUT)) {
                    dontcare_xcoords.push((xarray[ii] - xmin) * scale + x_offset);
                    dontcare_ycoords.push((yarray[ii] - ymin) * scale + y_offset);

                    dontcare_xcoords.push((xarray[ii] - xmin) * scale + x_offset);
                    dontcare_ycoords.push((yarray[ii] - ymin) * scale + y_offset);

                    dontcare_xcoords.push(((xarray[ii] + xarray[ii + 1]) / 2.0 - xmin) * scale + x_offset);
                    dontcare_ycoords.push(((yarray[ii] + yarray[ii + 1]) / 2.0 - ymin) * scale + y_offset);
                } else if (ii === n - 1 || (ii < n - 1 && sequence[ii + 1] === EPars.RNABASE_CUT)) {
                    dontcare_xcoords.push(((xarray[ii] + xarray[ii - 1]) / 2.0 - xmin) * scale + x_offset);
                    dontcare_ycoords.push(((yarray[ii] + yarray[ii - 1]) / 2.0 - ymin) * scale + y_offset);

                    dontcare_xcoords.push(((xarray[ii] + xarray[ii - 1]) / 2.0 - xmin) * scale + x_offset);
                    dontcare_ycoords.push(((yarray[ii] + yarray[ii - 1]) / 2.0 - ymin) * scale + y_offset);

                    dontcare_xcoords.push((xarray[ii] - xmin) * scale + x_offset);
                    dontcare_ycoords.push((yarray[ii] - ymin) * scale + y_offset);
                } else {
                    dontcare_xcoords.push(((xarray[ii] + xarray[ii - 1]) / 2.0 - xmin) * scale + x_offset);
                    dontcare_ycoords.push(((yarray[ii] + yarray[ii - 1]) / 2.0 - ymin) * scale + y_offset);

                    dontcare_xcoords.push((xarray[ii] - xmin) * scale + x_offset);
                    dontcare_ycoords.push((yarray[ii] - ymin) * scale + y_offset);

                    dontcare_xcoords.push(((xarray[ii] + xarray[ii + 1]) / 2.0 - xmin) * scale + x_offset);
                    dontcare_ycoords.push(((yarray[ii] + yarray[ii + 1]) / 2.0 - ymin) * scale + y_offset);
                }
            } else if (type === PoseThumbnailType.BASE_COLORED) {
                if (sequence[ii] === EPars.RNABASE_ADENINE) {
                    color = 0xFFFF00;
                } else if (sequence[ii] === EPars.RNABASE_GUANINE) {
                    color = 0xFF0000;
                } else if (sequence[ii] === EPars.RNABASE_CYTOSINE) {
                    color = 0x00FF00;
                } else if (sequence[ii] === EPars.RNABASE_URACIL) {
                    color = 0x8888FF;
                } else {
                    color = 0xFFFFFF;
                }
            } else if (type === PoseThumbnailType.EXP_COLORED) {
                if (exp_use_threshold) color = exp_painter.get_color_with_midpoint(ii, exp_threshold);
                else color = exp_painter.get_color(ii);
            }

            canvas.lineStyle(Math.min(size, 3), color, 1);

            xpos = (xarray[ii] - xmin) * scale + x_offset;
            ypos = (yarray[ii] - ymin) * scale + y_offset;

            if (ii === 0 || sequence[ii] === EPars.RNABASE_CUT) {
                canvas.moveTo(xpos, ypos);
            } else {
                canvas.lineTo(xpos, ypos);
            }
        }

        if (type === PoseThumbnailType.WRONG_COLORED) {
            color = 0xFFFFFF;
            canvas.lineStyle(Math.min(size, 3), color, 1);

            for (let jj = 0; jj < right_xcoords.length; jj++) {
                if (jj % 3 === 0) {
                    if (sequence[jj / 3] === EPars.RNABASE_CUT) {
                        jj += 2;
                    } else {
                        canvas.moveTo(right_xcoords[jj], right_ycoords[jj]);
                    }
                } else {
                    canvas.lineTo(right_xcoords[jj], right_ycoords[jj]);
                }
            }

            color = 0xFF0000;
            canvas.lineStyle(Math.min(size, 3), color, 1);

            for (let jj = 0; jj < wrong_xcoords.length; jj++) {
                if (jj % 3 === 0) {
                    if (sequence[jj / 3] === EPars.RNABASE_CUT) {
                        jj += 2;
                    } else {
                        canvas.moveTo(wrong_xcoords[jj], wrong_ycoords[jj]);
                    }
                } else {
                    canvas.lineTo(wrong_xcoords[jj], wrong_ycoords[jj]);
                }
            }

            color = 0xC080FF;
            canvas.lineStyle(Math.min(size, 3), color, 0.65);

            for (let jj = 0; jj < dontcare_xcoords.length; jj++) {
                if (jj % 3 === 0) {
                    if (sequence[jj / 3] === EPars.RNABASE_CUT) {
                        jj += 2;
                    } else {
                        canvas.moveTo(dontcare_xcoords[jj], dontcare_ycoords[jj]);
                    }
                } else {
                    canvas.lineTo(dontcare_xcoords[jj], dontcare_ycoords[jj]);
                }
            }
        }

        bd.addChild(canvas);
        bd.addChild(frame);

        return bd;
    }
}

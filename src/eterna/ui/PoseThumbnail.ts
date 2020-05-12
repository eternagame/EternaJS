import {
    Container, DisplayObject, Graphics, Sprite, Texture
} from 'pixi.js';
import {TextureUtil, DisplayUtil} from 'flashbang';
import Constants from 'eterna/Constants';
import EPars from 'eterna/EPars';
import ExpPainter from 'eterna/ExpPainter';
import Bitmaps from 'eterna/resources/Bitmaps';
import RNALayout from 'eterna/pose2D/RNALayout';

export enum PoseThumbnailType {
    BASE_COLORED = 'BASE_COLORED',
    WHITE = 'WHITE',
    EXP_COLORED = 'EXP_COLORED',
    WRONG_COLORED = 'WRONG_COLORED',
}

export default class PoseThumbnail {
    public static createFramedBitmap(
        sequence: number[],
        pairs: number[],
        size: number = 1,
        type: PoseThumbnailType = PoseThumbnailType.BASE_COLORED,
        expStartIndex: number = 0,
        wrongPairs: number[] = null,
        expUseThreshold: boolean = false,
        expThreshold: number = 0,
        customLayout: Array<[number, number]> = null
    ): Texture {
        let disp: DisplayObject = PoseThumbnail.create(
            sequence, pairs, size, type,
            expStartIndex, wrongPairs, expUseThreshold, expThreshold,
            null, customLayout
        );
        return TextureUtil.renderToTexture(disp);
    }

    public static drawToGraphics(
        sequence: number[],
        pairs: number[],
        size: number = 1,
        type: PoseThumbnailType = PoseThumbnailType.BASE_COLORED,
        expStartIndex: number = 0,
        wrongPairs: number[] = null,
        expUseThreshold: boolean = false,
        expThreshold: number = 0,
        customLayout: Array<[number, number]> = null
    ) {
        const graphics = new Graphics();
        PoseThumbnail.create(
            sequence, pairs, size, type, expStartIndex, wrongPairs, expUseThreshold, expThreshold, graphics,
            customLayout
        );
        const newGraphics = graphics.clone();
        let bounds = newGraphics.getLocalBounds();
        newGraphics.x = -bounds.left;
        newGraphics.y = -bounds.top;
        return newGraphics;
    }

    public static drawToSprite(
        sprite: Sprite,
        sequence: number[],
        pairs: number[],
        size: number = 1,
        type: PoseThumbnailType = PoseThumbnailType.BASE_COLORED,
        expStartIndex: number = 0,
        wrongPairs: number[] = null,
        expUseThreshold: boolean = false,
        expThreshold: number = 0,
        customLayout: Array<[number, number]> = null,
        forceStraightRNA = false
    ): void {
        sprite.removeChildren();
        const graphics = new Graphics();
        PoseThumbnail.create(
            sequence, pairs, size, type, expStartIndex, wrongPairs, expUseThreshold, expThreshold, graphics,
            customLayout,
            forceStraightRNA
        );
        let bounds = graphics.getLocalBounds();
        graphics.x = -bounds.left;
        graphics.y = -bounds.top;
        sprite.addChild(graphics);
    }

    private static create(
        sequence: number[],
        pairs: number[],
        size: number,
        type: PoseThumbnailType,
        expStartIndex: number,
        wrongPairs: number[],
        expUseThreshold: boolean,
        expThreshold: number,
        canvas: Graphics = null,
        customLayout: Array<[number, number]> = null,
        forceStraightRNA = false
    ): DisplayObject {
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

        let rnaDrawer: RNALayout = new RNALayout(45, 45, undefined, forceStraightRNA);
        rnaDrawer.setupTree(pairs);
        rnaDrawer.drawTree(customLayout);
        rnaDrawer.getCoords(xarray, yarray);

        let xmin: number = xarray[0];
        let xmax: number = xarray[0];
        let ymin: number = yarray[0];
        let ymax: number = yarray[0];

        for (let ii = 0; ii < n; ii++) {
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
        let xscale = 1;
        if (xdiff > Constants.EPSILON) xscale = (w) / xdiff;

        let ydiff: number = ymax - ymin;
        let yscale = 1;
        if (ydiff > Constants.EPSILON) yscale = (h) / ydiff;

        let scale: number = Math.min(xscale, yscale);

        canvas = canvas || new Graphics();
        canvas.clear();
        canvas.lineStyle(0, 0x0, 0);

        let expPainter: ExpPainter = null;

        if (type === PoseThumbnailType.EXP_COLORED) {
            expPainter = new ExpPainter(sequence, expStartIndex);
        }

        let smallXMax: number = (xarray[0] - xmin) * scale;
        let smallXMin: number = (xarray[0] - xmin) * scale;
        let smallYMax: number = (yarray[0] - ymin) * scale;
        let smallYMin: number = (yarray[0] - ymin) * scale;

        let xpos: number;
        let ypos: number;

        for (let ii = 0; ii < n; ii++) {
            xpos = (xarray[ii] - xmin) * scale;
            ypos = (yarray[ii] - ymin) * scale;

            if (xpos > smallXMax) smallXMax = xpos;
            if (xpos < smallXMin) smallXMin = xpos;

            if (ypos > smallYMax) smallYMax = ypos;
            if (ypos < smallYMin) smallYMin = ypos;
        }

        let xOffset: number = ((w) - (smallXMax - smallXMin)) / 2.0 + frameBounds.width * 0.1;
        let yOffset: number = ((h) - (smallYMax - smallYMin)) / 2.0 + frameBounds.height * 0.1;

        let wrongXCoords: number[] = [];
        let wrongYCoords: number[] = [];
        let rightXCoords: number[] = [];
        let rightYCoords: number[] = [];
        let dontcareXCoords: number[] = [];
        let dontcareYCoords: number[] = [];

        const COLOR_WHITE = 0xffffff;

        const COLOR_RIGHT = 0xffffff;
        const COLOR_WRONG = 0xff0000;
        const COLOR_DONTCARE = 0xC080FF;

        const COLOR_ADENINE = 0xFFFF00;
        const COLOR_GUANINE = 0xFF0000;
        const COLOR_CYTOSINE = 0x00FF00;
        const COLOR_URACIL = 0x8888FF;

        let color = 0;
        for (let ii = 0; ii < n; ii++) {
            color = 0;

            if (type === PoseThumbnailType.WHITE) {
                color = COLOR_WHITE;
            } else if (type === PoseThumbnailType.WRONG_COLORED) {
                if (wrongPairs[ii] === 1) {
                    color = COLOR_WRONG;

                    if (ii === 0 || (ii > 0 && sequence[ii - 1] === EPars.RNABASE_CUT)) {
                        wrongXCoords.push((xarray[ii] - xmin) * scale + xOffset);
                        wrongYCoords.push((yarray[ii] - ymin) * scale + yOffset);

                        wrongXCoords.push((xarray[ii] - xmin) * scale + xOffset);
                        wrongYCoords.push((yarray[ii] - ymin) * scale + yOffset);

                        wrongXCoords.push(((xarray[ii] + xarray[ii + 1]) / 2.0 - xmin) * scale + xOffset);
                        wrongYCoords.push(((yarray[ii] + yarray[ii + 1]) / 2.0 - ymin) * scale + yOffset);
                    } else if (ii === n - 1 || (ii < n - 1 && sequence[ii + 1] === EPars.RNABASE_CUT)) {
                        wrongXCoords.push(((xarray[ii] + xarray[ii - 1]) / 2.0 - xmin) * scale + xOffset);
                        wrongYCoords.push(((yarray[ii] + yarray[ii - 1]) / 2.0 - ymin) * scale + yOffset);

                        wrongXCoords.push(((xarray[ii] + xarray[ii - 1]) / 2.0 - xmin) * scale + xOffset);
                        wrongYCoords.push(((yarray[ii] + yarray[ii - 1]) / 2.0 - ymin) * scale + yOffset);

                        wrongXCoords.push((xarray[ii] - xmin) * scale + xOffset);
                        wrongYCoords.push((yarray[ii] - ymin) * scale + yOffset);
                    } else {
                        wrongXCoords.push(((xarray[ii] + xarray[ii - 1]) / 2.0 - xmin) * scale + xOffset);
                        wrongYCoords.push(((yarray[ii] + yarray[ii - 1]) / 2.0 - ymin) * scale + yOffset);

                        wrongXCoords.push(((xarray[ii]) - xmin) * scale + xOffset);
                        wrongYCoords.push(((yarray[ii]) - ymin) * scale + yOffset);

                        wrongXCoords.push(((xarray[ii] + xarray[ii + 1]) / 2.0 - xmin) * scale + xOffset);
                        wrongYCoords.push(((yarray[ii] + yarray[ii + 1]) / 2.0 - ymin) * scale + yOffset);
                    }
                } else if (wrongPairs[ii] === -1) {
                    color = COLOR_RIGHT;

                    if (ii === 0 || (ii > 0 && sequence[ii - 1] === EPars.RNABASE_CUT)) {
                        rightXCoords.push((xarray[ii] - xmin) * scale + xOffset);
                        rightYCoords.push((yarray[ii] - ymin) * scale + yOffset);

                        rightXCoords.push((xarray[ii] - xmin) * scale + xOffset);
                        rightYCoords.push((yarray[ii] - ymin) * scale + yOffset);

                        rightXCoords.push(((xarray[ii] + xarray[ii + 1]) / 2.0 - xmin) * scale + xOffset);
                        rightYCoords.push(((yarray[ii] + yarray[ii + 1]) / 2.0 - ymin) * scale + yOffset);
                    } else if (ii === n - 1 || (ii < n - 1 && sequence[ii + 1] === EPars.RNABASE_CUT)) {
                        rightXCoords.push(((xarray[ii] + xarray[ii - 1]) / 2.0 - xmin) * scale + xOffset);
                        rightYCoords.push(((yarray[ii] + yarray[ii - 1]) / 2.0 - ymin) * scale + yOffset);

                        rightXCoords.push(((xarray[ii] + xarray[ii - 1]) / 2.0 - xmin) * scale + xOffset);
                        rightYCoords.push(((yarray[ii] + yarray[ii - 1]) / 2.0 - ymin) * scale + yOffset);

                        rightXCoords.push((xarray[ii] - xmin) * scale + xOffset);
                        rightYCoords.push((yarray[ii] - ymin) * scale + yOffset);
                    } else {
                        rightXCoords.push(((xarray[ii] + xarray[ii - 1]) / 2.0 - xmin) * scale + xOffset);
                        rightYCoords.push(((yarray[ii] + yarray[ii - 1]) / 2.0 - ymin) * scale + yOffset);

                        rightXCoords.push((xarray[ii] - xmin) * scale + xOffset);
                        rightYCoords.push((yarray[ii] - ymin) * scale + yOffset);

                        rightXCoords.push(((xarray[ii] + xarray[ii + 1]) / 2.0 - xmin) * scale + xOffset);
                        rightYCoords.push(((yarray[ii] + yarray[ii + 1]) / 2.0 - ymin) * scale + yOffset);
                    }
                } else {
                    color = COLOR_DONTCARE;

                    if (ii === 0 || (ii > 0 && sequence[ii - 1] === EPars.RNABASE_CUT)) {
                        dontcareXCoords.push((xarray[ii] - xmin) * scale + xOffset);
                        dontcareYCoords.push((yarray[ii] - ymin) * scale + yOffset);

                        dontcareXCoords.push((xarray[ii] - xmin) * scale + xOffset);
                        dontcareYCoords.push((yarray[ii] - ymin) * scale + yOffset);

                        dontcareXCoords.push(((xarray[ii] + xarray[ii + 1]) / 2.0 - xmin) * scale + xOffset);
                        dontcareYCoords.push(((yarray[ii] + yarray[ii + 1]) / 2.0 - ymin) * scale + yOffset);
                    } else if (ii === n - 1 || (ii < n - 1 && sequence[ii + 1] === EPars.RNABASE_CUT)) {
                        dontcareXCoords.push(((xarray[ii] + xarray[ii - 1]) / 2.0 - xmin) * scale + xOffset);
                        dontcareYCoords.push(((yarray[ii] + yarray[ii - 1]) / 2.0 - ymin) * scale + yOffset);

                        dontcareXCoords.push(((xarray[ii] + xarray[ii - 1]) / 2.0 - xmin) * scale + xOffset);
                        dontcareYCoords.push(((yarray[ii] + yarray[ii - 1]) / 2.0 - ymin) * scale + yOffset);

                        dontcareXCoords.push((xarray[ii] - xmin) * scale + xOffset);
                        dontcareYCoords.push((yarray[ii] - ymin) * scale + yOffset);
                    } else {
                        dontcareXCoords.push(((xarray[ii] + xarray[ii - 1]) / 2.0 - xmin) * scale + xOffset);
                        dontcareYCoords.push(((yarray[ii] + yarray[ii - 1]) / 2.0 - ymin) * scale + yOffset);

                        dontcareXCoords.push((xarray[ii] - xmin) * scale + xOffset);
                        dontcareYCoords.push((yarray[ii] - ymin) * scale + yOffset);

                        dontcareXCoords.push(((xarray[ii] + xarray[ii + 1]) / 2.0 - xmin) * scale + xOffset);
                        dontcareYCoords.push(((yarray[ii] + yarray[ii + 1]) / 2.0 - ymin) * scale + yOffset);
                    }
                }
            } else if (type === PoseThumbnailType.BASE_COLORED) {
                if (sequence[ii] === EPars.RNABASE_ADENINE) {
                    color = COLOR_ADENINE;
                } else if (sequence[ii] === EPars.RNABASE_GUANINE) {
                    color = COLOR_GUANINE;
                } else if (sequence[ii] === EPars.RNABASE_CYTOSINE) {
                    color = COLOR_CYTOSINE;
                } else if (sequence[ii] === EPars.RNABASE_URACIL) {
                    color = COLOR_URACIL;
                } else {
                    color = COLOR_WHITE;
                }
            } else if (type === PoseThumbnailType.EXP_COLORED) {
                if (expUseThreshold) color = expPainter.getColorWithMidpoint(ii, expThreshold);
                else color = expPainter.getColor(ii);
            }

            canvas.lineStyle(Math.min(size, 3), color, 1);

            xpos = (xarray[ii] - xmin) * scale + xOffset;
            ypos = (yarray[ii] - ymin) * scale + yOffset;

            if (ii === 0 || sequence[ii] === EPars.RNABASE_CUT) {
                canvas.moveTo(xpos, ypos);
            } else {
                canvas.lineTo(xpos, ypos);
            }
        }

        if (type === PoseThumbnailType.WRONG_COLORED) {
            color = COLOR_RIGHT;
            canvas.lineStyle(Math.min(size, 3), color, 1);

            for (let jj = 0; jj < rightXCoords.length; jj++) {
                if (jj % 3 === 0) {
                    if (sequence[jj / 3] === EPars.RNABASE_CUT) {
                        jj += 2;
                    } else {
                        canvas.moveTo(rightXCoords[jj], rightYCoords[jj]);
                    }
                } else {
                    canvas.lineTo(rightXCoords[jj], rightYCoords[jj]);
                }
            }

            color = COLOR_WRONG;
            canvas.lineStyle(Math.min(size, 3), color, 1);

            for (let jj = 0; jj < wrongXCoords.length; jj++) {
                if (jj % 3 === 0) {
                    if (sequence[jj / 3] === EPars.RNABASE_CUT) {
                        jj += 2;
                    } else {
                        canvas.moveTo(wrongXCoords[jj], wrongYCoords[jj]);
                    }
                } else {
                    canvas.lineTo(wrongXCoords[jj], wrongYCoords[jj]);
                }
            }

            color = COLOR_DONTCARE;
            canvas.lineStyle(Math.min(size, 3), color, 0.65);

            for (let jj = 0; jj < dontcareXCoords.length; jj++) {
                if (jj % 3 === 0) {
                    if (sequence[jj / 3] === EPars.RNABASE_CUT) {
                        jj += 2;
                    } else {
                        canvas.moveTo(dontcareXCoords[jj], dontcareYCoords[jj]);
                    }
                } else {
                    canvas.lineTo(dontcareXCoords[jj], dontcareYCoords[jj]);
                }
            }
        }

        bd.addChild(canvas);
        bd.addChild(frame);

        return bd;
    }
}

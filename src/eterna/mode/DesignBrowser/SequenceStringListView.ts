import {
    Container, Graphics, Sprite, Texture
} from 'pixi.js';
import {TextBuilder, TextureUtil} from 'flashbang';
import EPars from 'eterna/EPars';
import Eterna from 'eterna/Eterna';
import ExpPainter from 'eterna/ExpPainter';
import Feedback from 'eterna/Feedback';
import EternaTextureUtil from 'eterna/util/EternaTextureUtil';

export default class SequenceStringListView extends Container {
    constructor(fontname: string, fontsize: number, fontbold: boolean, letterWidth: number, letterHeight: number) {
        super();

        this._letterWidth = letterWidth;
        this._letterHeight = letterHeight;

        this._graphics = new Graphics();
        this.addChild(this._graphics);

        let textBuilder = new TextBuilder()
            .font(fontname)
            .fontSize(fontsize)
            .color(0xffffff)
            .bold(fontbold);

        this._letterTextures = SequenceStringListView.createLetterBitmaps(textBuilder, 'A')
            .concat(SequenceStringListView.createLetterBitmaps(textBuilder, 'U'))
            .concat(SequenceStringListView.createLetterBitmaps(textBuilder, 'G'))
            .concat(SequenceStringListView.createLetterBitmaps(textBuilder, 'C'));
    }

    public setSize(width: number, height: number): void {
        this._width = width;
        this._height = height;
    }

    public setSequences(sequences: string[] | null, expData: (Feedback | null)[] | null, pairs: number[] | null): void {
        this._graphics.clear();
        if (this._content != null) {
            this._content.destroy({children: true});
            this._content = null;
        }

        if (sequences == null) {
            return;
        }

        this._content = new Container();
        this.addChild(this._content);

        let useExp: boolean = expData != null;

        for (let ii = 0; ii < sequences.length; ii++) {
            let seq: string = sequences[ii];
            let shapeData: number[] | null = null;
            let shapeDataStart = 0;
            let expPainter: ExpPainter | null = null;
            let isThereShapeThreshold = false;
            let shapeThreshold = 0;
            let shapeMax = 0;

            let seqExpData = expData ? expData[ii] : null;
            if (seqExpData) {
                shapeData = seqExpData.getShapeData();
                shapeDataStart = seqExpData.getShapeStartIndex();
            }

            if (shapeData != null && seqExpData) {
                shapeData = ExpPainter.transformData(
                    seqExpData.getShapeData(), seqExpData.getShapeMax(), seqExpData.getShapeMin()
                );
                isThereShapeThreshold = true;
                shapeThreshold = seqExpData.getShapeThreshold();
                shapeMax = seqExpData.getShapeMax();

                expPainter = new ExpPainter(shapeData, shapeDataStart);
                expPainter.continuous = Eterna.settings.useContinuousColors.value;
                expPainter.extendedScale = Eterna.settings.useExtendedColors.value;
            }

            for (let jj = 0; jj < seq.length; jj++) {
                if (ii === 0 && expData != null && pairs !== null) {
                    if (pairs[jj] < 0) {
                        this._graphics.beginFill(0xCCCC00, 0.5);
                    } else {
                        this._graphics.beginFill(0x0000FF, 0.2);
                    }

                    const x = jj * this._letterWidth;
                    const y = 0;
                    const w = this._letterWidth;
                    const h = Math.min(this._height, sequences.length * this._letterHeight);

                    this._graphics.drawRect(x, y, w, h);
                    this._graphics.endFill();
                }

                let letterIndex = 0;
                let letter = seq.charAt(jj);

                if (letter === 'A') {
                    letterIndex = SequenceStringListView.A_INDEX;
                } else if (letter === 'U') {
                    letterIndex = SequenceStringListView.U_INDEX;
                } else if (letter === 'G') {
                    letterIndex = SequenceStringListView.G_INDEX;
                } else if (letter === 'C') {
                    letterIndex = SequenceStringListView.C_INDEX;
                }

                let bdIndex = 0;

                if (!useExp) {
                    bdIndex = letterIndex * SequenceStringListView.NUM_DATA_PER_LETTER;
                } else if (shapeData == null || jj < shapeDataStart || jj >= shapeData.length + shapeDataStart) {
                    bdIndex = (
                        letterIndex * SequenceStringListView.NUM_DATA_PER_LETTER + ExpPainter.NUM_COLORS * 3 + 1 + 1
                    );
                } else {
                    // AMW: the false branch here is impossible: if isThereShapeThreshold is false, then
                    // there definitely was never an ExpPainter defined! But it shouldn't be reachable
                    // because !useExp should cover all the relevant stuff already.
                    //
                    // The most reasonable thing, I've decided, is to just say "if expPainter" around the whole
                    // deal. It should be of-course-true for true and of-course-false for the never executing false.

                    let colorIndex = 0;
                    if (expPainter) {
                        if (isThereShapeThreshold) {
                            colorIndex = expPainter.getColorLevelWithMidpoint(jj, shapeThreshold, shapeMax);
                        } else {
                            colorIndex = expPainter.getColorLevel(jj);
                        }
                    }

                    bdIndex = letterIndex * SequenceStringListView.NUM_DATA_PER_LETTER + 1 + colorIndex;
                }

                let letterSprite = new Sprite(this._letterTextures[bdIndex]);
                letterSprite.x = jj * this._letterWidth;
                letterSprite.y = ii * this._letterHeight;
                this._content.addChild(letterSprite);
            }
        }
    }

    private static createLetterBitmaps(textBuilder: TextBuilder, letter: string): Texture[] {
        let textures: Texture[] = [];

        let tf = textBuilder.text(letter).build();
        let tfTex = TextureUtil.renderToTexture(tf);

        let baseColor = EPars.getLetterColor(letter);
        textures.push(EternaTextureUtil.colorTransform(
            tfTex,
            baseColor / (256 * 256),
            (baseColor % (256 * 256)) / 256,
            baseColor % 256, 0, 0, 0
        ));

        for (let ii = -ExpPainter.NUM_COLORS; ii <= 2 * ExpPainter.NUM_COLORS + 1; ii++) {
            let expColor = ExpPainter.getColorByLevel(ii);
            textures.push(EternaTextureUtil.colorTransform(
                tfTex,
                expColor / (256 * 256),
                (expColor % (256 * 256)) / 256,
                expColor % 256, 0, 0, 0
            ));
        }

        return textures;
    }

    private readonly _letterWidth: number;
    private readonly _letterHeight: number;
    private readonly _letterTextures: Texture[];
    private readonly _graphics: Graphics;

    private _content: Container | null;

    private _width: number;
    private _height: number;

    private static readonly NUM_DATA_PER_LETTER = 18;
    private static readonly A_INDEX = 0;
    private static readonly U_INDEX = 1;
    private static readonly G_INDEX = 2;
    private static readonly C_INDEX = 3;
}

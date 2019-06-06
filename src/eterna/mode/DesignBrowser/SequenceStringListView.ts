import {
    Container, Graphics, Sprite, Texture
} from "pixi.js";
import {TextBuilder, TextureUtil} from "flashbang/util";
import EPars from "eterna/EPars";
import Eterna from "eterna/Eterna";
import ExpPainter from "eterna/ExpPainter";
import Feedback from "eterna/Feedback";
import {EternaTextureUtil} from "eterna/util";

export default class SequenceStringListView extends Container {
    public constructor(fontname: string, fontsize: number, fontbold: boolean, letterWidth: number, letterHeight: number) {
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

        this._letterTextures = SequenceStringListView.createLetterBitmaps(textBuilder, "A")
            .concat(SequenceStringListView.createLetterBitmaps(textBuilder, "U"))
            .concat(SequenceStringListView.createLetterBitmaps(textBuilder, "G"))
            .concat(SequenceStringListView.createLetterBitmaps(textBuilder, "C"));
    }

    public setSize(width: number, height: number): void {
        this._width = width;
        this._height = height;
    }

    public set_sequences(sequences: string[], exp_data: Feedback[], pairs: number[]): void {
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

        let use_exp: boolean = exp_data != null;

        for (let ii = 0; ii < sequences.length; ii++) {
            let seq: string = sequences[ii];
            let shape_data: number[] = null;
            let shape_data_start = 0;
            let exp_painter: ExpPainter = null;
            let is_there_shape_threshold = false;
            let shape_threshold = 0;
            let shape_max = 0;

            if (exp_data != null && exp_data[ii] != null) {
                shape_data = exp_data[ii].getShapeData();
                shape_data_start = exp_data[ii].getShapeStartIndex();
            }

            if (shape_data != null) {
                shape_data = ExpPainter.transformData(exp_data[ii].getShapeData(), exp_data[ii].getShapeMax(), exp_data[ii].getShapeMin());
                is_there_shape_threshold = true;
                shape_threshold = exp_data[ii].getShapeThreshold();
                shape_max = exp_data[ii].getShapeMax();

                exp_painter = new ExpPainter(shape_data, shape_data_start);
                exp_painter.continuous = Eterna.settings.useContinuousColors.value;
                exp_painter.extendedScale = Eterna.settings.useExtendedColors.value;
            }

            for (let jj = 0; jj < seq.length; jj++) {
                if (ii == 0 && exp_data != null) {
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

                let letter_index = 0;
                let letter: string = seq.charAt(jj);

                if (letter == "A") {
                    letter_index = SequenceStringListView.A_INDEX;
                } else if (letter == "U") {
                    letter_index = SequenceStringListView.U_INDEX;
                } else if (letter == "G") {
                    letter_index = SequenceStringListView.G_INDEX;
                } else if (letter == "C") {
                    letter_index = SequenceStringListView.C_INDEX;
                }

                let bd_index = 0;

                if (!use_exp) {
                    bd_index = letter_index * SequenceStringListView.NUM_DATA_PER_LETTER;
                } else if (shape_data == null || jj < shape_data_start || jj >= shape_data.length + shape_data_start) {
                    bd_index = letter_index * SequenceStringListView.NUM_DATA_PER_LETTER + ExpPainter.NUM_COLORS * 3 + 1 + 1;
                } else {
                    let color_index = 0;

                    if (is_there_shape_threshold) {
                        color_index = exp_painter.getColorLevelWithMidpoint(jj, shape_threshold, shape_max);
                    } else {
                        color_index = exp_painter.getColorLevel(jj);
                    }

                    bd_index = letter_index * SequenceStringListView.NUM_DATA_PER_LETTER + 1 + color_index;
                }

                let letterSprite = new Sprite(this._letterTextures[bd_index]);
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

        let color = EPars.getLetterColor(letter);
        textures.push(EternaTextureUtil.colorTransform(
            tfTex,
            color / (256 * 256),
            (color % (256 * 256)) / 256,
            color % 256, 0, 0, 0
        ));

        for (let ii = -ExpPainter.NUM_COLORS; ii <= 2 * ExpPainter.NUM_COLORS + 1; ii++) {
            let color = ExpPainter.getColorByLevel(ii);
            textures.push(EternaTextureUtil.colorTransform(
                tfTex,
                color / (256 * 256),
                (color % (256 * 256)) / 256,
                color % 256, 0, 0, 0
            ));
        }

        return textures;
    }

    private readonly _letterWidth: number;
    private readonly _letterHeight: number;
    private readonly _letterTextures: Texture[];
    private readonly _graphics: Graphics;

    private _content: Container;

    private _width: number;
    private _height: number;

    private static readonly NUM_DATA_PER_LETTER = 18;
    private static readonly A_INDEX = 0;
    private static readonly U_INDEX = 1;
    private static readonly G_INDEX = 2;
    private static readonly C_INDEX = 3;
}

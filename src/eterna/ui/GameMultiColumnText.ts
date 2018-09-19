import {Container, Text} from "pixi.js";
import {TextBuilder} from "../../flashbang/util/TextBuilder";
import {ScrollContainer} from "./ScrollContainer";

export class GameMultiColumnText extends Container {
    public constructor(textBuilder: TextBuilder, sizes: number[]) {
        super();

        this._textFields = [];
        this._sizes = sizes.slice();

        for (let colWidth of this._sizes) {
            let textfield = new ScrollableTextField(textBuilder.build(), this._width * colWidth, this._height);
            this.addChild(textfield);
            this._textFields.push(textfield);
        }

        this.updateLayout();
    }

    public setSize(width: number, height: number): void {
        if (this._width !== width || this._height !== height) {
            this._width = width;
            this._height = height;
            this.updateLayout();
        }
    }

    public num_columns(): number {
        return this._sizes.length;
    }

    public adjust_size(sizes: number[]): void {
        if (sizes.length != this._sizes.length) {
            throw new Error("sizes.length doesn't match number of columns");
        }

        this._sizes = sizes.slice();
        this.updateLayout();
    }

    public set_texts(txts: string[]): void {
        if (txts.length != this._sizes.length) {
            throw new Error("texts length doesn't match number of columns");
        }

        for (let ii = 0; ii < this._sizes.length; ii++) {
            let textfield = this._textFields[ii];
            textfield.tf.text = txts[ii];
        }
    }

    public add_texts(txts: string[]): void {
        if (txts.length != this._sizes.length) {
            throw new Error("texts length doesn't match number of columns");
        }

        for (let ii = 0; ii < this._sizes.length; ii++) {
            let textfield = this._textFields[ii];
            textfield.tf.text += txts[ii];
        }
    }

    public set_scroll(prog: number): void {
        for (let textfield of this._textFields) {
            textfield.scrollY = prog;
        }
    }

    public get_scroll(): number {
        return this._textFields[0].scrollY;
    }

    public get_texts(): string[] {
        return this._textFields.map(textField => textField.tf.text);
    }

    public scroll_text(delta: number): void {
        for (let textfield of this._textFields) {
            textfield.scrollY += delta;
        }
    }

    private updateLayout(): void {
        let udim_walker = 0;
        for (let ii = 0; ii < this._sizes.length; ii++) {
            let colWidth = this._sizes[ii];
            let textfield = this._textFields[ii];

            textfield.setSize(this._width * colWidth, this._height);
            textfield.position.x = this._width * udim_walker;
            textfield.position.y = 0;

            udim_walker += colWidth
        }
    }

    private readonly _textFields: ScrollableTextField[];
    private _width: number = 100;
    private _height: number = 100;
    private _sizes: number[];
}

class ScrollableTextField extends ScrollContainer {
    public readonly tf: Text;

    public constructor(tf: Text, width: number, height: number) {
        super(width, height);
        this.content.addChild(tf);
    }

}

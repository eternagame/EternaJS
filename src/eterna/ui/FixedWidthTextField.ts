import {
    Container, Graphics, Text, TextStyle
} from 'pixi.js';
import {HAlign, Assert} from 'flashbang';

export default class FixedWidthTextField extends Container {
    constructor(text: string, style: TextStyle, width: number, hAlign: HAlign = HAlign.LEFT) {
        super();

        this._width = width;
        this._halign = hAlign;
        this._tf = new Text('', style);
        this.addChild(new Graphics().beginFill(0x0, 0).drawRect(0, 0, width, this._tf.height).endFill());
        this.addChild(this._tf);

        this.text = text;
    }

    public get text(): string {
        return this._text;
    }

    public set text(value: string) {
        this._text = value;
        this._tf.text = value;
        while (this._tf.width > this._width && this._tf.text.length > 0) {
            this._tf.text = this._tf.text.substr(0, this._tf.text.length - 1);
        }

        switch (this._halign) {
            case HAlign.LEFT:
                this._tf.x = 0;
                break;
            case HAlign.CENTER:
                this._tf.x = (this._width - this._tf.width) * 0.5;
                break;
            case HAlign.RIGHT:
                this._tf.x = this._width - this._tf.width;
                break;
            default:
                Assert.unreachable(this._halign);
        }
    }

    private readonly _width: number;
    private readonly _tf: Text;
    private readonly _halign: HAlign;

    private _text: string;
}

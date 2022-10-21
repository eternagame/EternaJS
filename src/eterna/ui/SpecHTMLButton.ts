import {Graphics, Text} from 'pixi.js';
import TextBuilder from 'flashbang/util/TextBuilder';
import {Assert, Button, ButtonState} from 'flashbang';

/** A deliberately unstylish button that displays text on a rectangle. (For debugging.) */
export default class SpecHTMLButton extends Button {
    constructor(text: string, fontSize: number = 24, fontName = 'Arial') {
        super();

        this._tf = new TextBuilder()
            .text(text)
            .font(fontName)
            .fontSize(fontSize)
            .bold()
            .build();

        this._tf.x = SpecHTMLButton.PADDING;
        this._tf.y = SpecHTMLButton.PADDING;

        this._bg = new Graphics();
        this._line = new Graphics();

        this.container.addChild(this._bg);
        this.container.addChild(this._line);
        this.container.addChild(this._tf);
    }

    /* override */
    protected showState(state: ButtonState): void {
        const textColor = SpecHTMLButton.TEXT_COLORS.get(state);
        Assert.assertIsDefined(textColor);

        this._bg.clear();
        this._bg.beginFill(0x00, 0);
        this._bg.drawRoundedRect(0, 0,
            this._tf.width + (SpecHTMLButton.PADDING * 2),
            this._tf.height + (SpecHTMLButton.PADDING * 2),
            5);
        this._bg.endFill();

        this._line.clear();
        this._line.lineStyle(1, textColor);
        this._line.moveTo(SpecHTMLButton.PADDING, this._tf.height + SpecHTMLButton.PADDING);
        this._line.lineTo(this._tf.width + SpecHTMLButton.PADDING, this._tf.height + SpecHTMLButton.PADDING);

        this._tf.style.fill = textColor;
    }

    protected _tf: Text;
    protected _bg: Graphics;
    protected _line: Graphics;

    protected static readonly PADDING: number = 8;

    protected static readonly TEXT_COLORS: Map<ButtonState, number> = new Map([
        [ButtonState.UP, 0xE0E0E0],
        [ButtonState.DOWN, 0xC0C0C0],
        [ButtonState.OVER, 0xFFFFFF],
        [ButtonState.DISABLED, 0x404040]
    ]);
}

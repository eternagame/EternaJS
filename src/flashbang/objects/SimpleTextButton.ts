import {Graphics, Text} from "pixi.js";
import {TextBuilder} from "../util/TextBuilder";
import {Button, ButtonState} from "./Button";

/** A deliberately unstylish button that displays text on a rectangle. (For debugging.) */
export class SimpleTextButton extends Button {
    constructor(text: string, fontSize: number = 24, fontName: string = "Arial") {
        super();

        this._tf = new TextBuilder()
            .text(text)
            .font(fontName)
            .fontSize(fontSize)
            .build();
        this._tf.x = SimpleTextButton.PADDING;
        this._tf.y = SimpleTextButton.PADDING;

        this._bg = new Graphics();

        this.container.addChild(this._bg);
        this.container.addChild(this._tf);
    }

    /*override*/
    protected showState(state: ButtonState): void {
        this._bg.clear();
        this._bg.beginFill(SimpleTextButton.BG_COLORS.get(state));
        this._bg.drawRoundedRect(0, 0,
            this._tf.width + (SimpleTextButton.PADDING * 2),
            this._tf.height + (SimpleTextButton.PADDING * 2),
            5);
        this._bg.endFill();

        this._tf.style.fill = SimpleTextButton.TEXT_COLORS.get(state);
    }

    protected _tf: Text;
    protected _bg: Graphics;

    protected static readonly PADDING: number = 8;

    protected static readonly BG_COLORS: Map<ButtonState, number> = new Map([
        [ButtonState.UP, 0x6699CC],
        [ButtonState.DOWN, 0x0F3792],
        [ButtonState.OVER, 0x7FBFFF],
        [ButtonState.DISABLED, 0x939393]
    ]);

    protected static readonly TEXT_COLORS: Map<ButtonState, number> = new Map([
        [ButtonState.UP, 0x0F3792],
        [ButtonState.DOWN, 0x6699CC],
        [ButtonState.OVER, 0x144AC5],
        [ButtonState.DISABLED, 0x3B3B3]
    ]);

}

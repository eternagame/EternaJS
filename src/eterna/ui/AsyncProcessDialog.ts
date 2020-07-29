import {Point} from 'pixi.js';
import Fonts from 'eterna/util/Fonts';
import {
    RepeatingTask, SerialTask, AlphaTask, Easing, Flashbang, Assert
} from 'flashbang';
import Dialog from './Dialog';

/** Dims the screen and shows a notification text that fades in and out */
export default class AsyncProcessDialog extends Dialog<void> {
    constructor(text: string) {
        super();
        this._text = text;
    }

    protected added(): void {
        let textField = Fonts.std(this._text, 20).color(0xffffff).bold().build();
        this.container.addChild(textField);

        textField.alpha = 0;
        this.addObject(new RepeatingTask(() => new SerialTask(
            new AlphaTask(1, 0.3, Easing.linear, textField),
            new AlphaTask(0, 0.3, Easing.linear, textField)
        )));

        let updateLocation = () => {
            Assert.assertIsDefined(Flashbang.stageWidth);
            Assert.assertIsDefined(Flashbang.stageHeight);
            textField.position = new Point(
                (Flashbang.stageWidth - textField.width) * 0.5,
                (Flashbang.stageHeight - textField.height) * 0.5
            );
        };
        updateLocation();
        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mode.resized.connect(updateLocation));
    }

    private readonly _text: string;
}

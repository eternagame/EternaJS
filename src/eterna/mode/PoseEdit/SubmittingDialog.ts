import {Point} from 'pixi.js';
import Dialog from 'eterna/ui/Dialog';
import Fonts from 'eterna/util/Fonts';
import {
    RepeatingTask, SerialTask, AlphaTask, Easing, Flashbang
} from 'flashbang';

export default class SubmittingDialog extends Dialog<void> {
    protected added(): void {
        super.added();

        let text = Fonts.arial('Submitting...', 20).color(0xffffff).bold().build();
        this.container.addChild(text);

        text.alpha = 0;
        this.addObject(new RepeatingTask((): SerialTask => new SerialTask(
            new AlphaTask(1, 0.3, Easing.linear, text),
            new AlphaTask(0, 0.3, Easing.linear, text),
        )));

        let updateLocation = () => {
            text.position = new Point(
                (Flashbang.stageWidth - text.width) * 0.5,
                (Flashbang.stageHeight - text.height) * 0.5
            );
        };
        updateLocation();
        this.regs.add(this.mode.resized.connect(updateLocation));
    }
}

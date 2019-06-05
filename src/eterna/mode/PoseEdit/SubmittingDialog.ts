import {Point} from "pixi.js";
import {Flashbang} from "flashbang/core";
import {AlphaTask, RepeatingTask, SerialTask} from "flashbang/tasks";
import {Easing} from "flashbang/util";
import {Dialog} from "eterna/ui";
import {Fonts} from "eterna/util";

export default class SubmittingDialog extends Dialog<void> {
    protected added(): void {
        super.added();

        let text = Fonts.arial("Submitting...", 20).color(0xffffff).bold().build();
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

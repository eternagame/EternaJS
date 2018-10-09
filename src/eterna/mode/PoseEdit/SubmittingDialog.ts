import {Point} from "pixi.js";
import {Flashbang} from "../../../flashbang/core/Flashbang";
import {AlphaTask} from "../../../flashbang/tasks/AlphaTask";
import {RepeatingTask} from "../../../flashbang/tasks/RepeatingTask";
import {SerialTask} from "../../../flashbang/tasks/SerialTask";
import {Easing} from "../../../flashbang/util/Easing";
import {Dialog} from "../../ui/Dialog";
import {Fonts} from "../../util/Fonts";

export class SubmittingDialog extends Dialog<void> {
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

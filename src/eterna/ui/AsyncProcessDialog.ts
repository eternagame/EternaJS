import {Point} from "pixi.js";
import {Flashbang} from "../../flashbang/core/Flashbang";
import {AlphaTask} from "../../flashbang/tasks/AlphaTask";
import {RepeatingTask} from "../../flashbang/tasks/RepeatingTask";
import {SerialTask} from "../../flashbang/tasks/SerialTask";
import {Easing} from "../../flashbang/util/Easing";
import {Fonts} from "../util/Fonts";
import {Dialog} from "./Dialog";

/** Dims the screen and shows a notification text that fades in and out */
export class AsyncProcessDialog extends Dialog<void> {
    public constructor(text: string) {
        super();
        this._text = text;
    }

    protected added(): void {
        let textField = Fonts.arial(this._text, 20).color(0xffffff).bold().build();
        this.container.addChild(textField);

        textField.alpha = 0;
        this.addObject(new RepeatingTask(() => new SerialTask(
            new AlphaTask(1, 0.3, Easing.linear, textField),
            new AlphaTask(0, 0.3, Easing.linear, textField),
        )));

        let updateLocation = () => {
            textField.position = new Point(
                (Flashbang.stageWidth - textField.width) * 0.5,
                (Flashbang.stageHeight - textField.height) * 0.5
            );
        };
        updateLocation();
        this.regs.add(this.mode.resized.connect(updateLocation));
    }

    private readonly _text: string;
}

import {Point} from "pixi.js";
import {Flashbang} from "../../flashbang/core/Flashbang";
import {PointerCapture} from "../../flashbang/input/PointerCapture";
import {HLayoutContainer} from "../../flashbang/layout/HLayoutContainer";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {AlphaTask} from "../../flashbang/tasks/AlphaTask";
import {DisplayUtil} from "../../flashbang/util/DisplayUtil";
import {Signal} from "../../signals/Signal";
import {GameButton} from "./GameButton";
import {TextBalloon} from "./TextBalloon";

export class ConfirmDialog extends ContainerObject {
    /** Emitted when the user closes the dialog. The emitted value will be true if the user clicked Yes. */
    public readonly closed: Signal<boolean> = new Signal();

    public constructor(prompt: string) {
        super();
        this._prompt = prompt;
    }

    protected added() {
        super.added();

        let bg = DisplayUtil.fillStageRect(0x0, 0.7);
        this.container.addChild(bg);
        // eat clicks on our BG
        let capture = new PointerCapture(bg);
        capture.beginCapture((e) => e.stopPropagation());

        let box = new TextBalloon("", 0x152843, 1.0, 0xC0DCE7, 0.27);
        box.set_title("Are you sure?");
        box.set_text(this._prompt + "\n\n");
        box.display.alpha = 0;
        box.display.position = new Point(
            (Flashbang.stageWidth - box.balloon_width()) * 0.5,
            (Flashbang.stageHeight - box.balloon_height()) * 0.5);
        this.addObject(box, this.container);
        box.addObject(new AlphaTask(1, 0.3));

        let buttonLayout = new HLayoutContainer(12);

        let yes_button: GameButton = new GameButton().label("Yes", 16);
        box.addObject(yes_button, buttonLayout);

        let no_button: GameButton = new GameButton().label("No", 16);
        box.addObject(no_button, buttonLayout);

        buttonLayout.layout();
        box.container.addChild(buttonLayout);
        buttonLayout.position = new Point(
            (box.balloon_width() - buttonLayout.width) * 0.5,
            (box.balloon_height() - buttonLayout.height - 7));

        yes_button.clicked.connect(() => this.close(true));
        no_button.clicked.connect(() => this.close(false));
    }

    private close(value: boolean) {
        if (this._closed) {
            return;
        }
        this._closed = true;
        this.closed.emit(value);
        this.destroySelf();
    }

    private readonly _prompt: string;
    private _closed: boolean;
}

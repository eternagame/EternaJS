import {Point} from "pixi.js";
import {Flashbang} from "../../flashbang/core/Flashbang";
import {HLayoutContainer} from "../../flashbang/layout/HLayoutContainer";
import {AlphaTask} from "../../flashbang/tasks/AlphaTask";
import {Dialog} from "./Dialog";
import {GameButton} from "./GameButton";
import {TextBalloon} from "./TextBalloon";

export class ConfirmDialog extends Dialog<boolean> {
    public constructor(prompt: string) {
        super();
        this._prompt = prompt;
    }

    /**
     * Returns a new Promise that will resolve if the dialog is confirmed, and fail otherwise.
     * If the Dialog has already been closed, the Promise will never resolve.
     */
    public get promise(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.closed.connect((value) => {
                if (value) {
                    resolve();
                } else {
                    reject();
                }
            });
        });
    }

    protected added() {
        super.added();

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

    private readonly _prompt: string;
}

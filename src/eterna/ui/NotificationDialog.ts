import {Point} from "pixi.js";
import {Flashbang} from "../../flashbang/core/Flashbang";
import {HLayoutContainer} from "../../flashbang/layout/HLayoutContainer";
import {AlphaTask} from "../../flashbang/tasks/AlphaTask";
import {Easing} from "../../flashbang/util/Easing";
import {Dialog} from "./Dialog";
import {GameButton} from "./GameButton";
import {TextBalloon} from "./TextBalloon";

export class NotificationDialog extends Dialog<void> {
    /** Non-null if extraButtonTitle is specified */
    public extraButton: GameButton;

    public constructor(message: string, okButtonTitle: string = "Ok", extraButtonTitle?: string) {
        super();
        this._message = message;
        this._okButtonTitle = okButtonTitle;
        this._extraButtonTitle = extraButtonTitle;
    }

    /**
     * Returns a new Promise that will resolve when the dialog is closed.
     * If the Dialog has already been closed, the Promise will never resolve.
     */
    public get promise(): Promise<void> {
        return new Promise((resolve) => {
            this.closed.connect(() => resolve());
        });
    }

    protected added() {
        super.added();

        let box = new TextBalloon("", 0x152843, 1.0, 0xC0DCE7, 0.27);
        box.set_title("Notice");
        box.set_text(this._message + "\n\n\n");
        box.display.position = new Point(
            (Flashbang.stageWidth - box.balloon_width()) * 0.5,
            (Flashbang.stageHeight - box.balloon_height()) * 0.5);
        this.addObject(box, this.container);

        box.display.alpha = 0;
        box.addObject(new AlphaTask(1, 0.3, Easing.easeIn));

        let buttonLayout: HLayoutContainer = new HLayoutContainer(2);

        let okButton = new GameButton().label(this._okButtonTitle, 14);
        box.addObject(okButton, buttonLayout);
        okButton.clicked.connect(() => this.close(null));

        if (this._extraButtonTitle != null) {
            this.extraButton = new GameButton().label(this._extraButtonTitle, 14);
            box.addObject(this.extraButton, buttonLayout);

        }

        buttonLayout.layout();
        buttonLayout.position = new Point(
            (box.balloon_width() - buttonLayout.width) * 0.5,
            (box.balloon_height() - buttonLayout.height - 10));

        box.container.addChild(buttonLayout);
    }

    private readonly _message: string;
    private readonly _okButtonTitle: string;
    private readonly _extraButtonTitle: string;
}

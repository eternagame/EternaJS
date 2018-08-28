import {Point} from "pixi.js";
import {HAlign} from "../../flashbang/core/Align";
import {Flashbang} from "../../flashbang/core/Flashbang";
import {HLayoutContainer} from "../../flashbang/layout/HLayoutContainer";
import {VLayoutContainer} from "../../flashbang/layout/VLayoutContainer";
import {AlphaTask} from "../../flashbang/tasks/AlphaTask";
import {Fonts} from "../util/Fonts";
import {Dialog, DialogCanceledError} from "./Dialog";
import {GameButton} from "./GameButton";
import {GamePanel, GamePanelType} from "./GamePanel";
import {HTMLTextObject} from "./HTMLTextObject";

export class ConfirmDialog extends Dialog<boolean> {
    public constructor(prompt: string, promptIsHTML: boolean = false) {
        super();
        this._prompt = prompt;
        this._useHTML = promptIsHTML;
    }

    /**
     * Returns a new Promise that will resolve if the dialog is confirmed,
     * and reject with a DialogCanceledError otherwise.
     */
    public get confirmed(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.closed.then(value => {
                if (value) {
                    resolve();
                } else {
                    reject(new DialogCanceledError());
                }
            })
        });
    }

    protected added() {
        super.added();

        let panel = new GamePanel(GamePanelType.NORMAL, 1.0, 0x152843, 0.27, 0xC0DCE7);
        panel.setPanelTitle("Are you sure?");
        this.addObject(panel, this.container);

        let panelLayout = new VLayoutContainer(0, HAlign.CENTER);
        panel.container.addChild(panelLayout);

        if (this._useHTML) {
            let text = new HTMLTextObject(this._prompt)
                .font(Fonts.ARIAL)
                .fontSize(15)
                .selectable(false)
                .color(0xC0DCE7)
                .maxWidth(300);
            panel.addObject(text, panelLayout);

        } else {
            let text = Fonts.arial(this._prompt, 15).color(0xC0DCE7).wordWrap(true, 300).build();
            panelLayout.addChild(text);
        }

        let buttonLayout = new HLayoutContainer(12);
        panelLayout.addVSpacer(10);
        panelLayout.addChild(buttonLayout);

        let yesButton: GameButton = new GameButton().label("Yes", 16);
        panel.addObject(yesButton, buttonLayout);
        yesButton.clicked.connect(() => this.close(true));

        let noButton: GameButton = new GameButton().label("No", 16);
        panel.addObject(noButton, buttonLayout);
        noButton.clicked.connect(() => this.close(false));

        const W_MARGIN = 10;
        const H_MARGIN = 10;

        panelLayout.layout();
        panel.setSize(panelLayout.width + (W_MARGIN * 2), panel.getTitleSpace() + panelLayout.height + (H_MARGIN * 2));
        panelLayout.position = new Point(W_MARGIN, H_MARGIN + panel.getTitleSpace());

        panel.display.alpha = 0;
        panel.addObject(new AlphaTask(1, 0.3));

        let updateLocation = () => {
            panel.display.position = new Point(
                (Flashbang.stageWidth - panel.get_panel_width()) * 0.5,
                (Flashbang.stageHeight - panel.get_panel_height()) * 0.5
            );
        };

        updateLocation();
        this.regs.add(this._mode.resized.connect(updateLocation));
    }

    private readonly _prompt: string;
    private readonly _useHTML: boolean;
}

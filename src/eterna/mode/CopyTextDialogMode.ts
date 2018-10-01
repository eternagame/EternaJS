import {Graphics} from "pixi.js";
import {AppMode} from "../../flashbang/core/AppMode";
import {Flashbang} from "../../flashbang/core/Flashbang";
import {KeyCode} from "../../flashbang/input/KeyCode";
import {TextInputPanel} from "../ui/TextInputPanel";

/** Show a dialog with text that the user can copy */
export class CopyTextDialogMode extends AppMode {
    public constructor(text: string, dialogTitle?: string) {
        super();
        this._text = text;
        this._dialogTitle = dialogTitle;
    }

    protected setup(): void {
        super.setup();

        let bg = new Graphics();
        this.container.addChild(bg);

        let inputPanel = new TextInputPanel(18);
        if (this._dialogTitle != null) {
            inputPanel.title = this._dialogTitle;
        }
        inputPanel.okButtonLabel = "Copy";

        let textField = inputPanel.addField("Text", Math.min(400, Math.max(200, Flashbang.stageWidth - 200)), false);
        textField.text = this._text;
        textField.readOnly = true;

        this.addObject(inputPanel, this.container);

        textField.setFocus(true);

        inputPanel.setHotkeys(KeyCode.Enter, null, KeyCode.Escape, null);

        inputPanel.cancelClicked.connect(() => this.close());
        inputPanel.okClicked.connect(() => {
            setTimeout(() => {
                textField.setFocus(true);
                document.execCommand("copy");
                this.close();
            });
        });

        const updateView = () => {
            bg.clear()
                .beginFill(0x0, 0.7)
                .drawRect(0, 0, Flashbang.stageWidth, Flashbang.stageHeight)
                .endFill();

            inputPanel.display.position.x = (Flashbang.stageWidth - inputPanel.width) * 0.5;
            inputPanel.display.position.y = (Flashbang.stageHeight - inputPanel.height) * 0.5;
        };

        updateView();
        this.regs.add(this.resized.connect(updateView));
    }

    private close(): void {
        this.modeStack.removeMode(this);
    }

    private readonly _text: string;
    private readonly _dialogTitle: string;
}

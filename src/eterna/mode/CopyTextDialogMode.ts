import {Graphics} from 'pixi.js';
import {
    AppMode, Flashbang, KeyCode, Assert, DisplayObjectPointerTarget, InputUtil
} from 'flashbang';
import TextInputPanel from 'eterna/ui/TextInputPanel';

/** Show a dialog with text that the user can copy */
export default class CopyTextDialogMode extends AppMode {
    constructor(text: string, dialogTitle?: string) {
        super();
        this._text = text;
        this._dialogTitle = dialogTitle;
    }

    protected setup(): void {
        super.setup();
        Assert.assertIsDefined(this.container);
        Assert.assertIsDefined(Flashbang.stageWidth);

        const bg = new Graphics();
        this.container.addChild(bg);

        const inputPanel = new TextInputPanel(18);
        if (this._dialogTitle != null) {
            inputPanel.title = this._dialogTitle;
        }
        inputPanel.okButtonLabel = 'Copy';

        const textField = inputPanel.addField('Text', Math.min(400, Math.max(200, Flashbang.stageWidth - 200)), false);
        textField.text = this._text;
        textField.readOnly = true;

        this.addObject(inputPanel, this.container);

        textField.setFocus(true);

        inputPanel.setHotkeys(KeyCode.Enter, undefined, KeyCode.Escape, undefined);

        inputPanel.cancelClicked.connect(() => this.close());
        inputPanel.okClicked.connect(() => {
            textField.copyToClipboard();
            this.close();
        });

        inputPanel.pointerDown.connect((e) => e.stopPropagation());
        const target = new DisplayObjectPointerTarget(bg);
        bg.interactive = true;
        target.pointerDown.connect((e) => {
            if (InputUtil.IsLeftMouse(e)) {
                this.close();
            }
            e.stopPropagation();
        });

        const updateView = () => {
            Assert.assertIsDefined(Flashbang.stageWidth);
            Assert.assertIsDefined(Flashbang.stageHeight);

            bg.clear()
                .beginFill(0x0, 0.7)
                .drawRect(0, 0, Flashbang.stageWidth, Flashbang.stageHeight)
                .endFill();

            inputPanel.display.position.x = (Flashbang.stageWidth - inputPanel.width) * 0.5;
            inputPanel.display.position.y = (Flashbang.stageHeight - inputPanel.height) * 0.5;
        };

        updateView();
        Assert.assertIsDefined(this.regs);
        this.regs.add(this.resized.connect(updateView));
    }

    private close(): void {
        Assert.assertIsDefined(this.modeStack);
        this.modeStack.removeMode(this);
    }

    private readonly _text: string;
    private readonly _dialogTitle: string | undefined;
}

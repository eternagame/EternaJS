import {Flashbang, KeyCode, Assert} from 'flashbang';
import FloatDialog from './FloatDialog';
import FlexibleTextInputPanel from './FlexibleTextInputPanel';

/** Show a dialog with text that the user can copy */
export default class CopyTextDialog extends FloatDialog<string> {
    constructor(text: string, dialogTitle?: string) {
        super(dialogTitle || '');
        this._text = text;
    }

    protected added() {
        super.added();

        const inputPanel = new FlexibleTextInputPanel(18);
        inputPanel.okButtonLabel = 'Copy';

        Assert.assertIsDefined(Flashbang.stageWidth);

        const textField = inputPanel.addField('Text', Math.min(400, Math.max(200, Flashbang.stageWidth - 200)), false);
        textField.text = this._text;
        textField.readOnly = true;

        this.addObject(inputPanel, this.contentVLay);

        textField.setFocus(true);

        inputPanel.setHotkeys(KeyCode.Enter, undefined, KeyCode.Escape, undefined);

        inputPanel.cancelClicked.connect(() => this.close(null));
        inputPanel.okClicked.connect(() => {
            textField.copyToClipboard();
            this.close(null);
        });

        inputPanel.pointerDown.connect((e) => e.stopPropagation());

        this.updateFloatLocation();
    }

    private readonly _text: string;
}

import {
    CallbackTask, DelayTask, HLayoutContainer, SerialTask, VLayoutContainer
} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import WindowDialog from './WindowDialog';
import TextInputObject from './TextInputObject';
import GameButton from './GameButton';
import Tooltips from './Tooltips';

/** Show a dialog with text that the user can copy */
export default class CopyTextDialog extends WindowDialog<void> {
    constructor({
        text, dialogTitle, copyNotice, modal = false
    }: {
        text: string; copyNotice: string; dialogTitle?: string; modal?: boolean;
    }) {
        super({title: dialogTitle, modal});
        this._initialText = text;
        this._copyNotice = copyNotice;
    }

    protected added() {
        super.added();

        const content = new VLayoutContainer(20);
        this._window.content.addChild(content);

        this._text = new TextInputObject({
            fontSize: 14,
            width: 400,
            domParent: this._window.contentHtmlWrapper
        }).font(Fonts.STDFONT);
        this._text.text = this._initialText;
        this._text.readOnly = true;
        this.addObject(this._text, content);

        this._text.setFocus(true);

        const buttonLayout = new HLayoutContainer(20);
        content.addChild(buttonLayout);
        const copyButton = new GameButton().label('Copy', 14);
        this.addObject(copyButton, buttonLayout);
        if (this.modal) {
            const cancelButton = new GameButton('secondary').label('Cancel', 14);
            this.addObject(cancelButton, buttonLayout);
            this.regs.add(cancelButton.clicked.connect(() => this.close()));
        }

        this.regs.add(copyButton.clicked.connect(() => {
            this._text.copyToClipboard();
            if (this.modal) {
                this.close();
            } else {
                this.removeNamedObjects('SUCCESS_ANIM');
                Tooltips.instance?.showTooltipFor(copyButton.display, this, `${this._copyNotice} copied`);
                this.addNamedObject('SUCCESS_ANIM', new SerialTask(
                    new DelayTask(2),
                    new CallbackTask(() => {
                        Tooltips.instance?.removeTooltip(this);
                    })
                ));
            }
        }));

        content.layout();
        this._window.layout();
    }

    public set text(val: string) {
        this._text.text = val;
    }

    private _text: TextInputObject;

    private _initialText: string;
    private _copyNotice: string;
}

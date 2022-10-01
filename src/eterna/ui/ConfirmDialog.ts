import Fonts from 'eterna/util/Fonts';
import {AlphaTask, HLayoutContainer, VLayoutContainer} from 'flashbang';
import {DialogCanceledError} from './Dialog';
import GameButton from './GameButton';
import HTMLTextObject from './HTMLTextObject';
import WindowDialog from './WindowDialog';

export default class ConfirmDialog extends WindowDialog<boolean> {
    constructor(prompt: string, promptIsHTML: boolean = false) {
        super({title: 'Are you sure?', modal: true});
        this._prompt = prompt;
        this._useHTML = promptIsHTML;
    }

    public get confirmed(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.closed.then((value) => {
                if (value) {
                    resolve();
                } else {
                    reject(new DialogCanceledError());
                }
            });
        });
    }

    protected added() {
        super.added();

        const content = new VLayoutContainer(20);
        this._window.content.addChild(content);

        if (this._useHTML) {
            const text = new HTMLTextObject(this._prompt, undefined, this._window.contentHtmlWrapper, true)
                .font(Fonts.STDFONT)
                .fontSize(15)
                .selectable(false)
                .color(0xC0DCE7)
                .maxWidth(300);
            this.addObject(text, content);
        } else {
            const text = Fonts.std(this._prompt, 15).color(0xC0DCE7).wordWrap(true, 300).build();
            content.addChild(text);
        }

        const buttonLayout = new HLayoutContainer(12);
        content.addChild(buttonLayout);

        const yesButton = new GameButton().label('Yes', 14);
        this.addObject(yesButton, buttonLayout);
        yesButton.clicked.connect(() => this.close(true));

        const noButton = new GameButton().label('No', 14);
        this.addObject(noButton, buttonLayout);
        noButton.clicked.connect(() => this.close(false));

        content.layout();
        this._window.layout();

        this._window.display.alpha = 0;
        this._window.addObject(new AlphaTask(1, 0.3));
    }

    private readonly _prompt: string;
    private readonly _useHTML: boolean;
}

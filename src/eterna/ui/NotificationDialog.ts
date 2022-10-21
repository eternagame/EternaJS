import Fonts from 'eterna/util/Fonts';
import {
    HLayoutContainer, VLayoutContainer, StyledTextBuilder
} from 'flashbang';
import GameButton from './GameButton';
import WindowDialog from './WindowDialog';

export default class NotificationDialog extends WindowDialog<void> {
    /** Non-null if extraButtonTitle is specified */
    public extraButton: GameButton;

    constructor(message: string, okButtonTitle: string = 'Ok', extraButtonTitle?: string) {
        super({title: 'Notice', modal: true});
        this._message = message;
        this._okButtonTitle = okButtonTitle;
        this._extraButtonTitle = extraButtonTitle;
    }

    protected added() {
        super.added();

        const content = new VLayoutContainer(20);
        this._window.content.addChild(content);

        // Note that we aren't doing any word wrapping since a lot of notifications insert their own line breaks
        // It would probably be ideal to have a nicer behavior where we word wrap based on the available
        // window width, up to some readable maximum...
        const text = new StyledTextBuilder({
            fontFamily: Fonts.STDFONT,
            fontSize: 15,
            fill: 0xFFFFFF
        }).appendHTMLStyledText(this._message).build();
        content.addChild(text);

        const buttonLayout: HLayoutContainer = new HLayoutContainer(6);

        const okButton = new GameButton().label(this._okButtonTitle, 14);
        this.addObject(okButton, buttonLayout);
        okButton.clicked.connect(() => this.close());

        if (this._extraButtonTitle) {
            this.extraButton = new GameButton().label(this._extraButtonTitle, 14);
            this.addObject(this.extraButton, buttonLayout);
        }

        content.addChild(buttonLayout);

        content.layout();
        this._window.layout();
    }

    private readonly _message: string;
    private readonly _okButtonTitle: string;
    private readonly _extraButtonTitle?: string;
}

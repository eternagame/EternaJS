import {Point} from 'pixi.js';
import {HLayoutContainer, Flashbang, Assert} from 'flashbang';
import Dialog from './Dialog';
import GameButton from './GameButton';
import TextBalloon from './TextBalloon';

export default class NotificationDialog extends Dialog<void> {
    /** Non-null if extraButtonTitle is specified */
    public extraButton: GameButton;

    constructor(message: string, okButtonTitle: string = 'Ok', extraButtonTitle?: string) {
        super();
        this._message = message;
        this._okButtonTitle = okButtonTitle;
        this._extraButtonTitle = extraButtonTitle;
    }

    protected added() {
        super.added();

        let box = new TextBalloon('', 0x152843, 1.0, 0xC0DCE7, 0.27);
        box.title = 'Notice';
        box.setText(`${this._message}\n\n\n`);
        this.addObject(box, this.container);

        // This fade-in is annoying and slows the user down.
        // box.display.alpha = 0;
        // box.addObject(new AlphaTask(1, 0.3, Easing.easeIn));

        let buttonLayout: HLayoutContainer = new HLayoutContainer(2);

        let okButton = new GameButton().label(this._okButtonTitle, 14);
        box.addObject(okButton, buttonLayout);
        okButton.clicked.connect(() => this.close());

        if (this._extraButtonTitle != null) {
            this.extraButton = new GameButton().label(this._extraButtonTitle, 14);
            box.addObject(this.extraButton, buttonLayout);
        }

        buttonLayout.layout();
        buttonLayout.position = new Point(
            (box.width - buttonLayout.width) * 0.5,
            (box.height - buttonLayout.height - 10)
        );

        box.container.addChild(buttonLayout);

        let updateLocation = () => {
            Assert.assertIsDefined(Flashbang.stageWidth);
            Assert.assertIsDefined(Flashbang.stageHeight);
            box.display.position = new Point(
                (Flashbang.stageWidth - box.width) * 0.5,
                (Flashbang.stageHeight - box.height) * 0.5
            );
        };
        updateLocation();
        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mode.resized.connect(updateLocation));
    }

    private readonly _message: string;
    private readonly _okButtonTitle: string;
    private readonly _extraButtonTitle?: string;
}

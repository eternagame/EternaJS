import {Container, Graphics} from 'pixi.js';
import {
    VLayoutContainer, HAlign, ErrorUtil, Flashbang, AppMode, Assert, AlphaTask, HLayoutContainer
} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import GameButton from 'eterna/ui/GameButton';
import GameWindow from 'eterna/ui/GameWindow';

export default class ErrorDialogMode extends AppMode {
    public readonly error: Error | ErrorEvent;

    constructor(error: Error | ErrorEvent, title = 'Unhandled Error') {
        super();
        this.error = error;
        this._title = title;
    }

    public get isOpaque(): boolean { return false; }

    protected setup(): void {
        super.setup();
        Assert.assertIsDefined(this.container);
        Assert.assertIsDefined(this.modeStack);
        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);

        const bg = new Graphics();
        this.container.addChild(bg);

        const window = new GameWindow({
            movable: false,
            resizable: false,
            closable: true,
            title: this._title
        });
        window.setTargetBounds({
            x: {from: 'center', offsetExact: 0},
            y: {from: 'center', offsetExact: 0}
        });
        this.addObject(window, this.container);

        const panelLayout = new VLayoutContainer(0, HAlign.CENTER);
        window.content.addChild(panelLayout);

        // The extra containers and graphics objects are so that we can left align all the text,
        // left align the intro and trailer, but center the bounds of the error text itself
        const introContainer = new Container();
        const introBg = new Graphics().beginFill(0).drawRect(0, 0, 350, 1);
        introBg.alpha = 0;
        introContainer.addChild(introBg);
        introContainer.addChild(Fonts.std('', 15)
            .text('Eterna encountered an error - here\'s what we know:\n')
            .color(0xC0DCE7)
            .wordWrap(true, 350)
            .build());
        panelLayout.addChild(introContainer);

        panelLayout.addChild(Fonts.std('', 15)
            .text(ErrorUtil.getErrString(this.error, false))
            .color(0xC0DCE7)
            .wordWrap(true, 300)
            .build());

        const trailerContainer = new Container();
        const trailerBg = new Graphics().beginFill(0).drawRect(0, 0, 350, 1);
        trailerBg.alpha = 0;
        trailerContainer.addChild(trailerBg);
        trailerContainer.addChild(Fonts.std('', 15)
            .text('\nFor assistance, please visit forum.eternagame.org or contact support@eternagame.org')
            .color(0xC0DCE7)
            .wordWrap(true, 350)
            .build());
        panelLayout.addChild(trailerContainer);

        panelLayout.addVSpacer(20);

        const buttonLayout = new HLayoutContainer(10);
        panelLayout.addChild(buttonLayout);
        const okButton = new GameButton().label('OK', 14);
        window.addObject(okButton, buttonLayout);
        const copyButton = new GameButton('secondary').label('Copy Full Error Details', 14);
        window.addObject(copyButton, buttonLayout);

        copyButton.clicked.connect(() => {
            navigator.clipboard.writeText(ErrorUtil.getErrString(this.error, true));
        });

        const close = () => {
            Assert.assertIsDefined(this.modeStack);
            this.modeStack.removeMode(this);
        };
        okButton.clicked.connect(close);
        window.closeClicked.connect(close);

        panelLayout.layout();
        window.layout();
        window.display.alpha = 0;
        window.addObject(new AlphaTask(1, 0.3));

        const updateView = () => {
            Assert.assertIsDefined(Flashbang.stageWidth);
            Assert.assertIsDefined(Flashbang.stageHeight);
            bg.clear()
                .beginFill(0x0, 0.7)
                .drawRect(0, 0, Flashbang.stageWidth, Flashbang.stageHeight)
                .endFill();
        };

        updateView();
        Assert.assertIsDefined(this.regs);
        this.regs.add(this.resized.connect(updateView));
    }

    private readonly _title: string;
}

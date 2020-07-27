import {Graphics, Point} from 'pixi.js';
import GamePanel, {GamePanelType} from 'eterna/ui/GamePanel';
import {
    VLayoutContainer, HAlign, ErrorUtil, Flashbang, AppMode, Assert
} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import GameButton from 'eterna/ui/GameButton';

export default class ErrorDialogMode extends AppMode {
    public readonly error: Error | ErrorEvent;

    constructor(error: Error | ErrorEvent) {
        super();
        this.error = error;
    }

    public get isOpaque(): boolean { return false; }

    protected setup(): void {
        super.setup();
        Assert.assertIsDefined(this.container);
        Assert.assertIsDefined(this.modeStack);
        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);

        let bg = new Graphics();
        this.container.addChild(bg);

        let panel = new GamePanel(GamePanelType.NORMAL, 1.0, 0x152843, 0.27, 0xC0DCE7);
        panel.title = 'Fatal Error!';
        this.addObject(panel, this.container);

        let panelLayout = new VLayoutContainer(0, HAlign.CENTER);
        panel.container.addChild(panelLayout);
        panelLayout.addChild(Fonts.std('', 15)
            .text(ErrorUtil.getErrString(this.error, false))
            .color(0xC0DCE7)
            .wordWrap(true, 300)
            .build());

        panelLayout.addVSpacer(20);

        let okButton = new GameButton().label('OK', 16);
        panel.addObject(okButton, panelLayout);

        okButton.clicked.connect(() => {
            Assert.assertIsDefined(this.modeStack);
            this.modeStack.removeMode(this);
        });

        panelLayout.layout();

        const W_MARGIN = 10;
        const H_MARGIN = 10;

        panel.setSize(panelLayout.width + (W_MARGIN * 2), panel.titleHeight + panelLayout.height + (H_MARGIN * 2));
        panelLayout.position = new Point(W_MARGIN, H_MARGIN + panel.titleHeight);

        const updateView = () => {
            Assert.assertIsDefined(Flashbang.stageWidth);
            Assert.assertIsDefined(Flashbang.stageHeight);
            bg.clear()
                .beginFill(0x0, 0.7)
                .drawRect(0, 0, Flashbang.stageWidth, Flashbang.stageHeight)
                .endFill();

            panel.display.position.x = (Flashbang.stageWidth - panel.width) * 0.5;
            panel.display.position.y = (Flashbang.stageHeight - panel.height) * 0.5;
        };

        updateView();
        Assert.assertIsDefined(this.regs);
        this.regs.add(this.resized.connect(updateView));
    }
}

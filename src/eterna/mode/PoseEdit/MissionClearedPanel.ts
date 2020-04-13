import {
    Container, Graphics, Point, Text
} from 'pixi.js';
import {
    ContainerObject, VLayoutContainer, HAlign, DOMObject, AlphaTask, Flashbang, DisplayUtil, VAlign
} from 'flashbang';
import GameButton from 'eterna/ui/GameButton';
import Fonts from 'eterna/util/Fonts';
import HTMLTextObject from 'eterna/ui/HTMLTextObject';
import GamePanel, {GamePanelType} from 'eterna/ui/GamePanel';
import Bitmaps from 'eterna/resources/Bitmaps';
import RankScroll from 'eterna/rank/RankScroll';

export default class MissionClearedPanel extends ContainerObject {
    public nextButton: GameButton;
    public closeButton: GameButton;

    constructor(hasNextPuzzle: boolean, infoText: string | null = null, moreText: string | null = null) {
        super();

        this._hasNextPuzzle = hasNextPuzzle;
        this._infoText = infoText;
        this._moreText = moreText;

        this._bg = new Graphics();
        this.container.addChild(this._bg);
    }

    protected added(): void {
        super.added();

        this._contentLayout = new VLayoutContainer(25, HAlign.CENTER);
        this.container.addChild(this._contentLayout);

        this._contentLayout.addChild(Fonts.stdLight('Mission Accomplished!', 36).color(0xFFCC00).build());

        const infoText: string = this._infoText || 'You have solved the puzzle, congratulations!';
        const infoObj = new HTMLTextObject(infoText, MissionClearedPanel.WIDTH - 60)
            .font(Fonts.STDFONT_REGULAR)
            .fontSize(20)
            .color(0xffffff)
            .lineHeight(1.2)
            .selectable(false);
        // Images should be centered, even if the HTML doesn't specify it
        DOMObject.applyStyleRecursive(infoObj.element, {display: 'block', margin: 'auto'}, false, ['img']);
        this.addObject(infoObj, this._contentLayout);

        if (this._moreText != null) {
            const moreTextObj = new HTMLTextObject(this._moreText, MissionClearedPanel.WIDTH - 60)
                .font(Fonts.STDFONT_REGULAR)
                .fontSize(16)
                .color(0xffffff)
                .lineHeight(1.2)
                .selectable(false);
            this.addObject(moreTextObj, this._contentLayout);
        }

        this._rankScrollContainer = new Container();
        this._rankScrollContainer.visible = false;
        this._contentLayout.addChild(this._rankScrollContainer);

        this._rankScrollHeading = new GamePanel(GamePanelType.NORMAL, 1.0, 0x2D4159);
        this.addObject(this._rankScrollHeading, this._rankScrollContainer);

        this._tfPlayer = Fonts.stdBold('PLAYER', 14).bold().color(0xffffff).build();
        this._tfPlayer.position = new Point(10, 2);
        this._rankScrollHeading.container.addChild(this._tfPlayer);

        let tfRank: Text = Fonts.stdBold('RANK', 14).bold().color(0xffffff).build();
        tfRank.position = new Point(10 + 130, 2);
        this._rankScrollHeading.container.addChild(tfRank);

        let tfCoin: Text = Fonts.stdBold('POINTS', 14).bold().color(0xffffff).build();
        tfCoin.position = new Point(10 + 130 + 85, 2);
        this._rankScrollHeading.container.addChild(tfCoin);

        this.closeButton = new GameButton()
            .allStates(Bitmaps.ImgCross)
            .tooltip('Stay in this puzzle and review your design');
        this.addObject(this.closeButton, this.container);

        this.nextButton = new GameButton().label(this._hasNextPuzzle ? 'NEXT PUZZLE' : "WHAT'S NEXT?");
        this.addObject(this.nextButton, this.container);

        this.regs.add(this.mode.resized.connect(() => this.onResize()));
        this.onResize();
    }

    public createRankScroll(submissionRsp: any): void {
        if (!RankScroll.hasRankScrollData(submissionRsp)) {
            return;
        }

        if (this._rankScroll != null) {
            this._rankScroll.destroySelf();
        }

        this._rankScroll = RankScroll.fromSubmissionResponse(submissionRsp);
        this._rankScroll.display.alpha = 0;
        this._rankScroll.addObject(new AlphaTask(1, 0.5));
        this.addObject(this._rankScroll, this._rankScrollContainer);
        this.onResize();

        // Execute animation
        this._rankScroll.animate();
    }

    private onResize(): void {
        this.drawBG();
        this.doLayout();

        this.display.position.x = Flashbang.stageWidth - MissionClearedPanel.WIDTH;
    }

    private drawBG(): void {
        this._bg.clear();
        this._bg.beginFill(0x0, 0.8);
        this._bg.drawRect(0, 0, MissionClearedPanel.WIDTH, Flashbang.stageHeight);
        this._bg.endFill();
    }

    private doLayout(): void {
        this._rankScrollContainer.visible = (this._rankScroll != null);
        this.closeButton.display.visible = this._rankScrollContainer.visible;
        this.nextButton.display.visible = this._rankScrollContainer.visible;

        DisplayUtil.positionRelative(
            this.closeButton.display, HAlign.RIGHT, VAlign.TOP,
            this._bg, HAlign.RIGHT, VAlign.TOP,
            -10, 10
        );

        DisplayUtil.positionRelative(
            this.nextButton.display, HAlign.CENTER, VAlign.BOTTOM,
            this._bg, HAlign.CENTER, VAlign.BOTTOM,
            0, -25
        );

        if (this._rankScroll != null) {
            this._rankScrollHeading.setSize(310, this._tfPlayer.height + 6);
            this._rankScrollHeading.display.position = new Point(
                ((MissionClearedPanel.WIDTH - this._rankScroll.realWidth) * 0.5) + 10,
                0
            );

            this._rankScroll.display.position = new Point(
                ((MissionClearedPanel.WIDTH - this._rankScroll.realWidth) * 0.5) + 20,
                12 + this._tfPlayer.height
            );
        }

        this._contentLayout.scale = new Point(1, 1);
        this._contentLayout.layout(true);

        const maxHeight = Flashbang.stageHeight - 150;
        if (this._contentLayout.height > maxHeight) {
            const contentScale = maxHeight / this._contentLayout.height;
            this._contentLayout.scale = new Point(contentScale, contentScale);
        }

        this._contentLayout.position = new Point(
            (MissionClearedPanel.WIDTH - this._contentLayout.width) * 0.5,
            (Flashbang.stageHeight - this._contentLayout.height) * 0.5
        );

        this.nextButton.display.position = new Point(
            (MissionClearedPanel.WIDTH - this.nextButton.container.width) * 0.5,
            Flashbang.stageHeight - 20 - this.nextButton.container.height
        );
    }

    private readonly _infoText: string | null;
    private readonly _moreText: string | null;
    private readonly _hasNextPuzzle: boolean;

    private readonly _bg: Graphics;

    private _contentLayout: VLayoutContainer;

    // private _tfLoading: Text;

    private _rankScrollHeading: GamePanel;
    private _tfPlayer: Text;
    private _rankScrollContainer: Container;
    private _rankScroll: RankScroll | null = null;

    private static readonly WIDTH: number = 480;
}

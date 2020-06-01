import {
    Container, Graphics, Point, Text, interaction
} from 'pixi.js';
import {
    ContainerObject, VLayoutContainer, HAlign, DOMObject, AlphaTask, Flashbang, DisplayUtil, VAlign, MathUtil
} from 'flashbang';
import GameButton from 'eterna/ui/GameButton';
import Fonts from 'eterna/util/Fonts';
import HTMLTextObject from 'eterna/ui/HTMLTextObject';
import GamePanel, {GamePanelType} from 'eterna/ui/GamePanel';
import Bitmaps from 'eterna/resources/Bitmaps';
import RankScroll from 'eterna/rank/RankScroll';
import Eterna from 'eterna/Eterna';

export default class MissionClearedPanel extends ContainerObject {
    public nextButton: GameButton;
    public closeButton: GameButton;

    constructor(hasNextPuzzle: boolean, infoText: string = null, moreText: string = null) {
        super();

        this._hasNextPuzzle = hasNextPuzzle;
        this._infoText = infoText;
        this._moreText = moreText;

        this._bg = new Graphics();
        this.container.addChild(this._bg);
    }

    private static processHTML(input: string): string {
        if (Eterna.MOBILE_APP && input) {
            const regex = /<img(.*?)src=['"]\/(.*?)['"](.*?)>/gm;
            const subst = `<img$1src="${Eterna.SERVER_URL}/$2"$3>`;
            const output = input.replace(regex, subst);
            return output;
        } else {
            return input;
        }
    }

    protected added(): void {
        super.added();

        const panelWidth = MissionClearedPanel.calcWidth();

        this._contentLayout = new VLayoutContainer(25, HAlign.LEFT);
        this.container.addChild(this._contentLayout);

        this._contentLayout.addChild(Fonts.stdBold('MISSION ACCOMPLISHED!', 14).color(0xFFCC00).build());

        this._infoContainer = new VLayoutContainer(25, HAlign.LEFT);
        this._contentLayout.addChild(this._infoContainer);
        this._infoMask = new Graphics();
        this._infoMask.interactive = true;
        this._infoMask.position = new Point();
        this.container.addChild(this._infoMask);
        this._infoContainer.mask = this._infoMask;

        this._infoMask
            .on('pointerdown', this.maskPointerDown.bind(this))
            .on('pointerup', this.maskPointerUp.bind(this))
            .on('pointerupoutside', this.maskPointerUp.bind(this))
            .on('pointermove', this.maskPointerMove.bind(this));

        const overlayEl = document.getElementById(Eterna.OVERLAY_DIV_ID);
        this._infoWrapper = document.createElement('div');
        this._infoWrapper.id = 'mission-cleared-info-wrapper';
        this._infoWrapper.style.position = 'absolute';
        overlayEl.appendChild(this._infoWrapper);

        const infoText = MissionClearedPanel.processHTML(this._infoText)
            || 'You have solved the puzzle, congratulations!';
        const infoObj = new HTMLTextObject(infoText, panelWidth - 20, this._infoWrapper.id)
            .font(Fonts.STDFONT_REGULAR)
            .fontSize(14)
            .color(0xffffff)
            .lineHeight(1.2)
            .selectable(false);
        // Images should be centered, even if the HTML doesn't specify it
        DOMObject.applyStyleRecursive(infoObj.element, {display: 'block', margin: 'auto'}, false, ['img']);
        this.addObject(infoObj, this._infoContainer);

        if (this._moreText != null) {
            const moreTextObj = new HTMLTextObject(this._moreText, panelWidth - 60)
                .font(Fonts.STDFONT_REGULAR)
                .fontSize(16)
                .color(0xffffff)
                .lineHeight(1.2)
                .selectable(false);
            this.addObject(moreTextObj, this._infoContainer);
        }

        this._rankScrollContainer = new Container();
        this._rankScrollContainer.visible = false;
        this._infoContainer.addChild(this._rankScrollContainer);

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
            .allStates(Bitmaps.ImgAchievementsClose)
            .tooltip('Stay in this puzzle and review your design');
        this.addObject(this.closeButton, this.container);

        const nextButtonGraphic = new Graphics()
            .beginFill(0x54B54E)
            .drawRoundedRect(0, 0, 170, 40, 10)
            .endFill();
        this.nextButton = new GameButton()
            .customStyleBox(nextButtonGraphic)
            .label(this._hasNextPuzzle ? 'Next Puzzle' : "What's Next?");
        this.addObject(this.nextButton, this.container);

        this.regs.add(this.mode.resized.connect(() => this.onResize()));
        this.onResize();
    }

    protected dispose(): void {
        const overlayEl = document.getElementById(Eterna.OVERLAY_DIV_ID);
        overlayEl.removeChild(this._infoWrapper);

        super.dispose();
    }

    private maskPointerDown(event: interaction.InteractionEvent) {
        this._dragging = true;
        this._dragPointData = event.data;
        this._dragStartBoxY = this._infoContainer.y;
        this._dragStartPointY = event.data.getLocalPosition(this._contentLayout).y;
    }

    private maskPointerUp(event: interaction.InteractionEvent) {
        this._dragging = false;
        this._dragPointData = null;
        this._dragStartBoxY = 0;
        this._dragStartPointY = 0;
    }

    private maskPointerMove(event: interaction.InteractionEvent) {
        const scrollHeight = Flashbang.stageHeight - (50 + 75);
        const containerHeight = this._infoContainer.height + 20; // Add a bit of margin
        if (this._dragging && containerHeight > scrollHeight) {
            const dragRange = this._dragPointData.getLocalPosition(this._contentLayout).y - this._dragStartPointY;
            this._infoContainer.y = MathUtil.clamp(
                this._dragStartBoxY + dragRange,
                50 - (containerHeight - scrollHeight),
                50
            );
        }
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
        this.drawMask();
        this.doLayout();

        this.display.position.x = Flashbang.stageWidth - MissionClearedPanel.calcWidth();
        this._infoWrapper.style.width = `${Flashbang.stageWidth}px`;
        this._infoWrapper.style.height = `${Flashbang.stageHeight}px`;
        this._infoWrapper.style.clipPath = `inset(50px 0 75px ${this.display.position.x}px)`;
    }

    private drawBG(): void {
        this._bg.clear();
        this._bg.beginFill(0x0, 0.8);
        this._bg.drawRect(0, 0, MissionClearedPanel.calcWidth(), Flashbang.stageHeight);
        this._bg.endFill();
    }

    private drawMask(): void {
        this._infoMask.clear();
        this._infoMask.beginFill(0x00FF00, 100);
        this._infoMask.drawRect(
            0, 50, MissionClearedPanel.calcWidth(), Flashbang.stageHeight - 125
        );
        this._infoMask.endFill();
    }

    private doLayout(): void {
        this._rankScrollContainer.visible = (this._rankScroll != null);
        this.closeButton.display.visible = this._rankScrollContainer.visible;
        this.nextButton.display.visible = this._rankScrollContainer.visible;

        const panelWidth = MissionClearedPanel.calcWidth();

        DisplayUtil.positionRelative(
            this.closeButton.display, HAlign.RIGHT, VAlign.TOP,
            this._bg, HAlign.RIGHT, VAlign.TOP,
            -10, 15
        );

        DisplayUtil.positionRelative(
            this.nextButton.display, HAlign.CENTER, VAlign.BOTTOM,
            this._bg, HAlign.CENTER, VAlign.BOTTOM,
            0, -25
        );

        if (this._rankScroll != null) {
            this._rankScrollHeading.setSize(310, this._tfPlayer.height + 6);
            this._rankScrollHeading.display.position = new Point(0, 0);
            this._rankScroll.display.position = new Point(10, 12 + this._tfPlayer.height);

            const rankScale = panelWidth / (310 + 80);
            this._rankScrollContainer.scale = new Point(rankScale, rankScale);
        }

        this._contentLayout.layout(true);
        this._contentLayout.position = new Point(10, 15);

        this.nextButton.display.position = new Point(
            (panelWidth - this.nextButton.container.width) * 0.5,
            Flashbang.stageHeight - 20 - this.nextButton.container.height
        );
    }

    private static calcWidth(): number {
        return Math.min(
            Flashbang.stageWidth,
            MathUtil.clamp(Flashbang.stageWidth * 0.4, 230, 480)
        );
    }

    private readonly _infoText: string;
    private readonly _moreText: string;
    private readonly _hasNextPuzzle: boolean;

    private readonly _bg: Graphics;

    private _contentLayout: VLayoutContainer;
    private _infoWrapper: HTMLDivElement;
    private _infoContainer: VLayoutContainer;
    private _infoMask: Graphics;

    // private _tfLoading: Text;

    private _rankScrollHeading: GamePanel;
    private _tfPlayer: Text;
    private _rankScrollContainer: Container;
    private _rankScroll: RankScroll = null;

    private _dragging = false;
    private _dragPointData: PIXI.interaction.InteractionData = null;
    private _dragStartPointY = 0;
    private _dragStartBoxY = 0;
}

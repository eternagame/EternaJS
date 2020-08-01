import {
    Container, Graphics, Point, Text, interaction
} from 'pixi.js';
import {
    ContainerObject, VLayoutContainer, HAlign, DOMObject, AlphaTask,
    Flashbang, DisplayUtil, VAlign, Assert, MathUtil, MouseWheelListener, InputUtil
} from 'flashbang';
import GameButton from 'eterna/ui/GameButton';
import Fonts from 'eterna/util/Fonts';
import HTMLTextObject from 'eterna/ui/HTMLTextObject';
import GamePanel, {GamePanelType} from 'eterna/ui/GamePanel';
import Bitmaps from 'eterna/resources/Bitmaps';
import RankScroll from 'eterna/rank/RankScroll';
import Eterna from 'eterna/Eterna';
import {SubmitSolutionData} from './PoseEditMode';

export default class MissionClearedPanel extends ContainerObject implements MouseWheelListener {
    private static readonly theme = {
        margin: {
            top: 30,
            left: 17
        },
        mask: {
            top: 80,
            bottom: 76
        },
        separator: {
            separation: 15,
            margin: 30
        }
    };

    public nextButton: GameButton;
    public closeButton: GameButton;

    constructor(hasNextPuzzle: boolean, infoText: string | null = null, moreText: string | null = null) {
        super();

        this._hasNextPuzzle = hasNextPuzzle;
        this._infoText = infoText || 'You have solved the puzzle, congratulations!';
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

        const {theme} = MissionClearedPanel;
        const panelWidth = MissionClearedPanel.calcWidth();

        this._contentLayout = new VLayoutContainer(10, HAlign.CENTER);
        this._contentLayout.position = new Point(theme.margin.left, theme.margin.top);
        this.container.addChild(this._contentLayout);

        this._widthEnforcer = new Graphics();
        this._contentLayout.addChild(this._widthEnforcer);

        const title = Fonts.std('MISSION ACCOMPLISHED!', 20).bold().color(0xFFCC00).build();
        this._contentLayout.addChild(title);

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
        Assert.assertIsDefined(overlayEl);
        this._infoWrapper = document.createElement('div');
        this._infoWrapper.style.position = 'absolute';
        // assets/Styles/style.css ensures that links are still clickable
        this._infoWrapper.style.pointerEvents = 'none';
        overlayEl.appendChild(this._infoWrapper);

        Assert.assertIsDefined(Flashbang.stageHeight);
        const infoText = MissionClearedPanel.processHTML(this._infoText);
        const infoObj = new HTMLTextObject(
            infoText,
            panelWidth - MissionClearedPanel.PADDING_RIGHT,
            this._infoWrapper,
            true
        ).font(Fonts.STDFONT)
            .fontSize(Flashbang.stageHeight < 512 ? 14 : 18)
            .color(0xffffff)
            .lineHeight(1.2)
            .selectable(false);
        // Images should be centered, even if the HTML doesn't specify it
        DOMObject.applyStyleRecursive(infoObj.element, {display: 'block', margin: 'auto'}, false, ['img']);
        this.addObject(infoObj, this._infoContainer);

        if (this._moreText != null) {
            const moreTextObj = new HTMLTextObject(
                this._moreText,
                panelWidth - MissionClearedPanel.PADDING_RIGHT,
                undefined,
                true
            ).font(Fonts.STDFONT)
                .fontSize(16)
                .color(0xffffff)
                .lineHeight(1.2)
                .selectable(false);
            this.addObject(moreTextObj, this._infoContainer);
        }

        this._infoContainer.addVSpacer(30);

        this._rankScrollContainer = new Container();
        this._rankScrollContainer.visible = false;
        this._infoContainer.addChild(this._rankScrollContainer);

        this._rankScrollHeading = new GamePanel(GamePanelType.NORMAL, 1.0, 0x2D4159);
        this.addObject(this._rankScrollHeading, this._rankScrollContainer);

        this._tfPlayer = Fonts.std('PLAYER', 14).bold().color(0xffffff).build();
        this._tfPlayer.position = new Point(10, 2);
        this._rankScrollHeading.container.addChild(this._tfPlayer);

        let tfRank: Text = Fonts.std('RANK', 14).bold().color(0xffffff).build();
        tfRank.position = new Point(10 + 130, 2);
        this._rankScrollHeading.container.addChild(tfRank);

        let tfCoin: Text = Fonts.std('POINTS', 14).bold().color(0xffffff).build();
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

        this._separator = new Graphics();
        this.container.addChild(this._separator);

        Assert.assertIsDefined(this.mode);
        this.regs.add(this.mode.mouseWheelInput.pushListener(this));

        this.regs.add(this.mode.resized.connect(() => this.onResize()));
        this.onResize();
    }

    protected dispose(): void {
        const overlayEl = document.getElementById(Eterna.OVERLAY_DIV_ID);
        Assert.assertIsDefined(overlayEl);
        overlayEl.removeChild(this._infoWrapper);

        super.dispose();
    }

    private maskPointerDown(event: interaction.InteractionEvent) {
        const {theme} = MissionClearedPanel;
        if (this._infoContainer.height < MissionClearedPanel.calcScrollHeight()) {
            return;
        }
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
        if (this._dragging) {
            Assert.assertIsDefined(this._dragPointData);
            const dragRange = this._dragPointData.getLocalPosition(this._contentLayout).y - this._dragStartPointY;
            this.scrollTo(this._dragStartBoxY + dragRange);
        }
    }

    public onMouseWheelEvent(e: WheelEvent): boolean {
        let pxdelta: number = InputUtil.scrollAmount(e, 13, this.display.height);
        this.scrollTo(this._infoContainer.y - pxdelta);

        return true;
    }

    public scrollTo(yPos: number) {
        Assert.assertIsDefined(Flashbang.stageHeight);
        const scrollHeight = Flashbang.stageHeight - (50 + 75);
        const containerHeight = this._infoContainer.height + 40; // Add a bit of margin
        if (containerHeight > scrollHeight) {
            this._infoContainer.y = MathUtil.clamp(
                yPos,
                50 - (containerHeight - scrollHeight),
                50
            );
        }
    }

    public createRankScroll(submissionRsp: SubmitSolutionData): void {
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
        this.drawMask();

        Assert.assertIsDefined(Flashbang.stageWidth);
        Assert.assertIsDefined(Flashbang.stageHeight);
        this.display.position.x = Flashbang.stageWidth - MissionClearedPanel.calcWidth();
        this._infoWrapper.style.width = `${Flashbang.stageWidth}px`;
        this._infoWrapper.style.height = `${Flashbang.stageHeight}px`;
        const {theme} = MissionClearedPanel;
        this._infoWrapper.style.clipPath = `inset(${theme.mask.top}px 0 ${theme.mask.bottom}px ${this.display.position.x}px)`;
    }

    private drawBG(): void {
        this._bg.clear();
        this._bg.beginFill(0x0, 0.8);
        Assert.assertIsDefined(Flashbang.stageHeight);
        this._bg.drawRect(0, 0, MissionClearedPanel.calcWidth(), Flashbang.stageHeight);
        this._bg.endFill();
    }

    private drawMask(): void {
        const {theme} = MissionClearedPanel;
        this._infoMask.clear();
        this._infoMask.beginFill(0x00FF00);
        this._infoMask.drawRect(
            0,
            theme.mask.top,
            MissionClearedPanel.calcWidth(),
            MissionClearedPanel.calcScrollHeight()
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

        if (this._rankScroll != null) {
            this._rankScrollHeading.setSize(310, this._tfPlayer.height + 6);
            this._rankScrollHeading.display.position = new Point(0, 0);
            this._rankScroll.display.position = new Point(10, 12 + this._tfPlayer.height);

            const rankScale = Math.min(1, panelWidth / (400 + 80));
            this._rankScrollContainer.scale = new Point(rankScale, rankScale);
        }

        const {theme} = MissionClearedPanel;

        this._widthEnforcer.clear();
        this._widthEnforcer.beginFill(0x000000);
        this._widthEnforcer.alpha = 0;
        this._widthEnforcer.drawRect(0, 0, panelWidth - (theme.margin.left * 2), 5);

        this._contentLayout.layout(true);

        Assert.assertIsDefined(Flashbang.stageHeight);
        this.nextButton.display.position = new Point(
            (panelWidth - this.nextButton.container.width) * 0.5,
            Flashbang.stageHeight - 20 - this.nextButton.container.height
        );

        const separatorPos = this.nextButton.display.position.y - theme.separator.separation;
        this._separator.clear();
        this._separator.lineStyle(1, 0x70707080);
        this._separator.moveTo(theme.separator.margin, separatorPos);
        this._separator.lineTo(panelWidth - theme.separator.margin, separatorPos);
    }

    private static calcWidth(): number {
        Assert.assertIsDefined(Flashbang.stageWidth);
        return Math.min(
            Flashbang.stageWidth,
            MathUtil.clamp(Flashbang.stageWidth * 0.4, 400, 500)
        );
    }

    private static calcScrollHeight() {
        Assert.assertIsDefined(Flashbang.stageHeight);
        const {theme} = MissionClearedPanel;
        return Flashbang.stageHeight - (theme.mask.top + theme.mask.bottom);
    }

    private static readonly PADDING_RIGHT = 80;

    private readonly _infoText: string;
    private readonly _moreText: string | null;
    private readonly _hasNextPuzzle: boolean;

    private readonly _bg: Graphics;

    private _contentLayout: VLayoutContainer;
    private _widthEnforcer: Graphics;
    private _infoWrapper: HTMLDivElement;
    private _infoContainer: VLayoutContainer;
    private _infoMask: Graphics;
    private _separator: Graphics;

    // private _tfLoading: Text;

    private _rankScrollHeading: GamePanel;
    private _tfPlayer: Text;
    private _rankScrollContainer: Container;
    private _rankScroll: RankScroll | null = null;

    private _dragging = false;
    private _dragPointData: interaction.InteractionData | null = null;
    private _dragStartPointY = 0;
    private _dragStartBoxY = 0;
}

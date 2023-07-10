import {
    Container, Graphics, Text
} from 'pixi.js';
import {
    ContainerObject, VLayoutContainer, HAlign, DOMObject, AlphaTask,
    Flashbang, DisplayUtil, VAlign, Assert, MathUtil
} from 'flashbang';
import GameButton from 'eterna/ui/GameButton';
import Fonts from 'eterna/util/Fonts';
import HTMLTextObject from 'eterna/ui/HTMLTextObject';
import GamePanel, {GamePanelType} from 'eterna/ui/GamePanel';
import Bitmaps from 'eterna/resources/Bitmaps';
import RankScroll from 'eterna/rank/RankScroll';
import Eterna from 'eterna/Eterna';
import ScrollBox from 'eterna/ui/ScrollBox';
import {SubmitSolutionData} from './PoseEditMode';

export default class MissionClearedPanel extends ContainerObject {
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
        this._contentLayout.position.set(theme.margin.left, theme.margin.top);
        this.container.addChild(this._contentLayout);

        const title = Fonts.std('MISSION ACCOMPLISHED!', 20).bold().color(0xFFCC00).build();
        this._contentLayout.addChild(title);

        this._scrollBox = new ScrollBox(MissionClearedPanel.calcWidth(), MissionClearedPanel.calcScrollHeight());
        this.addObject(this._scrollBox, this._contentLayout);
        this._infoContainer = new VLayoutContainer(25, HAlign.LEFT);
        this._scrollBox.content.addChild(this._infoContainer);

        Assert.assertIsDefined(Flashbang.stageHeight);
        const infoText = MissionClearedPanel.processHTML(this._infoText);
        this._infoObj = new HTMLTextObject(
            infoText,
            panelWidth - MissionClearedPanel.PADDING_RIGHT,
            this._scrollBox.htmlWrapper,
            true
        ).font(Fonts.STDFONT)
            .fontSize(Flashbang.stageHeight < 512 ? 14 : 18)
            .color(0xffffff)
            .lineHeight(1.2)
            .selectable(false);
        this._infoObj.display.name = 'InfoTextObj';
        // Images should be centered, even if the HTML doesn't specify it
        DOMObject.applyStyleRecursive(this._infoObj.element, {display: 'block', margin: 'auto'}, false, ['img']);
        this.addObject(this._infoObj, this._infoContainer);

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
            moreTextObj.display.name = 'MoreTextObj';
            this.addObject(moreTextObj, this._infoContainer);
        }

        this._infoContainer.addVSpacer(30);

        this._rankScrollContainer = new Container();
        this._rankScrollContainer.visible = false;
        this._infoContainer.addChild(this._rankScrollContainer);

        this._rankScrollHeading = new GamePanel({
            type: GamePanelType.NORMAL,
            alpha: 1.0,
            color: 0x2D4159
        });
        this.addObject(this._rankScrollHeading, this._rankScrollContainer);

        this._tfPlayer = Fonts.std('PLAYER', 14).bold().color(0xffffff).build();
        this._tfPlayer.position.set(10, 2);
        this._rankScrollHeading.container.addChild(this._tfPlayer);

        const tfRank: Text = Fonts.std('RANK', 14).bold().color(0xffffff).build();
        tfRank.position.set(10 + 130, 2);
        this._rankScrollHeading.container.addChild(tfRank);

        const tfCoin: Text = Fonts.std('POINTS', 14).bold().color(0xffffff).build();
        tfCoin.position.set(10 + 130 + 85, 2);
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

        this.regs.add(this.mode.resized.connect(() => this.onResize()));
        this.onResize();
    }

    public createRankScroll(submissionRsp: SubmitSolutionData): void {
        if (!RankScroll.hasRankScrollData(submissionRsp) || Eterna.noGame) {
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
    }

    private drawBG(): void {
        this._bg.clear();
        this._bg.beginFill(0x0, 0.8);
        Assert.assertIsDefined(Flashbang.stageHeight);
        this._bg.drawRect(0, 0, MissionClearedPanel.calcWidth(), Flashbang.stageHeight);
        this._bg.endFill();
    }

    private doLayout(): void {
        this._rankScrollContainer.visible = (this._rankScroll != null);
        this.nextButton.display.visible = this._hasNextPuzzle;

        const panelWidth = MissionClearedPanel.calcWidth();

        DisplayUtil.positionRelative(
            this.closeButton.display, HAlign.RIGHT, VAlign.TOP,
            this._bg, HAlign.RIGHT, VAlign.TOP,
            -10, 15
        );

        if (this._rankScroll != null) {
            this._rankScrollHeading.setSize(310, this._tfPlayer.height + 6);
            this._rankScrollHeading.display.position.set(0, 0);
            this._rankScroll.display.position.set(10, 12 + this._tfPlayer.height);

            const rankScale = Math.min(1, panelWidth / (400 + 80));
            this._rankScrollContainer.scale.set(rankScale, rankScale);
        }

        const {theme} = MissionClearedPanel;

        Assert.assertIsDefined(Flashbang.stageHeight);
        this._infoObj.width = panelWidth - MissionClearedPanel.PADDING_RIGHT;

        this._scrollBox.setSize(MissionClearedPanel.calcWidth(), MissionClearedPanel.calcScrollHeight());
        this._contentLayout.layout(true);
        this._infoContainer.layout(true);

        Assert.assertIsDefined(Flashbang.stageHeight);
        this.nextButton.display.position.set(
            (panelWidth - this.nextButton.container.width) * 0.5,
            Flashbang.stageHeight - 20 - this.nextButton.container.height
        );

        const separatorPos = this.nextButton.display.position.y - theme.separator.separation;
        this._separator.clear();
        this._separator.lineStyle(1, 0x70707080);
        this._separator.moveTo(theme.separator.margin, separatorPos);
        this._separator.lineTo(panelWidth - theme.separator.margin, separatorPos);

        Assert.assertIsDefined(Flashbang.stageWidth);
        this.display.position.x = Flashbang.stageWidth - MissionClearedPanel.calcWidth();

        this._scrollBox.doLayout();
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
    private _scrollBox: ScrollBox;
    private _infoContainer: VLayoutContainer;
    private _infoObj: HTMLTextObject;
    private _separator: Graphics;

    private _rankScrollHeading: GamePanel;
    private _tfPlayer: Text;
    private _rankScrollContainer: Container;
    private _rankScroll: RankScroll | null = null;
}

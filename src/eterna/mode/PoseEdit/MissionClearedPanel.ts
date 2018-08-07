import {
    Container, Graphics, Point, Text
} from "pixi.js";
import {Align} from "../../../flashbang/core/Align";
import {Flashbang} from "../../../flashbang/core/Flashbang";
import {VLayoutContainer} from "../../../flashbang/layout/VLayoutContainer";
import {ContainerObject} from "../../../flashbang/objects/ContainerObject";
import {AlphaTask} from "../../../flashbang/tasks/AlphaTask";
import {DisplayUtil} from "../../../flashbang/util/DisplayUtil";
import {RankScroll} from "../../rank/RankScroll";
import {Bitmaps} from "../../resources/Bitmaps";
import {GameButton} from "../../ui/GameButton";
import {GamePanel, GamePanelType} from "../../ui/GamePanel";
import {HTMLTextObject} from "../../ui/HTMLTextObject";
import {Fonts} from "../../util/Fonts";

export class MissionClearedPanel extends ContainerObject {
    public nextButton: GameButton;
    public closeButton: GameButton;

    public constructor(hasNextPuzzle: boolean, infoText: string = null, moreText: string = null) {
        super();

        this._hasNextPuzzle = hasNextPuzzle;
        this._infoText = infoText;
        this._moreText = moreText;

        this._bg = new Graphics();
        this.container.addChild(this._bg);
    }

    protected added(): void {
        super.added();

        // this._tfLoading = Fonts.std_regular("Submitting your design - please wait...", 20).bold().build();
        // this.container.addChild(this._tfLoading);
        // this._tfLoading.set_animator(new GameAnimatorFader(1, 0, 0.3, false, true));
        // this._tfLoading.set_pos(new UDim(0.5, 0.5, -150, 220));
        // this.add_object(this._tfLoading);

        this._contentLayout = new VLayoutContainer(25, Align.CENTER);
        this.container.addChild(this._contentLayout);

        this._contentLayout.addChild(Fonts.std_light("Mission Accomplished!", 36).color(0xFFCC00).build());

        const infoText: string = this._infoText || "You have solved the puzzle, congratulations!";
        const infoObj = new HTMLTextObject(infoText, MissionClearedPanel.WIDTH - 60)
            .color(0xffffff).font(Fonts.STDFONT_REGULAR).fontSize(15)
            .hAlign("left")
            .lineHeight(1.2)
            .selectable(false);
        this.addObject(infoObj, this._contentLayout);

        if (this._moreText != null) {
            this._contentLayout.addChild(Fonts.std_regular(this._moreText, 16).color(0xffffff).hAlignCenter().build());
        }

        this._rankScrollContainer = new Container();
        this._rankScrollContainer.visible = false;
        this._contentLayout.addChild(this._rankScrollContainer);

        this._rankScrollHeading = new GamePanel(GamePanelType.NORMAL, 1.0, 0x2D4159);
        this.addObject(this._rankScrollHeading, this._rankScrollContainer);

        this._tfPlayer = Fonts.std_bold("PLAYER", 14).bold().color(0xffffff).build();
        this._tfPlayer.position = new Point(10, 0);
        this._rankScrollHeading.container.addChild(this._tfPlayer);

        let tfRank: Text = Fonts.std_bold("RANK", 14).bold().color(0xffffff).build();
        tfRank.position = new Point(10 + 130, 0);
        this._rankScrollHeading.container.addChild(tfRank);

        let tfCoin: Text = Fonts.std_bold("POINTS", 14).bold().color(0xffffff).build();
        tfCoin.position = new Point(10 + 130 + 85, 0);
        this._rankScrollHeading.container.addChild(tfCoin);

        this.closeButton = new GameButton()
            .allStates(Bitmaps.ImgCross)
            .tooltip("Stay in this puzzle and review your design");
        this.addObject(this.closeButton, this.container);

        this.nextButton = new GameButton().label(this._hasNextPuzzle ? "NEXT PUZZLE" : "WHAT'S NEXT?");
        this.nextButton.display.position = new Point(
            (MissionClearedPanel.WIDTH * 0.5) - 10 - this.nextButton.container.width,
            Flashbang.stageHeight - 20 - this.nextButton.container.height
        );
        this.addObject(this.nextButton, this.container);

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
            this.closeButton.display, Align.RIGHT, Align.TOP,
            this._bg, Align.RIGHT, Align.TOP,
            -10, 10
        );

        DisplayUtil.positionRelative(
            this.nextButton.display, Align.CENTER, Align.BOTTOM,
            this._bg, Align.CENTER, Align.BOTTOM,
            0, -25
        );

        // this._tfLoading.visible = !this._panel.display.visible;

        if (this._rankScroll != null) {
            this._rankScrollHeading.set_size(310, this._tfPlayer.height);
            this._rankScrollHeading.display.position = new Point(
                ((MissionClearedPanel.WIDTH - this._rankScroll.realWidth) * 0.5) + 10,
                0
            );

            this._rankScroll.display.position = new Point(
                ((MissionClearedPanel.WIDTH - this._rankScroll.realWidth) * 0.5) + 20,
                10 + this._tfPlayer.height
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
    }

    private readonly _infoText: string;
    private readonly _moreText: string;
    private readonly _hasNextPuzzle: boolean;

    private readonly _bg: Graphics;

    private _contentLayout: VLayoutContainer;

    // private _tfLoading: Text;

    private _rankScrollHeading: GamePanel;
    private _tfPlayer: Text;
    private _rankScrollContainer: Container;
    private _rankScroll: RankScroll = null;

    private static readonly WIDTH: number = 480;
}

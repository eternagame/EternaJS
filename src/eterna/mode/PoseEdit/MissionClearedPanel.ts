import {Graphics, Point, Text} from "pixi.js";
import {Align} from "../../../flashbang/core/Align";
import {Flashbang} from "../../../flashbang/core/Flashbang";
import {ContainerObject} from "../../../flashbang/objects/ContainerObject";
import {AlphaTask} from "../../../flashbang/tasks/AlphaTask";
import {DisplayUtil} from "../../../flashbang/util/DisplayUtil";
import {Eterna} from "../../Eterna";
import {EternaURL} from "../../net/EternaURL";
import {RankScroll} from "../../rank/RankScroll";
import {BitmapManager} from "../../resources/BitmapManager";
import {GameButton} from "../../ui/GameButton";
import {GamePanel, GamePanelType} from "../../ui/GamePanel";
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

        this.closeButton = new GameButton()
            .allStates(BitmapManager.ImgCross)
            .tooltip("Stay in this puzzle and review your design");
        this.addObject(this.closeButton, this.container);

        this._panel = new GamePanel(GamePanelType.INVISIBLE);
        this._panel.display.visible = false;
        this.addObject(this._panel, this.container);

        this._title = Fonts.std_light("Mission Accomplished!", 36).color(0xFFCC00).build();
        this.container.addChild(this._title);

        const infoText: string = this._infoText || "You have solved the puzzle, congratulations!";
        this._tfInfo = Fonts.std_regular(infoText, 20).color(0xffffff).hAlignCenter().build();

        this.container.addChild(this._tfInfo);

        this._heading = new GamePanel(GamePanelType.NORMAL, 1.0, 0x2D4159);
        this._panel.addObject(this._heading, this._panel.container);

        this._tfPlayer = Fonts.std_bold("PLAYER", 14).bold().color(0xffffff).build();
        this._tfPlayer.position = new Point(10, 0);
        this._heading.container.addChild(this._tfPlayer);

        let tfRank: Text = Fonts.std_bold("RANK", 14).bold().color(0xffffff).build();
        tfRank.position = new Point(10 + 130, 0);
        this._heading.container.addChild(tfRank);

        let tfCoin: Text = Fonts.std_bold("POINTS", 14).bold().color(0xffffff).build();
        tfCoin.position = new Point(10 + 130 + 85, 0);
        this._heading.container.addChild(tfCoin);

        if (this._moreText != null) {
            this._tfScience = Fonts.std_regular(this._moreText, 16).color(0xffffff).hAlignCenter().build();
            this._panel.container.addChild(this._tfScience);
        }

        this.nextButton = new GameButton().label(this._hasNextPuzzle ? "NEXT PUZZLE" : "WHAT'S NEXT?");
        this.nextButton.display.position = new Point(
            (MissionClearedPanel.WIDTH * 0.5) - 10 - this.nextButton.container.width,
            Flashbang.stageHeight - 20 - this.nextButton.container.height);
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
        this._panel.addObject(this._rankScroll, this._panel.container);
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
        let margin: number = 25;
        let h_walker: number = 0;

        this._panel.display.visible = (this._rankScroll != null);
        this.closeButton.display.visible = this._panel.display.visible;
        this.nextButton.display.visible = this._panel.display.visible;
        // this._tfLoading.visible = !this._panel.display.visible;

        this._title.position = new Point(
            (MissionClearedPanel.WIDTH - this._title.width) * 0.5,
            h_walker);
        h_walker += this._title.height + margin;

        // if (this._rankscroll != null) {
        //     this._tfInfo.set_autosize(false, false, this._rankscroll.width - 2 * margin);
        // }
        this._tfInfo.position = new Point(margin, h_walker);
        h_walker += this._tfInfo.height + margin;

        if (this._tfScience != null) {
            // if (this._rankscroll != null) {
            //     let w: number = this._rankscroll.container.width - 2 * margin;
            //     this._tfScience.set_autosize(false, false, w);
            // }
            this._tfScience.position = new Point(margin, h_walker);
            h_walker += this._tfScience.height + margin;
        }

        if (this._rankScroll != null) {
            h_walker += margin - 15;

            this._heading.set_size(310, this._tfPlayer.height);
            this._heading.display.position = new Point(
                ((MissionClearedPanel.WIDTH - this._rankScroll.realWidth) * 0.5) + 10,
                h_walker);
            h_walker += 10 + this._tfPlayer.height;

            this._rankScroll.display.position = new Point(
                ((MissionClearedPanel.WIDTH - this._rankScroll.realWidth) * 0.5) + 20,
                h_walker);
        }

        if (this._rankScroll != null) {
            this.nextButton.display.position = new Point(
                MissionClearedPanel.WIDTH - (this._rankScroll.container.width * 0.5) - this.nextButton.container.width * 0.5,
                Flashbang.stageHeight - margin - this.nextButton.container.height);
        } else {
            this.nextButton.display.position = new Point(
                MissionClearedPanel.WIDTH - 40 - this.nextButton.container.width * 0.5,
                Flashbang.stageHeight - margin - this.nextButton.container.height);
        }
        h_walker += this.nextButton.container.height;

        if (this._rankScroll != null) {
            this._panel.set_size(this._rankScroll.container.width, h_walker);
            this._panel.display.position = new Point(
                MissionClearedPanel.WIDTH - this._rankScroll.container.width,
                (Flashbang.stageHeight - h_walker) * 0.5);
        }

        DisplayUtil.positionRelative(
            this.closeButton.display, Align.RIGHT, Align.TOP,
            this._bg, Align.RIGHT, Align.TOP,
            -10, 10);
    }

    private static go_to_feed(): void {
        let url: string = Eterna.player_id == 0 ?
            EternaURL.generate_url({"page": "register"}) :
            EternaURL.generate_url({"page": "me"});
        window.open(url, "_self");
    }

    private readonly _infoText: string;
    private readonly _moreText: string;
    private readonly _hasNextPuzzle: boolean;

    private readonly _bg: Graphics;

    private _panel: GamePanel;

    // private _tfLoading: Text;
    private _title: Text;
    private _tfInfo: Text;
    private _tfScience: Text;

    private _heading: GamePanel;
    private _tfPlayer: Text;
    private _rankScroll: RankScroll = null;

    private static readonly WIDTH: number = 470;
}

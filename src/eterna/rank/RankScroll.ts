import {Graphics, Point, Text} from "pixi.js";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {AlphaTask} from "../../flashbang/tasks/AlphaTask";
import {DelayTask} from "../../flashbang/tasks/DelayTask";
import {InterpolatingTask} from "../../flashbang/tasks/InterpolatingTask";
import {LocationTask} from "../../flashbang/tasks/LocationTask";
import {ParallelTask} from "../../flashbang/tasks/ParallelTask";
import {SerialTask} from "../../flashbang/tasks/SerialTask";
import {VisibleTask} from "../../flashbang/tasks/VisibleTask";
import {Easing, EasingFunc} from "../../flashbang/util/Easing";
import {Eterna} from "../Eterna";
import {GamePanel} from "../ui/GamePanel";
import {Fonts} from "../util/Fonts";
import {VibrateTask} from "../vfx/VibrateTask";
import {PlayerRank} from "./PlayerRank";
import {RankBoard} from "./RankBoard";
import {RankRowLayout} from "./RankRowLayout";

export class RankScroll extends ContainerObject {
    public static hasRankScrollData(submissionRsp: any): boolean {
        return (submissionRsp["pointsrank-before"] != null && submissionRsp["pointsrank-after"] != null);
    }

    /** Creates a RankScroll object with data returned from the submit-solution server response */
    public static fromSubmissionResponse(submissionRsp: any): RankScroll {
        if (!RankScroll.hasRankScrollData(submissionRsp)) {
            throw new Error("No RankScroll data in submission response");
        }

        let pointsrank_before: any = submissionRsp["pointsrank-before"];
        let pointsrank_after: any = submissionRsp["pointsrank-after"];
        let player: PlayerRank;
        let ranks: PlayerRank[] = [];
        let prevRank: number = pointsrank_before["rank"];
        let newRank: number = pointsrank_after["rank"];
        let prevPoints: number = pointsrank_before["points"];
        let newPoints: number = pointsrank_after["points"];
        let prevRicher: any[] = pointsrank_before["richer"];
        let prevPoorer: any[] = pointsrank_before["poorer"];
        let newRicher: any[] = pointsrank_after["richer"];
        let newPoorer: any[] = pointsrank_after["poorer"];

        // / Don't even need to move
        if (prevPoints >= newPoints || prevRank <= newRank) {
            for (let ii = 0; ii < newRicher.length; ii++) {
                let rank = new PlayerRank(newRicher[ii]["name"], newRicher[ii]["points"]);
                rank.rank = newRicher[ii]["rank"];
                ranks.push(rank);
            }

            for (let ii = 0; ii < newPoorer.length; ii++) {
                let rank = new PlayerRank(newPoorer[ii]["name"], newPoorer[ii]["points"]);
                rank.rank = newPoorer[ii]["rank"];
                ranks.push(rank);
            }

            let playername = Eterna.player_name || "You";
            player = new PlayerRank(playername, prevPoints);
            player.rank = newRank;
        } else {
            let last_after_entry_uid: number = -1;
            for (let ii = 0; ii < newRicher.length; ii++) {
                let rank = new PlayerRank(newRicher[ii]["name"], newRicher[ii]["points"]);
                rank.rank = newRicher[ii]["rank"];
                ranks.push(rank);
                last_after_entry_uid = newRicher[ii]["uid"];
            }

            for (let ii = 0; ii < newPoorer.length; ii++) {
                let rank = new PlayerRank(newPoorer[ii]["name"], newPoorer[ii]["points"]);
                rank.rank = newPoorer[ii]["rank"];
                ranks.push(rank);
                last_after_entry_uid = newPoorer[ii]["uid"];
            }

            let common_entry: boolean = false;
            let common_index: number = 0;
            for (let ii = 0; ii < prevRicher.length; ii++) {
                if (prevRicher[ii]["uid"] === last_after_entry_uid) {
                    common_entry = true;
                    common_index = ii;
                    break;
                }
            }

            if (!common_entry) {
                for (let ii = 0; ii < prevPoorer.length; ii++) {
                    if (prevPoorer[ii]["uid"] === last_after_entry_uid) {
                        common_entry = true;
                        common_index = -ii;
                        break;
                    }
                }
            }

            if (!common_entry || common_index >= 0) {
                for (let ii = common_index; ii < prevRicher.length; ii++) {
                    let rank = new PlayerRank(prevRicher[ii]["name"], prevRicher[ii]["points"]);
                    rank.rank = prevRicher[ii]["rank"];
                    ranks.push(rank);
                }
            }

            if (!common_entry || common_index >= 0) {
                common_index = 0;
            }

            for (let ii = -common_index; ii < prevPoorer.length; ii++) {
                let rank = new PlayerRank(prevPoorer[ii]["name"], prevPoorer[ii]["points"]);
                rank.rank = prevPoorer[ii]["rank"];
                ranks.push(rank);
            }

            let playername = Eterna.player_name || "You";
            player = new PlayerRank(playername, prevPoints);
            player.rank = prevRank;
        }

        return new RankScroll(ranks, player, newPoints, newRank);
    }

    public constructor(allRanks: PlayerRank[], playerRank: PlayerRank, newScore: number, newRank: number) {
        super();
        this._allRanks = allRanks;
        this._playerRank = playerRank;
        this._newScore = newScore;
        this._newRank = newRank;
    }

    protected added(): void {
        super.added();

        // How many rows other than player's will show for each top/bottom side
        const size_indicator: number = 1;

        let startScore: number = this._playerRank.score;
        let startRank: number = this._playerRank.rank;

        let topStartingIdx: number = 0;
        let bottomStartingIdx: number = 0;
        let startingSet: boolean = false;
        let endIdx: number = 0;

        for (let ii = 0; ii < this._allRanks.length; ii++) {
            if (this._allRanks[ii].score <= this._newScore) {
                topStartingIdx = ii - size_indicator;
                bottomStartingIdx = ii;
                endIdx = ii;
                startingSet = true;
                break;
            }
        }

        if (!startingSet) {
            topStartingIdx = (this._allRanks.length - size_indicator);
            bottomStartingIdx = this._allRanks.length;
            endIdx = this._allRanks.length;
        }

        let top_ending_index: number = 0;
        let bottom_ending_index: number = 0;
        let ending_set: boolean = false;
        let startIdx: number = 0;
        for (let ii = 0; ii < this._allRanks.length; ii++) {
            if (this._allRanks[ii].score <= startScore) {
                top_ending_index = ii - 1;
                bottom_ending_index = ii - 1 + size_indicator;
                ending_set = true;
                startIdx = ii;
                break;
            }
        }

        if (!ending_set) {
            top_ending_index = this._allRanks.length - 1;
            bottom_ending_index = this._allRanks.length - 1 + size_indicator;
            startIdx = this._allRanks.length;
        }

        // Player's rank before/after score change (* RANK, not INDEX)
        this._scrollAnimDuration = 0.2;
        if (startIdx - endIdx < 5) {
            this._scrollAnimDuration *= 5;
        } else if (startIdx - endIdx > 30) {
            this._scrollAnimDuration *= 20;
        } else {
            this._scrollAnimDuration *= startIdx - endIdx;
        }

        this._rankOffset = startRank - this._newRank;
        this._scoreOffset = this._newScore - startScore;
        this._moveOffset = startIdx - endIdx;

        let max_width: number = 85;

        // Make rank data coming down from top (of player)
        let rank_data_top: PlayerRank[] = [];

        for (let ii = topStartingIdx; ii <= top_ending_index; ii++) {
            if (ii < 0) {
                const dummyrank = new PlayerRank("", -1);
                dummyrank.rank = -1;
                rank_data_top.push(dummyrank);
            } else {
                rank_data_top.push(this._allRanks[ii]);
            }
        }

        // Make rank data coming out of bottom (of player)
        let rank_data_bottom: any[] = [];
        for (let ii = bottomStartingIdx; ii <= bottom_ending_index; ii++) {
            if (ii < this._allRanks.length) {
                let clone: PlayerRank = this._allRanks[ii].clone();
                rank_data_bottom.push(clone);
            } else {
                const dummyrank = new PlayerRank("", -1);
                dummyrank.rank = -1;
                rank_data_bottom.push(dummyrank);
            }
        }

        let bg: GamePanel = new GamePanel(0, 0.9, 0x152843);
        bg.set_size(310, 88);
        bg.display.position = new Point(-10, -10);
        this.addObject(bg, this.container);

        // Set up rankboard according to above infos
        this._rankBoardTop = new RankBoard(topStartingIdx + 1, rank_data_top.reverse(), max_width);
        let mask_top: Graphics = new Graphics();
        mask_top.beginFill(0x00FF00, 0);
        mask_top.drawRect(0, 0, RankBoard.ROW_WIDTH, size_indicator * RankBoard.ROW_HEIGHT);
        this.container.addChild(mask_top);
        this._rankBoardTop.display.mask = mask_top;
        this._rankBoardTop.display.position = new Point(0, -((rank_data_top.length - size_indicator) * RankBoard.ROW_HEIGHT));
        this._rankBoardTop.register_starting_pos();
        this.addObject(this._rankBoardTop, this.container);

        this._rankBoardBottom = new RankBoard(this._newRank + 1, rank_data_bottom.reverse(), max_width);

        let mask_bottom: Graphics = new Graphics();
        mask_bottom.beginFill(0x00FF00, 0);
        mask_bottom.drawRect(0, size_indicator * RankBoard.ROW_HEIGHT + RankBoard.PLAYER_ROW_HEIGHT, RankBoard.ROW_WIDTH, size_indicator * RankBoard.ROW_HEIGHT);
        this.container.addChild(mask_bottom);
        this._rankBoardBottom.display.mask = mask_bottom;

        this._rankBoardBottom.display.position = new Point(0,
            (size_indicator * RankBoard.ROW_HEIGHT) + RankBoard.PLAYER_ROW_HEIGHT
            - (this._moveOffset * RankBoard.ROW_HEIGHT));
        this._rankBoardBottom.register_starting_pos();
        this.addObject(this._rankBoardBottom, this.container);

        // Set current player's row as center position
        this._playerRow = new RankRowLayout(startRank, this._playerRank, max_width, 20, 100, 0xEBA800);
        // this._player_row.set_size(new UDim(0, 0, RankBoard.ROW_WIDTH, RankBoard.PLAYER_ROW_HEIGHT));
        this._playerRow.display.position = new Point(0, size_indicator * RankBoard.ROW_HEIGHT);
        this.addObject(this._playerRow, this.container);

        this._tfRankOffset = Fonts.std_regular(`+${this._rankOffset}`, 20).color(0xffffff).bold().build();
        this._tfRankOffset.position = new Point(-this._tfRankOffset.width - 10, size_indicator * RankBoard.ROW_HEIGHT);
        this._tfRankOffset.visible = true;
        this.container.addChild(this._tfRankOffset);
    }

    public animate(): void {
        // Scroll the rank board
        if (this._moveOffset > 0) {
            this._rankBoardTop.addObject(new LocationTask(
                0, this._rankBoardTop.display.y + this._moveOffset * RankBoard.ROW_HEIGHT,
                this._scrollAnimDuration,
                Easing.easeIn
            ));

            this._rankBoardBottom.addObject(new LocationTask(
                0, this._rankBoardBottom.display.y + this._moveOffset * RankBoard.ROW_HEIGHT,
                this._scrollAnimDuration,
                Easing.easeIn
            ));
        }

        if (this._scoreOffset > 0) {
            this._playerRow.addObject(new SerialTask(
                new RankScoreTask(this._newRank, this._newScore, this._scrollAnimDuration, Easing.easeIn),
                new VibrateTask(1)
            ));
        }

        // After, show our rank offset
        if (this._rankOffset > 0) {
            const RANK_ANIM_DURATION: number = 2;

            this.addObject(new SerialTask(
                new DelayTask(this._scrollAnimDuration + 1),
                new VisibleTask(true, this._tfRankOffset),
                new ParallelTask(
                    new LocationTask(
                        this._tfRankOffset.x, this._tfRankOffset.y - 10,
                        RANK_ANIM_DURATION,
                        Easing.linear,
                        this._tfRankOffset
                    ),
                    new AlphaTask(0, RANK_ANIM_DURATION, Easing.easeIn, this._tfRankOffset)
                ),
                new VisibleTask(false, this._tfRankOffset),
            ));
        }
    }

    /** Necessary width, which excludes +N sign */
    public get realWidth(): number {
        let rankOffsetVisible = this._tfRankOffset.visible;
        this._tfRankOffset.visible = false;
        let width = this.container.width;
        this._tfRankOffset.visible = rankOffsetVisible;

        return width + 100;
    }

    private readonly _allRanks: PlayerRank[];
    private readonly _playerRank: PlayerRank;
    private readonly _newScore: number;
    private readonly _newRank: number;


    private _rankOffset: number;
    private _scoreOffset: number;
    private _moveOffset: number;

    private _rankBoardTop: RankBoard;
    private _rankBoardBottom: RankBoard;

    private _playerRow: RankRowLayout;
    private _tfRankOffset: Text;

    private _scrollAnimDuration: number;
}

class RankScoreTask extends InterpolatingTask {
    public constructor(newRank: number, newScore: number, duration: number, easing: EasingFunc) {
        super(duration, easing);
        this._newRank = newRank;
        this._newScore = newScore;
    }

    protected added(): void {
        super.added();
        this._target = this.parent as RankRowLayout;
    }

    protected updateValues(): void {
        if (this._startScore < 0) {
            this._startRank = this._target.rank;
            this._startScore = this._target.score;
        }

        this._target.setRank(Math.floor(this.interpolate(this._startRank, this._newRank)));
        this._target.setScore(Math.floor(this.interpolate(this._startScore, this._newScore)));
    }

    private readonly _newRank: number;
    private readonly _newScore: number;
    private _startRank: number = -1;
    private _startScore: number = -1;
    private _target: RankRowLayout;
}

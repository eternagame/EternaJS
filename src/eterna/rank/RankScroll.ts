import {Graphics, Point, Text} from "pixi.js";
import {Updatable} from "../../flashbang/core/Updatable";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {AlphaTask} from "../../flashbang/tasks/AlphaTask";
import {InterpolatingTask} from "../../flashbang/tasks/InterpolatingTask";
import {LocationTask} from "../../flashbang/tasks/LocationTask";
import {ParallelTask} from "../../flashbang/tasks/ParallelTask";
import {SerialTask} from "../../flashbang/tasks/SerialTask";
import {VisibleTask} from "../../flashbang/tasks/VisibleTask";
import {Easing, EasingFunc} from "../../flashbang/util/Easing";
import {GamePanel} from "../ui/GamePanel";
import {Fonts} from "../util/Fonts";
import {VibrateTask} from "../vfx/VibrateTask";
import {PlayerRank} from "./PlayerRank";
import {RankBoard} from "./RankBoard";
import {RankRowLayout} from "./RankRowLayout";

export class RankScroll extends ContainerObject implements Updatable {
    public constructor(rank_data: PlayerRank[], playerRank: PlayerRank, newScore: number, newRank: number) {
        super();

        // How many rows other than player's will show for each top/bottom side
        const size_indicator: number = 1;

        let startScore: number = playerRank.score;
        let startRank: number = playerRank.rank;

        let top_starting_index: number = 0;
        let bottom_starting_index: number = 0;
        let starting_set: boolean = false;
        let endIdx: number = 0;

        for (let ii = 0; ii < rank_data.length; ii++) {
            if (rank_data[ii].score <= newScore) {
                top_starting_index = ii - size_indicator;
                bottom_starting_index = ii;
                endIdx = ii;
                starting_set = true;
                break;
            }
        }

        if (!starting_set) {
            top_starting_index = (rank_data.length - size_indicator);
            bottom_starting_index = rank_data.length;
            endIdx = rank_data.length;
        }

        let top_ending_index: number = 0;
        let bottom_ending_index: number = 0;
        let ending_set: boolean = false;
        let startIdx: number = 0;
        for (let ii = 0; ii < rank_data.length; ii++) {
            if (rank_data[ii].score <= startScore) {
                top_ending_index = ii - 1;
                bottom_ending_index = ii - 1 + size_indicator;
                ending_set = true;
                startIdx = ii;
                break;
            }
        }

        if (!ending_set) {
            top_ending_index = rank_data.length - 1;
            bottom_ending_index = rank_data.length - 1 + size_indicator;
            startIdx = rank_data.length;
        }

        // Player's rank before/after score change (* RANK, not INDEX)
        let duration: number = 0.2;

        if (startIdx - endIdx < 5) {
            duration *= 5
        } else if (startIdx - endIdx > 30) {
            duration *= 20
        } else {
            duration *= startIdx - endIdx;
        }

        this._rankOffset = startRank - newRank;
        this._scoreOffset = newScore - startScore;
        this._moveOffset = startIdx - endIdx;

        let max_width: number = 85;

        // Make rank data coming down from top (of player)
        let rank_data_top: PlayerRank[] = [];

        for (let ii = top_starting_index; ii <= top_ending_index; ii++) {
            if (ii < 0) {
                const dummyrank = new PlayerRank("", -1);
                dummyrank.rank = -1;
                rank_data_top.push(dummyrank);
            } else {
                rank_data_top.push(rank_data[ii]);
            }
        }

        // Make rank data coming out of bottom (of player)
        let rank_data_bottom: any[] = [];
        for (let ii = bottom_starting_index; ii <= bottom_ending_index; ii++) {
            if (ii < rank_data.length) {
                let clone: PlayerRank = rank_data[ii].clone();
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
        this._rankBoardTop = new RankBoard(top_starting_index + 1, rank_data_top.reverse(), max_width);
        let mask_top: Graphics = new Graphics();
        mask_top.beginFill(0x00FF00, 0);
        mask_top.drawRect(0, 0, RankBoard.ROW_WIDTH, size_indicator * RankBoard.ROW_HEIGHT);
        this.container.addChild(mask_top);
        this._rankBoardTop.display.mask = mask_top;
        this._rankBoardTop.display.position = new Point(0, -((rank_data_top.length - size_indicator) * RankBoard.ROW_HEIGHT));
        this._rankBoardTop.register_starting_pos();
        this.addObject(this._rankBoardTop, this.container);

        this._rankBoardBottom = new RankBoard(newRank + 1, rank_data_bottom.reverse(), max_width);

        let mask_bottom: Graphics = new Graphics();
        mask_bottom.beginFill(0x00FF00, 0);
        mask_bottom.drawRect(0, size_indicator * RankBoard.ROW_HEIGHT + RankBoard.PLAYER_ROW_HEIGHT, RankBoard.ROW_WIDTH, size_indicator * RankBoard.ROW_HEIGHT);
        this.container.addChild(mask_bottom);
        this._rankBoardBottom.display.mask = mask_bottom;

        this._rankBoardBottom.display.position = new Point(0,
            (size_indicator * RankBoard.ROW_HEIGHT) + RankBoard.PLAYER_ROW_HEIGHT -
            (this._moveOffset * RankBoard.ROW_HEIGHT));
        this._rankBoardBottom.register_starting_pos();
        this.addObject(this._rankBoardBottom, this.container);

        // Set current player's row as center position
        this._player_row = new RankRowLayout(startRank, playerRank, max_width, 20, 100, 0xEBA800);
        // this._player_row.set_size(new UDim(0, 0, RankBoard.ROW_WIDTH, RankBoard.PLAYER_ROW_HEIGHT));
        this._player_row.display.position = new Point(0, size_indicator * RankBoard.ROW_HEIGHT);
        this.addObject(this._player_row, this.container);

        let pseudo_data: PlayerRank = playerRank;
        pseudo_data.score = newScore;

        let pseudo_player_row: RankRowLayout = new RankRowLayout(startRank, pseudo_data, max_width, 32, 255, 0xEBA800);
        // pseudo_player_row.set_size(new UDim(0, 0, RankBoard.ROW_WIDTH, RankBoard.PLAYER_ROW_HEIGHT));

        this._realWidth = Math.max(pseudo_player_row.container.width, this._player_row.container.width);
        this._realWidth = Math.max(this._realWidth, this._rankBoardBottom.container.width);
        this._realWidth = Math.max(this._realWidth, this._rankBoardTop.container.width);

        this._tfRankOffset = Fonts.std_regular("+" + this._rankOffset, 20).bold().build();
        this._tfRankOffset.position = new Point(-this._tfRankOffset.width - 10, size_indicator * RankBoard.ROW_HEIGHT);
        this._tfRankOffset.visible = true;
        this.container.addChild(this._tfRankOffset);

        this._newRank = newRank;

        // Total duration of animation
        this._start_time = -2;
        this._newScore = newScore;

        this._animDurations = [duration, 2];
        this._animStartTimes = [1];

        for (let ii = 0; ii < this._animDurations.length; ii++) {
            this._animStartTimes.push(this._animStartTimes[ii] + this._animDurations[ii]);
        }

        this._animStartTimes[1] += 1;
    }

    /** Execute scrolling animation of rank board - move rankboard down */
    public execute_animation(): void {
        this._start_time = -1;
    }

    /** Scroll rows in back */
    private execute_first_step(): void {
        if (this._moveOffset > 0) {
            this._rankBoardTop.addObject(new LocationTask(
                0, this._rankBoardTop.display.y + this._moveOffset * RankBoard.ROW_HEIGHT,
                this._animDurations[0],
                Easing.easeIn));

            this._rankBoardBottom.addObject(new LocationTask(
                0, this._rankBoardBottom.display.y + this._moveOffset * RankBoard.ROW_HEIGHT,
                this._animDurations[0],
                Easing.easeIn));
        }

        if (this._scoreOffset > 0) {
            this._player_row.addObject(new SerialTask(
                new RankScoreTask(this._newRank, this._newScore, this._animDurations[0], Easing.easeIn),
                new VibrateTask(1)
            ));
        }
    }

    /** Then, show rank offset */
    private execute_second_step(): void {
        if (this._rankOffset > 0) {
            this._tfRankOffset.visible = true;
            this.addObject(new SerialTask(
                new ParallelTask(
                    new LocationTask(
                        this._tfRankOffset.x, this._tfRankOffset.y - 10,
                        this._animDurations[1],
                        Easing.linear,
                        this._tfRankOffset),
                    new AlphaTask(0, this._animDurations[1], Easing.easeIn, this._tfRankOffset)
                ),
                new VisibleTask(false, this._tfRankOffset)
            ));
        }
    }

    /** Necessary width, which excludes +N sign */
    public get_real_width(): number {
        // Assumption: rank_offset.x < 0
        return this._realWidth;
    }

    public update(dt: number): void {
        // Not yet
        if (this._start_time == -2) {
            return;
        }

        // Initialize all other start times
        if (this._start_time == -1) {
            this._start_time = this.mode.time;

            for (let ii: number = 0; ii < this._animStartTimes.length; ii++) {
                this._animStartTimes[ii] += this._start_time;
            }
        }

        if (this._animStartTimes[0] != -1 && this.mode.time >= this._animStartTimes[0]) {
            this._animStartTimes[0] = -1;
            this.execute_first_step();
        } else if (this._animStartTimes[1] != -1 && this.mode.time >= this._animStartTimes[1]) {
            this._animStartTimes[1] = -1;
            this.execute_second_step();
        }
    }

    private readonly _rankOffset: number;
    private readonly _scoreOffset: number;
    private readonly _moveOffset: number;

    private readonly _rankBoardTop: RankBoard;
    private readonly _rankBoardBottom: RankBoard;

    private readonly _player_row: RankRowLayout;
    private readonly _newRank: number;
    private readonly _newScore: number;

    private readonly _tfRankOffset: Text;
    private readonly _realWidth: number;

    private _start_time: number;
    private readonly _animStartTimes: number[];
    private readonly _animDurations: number[];
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

        this._target.setRank(this.interpolate(this._startRank, this._newRank));
        this._target.setScore(this.interpolate(this._startScore, this._newScore));
    }

    private readonly _newRank: number;
    private readonly _newScore: number;
    private _startRank: number = -1;
    private _startScore: number = -1;
    private _target: RankRowLayout;
}

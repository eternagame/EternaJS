import {
    Graphics, Rectangle, Sprite
} from 'pixi.js';
import {
    ContainerObject, LocationTask, Easing, SerialTask, VisibleTask, DelayTask,
    ParallelTask, AlphaTask, InterpolatingTask, EasingFunc
} from 'flashbang';
import Eterna from 'eterna/Eterna';
import GamePanel from 'eterna/ui/GamePanel';
import Fonts from 'eterna/util/Fonts';
import VibrateTask from 'eterna/vfx/VibrateTask';
import BitmapManager from 'eterna/resources/BitmapManager';
import Bitmaps from 'eterna/resources/Bitmaps';
import {SubmitSolutionData} from 'eterna/mode/PoseEdit/PoseEditMode';
import RankRowLayout from './RankRowLayout';
import RankBoard from './RankBoard';
import PlayerRank from './PlayerRank';

export interface RankScrollData {
    points: number;
    rank: number;
    richer: PlayerRankData[];
    poorer: PlayerRankData[];
}

interface PlayerRankData {
    name: string;
    points: number | string;
    rank: number;
    uid: number;
}

export default class RankScroll extends ContainerObject {
    public static hasRankScrollData(submissionRsp: SubmitSolutionData): boolean {
        return (submissionRsp['pointsrank-before'] != null && submissionRsp['pointsrank-after'] != null);
    }

    /** Creates a RankScroll object with data returned from the submit-solution server response */
    public static fromSubmissionResponse(submissionRsp: SubmitSolutionData): RankScroll {
        if (!RankScroll.hasRankScrollData(submissionRsp)) {
            throw new Error('No RankScroll data in submission response');
        }

        const pointsrankBefore: RankScrollData = submissionRsp['pointsrank-before'] as RankScrollData;
        const pointsrankAfter: RankScrollData = submissionRsp['pointsrank-after'] as RankScrollData;
        let player: PlayerRank;
        const ranks: PlayerRank[] = [];
        const prevRank: number = pointsrankBefore['rank'];
        const newRank: number = pointsrankAfter['rank'];
        const prevPoints: number = pointsrankBefore['points'];
        const newPoints: number = pointsrankAfter['points'];
        const prevRicher: PlayerRankData[] = pointsrankBefore['richer'];
        const prevPoorer: PlayerRankData[] = pointsrankBefore['poorer'];
        const newRicher: PlayerRankData[] = pointsrankAfter['richer'];
        const newPoorer: PlayerRankData[] = pointsrankAfter['poorer'];

        // / Don't even need to move
        if (prevPoints >= newPoints || prevRank <= newRank) {
            for (const newRich of newRicher) {
                const rank = new PlayerRank(newRich['name'], newRich['points']);
                rank.rank = newRich['rank'];
                ranks.push(rank);
            }

            for (const newPoor of newPoorer) {
                const rank = new PlayerRank(newPoor['name'], newPoor['points']);
                rank.rank = newPoor['rank'];
                ranks.push(rank);
            }

            const playername = Eterna.playerName || 'You';
            player = new PlayerRank(playername, prevPoints);
            player.rank = newRank;
        } else {
            let lastAfterEntryUID = -1;
            for (const newRich of newRicher) {
                const rank = new PlayerRank(newRich['name'], newRich['points']);
                rank.rank = newRich['rank'];
                ranks.push(rank);
                lastAfterEntryUID = newRich['uid'];
            }

            for (const newPoor of newPoorer) {
                const rank = new PlayerRank(newPoor['name'], newPoor['points']);
                rank.rank = newPoor['rank'];
                ranks.push(rank);
                lastAfterEntryUID = newPoor['uid'];
            }

            let commonEntry = false;
            let commonIndex = 0;
            for (let ii = 0; ii < prevRicher.length; ii++) {
                if (prevRicher[ii]['uid'] === lastAfterEntryUID) {
                    commonEntry = true;
                    commonIndex = ii;
                    break;
                }
            }

            if (!commonEntry) {
                for (let ii = 0; ii < prevPoorer.length; ii++) {
                    if (prevPoorer[ii]['uid'] === lastAfterEntryUID) {
                        commonEntry = true;
                        commonIndex = -ii;
                        break;
                    }
                }
            }

            if (!commonEntry || commonIndex >= 0) {
                for (const prevRich of prevRicher) {
                    const rank = new PlayerRank(prevRich['name'], prevRich['points']);
                    rank.rank = prevRich['rank'];
                    ranks.push(rank);
                }
            }

            if (!commonEntry || commonIndex >= 0) {
                commonIndex = 0;
            }

            for (let ii = -commonIndex; ii < prevPoorer.length; ii++) {
                const rank = new PlayerRank(prevPoorer[ii]['name'], prevPoorer[ii]['points']);
                rank.rank = prevPoorer[ii]['rank'];
                ranks.push(rank);
            }

            const playername = Eterna.playerName || 'You';
            player = new PlayerRank(playername, prevPoints);
            player.rank = prevRank;
        }

        return new RankScroll(ranks, player, newPoints, newRank);
    }

    constructor(allRanks: PlayerRank[], playerRank: PlayerRank, newScore: number, newRank: number) {
        super();
        this._allRanks = allRanks;
        this._playerRank = playerRank;
        this._newScore = newScore;
        this._newRank = newRank;
    }

    protected added(): void {
        super.added();

        // How many rows other than player's will show for each top/bottom side
        const sizeIndicator = 1;

        const startScore: number = this._playerRank.score;
        const startRank: number = this._playerRank.rank;

        let topStartingIdx = 0;
        let bottomStartingIdx = 0;
        let startingSet = false;
        let endIdx = 0;

        for (let ii = 0; ii < this._allRanks.length; ii++) {
            if (this._allRanks[ii].score <= this._newScore) {
                topStartingIdx = ii - sizeIndicator;
                bottomStartingIdx = ii;
                endIdx = ii;
                startingSet = true;
                break;
            }
        }

        if (!startingSet) {
            topStartingIdx = (this._allRanks.length - sizeIndicator);
            bottomStartingIdx = this._allRanks.length;
            endIdx = this._allRanks.length;
        }

        let topEndingIndex = 0;
        let bottomEndingIndex = 0;
        let endingSet = false;
        let startIdx = 0;
        for (let ii = 0; ii < this._allRanks.length; ii++) {
            if (this._allRanks[ii].score <= startScore) {
                topEndingIndex = ii - 1;
                bottomEndingIndex = ii - 1 + sizeIndicator;
                endingSet = true;
                startIdx = ii;
                break;
            }
        }

        if (!endingSet) {
            topEndingIndex = this._allRanks.length - 1;
            bottomEndingIndex = this._allRanks.length - 1 + sizeIndicator;
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

        const maxWidth = 85;

        // Make rank data coming down from top (of player)
        const rankDataTop: PlayerRank[] = [];

        for (let ii = topStartingIdx; ii <= topEndingIndex; ii++) {
            if (ii < 0) {
                const dummyrank = new PlayerRank('', -1);
                dummyrank.rank = -1;
                rankDataTop.push(dummyrank);
            } else {
                rankDataTop.push(this._allRanks[ii]);
            }
        }

        // Make rank data coming out of bottom (of player)
        const rankDataBottom: PlayerRank[] = [];
        for (let ii = bottomStartingIdx; ii <= bottomEndingIndex; ii++) {
            if (ii < this._allRanks.length) {
                const clone: PlayerRank = this._allRanks[ii].clone();
                rankDataBottom.push(clone);
            } else {
                const dummyrank = new PlayerRank('', -1);
                dummyrank.rank = -1;
                rankDataBottom.push(dummyrank);
            }
        }

        const bg = new GamePanel({
            alpha: 0.9,
            color: 0x152843
        });
        bg.setSize(310, 88);
        bg.display.position.set(-10, -10);
        this.addObject(bg, this.container);

        // Set up rankboard according to above infos
        this._rankBoardTop = new RankBoard(topStartingIdx + 1, rankDataTop.reverse(), maxWidth);
        const maskTop: Graphics = new Graphics();
        maskTop.beginFill(0x00FF00);
        maskTop.drawRect(0, 0, RankBoard.ROW_WIDTH, sizeIndicator * RankBoard.ROW_HEIGHT);
        this.container.addChild(maskTop);
        maskTop.hitArea = new Rectangle();
        this._rankBoardTop.display.mask = maskTop;
        this._rankBoardTop.display.position.set(
            0, -((rankDataTop.length - sizeIndicator) * RankBoard.ROW_HEIGHT)
        );
        this._rankBoardTop.registerStartingPos();
        this.addObject(this._rankBoardTop, this.container);

        this._rankBoardBottom = new RankBoard(this._newRank + 1, rankDataBottom.reverse(), maxWidth);

        const maskBottom: Graphics = new Graphics();
        maskBottom.beginFill(0x00FF00);
        maskBottom.drawRect(
            0, sizeIndicator * RankBoard.ROW_HEIGHT + RankBoard.PLAYER_ROW_HEIGHT,
            RankBoard.ROW_WIDTH, sizeIndicator * RankBoard.ROW_HEIGHT
        );
        this.container.addChild(maskBottom);
        maskBottom.hitArea = new Rectangle();
        this._rankBoardBottom.display.mask = maskBottom;

        this._rankBoardBottom.display.position.set(0,
            (sizeIndicator * RankBoard.ROW_HEIGHT) + RankBoard.PLAYER_ROW_HEIGHT
            - (this._moveOffset * RankBoard.ROW_HEIGHT));
        this._rankBoardBottom.registerStartingPos();
        this.addObject(this._rankBoardBottom, this.container);

        // Set current player's row as center position
        this._playerRow = new RankRowLayout(startRank, this._playerRank, maxWidth, 20, 100, 0xEBA800);
        this._playerRow.display.position.set(0, sizeIndicator * RankBoard.ROW_HEIGHT + 4);
        this.addObject(this._playerRow, this.container);

        this._tfRankOffset = new Sprite(BitmapManager.getBitmap(Bitmaps.ImgRankBubble));
        const rankText = Fonts.std(`+${this._rankOffset}`, 20).color(0).bold().build();
        rankText.position.set(
            (this._tfRankOffset.width - rankText.width) / 2,
            (this._tfRankOffset.height - rankText.height) / 2
        );
        this._tfRankOffset.addChild(rankText);
        this._tfRankOffset.position.set(
            -this._tfRankOffset.width - 2, sizeIndicator * RankBoard.ROW_HEIGHT - 12
        );
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
            const RANK_ANIM_DURATION = 2;

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
                new VisibleTask(false, this._tfRankOffset)
            ));
        }
    }

    /** Necessary width, which excludes +N sign */
    public get realWidth(): number {
        return this.container.width - this._tfRankOffset.width;
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
    private _tfRankOffset: Sprite;

    private _scrollAnimDuration: number;
}

class RankScoreTask extends InterpolatingTask {
    constructor(newRank: number, newScore: number, duration: number, easing: EasingFunc) {
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
    private _startRank = -1;
    private _startScore = -1;
    private _target: RankRowLayout;
}

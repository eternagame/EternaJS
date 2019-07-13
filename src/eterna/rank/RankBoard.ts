import {Point} from 'pixi.js';
import {ContainerObject, Updatable} from 'flashbang';
import PlayerRank from './PlayerRank';
import RankRowLayout from './RankRowLayout';

export default class RankBoard extends ContainerObject implements Updatable {
    public static readonly ROW_WIDTH = 400;
    public static readonly ROW_HEIGHT = 20;
    public static readonly PLAYER_ROW_HEIGHT = 32;

    constructor(startingRank: number, rankData: PlayerRank[], offsetBtwRankCoin: number) {
        super();
        this._rankData = rankData;
        this._startingPosition = 0;

        let numRows = RankBoard.NUM_VISIBLE;
        if (rankData.length < RankBoard.NUM_VISIBLE + 1) {
            numRows = rankData.length - 1;
        }

        this._rows = [];
        for (let ii = 0; ii < numRows + 1; ii++) {
            let row: RankRowLayout = new RankRowLayout(ii + startingRank, rankData[ii], offsetBtwRankCoin, 15, 100);
            row.container.height = RankBoard.ROW_HEIGHT;
            row.display.position = new Point(0, RankBoard.ROW_HEIGHT * ii);
            this.addObject(row, this.container);
            this._rows.push(row);
        }
    }

    // _starting_position MUST be set prior to animation or the animation will fly all over the place.
    public registerStartingPos(): void {
        this._startingPosition = this.container.y;
    }

    public update(dt: number): void {
        let parentOffset = this.container.y - this._startingPosition;
        for (let ii = 0; ii < this._rows.length; ii++) {
            // posOffset / RankBoard.ROW_HEIGHT = How many entries we have moved by
            // How many times a row has looped
            let loopNum = Math.floor((parentOffset / RankBoard.ROW_HEIGHT - ii + 2) / 3);
            // This row's player index in the data array
            let rankIdx = loopNum * this._rows.length + ii;
            if (rankIdx < this._rankData.length) {
                // Catch if entry doesn't exist (ie. rank 1)
                const row = this._rows[ii];
                // Starting position
                row.display.position.y = RankBoard.ROW_HEIGHT * (this._rankData.length - ii - 1)
                    // Height of all entries combined, allows looping
                    - this._rows.length * RankBoard.ROW_HEIGHT
                    // Multiplied by how many loops this row has gone through
                    * loopNum;

                const rank: PlayerRank = this._rankData[rankIdx];
                row.setRank(rank.rank);
                row.setPlayerName(rank.name, 100);
                row.setScore(rank.score);
            }
        }
    }

    private readonly _rankData: PlayerRank[];
    private readonly _rows: RankRowLayout[];

    private _startingPosition: number;

    // The number of entries you want visible at once (intermediary entry is automatically added)
    private static readonly NUM_VISIBLE: number = 2;
}

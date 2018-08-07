import {Point} from "pixi.js";
import {Updatable} from "../../flashbang/core/Updatable";
import {ContainerObject} from "../../flashbang/objects/ContainerObject";
import {PlayerRank} from "./PlayerRank";
import {RankRowLayout} from "./RankRowLayout";

export class RankBoard extends ContainerObject implements Updatable {
    public static readonly ROW_WIDTH: number = 400;
    public static readonly ROW_HEIGHT: number = 20;
    public static readonly PLAYER_ROW_HEIGHT: number = 32;

    public constructor(starting_rank: number, rank_data: PlayerRank[], offset_btw_rank_coin: number) {
        super();
        this._rankData = rank_data;
        this._starting_position = 0;

        let num_rows: number = RankBoard.NUM_VISIBLE;
        if (rank_data.length < RankBoard.NUM_VISIBLE + 1) {
            num_rows = rank_data.length - 1;
        }

        this._rows = [];
        for (let ii: number = 0; ii < num_rows + 1; ii++) {
            let row: RankRowLayout = new RankRowLayout(ii + starting_rank, rank_data[ii], offset_btw_rank_coin, 15, 100);
            row.container.height = RankBoard.ROW_HEIGHT;
            row.display.position = new Point(0, RankBoard.ROW_HEIGHT * ii);
            this.addObject(row, this.container);
            this._rows.push(row);
        }
    }

    // _starting_position MUST be set prior to animation or the animation will fly all over the place.
    public register_starting_pos(): void {
        this._starting_position = this.container.y;
    }

    public update(dt: number): void {
        let parentOffset: number = this.container.y - this._starting_position;
        for (let ii: number = 0; ii < this._rows.length; ii++) {
            // pos_offset / RankBoard.ROW_HEIGHT = How many entries we have moved by
            let loopNum: number = Math.floor((parentOffset / RankBoard.ROW_HEIGHT - ii + 2) / 3); // How many times a row has looped
            let rankIdx: number = loopNum * this._rows.length + ii; // this row's player index in the data array
            if (rankIdx < this._rankData.length) { // Catch if entry doesn't exist (ie. rank 1)
                const row = this._rows[ii];
                row.display.position.y = RankBoard.ROW_HEIGHT * (this._rankData.length - ii - 1) // Starting position
                    - this._rows.length * RankBoard.ROW_HEIGHT // Height of all entries combined, allows looping
                    * loopNum; // Multiplied by how many loops this row has gone through

                const rank: PlayerRank = this._rankData[rankIdx];
                row.setRank(rank.rank);
                row.setPlayerName(rank.name, 100);
                row.setScore(rank.score);
            }
        }
    }

    private readonly _rankData: PlayerRank[];
    private readonly _rows: RankRowLayout[];

    private _starting_position: number;

    private static readonly NUM_VISIBLE: number = 2; // the number of entries you want visible at once (intermediary entry is automatically added)
}

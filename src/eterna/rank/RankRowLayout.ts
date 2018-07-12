import {Container, Point, Text} from "pixi.js";
import {TextUtil} from "../../flashbang/util/TextUtil";
import {Fonts} from "../util/Fonts";
import {PlayerRank} from "./PlayerRank";

export class RankRowLayout extends Container {
    public constructor(rank: number, data: PlayerRank, offset_btw_rank_coin: number,
                       fontSize: number = 18, maxNameWidth: number = -1, textColor: number = 0xFFFFFF) {
        super();

        this._tfName = Fonts.std_regular("", fontSize).color(textColor).build();
        this.addChild(this._tfName);

        this._tfRank = Fonts.std_regular("", fontSize).color(textColor).build();
        this._tfRank.position = new Point(130, 0);
        this.addChild(this._tfRank);

        this._tfCoin = Fonts.std_regular("", fontSize).color(textColor).build();
        this._tfCoin.position = new Point(130 + offset_btw_rank_coin, 0);
        this.addChild(this._tfCoin);

        this.set_player_name(data.name, maxNameWidth);
        this.set_rank(rank);
        this.set_coin(data.score);
    }

    public set_rank(rank: number): void {
        this._tfRank.text = rank < 0 ? "" : "" + rank;
        this._rank = rank;
    }

    public get_rank(): number {
        return this._rank;
    }

    public set_player_name(name: string, maxTextWidth: number = -1): void {
        this._tfName.text = name;
        if (maxTextWidth >= 0) {
            TextUtil.trimTextToWidth(this._tfName, maxTextWidth, "...");
        }
        this._player_name = this._tfName.text;
    }

    public get_player_name(): string {
        return this._player_name;
    }

    public set_coin(coin: number): void {
        this._tfCoin.text = (coin < 0) ? "" : coin.toString();
        this._coin = coin;
    }

    public get_coin(): number {
        return this._coin;
    }

    private readonly _tfRank: Text;
    private readonly _tfName: Text;
    private readonly _tfCoin: Text;

    private _rank: number;
    private _player_name: string;
    private _coin: number;
}

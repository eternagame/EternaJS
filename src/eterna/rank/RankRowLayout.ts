import {Point, Text} from 'pixi.js';
import {ContainerObject, TextUtil} from 'flashbang';
import Fonts from 'eterna/util/Fonts';
import PlayerRank from './PlayerRank';

export default class RankRowLayout extends ContainerObject {
    constructor(
        rank: number, data: PlayerRank, rankScoreOffset: number,
        fontSize: number = 18, maxNameWidth: number = -1, textColor: number = 0xFFFFFF
    ) {
        super();

        this._tfName = Fonts.std('', fontSize).color(textColor).build();
        this.container.addChild(this._tfName);

        this._tfRank = Fonts.std('', fontSize).color(textColor).build();
        this._tfRank.position = new Point(130, 0);
        this.container.addChild(this._tfRank);

        this._tfScore = Fonts.std('', fontSize).color(textColor).build();
        this._tfScore.position = new Point(130 + rankScoreOffset, 0);
        this.container.addChild(this._tfScore);

        this.setPlayerName(data.name, maxNameWidth);
        this.setRank(rank);
        this.setScore(data.score);
    }

    public setRank(rank: number): void {
        this._tfRank.text = rank < 0 ? '' : `${rank}`;
        this._rank = rank;
    }

    public get rank(): number {
        return this._rank;
    }

    public setPlayerName(name: string, maxTextWidth: number = -1): void {
        this._tfName.text = name;
        if (maxTextWidth >= 0) {
            TextUtil.trimTextToWidth(this._tfName, maxTextWidth, '...');
        }
        this._playerName = this._tfName.text;
    }

    public get playerName(): string {
        return this._playerName;
    }

    public setScore(score: number): void {
        this._tfScore.text = (score < 0) ? '' : score.toString();
        this._score = score;
    }

    public get score(): number {
        return this._score;
    }

    private readonly _tfRank: Text;
    private readonly _tfName: Text;
    private readonly _tfScore: Text;

    private _rank: number;
    private _playerName: string;
    private _score: number;
}
